// Database types for Chase Wellness Marketing Automation System

export type Platform = 'twitter' | 'instagram' | 'reddit';

export type DraftStatus = 'pending' | 'approved' | 'rejected' | 'published';

export type TopicCategory = 'nutrition' | 'side-effects' | 'meal-ideas' | 'behavior' | 'product';

export interface DraftMeta {
  hashtags?: string[];
  hookIdeas?: string[];
  imageUrl?: string;
  sourceUrl?: string;
  redditSubreddit?: string;
  redditContext?: string;
}

export interface Draft {
  id: string;
  platform: Platform;
  topic: string;
  title?: string;
  body: string;
  meta?: DraftMeta;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
}

export interface PostMetrics {
  likes?: number;
  retweets?: number;
  replies?: number;
  impressions?: number;
  shares?: number;
}

export interface Post {
  id: string;
  draftId: string;
  platform: Platform;
  externalId?: string;
  url?: string;
  postedAt: string;
  metrics?: PostMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  category?: TopicCategory;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Database {
  drafts: Draft[];
  posts: Post[];
  topics: Topic[];
}
