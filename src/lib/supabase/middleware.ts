import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

const authOnlyRoutes = new Set(["/login", "/signup"]);

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && (path.startsWith("/dashboard") || path.startsWith("/channels") || path.startsWith("/messages") || path.startsWith("/connectors") || path.startsWith("/monitoring") || path.startsWith("/errors") || path.startsWith("/audit"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && authOnlyRoutes.has(path)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}
