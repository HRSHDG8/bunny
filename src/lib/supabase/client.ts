import { createBrowserClient } from "@supabase/ssr";
import {
  isConfigured,
  supabaseKey,
  supabaseUrl,
} from "@/lib/supabase/config";

export function createClient() {
  if (!isConfigured()) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local",
    );
  }
  return createBrowserClient(supabaseUrl()!, supabaseKey()!);
}