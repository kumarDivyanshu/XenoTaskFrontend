import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"]; // pages accessible without auth
const PROTECTED_PREFIXES = ["/dashboard", "/analytics", "/tenants", "/events"]; // guard these

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;
  const pathname = nextUrl.pathname;

  // Skip Next.js internals and root routing handled by the app's server components
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const token = cookies.get("auth_token")?.value;
  const isAuthenticated = !!token;

  // If authenticated, prevent accessing auth pages like /login or /register
  if (isAuthenticated && isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // If NOT authenticated, block protected sections
  if (!isAuthenticated && isProtectedPath(pathname)) {
    const target = new URL("/login", req.url);
    // Preserve intent
    const next = pathname + (nextUrl.search || "");
    target.searchParams.set("next", next);
    return NextResponse.redirect(target);
  }

  // Otherwise, continue to the requested page
  return NextResponse.next();
}

export const config = {
  // Run on all application routes except Next internals and static assets
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
