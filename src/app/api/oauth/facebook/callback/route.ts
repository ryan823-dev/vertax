import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { resolveAppOrigin } from "@/lib/app-origin";
import { db } from "@/lib/db";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getPages,
  getUserInfo,
} from "@/lib/services/facebook.service";

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

    // Verify state (CSRF protection)
    const cookieStore = await cookies();
    const storedState = cookieStore.get("fb_oauth_state")?.value;
    cookieStore.delete("fb_oauth_state");

    if (state !== storedState) {
      return NextResponse.redirect(`${accountsUrl}?error=invalid_state`);
    }

    // Exchange code for short-lived token
    const shortToken = await exchangeCodeForToken(code, appUrl);

    // Exchange for long-lived token (60 days)
    const longToken = await getLongLivedToken(shortToken.accessToken);

    // Get user info
    const userInfo = await getUserInfo(longToken.accessToken);

    // Get managed pages
    const pages = await getPages(longToken.accessToken);

    if (pages.length === 0) {
      return NextResponse.redirect(`${accountsUrl}?error=no_pages`);
    }

    // Use the first page (can be enhanced to let user pick)
    const page = pages[0];
    const expiresAt = new Date(Date.now() + (longToken.expiresIn || 5184000) * 1000);

    // Upsert social account
    await db.socialAccount.upsert({
      where: {
        tenantId_platform_accountId: {
          tenantId: session.user.tenantId,
          platform: "facebook",
          accountId: page.id,
        },
      },
      update: {
        accountName: page.name,
        accessToken: page.accessToken, // page access token
        expiresAt,
        isActive: true,
        metadata: {
          userId: userInfo.id,
          userName: userInfo.name,
          pageId: page.id,
          pageName: page.name,
          pageCategory: page.category,
        },
      },
      create: {
        tenantId: session.user.tenantId,
        platform: "facebook",
        accountId: page.id,
        accountName: page.name,
        accessToken: page.accessToken,
        expiresAt,
        isActive: true,
        metadata: {
          userId: userInfo.id,
          userName: userInfo.name,
          pageId: page.id,
          pageName: page.name,
          pageCategory: page.category,
        },
      },
    });

    return NextResponse.redirect(`${accountsUrl}?success=facebook`);
  } catch (err) {
    console.error("Facebook OAuth callback error:", err);
    return NextResponse.redirect(`${accountsUrl}?error=callback_failed`);
  }
}
