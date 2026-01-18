// Voice Generator for Instagram Reels
// Uses ElevenLabs for natural-sounding voiceovers

export interface VoiceSettings {
  stability: number;      // 0-1, higher = more consistent
  similarityBoost: number; // 0-1, higher = closer to original voice
  style: number;          // 0-1, style exaggeration
  useSpeakerBoost: boolean;
}

export interface GeneratedVoice {
  audioBuffer: Buffer;
  contentLength: number;
  voiceId: string;
  voiceName: string;
}

// Recommended voices for health/wellness content
export const RECOMMENDED_VOICES = {
  // Male voices - professional, warm
  'adam': { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep, professional male voice' },
  'josh': { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Young, energetic male voice' },
  'sam': { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', description: 'Warm, conversational male voice' },

  // Female voices - friendly, relatable
  'rachel': { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Warm, professional female voice' },
  'domi': { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Young, friendly female voice' },
  'bella': { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Soft, soothing female voice' },
  'elli': { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', description: 'Young, relatable female voice' }
};

// Default voice for Dan Chase content (professional male)
const DEFAULT_VOICE = RECOMMENDED_VOICES.adam;

// Default voice settings for natural, conversational delivery
const DEFAULT_SETTINGS: VoiceSettings = {
  stability: 0.5,        // Balanced - not too robotic, not too variable
  similarityBoost: 0.75, // Stay close to the voice character
  style: 0.3,            // Subtle style enhancement
  useSpeakerBoost: true  // Clearer audio
};

/**
 * Check if ElevenLabs is configured
 */
export function isElevenLabsConfigured(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}

/**
 * Get available voices from ElevenLabs
 */
export async function getAvailableVoices(): Promise<Array<{ id: string; name: string; description: string }>> {
  if (!isElevenLabsConfigured()) {
    // Return our recommended voices even without API key
    return Object.values(RECOMMENDED_VOICES).map(v => ({
      id: v.id,
      name: v.name,
      description: v.description
    }));
  }

  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!
    }
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status}`);
  }

  const data = await response.json();
  return data.voices.map((v: { voice_id: string; name: string; labels?: { description?: string } }) => ({
    id: v.voice_id,
    name: v.name,
    description: v.labels?.description || ''
  }));
}

/**
 * Generate voiceover from text using ElevenLabs
 */
export async function generateVoiceover(
  text: string,
  options?: {
    voiceId?: string;
    voiceName?: string;
    settings?: Partial<VoiceSettings>;
  }
): Promise<GeneratedVoice> {
  if (!isElevenLabsConfigured()) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set. Get your API key at elevenlabs.io');
  }

  const voiceId = options?.voiceId || DEFAULT_VOICE.id;
  const voiceName = options?.voiceName || DEFAULT_VOICE.name;
  const settings = { ...DEFAULT_SETTINGS, ...options?.settings };

  // Clean text for voice (remove hashtags, URLs, emojis)
  const cleanText = cleanTextForVoice(text);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      text: cleanText,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: settings.stability,
        similarity_boost: settings.similarityBoost,
        style: settings.style,
        use_speaker_boost: settings.useSpeakerBoost
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);

  return {
    audioBuffer,
    contentLength: audioBuffer.length,
    voiceId,
    voiceName
  };
}

/**
 * Clean text for voice synthesis
 * Removes elements that don't make sense when spoken
 */
function cleanTextForVoice(text: string): string {
  return text
    // Remove hashtags
    .replace(/#\w+/g, '')
    // Remove URLs
    .replace(/https?:\/\/\S+/g, '')
    // Remove emojis (basic pattern)
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    // Remove @ mentions
    .replace(/@\w+/g, '')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    // Clean up multiple newlines
    .replace(/\n+/g, '. ')
    .trim();
}

/**
 * Estimate voice duration based on text length
 * Average speaking rate is ~150 words per minute
 */
export function estimateVoiceDuration(text: string): number {
  const cleanText = cleanTextForVoice(text);
  const wordCount = cleanText.split(/\s+/).length;
  const wordsPerSecond = 150 / 60; // 2.5 words per second
  return Math.ceil(wordCount / wordsPerSecond);
}

/**
 * Generate voiceover optimized for Instagram Reels
 * Reels perform best at 15-60 seconds
 */
export async function generateReelVoiceover(
  text: string,
  options?: {
    voiceId?: string;
    targetDuration?: number; // seconds
  }
): Promise<GeneratedVoice & { estimatedDuration: number }> {
  const estimatedDuration = estimateVoiceDuration(text);

  // Warn if content is too long for a reel
  if (estimatedDuration > 60) {
    console.warn(`Content may be too long for a reel (~${estimatedDuration}s). Consider shortening.`);
  }

  const voice = await generateVoiceover(text, {
    voiceId: options?.voiceId,
    settings: {
      stability: 0.6,        // Slightly more stable for short content
      similarityBoost: 0.75,
      style: 0.4,            // Bit more expressive for social
      useSpeakerBoost: true
    }
  });

  return {
    ...voice,
    estimatedDuration
  };
}
