import { NextResponse, type NextRequest } from "next/server";
import {
  OAuthError,
  assertPkce,
  consumeAuthCode,
  findByRefreshToken,
  issueTokens,
  rotateCredentialTokens,
} from "@/lib/mcp/oauth";
import { decryptJson } from "@/lib/mcp/crypto";
import { encryptionKey } from "@/lib/mcp/admin";
import type { StoredSession } from "@/lib/mcp/session";

export const dynamic = "force-dynamic";

async function readParams(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    return Object.fromEntries(
      Object.entries(body).map(([k, v]) => [k, String(v ?? "")]),
    );
  }
  const form = await request.formData().catch(() => null);
  if (!form) return {};
  return Object.fromEntries(
    [...form.entries()].map(([k, v]) => [k, String(v)]),
  );
}

function tokenError(error: unknown) {
  const code = error instanceof OAuthError ? error.code : "server_error";
  const description =
    error instanceof Error ? error.message : "Something went wrong.";
  const status = error instanceof OAuthError ? error.status : 500;
  return NextResponse.json(
    { error: code, error_description: description },
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}

export async function POST(request: NextRequest) {
  try {
    const params = await readParams(request);
    const grantType = params.grant_type ?? "";

    if (grantType === "authorization_code") {
      const code = params.code ?? "";
      const clientId = params.client_id ?? "";
      const redirectUri = params.redirect_uri ?? "";

      const row = await consumeAuthCode(code);
      if (clientId && row.client_id !== clientId)
        throw new OAuthError(
          "invalid_grant",
          "That authorization code was issued to a different client.",
        );
      if (redirectUri && row.redirect_uri !== redirectUri)
        throw new OAuthError(
          "invalid_grant",
          "That authorization code was issued for a different redirect_uri.",
        );

      assertPkce(row.code_challenge, row.code_challenge_method, params.code_verifier ?? "");

      const session = decryptJson<StoredSession>(encryptionKey(), row.session_ciphertext);
      const tokens = await issueTokens({
        userId: row.user_id,
        clientId: row.client_id,
        clientName: row.client_name,
        scope: row.scope,
        session,
      });

      return NextResponse.json(tokens, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      });
    }

    if (grantType === "refresh_token") {
      const refreshToken = params.refresh_token ?? "";
      const clientId = params.client_id ?? "";

      const credential = await findByRefreshToken(refreshToken);
      if (!credential)
        throw new OAuthError("invalid_grant", "That refresh token isn't valid.");
      if (credential.revoked_at)
        throw new OAuthError("invalid_grant", "That connection has been revoked.");
      if (
        credential.refresh_expires_at &&
        new Date(credential.refresh_expires_at).getTime() <= Date.now()
      )
        throw new OAuthError("invalid_grant", "That refresh token has expired.");
      if (clientId && credential.client_id !== clientId)
        throw new OAuthError(
          "invalid_grant",
          "That refresh token was issued to a different client.",
        );

      const tokens = await rotateCredentialTokens(credential.id, credential.scope);
      return NextResponse.json(tokens, {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          Pragma: "no-cache",
        },
      });
    }

    throw new OAuthError(
      "unsupported_grant_type",
      `bunny doesn't support the "${grantType}" grant type.`,
    );
  } catch (error) {
    return tokenError(error);
  }
}
