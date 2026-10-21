import { lookup } from "node:dns/promises";
import { adminClient } from "@/lib/mcp/admin";
import { encryptJson, pkceChallenge, randomToken, sha256 } from "@/lib/mcp/crypto";
import type { CredentialRow } from "@/lib/mcp/session";

export const MCP_SCOPES = ["trips:read", "trips:write"];
export const DEFAULT_SCOPE = "trips:read trips:write";

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
export const AUTH_CODE_TTL_MS = 10 * 60 * 1000;

export interface OAuthClient {
  client_id: string;
  client_name: string | null;
  client_uri: string | null;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  scope: string;
  token_endpoint_auth_method: string;
}

export class OAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function normalizeScope(requested: string | null | undefined) {
  if (!requested) return DEFAULT_SCOPE;
  const wanted = requested
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const allowed = wanted.filter((s) => MCP_SCOPES.includes(s));
  // Unknown scopes are ignored rather than fatal: clients often send
  // their own housekeeping scopes alongside ours.
  return allowed.length ? allowed.join(" ") : DEFAULT_SCOPE;
}

function parseArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  if (typeof value === "string") return [value];
  return [];
}

/** Dynamic Client Registration (RFC 7591). */
export async function registerClient(body: Record<string, unknown>): Promise<OAuthClient> {
  const redirectUris = parseArray(body.redirect_uris);
  if (!redirectUris.length)
    throw new OAuthError("invalid_redirect_uri", "redirect_uris is required.");
  for (const uri of redirectUris) {
    let parsed: URL;
    try {
      parsed = new URL(uri);
    } catch {
      throw new OAuthError("invalid_redirect_uri", `Invalid redirect_uri: ${uri}`);
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new OAuthError(
        "invalid_redirect_uri",
        "redirect_uris must be absolute http(s) URLs.",
      );
    }
    // Plain http is only acceptable for loopback (native apps).
    if (parsed.protocol === "http:" && !isLoopback(parsed.hostname)) {
      throw new OAuthError(
        "invalid_redirect_uri",
        "http redirect_uris are only allowed for loopback addresses.",
      );
    }
  }

  const client: OAuthClient = {
    client_id: randomToken("mcp_", 24),
    client_name:
      typeof body.client_name === "string" ? body.client_name.slice(0, 200) : null,
    client_uri: typeof body.client_uri === "string" ? body.client_uri : null,
    redirect_uris: redirectUris,
    grant_types: parseArray(body.grant_types).length
      ? parseArray(body.grant_types)
      : ["authorization_code", "refresh_token"],
    response_types: parseArray(body.response_types).length
      ? parseArray(body.response_types)
      : ["code"],
    scope: typeof body.scope === "string" ? body.scope : "",
    token_endpoint_auth_method:
      typeof body.token_endpoint_auth_method === "string"
        ? body.token_endpoint_auth_method
        : "none",
  };

  const { error } = await adminClient()
    .from("mcp_oauth_clients")
    .insert(client);
  if (error) throw new OAuthError("server_error", error.message, 500);
  return client;
}

function isLoopback(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

/** Block hosts that could reach the server's own network. */
function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (isLoopback(host)) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (host === "metadata.google.internal") return true;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd")) return true;
  return false;
}

/**
 * Client ID Metadata Document (CIMD): the client identifies itself with
 * an HTTPS URL that serves its metadata. The URL is fetched and checked
 * before it is trusted, so it must not be able to point at our own
 * network.
 */
async function fetchClientMetadata(url: string): Promise<OAuthClient> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new OAuthError("invalid_client", "client_id is not a valid URL.");
  }
  if (parsed.protocol !== "https:")
    throw new OAuthError("invalid_client", "Client metadata must be served over https.");
  if (isPrivateHostname(parsed.hostname))
    throw new OAuthError("invalid_client", "Client metadata host is not allowed.");

  try {
    const addresses = await lookup(parsed.hostname, { all: true });
    if (addresses.some((a) => isPrivateHostname(a.address)))
      throw new OAuthError("invalid_client", "Client metadata host is not allowed.");
  } catch (error) {
    if (error instanceof OAuthError) throw error;
    throw new OAuthError("invalid_client", "Client metadata host could not be resolved.");
  }

  let response: Response;
  try {
    response = await fetch(parsed, {
      headers: { accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new OAuthError("invalid_client", "Client metadata could not be fetched.");
  }
  if (!response.ok)
    throw new OAuthError("invalid_client", "Client metadata could not be fetched.");

  const text = await response.text();
  if (text.length > 64_000)
    throw new OAuthError("invalid_client", "Client metadata is too large.");
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new OAuthError("invalid_client", "Client metadata is not valid JSON.");
  }

  const redirectUris = parseArray(body.redirect_uris);
  if (!redirectUris.length)
    throw new OAuthError("invalid_client", "Client metadata has no redirect_uris.");

  return {
    client_id: url,
    client_name:
      typeof body.client_name === "string" ? body.client_name.slice(0, 200) : null,
    client_uri: typeof body.client_uri === "string" ? body.client_uri : null,
    redirect_uris: redirectUris,
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: typeof body.scope === "string" ? body.scope : "",
    token_endpoint_auth_method: "none",
  };
}

/**
 * Resolves a client_id. Either a client registered through dynamic
 * client registration, or a CIMD URL.
 */
export async function resolveClient(clientId: string): Promise<OAuthClient> {
  if (!clientId) throw new OAuthError("invalid_client", "client_id is required.");

  const { data, error } = await adminClient()
    .from("mcp_oauth_clients")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw new OAuthError("server_error", error.message, 500);
  if (data) return data as OAuthClient;

  if (clientId.startsWith("https://")) return fetchClientMetadata(clientId);

  throw new OAuthError("invalid_client", "Unknown client_id.");
}

/** The redirect_uri must be one the client registered, exactly. */
export function assertRedirectUri(client: OAuthClient, redirectUri: string) {
  if (!client.redirect_uris.includes(redirectUri))
    throw new OAuthError(
      "invalid_request",
      "redirect_uri does not match a registered redirect_uri.",
    );
}

export interface AuthCodeInput {
  userId: string;
  clientId: string;
  clientName: string | null;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  session: { access_token: string; refresh_token: string };
}

export async function createAuthCode(input: AuthCodeInput): Promise<string> {
  const code = randomToken("mcpcode_", 32);
  const { error } = await adminClient().from("mcp_auth_codes").insert({
    code_hash: sha256(code),
    user_id: input.userId,
    client_id: input.clientId,
    client_name: input.clientName,
    redirect_uri: input.redirectUri,
    code_challenge: input.codeChallenge,
    code_challenge_method: input.codeChallengeMethod,
    scope: input.scope,
    session_ciphertext: encryptJson(process.env.MCP_TOKEN_ENCRYPTION_KEY!, input.session),
    expires_at: new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString(),
  });
  if (error) throw new OAuthError("server_error", error.message, 500);
  return code;
}

export interface AuthCodeRow {
  id: string;
  user_id: string;
  client_id: string;
  client_name: string | null;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  scope: string;
  session_ciphertext: string;
  expires_at: string;
  used_at: string | null;
}

/** Fetches an unused, unexpired authorization code and marks it used. */
export async function consumeAuthCode(code: string): Promise<AuthCodeRow> {
  const { data, error } = await adminClient()
    .from("mcp_auth_codes")
    .select("*")
    .eq("code_hash", sha256(code))
    .maybeSingle();
  if (error) throw new OAuthError("server_error", error.message, 500);
  if (!data)
    throw new OAuthError("invalid_grant", "That authorization code isn't valid.");
  if (data.used_at)
    throw new OAuthError("invalid_grant", "That authorization code was already used.");
  if (new Date(data.expires_at).getTime() <= Date.now())
    throw new OAuthError("invalid_grant", "That authorization code has expired.");

  const { data: claimed } = await adminClient()
    .from("mcp_auth_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id)
    .is("used_at", null)
    .select("id");
  if (!claimed || claimed.length === 0)
    throw new OAuthError("invalid_grant", "That authorization code was already used.");

  return data as AuthCodeRow;
}

/** PKCE S256 check. */
export function assertPkce(codeChallenge: string, method: string, verifier: string) {
  if (method !== "S256")
    throw new OAuthError("invalid_request", "Only the S256 PKCE method is supported.");
  if (!verifier) throw new OAuthError("invalid_request", "code_verifier is required.");
  if (pkceChallenge(verifier) !== codeChallenge)
    throw new OAuthError("invalid_grant", "The code verifier doesn't match.");
}

export interface IssuedTokens {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
}

export async function issueTokens(input: {
  userId: string;
  clientId: string;
  clientName: string | null;
  scope: string;
  session: { access_token: string; refresh_token: string };
}): Promise<IssuedTokens> {
  const accessToken = randomToken("mcp_at_", 32);
  const refreshToken = randomToken("mcp_rt_", 32);
  const now = Date.now();

  const { error } = await adminClient().from("mcp_credentials").insert({
    user_id: input.userId,
    client_id: input.clientId,
    client_name: input.clientName,
    scope: input.scope,
    access_token_hash: sha256(accessToken),
    refresh_token_hash: sha256(refreshToken),
    session_ciphertext: encryptJson(process.env.MCP_TOKEN_ENCRYPTION_KEY!, input.session),
    expires_at: new Date(now + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString(),
    refresh_expires_at: new Date(
      now + REFRESH_TOKEN_TTL_SECONDS * 1000,
    ).toISOString(),
  });
  if (error) throw new OAuthError("server_error", error.message, 500);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    scope: input.scope,
  };
}

/**
 * Revokes an access or refresh token (RFC 7009). Returns false when the
 * token was already unknown, which is not an error.
 */
export async function revokeToken(token: string): Promise<boolean> {
  const hash = sha256(token);
  const { data, error } = await adminClient()
    .from("mcp_credentials")
    .update({ revoked_at: new Date().toISOString() })
    .or(`access_token_hash.eq.${hash},refresh_token_hash.eq.${hash}`)
    .select("id");
  if (error) throw new OAuthError("server_error", error.message, 500);
  return (data?.length ?? 0) > 0;
}

/** Looks up the credential a refresh token belongs to. */export async function findByRefreshToken(
  refreshToken: string,
): Promise<CredentialRow | null> {
  const { data, error } = await adminClient()
    .from("mcp_credentials")
    .select("*")
    .eq("refresh_token_hash", sha256(refreshToken))
    .maybeSingle();
  if (error) throw new OAuthError("server_error", error.message, 500);
  return (data as CredentialRow | null) ?? null;
}

/**
 * Rotates a credential's tokens. The Supabase session is untouched —
 * it is refreshed lazily, when the access token inside it expires.
 */
export async function rotateCredentialTokens(
  credentialId: string,
  scope: string,
): Promise<IssuedTokens> {
  const accessToken = randomToken("mcp_at_", 32);
  const refreshToken = randomToken("mcp_rt_", 32);
  const now = Date.now();

  const { data, error } = await adminClient()
    .from("mcp_credentials")
    .update({
      access_token_hash: sha256(accessToken),
      refresh_token_hash: sha256(refreshToken),
      scope,
      expires_at: new Date(now + ACCESS_TOKEN_TTL_SECONDS * 1000).toISOString(),
      refresh_expires_at: new Date(
        now + REFRESH_TOKEN_TTL_SECONDS * 1000,
      ).toISOString(),
    })
    .eq("id", credentialId)
    .is("revoked_at", null)
    .select("id");
  if (error) throw new OAuthError("server_error", error.message, 500);
  if (!data || data.length === 0)
    throw new OAuthError("invalid_grant", "That connection is no longer active.");

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    scope,
  };
}
