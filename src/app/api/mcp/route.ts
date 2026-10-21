import { createMcpHandler, getPublicOrigin, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/server";
import {
  MCP_INSTRUCTIONS,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  registerMcpTools,
} from "@/lib/mcp/server";
import { resolveByAccessToken } from "@/lib/mcp/session";
import { mcpConfigured } from "@/lib/mcp/admin";

export const dynamic = "force-dynamic";

const mcpHandler = createMcpHandler(
  async (server) => {
    registerMcpTools(server);
  },
  {
    serverInfo: { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    instructions: MCP_INSTRUCTIONS,
  },
);

/**
 * Turns a bearer token into the auth info the SDK hands to tool handlers.
 * The principal is resolved here so an expired or revoked token never
 * reaches a tool.
 */
async function verifyToken(
  req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  const principal = await resolveByAccessToken(bearerToken);
  if (!principal) return undefined;

  return {
    token: bearerToken,
    clientId: principal.clientId,
    scopes: principal.scopes,
    expiresAt: principal.expiresAt,
    resource: new URL(`${getPublicOrigin(req)}/api/mcp`),
    extra: {
      credentialId: principal.credentialId,
      userId: principal.userId,
      accessToken: principal.accessToken,
    },
  };
}

const authOptions = {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
};

const guarded = withMcpAuth(mcpHandler, verifyToken, authOptions);

async function handle(req: Request) {
  if (!mcpConfigured()) {
    return new Response(
      JSON.stringify({
        error: "server_error",
        error_description:
          "The bunny MCP server isn't configured. Set SUPABASE_SERVICE_ROLE_KEY and MCP_TOKEN_ENCRYPTION_KEY.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
  return guarded(req);
}

export const GET = handle;
export const POST = handle;
