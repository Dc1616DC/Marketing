// API Route: Discover Twitter/X opportunities
// GET /api/discover/twitter

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import {
  findTwitterOpportunities,
  searchTopic,
  isTwitterConfigured,
  GLP1_SEARCH_QUERIES
} from '@/lib/social-listening/twitter';

export async function GET(request: NextRequest) {
  try {
    // Check if Twitter is configured
    if (!isTwitterConfigured()) {
      return NextResponse.json({
        configured: false,
        message: 'Twitter API not configured. Add TWITTER_BEARER_TOKEN to your environment variables.',
        tweets: [],
        total: 0
      });
    }

    const searchParams = request.nextUrl.searchParams;
    const topic = searchParams.get('topic');
    const limit = parseInt(searchParams.get('limit') || '20');

    let tweets;

    if (topic) {
      // Search for specific topic
      tweets = await searchTopic(topic);
    } else {
      // Find general opportunities
      tweets = await findTwitterOpportunities(GLP1_SEARCH_QUERIES.slice(0, 3), Math.ceil(limit / 3));
    }

    // Filter to most relevant
    const filtered = tweets
      .filter(t => t.relevanceScore > 10 || t.isQuestion)
      .slice(0, limit);

    return NextResponse.json({
      configured: true,
      tweets: filtered,
      total: filtered.length,
      searchQueries: GLP1_SEARCH_QUERIES,
      fetchedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Twitter discover error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Twitter opportunities' },
      { status: 500 }
    );
  }
}
