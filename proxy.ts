import { NextResponse, type NextRequest } from "next/server";

const authOnlyRoutes = new Set(["/login", "/signup"]);
const protectedRoutePrefixes = ["/dashboard", "/channels", "/messages", "/connectors", "/monitoring", "/errors", "/audit"];

function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
}

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hasSession = hasSupabaseSessionCookie(request);

  if (!hasSession && protectedRoutePrefixes.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasSession && authOnlyRoutes.has(path)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
