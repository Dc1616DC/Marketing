// Simple JSON file-based database for Chase Wellness Marketing Automation
// Easy to migrate to Prisma + Postgres/Supabase later

import { promises as fs } from 'fs';
import path from 'path';
import { Database, Draft, Post, Topic, DraftStatus, Platform, DraftMeta } from './types';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

// Initialize empty database
const emptyDb: Database = {
  drafts: [],
  posts: [],
  topics: []
};

// Generate a unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Read database from file
async function readDb(): Promise<Database> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data) as Database;
  } catch {
    // If file doesn't exist, create it with empty database
    await writeDb(emptyDb);
    return emptyDb;
  }
}

// Write database to file
async function writeDb(db: Database): Promise<void> {
  const dir = path.dirname(DB_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

// ============ DRAFT OPERATIONS ============

export async function createDraft(data: {
  platform: Platform;
  topic: string;
  title?: string;
  body: string;
  meta?: DraftMeta;
  scheduledAt?: string;
}): Promise<Draft> {
  const db = await readDb();
  const now = new Date().toISOString();

  const draft: Draft = {
    id: generateId(),
    platform: data.platform,
    topic: data.topic,
    title: data.title,
    body: data.body,
    meta: data.meta,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    scheduledAt: data.scheduledAt
  };

  db.drafts.push(draft);
  await writeDb(db);
  return draft;
}

export async function getDrafts(filters?: {
  platform?: Platform;
  status?: DraftStatus;
  topic?: string;
}): Promise<Draft[]> {
  const db = await readDb();
  let drafts = db.drafts;

  if (filters?.platform) {
    drafts = drafts.filter(d => d.platform === filters.platform);
  }
  if (filters?.status) {
    drafts = drafts.filter(d => d.status === filters.status);
  }
  if (filters?.topic) {
    drafts = drafts.filter(d =>
      d.topic.toLowerCase().includes(filters.topic!.toLowerCase())
    );
  }

  // Sort by createdAt descending (newest first)
  return drafts.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getDraftById(id: string): Promise<Draft | null> {
  const db = await readDb();
  return db.drafts.find(d => d.id === id) || null;
}

export async function updateDraft(
  id: string,
  data: Partial<Pick<Draft, 'title' | 'body' | 'meta' | 'status' | 'scheduledAt'>>
): Promise<Draft | null> {
  const db = await readDb();
  const index = db.drafts.findIndex(d => d.id === id);

  if (index === -1) return null;

  db.drafts[index] = {
    ...db.drafts[index],
    ...data,
    updatedAt: new Date().toISOString()
  };

  await writeDb(db);
  return db.drafts[index];
}

export async function deleteDraft(id: string): Promise<boolean> {
  const db = await readDb();
  const index = db.drafts.findIndex(d => d.id === id);

  if (index === -1) return false;

  db.drafts.splice(index, 1);
  await writeDb(db);
  return true;
}

// ============ POST OPERATIONS ============

export async function createPost(data: {
  draftId: string;
  platform: Platform;
  externalId?: string;
  url?: string;
}): Promise<Post> {
  const db = await readDb();
  const now = new Date().toISOString();

  const post: Post = {
    id: generateId(),
    draftId: data.draftId,
    platform: data.platform,
    externalId: data.externalId,
    url: data.url,
    postedAt: now,
    createdAt: now,
    updatedAt: now
  };

  db.posts.push(post);

  // Also update the draft status to published
  const draftIndex = db.drafts.findIndex(d => d.id === data.draftId);
  if (draftIndex !== -1) {
    db.drafts[draftIndex].status = 'published';
    db.drafts[draftIndex].updatedAt = now;
  }

  await writeDb(db);
  return post;
}

export async function getPosts(filters?: {
  platform?: Platform;
}): Promise<Post[]> {
  const db = await readDb();
  let posts = db.posts;

  if (filters?.platform) {
    posts = posts.filter(p => p.platform === filters.platform);
  }

  // Sort by postedAt descending (newest first)
  return posts.sort((a, b) =>
    new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
  );
}

export async function getPostByDraftId(draftId: string): Promise<Post | null> {
  const db = await readDb();
  return db.posts.find(p => p.draftId === draftId) || null;
}

export async function updatePostMetrics(
  id: string,
  metrics: Post['metrics']
): Promise<Post | null> {
  const db = await readDb();
  const index = db.posts.findIndex(p => p.id === id);

  if (index === -1) return null;

  db.posts[index] = {
    ...db.posts[index],
    metrics,
    updatedAt: new Date().toISOString()
  };

  await writeDb(db);
  return db.posts[index];
}

// ============ TOPIC OPERATIONS ============

export async function createTopic(data: {
  name: string;
  description?: string;
  category?: Topic['category'];
}): Promise<Topic> {
  const db = await readDb();
  const now = new Date().toISOString();

  const topic: Topic = {
    id: generateId(),
    name: data.name,
    description: data.description,
    category: data.category,
    isActive: true,
    createdAt: now,
    updatedAt: now
  };

  db.topics.push(topic);
  await writeDb(db);
  return topic;
}

export async function getTopics(): Promise<Topic[]> {
  const db = await readDb();
  return db.topics.filter(t => t.isActive);
}

// ============ BATCH OPERATIONS ============

export async function createDraftBatch(drafts: Array<{
  platform: Platform;
  topic: string;
  title?: string;
  body: string;
  meta?: DraftMeta;
}>): Promise<Draft[]> {
  const db = await readDb();
  const now = new Date().toISOString();

  const newDrafts: Draft[] = drafts.map(data => ({
    id: generateId(),
    platform: data.platform,
    topic: data.topic,
    title: data.title,
    body: data.body,
    meta: data.meta,
    status: 'pending' as DraftStatus,
    createdAt: now,
    updatedAt: now
  }));

  db.drafts.push(...newDrafts);
  await writeDb(db);
  return newDrafts;
}

// ============ STATS ============

export async function getStats(): Promise<{
  totalDrafts: number;
  pendingDrafts: number;
  approvedDrafts: number;
  publishedPosts: number;
  byPlatform: Record<Platform, number>;
}> {
  const db = await readDb();

  return {
    totalDrafts: db.drafts.length,
    pendingDrafts: db.drafts.filter(d => d.status === 'pending').length,
    approvedDrafts: db.drafts.filter(d => d.status === 'approved').length,
    publishedPosts: db.posts.length,
    byPlatform: {
      twitter: db.drafts.filter(d => d.platform === 'twitter').length,
      instagram: db.drafts.filter(d => d.platform === 'instagram').length,
      reddit: db.drafts.filter(d => d.platform === 'reddit').length
    }
  };
}

// Re-export types
export * from './types';
