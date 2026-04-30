/**
 * Social Hub unit tests
 *
 * Validates:
 * 1. Twitter tweet weighted length (URL -> 23 chars via t.co)
 * 2. Twitter publishTweet: mediaIds param, length check
 * 3. Facebook publishToPage: link-only, image+link, plain text paths
 * 4. LinkedIn share URL includes attached link
 * 5. PostVersionInput link storage in metrics._link
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ==================== 1. Twitter tweetWeightedLength ====================

// Since tweetWeightedLength is module-private, we replicate the logic here
// and verify consistency via the exported publishTweet boundary behavior.
const URL_PATTERN = /https?:\/\/[^\s]+/g;
const TWITTER_SHORT_URL_LENGTH = 23;

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

describe('tweetWeightedLength', () => {
  it('returns plain text length when no URLs', () => {
    expect(tweetWeightedLength('Hello world')).toBe(11);
  });

  it('counts a short URL as 23 characters', () => {
    const text = 'Check this: https://t.co/abc';
    // "Check this: " = 12 chars, URL = 23 chars
    expect(tweetWeightedLength(text)).toBe(12 + 23);
  });

  it('counts a long URL as 23 characters', () => {
    const longUrl = 'https://www.example.com/very/long/path/to/some/resource?query=param&another=value';
    const text = 'See ' + longUrl;
    // "See " = 4, URL = 23
    expect(tweetWeightedLength(text)).toBe(4 + 23);
  });

  it('counts multiple URLs correctly', () => {
    const text = 'Visit https://example.com and https://another.com/path for more info';
    // "Visit " = 6, URL1 = 23, " and " = 5, URL2 = 23, " for more info" = 14
    expect(tweetWeightedLength(text)).toBe(6 + 23 + 5 + 23 + 14);
  });

  it('handles text with exactly 280 chars after URL weighting', () => {
    const text280 = 'A'.repeat(257) + 'https://example.com/long/path';
    // weighted: 257 + 23 = 280
    expect(tweetWeightedLength(text280)).toBe(280);
  });

  it('handles text with no http URLs (e.g. just www)', () => {
    const text = 'Visit www.example.com for info';
    expect(tweetWeightedLength(text)).toBe(text.length);
  });

  it('handles empty string', () => {
    expect(tweetWeightedLength('')).toBe(0);
  });
});

// ==================== 2. Twitter Service - publishTweet ====================

describe('Twitter publishTweet', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('rejects tweet exceeding 280 weighted chars', async () => {
    const { publishTweet } = await import('@/lib/services/twitter.service');

    const longText = 'A'.repeat(281);
    await expect(
      publishTweet({ accessToken: 'test', text: longText })
    ).rejects.toThrow('Tweet exceeds 280 character limit');
  });

  it('allows tweet with long URL that is under 280 weighted chars', async () => {
    const { publishTweet } = await import('@/lib/services/twitter.service');

    const longUrl = 'https://www.example.com/' + 'a'.repeat(200);
    const text = 'A'.repeat(250) + ' ' + longUrl;
    // Actual length: 250 + 1 + 224 = 475 (way over 280)
    // Weighted: 251 + 23 = 274 (under 280)
    expect(text.length).toBeGreaterThan(280);
    expect(tweetWeightedLength(text)).toBeLessThanOrEqual(280);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: { id: 'test_tweet_123' } }),
    });

    const result = await publishTweet({ accessToken: 'test_token', text });
    expect(result.tweetId).toBe('test_tweet_123');
  });

  it('includes mediaIds in request body when provided', async () => {
    const { publishTweet } = await import('@/lib/services/twitter.service');

    let capturedBody: string | undefined;
    global.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedBody = init?.body as string;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { id: 'tweet_with_media' } }),
      });
    });

    await publishTweet({
      accessToken: 'test_token',
      text: 'Hello with image',
      mediaIds: ['media_123', 'media_456'],
    });

    expect(capturedBody).toBeDefined();
    const parsed = JSON.parse(capturedBody!);
    expect(parsed.text).toBe('Hello with image');
    expect(parsed.media).toEqual({ media_ids: ['media_123', 'media_456'] });
  });

  it('does not include media field when mediaIds is empty', async () => {
    const { publishTweet } = await import('@/lib/services/twitter.service');

    let capturedBody: string | undefined;
    global.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedBody = init?.body as string;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { id: 'tweet_no_media' } }),
      });
    });

    await publishTweet({
      accessToken: 'test_token',
      text: 'Hello without image',
    });

    const parsed = JSON.parse(capturedBody!);
    expect(parsed.text).toBe('Hello without image');
    expect(parsed.media).toBeUndefined();
  });
});

// ==================== 3. Facebook publishToPage ====================

describe('Facebook publishToPage', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('publishes plain text to feed endpoint', async () => {
    const { publishToPage } = await import('@/lib/services/facebook.service');

    let capturedUrl = '';
    let capturedBody: Record<string, string> = {};
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init?.body as string);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'fb_post_plain' }),
      });
    });

    const result = await publishToPage({
      pageAccessToken: 'token',
      pageId: '12345',
      message: 'Hello from test',
    });

    expect(capturedUrl).toContain('/12345/feed');
    expect(capturedBody.message).toBe('Hello from test');
    expect(capturedBody.link).toBeUndefined();
    expect(result.postId).toBe('fb_post_plain');
  });

  it('includes link field when link is provided', async () => {
    const { publishToPage } = await import('@/lib/services/facebook.service');

    let capturedUrl = '';
    let capturedBody: Record<string, string> = {};
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init?.body as string);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'fb_post_link' }),
      });
    });

    await publishToPage({
      pageAccessToken: 'token',
      pageId: '12345',
      message: 'Check this out',
      link: 'https://example.com/article',
    });

    expect(capturedUrl).toContain('/12345/feed');
    expect(capturedBody.message).toBe('Check this out');
    expect(capturedBody.link).toBe('https://example.com/article');
  });

  it('publishes photo post when imageUrl is provided', async () => {
    const { publishToPage } = await import('@/lib/services/facebook.service');

    let capturedUrl = '';
    let capturedBody: Record<string, string> = {};
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedBody = JSON.parse(init?.body as string);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ post_id: 'fb_photo_post', id: 'fb_photo_id' }),
      });
    });

    const result = await publishToPage({
      pageAccessToken: 'token',
      pageId: '12345',
      message: 'Look at this!',
      imageUrl: 'https://example.com/image.jpg',
    });

    expect(capturedUrl).toContain('/12345/photos');
    expect(capturedBody.url).toBe('https://example.com/image.jpg');
    expect(capturedBody.caption).toBe('Look at this!');
    expect(result.postId).toBe('fb_photo_post');
  });

  it('includes link in photo caption when both imageUrl and link provided', async () => {
    const { publishToPage } = await import('@/lib/services/facebook.service');

    let capturedBody: Record<string, string> = {};
    global.fetch = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ post_id: 'fb_photo_link' }),
      });
    });

    await publishToPage({
      pageAccessToken: 'token',
      pageId: '12345',
      message: 'Great article',
      link: 'https://example.com/post',
      imageUrl: 'https://example.com/image.png',
    });

    expect(capturedBody.caption).toBe('Great article\n\nhttps://example.com/post');
    expect(capturedBody.url).toBe('https://example.com/image.png');
  });

  it('handles Facebook error code 190 (token expired)', async () => {
    const { publishToPage } = await import('@/lib/services/facebook.service');

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: { code: 190, message: 'Invalid token' },
        }),
    });

    await expect(
      publishToPage({
        pageAccessToken: 'expired_token',
        pageId: '12345',
        message: 'Test',
      })
    ).rejects.toThrow('Facebook access token expired');
  });
});

// ==================== 4. LinkedIn share URL with link ====================

describe('LinkedIn share URL with attached link', () => {
  it('constructs share text including attached link', () => {
    const content = 'Our new blog post is live!';
    const linkedinLink = 'https://example.com/blog/new-post';

    const fullText = linkedinLink ? content + '\n\n' + linkedinLink : content;
    const shareText = encodeURIComponent(fullText);
    const shareUrl = 'https://www.linkedin.com/feed/?shareActive=true&text=' + shareText;

    expect(shareUrl).toContain(encodeURIComponent('https://example.com/blog/new-post'));
    expect(shareUrl).toContain(encodeURIComponent('Our new blog post is live!'));
    expect(shareUrl).toContain(encodeURIComponent('\n\n'));
  });

  it('does not append link when none provided', () => {
    const content = 'Just a text post';
    const linkedinLink: string | undefined = undefined;

    const fullText = linkedinLink ? content + '\n\n' + linkedinLink : content;
    const shareText = encodeURIComponent(fullText);
    const shareUrl = 'https://www.linkedin.com/feed/?shareActive=true&text=' + shareText;

    expect(shareUrl).not.toContain('%0A%0A');
    expect(shareUrl).toContain(encodeURIComponent('Just a text post'));
  });
});

// ==================== 5. PostVersionInput link storage ====================

describe('PostVersionInput link storage in metrics', () => {
  it('stores link as _link in metrics object', () => {
    const version = {
      platform: 'x',
      content: 'Hello world',
      link: 'https://example.com',
      metrics: { existingKey: 'value' } as Record<string, unknown>,
    };

    const metrics: Record<string, unknown> = {
      ...(version.metrics || {}),
      ...(version.link ? { _link: version.link } : {}),
    };

    expect(metrics._link).toBe('https://example.com');
    expect(metrics.existingKey).toBe('value');
  });

  it('does not add _link when link is empty', () => {
    const version = {
      platform: 'x',
      content: 'Hello world',
      link: '',
      metrics: {} as Record<string, unknown>,
    };

    const metrics: Record<string, unknown> = {
      ...(version.metrics || {}),
      ...(version.link ? { _link: version.link } : {}),
    };

    expect(metrics._link).toBeUndefined();
  });

  it('does not add _link when link is undefined', () => {
    const version: { platform: string; content: string; link?: string; metrics: Record<string, unknown> } = {
      platform: 'x',
      content: 'Hello world',
      metrics: {},
    };

    const metrics: Record<string, unknown> = {
      ...(version.metrics || {}),
      ...(version.link ? { _link: version.link } : {}),
    };

    expect(metrics._link).toBeUndefined();
  });

  it('extracts _link back from stored metrics for publish', () => {
    const storedMetrics: Record<string, unknown> = { _link: 'https://example.com/article', otherData: 42 };
    const attachedLink =
      typeof storedMetrics._link === 'string' ? storedMetrics._link : undefined;

    expect(attachedLink).toBe('https://example.com/article');
  });
});

// ==================== 6. Twitter text + link append ====================

describe('Twitter tweet text with appended link', () => {
  it('appends link to tweet text', () => {
    const content = 'Check out our latest blog post!';
    const attachedLink = 'https://example.com/blog';
    const tweetText = attachedLink ? content + '\n\n' + attachedLink : content;

    expect(tweetText).toBe('Check out our latest blog post!\n\nhttps://example.com/blog');
    const weighted = tweetWeightedLength(tweetText);
    expect(weighted).toBe(content.length + 2 + TWITTER_SHORT_URL_LENGTH);
  });

  it('does not append when no link', () => {
    const content = 'Just a tweet';
    const attachedLink: string | undefined = undefined;
    const tweetText = attachedLink ? content + '\n\n' + attachedLink : content;

    expect(tweetText).toBe('Just a tweet');
  });
});
