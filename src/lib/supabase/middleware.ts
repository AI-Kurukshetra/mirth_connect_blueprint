import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";
import { canAccessPath, isAuthOnlyRoute, isProtectedAppRoute, normalizeRole } from "@/lib/rbac";

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

  if (!user && isProtectedAppRoute(path)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAuthOnlyRoute(path)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (user && !canAccessPath("viewer", path)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = normalizeRole(profile?.role);

    if (!canAccessPath(role, path)) {
      return NextResponse.redirect(new URL("/dashboard?denied=role", request.url));
    }
  }

  return response;
}
