import { getPublicOrigin } from "mcp-handler";
import {
  METADATA_HEADERS,
  authorizationServerMetadata,
} from "@/lib/mcp/metadata";

export const dynamic = "force-dynamic";

/** Same metadata, at the path-inserted location MCP clients also try. */
export async function GET(request: Request) {
  const metadata = authorizationServerMetadata(getPublicOrigin(request));
  return new Response(JSON.stringify(metadata), { headers: METADATA_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: METADATA_HEADERS });
}
