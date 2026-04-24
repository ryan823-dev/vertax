import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { resolveAppOrigin } from "@/lib/app-origin";
import { db } from "@/lib/db";
import {
  exchangeCodeForToken,
  getChannelInfo,
} from "@/lib/services/youtube.service";

export async function GET(req: NextRequest) {
  const appUrl = resolveAppOrigin(req);
  const accountsUrl = `${appUrl}/customer/social/accounts`;

  try {
    const session = await auth();
    if (!session?.user?.tenantId) {
      return NextResponse.redirect(`${accountsUrl}?error=unauthorized`);
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${accountsUrl}?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(`${accountsUrl}?error=missing_params`);
    }

    // Verify state
    const cookieStore = await cookies();
    const storedState = cookieStore.get("yt_oauth_state")?.value;
    cookieStore.delete("yt_oauth_state");

    if (state !== storedState) {
      return NextResponse.redirect(`${accountsUrl}?error=invalid_state`);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForToken(code, appUrl);
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    // Get channel info
    const channelInfo = await getChannelInfo(tokens.accessToken);

    // Upsert social account
    await db.socialAccount.upsert({
      where: {
        tenantId_platform_accountId: {
          tenantId: session.user.tenantId,
          platform: "youtube",
          accountId: channelInfo.id,
        },
      },
      update: {
        accountName: channelInfo.title,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        isActive: true,
        metadata: {
          channelId: channelInfo.id,
          channelTitle: channelInfo.title,
          customUrl: channelInfo.customUrl,
          thumbnailUrl: channelInfo.thumbnailUrl,
        },
      },
      create: {
        tenantId: session.user.tenantId,
        platform: "youtube",
        accountId: channelInfo.id,
        accountName: channelInfo.title,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        isActive: true,
        metadata: {
          channelId: channelInfo.id,
          channelTitle: channelInfo.title,
          customUrl: channelInfo.customUrl,
          thumbnailUrl: channelInfo.thumbnailUrl,
        },
      },
    });

    return NextResponse.redirect(`${accountsUrl}?success=youtube`);
  } catch (err) {
    console.error("YouTube OAuth callback error:", err);
    return NextResponse.redirect(`${accountsUrl}?error=callback_failed`);
  }
}
