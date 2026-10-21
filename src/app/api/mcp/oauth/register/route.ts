import { NextResponse, type NextRequest } from "next/server";
import { OAuthError, registerClient } from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

/**
 * Dynamic Client Registration (RFC 7591). MCP clients that don't have a
 * client id of their own use this to get one.
 */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "Expected a JSON body." },
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const client = await registerClient(body);
    return NextResponse.json(
      {
        client_id: client.client_id,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_name: client.client_name,
        client_uri: client.client_uri,
        redirect_uris: client.redirect_uris,
        grant_types: client.grant_types,
        response_types: client.response_types,
        scope: client.scope,
        token_endpoint_auth_method: client.token_endpoint_auth_method,
      },
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const code = error instanceof OAuthError ? error.code : "invalid_client_metadata";
    const description =
      error instanceof Error ? error.message : "Couldn't register that client.";
    const status = error instanceof OAuthError ? error.status : 400;
    return NextResponse.json(
      { error: code, error_description: description },
      { status, headers: { "Content-Type": "application/json" } },
    );
  }
}
