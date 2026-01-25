// API Route: Generate image for content
// POST /api/generate/image

import { NextRequest, NextResponse } from 'next/server';
import { generateImage, generateReelImage, downloadImage, buildImagePrompt } from '@/lib/ai/image-generator';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Directory to store generated images
const MEDIA_DIR = path.join(process.cwd(), 'public', 'generated');

async function ensureMediaDir(): Promise<void> {
  if (!existsSync(MEDIA_DIR)) {
    await mkdir(MEDIA_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, style, format, promptOnly } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // If promptOnly, just return the prompt without generating
    if (promptOnly) {
      const imageStyle = style || 'lifestyle';
      const prompt = buildImagePrompt(content, imageStyle);
      return NextResponse.json({
        success: true,
        prompt,
        style: imageStyle
      });
    }

    // Generate image
    const isReel = format === 'reel' || format === 'story';
    const image = isReel
      ? await generateReelImage(content, { style })
      : await generateImage(content, { style });

    // Download and save locally
    await ensureMediaDir();
    const imageBuffer = await downloadImage(image.url);
    const filename = `${uuidv4()}.png`;
    const localPath = path.join(MEDIA_DIR, filename);
    await writeFile(localPath, imageBuffer);

    return NextResponse.json({
      success: true,
      image: {
        url: `/generated/${filename}`,
        originalUrl: image.url,
        prompt: image.prompt,
        revisedPrompt: image.revisedPrompt,
        style: image.style
      }
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    );
  }
}
