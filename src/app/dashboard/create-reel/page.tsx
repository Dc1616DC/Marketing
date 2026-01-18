'use client';

import { useState, useEffect } from 'react';
import {
  Image,
  Mic,
  Video,
  Loader2,
  Download,
  RefreshCw,
  Check,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

type Step = 'content' | 'image' | 'voice' | 'video' | 'done';

interface GeneratedMedia {
  image?: {
    url: string;
    prompt: string;
  };
  voice?: {
    url: string;
    voiceName: string;
    duration: number;
  };
  video?: {
    url: string;
    duration: number;
    fileSize: number;
  };
}

interface Voice {
  key: string;
  id: string;
  name: string;
  description: string;
}

export default function CreateReelPage() {
  const [step, setStep] = useState<Step>('content');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Content
  const [content, setContent] = useState('');
  const [imageStyle, setImageStyle] = useState<'food' | 'lifestyle' | 'educational' | 'motivational'>('lifestyle');
  const [selectedVoice, setSelectedVoice] = useState('adam');
  const [motionStyle, setMotionStyle] = useState<'ken-burns' | 'zoom-in' | 'zoom-out' | 'none'>('ken-burns');

  // Generated media
  const [media, setMedia] = useState<GeneratedMedia>({});

  // Available voices
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceConfigured, setVoiceConfigured] = useState(false);

  // Check voice availability
  useEffect(() => {
    fetch('/api/generate/voice')
      .then(res => res.json())
      .then(data => {
        setVoices(data.voices || []);
        setVoiceConfigured(data.configured);
      })
      .catch(() => {});
  }, []);

  const generateImage = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          style: imageStyle,
          format: 'reel'
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setMedia(prev => ({ ...prev, image: data.image }));
      setStep('voice');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsLoading(false);
    }
  };

  const generateVoice = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          voiceId: voices.find(v => v.key === selectedVoice)?.id,
          format: 'reel'
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.help);

      setMedia(prev => ({
        ...prev,
        voice: {
          url: data.voice.url,
          voiceName: data.voice.voiceName,
          duration: data.voice.estimatedDuration
        }
      }));
      setStep('video');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate voiceover');
    } finally {
      setIsLoading(false);
    }
  };

  const generateVideo = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          existingImageUrl: media.image?.url,
          existingAudioUrl: media.voice?.url,
          motion: motionStyle
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.help);

      setMedia(prev => ({ ...prev, video: data.video }));
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate video');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAll = () => {
    setStep('content');
    setMedia({});
    setContent('');
    setError(null);
  };

  const steps = [
    { id: 'content', label: 'Content', icon: Image },
    { id: 'image', label: 'Image', icon: Image },
    { id: 'voice', label: 'Voice', icon: Mic },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'done', label: 'Done', icon: Check }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Instagram Reel</h1>
              <p className="mt-1 text-sm text-gray-500">
                Generate image + voiceover video from your content
              </p>
            </div>
            <Link
              href="/dashboard/marketing"
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, index) => (
            <div key={s.id} className="flex items-center">
              <div className={clsx(
                'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                index < currentStepIndex
                  ? 'bg-green-500 border-green-500 text-white'
                  : index === currentStepIndex
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-white border-gray-300 text-gray-400'
              )}>
                {index < currentStepIndex ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <s.icon className="h-5 w-5" />
                )}
              </div>
              <span className={clsx(
                'ml-2 text-sm font-medium',
                index <= currentStepIndex ? 'text-gray-900' : 'text-gray-400'
              )}>
                {s.label}
              </span>
              {index < steps.length - 1 && (
                <ChevronRight className="mx-4 h-5 w-5 text-gray-300" />
              )}
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-sm text-red-600 underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {/* Step 1: Content */}
          {step === 'content' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content for your Reel
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter the content/script for your Instagram Reel. This will be used to generate the image and voiceover..."
                />
                <p className="mt-2 text-sm text-gray-500">
                  Tip: Keep it under 60 seconds when spoken (~150 words) for best Reel performance
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Style
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'food', label: 'Food Photography', desc: 'Protein-rich meals, healthy food' },
                    { id: 'lifestyle', label: 'Lifestyle', desc: 'Authentic, positive moments' },
                    { id: 'educational', label: 'Educational', desc: 'Clean, informative graphics' },
                    { id: 'motivational', label: 'Motivational', desc: 'Inspiring, hopeful imagery' }
                  ].map(style => (
                    <button
                      key={style.id}
                      onClick={() => setImageStyle(style.id as typeof imageStyle)}
                      className={clsx(
                        'p-4 border rounded-lg text-left transition-colors',
                        imageStyle === style.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <p className="font-medium text-gray-900">{style.label}</p>
                      <p className="text-sm text-gray-500">{style.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => { setStep('image'); generateImage(); }}
                disabled={!content.trim() || isLoading}
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating Image...
                  </>
                ) : (
                  <>
                    Generate Image
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Image Preview */}
          {step === 'image' && (
            <div className="space-y-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
                  <p className="text-gray-600">Generating your image with DALL-E 3...</p>
                  <p className="text-sm text-gray-400 mt-2">This may take 10-20 seconds</p>
                </div>
              ) : media.image ? (
                <>
                  <div className="aspect-[9/16] max-w-xs mx-auto rounded-lg overflow-hidden bg-gray-100 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={media.image.url}
                      alt="Generated"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={generateImage}
                      className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Regenerate
                    </button>
                    <button
                      onClick={() => setStep('voice')}
                      className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                    >
                      Continue
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Step 3: Voice Selection */}
          {step === 'voice' && (
            <div className="space-y-6">
              {!voiceConfigured ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 font-medium">ElevenLabs API Key Required</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Add ELEVENLABS_API_KEY to your .env.local file to generate voiceovers.
                    Get your free API key at <a href="https://elevenlabs.io" target="_blank" className="underline">elevenlabs.io</a>
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Voice
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {voices.map(voice => (
                        <button
                          key={voice.key}
                          onClick={() => setSelectedVoice(voice.key)}
                          className={clsx(
                            'p-4 border rounded-lg text-left transition-colors',
                            selectedVoice === voice.key
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <p className="font-medium text-gray-900">{voice.name}</p>
                          <p className="text-sm text-gray-500">{voice.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={generateVoice}
                    disabled={isLoading}
                    className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Generating Voiceover...
                      </>
                    ) : (
                      <>
                        <Mic className="h-5 w-5" />
                        Generate Voiceover
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Step 4: Video Assembly */}
          {step === 'video' && (
            <div className="space-y-6">
              {media.voice && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium flex items-center gap-2">
                    <Check className="h-5 w-5" />
                    Voiceover Generated ({media.voice.duration}s)
                  </p>
                  <audio controls className="w-full mt-2">
                    <source src={media.voice.url} type="audio/mpeg" />
                  </audio>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motion Style
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'ken-burns', label: 'Ken Burns', desc: 'Gentle zoom + pan (recommended)' },
                    { id: 'zoom-in', label: 'Zoom In', desc: 'Slow zoom towards center' },
                    { id: 'zoom-out', label: 'Zoom Out', desc: 'Slow zoom out from center' },
                    { id: 'none', label: 'Static', desc: 'No motion, still image' }
                  ].map(motion => (
                    <button
                      key={motion.id}
                      onClick={() => setMotionStyle(motion.id as typeof motionStyle)}
                      className={clsx(
                        'p-4 border rounded-lg text-left transition-colors',
                        motionStyle === motion.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <p className="font-medium text-gray-900">{motion.label}</p>
                      <p className="text-sm text-gray-500">{motion.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={generateVideo}
                disabled={isLoading}
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Assembling Video...
                  </>
                ) : (
                  <>
                    <Video className="h-5 w-5" />
                    Create Video
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && media.video && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Your Reel is Ready!</h2>
                <p className="text-gray-500 mt-1">
                  {Math.round(media.video.duration)}s video • {(media.video.fileSize / 1024 / 1024).toFixed(1)}MB
                </p>
              </div>

              <div className="aspect-[9/16] max-w-xs mx-auto rounded-lg overflow-hidden bg-black">
                <video
                  controls
                  className="w-full h-full object-contain"
                  poster={media.image?.url}
                >
                  <source src={media.video.url} type="video/mp4" />
                </video>
              </div>

              <div className="flex gap-3">
                <a
                  href={media.video.url}
                  download="instagram-reel.mp4"
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Download className="h-5 w-5" />
                  Download Video
                </a>
                <button
                  onClick={resetAll}
                  className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-5 w-5" />
                  Create Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
