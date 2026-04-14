import { NextRequest, NextResponse } from "next/server";
import { ensureCronAuthorized } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import * as facebookService from "@/lib/services/facebook.service";
import * as twitterService from "@/lib/services/twitter.service";
import { formatPublishError } from "@/lib/utils/social.utils";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const unauthorizedResponse = ensureCronAuthorized(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    // Find all scheduled posts that are due
    const duePosts = await db.socialPost.findMany({
      where: {
        status: "scheduled",
        scheduledAt: { lte: new Date() },
        deletedAt: null,
      },
      include: { versions: true },
    });

    const results: { postId: string; success: boolean; errors?: string[] }[] = [];

    for (const post of duePosts) {
      const postErrors: string[] = [];
      let anySuccess = false;

      for (const version of post.versions) {
        // Skip already published versions
        if (version.platformPostId) {
          anySuccess = true;
          continue;
        }

        const account = await db.socialAccount.findFirst({
          where: {
            tenantId: post.tenantId,
            platform: version.platform,
            isActive: true,
          },
        });

        if (!account) {
          const err = `No connected ${version.platform} account`;
          await db.postVersion.update({
            where: { id: version.id },
            data: { error: err, publishAttempts: { increment: 1 } },
          });
          postErrors.push(err);
          continue;
        }

        try {
          let platformPostId: string;

          if (version.platform === "facebook") {
            const refreshed = await facebookService.refreshTokenIfNeeded(account);
            if (refreshed) {
              await db.socialAccount.update({
                where: { id: account.id },
                data: { accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt },
              });
              account.accessToken = refreshed.accessToken;
            }

            const metadata = account.metadata as Record<string, string>;
            const result = await facebookService.publishToPage({
              pageAccessToken: account.accessToken!,
              pageId: metadata.pageId || account.accountId,
              message: version.content,
            });
            platformPostId = result.postId;
          } else if (version.platform === "x") {
            const refreshed = await twitterService.refreshTokenIfNeeded(account);
            if (refreshed) {
              await db.socialAccount.update({
                where: { id: account.id },
                data: {
                  accessToken: refreshed.accessToken,
                  refreshToken: refreshed.refreshToken,
                  expiresAt: refreshed.expiresAt,
                },
              });
              account.accessToken = refreshed.accessToken;
            }

            const result = await twitterService.publishTweet({
              accessToken: account.accessToken!,
              text: version.content,
            });
            platformPostId = result.tweetId;
          } else {
            throw new Error(`Unsupported platform: ${version.platform}`);
          }

          await db.postVersion.update({
            where: { id: version.id },
            data: {
              platformPostId,
              publishedAt: new Date(),
              error: null,
              publishAttempts: { increment: 1 },
            },
          });
          anySuccess = true;
        } catch (err) {
          const errorMsg = formatPublishError(err);
          await db.postVersion.update({
            where: { id: version.id },
            data: { error: errorMsg, publishAttempts: { increment: 1 } },
          });
          postErrors.push(`${version.platform}: ${errorMsg}`);
        }
      }

      // Update post status
      await db.socialPost.update({
        where: { id: post.id },
        data: {
          status: anySuccess ? "published" : "failed",
          publishedAt: anySuccess ? new Date() : undefined,
        },
      });

      results.push({
        postId: post.id,
        success: anySuccess && postErrors.length === 0,
        errors: postErrors.length > 0 ? postErrors : undefined,
      });
    }

    return NextResponse.json({
      processed: duePosts.length,
      results,
    });
  } catch (error) {
    console.error("Cron publish error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

