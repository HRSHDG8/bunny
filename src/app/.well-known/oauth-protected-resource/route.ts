import { getPublicOrigin } from "mcp-handler";
import {
  METADATA_HEADERS,
  protectedResourceMetadata,
} from "@/lib/mcp/metadata";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const metadata = protectedResourceMetadata(getPublicOrigin(request));
  return new Response(JSON.stringify(metadata), { headers: METADATA_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: METADATA_HEADERS });
}
