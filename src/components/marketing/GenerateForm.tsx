'use client';

import { useState } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { getTopicSuggestions } from '@/lib/ai/topic-suggestions';

interface GenerateFormProps {
  onGenerate: (data: {
    topic: string;
    mode: 'topic' | 'content' | 'reddit-reply';
    sourceContent?: string;
    platforms: string[];
    redditQuestion?: string;
    redditSubreddit?: string;
  }) => Promise<void>;
  isGenerating: boolean;
}

export function GenerateForm({ onGenerate, isGenerating }: GenerateFormProps) {
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<'topic' | 'content' | 'reddit-reply'>('topic');
  const [sourceContent, setSourceContent] = useState('');
  const [platforms, setPlatforms] = useState(['twitter', 'instagram', 'reddit']);
  const [redditQuestion, setRedditQuestion] = useState('');
  const [redditSubreddit, setRedditSubreddit] = useState('r/Ozempic');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const topicSuggestions = getTopicSuggestions();

  const togglePlatform = (platform: string) => {
    if (platforms.includes(platform)) {
      setPlatforms(platforms.filter(p => p !== platform));
    } else {
      setPlatforms([...platforms, platform]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'reddit-reply') {
      await onGenerate({
        topic: `Reddit reply: ${redditQuestion.substring(0, 50)}`,
        mode,
        platforms: ['reddit'],
        redditQuestion,
        redditSubreddit
      });
    } else if (mode === 'content') {
      await onGenerate({
        topic,
        mode,
        sourceContent,
        platforms
      });
    } else {
      await onGenerate({
        topic,
        mode,
        platforms
      });
    }

    // Clear form after generation
    if (mode === 'reddit-reply') {
      setRedditQuestion('');
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setTopic(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-600" />
        Generate Content
      </h2>

      {/* Mode Selection */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMode('topic')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'topic'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          From Topic
        </button>
        <button
          type="button"
          onClick={() => setMode('content')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'content'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Repurpose Content
        </button>
        <button
          type="button"
          onClick={() => setMode('reddit-reply')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'reddit-reply'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Reddit Reply
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Topic-based generation */}
        {mode === 'topic' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              <input
                type="text"
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Managing nausea on GLP-1 medications"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            {/* Topic Suggestions */}
            <div>
              <button
                type="button"
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
              >
                {showSuggestions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Topic suggestions
              </button>

              {showSuggestions && (
                <div className="mt-2 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                  {topicSuggestions.map((pillar) => (
                    <div key={pillar.pillar} className="mb-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                        {pillar.pillar}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {pillar.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => selectSuggestion(suggestion)}
                            className="text-xs bg-white border border-gray-200 px-2 py-1 rounded hover:bg-purple-50 hover:border-purple-200 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content repurposing */}
        {mode === 'content' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="topic-content" className="block text-sm font-medium text-gray-700 mb-1">
                Topic / Title
              </label>
              <input
                type="text"
                id="topic-content"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Protein requirements on GLP-1s"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="sourceContent" className="block text-sm font-medium text-gray-700 mb-1">
                Source Content
              </label>
              <textarea
                id="sourceContent"
                value={sourceContent}
                onChange={(e) => setSourceContent(e.target.value)}
                placeholder="Paste blog post, article, or other content to repurpose..."
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        )}

        {/* Reddit reply */}
        {mode === 'reddit-reply' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="redditSubreddit" className="block text-sm font-medium text-gray-700 mb-1">
                Subreddit
              </label>
              <select
                id="redditSubreddit"
                value={redditSubreddit}
                onChange={(e) => setRedditSubreddit(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="r/Ozempic">r/Ozempic</option>
                <option value="r/Mounjaro">r/Mounjaro</option>
                <option value="r/Zepbound">r/Zepbound</option>
                <option value="r/loseit">r/loseit</option>
                <option value="r/GLP1_Medicines">r/GLP1_Medicines</option>
                <option value="r/Semaglutide">r/Semaglutide</option>
                <option value="r/WeightLossAdvice">r/WeightLossAdvice</option>
              </select>
            </div>
            <div>
              <label htmlFor="redditQuestion" className="block text-sm font-medium text-gray-700 mb-1">
                Question / Post to Reply To
              </label>
              <textarea
                id="redditQuestion"
                value={redditQuestion}
                onChange={(e) => setRedditQuestion(e.target.value)}
                placeholder="Paste the Reddit question or post you want to reply to..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        )}

        {/* Platform Selection (not shown for Reddit reply) */}
        {mode !== 'reddit-reply' && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platforms
            </label>
            <div className="flex gap-3">
              {['twitter', 'instagram', 'reddit'].map((platform) => (
                <label
                  key={platform}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                    platforms.includes(platform)
                      ? 'bg-purple-50 border-purple-300 text-purple-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={platforms.includes(platform)}
                    onChange={() => togglePlatform(platform)}
                    className="sr-only"
                  />
                  <span className="capitalize">{platform === 'twitter' ? 'X (Twitter)' : platform}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isGenerating || platforms.length === 0}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Generate Drafts
            </>
          )}
        </button>
      </form>
    </div>
  );
}
