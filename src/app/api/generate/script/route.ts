// API Route: Generate short script for reels
// POST /api/generate/script

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { topic, duration = '8-10' } = body;

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic is required' },
        { status: 400 }
      );
    }

    // Calculate word count based on duration
    // Average speaking rate: ~2.5 words/second
    let wordTarget: string;
    let durationDesc: string;

    switch (duration) {
      case '8-10':
        wordTarget = '20-25 words';
        durationDesc = '8-10 seconds';
        break;
      case '15-30':
        wordTarget = '40-75 words';
        durationDesc = '15-30 seconds';
        break;
      case '30-60':
        wordTarget = '75-150 words';
        durationDesc = '30-60 seconds';
        break;
      default:
        wordTarget = '20-25 words';
        durationDesc = '8-10 seconds';
    }

    const systemPrompt = `You are a content writer for Chase Wellness, a GLP-1 nutrition company run by Dan Chase, RD.
Write short, punchy scripts for Instagram Reels that are:
- Expert but approachable
- Anti-diet culture (no shame, guilt, or restriction language)
- Focused on practical tips
- Conversational, like talking to a friend

NEVER use: "cheat meals", "clean eating", "guilt-free", "willpower", em dashes, "delve", "journey", "crucial"
DO use: "protein-first", "sustainable beats perfect", "awareness beats obsession"`;

    const userPrompt = `Create a ${durationDesc} Instagram Reel script (${wordTarget} maximum) about: ${topic}

Requirements:
- Must be ${wordTarget} maximum - this is critical
- Start with a hook that stops the scroll
- One clear, actionable insight
- End with intrigue or a thought-provoker
- Conversational tone, not salesy
- No hashtags or emojis in the script itself

Return ONLY the script text, nothing else.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,
      max_tokens: 300,
    });

    const script = completion.choices[0]?.message?.content?.trim() || '';
    const wordCount = script.split(/\s+/).length;
    const estimatedDuration = Math.ceil(wordCount / 2.5);

    return NextResponse.json({
      success: true,
      script,
      wordCount,
      estimatedDuration,
      targetDuration: duration
    });
  } catch (error) {
    console.error('Script generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate script' },
      { status: 500 }
    );
  }
}
