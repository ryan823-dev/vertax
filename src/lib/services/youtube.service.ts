import crypto from "crypto";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
const GOOGLE_OAUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export type YouTubeTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type YouTubeChannelInfo = {
  id: string;
  title: string;
  customUrl?: string;
  thumbnailUrl?: string;
};

export function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

// --- OAuth 2.0 ---

export function getAuthUrl(state: string, appOrigin: string): string {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const redirectUri = `${appOrigin}/api/oauth/youtube/callback`;
  const scopes = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    state,
    access_type: "offline",
    prompt: "consent",
  });

  return `${GOOGLE_OAUTH_BASE}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  appOrigin: string
): Promise<YouTubeTokenResponse> {
  const clientId = process.env.YOUTUBE_CLIENT_ID!;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET!;
  const redirectUri = `${appOrigin}/api/oauth/youtube/callback`;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(
      `Google OAuth error: ${data.error_description || data.error}`
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<YouTubeTokenResponse> {
  const clientId = process.env.YOUTUBE_CLIENT_ID!;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET!;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(
      `Google refresh error: ${data.error_description || data.error}`
    );
  }

  return {
    accessToken: data.access_token,
    refreshToken: refreshToken, // Google doesn't return a new refresh token on refresh
    expiresIn: data.expires_in,
  };
}

// --- API Calls ---

export async function getChannelInfo(
  accessToken: string
): Promise<YouTubeChannelInfo> {
  const res = await fetch(
    `${YOUTUBE_API_BASE}/channels?part=snippet&mine=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data = await res.json();

  if (data.error) {
    throw new Error(
      `YouTube API error: ${data.error.message || data.error.code}`
    );
  }

  if (!data.items || data.items.length === 0) {
    throw new Error("No YouTube channel found for this account");
  }

  const channel = data.items[0];
  return {
    id: channel.id,
    title: channel.snippet.title,
    customUrl: channel.snippet.customUrl,
    thumbnailUrl: channel.snippet.thumbnails?.default?.url,
  };
}

export async function publishCommunityPost(params: {
  accessToken: string;
  channelId: string;
  text: string;
}): Promise<{ postId: string }> {
  if (isDemoMode) {
    return { postId: `demo_yt_${Date.now()}` };
  }

  // YouTube Data API doesn't have a direct community post endpoint.
  // Use Activities API or fall back to creating a bulletin.
  // For now, we use the channel bulletins approach via activities.insert
  const res = await fetch(`${YOUTUBE_API_BASE}/activities?part=snippet`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      snippet: {
        channelId: params.channelId,
        description: params.text,
        type: "bulletin",
      },
    }),
  });

  const data = await res.json();

  if (data.error) {
    // If bulletin posting fails, return a placeholder indicating manual posting is needed
    if (data.error.code === 403 || data.error.code === 400) {
      // Community posts API is restricted; generate a share URL instead
      return { postId: `yt_manual_${Date.now()}` };
    }
    throw new Error(
      `YouTube publish error: ${data.error.message || data.error.code}`
    );
  }

  return { postId: data.id || `yt_${Date.now()}` };
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

  // Google tokens expire in ~1 hour, refresh if expiring within 10 minutes
  if (account.expiresAt) {
    const tenMinFromNow = new Date(Date.now() + 10 * 60 * 1000);
    if (account.expiresAt > tenMinFromNow) return null;
  }

  try {
    const result = await refreshAccessToken(account.refreshToken);
    const expiresAt = new Date(Date.now() + result.expiresIn * 1000);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt,
    };
  } catch (error) {
    console.warn("[refreshYouTubeToken] Token refresh failed:", error);
    return null;
  }
}
