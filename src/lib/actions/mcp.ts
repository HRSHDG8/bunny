"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/supabase/errors";

export interface McpConnection {
  id: string;
  client_name: string | null;
  client_id: string;
  scope: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string;
  revoked_at: string | null;
}

/** The signed-in user's MCP connections. No token material comes back. */
export async function listMcpConnections(): Promise<McpConnection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mcp_my_connections");
  if (error) throw apiError("Couldn't load your connections.", error);
  return (data ?? []) as McpConnection[];
}

/** Revokes one of the signed-in user's MCP connections. */
export async function revokeMcpConnection(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mcp_revoke_connection", {
    p_credential_id: id,
  });
  if (error) throw apiError("Couldn't disconnect that client.", error);
  revalidatePath("/settings");
}
