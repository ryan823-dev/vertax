import { NextRequest, NextResponse } from "next/server";
import { ensureCronAuthorized } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { publishSocialPostForTenant } from "@/actions/social";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const unauthorizedResponse = ensureCronAuthorized(req);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const duePosts = await db.socialPost.findMany({
      where: {
        status: "scheduled",
        scheduledAt: { lte: new Date() },
        deletedAt: null,
      },
      select: { id: true, tenantId: true, title: true },
    });

    const results: { postId: string; success: boolean; error?: string }[] = [];

    for (const post of duePosts) {
      try {
        const result = await publishSocialPostForTenant(post.id, post.tenantId);
        results.push({
          postId: post.id,
          success: result.success,
          error: result.success
            ? undefined
            : result.results
                .filter((item) => !item.success)
                .map((item) => `${item.platform}: ${item.error || "failed"}`)
                .join("; "),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await db.socialPost
          .update({
            where: { id: post.id },
            data: { status: "failed" },
          })
          .catch(() => {});
        results.push({ postId: post.id, success: false, error: message });
      }
    }

    return NextResponse.json({
      processed: duePosts.length,
      published: results.filter((result) => result.success).length,
      failed: results.filter((result) => !result.success).length,
      results,
    });
  } catch (error) {
    console.error("Cron publish error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
