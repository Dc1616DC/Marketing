'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Image,
  Mic,
  Video,
  Loader2,
  Download,
  RefreshCw,
  Check,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Copy,
  Upload,
  Clock,
  Captions
} from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

type Step = 'content' | 'image' | 'voice' | 'video' | 'done';
type ImageSource = 'dalle' | 'midjourney';
type Duration = '8-10' | '15-30' | '30-60';
type VideoMode = 'simple' | 'runway';
type RunwayDuration = 5 | 10;
type CaptionStyle = 'minimal' | 'bold' | 'instagram';
type CaptionPosition = 'top' | 'center' | 'bottom';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Content settings
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState<Duration>('8-10');
  const [imageStyle, setImageStyle] = useState<'food' | 'lifestyle' | 'educational' | 'motivational'>('lifestyle');
  const [imageSource, setImageSource] = useState<ImageSource>('dalle');
  const [midjourneyPrompt, setMidjourneyPrompt] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('');
  const [motionStyle, setMotionStyle] = useState<'ken-burns' | 'zoom-in' | 'zoom-out' | 'none'>('ken-burns');
  const [videoMode, setVideoMode] = useState<VideoMode>('simple');
  const [runwayDuration, setRunwayDuration] = useState<RunwayDuration>(5);
  const [addCaptions, setAddCaptions] = useState(true);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('bold');
  const [captionPosition, setCaptionPosition] = useState<CaptionPosition>('bottom');
  const [promptCopied, setPromptCopied] = useState(false);

  // Generated media
  const [media, setMedia] = useState<GeneratedMedia>({});

  // Available voices
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceConfigured, setVoiceConfigured] = useState(false);

  // Video capabilities
  const [runwayConfigured, setRunwayConfigured] = useState(false);

  // Check voice and video availability
  useEffect(() => {
    // Fetch voice availability
    fetch('/api/generate/voice')
      .then(res => res.json())
      .then(data => {
        const fetchedVoices = data.voices || [];
        setVoices(fetchedVoices);
        setVoiceConfigured(data.configured);
        if (fetchedVoices.length > 0) {
          setSelectedVoice(fetchedVoices[0].key);
        }
      })
      .catch(() => {});

    // Fetch video capabilities (including Runway status)
    fetch('/api/generate/video')
      .then(res => res.json())
      .then(data => {
        setRunwayConfigured(data.runway?.configured || false);
      })
      .catch(() => {});
  }, []);

  // Generate short script from topic
  const generateScript = async () => {
    if (!topic.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, duration })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setContent(data.script);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate script');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Midjourney prompt
  const generateMJPrompt = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          style: imageStyle,
          format: 'reel',
          promptOnly: true
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Convert DALL-E prompt to Midjourney style
      const mjPrompt = `${data.prompt} --ar 9:16 --v 6.1 --style raw`;
      setMidjourneyPrompt(mjPrompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const copyMJPrompt = () => {
    navigator.clipboard.writeText(midjourneyPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  // Handle Midjourney image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      // Create a local URL for preview and use
      const localUrl = URL.createObjectURL(file);

      // Also upload to server for persistence
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setMedia(prev => ({
          ...prev,
          image: {
            url: data.url || localUrl,
            prompt: midjourneyPrompt || 'Uploaded from Midjourney'
          }
        }));
      } else {
        // Fall back to local URL if upload fails
        setMedia(prev => ({
          ...prev,
          image: {
            url: localUrl,
            prompt: midjourneyPrompt || 'Uploaded from Midjourney'
          }
        }));
      }

      setStep('voice');
    } catch (err) {
      // Fall back to local URL on error
      const localUrl = URL.createObjectURL(file);
      setMedia(prev => ({
        ...prev,
        image: {
          url: localUrl,
          prompt: midjourneyPrompt || 'Uploaded from Midjourney'
        }
      }));
      setStep('voice');
    } finally {
      setIsLoading(false);
    }
  };

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
      const requestBody: Record<string, unknown> = {
        content,
        existingImageUrl: media.image?.url,
        videoMode,
        addCaptions,
        captionStyle,
        captionPosition
      };

      // Simple mode needs audio and motion settings
      if (videoMode === 'simple') {
        requestBody.existingAudioUrl = media.voice?.url;
        requestBody.motion = motionStyle;
      } else {
        // Runway mode - include audio for voiceover overlay
        requestBody.existingAudioUrl = media.voice?.url;
        requestBody.runwayOptions = {
          prompt: `Subtle cinematic motion for wellness content: ${content.slice(0, 100)}`,
          duration: runwayDuration
        };
      }

      const response = await fetch('/api/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.help);

      // Handle processing state
      if (data.status === 'processing') {
        setError('Video is being generated by Runway. This may take 30-90 seconds. Please try again shortly.');
        return;
      }

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
    setTopic('');
    setMidjourneyPrompt('');
    setError(null);
  };

  const steps = [
    { id: 'content', label: 'Script', icon: Sparkles },
    { id: 'image', label: 'Image', icon: Image },
    { id: 'voice', label: 'Voice', icon: Mic },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'done', label: 'Done', icon: Check }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);
  const wordCount = content.split(/\s+/).filter(w => w).length;
  const estimatedSeconds = Math.ceil(wordCount / 2.5);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Instagram Reel</h1>
              <p className="mt-1 text-sm text-gray-500">
                Generate short-form video content with AI
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
              {/* Duration Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Target Duration
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: '8-10', label: '8-10 sec', desc: 'Quick hook (20-25 words)', recommended: true },
                    { id: '15-30', label: '15-30 sec', desc: 'Standard reel (40-75 words)' },
                    { id: '30-60', label: '30-60 sec', desc: 'Detailed (75-150 words)' }
                  ].map(d => (
                    <button
                      key={d.id}
                      onClick={() => setDuration(d.id as Duration)}
                      className={clsx(
                        'p-3 border rounded-lg text-left transition-colors relative',
                        duration === d.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      {d.recommended && (
                        <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                          Best
                        </span>
                      )}
                      <p className="font-medium text-gray-900">{d.label}</p>
                      <p className="text-xs text-gray-500">{d.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic-based generation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Generate from Topic
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., protein timing on GLP-1s"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={generateScript}
                    disabled={!topic.trim() || isLoading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Generate
                  </button>
                </div>
              </div>

              {/* Manual script input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Script
                  {content && (
                    <span className={clsx(
                      'ml-2 text-xs',
                      estimatedSeconds <= 10 ? 'text-green-600' :
                      estimatedSeconds <= 30 ? 'text-yellow-600' : 'text-red-600'
                    )}>
                      ~{estimatedSeconds}s ({wordCount} words)
                    </span>
                  )}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter or generate your script..."
                />
              </div>

              {/* Image Source Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Source
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setImageSource('dalle')}
                    className={clsx(
                      'p-4 border rounded-lg text-left transition-colors',
                      imageSource === 'dalle'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <p className="font-medium text-gray-900">DALL-E 3</p>
                    <p className="text-sm text-gray-500">Auto-generate with AI</p>
                  </button>
                  <button
                    onClick={() => setImageSource('midjourney')}
                    className={clsx(
                      'p-4 border rounded-lg text-left transition-colors',
                      imageSource === 'midjourney'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <p className="font-medium text-gray-900">Midjourney</p>
                    <p className="text-sm text-gray-500">Generate prompt, upload result</p>
                  </button>
                </div>
              </div>

              {/* Image Style (for DALL-E) */}
              {imageSource === 'dalle' && (
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
                          'p-3 border rounded-lg text-left transition-colors',
                          imageStyle === style.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <p className="font-medium text-gray-900 text-sm">{style.label}</p>
                        <p className="text-xs text-gray-500">{style.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setStep('image');
                  if (imageSource === 'dalle') {
                    generateImage();
                  } else {
                    generateMJPrompt();
                  }
                }}
                disabled={!content.trim() || isLoading}
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Continue to Image
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {/* Step 2: Image */}
          {step === 'image' && (
            <div className="space-y-6">
              {imageSource === 'dalle' ? (
                // DALL-E flow
                <>
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
                      <p className="text-gray-600">Generating your image with DALL-E 3...</p>
                      <p className="text-sm text-gray-400 mt-2">This may take 10-20 seconds</p>
                    </div>
                  ) : media.image ? (
                    <>
                      <div className="aspect-[9/16] max-w-xs mx-auto rounded-lg overflow-hidden bg-gray-100">
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
                </>
              ) : (
                // Midjourney flow
                <div className="space-y-6">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
                      <p className="text-gray-600">Generating Midjourney prompt...</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          1. Copy this prompt to Midjourney
                        </label>
                        <div className="relative">
                          <textarea
                            value={midjourneyPrompt}
                            onChange={(e) => setMidjourneyPrompt(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                          />
                          <button
                            onClick={copyMJPrompt}
                            className="absolute top-2 right-2 p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            {promptCopied ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-gray-600" />
                            )}
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          Paste this in Midjourney Discord: /imagine {midjourneyPrompt ? 'prompt' : '...'}
                        </p>
                      </div>

                      <div className="border-t pt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          2. Upload your Midjourney image
                        </label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />

                        {media.image ? (
                          <div className="space-y-4">
                            <div className="aspect-[9/16] max-w-xs mx-auto rounded-lg overflow-hidden bg-gray-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={media.image.url}
                                alt="Uploaded"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex gap-3">
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                              >
                                <RefreshCw className="h-4 w-4" />
                                Change Image
                              </button>
                              <button
                                onClick={() => setStep('voice')}
                                className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                              >
                                Continue
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isLoading}
                            className="w-full py-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors flex flex-col items-center justify-center gap-2"
                          >
                            <Upload className="h-8 w-8 text-gray-400" />
                            <span className="text-gray-600">Click to upload image</span>
                            <span className="text-xs text-gray-400">PNG, JPG up to 10MB</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
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
                    Get your free API key at <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="underline">elevenlabs.io</a>
                  </p>
                </div>
              ) : voices.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 font-medium">No voices available</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    Unable to fetch voices from ElevenLabs. Check your API key.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Voice
                    </label>
                    <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
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
                          <p className="text-sm text-gray-500 truncate">{voice.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={generateVoice}
                    disabled={isLoading || !selectedVoice}
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
                    Voiceover Generated (~{media.voice.duration}s)
                  </p>
                  <audio controls className="w-full mt-2">
                    <source src={media.voice.url} type="audio/mpeg" />
                  </audio>
                </div>
              )}

              {/* Video Mode Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Generation Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setVideoMode('simple')}
                    className={clsx(
                      'p-4 border rounded-lg text-left transition-colors',
                      videoMode === 'simple'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <p className="font-medium text-gray-900">Simple (FFmpeg)</p>
                    <p className="text-sm text-gray-500">Image + audio with motion effects</p>
                    <p className="text-xs text-green-600 mt-1">Instant • Uses voiceover</p>
                  </button>
                  <button
                    onClick={() => setVideoMode('runway')}
                    disabled={!runwayConfigured}
                    className={clsx(
                      'p-4 border rounded-lg text-left transition-colors relative',
                      videoMode === 'runway'
                        ? 'border-purple-500 bg-purple-50'
                        : runwayConfigured
                          ? 'border-gray-200 hover:border-gray-300'
                          : 'border-gray-200 opacity-50 cursor-not-allowed'
                    )}
                  >
                    {!runwayConfigured && (
                      <span className="absolute -top-2 -right-2 bg-gray-400 text-white text-xs px-2 py-0.5 rounded-full">
                        Not configured
                      </span>
                    )}
                    <p className="font-medium text-gray-900">AI Video (Runway)</p>
                    <p className="text-sm text-gray-500">AI-generated motion from image</p>
                    <p className="text-xs text-blue-600 mt-1">~60 sec • Premium quality</p>
                  </button>
                </div>
                {!runwayConfigured && (
                  <p className="mt-2 text-xs text-gray-500">
                    To use Runway, add RUNWAY_API_KEY to .env.local
                  </p>
                )}
              </div>

              {/* Motion Style (only for Simple mode) */}
              {videoMode === 'simple' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motion Style
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'ken-burns', label: 'Ken Burns', desc: 'Gentle zoom + pan' },
                      { id: 'zoom-in', label: 'Zoom In', desc: 'Slow zoom towards center' },
                      { id: 'zoom-out', label: 'Zoom Out', desc: 'Slow zoom out from center' },
                      { id: 'none', label: 'Static', desc: 'No motion, still image' }
                    ].map(motion => (
                      <button
                        key={motion.id}
                        onClick={() => setMotionStyle(motion.id as typeof motionStyle)}
                        className={clsx(
                          'p-3 border rounded-lg text-left transition-colors',
                          motionStyle === motion.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <p className="font-medium text-gray-900 text-sm">{motion.label}</p>
                        <p className="text-xs text-gray-500">{motion.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Runway Options (only for Runway mode) */}
              {videoMode === 'runway' && runwayConfigured && (
                <div className="space-y-4">
                  {/* Video Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Video Duration
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 5, label: '5 seconds', desc: 'Quick, punchy clip', cost: '~5 credits' },
                        { id: 10, label: '10 seconds', desc: 'Longer, more dynamic', cost: '~10 credits' }
                      ].map(dur => (
                        <button
                          key={dur.id}
                          onClick={() => setRunwayDuration(dur.id as RunwayDuration)}
                          className={clsx(
                            'p-3 border rounded-lg text-left transition-colors',
                            runwayDuration === dur.id
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <p className="font-medium text-gray-900">{dur.label}</p>
                          <p className="text-xs text-gray-500">{dur.desc}</p>
                          <p className="text-xs text-blue-600 mt-1">{dur.cost}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 font-medium">AI Video Generation</p>
                    <p className="text-blue-700 text-sm mt-1">
                      Runway Gen-3 will analyze your image and create cinematic motion.
                      This typically takes 30-90 seconds to process.
                    </p>
                  </div>
                </div>
              )}

              {/* Auto-Captions Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Captions className="h-4 w-4" />
                    Auto-Captions (Whisper AI)
                  </label>
                  <button
                    onClick={() => setAddCaptions(!addCaptions)}
                    className={clsx(
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      addCaptions ? 'bg-purple-600' : 'bg-gray-200'
                    )}
                  >
                    <span
                      className={clsx(
                        'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                        addCaptions ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>

                {addCaptions && (
                  <div className="space-y-4 pl-6 border-l-2 border-purple-200">
                    {/* Caption Style */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        Caption Style
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'minimal', label: 'Minimal', desc: 'Clean & simple' },
                          { id: 'bold', label: 'Bold', desc: 'High contrast' },
                          { id: 'instagram', label: 'Instagram', desc: 'Trendy style' }
                        ].map(style => (
                          <button
                            key={style.id}
                            onClick={() => setCaptionStyle(style.id as CaptionStyle)}
                            className={clsx(
                              'p-2 border rounded-lg text-left transition-colors',
                              captionStyle === style.id
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                            )}
                          >
                            <p className="font-medium text-gray-900 text-xs">{style.label}</p>
                            <p className="text-xs text-gray-500">{style.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Caption Position */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        Position
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'top', label: 'Top' },
                          { id: 'center', label: 'Center' },
                          { id: 'bottom', label: 'Bottom' }
                        ].map(pos => (
                          <button
                            key={pos.id}
                            onClick={() => setCaptionPosition(pos.id as CaptionPosition)}
                            className={clsx(
                              'p-2 border rounded-lg text-center transition-colors text-sm',
                              captionPosition === pos.id
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            )}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-gray-500">
                      Captions are auto-generated from your voiceover using Whisper AI
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={generateVideo}
                disabled={isLoading || (videoMode === 'simple' && !media.voice)}
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {videoMode === 'runway' ? 'Generating AI Video...' : 'Assembling Video...'}
                  </>
                ) : (
                  <>
                    <Video className="h-5 w-5" />
                    {videoMode === 'runway' ? 'Generate AI Video' : 'Create Video'}
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
