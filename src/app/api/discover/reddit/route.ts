// API Route: Discover Reddit opportunities
// GET /api/discover/reddit

import { NextRequest, NextResponse } from 'next/server';
import {
  findRedditOpportunities,
  findNutritionQuestions,
  fetchSubredditPosts,
  GLP1_SUBREDDITS
} from '@/lib/social-listening/reddit';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('mode') || 'opportunities'; // opportunities | topic | subreddit
    const topic = searchParams.get('topic'); // protein | nausea | constipation | muscle | general
    const subreddit = searchParams.get('subreddit');
    const limit = parseInt(searchParams.get('limit') || '20');

    let posts;

    if (mode === 'topic' && topic) {
      // Search for specific topic
      type ValidTopic = 'protein' | 'nausea' | 'constipation' | 'muscle' | 'general';
      const validTopics: ValidTopic[] = ['protein', 'nausea', 'constipation', 'muscle', 'general'];
      if (!validTopics.includes(topic as ValidTopic)) {
        return NextResponse.json(
          { error: `Invalid topic. Valid options: ${validTopics.join(', ')}` },
          { status: 400 }
        );
      }
      posts = await findNutritionQuestions(topic as ValidTopic);
    } else if (mode === 'subreddit' && subreddit) {
      // Fetch specific subreddit
      const result = await fetchSubredditPosts(subreddit, 'new', limit);
      posts = result.posts;
    } else {
      // Default: find opportunities across all subreddits
      posts = await findRedditOpportunities(GLP1_SUBREDDITS.slice(0, 5), Math.ceil(limit / 5));
    }

    // Filter to most relevant
    const filtered = posts
      .filter(p => p.relevanceScore > 10 || p.isQuestion)
      .slice(0, limit);

    return NextResponse.json({
      posts: filtered,
      total: filtered.length,
      subreddits: GLP1_SUBREDDITS,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Reddit discover error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Reddit opportunities' },
      { status: 500 }
    );
  }
}
