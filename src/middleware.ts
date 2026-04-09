import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { resolveTenant } from "@/lib/tenant-resolver";

const { auth } = NextAuth(authConfig);

const publicPaths = ["/login", "/register", "/api/auth", "/api/inquiry"];

const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "vertax.top";

export default auth((req) => {
  const { pathname } = req.nextUrl;
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

  // If authenticated and on login/register, redirect to dashboard
  if (req.auth && (pathname === "/login" || pathname === "/register")) {
    const targetPath = isCustomerView ? "/customer/home" : "/tower";
    return NextResponse.redirect(createRedirectUrl(targetPath));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next|api/|.*\\..*).*)"],
};
