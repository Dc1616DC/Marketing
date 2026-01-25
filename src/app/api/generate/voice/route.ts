// API Route: Generate voiceover for content
// POST /api/generate/voice

import { NextRequest, NextResponse } from 'next/server';
import {
  generateVoiceover,
  generateReelVoiceover,
  isElevenLabsConfigured,
  estimateVoiceDuration
} from '@/lib/ai/voice-generator';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Directory to store generated audio
const MEDIA_DIR = path.join(process.cwd(), 'public', 'generated');

async function ensureMediaDir(): Promise<void> {
  if (!existsSync(MEDIA_DIR)) {
    await mkdir(MEDIA_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if ElevenLabs is configured
    if (!isElevenLabsConfigured()) {
      return NextResponse.json(
        {
          error: 'ElevenLabs API key not configured',
          help: 'Add ELEVENLABS_API_KEY to your .env.local file. Get your key at elevenlabs.io'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content, voiceId, format } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Estimate duration first
    const estimatedDuration = estimateVoiceDuration(content);

    // Generate voiceover
    const isReel = format === 'reel' || format === 'story';
    const voice = isReel
      ? await generateReelVoiceover(content, { voiceId })
      : await generateVoiceover(content, { voiceId });

    // Save audio file
    await ensureMediaDir();
    const filename = `${uuidv4()}.mp3`;
    const localPath = path.join(MEDIA_DIR, filename);
    await writeFile(localPath, voice.audioBuffer);

    return NextResponse.json({
      success: true,
      voice: {
        url: `/generated/${filename}`,
        voiceId: voice.voiceId,
        voiceName: voice.voiceName,
        estimatedDuration,
        fileSize: voice.contentLength
      }
    });
  } catch (error) {
    console.error('Voice generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate voiceover' },
      { status: 500 }
    );
  }
}

// GET: Return available voices from user's ElevenLabs account
export async function GET() {
  const configured = isElevenLabsConfigured();

  if (!configured) {
    return NextResponse.json({
      configured: false,
      voices: []
    });
  }

  try {
    // Fetch actual available voices from ElevenLabs
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!
      }
    });

    if (!response.ok) {
      console.error('ElevenLabs voices fetch error:', response.status);
      return NextResponse.json({
        configured: true,
        voices: [],
        error: 'Failed to fetch voices from ElevenLabs'
      });
    }

    const data = await response.json();
    const voices = data.voices.map((v: { voice_id: string; name: string; labels?: { description?: string; gender?: string; accent?: string } }, index: number) => ({
      key: `voice-${index}`,
      id: v.voice_id,
      name: v.name,
      description: v.labels?.description || `${v.labels?.gender || ''} ${v.labels?.accent || ''}`.trim() || 'ElevenLabs voice'
    }));

    return NextResponse.json({
      configured: true,
      voices
    });
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    return NextResponse.json({
      configured: true,
      voices: [],
      error: 'Failed to connect to ElevenLabs'
    });
  }
}
