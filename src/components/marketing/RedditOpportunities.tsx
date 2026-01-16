'use client';

import { useState } from 'react';
import { ExternalLink, MessageCircle, ArrowUp, Sparkles, Copy, Check } from 'lucide-react';
import { clsx } from 'clsx';

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

interface RedditOpportunitiesProps {
  posts: RedditPost[];
  onGenerateReply: (post: RedditPost) => void;
  isGenerating: boolean;
}

export function RedditOpportunities({ posts, onGenerateReply, isGenerating }: RedditOpportunitiesProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyUrl = async (post: RedditPost) => {
    await navigator.clipboard.writeText(post.url);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No Reddit opportunities found right now.</p>
        <p className="text-sm mt-1">Try refreshing or check back later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div
          key={post.id}
          className={clsx(
            'bg-white border rounded-lg p-4 hover:shadow-md transition-shadow',
            post.isQuestion ? 'border-orange-200' : 'border-gray-200'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <span className="font-medium text-orange-600">r/{post.subreddit}</span>
                <span>•</span>
                <span>u/{post.author}</span>
                <span>•</span>
                <span>{formatTimeAgo(post.created)}</span>
              </div>
              <h4 className="font-medium text-gray-900 leading-snug">
                {post.title}
              </h4>
            </div>

            {/* Relevance badge */}
            {post.relevanceScore >= 30 && (
              <span className="shrink-0 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                High match
              </span>
            )}
          </div>

          {/* Body preview */}
          {post.selftext && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {post.selftext}
            </p>
          )}

          {/* Keywords */}
          {post.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {post.keywords.slice(0, 5).map((kw, i) => (
                <span key={i} className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded">
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                {post.score}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {post.numComments} comments
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopyUrl(post)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Copy link"
              >
                {copiedId === post.id ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>

              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                title="Open on Reddit"
              >
                <ExternalLink className="h-4 w-4" />
              </a>

              <button
                onClick={() => onGenerateReply(post)}
                disabled={isGenerating}
                className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                Draft Reply
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
