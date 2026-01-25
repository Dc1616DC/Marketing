// API Route: Generate video reel from content
// POST /api/generate/video

import { NextRequest, NextResponse } from 'next/server';
import { generateReelImage, downloadImage } from '@/lib/ai/image-generator';
import { generateReelVoiceover, isElevenLabsConfigured } from '@/lib/ai/voice-generator';
import { assembleVideo, isFFmpegAvailable, addAudioToVideo, addCaptionsToVideo } from '@/lib/ai/video-assembler';
import { generateVideoFromImage as generateVeoVideo, isVeoConfigured, getVeoStatus } from '@/lib/ai/veo-generator';
import { generateVideoFromImage as generateRunwayVideo, isRunwayConfigured, getRunwayStatus } from '@/lib/ai/runway-generator';
import { generateCaptions, getCaptionStatus } from '@/lib/ai/caption-generator';
import { copyFile, mkdir, writeFile, readFile } from 'fs/promises';
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
      existingAudioUrl,
      videoMode = 'simple', // 'simple' (FFmpeg), 'runway' (Runway ML), or 'veo' (Google Veo 2)
      runwayOptions = {},
      veoOptions = {},
      addCaptions = false,  // Enable auto-captions
      captionStyle = 'bold', // 'minimal', 'bold', or 'instagram'
      captionPosition = 'bottom' // 'top', 'center', or 'bottom'
    } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // If using Runway ML mode (recommended AI video option)
    if (videoMode === 'runway') {
      if (!isRunwayConfigured()) {
        return NextResponse.json(
          {
            error: 'Runway ML not configured',
            help: 'Set RUNWAY_API_KEY in your .env.local file'
          },
          { status: 400 }
        );
      }

      if (!existingImageUrl) {
        return NextResponse.json(
          { error: 'Image is required for AI video generation' },
          { status: 400 }
        );
      }

      try {
        // Generate AI video using Runway Gen-3
        const runwayResult = await generateRunwayVideo(existingImageUrl, {
          prompt: runwayOptions.prompt || `Subtle cinematic motion, gentle movement: ${content.slice(0, 100)}`,
          duration: runwayOptions.duration || 5,
          ratio: '768:1280' // Portrait for Instagram Reels
        });

        // Download the Runway video
        const videoResponse = await fetch(runwayResult.videoUrl);
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

        await ensureMediaDir();
        let finalVideoPath: string;
        let finalDuration = runwayResult.duration;
        let finalFileSize = videoBuffer.length;

        // If we have audio, combine with the Runway video
        if (body.existingAudioUrl) {
          const audioUrl = body.existingAudioUrl.startsWith('http')
            ? body.existingAudioUrl
            : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${body.existingAudioUrl}`;

          const audioResponse = await fetch(audioUrl);
          const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());

          // Combine video with voiceover
          const combinedVideo = await addAudioToVideo(videoBuffer, audioBuffer, { trimToAudio: true });

          const filename = `${uuidv4()}-runway.mp4`;
          finalVideoPath = path.join(MEDIA_DIR, filename);
          await copyFile(combinedVideo.filePath, finalVideoPath);
          finalDuration = combinedVideo.duration;
          finalFileSize = combinedVideo.fileSize;
        } else {
          // No audio - save Runway video directly
          const filename = `${uuidv4()}-runway.mp4`;
          finalVideoPath = path.join(MEDIA_DIR, filename);
          await writeFile(finalVideoPath, videoBuffer);
        }

        // Step: Add captions if requested
        if (addCaptions && body.existingAudioUrl) {
          try {
            console.log('Generating captions from audio...');

            // Get audio buffer for transcription
            const audioUrl = body.existingAudioUrl.startsWith('http')
              ? body.existingAudioUrl
              : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${body.existingAudioUrl}`;

            const audioForCaptions = await fetch(audioUrl);
            const audioCaptionBuffer = Buffer.from(await audioForCaptions.arrayBuffer());

            // Generate captions using Whisper
            const captions = await generateCaptions(audioCaptionBuffer, {
              wordByWord: true,
              wordsPerSegment: 3
            });

            console.log('Captions generated, burning into video...');

            // Read the current video and add captions
            const videoForCaptions = await readFile(finalVideoPath);
            const captionedVideo = await addCaptionsToVideo(videoForCaptions, captions.srtPath, {
              style: captionStyle as 'minimal' | 'bold' | 'instagram',
              position: captionPosition as 'top' | 'center' | 'bottom'
            });

            // Update final video path
            const captionedFilename = `${uuidv4()}-runway-captioned.mp4`;
            finalVideoPath = path.join(MEDIA_DIR, captionedFilename);
            await copyFile(captionedVideo.filePath, finalVideoPath);
            finalFileSize = captionedVideo.fileSize;

            console.log('Captions added successfully');
          } catch (captionError) {
            console.error('Caption generation error (continuing without captions):', captionError);
            // Continue without captions if there's an error
          }
        }

        const filename = path.basename(finalVideoPath);
        return NextResponse.json({
          success: true,
          video: {
            url: `/generated/${filename}`,
            duration: finalDuration,
            width: 768,
            height: 1280,
            fileSize: finalFileSize,
            mode: 'runway',
            hasCaptions: addCaptions
          }
        });
      } catch (runwayError) {
        console.error('Runway ML error:', runwayError);
        return NextResponse.json(
          {
            error: runwayError instanceof Error ? runwayError.message : 'Runway video generation failed',
            help: 'Check your Runway API key and account status'
          },
          { status: 500 }
        );
      }
    }

    // If using Veo 2 mode (requires Google Cloud access)
    if (videoMode === 'veo') {
      if (!isVeoConfigured()) {
        return NextResponse.json(
          {
            error: 'Google Cloud Veo 2 not configured',
            help: 'Set GOOGLE_CLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS in your .env.local file'
          },
          { status: 400 }
        );
      }

      if (!existingImageUrl) {
        return NextResponse.json(
          { error: 'Image is required for Veo 2 video generation' },
          { status: 400 }
        );
      }

      try {
        // Generate AI video using Veo 2
        const veoResult = await generateVeoVideo(existingImageUrl, {
          prompt: veoOptions.prompt || `Subtle cinematic motion for: ${content.slice(0, 100)}`,
          duration: veoOptions.duration || 5,
          aspectRatio: '9:16',
          motionAmount: veoOptions.motionAmount || 'medium'
        });

        if (veoResult.status === 'processing') {
          return NextResponse.json({
            success: true,
            status: 'processing',
            message: 'Video is being generated. This may take a few minutes.'
          });
        }

        // Download and save the Veo video
        await ensureMediaDir();
        const filename = `${uuidv4()}-veo.mp4`;
        const publicPath = path.join(MEDIA_DIR, filename);

        const videoResponse = await fetch(veoResult.videoUrl);
        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        await writeFile(publicPath, videoBuffer);

        return NextResponse.json({
          success: true,
          video: {
            url: `/generated/${filename}`,
            duration: veoResult.duration,
            width: 1080,
            height: 1920,
            fileSize: videoBuffer.length,
            mode: 'veo'
          }
        });
      } catch (veoError) {
        console.error('Veo 2 error:', veoError);
        return NextResponse.json(
          {
            error: veoError instanceof Error ? veoError.message : 'Veo 2 generation failed',
            help: 'Check your Google Cloud credentials and Veo 2 API access'
          },
          { status: 500 }
        );
      }
    }

    // Simple mode: FFmpeg assembly
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
        fileSize: video.fileSize,
        mode: 'simple'
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
  const runwayStatus = getRunwayStatus();
  const veoStatus = getVeoStatus();
  const captionStatus = getCaptionStatus();

  return NextResponse.json({
    available: ffmpegAvailable && elevenLabsConfigured,
    ffmpeg: ffmpegAvailable,
    elevenlabs: elevenLabsConfigured,
    runway: {
      configured: runwayStatus.configured,
      message: runwayStatus.message
    },
    veo: {
      configured: veoStatus.configured,
      message: veoStatus.message
    },
    captions: {
      configured: captionStatus.configured,
      message: captionStatus.message
    },
    requirements: {
      ffmpeg: 'Required for video assembly. Install with: brew install ffmpeg (Mac) or apt install ffmpeg (Linux)',
      elevenlabs: 'Required for voiceover. Get API key at elevenlabs.io and add ELEVENLABS_API_KEY to .env.local',
      runway: 'For AI video generation. Get API key at runwayml.com and add RUNWAY_API_KEY to .env.local',
      veo: 'Optional. For Google Veo 2, set GOOGLE_CLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS',
      captions: 'Auto-captions use OpenAI Whisper (requires OPENAI_API_KEY)'
    }
  });
}
