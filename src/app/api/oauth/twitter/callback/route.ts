import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { resolveAppOrigin } from "@/lib/app-origin";
import { db } from "@/lib/db";
import {
  exchangeCodeForToken,
  getUserInfo,
} from "@/lib/services/twitter.service";

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
      return NextResponse.redirect(`${accountsUrl}?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${accountsUrl}?error=missing_params`);
    }

    // Verify state and get code verifier
    const cookieStore = await cookies();
    const storedState = cookieStore.get("tw_oauth_state")?.value;
    const codeVerifier = cookieStore.get("tw_code_verifier")?.value;
    cookieStore.delete("tw_oauth_state");
    cookieStore.delete("tw_code_verifier");

    if (state !== storedState) {
      return NextResponse.redirect(`${accountsUrl}?error=invalid_state`);
    }

    if (!codeVerifier) {
      return NextResponse.redirect(`${accountsUrl}?error=missing_verifier`);
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForToken(code, codeVerifier, appUrl);
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    // Get user info
    const userInfo = await getUserInfo(tokens.accessToken);

    // Upsert social account
    await db.socialAccount.upsert({
      where: {
        tenantId_platform_accountId: {
          tenantId: session.user.tenantId,
          platform: "x",
          accountId: userInfo.id,
        },
      },
      update: {
        accountName: `@${userInfo.username}`,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        isActive: true,
        metadata: {
          userId: userInfo.id,
          username: userInfo.username,
          name: userInfo.name,
        },
      },
      create: {
        tenantId: session.user.tenantId,
        platform: "x",
        accountId: userInfo.id,
        accountName: `@${userInfo.username}`,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        isActive: true,
        metadata: {
          userId: userInfo.id,
          username: userInfo.username,
          name: userInfo.name,
        },
      },
    });

    return NextResponse.redirect(`${accountsUrl}?success=twitter`);
  } catch (err) {
    console.error("Twitter OAuth callback error:", err);
    return NextResponse.redirect(`${accountsUrl}?error=callback_failed`);
  }
}
