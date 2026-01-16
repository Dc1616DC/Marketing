'use client';

import { TrendingUp, Sparkles, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';

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

interface TrendingTopicsProps {
  topics: TrendingTopic[];
  onCreateContent: (topic: TrendingTopic) => void;
  isGenerating: boolean;
}

const categoryColors: Record<TrendingTopic['category'], { bg: string; text: string }> = {
  nutrition: { bg: 'bg-green-100', text: 'text-green-700' },
  'side-effects': { bg: 'bg-red-100', text: 'text-red-700' },
  medications: { bg: 'bg-blue-100', text: 'text-blue-700' },
  lifestyle: { bg: 'bg-purple-100', text: 'text-purple-700' },
  questions: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  other: { bg: 'bg-gray-100', text: 'text-gray-700' }
};

export function TrendingTopics({ topics, onCreateContent, isGenerating }: TrendingTopicsProps) {
  if (topics.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No trending topics found right now.</p>
        <p className="text-sm mt-1">Try refreshing to fetch the latest data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {topics.map((topic, index) => {
        const colors = categoryColors[topic.category];

        return (
          <div
            key={topic.topic}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    {topic.topic}
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={clsx('px-2 py-0.5 text-xs font-medium rounded', colors.bg, colors.text)}>
                      {topic.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {topic.mentionCount} mentions
                    </span>
                    <span className="text-xs text-gray-400">
                      via {topic.sources.join(' & ')}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onCreateContent(topic)}
                disabled={isGenerating}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                Create Content
              </button>
            </div>

            {/* Suggestion */}
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 mb-3">
              <p className="text-sm text-purple-800">
                <span className="font-medium">Content idea:</span> {topic.suggestedContent}
              </p>
            </div>

            {/* Sample posts */}
            {topic.samplePosts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Sample posts:</p>
                {topic.samplePosts.slice(0, 2).map((post, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={clsx(
                      'shrink-0 px-1.5 py-0.5 text-xs rounded',
                      post.platform === 'reddit' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    )}>
                      {post.platform}
                    </span>
                    <p className="text-gray-600 line-clamp-1 flex-1">
                      {post.title || post.text}
                    </p>
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-gray-400 hover:text-gray-600"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
