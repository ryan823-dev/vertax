"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { generateMultiPlatformContent } from "@/lib/services/openai.service";
import * as facebookService from "@/lib/services/facebook.service";
import * as twitterService from "@/lib/services/twitter.service";
import * as youtubeService from "@/lib/services/youtube.service";
import * as tiktokService from "@/lib/services/tiktok.service";
import { generatePresignedGetUrl } from "@/lib/oss";
import { formatPublishError } from "@/lib/utils/social.utils";
import { requireDecider } from "@/lib/permissions";
import type { Prisma } from "@prisma/client";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

type PostVersionInput = {
  platform: string;
  content: string;
  media?: string[];
  metrics?: Record<string, unknown>;
};

type PublishResult = {
  platform: string;
  success: boolean;
  error?: string;
  postId?: string;
  pending?: boolean;
  status?: string;
};

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
      {
        id: "demo-tt",
        platform: "tiktok",
        accountName: "@demo_creator",
        accountId: "demo-tt-id",
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        metadata: {
          username: "demo_creator",
          creatorInfo: getDemoTikTokCreatorInfo(),
        },
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

export async function getTikTokCreatorInfo(): Promise<{
  accountId: string;
  accountName: string;
  creatorInfo: tiktokService.TikTokCreatorInfo;
} | null> {
  if (isDemoMode) {
    return {
      accountId: "demo-tt",
      accountName: "@demo_creator",
      creatorInfo: getDemoTikTokCreatorInfo(),
    };
  }

  const session = await getSession();
  const account = await db.socialAccount.findFirst({
    where: {
      tenantId: session.user.tenantId,
      platform: "tiktok",
      isActive: true,
    },
  });

  if (!account) return null;

  const refreshed = await tiktokService.refreshTokenIfNeeded(account);
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

  if (!account.accessToken) {
    throw new Error("TikTok account needs to be reconnected.");
  }

  const creatorInfo = await tiktokService.queryCreatorInfo(account.accessToken);
  const accountName =
    creatorInfo.creator_username ||
    creatorInfo.creator_nickname ||
    account.accountName;

  await db.socialAccount.update({
    where: { id: account.id },
    data: {
      accountName,
      metadata: {
        ...toObjectRecord(account.metadata),
        creatorInfo,
      },
    },
  });

  return {
    accountId: account.id,
    accountName,
    creatorInfo,
  };
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
  versions: PostVersionInput[];
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
        create: data.versions.map((version) => ({
          platform: version.platform,
          content: version.content,
          media: version.media || [],
          metrics: (version.metrics || {}) as Prisma.InputJsonValue,
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
    versions?: PostVersionInput[];
  }
) {
  if (isDemoMode) return { id: postId, ...data };

  const session = await getSession();
  const existing = await db.socialPost.findFirst({
    where: { id: postId, tenantId: session.user.tenantId, deletedAt: null },
  });

  if (!existing) throw new Error("Post not found");
  if (existing.status === "published" || existing.status === "publishing") {
    throw new Error("Cannot edit posts that have been sent for publishing");
  }

  const post = await db.socialPost.update({
    where: { id: postId },
    data: {
      title: data.title,
      scheduledAt: data.scheduledAt,
      autoEngage: data.autoEngage,
    },
  });

  if (data.versions) {
    await db.postVersion.deleteMany({ where: { postId } });
    await db.postVersion.createMany({
      data: data.versions.map((version) => ({
        postId,
        platform: version.platform,
        content: version.content,
        media: version.media || [],
        metrics: (version.metrics || {}) as Prisma.InputJsonValue,
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
  results: PublishResult[];
}> {
  if (isDemoMode) {
    return {
      success: true,
      results: [
        { platform: "facebook", success: true, postId: `demo_fb_${Date.now()}` },
        { platform: "x", success: true, postId: `demo_tw_${Date.now()}` },
        { platform: "tiktok", success: true, postId: `demo_tt_${Date.now()}` },
      ],
    };
  }

  const session = await getSession();
  const roleCheck = requireDecider(session);
  if (!roleCheck.authorized) {
    throw new Error(roleCheck.error);
  }

  return publishSocialPostForTenant(postId, session.user.tenantId);
}

export async function publishSocialPostForTenant(
  postId: string,
  tenantId: string
): Promise<{
  success: boolean;
  results: PublishResult[];
}> {
  if (isDemoMode) return { success: true, results: [] };

  const post = await db.socialPost.findFirst({
    where: { id: postId, tenantId, deletedAt: null },
    include: { versions: true },
  });

  if (!post) throw new Error("Post not found");

  const results: PublishResult[] = [];

  for (const version of post.versions) {
    if (version.platformPostId) {
      const storedState = getTikTokStoredState(version.metrics);
      const pending =
        version.platform === "tiktok" &&
        storedState?.status !== "PUBLISH_COMPLETE" &&
        storedState?.status !== "FAILED";
      results.push({
        platform: version.platform,
        success: true,
        postId: version.platformPostId,
        pending,
        status: storedState?.status,
      });
      continue;
    }

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
          metrics: { ...toObjectRecord(version.metrics), shareUrl },
        },
      });
      results.push({
        platform: version.platform,
        success: true,
        postId: linkedinPostId,
      });
      continue;
    }

    const account = await db.socialAccount.findFirst({
      where: {
        tenantId,
        platform: version.platform,
        isActive: true,
      },
    });

    if (!account) {
      const error = `No connected ${version.platform} account`;
      await db.postVersion.update({
        where: { id: version.id },
        data: {
          error,
          publishAttempts: { increment: 1 },
        },
      });
      results.push({ platform: version.platform, success: false, error });
      continue;
    }

    try {
      let platformPostId: string;
      let pending = false;
      let status: string | undefined;
      let publishedAt: Date | null = new Date();
      let nextMetrics: Record<string, unknown> | undefined;
      const metadata = toStringRecord(account.metadata);
      const isApiKeys = metadata.authMethod === "api_keys";

      if (version.platform === "facebook") {
        if (!isApiKeys) {
          const refreshed = await facebookService.refreshTokenIfNeeded(account);
          if (refreshed) {
            await db.socialAccount.update({
              where: { id: account.id },
              data: {
                accessToken: refreshed.accessToken,
                expiresAt: refreshed.expiresAt,
              },
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
      } else if (version.platform === "tiktok") {
        const result = await publishTikTokVersion({
          version,
          account,
          tenantId,
        });
        platformPostId = result.platformPostId;
        pending = result.pending;
        status = result.status;
        publishedAt = result.publishedAt;
        nextMetrics = result.metrics;
      } else {
        throw new Error(`Unsupported platform: ${version.platform}`);
      }

      await db.postVersion.update({
        where: { id: version.id },
        data: {
          platformPostId,
          publishedAt,
          error: null,
          publishAttempts: { increment: 1 },
          ...(nextMetrics ? { metrics: nextMetrics as Prisma.InputJsonValue } : {}),
        },
      });

      results.push({
        platform: version.platform,
        success: true,
        postId: platformPostId,
        pending,
        status,
      });
    } catch (err) {
      const errorMsg = formatPublishError(err);
      await db.postVersion.update({
        where: { id: version.id },
        data: {
          error: errorMsg,
          publishAttempts: { increment: 1 },
        },
      });
      results.push({
        platform: version.platform,
        success: false,
        error: errorMsg,
      });
    }
  }

  const allSuccess = results.length > 0 && results.every((result) => result.success);
  const anySuccess = results.some((result) => result.success);
  const hasPending = results.some((result) => result.pending);
  const finalStatus = allSuccess
    ? hasPending
      ? "publishing"
      : "published"
    : anySuccess
      ? hasPending
        ? "publishing"
        : "published"
      : "failed";

  await db.socialPost.update({
    where: { id: postId },
    data: {
      status: finalStatus,
      publishedAt: finalStatus === "published" ? new Date() : undefined,
    },
  });

  if (finalStatus === "failed") {
    const failedPlatforms = results
      .filter((result) => !result.success)
      .map((result) => result.platform)
      .join(", ");
    try {
      await (
        db as unknown as Record<
          string,
          { create: (args: unknown) => Promise<unknown> }
        >
      ).notification.create({
        data: {
          tenantId,
          type: "publish_failed",
          title: "Social post publish failed",
          body: `"${post.title || "Untitled"}" failed on ${failedPlatforms}. Please check account authorization.`,
          actionUrl: "/customer/social",
        },
      });
    } catch {
      // Notification model may not exist in older deployments.
    }
  }

  revalidatePath("/customer/social");
  return { success: allSuccess, results };
}

async function publishTikTokVersion(params: {
  version: {
    id: string;
    content: string;
    media: string[];
    metrics: unknown;
  };
  account: {
    id: string;
    accountId: string;
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: Date | null;
  };
  tenantId: string;
}): Promise<{
  platformPostId: string;
  pending: boolean;
  status?: string;
  publishedAt: Date | null;
  metrics: Record<string, unknown>;
}> {
  const refreshed = await tiktokService.refreshTokenIfNeeded(params.account);
  if (refreshed) {
    await db.socialAccount.update({
      where: { id: params.account.id },
      data: {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: refreshed.expiresAt,
      },
    });
    params.account.accessToken = refreshed.accessToken;
  }

  if (!params.account.accessToken) {
    throw new Error("TikTok account needs to be reconnected.");
  }

  const mediaRef = params.version.media?.[0];
  if (!mediaRef) {
    throw new Error("TikTok publish requires one uploaded video.");
  }

  const config = tiktokService.getTikTokConfigFromMetrics(params.version.metrics);
  if (!config) {
    throw new Error("TikTok publish options are missing. Recreate this TikTok post.");
  }

  const media = await resolveTikTokVideoMedia(params.tenantId, mediaRef);
  const creatorInfo = await tiktokService.queryCreatorInfo(
    params.account.accessToken
  );
  const finalConfig = {
    ...config,
    videoDurationSec: config.videoDurationSec ?? media.durationSec,
  };

  const result = await tiktokService.publishVideoDirect({
    accessToken: params.account.accessToken,
    title: params.version.content,
    mediaUrl: media.mediaUrl,
    mimeType: media.mimeType,
    fileSize: media.fileSize,
    config: finalConfig,
    creatorInfo,
  });

  const state: tiktokService.TikTokPublishState = {
    publishId: result.publishId,
    status: result.status?.status || "PROCESSING_UPLOAD",
    failReason: result.status?.failReason,
    publicPostIds: result.status?.publicPostIds,
    uploadedBytes: result.status?.uploadedBytes,
    downloadedBytes: result.status?.downloadedBytes,
    syncedAt: new Date().toISOString(),
  };

  const pending = state.status !== "PUBLISH_COMPLETE";
  return {
    platformPostId: `tiktok:${result.publishId}`,
    pending,
    status: state.status,
    publishedAt: pending ? null : new Date(),
    metrics: tiktokService.mergeTikTokPublishState(params.version.metrics, state),
  };
}

async function resolveTikTokVideoMedia(tenantId: string, mediaRef: string): Promise<{
  mediaUrl: string;
  mimeType: string;
  fileSize: number;
  durationSec?: number;
}> {
  if (!mediaRef.startsWith("asset:")) {
    throw new Error("TikTok videos must be uploaded to the VertaX asset store first.");
  }

  const assetId = mediaRef.slice("asset:".length);
  const asset = await db.asset.findFirst({
    where: {
      id: assetId,
      tenantId,
      deletedAt: null,
    },
  });

  if (!asset) {
    throw new Error("TikTok video asset was not found.");
  }

  if (asset.fileCategory !== "video") {
    throw new Error("TikTok media asset must be a video.");
  }

  return {
    mediaUrl: await generatePresignedGetUrl(asset.storageKey, 3600),
    mimeType: asset.mimeType,
    fileSize: Number(asset.fileSize),
    durationSec: getNumberValue(toObjectRecord(asset.metadata).durationSec),
  };
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

  const post = await db.socialPost.findFirst({
    where: { id: postId, tenantId: session.user.tenantId },
    include: { versions: { where: { platformPostId: null } } },
  });

  if (!post) throw new Error("Post not found");

  for (const version of post.versions) {
    await db.postVersion.update({
      where: { id: version.id },
      data: { error: null },
    });
  }

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
    const metadata: Record<string, unknown> = { authMethod: "api_keys" };

    if (data.platform === "x") {
      accessToken = data.credentials.accessToken;
      refreshToken = data.credentials.accessTokenSecret;
      accountId = data.credentials.accountId || `x_${Date.now()}`;
      metadata.apiKey = data.credentials.apiKey;
      metadata.apiKeySecret = data.credentials.apiKeySecret;
      metadata.username = data.accountName;
    } else if (data.platform === "facebook") {
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
        metadata: metadata as Prisma.InputJsonValue,
        isActive: true,
      },
      update: {
        accountName: data.accountName,
        accessToken,
        refreshToken,
        expiresAt: null,
        metadata: metadata as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    revalidatePath("/customer/social/accounts");
    revalidatePath("/customer/social");
    return { success: true, accountId: account.id };
  } catch (err) {
    console.error("[saveSocialCredentials] Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save credentials",
    };
  }
}

export async function testSocialConnection(data: {
  platform: string;
  credentials: Record<string, string>;
}): Promise<{
  success: boolean;
  accountName?: string;
  accountId?: string;
  error?: string;
}> {
  if (isDemoMode) {
    return { success: true, accountName: "Demo Account", accountId: "demo_id" };
  }

  try {
    if (data.platform === "x") {
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
    }

    if (data.platform === "facebook") {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${data.credentials.pageId}?fields=name,id&access_token=${data.credentials.pageAccessToken}`
      );
      const fbData = await res.json();
      if (fbData.error) {
        throw new Error(fbData.error.message || "Facebook API error");
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
      error: err instanceof Error ? err.message : "Connection test failed",
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

function getDemoTikTokCreatorInfo(): tiktokService.TikTokCreatorInfo {
  return {
    creator_username: "demo_creator",
    creator_nickname: "Demo Creator",
    privacy_level_options: ["SELF_ONLY", "MUTUAL_FOLLOW_FRIENDS"],
    comment_disabled: false,
    duet_disabled: false,
    stitch_disabled: false,
    max_video_post_duration_sec: 300,
  };
}

function toObjectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
}

function toStringRecord(value: unknown): Record<string, string> {
  const record = toObjectRecord(value);
  return Object.fromEntries(
    Object.entries(record)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function getNumberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function getTikTokStoredState(metrics: unknown): tiktokService.TikTokPublishState | null {
  const state = toObjectRecord(metrics)[tiktokService.TIKTOK_PUBLISH_STATE_KEY];
  if (!state || typeof state !== "object" || Array.isArray(state)) return null;
  return state as tiktokService.TikTokPublishState;
}
