'use client';

import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Send,
  Copy,
  Trash2,
  Edit3,
  X,
  Save,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Draft, DraftStatus } from '@/lib/db/types';
import { clsx } from 'clsx';

interface DraftCardProps {
  draft: Draft;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onPublish: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, body: string) => Promise<void>;
}

const statusColors: Record<DraftStatus, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
  published: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Published' }
};

const platformColors: Record<string, { bg: string; text: string }> = {
  twitter: { bg: 'bg-blue-100', text: 'text-blue-800' },
  instagram: { bg: 'bg-pink-100', text: 'text-pink-800' },
  reddit: { bg: 'bg-orange-100', text: 'text-orange-800' }
};

export function DraftCard({
  draft,
  onApprove,
  onReject,
  onPublish,
  onDelete,
  onUpdate
}: DraftCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(draft.body);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const status = statusColors[draft.status];
  const platform = platformColors[draft.platform] || { bg: 'bg-gray-100', text: 'text-gray-800' };

  const handleAction = async (action: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (editedBody !== draft.body) {
      await handleAction(() => onUpdate(draft.id, editedBody));
    }
    setIsEditing(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draft.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const charCount = draft.body.length;
  const maxChars = draft.platform === 'twitter' ? 280 : draft.platform === 'instagram' ? 2200 : null;
  const isOverLimit = maxChars && charCount > maxChars;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', platform.bg, platform.text)}>
            {draft.platform === 'twitter' ? 'X' : draft.platform}
          </span>
          <span className={clsx('px-2 py-1 rounded-full text-xs font-medium', status.bg, status.text)}>
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {maxChars && (
            <span className={isOverLimit ? 'text-red-600 font-medium' : ''}>
              {charCount}/{maxChars}
            </span>
          )}
          <span>{new Date(draft.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Topic */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Topic:</span> {draft.topic}
        </p>
      </div>

      {/* Body */}
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditedBody(draft.body);
                  setIsEditing(false);
                }}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
            {draft.body}
          </p>
        )}

        {/* Hashtags */}
        {draft.meta?.hashtags && draft.meta.hashtags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {draft.meta.hashtags.map((tag, i) => (
              <span key={i} className="text-xs text-purple-600">
                #{tag.replace('#', '')}
              </span>
            ))}
          </div>
        )}

        {/* Reddit subreddit */}
        {draft.platform === 'reddit' && draft.meta?.redditSubreddit && (
          <p className="mt-2 text-xs text-orange-600">
            For: {draft.meta.redditSubreddit}
          </p>
        )}

        {/* Hook idea */}
        {draft.meta?.hookIdeas && draft.meta.hookIdeas.length > 0 && (
          <p className="mt-2 text-xs text-gray-500 italic">
            Angle: {draft.meta.hookIdeas[0]}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Edit button */}
          {draft.status !== 'published' && (
            <button
              onClick={() => setIsEditing(true)}
              disabled={isLoading || isEditing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          )}

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={copied ? 'Copied!' : 'Copy to clipboard'}
          >
            {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </button>

          {/* Delete button */}
          {draft.status !== 'published' && (
            <button
              onClick={() => handleAction(() => onDelete(draft.id))}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Pending actions */}
          {draft.status === 'pending' && (
            <>
              <button
                onClick={() => handleAction(() => onReject(draft.id))}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
              <button
                onClick={() => handleAction(() => onApprove(draft.id))}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Approve
              </button>
            </>
          )}

          {/* Approved actions */}
          {draft.status === 'approved' && draft.platform !== 'reddit' && (
            <button
              onClick={() => handleAction(() => onPublish(draft.id))}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Publish Now
            </button>
          )}

          {/* Reddit approved - just show copy hint */}
          {draft.status === 'approved' && draft.platform === 'reddit' && (
            <span className="text-xs text-gray-500">
              Copy and post manually on Reddit
            </span>
          )}

          {/* Published - show link */}
          {draft.status === 'published' && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <ExternalLink className="h-3 w-3" />
              Published
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
