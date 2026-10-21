import { NextResponse, type NextRequest } from "next/server";
import { getPublicOrigin } from "mcp-handler";
import { createClient } from "@/lib/supabase/server";
import {
  OAuthError,
  assertRedirectUri,
  createAuthCode,
  normalizeScope,
  resolveClient,
} from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

function errorRedirect(
  redirectUri: string,
  state: string | null,
  code: string,
  description: string,
) {
  const url = new URL(redirectUri);
  url.searchParams.set("error", code);
  url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}

function errorPage(code: string, description: string) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>bunny</title></head>
<body style="font-family:system-ui;margin:3rem auto;max-width:32rem">
<h1>That connection can't be set up</h1>
<p><strong>${code}</strong></p>
<p>${description}</p>
<p><a href="/dashboard">Back to bunny</a></p>
</body></html>`,
    { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  // The public origin, so the flow still works behind a proxy (Vercel,
  // a tunnel) where the request URL isn't the address the client used.
  const origin = getPublicOrigin(request);
  const responseType = params.get("response_type");
  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const state = params.get("state");
  const codeChallenge = params.get("code_challenge") ?? "";
  const codeChallengeMethod = params.get("code_challenge_method") ?? "";
  const scope = normalizeScope(params.get("scope"));
  const resource = params.get("resource");

  if (responseType !== "code")
    return errorPage(
      "unsupported_response_type",
      "bunny only supports the authorization code flow.",
    );
  if (!codeChallenge || codeChallengeMethod !== "S256")
    return errorPage(
      "invalid_request",
      "PKCE with the S256 method is required.",
    );

  let client;
  try {
    client = await resolveClient(clientId);
    assertRedirectUri(client, redirectUri);
  } catch (error) {
    const code = error instanceof OAuthError ? error.code : "invalid_client";
    const description =
      error instanceof Error ? error.message : "That client isn't allowed to connect.";
    return errorPage(code, description);
  }

  // RFC 8707: the resource must be one this server actually protects.
  if (resource) {
    const expected = new URL("/api/mcp", origin).toString();
    if (resource.replace(/\/$/, "") !== expected.replace(/\/$/, "")) {
      return errorRedirect(
        redirectUri,
        state,
        "invalid_target",
        "That resource isn't a bunny MCP server.",
      );
    }
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    // Send them to sign in, then come back here to finish the handshake.
    const next = request.nextUrl.pathname + request.nextUrl.search;
    const login = new URL("/login", origin);
    login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  }

  try {
    const code = await createAuthCode({
      userId: session.user.id,
      clientId: client.client_id,
      clientName: client.client_name,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      scope,
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      },
    });

    const url = new URL(redirectUri);
    url.searchParams.set("code", code);
    if (state) url.searchParams.set("state", state);
    return NextResponse.redirect(url);
  } catch (error) {
    return errorRedirect(
      redirectUri,
      state,
      "server_error",
      error instanceof Error ? error.message : "Couldn't finish the connection.",
    );
  }
}
