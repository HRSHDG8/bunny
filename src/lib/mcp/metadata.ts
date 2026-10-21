import { MCP_SCOPES } from "@/lib/mcp/oauth";

/** The MCP server's own address, relative to the site origin. */
export const MCP_PATH = "/api/mcp";

export function originOf(origin: string) {
  return origin.replace(/\/+$/, "");
}

/** RFC 8414 authorization server metadata. */
export function authorizationServerMetadata(origin: string) {
  const base = originOf(origin);
  return {
    issuer: base,
    authorization_endpoint: `${base}${MCP_PATH}/oauth/authorize`,
    token_endpoint: `${base}${MCP_PATH}/oauth/token`,
    registration_endpoint: `${base}${MCP_PATH}/oauth/register`,
    scopes_supported: MCP_SCOPES,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    revocation_endpoint: `${base}${MCP_PATH}/oauth/revoke`,
  };
}

/** RFC 9728 protected resource metadata. */
export function protectedResourceMetadata(origin: string) {
  const base = originOf(origin);
  return {
    resource: `${base}${MCP_PATH}`,
    authorization_servers: [base],
    scopes_supported: MCP_SCOPES,
    bearer_methods_supported: ["header"],
    resource_name: "bunny",
    resource_documentation: `${base}/mcp`,
  };
}

export const METADATA_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=3600",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};
