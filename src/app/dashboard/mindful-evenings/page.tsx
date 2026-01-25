'use client';

import { useState, useEffect } from 'react';

interface CarouselSlide {
  text: string;
  isHook: boolean;
  slideNumber: number;
}

interface CarouselPost {
  theme: string;
  hook: string;
  slides: CarouselSlide[];
  caption: string;
  hashtags: string[];
  cta: string;
}

interface QueuedPost {
  id: string;
  post: CarouselPost;
  scheduledFor: string;
  status: 'pending' | 'posted' | 'failed';
  createdAt: string;
}

interface ThemeDetail {
  key: string;
  name: string;
  hookCount: number;
}

interface QueueStats {
  total: number;
  pending: number;
  posted: number;
  failed: number;
}

export default function MindfulEveningsPage() {
  const [themes, setThemes] = useState<ThemeDetail[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [nextPosts, setNextPosts] = useState<QueuedPost[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [generatedPost, setGeneratedPost] = useState<CarouselPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');

  // Load initial data
  useEffect(() => {
    fetchQueueData();
  }, []);

  async function fetchQueueData() {
    try {
      const res = await fetch('/api/mindful-evenings/generate');
      const data = await res.json();
      setThemes(data.themeDetails || []);
      setQueueStats(data.queueStats || null);
      setNextPosts(data.nextPosts || []);
      if (data.themeDetails?.length > 0) {
        setSelectedTheme(data.themeDetails[0].key);
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
    }
  }

  async function generateSinglePost() {
    if (!selectedTheme) return;
    setLoading(true);
    try {
      const res = await fetch('/api/mindful-evenings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'single', theme: selectedTheme })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedPost(data.post);
      }
    } catch (error) {
      console.error('Error generating post:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateWeeklyBatch() {
    setBatchLoading(true);
    try {
      const res = await fetch('/api/mindful-evenings/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'batch', postsPerDay: 3 })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Generated ${data.generated} posts! Total queued: ${data.totalQueued}`);
        fetchQueueData();
      }
    } catch (error) {
      console.error('Error generating batch:', error);
    } finally {
      setBatchLoading(false);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopySuccess(label);
    setTimeout(() => setCopySuccess(''), 2000);
  }

  function formatSlideForCopy(post: CarouselPost): string {
    return post.slides.map((s, i) => `[Slide ${i + 1}]\n${s.text}`).join('\n\n');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🌙 Mindful Evenings</h1>
          <p className="text-purple-200">Instagram Content Engine</p>
        </div>

        {/* Stats Cards */}
        {queueStats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-3xl font-bold">{queueStats.total}</div>
              <div className="text-purple-200 text-sm">Total Posts</div>
            </div>
            <div className="bg-green-500/20 rounded-xl p-4">
              <div className="text-3xl font-bold">{queueStats.pending}</div>
              <div className="text-green-200 text-sm">Pending</div>
            </div>
            <div className="bg-blue-500/20 rounded-xl p-4">
              <div className="text-3xl font-bold">{queueStats.posted}</div>
              <div className="text-blue-200 text-sm">Posted</div>
            </div>
            <div className="bg-red-500/20 rounded-xl p-4">
              <div className="text-3xl font-bold">{queueStats.failed}</div>
              <div className="text-red-200 text-sm">Failed</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-8">
          {/* Left Column: Generator */}
          <div>
            <div className="bg-white/10 rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Generate Content</h2>
              
              {/* Theme Selector */}
              <div className="mb-4">
                <label className="block text-sm text-purple-200 mb-2">Content Theme</label>
                <select
                  value={selectedTheme}
                  onChange={(e) => setSelectedTheme(e.target.value)}
                  className="w-full bg-white/10 border border-purple-400/30 rounded-lg px-4 py-2 text-white"
                >
                  {themes.map((t) => (
                    <option key={t.key} value={t.key} className="bg-purple-900">
                      {t.name} ({t.hookCount} hooks)
                    </option>
                  ))}
                </select>
              </div>

              {/* Generate Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={generateSinglePost}
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg px-4 py-3 font-medium transition"
                >
                  {loading ? 'Generating...' : '✨ Generate Single Post'}
                </button>
                <button
                  onClick={generateWeeklyBatch}
                  disabled={batchLoading}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg px-4 py-3 font-medium transition"
                >
                  {batchLoading ? 'Generating Week...' : '📅 Generate Week (21 posts)'}
                </button>
              </div>
            </div>

            {/* Generated Post Preview */}
            {generatedPost && (
              <div className="bg-white/10 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Generated Carousel</h2>
                  <span className="text-sm bg-purple-500/30 px-3 py-1 rounded-full">
                    {generatedPost.theme}
                  </span>
                </div>

                {/* Carousel Preview */}
                <div className="space-y-3 mb-6">
                  {generatedPost.slides.map((slide, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg ${
                        slide.isHook
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                          : 'bg-white/5'
                      }`}
                    >
                      <div className="text-xs text-purple-200 mb-1">
                        Slide {slide.slideNumber}
                      </div>
                      <div className="font-medium">{slide.text}</div>
                    </div>
                  ))}
                </div>

                {/* Caption */}
                <div className="mb-4">
                  <div className="text-sm text-purple-200 mb-1">Caption</div>
                  <div className="bg-white/5 p-3 rounded-lg text-sm">
                    {generatedPost.caption}
                  </div>
                </div>

                {/* Hashtags */}
                <div className="mb-4">
                  <div className="text-sm text-purple-200 mb-1">Hashtags</div>
                  <div className="flex flex-wrap gap-2">
                    {generatedPost.hashtags.map((tag, i) => (
                      <span key={i} className="bg-purple-500/30 px-2 py-1 rounded text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Copy Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(formatSlideForCopy(generatedPost), 'slides')}
                    className="flex-1 bg-white/10 hover:bg-white/20 rounded-lg px-4 py-2 text-sm transition"
                  >
                    {copySuccess === 'slides' ? '✓ Copied!' : '📋 Copy Slides'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(generatedPost.caption, 'caption')}
                    className="flex-1 bg-white/10 hover:bg-white/20 rounded-lg px-4 py-2 text-sm transition"
                  >
                    {copySuccess === 'caption' ? '✓ Copied!' : '📝 Copy Caption'}
                  </button>
                  <button
                    onClick={() => copyToClipboard(generatedPost.hashtags.map(t => `#${t}`).join(' '), 'hashtags')}
                    className="flex-1 bg-white/10 hover:bg-white/20 rounded-lg px-4 py-2 text-sm transition"
                  >
                    {copySuccess === 'hashtags' ? '✓ Copied!' : '#️⃣ Copy Tags'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Queue */}
          <div>
            <div className="bg-white/10 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">📋 Content Queue</h2>
              
              {nextPosts.length === 0 ? (
                <div className="text-center text-purple-200 py-8">
                  <div className="text-4xl mb-2">📭</div>
                  <p>No posts in queue</p>
                  <p className="text-sm">Generate a batch to fill your queue!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {nextPosts.map((queuedPost) => (
                    <div
                      key={queuedPost.id}
                      className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition cursor-pointer"
                      onClick={() => setGeneratedPost(queuedPost.post)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs bg-purple-500/30 px-2 py-1 rounded">
                          {queuedPost.post.theme}
                        </span>
                        <span className="text-xs text-purple-200">
                          {new Date(queuedPost.scheduledFor).toLocaleDateString()} {' '}
                          {new Date(queuedPost.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="font-medium text-sm line-clamp-2">
                        {queuedPost.post.hook}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl p-6 mt-6">
              <h3 className="font-semibold mb-3">📈 Instagram Strategy Tips</h3>
              <ul className="space-y-2 text-sm text-purple-100">
                <li>• Post 3-5 times per day for growth</li>
                <li>• Best times: 9am, 1pm, 7pm, 9pm EST</li>
                <li>• If a hook goes viral, create variations!</li>
                <li>• Consistent brand look > pretty but random</li>
                <li>• Save → Share → Comment CTAs drive engagement</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Proven Hooks Section */}
        <div className="mt-8 bg-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">🎯 Proven Hooks Library</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              "It's 9pm and you're not hungry, but you're standing at the fridge anyway.",
              "The medication works during the day, but evenings are still hard.",
              "Cravings are data, not weakness.",
              "Evening eating isn't about willpower. It never was.",
              "Tired isn't hungry. But they feel the same at 9pm.",
              "The fridge won't fix what's actually wrong."
            ].map((hook, i) => (
              <div
                key={i}
                className="bg-white/5 p-3 rounded-lg text-sm cursor-pointer hover:bg-white/10 transition"
                onClick={() => copyToClipboard(hook, `hook-${i}`)}
              >
                {copySuccess === `hook-${i}` ? '✓ Copied!' : hook}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
