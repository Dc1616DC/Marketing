// Runway ML Video Generator
// Uses Runway Gen-3 Alpha for image-to-video generation

export interface RunwayGenerationResult {
  videoUrl: string;
  duration: number;
  status: 'completed' | 'processing' | 'failed';
  taskId?: string;
}

/**
 * Check if Runway ML is configured
 */
export function isRunwayConfigured(): boolean {
  return !!process.env.RUNWAY_API_KEY;
}

/**
 * Get Runway configuration status
 */
export function getRunwayStatus(): { configured: boolean; message: string } {
  if (!process.env.RUNWAY_API_KEY) {
    return {
      configured: false,
      message: 'RUNWAY_API_KEY environment variable is not set'
    };
  }

  return {
    configured: true,
    message: 'Runway ML is configured'
  };
}

/**
 * Generate video from image using Runway Gen-3 Alpha
 */
export async function generateVideoFromImage(
  imageUrl: string,
  options?: {
    prompt?: string;
    duration?: 5 | 10; // Runway supports 5 or 10 second videos
    ratio?: '1280:768' | '768:1280'; // Runway's format: landscape or portrait
  }
): Promise<RunwayGenerationResult> {
  if (!isRunwayConfigured()) {
    throw new Error('Runway ML not configured. Set RUNWAY_API_KEY in .env.local');
  }

  const apiKey = process.env.RUNWAY_API_KEY!;

  // If imageUrl is a local path, we need to fetch and convert to base64
  let imageData: string;
  if (imageUrl.startsWith('/') || imageUrl.startsWith('http://localhost')) {
    const fullUrl = imageUrl.startsWith('/')
      ? `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${imageUrl}`
      : imageUrl;

    const imageResponse = await fetch(fullUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    const buffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/png';
    imageData = `data:${mimeType};base64,${base64}`;
  } else {
    // External URL - Runway can fetch it directly
    imageData = imageUrl;
  }

  // Create the generation task
  const createResponse = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06'
    },
    body: JSON.stringify({
      model: 'gen3a_turbo',
      promptImage: imageData,
      promptText: options?.prompt || 'Very subtle camera movement, gentle parallax effect, keep subject stable, cinematic lighting, no morphing',
      duration: options?.duration || 5,
      ratio: '768:1280'
    })
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error('Runway API error:', errorText);
    throw new Error(`Runway API error: ${createResponse.status} - ${errorText}`);
  }

  const createResult = await createResponse.json();
  const taskId = createResult.id;

  if (!taskId) {
    throw new Error('No task ID returned from Runway');
  }

  // Poll for completion (Runway uses async generation)
  const videoUrl = await pollForCompletion(apiKey, taskId);

  return {
    videoUrl,
    duration: options?.duration || 5,
    status: 'completed',
    taskId
  };
}

/**
 * Poll Runway API for task completion with retry logic
 */
async function pollForCompletion(apiKey: string, taskId: string, maxAttempts = 90): Promise<string> {
  let consecutiveErrors = 0;
  const maxConsecutiveErrors = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const statusResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Runway-Version': '2024-11-06'
        }
      });

      if (!statusResponse.ok) {
        consecutiveErrors++;
        console.warn(`Runway status check failed (attempt ${attempt + 1}): ${statusResponse.status}`);

        if (consecutiveErrors >= maxConsecutiveErrors) {
          throw new Error(`Failed to check task status after ${maxConsecutiveErrors} attempts: ${statusResponse.status}`);
        }

        // Wait longer before retrying after error
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }

      // Reset error counter on success
      consecutiveErrors = 0;

      const status = await statusResponse.json();
      console.log(`Runway task ${taskId} status (attempt ${attempt + 1}):`, status.status);

      if (status.status === 'SUCCEEDED') {
        // Get the video URL from the output
        if (status.output && status.output.length > 0) {
          return status.output[0];
        }
        throw new Error('Task completed but no video URL in output');
      }

      if (status.status === 'FAILED') {
        const failureReason = status.failure || status.failureCode || 'Unknown error';
        console.error('Runway task failed:', status);
        throw new Error(`Video generation failed: ${failureReason}`);
      }

      // Still processing (PENDING, RUNNING, etc.), wait before next poll
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      // Handle network errors gracefully
      if (error instanceof Error && error.message.includes('Video generation failed')) {
        throw error; // Re-throw actual failures
      }

      consecutiveErrors++;
      console.warn(`Polling error (attempt ${attempt + 1}):`, error);

      if (consecutiveErrors >= maxConsecutiveErrors) {
        throw new Error(`Polling failed after ${maxConsecutiveErrors} consecutive errors`);
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  throw new Error('Video generation timed out after 3 minutes');
}

/**
 * Check status of an existing task
 */
export async function checkTaskStatus(taskId: string): Promise<RunwayGenerationResult> {
  if (!isRunwayConfigured()) {
    throw new Error('Runway ML not configured');
  }

  const apiKey = process.env.RUNWAY_API_KEY!;

  const statusResponse = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'X-Runway-Version': '2024-11-06'
    }
  });

  if (!statusResponse.ok) {
    throw new Error(`Failed to check task status: ${statusResponse.status}`);
  }

  const status = await statusResponse.json();

  if (status.status === 'SUCCEEDED' && status.output?.length > 0) {
    return {
      videoUrl: status.output[0],
      duration: 5,
      status: 'completed',
      taskId
    };
  }

  if (status.status === 'FAILED') {
    return {
      videoUrl: '',
      duration: 5,
      status: 'failed',
      taskId
    };
  }

  return {
    videoUrl: '',
    duration: 5,
    status: 'processing',
    taskId
  };
}
