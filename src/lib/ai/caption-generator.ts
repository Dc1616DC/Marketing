// Auto-Caption Generator using OpenAI Whisper
// Transcribes audio and generates SRT/VTT captions for video overlay

import OpenAI from 'openai';
import { writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const TEMP_DIR = '/tmp/chase-wellness-captions';

export interface CaptionSegment {
  start: number;  // Start time in seconds
  end: number;    // End time in seconds
  text: string;   // Caption text
}

export interface CaptionResult {
  segments: CaptionSegment[];
  fullText: string;
  srtPath: string;
  vttPath: string;
}

/**
 * Check if OpenAI is configured for Whisper
 */
export function isWhisperConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Format time for SRT (00:00:00,000)
 */
function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Format time for VTT (00:00:00.000)
 */
function formatVttTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

/**
 * Convert segments to SRT format
 */
function segmentsToSrt(segments: CaptionSegment[]): string {
  return segments.map((segment, index) => {
    return `${index + 1}\n${formatSrtTime(segment.start)} --> ${formatSrtTime(segment.end)}\n${segment.text}\n`;
  }).join('\n');
}

/**
 * Convert segments to VTT format
 */
function segmentsToVtt(segments: CaptionSegment[]): string {
  const header = 'WEBVTT\n\n';
  const body = segments.map((segment, index) => {
    return `${index + 1}\n${formatVttTime(segment.start)} --> ${formatVttTime(segment.end)}\n${segment.text}\n`;
  }).join('\n');

  return header + body;
}

/**
 * Split text into word-by-word segments for Instagram-style captions
 * Creates ~2-3 word segments for dynamic, readable captions
 */
function createWordSegments(segments: CaptionSegment[], wordsPerSegment: number = 3): CaptionSegment[] {
  const wordSegments: CaptionSegment[] = [];

  for (const segment of segments) {
    const words = segment.text.trim().split(/\s+/);
    const segmentDuration = segment.end - segment.start;
    const timePerWord = segmentDuration / words.length;

    for (let i = 0; i < words.length; i += wordsPerSegment) {
      const chunkWords = words.slice(i, i + wordsPerSegment);
      const startTime = segment.start + (i * timePerWord);
      const endTime = Math.min(segment.start + ((i + wordsPerSegment) * timePerWord), segment.end);

      wordSegments.push({
        start: startTime,
        end: endTime,
        text: chunkWords.join(' ')
      });
    }
  }

  return wordSegments;
}

/**
 * Transcribe audio using OpenAI Whisper and generate captions
 */
export async function generateCaptions(
  audioBuffer: Buffer,
  options?: {
    wordByWord?: boolean;      // Create word-by-word captions (Instagram style)
    wordsPerSegment?: number;  // Words per caption segment (default: 3)
    language?: string;         // Language code (default: 'en')
  }
): Promise<CaptionResult> {
  if (!isWhisperConfigured()) {
    throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY in .env.local');
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  // Ensure temp directory exists
  const { mkdir } = await import('fs/promises');
  const { existsSync } = await import('fs');
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }

  const id = uuidv4();
  const audioPath = path.join(TEMP_DIR, `${id}-audio.mp3`);
  const srtPath = path.join(TEMP_DIR, `${id}-captions.srt`);
  const vttPath = path.join(TEMP_DIR, `${id}-captions.vtt`);

  // Write audio to temp file (Whisper API needs a file)
  await writeFile(audioPath, audioBuffer);

  try {
    // Call Whisper API with word-level timestamps
    const transcription = await openai.audio.transcriptions.create({
      file: await import('fs').then(fs => fs.createReadStream(audioPath)),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      language: options?.language || 'en'
    });

    // Extract segments from response
    let segments: CaptionSegment[] = [];

    if (transcription.segments) {
      segments = transcription.segments.map(seg => ({
        start: seg.start,
        end: seg.end,
        text: seg.text.trim()
      }));
    } else {
      // Fallback: create a single segment if no segments returned
      segments = [{
        start: 0,
        end: 10,
        text: transcription.text
      }];
    }

    // Convert to word-by-word if requested (Instagram style)
    if (options?.wordByWord) {
      segments = createWordSegments(segments, options?.wordsPerSegment || 3);
    }

    // Generate SRT and VTT files
    const srtContent = segmentsToSrt(segments);
    const vttContent = segmentsToVtt(segments);

    await writeFile(srtPath, srtContent);
    await writeFile(vttPath, vttContent);

    return {
      segments,
      fullText: transcription.text,
      srtPath,
      vttPath
    };
  } finally {
    // Clean up audio file
    try {
      const { unlink } = await import('fs/promises');
      await unlink(audioPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Generate caption styling for FFmpeg drawtext filter
 * Returns FFmpeg-compatible filter string for burning captions
 */
export function generateFFmpegCaptionFilter(
  srtPath: string,
  options?: {
    fontSize?: number;
    fontColor?: string;
    backgroundColor?: string;
    position?: 'top' | 'center' | 'bottom';
    fontFile?: string;
  }
): string {
  const fontSize = options?.fontSize || 48;
  const fontColor = options?.fontColor || 'white';
  const bgColor = options?.backgroundColor || 'black@0.6';
  const position = options?.position || 'bottom';

  // Calculate Y position based on position setting
  let yPosition: string;
  switch (position) {
    case 'top':
      yPosition = 'h*0.1';
      break;
    case 'center':
      yPosition = '(h-text_h)/2';
      break;
    case 'bottom':
    default:
      yPosition = 'h*0.85-text_h';
      break;
  }

  // Use subtitles filter for SRT files (handles timing automatically)
  // Force styles for Instagram-like appearance
  const style = `FontSize=${fontSize},PrimaryColour=&H00FFFFFF,BackColour=&H80000000,BorderStyle=4,Outline=0,Shadow=0,MarginV=50`;

  return `subtitles='${srtPath}':force_style='${style}'`;
}

/**
 * Get caption status
 */
export function getCaptionStatus(): { configured: boolean; message: string } {
  if (!process.env.OPENAI_API_KEY) {
    return {
      configured: false,
      message: 'OpenAI API key not configured (needed for Whisper transcription)'
    };
  }

  return {
    configured: true,
    message: 'Whisper captions available'
  };
}
