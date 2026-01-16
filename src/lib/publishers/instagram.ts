// Instagram Publisher for Chase Wellness Marketing Automation
// Uses Instagram Graph API (requires Business/Creator account)

export interface InstagramPublishResult {
  success: boolean;
  externalId?: string;
  url?: string;
  error?: string;
}

const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Publish an image post to Instagram
 *
 * Required environment variables:
 * - INSTAGRAM_ACCESS_TOKEN: Long-lived access token from Facebook Graph API
 * - INSTAGRAM_BUSINESS_ID: Your Instagram Business Account ID
 *
 * To get these credentials:
 * 1. Connect your Instagram account to a Facebook Page (must be Business/Creator)
 * 2. Create a Facebook App at https://developers.facebook.com/
 * 3. Add the Instagram Graph API product
 * 4. Generate a User Access Token with instagram_basic, instagram_content_publish, pages_read_engagement
 * 5. Exchange for a long-lived token (valid 60 days)
 * 6. Get your Instagram Business Account ID via the API:
 *    GET /{page-id}?fields=instagram_business_account
 */
export async function publishToInstagram(
  caption: string,
  imageUrl: string
): Promise<InstagramPublishResult> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const businessId = process.env.INSTAGRAM_BUSINESS_ID;

  // Check for required credentials
  if (!accessToken || !businessId) {
    console.error('Missing Instagram API credentials');
    return {
      success: false,
      error: 'Instagram API credentials not configured. Please set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ID environment variables.'
    };
  }

  // Validate image URL
  if (!imageUrl || !imageUrl.startsWith('http')) {
    return {
      success: false,
      error: 'A valid publicly accessible image URL is required for Instagram posts.'
    };
  }

  // Validate caption length
  if (caption.length > 2200) {
    return {
      success: false,
      error: `Caption exceeds 2200 characters (${caption.length} chars). Please shorten the text.`
    };
  }

  try {
    // Step 1: Create a media container
    const containerResponse = await fetch(
      `${GRAPH_API_URL}/${businessId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption,
          access_token: accessToken,
        }),
      }
    );

    if (!containerResponse.ok) {
      const errorData = await containerResponse.json().catch(() => ({}));
      console.error('Instagram container creation error:', containerResponse.status, errorData);
      return {
        success: false,
        error: `Instagram API error: ${containerResponse.status} - ${JSON.stringify(errorData)}`
      };
    }

    const containerData = await containerResponse.json();
    const containerId = containerData.id;

    if (!containerId) {
      return {
        success: false,
        error: 'No container ID returned from Instagram API'
      };
    }

    // Step 2: Wait for container to be ready (Instagram processes images asynchronously)
    // In production, you might want to poll the status endpoint
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 3: Publish the container
    const publishResponse = await fetch(
      `${GRAPH_API_URL}/${businessId}/media_publish`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const errorData = await publishResponse.json().catch(() => ({}));
      console.error('Instagram publish error:', publishResponse.status, errorData);
      return {
        success: false,
        error: `Instagram publish error: ${publishResponse.status} - ${JSON.stringify(errorData)}`
      };
    }

    const publishData = await publishResponse.json();
    const mediaId = publishData.id;

    if (!mediaId) {
      return {
        success: false,
        error: 'No media ID returned from Instagram API'
      };
    }

    // Get permalink for the post
    const permalinkResponse = await fetch(
      `${GRAPH_API_URL}/${mediaId}?fields=permalink&access_token=${accessToken}`
    );

    let permalink = '';
    if (permalinkResponse.ok) {
      const permalinkData = await permalinkResponse.json();
      permalink = permalinkData.permalink || '';
    }

    return {
      success: true,
      externalId: mediaId,
      url: permalink || `https://www.instagram.com/p/${mediaId}/`
    };

  } catch (error) {
    console.error('Instagram publish error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Publish a carousel post to Instagram (multiple images)
 * Note: This requires additional setup and is more complex
 */
export async function publishCarouselToInstagram(
  caption: string,
  imageUrls: string[]
): Promise<InstagramPublishResult> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const businessId = process.env.INSTAGRAM_BUSINESS_ID;

  if (!accessToken || !businessId) {
    return {
      success: false,
      error: 'Instagram API credentials not configured.'
    };
  }

  if (imageUrls.length < 2 || imageUrls.length > 10) {
    return {
      success: false,
      error: 'Carousels require 2-10 images.'
    };
  }

  try {
    // Step 1: Create individual media containers for each image
    const childContainerIds: string[] = [];

    for (const imageUrl of imageUrls) {
      const response = await fetch(
        `${GRAPH_API_URL}/${businessId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: imageUrl,
            is_carousel_item: true,
            access_token: accessToken,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: `Failed to create carousel item: ${JSON.stringify(errorData)}`
        };
      }

      const data = await response.json();
      childContainerIds.push(data.id);
    }

    // Step 2: Create the carousel container
    const carouselResponse = await fetch(
      `${GRAPH_API_URL}/${businessId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: childContainerIds.join(','),
          caption: caption,
          access_token: accessToken,
        }),
      }
    );

    if (!carouselResponse.ok) {
      const errorData = await carouselResponse.json().catch(() => ({}));
      return {
        success: false,
        error: `Failed to create carousel: ${JSON.stringify(errorData)}`
      };
    }

    const carouselData = await carouselResponse.json();
    const carouselContainerId = carouselData.id;

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Step 3: Publish the carousel
    const publishResponse = await fetch(
      `${GRAPH_API_URL}/${businessId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: carouselContainerId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const errorData = await publishResponse.json().catch(() => ({}));
      return {
        success: false,
        error: `Failed to publish carousel: ${JSON.stringify(errorData)}`
      };
    }

    const publishData = await publishResponse.json();

    return {
      success: true,
      externalId: publishData.id,
      url: `https://www.instagram.com/p/${publishData.id}/`
    };

  } catch (error) {
    console.error('Instagram carousel publish error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Validate that Instagram credentials are configured
 */
export function isInstagramConfigured(): boolean {
  return !!(
    process.env.INSTAGRAM_ACCESS_TOKEN &&
    process.env.INSTAGRAM_BUSINESS_ID
  );
}
