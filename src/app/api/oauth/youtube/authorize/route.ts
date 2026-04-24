import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppUrl, resolveAppOrigin } from "@/lib/app-origin";
import { generateState, getAuthUrl } from "@/lib/services/youtube.service";

export async function GET(req: NextRequest) {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const appUrl = resolveAppOrigin(req);

  if (isDemoMode) {
    return NextResponse.redirect(getAppUrl("/customer/social/accounts?error=demo_mode", req));
  }

  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
    return NextResponse.redirect(getAppUrl("/customer/social/accounts?error=not_configured", req));
  }

  const state = generateState();

  const cookieStore = await cookies();
  cookieStore.set("yt_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const authUrl = getAuthUrl(state, appUrl);
  return NextResponse.redirect(authUrl);
}
