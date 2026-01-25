'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, TrendingUp, MessageSquare, Loader2, Clock } from 'lucide-react';
import Link from 'next/link';
import { RedditOpportunities, TrendingTopics } from '@/components/marketing';

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  url: string;
  score: number;
  numComments: number;
  created: string;
  isQuestion: boolean;
  relevanceScore: number;
  keywords: string[];
}

interface TrendingTopic {
  topic: string;
  category: 'nutrition' | 'side-effects' | 'medications' | 'lifestyle' | 'questions' | 'other';
  mentionCount: number;
  sources: ('reddit' | 'twitter')[];
  samplePosts: Array<{
    platform: 'reddit' | 'twitter';
    title?: string;
    text: string;
    url: string;
  }>;
  suggestedContent: string;
}

type Tab = 'trends' | 'reddit';

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<Tab>('trends');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [redditPosts, setRedditPosts] = useState<RedditPost[]>([]);
  const [postsAnalyzed, setPostsAnalyzed] = useState(0);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
  const lastFetchRef = useRef<number>(0);

  // Fetch trends with cache busting
  const fetchTrends = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/discover/trends?_t=${timestamp}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        setTrends(data.topics || []);
        setPostsAnalyzed(data.totalPostsAnalyzed || 0);
      }
    } catch (err) {
      console.error('Failed to fetch trends:', err);
    }
  }, []);

  // Fetch Reddit opportunities with cache busting
  const fetchReddit = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/discover/reddit?limit=25&_t=${timestamp}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        setRedditPosts(data.posts || []);
        setLastFetchedAt(new Date());
        lastFetchRef.current = Date.now();
      }
    } catch (err) {
      console.error('Failed to fetch Reddit:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      await Promise.all([fetchTrends(), fetchReddit()]);
      setIsLoading(false);
    };
    fetchAll();
  }, [fetchTrends, fetchReddit]);

  // Auto-refresh when page becomes visible (if data is older than 30 minutes)
  useEffect(() => {
    const STALE_TIME = 30 * 60 * 1000; // 30 minutes

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastFetch = Date.now() - lastFetchRef.current;
        if (timeSinceLastFetch > STALE_TIME) {
          console.log('Data is stale, auto-refreshing...');
          fetchTrends();
          fetchReddit();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchTrends, fetchReddit]);

  // Format "last updated" time
  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Refresh handler
  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (activeTab === 'trends') {
        await fetchTrends();
      } else {
        await fetchReddit();
      }
    } catch {
      setError('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate content from trending topic
  const handleCreateContent = async (topic: TrendingTopic) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.topic,
          mode: 'topic',
          platforms: ['twitter', 'instagram', 'reddit']
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate content');
      }

      setSuccessMessage(`Generated ${result.drafts.length} drafts for "${topic.topic}"! View them in the Marketing Dashboard.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate reply for Reddit post
  const handleGenerateReply = async (post: RedditPost) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'reddit-reply',
          redditQuestion: `${post.title}\n\n${post.selftext}`,
          redditSubreddit: `r/${post.subreddit}`,
          topic: post.title
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate reply');
      }

      setSuccessMessage(`Generated reply draft! View it in the Marketing Dashboard.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate reply');
    } finally {
      setIsGenerating(false);
    }
  };

  const tabs = [
    { id: 'trends' as Tab, label: 'Trending Topics', icon: TrendingUp },
    { id: 'reddit' as Tab, label: 'Reddit Opportunities', icon: MessageSquare }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  Discover
                </h1>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  Social Listening
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Find conversations to join and trending topics to create content about
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/marketing"
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Back to Dashboard
              </Link>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-4 text-sm underline">
              Dismiss
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
            <Link href="/dashboard/marketing" className="ml-4 text-sm underline">
              Go to Dashboard →
            </Link>
          </div>
        )}

        {/* Stats bar */}
        <div className="mb-6 p-4 bg-white rounded-lg shadow flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-gray-500">Posts Analyzed</p>
              <p className="text-2xl font-bold text-gray-900">{postsAnalyzed}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Trending Topics</p>
              <p className="text-2xl font-bold text-gray-900">{trends.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Reddit Opportunities</p>
              <p className="text-2xl font-bold text-gray-900">{redditPosts.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Updated: {formatLastUpdated(lastFetchedAt)}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">r/Ozempic, r/Mounjaro, r/Zepbound +more</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 p-1 bg-gray-200 rounded-lg w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                <span className="ml-3 text-gray-600">Scanning social platforms...</span>
              </div>
            ) : activeTab === 'trends' ? (
              <TrendingTopics
                topics={trends}
                onCreateContent={handleCreateContent}
                isGenerating={isGenerating}
              />
            ) : (
              <RedditOpportunities
                posts={redditPosts}
                onGenerateReply={handleGenerateReply}
                isGenerating={isGenerating}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            Social listening data is refreshed on each page load. Reddit data is always available; Twitter requires API configuration.
          </p>
        </div>
      </footer>
    </div>
  );
}
