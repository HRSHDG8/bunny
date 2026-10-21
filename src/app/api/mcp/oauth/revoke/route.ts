import { type NextRequest } from "next/server";
import { revokeToken } from "@/lib/mcp/oauth";

export const dynamic = "force-dynamic";

/** Token revocation (RFC 7009). */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  let token = "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    token = String(body.token ?? "");
  } else {
    const form = await request.formData().catch(() => null);
    token = form ? String(form.get("token") ?? "") : "";
  }

  if (token) await revokeToken(token).catch(() => false);

  // RFC 7009: always 200, even for tokens we don't know.
  return new Response(null, { status: 200 });
}
