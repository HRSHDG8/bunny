import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appBaseUrl } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const base = appBaseUrl() || origin;

  const stored = request.cookies.get("bunny_next")?.value;
  const next = stored ? decodeURIComponent(stored) : "/dashboard";
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  function redirect(target: string) {
    const res = NextResponse.redirect(new URL(target, base));
    res.cookies.set("bunny_next", "", { path: "/", maxAge: 0 });
    return res;
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return redirect(safeNext);
  }

  return redirect("/login?error=auth");
}