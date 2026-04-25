import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAppUrl, resolveAppOrigin } from "@/lib/app-origin";
import { generateState, getAuthUrl } from "@/lib/services/tiktok.service";

export async function GET(req: NextRequest) {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const appOrigin = resolveAppOrigin(req);

  if (isDemoMode) {
    return NextResponse.redirect(
      getAppUrl("/customer/social/accounts?error=demo_mode", req)
    );
  }

  if (!process.env.TIKTOK_CLIENT_KEY || !process.env.TIKTOK_CLIENT_SECRET) {
    return NextResponse.redirect(
      getAppUrl("/customer/social/accounts?error=tiktok_not_configured", req)
    );
  }

  const state = generateState();
  const cookieStore = await cookies();
  cookieStore.set("tt_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(getAuthUrl(state, appOrigin));
}
