'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { StatsCards, GenerateForm, DraftList } from '@/components/marketing';
import { Draft } from '@/lib/db/types';

interface Stats {
  totalDrafts: number;
  pendingDrafts: number;
  approvedDrafts: number;
  publishedPosts: number;
  byPlatform: {
    twitter: number;
    instagram: number;
    reddit: number;
  };
}

export default function MarketingDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statsRes, draftsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/drafts')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (draftsRes.ok) {
        const draftsData = await draftsRes.json();
        setDrafts(draftsData.drafts || []);
      }

      setError(null);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Show success message temporarily
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Generate content
  const handleGenerate = async (data: {
    topic: string;
    mode: 'topic' | 'content' | 'reddit-reply';
    sourceContent?: string;
    platforms: string[];
    redditQuestion?: string;
    redditSubreddit?: string;
  }) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate content');
      }

      showSuccess(`Generated ${result.drafts.length} draft(s)!`);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  // Approve draft
  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to approve draft');
      }

      showSuccess('Draft approved!');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve draft');
    }
  };

  // Reject draft
  const handleReject = async (id: string) => {
    try {
      const response = await fetch(`/api/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to reject draft');
      }

      showSuccess('Draft rejected');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject draft');
    }
  };

  // Publish draft
  const handlePublish = async (id: string) => {
    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: id })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to publish');
      }

      showSuccess('Published successfully!');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    }
  };

  // Delete draft
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;

    try {
      const response = await fetch(`/api/drafts/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete draft');
      }

      showSuccess('Draft deleted');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete draft');
    }
  };

  // Update draft
  const handleUpdate = async (id: string, body: string) => {
    try {
      const response = await fetch(`/api/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update draft');
      }

      showSuccess('Draft updated!');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update draft');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Marketing Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Chase Wellness Content Automation
              </p>
            </div>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}

        {/* Stats */}
        <StatsCards stats={stats} />

        {/* Two-column layout on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Generate Form - Takes 1/3 */}
          <div className="lg:col-span-1">
            <GenerateForm
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          </div>

          {/* Draft List - Takes 2/3 */}
          <div className="lg:col-span-2">
            <DraftList
              drafts={drafts}
              onApprove={handleApprove}
              onReject={handleReject}
              onPublish={handlePublish}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            Chase Wellness Marketing Automation System &bull; Mode A (Human-Approval)
          </p>
        </div>
      </footer>
    </div>
  );
}
