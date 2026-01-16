// API Route: Generate content drafts
// POST /api/generate

import { NextRequest, NextResponse } from 'next/server';
import { generateFromTopic, generateFromContent, generateRedditReply } from '@/lib/ai/generator';
import { createDraftBatch } from '@/lib/db';
import { Platform } from '@/lib/db/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      topic,
      sourceContent,
      platforms = ['twitter', 'instagram', 'reddit'],
      mode = 'topic', // 'topic' | 'content' | 'reddit-reply'
      redditQuestion,
      redditSubreddit
    } = body;

    // Validate required fields
    if (mode === 'topic' && !topic) {
      return NextResponse.json(
        { error: 'Topic is required for topic-based generation' },
        { status: 400 }
      );
    }

    if (mode === 'content' && (!sourceContent || !topic)) {
      return NextResponse.json(
        { error: 'Source content and topic are required for content repurposing' },
        { status: 400 }
      );
    }

    if (mode === 'reddit-reply' && (!redditQuestion || !redditSubreddit)) {
      return NextResponse.json(
        { error: 'Reddit question and subreddit are required for Reddit reply generation' },
        { status: 400 }
      );
    }

    // Generate content based on mode
    let result;
    if (mode === 'reddit-reply') {
      result = await generateRedditReply(redditQuestion, redditSubreddit);
    } else if (mode === 'content') {
      result = await generateFromContent(sourceContent, topic, platforms as Platform[]);
    } else {
      result = await generateFromTopic(topic, platforms as Platform[]);
    }

    if (!result.success && result.drafts.length === 0) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate content' },
        { status: 500 }
      );
    }

    // Save drafts to database
    const savedDrafts = await createDraftBatch(
      result.drafts.map(d => ({
        platform: d.platform,
        topic: d.topic,
        body: d.body,
        meta: d.meta
      }))
    );

    return NextResponse.json({
      success: true,
      drafts: savedDrafts,
      warning: result.error // Include any partial errors
    });

  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
