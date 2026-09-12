export function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
}

export function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function supabaseKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isConfigured() {
  return Boolean(supabaseUrl() && supabaseKey());
}