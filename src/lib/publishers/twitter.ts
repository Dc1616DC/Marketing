// Twitter/X Publisher for Chase Wellness Marketing Automation
// Uses Twitter API v2 to post tweets

import crypto from 'crypto';

export interface TwitterPublishResult {
  success: boolean;
  externalId?: string;
  url?: string;
  error?: string;
}

// Twitter API v2 endpoint
const TWITTER_API_URL = 'https://api.twitter.com/2/tweets';

/**
 * Publish a tweet to Twitter/X
 *
 * Required environment variables:
 * - TWITTER_API_KEY: Your Twitter API key (also known as Consumer Key)
 * - TWITTER_API_SECRET: Your Twitter API secret (also known as Consumer Secret)
 * - TWITTER_ACCESS_TOKEN: OAuth 1.0a access token for your account
 * - TWITTER_ACCESS_SECRET: OAuth 1.0a access token secret
 *
 * To get these credentials:
 * 1. Go to https://developer.twitter.com/en/portal/dashboard
 * 2. Create a project and app if you haven't already
 * 3. Under "User authentication settings", enable OAuth 1.0a with read+write
 * 4. Generate access tokens for your account
 */
export async function publishToTwitter(text: string): Promise<TwitterPublishResult> {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  // Check for required credentials
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.error('Missing Twitter API credentials');
    return {
      success: false,
      error: 'Twitter API credentials not configured. Please set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, and TWITTER_ACCESS_SECRET environment variables.'
    };
  }

  // Validate tweet length
  if (text.length > 280) {
    return {
      success: false,
      error: `Tweet exceeds 280 characters (${text.length} chars). Please shorten the text.`
    };
  }

  try {
    // Generate OAuth 1.0a signature
    const oauth = generateOAuthHeader(
      'POST',
      TWITTER_API_URL,
      apiKey,
      apiSecret,
      accessToken,
      accessSecret
    );

    const response = await fetch(TWITTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': oauth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Twitter API error:', response.status, errorData);
      return {
        success: false,
        error: `Twitter API error: ${response.status} - ${JSON.stringify(errorData)}`
      };
    }

    const data = await response.json();
    const tweetId = data.data?.id;

    if (!tweetId) {
      return {
        success: false,
        error: 'No tweet ID returned from Twitter API'
      };
    }

    // Get the username from environment or use a placeholder
    const username = process.env.TWITTER_USERNAME || 'ChaseWellnessRD';

    return {
      success: true,
      externalId: tweetId,
      url: `https://twitter.com/${username}/status/${tweetId}`
    };

  } catch (error) {
    console.error('Twitter publish error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Generate OAuth 1.0a Authorization header for Twitter API
 *
 * This is a simplified implementation. For production, consider using
 * a library like 'oauth-1.0a' for more robust signature generation.
 */
function generateOAuthHeader(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  accessTokenSecret: string
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  // Create signature base string
  const sortedParams = Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key])}`)
    .join('&');

  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');

  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(accessTokenSecret)}`;

  // Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  oauthParams.oauth_signature = signature;

  // Build Authorization header
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  return authHeader;
}

/**
 * Validate that Twitter credentials are configured
 */
export function isTwitterConfigured(): boolean {
  return !!(
    process.env.TWITTER_API_KEY &&
    process.env.TWITTER_API_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    process.env.TWITTER_ACCESS_SECRET
  );
}
