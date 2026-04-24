import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getAppUrl, resolveAppOrigin } from "@/lib/app-origin";
import { getAuthUrl } from "@/lib/services/facebook.service";

export async function GET(req: NextRequest) {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const appOrigin = resolveAppOrigin(req);

  if (isDemoMode) {
    return NextResponse.redirect(getAppUrl("/customer/social/accounts?error=demo_mode", req));
  }

  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    return NextResponse.redirect(getAppUrl("/customer/social/accounts?error=not_configured", req));
  }

  const state = crypto.randomBytes(16).toString("hex");

  const cookieStore = await cookies();
  cookieStore.set("fb_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const authUrl = getAuthUrl(state, appOrigin);
  return NextResponse.redirect(authUrl);
}
