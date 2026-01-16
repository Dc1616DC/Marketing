// API Route: Get trending topics in GLP-1 space
// GET /api/discover/trends

import { NextResponse } from 'next/server';
import { getTrendReport } from '@/lib/social-listening/trends';

export async function GET() {
  try {
    const report = await getTrendReport();

    return NextResponse.json({
      topics: report.topics,
      totalPostsAnalyzed: report.totalPostsAnalyzed,
      platforms: report.platforms,
      fetchedAt: report.fetchedAt.toISOString()
    });
  } catch (error) {
    console.error('Trends API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending topics' },
      { status: 500 }
    );
  }
}
