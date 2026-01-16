'use client';

import { useState } from 'react';
import { Filter } from 'lucide-react';
import { Draft, Platform, DraftStatus } from '@/lib/db/types';
import { DraftCard } from './DraftCard';
import { clsx } from 'clsx';

interface DraftListProps {
  drafts: Draft[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onPublish: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, body: string) => Promise<void>;
}

const platforms: Array<{ value: Platform | 'all'; label: string }> = [
  { value: 'all', label: 'All Platforms' },
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'reddit', label: 'Reddit' }
];

const statuses: Array<{ value: DraftStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'published', label: 'Published' }
];

export function DraftList({
  drafts,
  onApprove,
  onReject,
  onPublish,
  onDelete,
  onUpdate
}: DraftListProps) {
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DraftStatus | 'all'>('all');

  // Filter drafts
  const filteredDrafts = drafts.filter((draft) => {
    if (platformFilter !== 'all' && draft.platform !== platformFilter) return false;
    if (statusFilter !== 'all' && draft.status !== statusFilter) return false;
    return true;
  });

  // Group by platform
  const groupedByPlatform = filteredDrafts.reduce((acc, draft) => {
    if (!acc[draft.platform]) {
      acc[draft.platform] = [];
    }
    acc[draft.platform].push(draft);
    return acc;
  }, {} as Record<string, Draft[]>);

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-gray-600">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          {/* Platform filter */}
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as Platform | 'all')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {platforms.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DraftStatus | 'all')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {/* Result count */}
          <span className="text-sm text-gray-500 ml-auto">
            {filteredDrafts.length} draft{filteredDrafts.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {filteredDrafts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium">No drafts found</p>
            <p className="text-sm mt-1">Generate some content to get started!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Show grouped by platform if showing all */}
            {platformFilter === 'all' ? (
              Object.entries(groupedByPlatform).map(([platform, platformDrafts]) => (
                <div key={platform}>
                  <h3 className={clsx(
                    'text-sm font-semibold uppercase tracking-wider mb-4 pb-2 border-b',
                    platform === 'twitter' && 'text-blue-600 border-blue-200',
                    platform === 'instagram' && 'text-pink-600 border-pink-200',
                    platform === 'reddit' && 'text-orange-600 border-orange-200'
                  )}>
                    {platform === 'twitter' ? 'X (Twitter)' : platform}
                    <span className="text-gray-400 font-normal ml-2">
                      ({platformDrafts.length})
                    </span>
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {platformDrafts.map((draft) => (
                      <DraftCard
                        key={draft.id}
                        draft={draft}
                        onApprove={onApprove}
                        onReject={onReject}
                        onPublish={onPublish}
                        onDelete={onDelete}
                        onUpdate={onUpdate}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {filteredDrafts.map((draft) => (
                  <DraftCard
                    key={draft.id}
                    draft={draft}
                    onApprove={onApprove}
                    onReject={onReject}
                    onPublish={onPublish}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
