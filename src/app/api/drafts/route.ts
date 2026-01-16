// API Route: List and create drafts
// GET /api/drafts - List drafts with filters
// POST /api/drafts - Create a new draft manually

import { NextRequest, NextResponse } from 'next/server';
import { getDrafts, createDraft } from '@/lib/db';
import { Platform, DraftStatus } from '@/lib/db/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const filters = {
      platform: searchParams.get('platform') as Platform | undefined,
      status: searchParams.get('status') as DraftStatus | undefined,
      topic: searchParams.get('topic') || undefined
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof typeof filters] === undefined) {
        delete filters[key as keyof typeof filters];
      }
    });

    const drafts = await getDrafts(Object.keys(filters).length > 0 ? filters : undefined);

    return NextResponse.json({ drafts });
  } catch (error) {
    console.error('List drafts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, topic, title, body: draftBody, meta, scheduledAt } = body;

    if (!platform || !topic || !draftBody) {
      return NextResponse.json(
        { error: 'Platform, topic, and body are required' },
        { status: 400 }
      );
    }

    const draft = await createDraft({
      platform,
      topic,
      title,
      body: draftBody,
      meta,
      scheduledAt
    });

    return NextResponse.json({ draft });
  } catch (error) {
    console.error('Create draft error:', error);
    return NextResponse.json(
      { error: 'Failed to create draft' },
      { status: 500 }
    );
  }
}
