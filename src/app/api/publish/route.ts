// API Route: Publish approved drafts to platforms
// POST /api/publish

import { NextRequest, NextResponse } from 'next/server';
import { getDraftById, createPost } from '@/lib/db';
import { publishToTwitter } from '@/lib/publishers/twitter';
import { publishToInstagram } from '@/lib/publishers/instagram';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { draftId, imageUrl } = body;

    if (!draftId) {
      return NextResponse.json(
        { error: 'Draft ID is required' },
        { status: 400 }
      );
    }

    // Get the draft
    const draft = await getDraftById(draftId);
    if (!draft) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      );
    }

    // Check if draft is approved
    if (draft.status !== 'approved') {
      return NextResponse.json(
        { error: 'Only approved drafts can be published. Current status: ' + draft.status },
        { status: 400 }
      );
    }

    // Reddit drafts cannot be auto-published
    if (draft.platform === 'reddit') {
      return NextResponse.json(
        { error: 'Reddit posts cannot be auto-published. Please copy the text and post manually.' },
        { status: 400 }
      );
    }

    let publishResult;

    // Publish based on platform
    if (draft.platform === 'twitter') {
      publishResult = await publishToTwitter(draft.body);
    } else if (draft.platform === 'instagram') {
      // Instagram requires an image
      const img = imageUrl || draft.meta?.imageUrl;
      if (!img) {
        return NextResponse.json(
          { error: 'Image URL is required for Instagram posts' },
          { status: 400 }
        );
      }
      publishResult = await publishToInstagram(draft.body, img);
    } else {
      return NextResponse.json(
        { error: 'Unknown platform: ' + draft.platform },
        { status: 400 }
      );
    }

    if (!publishResult.success) {
      return NextResponse.json(
        { error: publishResult.error || 'Failed to publish' },
        { status: 500 }
      );
    }

    // Create post record
    const post = await createPost({
      draftId: draft.id,
      platform: draft.platform,
      externalId: publishResult.externalId,
      url: publishResult.url
    });

    // Update draft status is handled by createPost

    return NextResponse.json({
      success: true,
      post,
      url: publishResult.url
    });

  } catch (error) {
    console.error('Publish API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
