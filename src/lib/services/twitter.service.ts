import crypto from "crypto";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const TWITTER_API_BASE = "https://api.twitter.com/2";
const TWITTER_AUTH_BASE = "https://twitter.com/i/oauth2";

export type TwitterTokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type TwitterUserInfo = {
  id: string;
  username: string;
  name: string;
};

export type TwitterPublishResult = {
  tweetId: string;
};

// --- PKCE Helpers ---

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

// --- OAuth ---

export function getAuthUrl(
  state: string,
  codeChallenge: string,
  appOrigin: string
): string {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const redirectUri = `${appOrigin}/api/oauth/twitter/callback`;
  const scopes = "tweet.read tweet.write users.read offline.access";

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId!,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `${TWITTER_AUTH_BASE}/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  appOrigin: string
): Promise<TwitterTokenResponse> {
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
  const redirectUri = `${appOrigin}/api/oauth/twitter/callback`;

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(`Twitter OAuth error: ${data.error_description || data.error}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<TwitterTokenResponse> {
  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(`Twitter refresh error: ${data.error_description || data.error}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

// --- API Calls ---

export async function getUserInfo(accessToken: string): Promise<TwitterUserInfo> {
  const res = await fetch(`${TWITTER_API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json();

  if (data.errors) {
    throw new Error(`Twitter user info error: ${data.errors[0]?.message}`);
  }

  return {
    id: data.data.id,
    username: data.data.username,
    name: data.data.name,
  };
}

export async function publishTweet(params: {
  accessToken: string;
  text: string;
  mediaIds?: string[];
}): Promise<TwitterPublishResult> {
  if (isDemoMode) {
    return { tweetId: `demo_tw_${Date.now()}` };
  }

  if (tweetWeightedLength(params.text) > 280) {
    throw new Error("Tweet exceeds 280 character limit");
  }

  const body: Record<string, unknown> = { text: params.text };
  if (params.mediaIds && params.mediaIds.length > 0) {
    body.media = { media_ids: params.mediaIds };
  }

  const res = await fetch(`${TWITTER_API_BASE}/tweets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.errors) {
    throw new Error(`Twitter publish error: ${data.errors[0]?.message}`);
  }

  if (res.status === 429) {
    throw new Error("Twitter rate limit reached. Please try again later.");
  }

  if (!res.ok) {
    throw new Error(`Twitter publish failed with status ${res.status}`);
  }

  return { tweetId: data.data.id };
}

export async function refreshTokenIfNeeded(account: {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
}): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date } | null> {
  if (!account.accessToken || !account.refreshToken) return null;

  // Twitter tokens expire in ~2 hours, refresh if expiring within 30 minutes
  if (account.expiresAt) {
    const thirtyMinFromNow = new Date(Date.now() + 30 * 60 * 1000);
    if (account.expiresAt > thirtyMinFromNow) return null;
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
    console.warn('[refreshTwitterToken] Token refresh failed:', error);
    return null;
  }
}

// --- OAuth 1.0a Helpers (for user-provided API keys) ---

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function generateOAuth1Header(params: {
  method: string;
  url: string;
  apiKey: string;
  apiKeySecret: string;
  accessToken: string;
  accessTokenSecret: string;
  extraParams?: Record<string, string>;
}): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: params.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: params.accessToken,
    oauth_version: '1.0',
  };

  // Combine oauth params with extra params for signature base
  const allParams: Record<string, string> = { ...oauthParams, ...(params.extraParams || {}) };
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys.map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`).join('&');

  const signatureBase = [
    params.method.toUpperCase(),
    percentEncode(params.url),
    percentEncode(paramString),
  ].join('&');

  const signingKey = `${percentEncode(params.apiKeySecret)}&${percentEncode(params.accessTokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');

  oauthParams['oauth_signature'] = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map(k => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

export async function verifyApiKeys(params: {
  apiKey: string;
  apiKeySecret: string;
  accessToken: string;
  accessTokenSecret: string;
}): Promise<TwitterUserInfo> {
  if (isDemoMode) {
    return { id: 'demo_id', username: 'demo_user', name: 'Demo User' };
  }

  const url = `${TWITTER_API_BASE}/users/me`;
  const authHeader = generateOAuth1Header({
    method: 'GET',
    url,
    apiKey: params.apiKey,
    apiKeySecret: params.apiKeySecret,
    accessToken: params.accessToken,
    accessTokenSecret: params.accessTokenSecret,
  });

  const res = await fetch(url, {
    headers: { Authorization: authHeader },
  });

  const data = await res.json();

  if (!res.ok || data.errors) {
    throw new Error(data.errors?.[0]?.message || `Twitter API error: ${res.status}`);
  }

  return {
    id: data.data.id,
    username: data.data.username,
    name: data.data.name,
  };
}

export async function publishTweetWithApiKeys(params: {
  apiKey: string;
  apiKeySecret: string;
  accessToken: string;
  accessTokenSecret: string;
  text: string;
  mediaIds?: string[];
}): Promise<TwitterPublishResult> {
  if (isDemoMode) {
    return { tweetId: `demo_tw_${Date.now()}` };
  }

  if (tweetWeightedLength(params.text) > 280) {
    throw new Error("Tweet exceeds 280 character limit");
  }

  const url = `${TWITTER_API_BASE}/tweets`;
  const authHeader = generateOAuth1Header({
    method: 'POST',
    url,
    apiKey: params.apiKey,
    apiKeySecret: params.apiKeySecret,
    accessToken: params.accessToken,
    accessTokenSecret: params.accessTokenSecret,
  });

  const body: Record<string, unknown> = { text: params.text };
  if (params.mediaIds && params.mediaIds.length > 0) {
    body.media = { media_ids: params.mediaIds };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok || data.errors) {
    throw new Error(data.errors?.[0]?.message || `Twitter publish failed: ${res.status}`);
  }

  return { tweetId: data.data.id };
}

// --- Media Upload (OAuth 1.0a, v1.1 endpoint) ---

const TWITTER_UPLOAD_BASE = "https://upload.twitter.com/1.1";

export async function uploadMediaWithApiKeys(params: {
  apiKey: string;
  apiKeySecret: string;
  accessToken: string;
  accessTokenSecret: string;
  mediaData: Buffer;
  mimeType: string;
}): Promise<string> {
  if (isDemoMode) {
    return `demo_media_${Date.now()}`;
  }

  const url = `${TWITTER_UPLOAD_BASE}/media/upload.json`;
  const base64Data = params.mediaData.toString("base64");

  const authHeader = generateOAuth1Header({
    method: "POST",
    url,
    apiKey: params.apiKey,
    apiKeySecret: params.apiKeySecret,
    accessToken: params.accessToken,
    accessTokenSecret: params.accessTokenSecret,
    extraParams: { media_data: base64Data },
  });

  const formBody = new URLSearchParams({ media_data: base64Data });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody.toString(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.errors?.[0]?.message || `Twitter media upload failed: ${res.status}`
    );
  }

  return data.media_id_string;
}

// --- Tweet length helpers ---

const URL_PATTERN = /https?:\/\/[^\s]+/g;
const TWITTER_SHORT_URL_LENGTH = 23;

/**
 * Calculate weighted tweet length where URLs are counted as 23 characters
 * (Twitter's t.co shortener) regardless of actual length.
 */
function tweetWeightedLength(text: string): number {
  let length = text.length;
  const urls = text.match(URL_PATTERN);
  if (urls) {
    for (const url of urls) {
      length -= url.length;
      length += TWITTER_SHORT_URL_LENGTH;
    }
  }
  return length;
}
