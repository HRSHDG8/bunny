import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  isConfigured,
  supabaseKey,
  supabaseUrl,
} from "@/lib/supabase/config";

const protectedPaths = ["/dashboard", "/trips"];
const authPaths = ["/login"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isConfigured()) return response;

  const supabase = createServerClient(
    supabaseUrl()!,
    supabaseKey()!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getSession() only reads the JWT from cookies (no network call), so a
  // slow/auth-timing-out Supabase can't stall or crash the proxy. The
  // authoritative check happens in requireUser() on the actual pages.
  let signedIn = false;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    signedIn = Boolean(session);
  } catch {
    signedIn = false;
  }

  const { pathname } = request.nextUrl;
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAuthPage = authPaths.some((p) => pathname.startsWith(p));

  if (signedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!signedIn && isProtected) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};