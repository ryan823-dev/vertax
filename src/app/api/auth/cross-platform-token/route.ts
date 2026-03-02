import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateCrossPlatformJWT, TowerUser } from "@/lib/jwt-bridge";

// Base domain for validation
const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN || "vertax.top";

/**
 * Validate that the target URL is a valid Vertax subdomain
 */
function isValidTargetUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    
    // Allow subdomains of the base domain (but not tower.*)
    if (hostname.endsWith(`.${BASE_DOMAIN}`) && !hostname.startsWith("tower.")) {
      return true;
    }
    
    // Allow localhost for development
    if (hostname === "localhost" || hostname.startsWith("127.0.0.1")) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * POST /api/auth/cross-platform-token
 * 
 * Generates a cross-platform JWT for authenticated users to access Vertax subdomains.
 * This enables SSO flow: User logs in to Tower, then gets redirected to Vertax with a token.
 */
export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { targetUrl } = body;

    // Validate target URL
    if (!targetUrl || !isValidTargetUrl(targetUrl)) {
      return NextResponse.json(
        { error: "Invalid target URL" },
        { status: 400 }
      );
    }

    // Build user object for token generation
    const user: TowerUser = {
      id: session.user.id,
      email: session.user.email || "",
      name: session.user.name || undefined,
      tenantId: session.user.tenantId,
      tenantSlug: session.user.tenantSlug,
      tenantName: session.user.tenantName,
      roleName: session.user.roleName,
      permissions: session.user.permissions,
    };

    // Generate cross-platform tokens
    const { accessToken } = generateCrossPlatformJWT(user);

    return NextResponse.json({
      token: accessToken,
      expiresIn: "24h",
    });
  } catch (error) {
    console.error("Error generating cross-platform token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
