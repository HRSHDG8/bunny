import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/config";
import { adminClient, encryptionKey } from "@/lib/mcp/admin";
import { decryptJson, encryptJson, sha256 } from "@/lib/mcp/crypto";
import { decodeJwt } from "@/lib/supabase/errors";

export interface StoredSession {
  access_token: string;
  refresh_token: string;
}

/**
 * The identity behind an MCP request: which bunny user is acting, what
 * they may do, and a Supabase client that carries *their* JWT.
 *
 * Every query through `supabase` therefore runs as that user, so the
 * database's RLS policies apply exactly as they do in the web app.
 */
export interface McpPrincipal {
  credentialId: string;
  userId: string;
  clientId: string;
  scopes: string[];
  /** The bunny user's Supabase access token backing this request. */
  accessToken: string;
  /** Expiry of the MCP access token, in seconds since epoch. */
  expiresAt: number;
  supabase: SupabaseClient;
}

interface CredentialRow {
  id: string;
  user_id: string;
  client_id: string;
  client_name: string | null;
  scope: string;
  access_token_hash: string;
  refresh_token_hash: string | null;
  session_ciphertext: string;
  expires_at: string;
  refresh_expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
}

export type { CredentialRow };

function scopesFrom(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** A client that sends the user's own access token, so RLS sees them. */
function userScopedClient(accessToken: string): SupabaseClient {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key)
    throw new Error("Supabase is not configured for the MCP server.");
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function expiresSoon(accessToken: string, seconds = 60): boolean {
  const claims = decodeJwt(accessToken);
  if (!claims?.exp) return true;
  return claims.exp * 1000 <= Date.now() + seconds * 1000;
}

/**
 * Rotates the stored Supabase session when the access token is about to
 * expire. The update is conditional on the ciphertext we read, so two
 * concurrent refreshes can't clobber each other's newer session.
 */
async function refreshStoredSession(
  credential: CredentialRow,
  session: StoredSession,
): Promise<StoredSession> {
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) throw new Error("Supabase is not configured.");

  const refresher = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await refresher.auth.refreshSession({
    refresh_token: session.refresh_token,
  });
  if (error || !data.session)
    throw new Error("Your bunny session expired. Reconnect Claude to bunny.");

  const next: StoredSession = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
  const ciphertext = encryptJson(encryptionKey(), next);
  await adminClient()
    .from("mcp_credentials")
    .update({ session_ciphertext: ciphertext })
    .eq("id", credential.id)
    .eq("session_ciphertext", credential.session_ciphertext);
  return next;
}

/**
 * Resolves an MCP access token into a principal, refreshing the stored
 * Supabase session when needed. Returns null for unknown, revoked or
 * expired tokens.
 */
export async function resolveByAccessToken(
  accessToken: string,
): Promise<McpPrincipal | null> {
  const hash = sha256(accessToken);
  const { data, error } = await adminClient()
    .from("mcp_credentials")
    .select("*")
    .eq("access_token_hash", hash)
    .maybeSingle();
  if (error || !data) return null;
  return principalFromCredential(data as CredentialRow);
}

/** Same, but looked up by credential id (used inside tool handlers). */
export async function resolveByCredentialId(
  credentialId: string,
): Promise<McpPrincipal | null> {
  const { data, error } = await adminClient()
    .from("mcp_credentials")
    .select("*")
    .eq("id", credentialId)
    .maybeSingle();
  if (error || !data) return null;
  return principalFromCredential(data as CredentialRow);
}

/**
 * Notes that a connection was just used, without making the caller wait for
 * it. The write is scheduled with `after()` so it happens once the response
 * is on its way; the `await` inside matters, because a PostgREST query
 * builder only sends its request when it is awaited.
 */
function touchCredential(credentialId: string) {
  const write = async () => {
    await adminClient()
      .from("mcp_credentials")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", credentialId);
  };
  try {
    after(write);
  } catch {
    // No request scope to schedule into (e.g. a background call).
    void write().catch(() => {});
  }
}

async function principalFromCredential(
  credential: CredentialRow,
): Promise<McpPrincipal | null> {
  if (credential.revoked_at) return null;
  if (new Date(credential.expires_at).getTime() <= Date.now()) return null;

  let session = decryptJson<StoredSession>(
    encryptionKey(),
    credential.session_ciphertext,
  );
  if (expiresSoon(session.access_token)) {
    session = await refreshStoredSession(credential, session);
  }

  touchCredential(credential.id);

  return {
    credentialId: credential.id,
    userId: credential.user_id,
    clientId: credential.client_id,
    scopes: scopesFrom(credential.scope),
    accessToken: session.access_token,
    expiresAt: Math.floor(new Date(credential.expires_at).getTime() / 1000),
    supabase: userScopedClient(session.access_token),
  };
}

/**
 * Rebuilds the principal for a tool call from the auth info the route
 * handler resolved. The Supabase client is rebuilt from the same access
 * token, so every query still runs as the bunny user.
 */
export function principalFromAuthInfo(authInfo: AuthInfo): McpPrincipal {
  const extra = (authInfo.extra ?? {}) as {
    credentialId?: string;
    userId?: string;
    accessToken?: string;
  };
  if (!extra.credentialId || !extra.userId || !extra.accessToken)
    throw new Error("This request isn't signed in to bunny.");

  return {
    credentialId: extra.credentialId,
    userId: extra.userId,
    clientId: authInfo.clientId,
    scopes: authInfo.scopes ?? [],
    accessToken: extra.accessToken,
    expiresAt: authInfo.expiresAt ?? 0,
    supabase: userScopedClient(extra.accessToken),
  };
}
