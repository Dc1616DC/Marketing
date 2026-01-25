// API endpoint for generating Mindful Evenings Instagram content

import { NextRequest, NextResponse } from 'next/server';
import { 
  generateCarouselPost, 
  generateWeeklyCarousels, 
  generateHookVariations,
  createPostQueue,
  CONTENT_THEMES,
  getAllHooks,
  CarouselPost,
  QueuedPost
} from '@/lib/ai/mindful-evenings-instagram';
import fs from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'mindful-evenings-queue.json');

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Load queue from file
async function loadQueue(): Promise<QueuedPost[]> {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// Save queue to file
async function saveQueue(queue: QueuedPost[]) {
  await ensureDataDir();
  await fs.writeFile(DATA_FILE, JSON.stringify(queue, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, theme, hook, count, postsPerDay } = body;

    switch (action) {
      case 'single': {
        // Generate a single carousel post
        if (!theme || !Object.keys(CONTENT_THEMES).includes(theme)) {
          return NextResponse.json(
            { error: 'Invalid or missing theme', validThemes: Object.keys(CONTENT_THEMES) },
            { status: 400 }
          );
        }
        const post = await generateCarouselPost(theme as keyof typeof CONTENT_THEMES);
        return NextResponse.json({ success: true, post });
      }

      case 'batch': {
        // Generate a week's worth of content
        const posts = await generateWeeklyCarousels(postsPerDay || 3);
        const queue = createPostQueue(posts, postsPerDay || 3);
        
        // Save to queue
        const existingQueue = await loadQueue();
        const newQueue = [...existingQueue, ...queue];
        await saveQueue(newQueue);
        
        return NextResponse.json({ 
          success: true, 
          generated: posts.length,
          queue: queue.length,
          totalQueued: newQueue.length
        });
      }

      case 'variations': {
        // Generate hook variations for A/B testing
        if (!hook) {
          return NextResponse.json({ error: 'Missing hook' }, { status: 400 });
        }
        const variations = await generateHookVariations(hook, count || 5);
        return NextResponse.json({ success: true, variations });
      }

      case 'hooks': {
        // Get all proven hooks
        const hooks = getAllHooks();
        return NextResponse.json({ success: true, hooks });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action', validActions: ['single', 'batch', 'variations', 'hooks'] },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return current queue and themes
    const queue = await loadQueue();
    const pendingPosts = queue.filter(p => p.status === 'pending');
    
    return NextResponse.json({
      themes: Object.keys(CONTENT_THEMES),
      themeDetails: Object.entries(CONTENT_THEMES).map(([key, value]) => ({
        key,
        name: value.name,
        hookCount: value.hooks.length
      })),
      queueStats: {
        total: queue.length,
        pending: pendingPosts.length,
        posted: queue.filter(p => p.status === 'posted').length,
        failed: queue.filter(p => p.status === 'failed').length
      },
      nextPosts: pendingPosts.slice(0, 5)
    });
  } catch (error) {
    console.error('Error fetching queue:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
