// Video Assembler for Instagram Reels
// Combines image + voiceover into video using FFmpeg

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export interface VideoOptions {
  duration?: number;        // Video duration in seconds (auto-detected from audio if not set)
  width?: number;           // Output width (default: 1080 for Instagram)
  height?: number;          // Output height (default: 1920 for Reels)
  motion?: 'none' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'ken-burns';
  overlay?: {
    text?: string;          // Text to overlay on video
    position?: 'top' | 'center' | 'bottom';
    fontSize?: number;
  };
}

export interface GeneratedVideo {
  filePath: string;
  duration: number;
  width: number;
  height: number;
  fileSize: number;
}

// Temp directory for processing
const TEMP_DIR = '/tmp/chase-wellness-video';

/**
 * Ensure temp directory exists
 */
async function ensureTempDir(): Promise<void> {
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
}

/**
 * Check if FFmpeg is available
 */
export async function isFFmpegAvailable(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get audio duration using FFprobe
 */
async function getAudioDuration(audioPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
    );
    return parseFloat(stdout.trim());
  } catch {
    return 10; // Default 10 seconds if can't detect
  }
}

/**
 * Build FFmpeg filter for motion effects
 */
function buildMotionFilter(
  motion: VideoOptions['motion'],
  duration: number,
  width: number,
  height: number
): string {
  // Calculate scaled dimensions (scale up for motion effects)
  const scaledWidth = Math.round(width * 1.2);
  const scaledHeight = Math.round(height * 1.2);

  switch (motion) {
    case 'zoom-in':
      return `scale=${scaledWidth}:${scaledHeight},zoompan=z='min(zoom+0.001,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(duration * 25)}:s=${width}x${height}:fps=25`;

    case 'zoom-out':
      return `scale=${scaledWidth}:${scaledHeight},zoompan=z='if(lte(zoom,1.0),1.2,max(1.001,zoom-0.001))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(duration * 25)}:s=${width}x${height}:fps=25`;

    case 'pan-left':
      return `scale=${scaledWidth}:${scaledHeight},zoompan=z='1.1':x='if(lte(on,1),0,x+1)':y='(ih-ih/zoom)/2':d=${Math.round(duration * 25)}:s=${width}x${height}:fps=25`;

    case 'pan-right':
      return `scale=${scaledWidth}:${scaledHeight},zoompan=z='1.1':x='if(lte(on,1),(iw-iw/zoom),x-1)':y='(ih-ih/zoom)/2':d=${Math.round(duration * 25)}:s=${width}x${height}:fps=25`;

    case 'ken-burns':
      // Combination of slow zoom and slight pan
      return `scale=${scaledWidth}:${scaledHeight},zoompan=z='min(zoom+0.0005,1.15)':x='iw/2-(iw/zoom/2)+sin(on/100)*20':y='ih/2-(ih/zoom/2)':d=${Math.round(duration * 25)}:s=${width}x${height}:fps=25`;

    default:
      // No motion - just scale to fit
      return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
  }
}

/**
 * Assemble video from image and audio
 */
export async function assembleVideo(
  imageBuffer: Buffer,
  audioBuffer: Buffer,
  options?: VideoOptions
): Promise<GeneratedVideo> {
  // Check FFmpeg availability
  const ffmpegAvailable = await isFFmpegAvailable();
  if (!ffmpegAvailable) {
    throw new Error('FFmpeg is not installed. Please install FFmpeg to generate videos. On Mac: brew install ffmpeg');
  }

  await ensureTempDir();

  const id = uuidv4();
  const imagePath = path.join(TEMP_DIR, `${id}-image.png`);
  const audioPath = path.join(TEMP_DIR, `${id}-audio.mp3`);
  const outputPath = path.join(TEMP_DIR, `${id}-output.mp4`);

  try {
    // Write temp files
    await writeFile(imagePath, imageBuffer);
    await writeFile(audioPath, audioBuffer);

    // Get audio duration
    const audioDuration = options?.duration || await getAudioDuration(audioPath);

    // Video dimensions (Instagram Reels: 1080x1920)
    const width = options?.width || 1080;
    const height = options?.height || 1920;

    // Build motion filter
    const motionFilter = buildMotionFilter(
      options?.motion || 'ken-burns',
      audioDuration,
      width,
      height
    );

    // Build FFmpeg command
    const ffmpegCmd = [
      'ffmpeg -y',
      `-loop 1 -i "${imagePath}"`,
      `-i "${audioPath}"`,
      `-c:v libx264 -tune stillimage -c:a aac -b:a 192k`,
      `-vf "${motionFilter}"`,
      `-shortest -pix_fmt yuv420p`,
      `-t ${audioDuration}`,
      `"${outputPath}"`
    ].join(' ');

    // Execute FFmpeg
    await execAsync(ffmpegCmd);

    // Get file size
    const { stdout: sizeOutput } = await execAsync(`stat -f%z "${outputPath}" 2>/dev/null || stat -c%s "${outputPath}"`);
    const fileSize = parseInt(sizeOutput.trim());

    return {
      filePath: outputPath,
      duration: audioDuration,
      width,
      height,
      fileSize
    };
  } finally {
    // Clean up temp files (but keep output)
    try {
      await unlink(imagePath);
      await unlink(audioPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Generate Instagram Reel from content
 * Complete pipeline: image -> voiceover -> video
 */
export async function generateInstagramReel(
  content: string,
  imageBuffer: Buffer,
  audioBuffer: Buffer,
  options?: {
    motion?: VideoOptions['motion'];
    addCaptions?: boolean;
  }
): Promise<GeneratedVideo> {
  return assembleVideo(imageBuffer, audioBuffer, {
    width: 1080,
    height: 1920,
    motion: options?.motion || 'ken-burns'
  });
}

/**
 * Add audio track to existing video (for Runway videos)
 */
export async function addAudioToVideo(
  videoBuffer: Buffer,
  audioBuffer: Buffer,
  options?: { trimToAudio?: boolean }
): Promise<GeneratedVideo> {
  const ffmpegAvailable = await isFFmpegAvailable();
  if (!ffmpegAvailable) {
    throw new Error('FFmpeg is not installed');
  }

  await ensureTempDir();

  const id = uuidv4();
  const videoPath = path.join(TEMP_DIR, `${id}-video.mp4`);
  const audioPath = path.join(TEMP_DIR, `${id}-audio.mp3`);
  const outputPath = path.join(TEMP_DIR, `${id}-combined.mp4`);

  try {
    await writeFile(videoPath, videoBuffer);
    await writeFile(audioPath, audioBuffer);

    const audioDuration = await getAudioDuration(audioPath);

    // Combine video with audio, trim to audio length if specified
    const ffmpegCmd = options?.trimToAudio
      ? `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -b:a 192k -shortest -t ${audioDuration} "${outputPath}"`
      : `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v copy -c:a aac -b:a 192k -shortest "${outputPath}"`;

    await execAsync(ffmpegCmd);

    const { stdout: sizeOutput } = await execAsync(`stat -f%z "${outputPath}" 2>/dev/null || stat -c%s "${outputPath}"`);
    const fileSize = parseInt(sizeOutput.trim());

    return {
      filePath: outputPath,
      duration: audioDuration,
      width: 768,  // Runway portrait dimensions
      height: 1280,
      fileSize
    };
  } finally {
    try {
      await unlink(videoPath);
      await unlink(audioPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Clean up old temp files
 */
export async function cleanupTempFiles(maxAgeHours: number = 24): Promise<void> {
  try {
    const { stdout } = await execAsync(
      `find "${TEMP_DIR}" -type f -mmin +${maxAgeHours * 60} -delete 2>/dev/null; echo "cleaned"`
    );
    console.log('Temp files cleaned:', stdout.trim());
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Add captions/subtitles to video using FFmpeg
 * Burns captions directly into the video for Instagram-style viewing
 */
export async function addCaptionsToVideo(
  videoBuffer: Buffer,
  srtPath: string,
  options?: {
    fontSize?: number;
    fontColor?: string;
    position?: 'top' | 'center' | 'bottom';
    style?: 'minimal' | 'bold' | 'instagram';
  }
): Promise<GeneratedVideo> {
  const ffmpegAvailable = await isFFmpegAvailable();
  if (!ffmpegAvailable) {
    throw new Error('FFmpeg is not installed');
  }

  await ensureTempDir();

  const id = uuidv4();
  const videoPath = path.join(TEMP_DIR, `${id}-video.mp4`);
  const outputPath = path.join(TEMP_DIR, `${id}-captioned.mp4`);

  try {
    await writeFile(videoPath, videoBuffer);

    // Configure caption styling based on style preset
    let fontSize = options?.fontSize || 42;
    let fontColor = 'FFFFFF'; // White
    let outlineColor = '000000'; // Black
    let outlineWidth = 2;
    let shadowOffset = 1;
    let marginV = 60;

    switch (options?.style) {
      case 'bold':
        fontSize = 52;
        outlineWidth = 3;
        break;
      case 'instagram':
        fontSize = 48;
        outlineWidth = 0;
        // Instagram style uses a background box instead of outline
        break;
      case 'minimal':
      default:
        fontSize = 42;
        outlineWidth = 2;
        break;
    }

    // Adjust margin based on position
    switch (options?.position) {
      case 'top':
        marginV = 80;
        break;
      case 'center':
        marginV = 0;
        break;
      case 'bottom':
      default:
        marginV = 60;
        break;
    }

    // Build FFmpeg filter for subtitles
    // Using ASS styling for better control
    const forceStyle = [
      `FontSize=${fontSize}`,
      `PrimaryColour=&H00${fontColor}`,
      `OutlineColour=&H00${outlineColor}`,
      `Outline=${outlineWidth}`,
      `Shadow=${shadowOffset}`,
      `MarginV=${marginV}`,
      'Alignment=2', // Center bottom
      'Bold=1'
    ].join(',');

    // Escape the SRT path for FFmpeg (handle special characters)
    const escapedSrtPath = srtPath.replace(/'/g, "'\\''").replace(/:/g, '\\:');

    const ffmpegCmd = [
      'ffmpeg -y',
      `-i "${videoPath}"`,
      `-vf "subtitles='${escapedSrtPath}':force_style='${forceStyle}'"`,
      '-c:a copy',
      '-c:v libx264 -preset fast',
      `"${outputPath}"`
    ].join(' ');

    console.log('FFmpeg caption command:', ffmpegCmd);
    await execAsync(ffmpegCmd, { maxBuffer: 50 * 1024 * 1024 });

    // Get video info
    const { stdout: durationOutput } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
    );
    const duration = parseFloat(durationOutput.trim()) || 0;

    const { stdout: sizeOutput } = await execAsync(
      `stat -f%z "${outputPath}" 2>/dev/null || stat -c%s "${outputPath}"`
    );
    const fileSize = parseInt(sizeOutput.trim());

    return {
      filePath: outputPath,
      duration,
      width: 1080,
      height: 1920,
      fileSize
    };
  } finally {
    try {
      await unlink(videoPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}
