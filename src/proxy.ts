import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { ensureCronAuthorized } from "@/lib/cron-auth";
import { isDebugEnabled } from "@/lib/debug-guard";
import { isPlatformAdmin } from "@/lib/permissions";
import { getTenantCanonicalRedirectUrl, resolveTenant } from "@/lib/tenant-resolver";

const { auth } = NextAuth(authConfig);

const publicPaths = ["/login", "/register", "/api/auth", "/api/inquiry"];
const CRON_ROUTES = ["/api/cron/"];

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "vertax.top";

function shouldBlockApiRequest(
  pathname: string,
  request: {
    headers: Headers;
    nextUrl: URL;
    auth?: {
      user?: {
        permissions?: unknown;
        roleName?: unknown;
      };
    } | null;
  },
) {
  if (pathname.startsWith("/api/debug/")) {
    if (process.env.NODE_ENV !== "production") {
      return null;
    }

    if (!isDebugEnabled()) {
      return NextResponse.json(
        {
          error: "Debug routes disabled in production",
          message: "Set DEBUG_ROUTES_ENABLED=true to enable temporary access",
          environment: process.env.NODE_ENV,
        },
        { status: 403 }
      );
    }

    if (!request.auth?.user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Debug routes require an authenticated platform admin" },
        { status: 401 }
      );
    }

    if (
      !isPlatformAdmin({
        permissions: (request.auth.user.permissions as string[]) ?? [],
        roleName: (request.auth.user.roleName as string) ?? "",
      })
    ) {
      return NextResponse.json(
        { error: "Forbidden", message: "Debug routes are restricted to platform administrators" },
        { status: 403 }
      );
    }
  }

  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const isCronRoute = CRON_ROUTES.some((route) => pathname.startsWith(route));
  if (isCronRoute) {
    return ensureCronAuthorized(request);
  }

  return null;
}

const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const forwardedRequestHeaders = new Headers(req.headers);
  forwardedRequestHeaders.set("x-vertax-current-path", pathname);
  forwardedRequestHeaders.set("x-vertax-current-search", req.nextUrl.search);

  if (pathname.startsWith("/api/")) {
    const blockedResponse = shouldBlockApiRequest(pathname, req);
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
  const isPlatformAdminUser = isPlatformAdmin({
    permissions: (req.auth?.user?.permissions as string[]) ?? [],
    roleName: (req.auth?.user?.roleName as string) ?? "",
  });

  // Helper to create redirect URL preserving the original host
  const createRedirectUrl = (path: string) => {
    return new URL(path, req.nextUrl.origin);
  };
  const continueWithRequestContext = () =>
    NextResponse.next({
      request: {
        headers: forwardedRequestHeaders,
      },
    });

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
      return continueWithRequestContext();
    }
    
    // Subdomain: always redirect to login
    return NextResponse.redirect(createRedirectUrl("/login"));
  }

  const canonicalTenantUrl =
    req.auth && !isPlatformAdminUser
      ? getTenantCanonicalRedirectUrl({
          currentUrl: req.nextUrl,
          sessionTenantSlug: req.auth.user?.tenantSlug as string | undefined,
        })
      : null;

  if (canonicalTenantUrl) {
    console.warn(
      `[tenant-host-mismatch] Redirecting authenticated tenant user from ${hostname} to ${canonicalTenantUrl}`,
    );
    return NextResponse.redirect(new URL(canonicalTenantUrl));
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
    !isPlatformAdminUser
  ) {
    const fallbackPath = req.auth.user?.tenantId ? "/customer/home" : "/login";
    return NextResponse.redirect(createRedirectUrl(fallbackPath));
  }

  // If authenticated and on login/register, redirect to dashboard
  if (req.auth && (pathname === "/login" || pathname === "/register")) {
    const targetPath = isCustomerView ? "/customer/home" : "/tower";
    return NextResponse.redirect(createRedirectUrl(targetPath));
  }

  return continueWithRequestContext();
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
