// AI Content Generator for Chase Wellness Marketing Automation
// Uses OpenAI to generate brand-consistent content across platforms

import OpenAI from 'openai';
import { buildSystemPrompt, GENERATION_PROMPTS } from './brand-voice';
import { Platform, DraftMeta } from '../db/types';

// Lazy-load OpenAI client to avoid build-time initialization errors
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export interface GeneratedDraft {
  platform: Platform;
  topic: string;
  body: string;
  meta: DraftMeta;
}

export interface GenerationResult {
  success: boolean;
  drafts: GeneratedDraft[];
  error?: string;
}

// Parse the JSON response from OpenAI
function parseGeneratorResponse(content: string, platform: Platform, topic: string): GeneratedDraft[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.drafts || !Array.isArray(parsed.drafts)) {
      throw new Error('Invalid response format: missing drafts array');
    }

    return parsed.drafts.map((draft: {
      body: string;
      hashtags?: string[];
      subreddit?: string;
      hookIdea?: string;
    }) => ({
      platform,
      topic,
      body: draft.body,
      meta: {
        hashtags: draft.hashtags || [],
        hookIdeas: draft.hookIdea ? [draft.hookIdea] : [],
        redditSubreddit: draft.subreddit,
      } as DraftMeta
    }));
  } catch (error) {
    console.error('Failed to parse generator response:', error);
    console.error('Raw content:', content);
    return [];
  }
}

// Generate content from a topic string
export async function generateFromTopic(
  topic: string,
  platforms: Platform[] = ['twitter', 'instagram', 'reddit']
): Promise<GenerationResult> {
  const allDrafts: GeneratedDraft[] = [];
  const errors: string[] = [];

  for (const platform of platforms) {
    try {
      const systemPrompt = buildSystemPrompt(platform);
      const userPrompt = GENERATION_PROMPTS.fromTopic(topic, platform);

      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        const drafts = parseGeneratorResponse(content, platform, topic);
        allDrafts.push(...drafts);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${platform}: ${message}`);
      console.error(`Error generating ${platform} content:`, error);
    }
  }

  return {
    success: errors.length === 0,
    drafts: allDrafts,
    error: errors.length > 0 ? errors.join('; ') : undefined
  };
}

// Generate content by repurposing existing content (blog post, article, etc.)
export async function generateFromContent(
  sourceContent: string,
  topic: string,
  platforms: Platform[] = ['twitter', 'instagram', 'reddit']
): Promise<GenerationResult> {
  const allDrafts: GeneratedDraft[] = [];
  const errors: string[] = [];

  for (const platform of platforms) {
    try {
      const systemPrompt = buildSystemPrompt(platform);
      const userPrompt = GENERATION_PROMPTS.fromContent(sourceContent, platform);

      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7, // Slightly lower temp for repurposing
        max_tokens: 2000,
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        const drafts = parseGeneratorResponse(content, platform, topic);
        allDrafts.push(...drafts);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${platform}: ${message}`);
      console.error(`Error repurposing content for ${platform}:`, error);
    }
  }

  return {
    success: errors.length === 0,
    drafts: allDrafts,
    error: errors.length > 0 ? errors.join('; ') : undefined
  };
}

// Generate a Reddit reply for a specific question
export async function generateRedditReply(
  question: string,
  subreddit: string
): Promise<GenerationResult> {
  try {
    const systemPrompt = buildSystemPrompt('reddit');
    const userPrompt = GENERATION_PROMPTS.redditReply(question, subreddit);

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      const drafts = parseGeneratorResponse(content, 'reddit', `Reply: ${question.substring(0, 50)}...`);
      return {
        success: true,
        drafts
      };
    }

    return {
      success: false,
      drafts: [],
      error: 'No content returned from AI'
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      drafts: [],
      error: message
    };
  }
}

// Helper: Get topic suggestions based on content pillar
export function getTopicSuggestions(): Array<{ pillar: string; suggestions: string[] }> {
  return [
    {
      pillar: "GLP-1 Nutrition Basics",
      suggestions: [
        "Why protein is crucial on GLP-1s",
        "How much protein do you really need on Ozempic/Mounjaro",
        "Hydration tips for GLP-1 users",
        "Building a balanced plate when appetite is low",
        "Why eating enough still matters on GLP-1s"
      ]
    },
    {
      pillar: "Side Effect Management",
      suggestions: [
        "5 ways to manage nausea on GLP-1 medications",
        "Constipation on Ozempic: What actually helps",
        "Why you might feel tired on GLP-1s (and what to do)",
        "Managing reflux while on weight loss medications",
        "What to expect when increasing your dose"
      ]
    },
    {
      pillar: "Practical Meal Ideas",
      suggestions: [
        "High-protein snacks when you're not hungry",
        "Quick 20g protein meals for busy days",
        "Meal prep ideas for low appetite weeks",
        "Gentle foods when GLP-1 nausea hits",
        "Protein-rich breakfasts that actually sound good"
      ]
    },
    {
      pillar: "Behavior & Mindset",
      suggestions: [
        "Dealing with food noise reduction (and what replaces it)",
        "Evening cravings on GLP-1s: The HALT approach",
        "Building sustainable habits for when you stop meds",
        "Why 'perfect' eating isn't the goal",
        "Curiosity over criticism: A better approach to nutrition"
      ]
    },
    {
      pillar: "Product Features",
      suggestions: [
        "Why protein-first tracking beats calorie counting",
        "The value of tracking symptoms on GLP-1s",
        "How tracking helps you understand YOUR patterns",
        "Using check-ins to catch evening eating triggers"
      ]
    }
  ];
}
