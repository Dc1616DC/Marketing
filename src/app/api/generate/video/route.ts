// API Route: Generate video reel from content
// POST /api/generate/video

import { NextRequest, NextResponse } from 'next/server';
import { generateReelImage, downloadImage } from '@/lib/ai/image-generator';
import { generateReelVoiceover, isElevenLabsConfigured } from '@/lib/ai/voice-generator';
import { assembleVideo, isFFmpegAvailable } from '@/lib/ai/video-assembler';
import { copyFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Directory to store generated videos
const MEDIA_DIR = path.join(process.cwd(), 'public', 'generated');

async function ensureMediaDir(): Promise<void> {
  if (!existsSync(MEDIA_DIR)) {
    await mkdir(MEDIA_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      content,
      imageStyle,
      voiceId,
      motion = 'ken-burns',
      existingImageUrl,
      existingAudioUrl
    } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Check prerequisites
    const ffmpegAvailable = await isFFmpegAvailable();
    if (!ffmpegAvailable) {
      return NextResponse.json(
        {
          error: 'FFmpeg not installed',
          help: 'Install FFmpeg to generate videos. On Mac: brew install ffmpeg'
        },
        { status: 400 }
      );
    }

    const elevenLabsConfigured = isElevenLabsConfigured();
    if (!elevenLabsConfigured && !existingAudioUrl) {
      return NextResponse.json(
        {
          error: 'ElevenLabs API key not configured',
          help: 'Add ELEVENLABS_API_KEY to your .env.local file, or provide existingAudioUrl'
        },
        { status: 400 }
      );
    }

    // Step 1: Get or generate image
    let imageBuffer: Buffer;
    if (existingImageUrl) {
      // Use existing image
      const imageResponse = await fetch(existingImageUrl.startsWith('http')
        ? existingImageUrl
        : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${existingImageUrl}`
      );
      imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    } else {
      // Generate new image
      const image = await generateReelImage(content, { style: imageStyle });
      imageBuffer = await downloadImage(image.url);
    }

    // Step 2: Get or generate voiceover
    let audioBuffer: Buffer;
    if (existingAudioUrl) {
      // Use existing audio
      const audioResponse = await fetch(existingAudioUrl.startsWith('http')
        ? existingAudioUrl
        : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${existingAudioUrl}`
      );
      audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    } else {
      // Generate new voiceover
      const voice = await generateReelVoiceover(content, { voiceId });
      audioBuffer = voice.audioBuffer;
    }

    // Step 3: Assemble video
    const video = await assembleVideo(imageBuffer, audioBuffer, {
      motion,
      width: 1080,
      height: 1920
    });

    // Move video to public directory
    await ensureMediaDir();
    const filename = `${uuidv4()}.mp4`;
    const publicPath = path.join(MEDIA_DIR, filename);
    await copyFile(video.filePath, publicPath);

    return NextResponse.json({
      success: true,
      video: {
        url: `/generated/${filename}`,
        duration: video.duration,
        width: video.width,
        height: video.height,
        fileSize: video.fileSize
      }
    });
  } catch (error) {
    console.error('Video generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate video' },
      { status: 500 }
    );
  }
}

// GET: Check if video generation is available
export async function GET() {
  const ffmpegAvailable = await isFFmpegAvailable();
  const elevenLabsConfigured = isElevenLabsConfigured();

  return NextResponse.json({
    available: ffmpegAvailable && elevenLabsConfigured,
    ffmpeg: ffmpegAvailable,
    elevenlabs: elevenLabsConfigured,
    requirements: {
      ffmpeg: 'Required for video assembly. Install with: brew install ffmpeg (Mac) or apt install ffmpeg (Linux)',
      elevenlabs: 'Required for voiceover. Get API key at elevenlabs.io and add ELEVENLABS_API_KEY to .env.local'
    }
  });
}
