// Image Generator for Instagram Content
// Uses DALL-E 3 to generate images that match the content

import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  revisedPrompt?: string;
  style: 'natural' | 'vivid';
}

// Brand-aligned image style guidelines
const IMAGE_STYLE_GUIDE = `
Style guidelines for Chase Wellness imagery:
- Clean, modern, approachable aesthetic
- Warm, inviting color palette (soft greens, warm neutrals, gentle blues)
- Real food photography style (not overly stylized or artificial)
- Diverse representation of people
- Positive, supportive mood (never shame-based imagery)
- Avoid: scales, measuring tapes, before/after imagery, restrictive imagery
- Include: nourishing foods, protein-rich meals, supportive lifestyle scenes
`;

// Convert content topic to image prompt (exported for Midjourney prompt generation)
export function buildImagePrompt(content: string, style: 'food' | 'lifestyle' | 'educational' | 'motivational'): string {
  const stylePrompts = {
    food: `Professional food photography of a healthy, protein-rich meal.
Style: Clean, modern, appetizing. Natural lighting, simple elegant plating.
The food should look delicious and achievable, not overly fancy.
Warm color tones, shallow depth of field.
NO text, NO watermarks, NO people's faces.`,

    lifestyle: `Lifestyle photography showing a person living well and feeling good.
Style: Authentic, warm, positive energy. Natural lighting.
Person should look confident and healthy (not focused on weight/size).
Diverse representation. Candid feel, not posed.
NO text, NO watermarks, NO before/after imagery.`,

    educational: `Clean, modern graphic design style illustration.
Style: Minimalist, informative, approachable.
Soft colors (greens, blues, warm neutrals).
Could include simple icons or visual metaphors.
NO text (we'll add that separately), NO cluttered elements.`,

    motivational: `Inspiring lifestyle image with warm, positive energy.
Style: Bright, hopeful, authentic.
Could show: morning routine, meal prep, peaceful moment, achievement.
Natural lighting, real-life feel.
NO text, NO cliché fitness imagery, NO scales or measuring tapes.`
  };

  return `${stylePrompts[style]}

Content context: ${content.slice(0, 200)}

${IMAGE_STYLE_GUIDE}`;
}

// Analyze content to determine best image style
function determineImageStyle(content: string): 'food' | 'lifestyle' | 'educational' | 'motivational' {
  const lowerContent = content.toLowerCase();

  // Food keywords
  if (/protein|meal|food|eat|recipe|snack|breakfast|lunch|dinner|yogurt|chicken|eggs/.test(lowerContent)) {
    return 'food';
  }

  // Educational keywords
  if (/tip|how to|guide|step|learn|understand|fact|research|study/.test(lowerContent)) {
    return 'educational';
  }

  // Motivational keywords
  if (/you got this|proud|progress|celebrate|win|journey|keep going|remember/.test(lowerContent)) {
    return 'motivational';
  }

  // Default to lifestyle
  return 'lifestyle';
}

/**
 * Generate an image for Instagram content using DALL-E 3
 */
export async function generateImage(
  content: string,
  options?: {
    style?: 'food' | 'lifestyle' | 'educational' | 'motivational';
    size?: '1024x1024' | '1024x1792' | '1792x1024';
    quality?: 'standard' | 'hd';
  }
): Promise<GeneratedImage> {
  const openai = getOpenAI();

  const imageStyle = options?.style || determineImageStyle(content);
  const prompt = buildImagePrompt(content, imageStyle);

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: options?.size || '1024x1024', // Square for Instagram feed
    quality: options?.quality || 'standard',
    style: 'natural' // More realistic, less artificial
  });

  const imageData = response.data?.[0];

  if (!imageData?.url) {
    throw new Error('No image URL returned from DALL-E');
  }

  return {
    url: imageData.url,
    prompt,
    revisedPrompt: imageData.revised_prompt,
    style: 'natural'
  };
}

/**
 * Generate a vertical image for Instagram Reels/Stories
 */
export async function generateReelImage(
  content: string,
  options?: {
    style?: 'food' | 'lifestyle' | 'educational' | 'motivational';
  }
): Promise<GeneratedImage> {
  return generateImage(content, {
    ...options,
    size: '1024x1792', // Vertical for Reels
    quality: 'hd'
  });
}

/**
 * Generate multiple image options for content
 */
export async function generateImageOptions(
  content: string,
  count: number = 2
): Promise<GeneratedImage[]> {
  const styles: Array<'food' | 'lifestyle' | 'educational' | 'motivational'> =
    ['food', 'lifestyle', 'educational', 'motivational'];

  const detectedStyle = determineImageStyle(content);

  // Generate with detected style first, then try others
  const stylesToTry = [detectedStyle, ...styles.filter(s => s !== detectedStyle)].slice(0, count);

  const images: GeneratedImage[] = [];

  for (const style of stylesToTry) {
    try {
      const image = await generateImage(content, { style });
      images.push(image);
    } catch (error) {
      console.error(`Failed to generate ${style} image:`, error);
    }
  }

  return images;
}

/**
 * Download image from URL and return as buffer
 */
export async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
