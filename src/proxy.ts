import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { isPlatformAdmin } from "@/lib/permissions";
import { resolveTenant } from "@/lib/tenant-resolver";

const { auth } = NextAuth(authConfig);

const publicPaths = ["/login", "/register", "/api/auth", "/api/inquiry"];
const CRON_ROUTES = ["/api/cron/", "/api/radar/sync"];

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "vertax.top";

function shouldBlockApiRequest(pathname: string, requestUrl: URL) {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  if (pathname.startsWith("/api/debug/")) {
    return NextResponse.json(
      {
        error: "Debug routes disabled in production",
        message: "Set DEBUG_ROUTES_ENABLED=true to enable",
        environment: process.env.NODE_ENV,
      },
      { status: 403 }
    );
  }

  const isCronRoute = CRON_ROUTES.some((route) => pathname.startsWith(route));
  if (isCronRoute) {
    const secret = requestUrl.searchParams.get("secret");
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid cron secret" },
        { status: 401 }
      );
    }
  }

  return null;
}

const proxy = auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    const blockedResponse = shouldBlockApiRequest(pathname, req.nextUrl);
    if (blockedResponse) {
      return blockedResponse;
    }

    return NextResponse.next();
  }

  // Get hostname from nextUrl for Vercel compatibility
  const hostname = req.nextUrl.hostname;
  
  // Resolve tenant and view mode from domain
  const tenantInfo = resolveTenant(hostname);
  const isCustomerView = tenantInfo.viewMode === "customer";

  // Helper to create redirect URL preserving the original host
  const createRedirectUrl = (path: string) => {
    return new URL(path, req.nextUrl.origin);
  };

  // Allow API auth routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow external API routes
  if (pathname.startsWith("/api/assets") || pathname.startsWith("/api/evidence") || pathname.startsWith("/api/ai")) {
    return NextResponse.next();
  }

  // Redirect root based on view mode
  if (pathname === "/") {
    // Check if accessing root domain (vertax.top) vs subdomain
    const hostParts = hostname.split(".");
    const isRootDomain = hostname === BASE_DOMAIN || hostname === "www." + BASE_DOMAIN || hostParts.length <= 2;
    
    // Root domain shows landing page, no redirect
    if (isRootDomain) {
      return NextResponse.next();
    }
    
    // Subdomain: always redirect to login
    return NextResponse.redirect(createRedirectUrl("/login"));
  }
  
  // For customer domains, redirect /dashboard to /customer/home
  if (isCustomerView && pathname.startsWith("/dashboard")) {
    const newPath = pathname.replace("/dashboard", "/customer/home");
    return NextResponse.redirect(createRedirectUrl(newPath));
  }

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p));

  // If not authenticated and not on public path, redirect to login
  if (!req.auth && !isPublicPath) {
    const loginUrl = createRedirectUrl("/login");
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    req.auth &&
    pathname.startsWith("/tower") &&
    !isPlatformAdmin({
      permissions: (req.auth.user?.permissions as string[]) ?? [],
      roleName: (req.auth.user?.roleName as string) ?? "",
    })
  ) {
    const fallbackPath = req.auth.user?.tenantId ? "/customer/home" : "/login";
    return NextResponse.redirect(createRedirectUrl(fallbackPath));
  }

  // If authenticated and on login/register, redirect to dashboard
  if (req.auth && (pathname === "/login" || pathname === "/register")) {
    const targetPath = isCustomerView ? "/customer/home" : "/tower";
    return NextResponse.redirect(createRedirectUrl(targetPath));
  }

  return NextResponse.next();
});

export { proxy };
export default proxy;

export const config = {
  matcher: [
    "/((?!_next|api/|.*\\..*).*)",
    "/api/debug/:path*",
    "/api/cron/:path*",
    "/api/radar/sync",
  ],
};
