import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/config";

/**
 * Service-role key. Server-only: it bypasses RLS, so it is used for
 * exactly three things — the MCP credential tables, the OAuth client
 * registry and the OAuth auth codes. Every trip/flight/rental read or
 * write still runs as the signed-in bunny user, through that user's
 * own JWT, so RLS applies exactly as it does in the web app.
 */
export function serviceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

/** 32 bytes of hex; used to encrypt stored Supabase sessions at rest. */
export function encryptionKey() {
  return process.env.MCP_TOKEN_ENCRYPTION_KEY?.trim() || "";
}

export function mcpConfigured() {
  return Boolean(supabaseUrl() && supabaseKey() && serviceRoleKey() && encryptionKey());
}

let cached: SupabaseClient | null = null;

export function adminClient(): SupabaseClient {
  if (!cached) {
    const url = supabaseUrl();
    const key = serviceRoleKey();
    if (!url || !key)
      throw new Error(
        "The MCP server needs SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local.",
      );
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
