import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppUrl, resolveAppOrigin } from "@/lib/app-origin";
import { generatePKCE, generateState, getAuthUrl } from "@/lib/services/twitter.service";

export async function GET(req: NextRequest) {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const appOrigin = resolveAppOrigin(req);

  if (isDemoMode) {
    return NextResponse.redirect(getAppUrl("/customer/social/accounts?error=demo_mode", req));
  }

  if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
    return NextResponse.redirect(getAppUrl("/customer/social/accounts?error=not_configured", req));
  }

  const state = generateState();
  const { codeVerifier, codeChallenge } = generatePKCE();

  const cookieStore = await cookies();

  cookieStore.set("tw_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  cookieStore.set("tw_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const authUrl = getAuthUrl(state, codeChallenge, appOrigin);
  return NextResponse.redirect(authUrl);
}
