import crypto from "crypto";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const TIKTOK_AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_API_BASE = "https://open.tiktokapis.com";
const DEFAULT_UPLOAD_CHUNK_SIZE = 64 * 1024 * 1024;

export const TIKTOK_PUBLISH_CONFIG_KEY = "tiktokPublishConfig";
export const TIKTOK_PUBLISH_STATE_KEY = "tiktokPublish";

export type TikTokTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  openId: string;
  scope: string;
};

export type TikTokUserInfo = {
  openId: string;
  displayName?: string;
  avatarUrl?: string;
};

export type TikTokCreatorInfo = {
  creator_avatar_url?: string;
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec?: number;
};

export type TikTokPublishConfig = {
  privacyLevel: string;
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
  videoCoverTimestampMs?: number;
  brandContentToggle?: boolean;
  brandOrganicToggle?: boolean;
  isAigc?: boolean;
  videoDurationSec?: number;
  userConsentAt?: string;
  sourceAssetId?: string;
  sourceFileName?: string;
};

export type TikTokPublishState = {
  publishId?: string;
  status?: string;
  failReason?: string;
  publicPostIds?: string[];
  uploadedBytes?: number;
  downloadedBytes?: number;
  syncedAt?: string;
};

type TikTokApiError = {
  code?: string;
  message?: string;
  log_id?: string;
  logid?: string;
};

type TikTokApiResponse<T> = {
  data?: T;
  error?: TikTokApiError;
};

export function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function getAuthUrl(state: string, appOrigin: string): string {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = `${appOrigin}/api/oauth/tiktok/callback`;
  const scope = "user.info.basic,video.publish";

  const params = new URLSearchParams({
    client_key: clientKey!,
    response_type: "code",
    scope,
    redirect_uri: redirectUri,
    state,
  });

  return `${TIKTOK_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  appOrigin: string
): Promise<TikTokTokenResponse> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY!;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET!;
  const redirectUri = `${appOrigin}/api/oauth/tiktok/callback`;

  const res = await fetch(`${TIKTOK_API_BASE}/v2/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      `TikTok OAuth error: ${data.error_description || data.error || res.status}`
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    refreshExpiresIn: data.refresh_expires_in,
    openId: data.open_id,
    scope: data.scope,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<TikTokTokenResponse> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY!;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET!;

  const res = await fetch(`${TIKTOK_API_BASE}/v2/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      `TikTok refresh error: ${data.error_description || data.error || res.status}`
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    refreshExpiresIn: data.refresh_expires_in,
    openId: data.open_id,
    scope: data.scope,
  };
}

export async function revokeAccessToken(accessToken: string): Promise<void> {
  const clientKey = process.env.TIKTOK_CLIENT_KEY!;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET!;

  await fetch(`${TIKTOK_API_BASE}/v2/oauth/revoke/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      token: accessToken,
    }),
  });
}

export async function getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
  const res = await fetch(
    `${TIKTOK_API_BASE}/v2/user/info/?fields=open_id,display_name,avatar_url`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const payload = (await res.json()) as TikTokApiResponse<{
    user?: {
      open_id?: string;
      display_name?: string;
      avatar_url?: string;
    };
  }>;

  assertTikTokOk(res, payload, "TikTok user info");

  return {
    openId: payload.data?.user?.open_id || "",
    displayName: payload.data?.user?.display_name,
    avatarUrl: payload.data?.user?.avatar_url,
  };
}

export async function queryCreatorInfo(
  accessToken: string
): Promise<TikTokCreatorInfo> {
  const res = await fetch(
    `${TIKTOK_API_BASE}/v2/post/publish/creator_info/query/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
    }
  );

  const payload = (await res.json()) as TikTokApiResponse<TikTokCreatorInfo>;
  assertTikTokOk(res, payload, "TikTok creator info");

  if (!payload.data) {
    throw new Error("TikTok creator info response is empty");
  }

  return payload.data;
}

export async function refreshTokenIfNeeded(account: {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
}): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
} | null> {
  if (!account.accessToken || !account.refreshToken) return null;

  if (account.expiresAt) {
    const tenMinFromNow = new Date(Date.now() + 10 * 60 * 1000);
    if (account.expiresAt > tenMinFromNow) return null;
  }

  const result = await refreshAccessToken(account.refreshToken);
  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: new Date(Date.now() + result.expiresIn * 1000),
  };
}

export async function publishVideoDirect(params: {
  accessToken: string;
  title: string;
  mediaUrl: string;
  mimeType: string;
  fileSize: number;
  config: TikTokPublishConfig;
  creatorInfo?: TikTokCreatorInfo;
}): Promise<{ publishId: string; status?: TikTokPublishState }> {
  if (isDemoMode) {
    return {
      publishId: `demo_tiktok_${Date.now()}`,
      status: { status: "PUBLISH_COMPLETE" },
    };
  }

  validateTikTokPublishInput(params);

  const videoBytes = await downloadVideoBytes(params.mediaUrl, params.fileSize);
  const chunkSize = Math.min(DEFAULT_UPLOAD_CHUNK_SIZE, videoBytes.byteLength);
  const totalChunkCount = Math.max(1, Math.ceil(videoBytes.byteLength / chunkSize));

  const initPayload = await initializeVideoPost({
    accessToken: params.accessToken,
    title: params.title,
    fileSize: videoBytes.byteLength,
    chunkSize,
    totalChunkCount,
    config: params.config,
  });

  if (!initPayload.upload_url) {
    throw new Error("TikTok did not return an upload URL");
  }

  await uploadVideoChunks({
    uploadUrl: initPayload.upload_url,
    videoBytes,
    mimeType: normalizeTikTokVideoMimeType(params.mimeType),
    chunkSize,
  });

  const status = await fetchPublishStatus({
    accessToken: params.accessToken,
    publishId: initPayload.publish_id,
  }).catch(() => undefined);

  return {
    publishId: initPayload.publish_id,
    status,
  };
}

export async function fetchPublishStatus(params: {
  accessToken: string;
  publishId: string;
}): Promise<TikTokPublishState> {
  const res = await fetch(`${TIKTOK_API_BASE}/v2/post/publish/status/fetch/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({ publish_id: params.publishId }),
  });

  const payload = (await res.json()) as TikTokApiResponse<{
    status?: string;
    fail_reason?: string;
    publicaly_available_post_id?: Array<string | number>;
    uploaded_bytes?: number;
    downloaded_bytes?: number;
  }>;

  assertTikTokOk(res, payload, "TikTok publish status");

  return {
    status: payload.data?.status,
    failReason: payload.data?.fail_reason,
    publicPostIds: payload.data?.publicaly_available_post_id?.map(String),
    uploadedBytes: payload.data?.uploaded_bytes,
    downloadedBytes: payload.data?.downloaded_bytes,
    syncedAt: new Date().toISOString(),
  };
}

export function getTikTokConfigFromMetrics(
  metrics: unknown
): TikTokPublishConfig | null {
  if (!metrics || typeof metrics !== "object") return null;
  const value = (metrics as Record<string, unknown>)[TIKTOK_PUBLISH_CONFIG_KEY];
  if (!value || typeof value !== "object") return null;
  const config = value as Partial<TikTokPublishConfig>;
  if (!config.privacyLevel || typeof config.privacyLevel !== "string") {
    return null;
  }
  return {
    privacyLevel: config.privacyLevel,
    disableComment: Boolean(config.disableComment),
    disableDuet: Boolean(config.disableDuet),
    disableStitch: Boolean(config.disableStitch),
    videoCoverTimestampMs: numberOrUndefined(config.videoCoverTimestampMs),
    brandContentToggle: Boolean(config.brandContentToggle),
    brandOrganicToggle: Boolean(config.brandOrganicToggle),
    isAigc: Boolean(config.isAigc),
    videoDurationSec: numberOrUndefined(config.videoDurationSec),
    userConsentAt:
      typeof config.userConsentAt === "string" ? config.userConsentAt : undefined,
    sourceAssetId:
      typeof config.sourceAssetId === "string" ? config.sourceAssetId : undefined,
    sourceFileName:
      typeof config.sourceFileName === "string" ? config.sourceFileName : undefined,
  };
}

export function mergeTikTokPublishState(
  metrics: unknown,
  state: TikTokPublishState
): Record<string, unknown> {
  const base =
    metrics && typeof metrics === "object"
      ? { ...(metrics as Record<string, unknown>) }
      : {};
  const previous =
    base[TIKTOK_PUBLISH_STATE_KEY] &&
    typeof base[TIKTOK_PUBLISH_STATE_KEY] === "object"
      ? (base[TIKTOK_PUBLISH_STATE_KEY] as Record<string, unknown>)
      : {};

  base[TIKTOK_PUBLISH_STATE_KEY] = {
    ...previous,
    ...state,
    syncedAt: state.syncedAt || new Date().toISOString(),
  };

  return base;
}

function validateTikTokPublishInput(params: {
  title: string;
  fileSize: number;
  mimeType: string;
  config: TikTokPublishConfig;
  creatorInfo?: TikTokCreatorInfo;
}) {
  if (!params.config.userConsentAt) {
    throw new Error("TikTok requires explicit creator consent before upload.");
  }

  if (utf16Length(params.title) > 2200) {
    throw new Error("TikTok caption exceeds 2200 UTF-16 code units.");
  }

  const mimeType = normalizeTikTokVideoMimeType(params.mimeType);
  if (!["video/mp4", "video/quicktime", "video/webm"].includes(mimeType)) {
    throw new Error("TikTok supports MP4, MOV/QuickTime, and WebM videos.");
  }

  const options = params.creatorInfo?.privacy_level_options;
  if (options?.length && !options.includes(params.config.privacyLevel)) {
    throw new Error("TikTok privacy option is no longer available for this account.");
  }

  const maxDuration = params.creatorInfo?.max_video_post_duration_sec;
  const duration = params.config.videoDurationSec;
  if (maxDuration && duration && duration > maxDuration) {
    throw new Error(
      `TikTok video is ${Math.ceil(duration)}s, above this creator's ${maxDuration}s limit.`
    );
  }

  if (!Number.isFinite(params.fileSize) || params.fileSize <= 0) {
    throw new Error("TikTok video file size is missing.");
  }
}

async function initializeVideoPost(params: {
  accessToken: string;
  title: string;
  fileSize: number;
  chunkSize: number;
  totalChunkCount: number;
  config: TikTokPublishConfig;
}): Promise<{ publish_id: string; upload_url?: string }> {
  const postInfo: Record<string, unknown> = {
    title: params.title,
    privacy_level: params.config.privacyLevel,
    disable_comment: Boolean(params.config.disableComment),
    disable_duet: Boolean(params.config.disableDuet),
    disable_stitch: Boolean(params.config.disableStitch),
    brand_content_toggle: Boolean(params.config.brandContentToggle),
    brand_organic_toggle: Boolean(params.config.brandOrganicToggle),
    is_aigc: Boolean(params.config.isAigc),
  };

  if (typeof params.config.videoCoverTimestampMs === "number") {
    postInfo.video_cover_timestamp_ms = params.config.videoCoverTimestampMs;
  }

  const res = await fetch(`${TIKTOK_API_BASE}/v2/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: postInfo,
      source_info: {
        source: "FILE_UPLOAD",
        video_size: params.fileSize,
        chunk_size: params.chunkSize,
        total_chunk_count: params.totalChunkCount,
      },
    }),
  });

  const payload = (await res.json()) as TikTokApiResponse<{
    publish_id: string;
    upload_url?: string;
  }>;

  assertTikTokOk(res, payload, "TikTok video init");

  if (!payload.data?.publish_id) {
    throw new Error("TikTok did not return a publish ID");
  }

  return payload.data;
}

async function downloadVideoBytes(
  mediaUrl: string,
  expectedSize: number
): Promise<Uint8Array> {
  const res = await fetch(mediaUrl);
  if (!res.ok) {
    throw new Error(`Could not fetch video asset for TikTok upload: ${res.status}`);
  }

  const buffer = new Uint8Array(await res.arrayBuffer());
  if (expectedSize > 0 && Math.abs(buffer.byteLength - expectedSize) > 1024) {
    throw new Error("TikTok video asset size changed after upload.");
  }

  return buffer;
}

async function uploadVideoChunks(params: {
  uploadUrl: string;
  videoBytes: Uint8Array;
  mimeType: string;
  chunkSize: number;
}) {
  const total = params.videoBytes.byteLength;

  for (let start = 0; start < total; start += params.chunkSize) {
    const endExclusive = Math.min(start + params.chunkSize, total);
    const chunk = params.videoBytes.slice(start, endExclusive);
    const res = await fetch(params.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": params.mimeType,
        "Content-Length": String(chunk.byteLength),
        "Content-Range": `bytes ${start}-${endExclusive - 1}/${total}`,
      },
      body: chunk,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`TikTok video upload failed: ${res.status} ${text}`);
    }
  }
}

function assertTikTokOk<T>(
  res: Response,
  payload: TikTokApiResponse<T>,
  label: string
) {
  const error = payload.error;
  if (!res.ok || (error?.code && error.code !== "ok")) {
    const code = error?.code || String(res.status);
    const message = error?.message || res.statusText || "Unknown error";
    const logId = error?.log_id || error?.logid;
    throw new Error(`${label} error: ${code} - ${message}${logId ? ` (${logId})` : ""}`);
  }
}

function normalizeTikTokVideoMimeType(mimeType: string): string {
  if (mimeType === "video/mov") return "video/quicktime";
  return mimeType || "video/mp4";
}

function utf16Length(value: string): number {
  return value.length;
}

function numberOrUndefined(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
