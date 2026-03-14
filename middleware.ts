import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type UserRole = "admin" | "engineer" | "viewer";

const protectedRoutePrefixes = [
  "/dashboard",
  "/channels",
  "/messages",
  "/connectors",
  "/monitoring",
  "/alerts",
  "/errors",
  "/audit",
  "/simulator",
  "/transformations",
  "/validation-rules",
  "/routing-rules",
];

const authOnlyRoutes = new Set(["/login", "/signup"]);
const adminRoutePrefixes = ["/users", "/organizations", "/security", "/configurations"];
const engineerRoutePrefixes = [
  "/channels/add",
  "/simulator",
  "/transformations/add",
  "/validation-rules/add",
  "/routing-rules/add",
  "/connectors/add",
  "/alerts/add",
];
const engineerRoutePatterns = [
  /^\/channels\/[^/]+\/edit$/,
  /^\/channels\/[^/]+\/designer$/,
  /^\/transformations\/[^/]+\/edit$/,
  /^\/validation-rules\/[^/]+\/edit$/,
  /^\/routing-rules\/[^/]+\/edit$/,
  /^\/connectors\/[^/]+\/edit$/,
  /^\/alerts\/[^/]+\/edit$/,
];

function normalizeRole(role: string | null | undefined): UserRole {
  if (role === "admin" || role === "engineer" || role === "viewer") {
    return role;
  }

  return "viewer";
}

function isProtectedAppRoute(path: string) {
  return protectedRoutePrefixes.some((prefix) => path.startsWith(prefix));
}

function isAdminRoute(path: string) {
  return adminRoutePrefixes.some((prefix) => path.startsWith(prefix));
}

function isEngineerRoute(path: string) {
  return engineerRoutePrefixes.some((prefix) => path.startsWith(prefix))
    || engineerRoutePatterns.some((pattern) => pattern.test(path));
}

function canAccessPath(role: UserRole, path: string) {
  if (isAdminRoute(path)) {
    return role === "admin";
  }

  if (isEngineerRoute(path)) {
    return role !== "viewer";
  }

  return true;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  if (user && authOnlyRoutes.has(path)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (user && !canAccessPath("viewer", path)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!canAccessPath(normalizeRole(profile?.role), path)) {
      return NextResponse.redirect(new URL("/dashboard?denied=role", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
