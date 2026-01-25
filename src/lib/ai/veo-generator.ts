// Google Veo 2 Video Generator
// Uses Google Cloud Vertex AI for image-to-video generation

import { VertexAI } from '@google-cloud/vertexai';

export interface VeoGenerationResult {
  videoUrl: string;
  duration: number;
  status: 'completed' | 'processing' | 'failed';
}

export interface VeoConfig {
  projectId: string;
  location: string;
}

/**
 * Check if Google Cloud/Veo is configured
 */
export function isVeoConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLOUD_PROJECT &&
    (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_API_KEY)
  );
}

/**
 * Get Veo configuration status
 */
export function getVeoStatus(): { configured: boolean; message: string } {
  if (!process.env.GOOGLE_CLOUD_PROJECT) {
    return {
      configured: false,
      message: 'GOOGLE_CLOUD_PROJECT environment variable is not set'
    };
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_API_KEY) {
    return {
      configured: false,
      message: 'Google Cloud credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_API_KEY'
    };
  }

  return {
    configured: true,
    message: 'Google Cloud Veo 2 is configured'
  };
}

/**
 * Initialize Vertex AI client
 */
function getVertexAI(): VertexAI {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT!;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

  return new VertexAI({
    project: projectId,
    location: location,
  });
}

/**
 * Generate video from image using Google Veo 2
 *
 * Note: Veo 2 API access requires:
 * 1. Google Cloud project with Vertex AI enabled
 * 2. Veo 2 API access (may require allowlist)
 * 3. Proper IAM permissions
 */
export async function generateVideoFromImage(
  imageUrl: string,
  options?: {
    prompt?: string;
    duration?: number; // 5-8 seconds typical for Veo
    aspectRatio?: '9:16' | '16:9' | '1:1';
    motionAmount?: 'low' | 'medium' | 'high';
  }
): Promise<VeoGenerationResult> {
  if (!isVeoConfigured()) {
    throw new Error('Google Cloud not configured. Set GOOGLE_CLOUD_PROJECT and credentials.');
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT!;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

  // Fetch the image and convert to base64
  const imageResponse = await fetch(imageUrl.startsWith('/')
    ? `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${imageUrl}`
    : imageUrl
  );

  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image: ${imageResponse.status}`);
  }

  const imageBuffer = await imageResponse.arrayBuffer();
  const imageBase64 = Buffer.from(imageBuffer).toString('base64');
  const mimeType = imageResponse.headers.get('content-type') || 'image/png';

  // Build the video generation prompt
  const prompt = options?.prompt || 'Subtle cinematic motion, gentle movement, professional video feel';
  const motionDesc = {
    low: 'very subtle, minimal motion',
    medium: 'gentle, natural motion',
    high: 'dynamic, expressive motion'
  }[options?.motionAmount || 'medium'];

  // Call Vertex AI Veo 2 API
  // Note: The exact API format may vary based on your access level
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/veo-002:predict`;

  const requestBody = {
    instances: [
      {
        prompt: `${prompt}. ${motionDesc}. Smooth camera movement. High quality video.`,
        image: {
          bytesBase64Encoded: imageBase64,
          mimeType: mimeType
        }
      }
    ],
    parameters: {
      aspectRatio: options?.aspectRatio || '9:16',
      durationSeconds: options?.duration || 5,
      personGeneration: 'dont_allow', // Safety setting
      numberOfVideos: 1
    }
  };

  // Get access token
  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Veo 2 API error:', errorText);
    throw new Error(`Veo 2 API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  // Extract video URL from response
  // Note: Response format may vary
  if (result.predictions && result.predictions[0]) {
    const prediction = result.predictions[0];

    if (prediction.video) {
      return {
        videoUrl: prediction.video.uri || prediction.video.url,
        duration: options?.duration || 5,
        status: 'completed'
      };
    }

    // If video is still processing, return status
    if (prediction.operation) {
      return {
        videoUrl: '',
        duration: options?.duration || 5,
        status: 'processing'
      };
    }
  }

  throw new Error('Unexpected response format from Veo 2 API');
}

/**
 * Generate video from text prompt using Veo 2
 */
export async function generateVideoFromPrompt(
  prompt: string,
  options?: {
    duration?: number;
    aspectRatio?: '9:16' | '16:9' | '1:1';
  }
): Promise<VeoGenerationResult> {
  if (!isVeoConfigured()) {
    throw new Error('Google Cloud not configured');
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT!;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/veo-002:predict`;

  const requestBody = {
    instances: [
      {
        prompt: prompt
      }
    ],
    parameters: {
      aspectRatio: options?.aspectRatio || '9:16',
      durationSeconds: options?.duration || 5,
      numberOfVideos: 1
    }
  };

  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Veo 2 API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();

  if (result.predictions && result.predictions[0]?.video) {
    return {
      videoUrl: result.predictions[0].video.uri,
      duration: options?.duration || 5,
      status: 'completed'
    };
  }

  throw new Error('Failed to generate video');
}
