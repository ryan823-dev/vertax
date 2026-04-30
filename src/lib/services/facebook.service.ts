const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export type FacebookTokenResponse = {
  accessToken: string;
  expiresIn?: number;
};

export type FacebookPage = {
  id: string;
  name: string;
  accessToken: string;
  category: string;
};

export type FacebookPublishResult = {
  postId: string;
};

export function getAuthUrl(state: string, appOrigin: string): string {
  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri = `${appOrigin}/api/oauth/facebook/callback`;
  const scopes = "pages_manage_posts,pages_read_engagement,pages_show_list";

  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}&response_type=code`;
}

export async function exchangeCodeForToken(
  code: string,
  appOrigin: string
): Promise<FacebookTokenResponse> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri = `${appOrigin}/api/oauth/facebook/callback`;

  const url = `${GRAPH_API_BASE}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(`Facebook OAuth error: ${data.error.message}`);
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function getLongLivedToken(shortToken: string): Promise<FacebookTokenResponse> {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  const url = `${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(`Facebook token exchange error: ${data.error.message}`);
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function getPages(accessToken: string): Promise<FacebookPage[]> {
  const url = `${GRAPH_API_BASE}/me/accounts?access_token=${accessToken}&fields=id,name,access_token,category`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(`Facebook pages error: ${data.error.message}`);
  }

  return (data.data || []).map((p: Record<string, string>) => ({
    id: p.id,
    name: p.name,
    accessToken: p.access_token,
    category: p.category,
  }));
}

export async function getUserInfo(accessToken: string): Promise<{ id: string; name: string }> {
  const url = `${GRAPH_API_BASE}/me?access_token=${accessToken}&fields=id,name`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(`Facebook user info error: ${data.error.message}`);
  }

  return { id: data.id, name: data.name };
}

export async function publishToPage(params: {
  pageAccessToken: string;
  pageId: string;
  message: string;
  link?: string;
  imageUrl?: string;
}): Promise<FacebookPublishResult> {
  if (isDemoMode) {
    return { postId: `demo_fb_${Date.now()}` };
  }

  // If an image is provided, publish as a photo post
  if (params.imageUrl) {
    const url = `${GRAPH_API_BASE}/${params.pageId}/photos`;
    const body: Record<string, string> = {
      url: params.imageUrl,
      caption: params.link
        ? `${params.message}\n\n${params.link}`
        : params.message,
      access_token: params.pageAccessToken,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (data.error) {
      handleFacebookError(data.error);
    }
    return { postId: data.post_id || data.id };
  }

  // Otherwise publish as a feed post (optionally with link)
  const url = `${GRAPH_API_BASE}/${params.pageId}/feed`;
  const body: Record<string, string> = {
    message: params.message,
    access_token: params.pageAccessToken,
  };
  if (params.link) {
    body.link = params.link;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.error) {
    handleFacebookError(data.error);
  }

  return { postId: data.id };
}

function handleFacebookError(error: { code?: number; message?: string }): never {
  const errorCode = error.code;
  if (errorCode === 190) {
    throw new Error("Facebook access token expired. Please reconnect your account.");
  }
  if (errorCode === 32) {
    throw new Error("Facebook API rate limit reached. Please try again later.");
  }
  throw new Error(`Facebook publish error: ${error.message}`);
}

export async function refreshTokenIfNeeded(account: {
  accessToken: string | null;
  expiresAt: Date | null;
}): Promise<{ accessToken: string; expiresAt: Date } | null> {
  if (!account.accessToken) return null;

  // If no expiry or not expiring within 7 days, no refresh needed
  if (account.expiresAt) {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (account.expiresAt > sevenDaysFromNow) return null;
  }

  try {
    const result = await getLongLivedToken(account.accessToken);
    const expiresAt = new Date(Date.now() + (result.expiresIn || 5184000) * 1000);
    return { accessToken: result.accessToken, expiresAt };
  } catch (error) {
    console.warn('[refreshFacebookToken] Token refresh failed:', error);
    return null;
  }
}
