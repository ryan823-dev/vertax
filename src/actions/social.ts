"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { generateMultiPlatformContent } from "@/lib/services/openai.service";
import * as facebookService from "@/lib/services/facebook.service";
import * as twitterService from "@/lib/services/twitter.service";
import * as youtubeService from "@/lib/services/youtube.service";
import { formatPublishError } from "@/lib/utils/social.utils";
import { requireDecider } from "@/lib/permissions";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

async function getSession() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    throw new Error("Unauthorized");
  }
  return session;
}

// ==================== READ ====================

export async function getSocialPosts() {
  if (isDemoMode) return [];
  const session = await getSession();
  return db.socialPost.findMany({
    where: { tenantId: session.user.tenantId, deletedAt: null },
    include: { versions: true, author: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getSocialPost(id: string) {
  if (isDemoMode) return null;
  const session = await getSession();
  return db.socialPost.findFirst({
    where: { id, tenantId: session.user.tenantId, deletedAt: null },
    include: { versions: true, author: true },
  });
}

export async function getSocialAccounts() {
  if (isDemoMode) {
    return [
      {
        id: "demo-fb",
        platform: "facebook",
        accountName: "Demo Facebook Page",
        accountId: "demo-fb-id",
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        metadata: { pageName: "Demo Page", pageCategory: "Business" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "demo-tw",
        platform: "x",
        accountName: "@demo_account",
        accountId: "demo-tw-id",
        isActive: true,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        metadata: { username: "demo_account", name: "Demo User" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }
  const session = await getSession();
  return db.socialAccount.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
  });
}

// ==================== AI CONTENT GENERATION ====================

export async function generateAIContent(params: {
  topic: string;
  context?: string;
  tone: string;
  platforms: string[];
  language: string;
}): Promise<Record<string, string>> {
  return generateMultiPlatformContent({
    topic: params.topic,
    context: params.context,
    tone: params.tone,
    platforms: params.platforms,
    language: params.language,
  });
}

// ==================== CREATE / UPDATE / DELETE ====================

export async function createSocialPost(data: {
  title?: string;
  status?: string;
  scheduledAt?: Date;
  autoEngage?: boolean;
  versions: { platform: string; content: string }[];
}) {
  if (isDemoMode) {
    return { id: `demo_post_${Date.now()}`, ...data };
  }

  const session = await getSession();

  const post = await db.socialPost.create({
    data: {
      tenantId: session.user.tenantId,
      authorId: session.user.id,
      title: data.title,
      status: data.status || "draft",
      scheduledAt: data.scheduledAt,
      autoEngage: data.autoEngage || false,
      versions: {
        create: data.versions.map((v) => ({
          platform: v.platform,
          content: v.content,
        })),
      },
    },
    include: { versions: true },
  });

  revalidatePath("/customer/social");
  return post;
}

export async function updateSocialPost(
  postId: string,
  data: {
    title?: string;
    scheduledAt?: Date | null;
    autoEngage?: boolean;
    versions?: { platform: string; content: string }[];
  }
) {
  if (isDemoMode) return { id: postId, ...data };

  const session = await getSession();

  // Verify ownership
  const existing = await db.socialPost.findFirst({
    where: { id: postId, tenantId: session.user.tenantId, deletedAt: null },
  });
  if (!existing) throw new Error("Post not found");
  if (existing.status === "published") throw new Error("Cannot edit published posts");

  const post = await db.socialPost.update({
    where: { id: postId },
    data: {
      title: data.title,
      scheduledAt: data.scheduledAt,
      autoEngage: data.autoEngage,
    },
  });

  // Replace versions if provided
  if (data.versions) {
    await db.postVersion.deleteMany({ where: { postId } });
    await db.postVersion.createMany({
      data: data.versions.map((v) => ({
        postId,
        platform: v.platform,
        content: v.content,
      })),
    });
  }

  revalidatePath("/customer/social");
  return post;
}

export async function deleteSocialPost(postId: string) {
  if (isDemoMode) return;

  const session = await getSession();
  const roleCheck = requireDecider(session);
  if (!roleCheck.authorized) {
    throw new Error(roleCheck.error);
  }

  await db.socialPost.update({
    where: { id: postId, tenantId: session.user.tenantId },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/customer/social");
}

// ==================== PUBLISH ====================

export async function publishSocialPost(postId: string): Promise<{
  success: boolean;
  results: { platform: string; success: boolean; error?: string; postId?: string }[];
}> {
  if (isDemoMode) {
    return {
      success: true,
      results: [
        { platform: "facebook", success: true, postId: `demo_fb_${Date.now()}` },
        { platform: "x", success: true, postId: `demo_tw_${Date.now()}` },
      ],
    };
  }

  const session = await getSession();
  const roleCheck = requireDecider(session);
  if (!roleCheck.authorized) {
    throw new Error(roleCheck.error);
  }

  const post = await db.socialPost.findFirst({
    where: { id: postId, tenantId: session.user.tenantId, deletedAt: null },
    include: { versions: true },
  });

  if (!post) throw new Error("Post not found");

  const results: { platform: string; success: boolean; error?: string; postId?: string }[] = [];

  for (const version of post.versions) {
    if (version.platformPostId) {
      results.push({ platform: version.platform, success: true, postId: version.platformPostId });
      continue;
    }

    // LinkedIn uses Share URL mode - no API account needed
    if (version.platform === "linkedin") {
      const shareText = encodeURIComponent(version.content);
      const shareUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${shareText}`;
      const linkedinPostId = `linkedin_share_${Date.now()}`;
      await db.postVersion.update({
        where: { id: version.id },
        data: {
          platformPostId: linkedinPostId,
          publishedAt: new Date(),
          error: null,
          publishAttempts: { increment: 1 },
          metrics: { shareUrl },
        },
      });
      results.push({ platform: version.platform, success: true, postId: linkedinPostId });
      continue;
    }

    // Find active account for this platform
    const account = await db.socialAccount.findFirst({
      where: {
        tenantId: session.user.tenantId,
        platform: version.platform,
        isActive: true,
      },
    });

    if (!account) {
      await db.postVersion.update({
        where: { id: version.id },
        data: {
          error: `No connected ${version.platform} account`,
          publishAttempts: { increment: 1 },
        },
      });
      results.push({
        platform: version.platform,
        success: false,
        error: `No connected ${version.platform} account`,
      });
      continue;
    }

    try {
      let platformPostId: string;
      const metadata = account.metadata as Record<string, string>;
      const isApiKeys = metadata?.authMethod === 'api_keys';

      if (version.platform === "facebook") {
        if (!isApiKeys) {
          const refreshed = await facebookService.refreshTokenIfNeeded(account);
          if (refreshed) {
            await db.socialAccount.update({
              where: { id: account.id },
              data: { accessToken: refreshed.accessToken, expiresAt: refreshed.expiresAt },
            });
            account.accessToken = refreshed.accessToken;
          }
        }

        const result = await facebookService.publishToPage({
          pageAccessToken: account.accessToken!,
          pageId: metadata.pageId || account.accountId,
          message: version.content,
        });
        platformPostId = result.postId;
      } else if (version.platform === "x") {
        if (isApiKeys) {
          const result = await twitterService.publishTweetWithApiKeys({
            apiKey: metadata.apiKey,
            apiKeySecret: metadata.apiKeySecret,
            accessToken: account.accessToken!,
            accessTokenSecret: account.refreshToken!,
            text: version.content,
          });
          platformPostId = result.tweetId;
        } else {
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
        }
      } else if (version.platform === "youtube") {
        const refreshed = await youtubeService.refreshTokenIfNeeded(account);
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

        const result = await youtubeService.publishCommunityPost({
          accessToken: account.accessToken!,
          channelId: metadata.channelId || account.accountId,
          text: version.content,
        });
        platformPostId = result.postId;
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

      results.push({ platform: version.platform, success: true, postId: platformPostId });
    } catch (err) {
      const errorMsg = formatPublishError(err);
      await db.postVersion.update({
        where: { id: version.id },
        data: {
          error: errorMsg,
          publishAttempts: { increment: 1 },
        },
      });
      results.push({ platform: version.platform, success: false, error: errorMsg });
    }
  }

  // Update post status
  const allSuccess = results.every((r) => r.success);
  const anySuccess = results.some((r) => r.success);

  await db.socialPost.update({
    where: { id: postId },
    data: {
      status: allSuccess ? "published" : anySuccess ? "published" : "failed",
      publishedAt: anySuccess ? new Date() : undefined,
    },
  });

  revalidatePath("/customer/social");

  return { success: allSuccess, results };
}

export async function scheduleSocialPost(postId: string, scheduledAt: Date) {
  if (isDemoMode) return;

  const session = await getSession();

  await db.socialPost.update({
    where: { id: postId, tenantId: session.user.tenantId },
    data: { status: "scheduled", scheduledAt },
  });

  revalidatePath("/customer/social");
}

export async function retryFailedPublish(postId: string) {
  if (isDemoMode) {
    return { success: true, results: [] };
  }

  const session = await getSession();

  // Reset failed versions so they can be retried
  const post = await db.socialPost.findFirst({
    where: { id: postId, tenantId: session.user.tenantId },
    include: { versions: { where: { platformPostId: null } } },
  });

  if (!post) throw new Error("Post not found");

  // Clear errors on failed versions
  for (const v of post.versions) {
    await db.postVersion.update({
      where: { id: v.id },
      data: { error: null },
    });
  }

  // Re-attempt publish
  return publishSocialPost(postId);
}

// ==================== ACCOUNT MANAGEMENT ====================

export async function disconnectSocialAccount(accountId: string) {
  if (isDemoMode) return;

  const session = await getSession();

  await db.socialAccount.update({
    where: { id: accountId, tenantId: session.user.tenantId },
    data: { isActive: false, accessToken: null, refreshToken: null },
  });

  revalidatePath("/customer/social/accounts");
}

// ==================== CUSTOMER CREDENTIAL MANAGEMENT ====================

export async function saveSocialCredentials(data: {
  platform: string;
  accountName: string;
  credentials: Record<string, string>;
}): Promise<{ success: boolean; accountId?: string; error?: string }> {
  if (isDemoMode) {
    return { success: true, accountId: `demo_${data.platform}_${Date.now()}` };
  }

  const session = await getSession();
  const tenantId = session.user.tenantId;

  try {
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let accountId: string;
    const metadata: Record<string, unknown> = { authMethod: 'api_keys' };

    if (data.platform === 'x') {
      accessToken = data.credentials.accessToken;
      refreshToken = data.credentials.accessTokenSecret;
      accountId = data.credentials.accountId || `x_${Date.now()}`;
      metadata.apiKey = data.credentials.apiKey;
      metadata.apiKeySecret = data.credentials.apiKeySecret;
      metadata.username = data.accountName;
    } else if (data.platform === 'facebook') {
      accessToken = data.credentials.pageAccessToken;
      accountId = data.credentials.pageId;
      metadata.pageId = data.credentials.pageId;
      metadata.pageName = data.accountName;
    } else {
      return { success: false, error: `Unsupported platform: ${data.platform}` };
    }

    const account = await db.socialAccount.upsert({
      where: {
        tenantId_platform_accountId: {
          tenantId,
          platform: data.platform,
          accountId,
        },
      },
      create: {
        tenantId,
        platform: data.platform,
        accountName: data.accountName,
        accountId,
        accessToken,
        refreshToken,
        expiresAt: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: metadata as any,
        isActive: true,
      },
      update: {
        accountName: data.accountName,
        accessToken,
        refreshToken,
        expiresAt: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: metadata as any,
        isActive: true,
      },
    });

    revalidatePath("/customer/social/accounts");
    revalidatePath("/customer/social");
    return { success: true, accountId: account.id };
  } catch (err) {
    console.error('[saveSocialCredentials] Error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to save credentials' };
  }
}

export async function testSocialConnection(data: {
  platform: string;
  credentials: Record<string, string>;
}): Promise<{ success: boolean; accountName?: string; accountId?: string; error?: string }> {
  if (isDemoMode) {
    return { success: true, accountName: 'Demo Account', accountId: 'demo_id' };
  }

  try {
    if (data.platform === 'x') {
      const userInfo = await twitterService.verifyApiKeys({
        apiKey: data.credentials.apiKey,
        apiKeySecret: data.credentials.apiKeySecret,
        accessToken: data.credentials.accessToken,
        accessTokenSecret: data.credentials.accessTokenSecret,
      });
      return {
        success: true,
        accountName: `@${userInfo.username}`,
        accountId: userInfo.id,
      };
    } else if (data.platform === 'facebook') {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${data.credentials.pageId}?fields=name,id&access_token=${data.credentials.pageAccessToken}`
      );
      const fbData = await res.json();
      if (fbData.error) {
        throw new Error(fbData.error.message || 'Facebook API error');
      }
      return {
        success: true,
        accountName: fbData.name || data.credentials.pageId,
        accountId: fbData.id,
      };
    }

    return { success: false, error: `Unsupported platform: ${data.platform}` };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Connection test failed',
    };
  }
}

export async function deleteSocialAccountHard(accountId: string) {
  if (isDemoMode) return;

  const session = await getSession();

  await db.socialAccount.delete({
    where: { id: accountId, tenantId: session.user.tenantId },
  });

  revalidatePath("/customer/social/accounts");
  revalidatePath("/customer/social");
}
