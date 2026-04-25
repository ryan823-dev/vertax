import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { resolveAppOrigin } from "@/lib/app-origin";
import { db } from "@/lib/db";
import {
  exchangeCodeForToken,
  getUserInfo,
  queryCreatorInfo,
} from "@/lib/services/tiktok.service";
import type { TikTokUserInfo } from "@/lib/services/tiktok.service";

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
    const errorDescription = searchParams.get("error_description");

    if (error) {
      return NextResponse.redirect(
        `${accountsUrl}?error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(`${accountsUrl}?error=missing_params`);
    }

    const cookieStore = await cookies();
    const storedState = cookieStore.get("tt_oauth_state")?.value;
    cookieStore.delete("tt_oauth_state");

    if (state !== storedState) {
      return NextResponse.redirect(`${accountsUrl}?error=invalid_state`);
    }

    const tokens = await exchangeCodeForToken(code, appUrl);
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    const [userInfo, creatorInfo] = await Promise.all([
      getUserInfo(tokens.accessToken).catch((): TikTokUserInfo => ({
        openId: tokens.openId,
      })),
      queryCreatorInfo(tokens.accessToken),
    ]);

    const accountName =
      creatorInfo.creator_username ||
      creatorInfo.creator_nickname ||
      userInfo.displayName ||
      "TikTok Creator";

    await db.socialAccount.upsert({
      where: {
        tenantId_platform_accountId: {
          tenantId: session.user.tenantId,
          platform: "tiktok",
          accountId: tokens.openId,
        },
      },
      update: {
        accountName,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        isActive: true,
        metadata: {
          openId: tokens.openId,
          scope: tokens.scope,
          refreshExpiresAt: new Date(
            Date.now() + tokens.refreshExpiresIn * 1000
          ).toISOString(),
          displayName: userInfo.displayName,
          avatarUrl: userInfo.avatarUrl || creatorInfo.creator_avatar_url,
          creatorInfo,
        },
      },
      create: {
        tenantId: session.user.tenantId,
        platform: "tiktok",
        accountId: tokens.openId,
        accountName,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        isActive: true,
        metadata: {
          openId: tokens.openId,
          scope: tokens.scope,
          refreshExpiresAt: new Date(
            Date.now() + tokens.refreshExpiresIn * 1000
          ).toISOString(),
          displayName: userInfo.displayName,
          avatarUrl: userInfo.avatarUrl || creatorInfo.creator_avatar_url,
          creatorInfo,
        },
      },
    });

    return NextResponse.redirect(`${accountsUrl}?success=tiktok`);
  } catch (err) {
    console.error("TikTok OAuth callback error:", err);
    return NextResponse.redirect(`${accountsUrl}?error=tiktok_callback_failed`);
  }
}
