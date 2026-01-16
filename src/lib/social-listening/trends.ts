// Trend Discovery for Chase Wellness Marketing
// Identifies trending topics and hashtags in the GLP-1 space

import { findRedditOpportunities, RedditPost } from './reddit';
import { findTwitterOpportunities, Tweet, isTwitterConfigured } from './twitter';

export interface TrendingTopic {
  topic: string;
  category: 'nutrition' | 'side-effects' | 'medications' | 'lifestyle' | 'questions' | 'other';
  mentionCount: number;
  sources: ('reddit' | 'twitter')[];
  samplePosts: Array<{
    platform: 'reddit' | 'twitter';
    title?: string;
    text: string;
    url: string;
  }>;
  suggestedContent: string;
}

export interface TrendReport {
  topics: TrendingTopic[];
  totalPostsAnalyzed: number;
  fetchedAt: Date;
  platforms: ('reddit' | 'twitter')[];
}

// Topic categories and their keywords
const TOPIC_CATEGORIES: Record<string, { keywords: string[]; category: TrendingTopic['category'] }> = {
  'Protein & Muscle': {
    keywords: ['protein', 'muscle', 'muscle loss', 'strength', 'workout', 'exercise', 'gym'],
    category: 'nutrition'
  },
  'Nausea Management': {
    keywords: ['nausea', 'sick', 'vomit', 'stomach', 'can\'t eat', 'queasy'],
    category: 'side-effects'
  },
  'Constipation': {
    keywords: ['constipation', 'fiber', 'bathroom', 'bloating', 'digestive'],
    category: 'side-effects'
  },
  'Fatigue & Energy': {
    keywords: ['fatigue', 'tired', 'energy', 'exhausted', 'weak'],
    category: 'side-effects'
  },
  'Food & Meals': {
    keywords: ['meal', 'food', 'eating', 'recipe', 'snack', 'breakfast', 'dinner', 'lunch'],
    category: 'nutrition'
  },
  'Dosing & Timing': {
    keywords: ['dose', 'dosage', 'increase', 'injection', 'timing', 'schedule'],
    category: 'medications'
  },
  'Weight Stall': {
    keywords: ['plateau', 'stall', 'not losing', 'stuck', 'weight loss stopped'],
    category: 'lifestyle'
  },
  'Appetite Changes': {
    keywords: ['appetite', 'hungry', 'not hungry', 'food noise', 'cravings'],
    category: 'lifestyle'
  },
  'Starting Out': {
    keywords: ['just started', 'new to', 'first week', 'beginning', 'newbie', 'starting'],
    category: 'questions'
  }
};

/**
 * Categorize a piece of text into a topic category
 */
function categorizeText(text: string): { topic: string; category: TrendingTopic['category'] } | null {
  const lowerText = text.toLowerCase();

  for (const [topic, config] of Object.entries(TOPIC_CATEGORIES)) {
    const matchCount = config.keywords.filter(kw => lowerText.includes(kw)).length;
    if (matchCount >= 1) {
      return { topic, category: config.category };
    }
  }

  return null;
}

/**
 * Analyze posts to find trending topics
 */
function analyzeTrends(
  redditPosts: RedditPost[],
  tweets: Tweet[]
): TrendingTopic[] {
  const topicMap = new Map<string, {
    category: TrendingTopic['category'];
    count: number;
    sources: Set<'reddit' | 'twitter'>;
    samples: TrendingTopic['samplePosts'];
  }>();

  // Analyze Reddit posts
  for (const post of redditPosts) {
    const text = `${post.title} ${post.selftext}`;
    const result = categorizeText(text);

    if (result) {
      const existing = topicMap.get(result.topic);
      if (existing) {
        existing.count++;
        existing.sources.add('reddit');
        if (existing.samples.length < 3) {
          existing.samples.push({
            platform: 'reddit',
            title: post.title,
            text: post.selftext.slice(0, 200),
            url: post.url
          });
        }
      } else {
        topicMap.set(result.topic, {
          category: result.category,
          count: 1,
          sources: new Set<'reddit' | 'twitter'>(['reddit']),
          samples: [{
            platform: 'reddit',
            title: post.title,
            text: post.selftext.slice(0, 200),
            url: post.url
          }]
        });
      }
    }
  }

  // Analyze tweets
  for (const tweet of tweets) {
    const result = categorizeText(tweet.text);

    if (result) {
      const existing = topicMap.get(result.topic);
      if (existing) {
        existing.count++;
        existing.sources.add('twitter');
        if (existing.samples.length < 3) {
          existing.samples.push({
            platform: 'twitter',
            text: tweet.text.slice(0, 200),
            url: tweet.url
          });
        }
      } else {
        topicMap.set(result.topic, {
          category: result.category,
          count: 1,
          sources: new Set<'reddit' | 'twitter'>(['twitter']),
          samples: [{
            platform: 'twitter',
            text: tweet.text.slice(0, 200),
            url: tweet.url
          }]
        });
      }
    }
  }

  // Convert to array and add content suggestions
  const topics: TrendingTopic[] = [];

  for (const [topic, data] of topicMap) {
    topics.push({
      topic,
      category: data.category,
      mentionCount: data.count,
      sources: Array.from(data.sources),
      samplePosts: data.samples,
      suggestedContent: generateContentSuggestion(topic, data.category)
    });
  }

  // Sort by mention count
  return topics.sort((a, b) => b.mentionCount - a.mentionCount);
}

/**
 * Generate content suggestion for a trending topic
 */
function generateContentSuggestion(topic: string, category: TrendingTopic['category']): string {
  const suggestions: Record<string, Record<TrendingTopic['category'], string>> = {
    'Protein & Muscle': {
      'nutrition': 'Create content about optimal protein intake on GLP-1s (1.2-1.6g/kg) and muscle preservation strategies',
      'side-effects': '',
      'medications': '',
      'lifestyle': '',
      'questions': '',
      'other': ''
    },
    'Nausea Management': {
      'side-effects': 'Share practical nausea management tips: small meals, bland foods, ginger, timing meals away from injection',
      'nutrition': '',
      'medications': '',
      'lifestyle': '',
      'questions': '',
      'other': ''
    },
    'Constipation': {
      'side-effects': 'Address constipation with fiber tips, hydration advice, and when to consider supplements',
      'nutrition': '',
      'medications': '',
      'lifestyle': '',
      'questions': '',
      'other': ''
    },
    'Fatigue & Energy': {
      'side-effects': 'Discuss fatigue causes (often inadequate nutrition) and solutions: eating enough, protein timing, hydration',
      'nutrition': '',
      'medications': '',
      'lifestyle': '',
      'questions': '',
      'other': ''
    },
    'Food & Meals': {
      'nutrition': 'Share practical meal ideas that work with reduced appetite: protein-rich, easy-to-eat options',
      'side-effects': '',
      'medications': '',
      'lifestyle': '',
      'questions': '',
      'other': ''
    },
    'Dosing & Timing': {
      'medications': 'Address common dosing questions with reminder to discuss specifics with healthcare provider',
      'nutrition': '',
      'side-effects': '',
      'lifestyle': '',
      'questions': '',
      'other': ''
    },
    'Weight Stall': {
      'lifestyle': 'Normalize plateaus and suggest focusing on nutrition quality, protein, and non-scale victories',
      'nutrition': '',
      'side-effects': '',
      'medications': '',
      'questions': '',
      'other': ''
    },
    'Appetite Changes': {
      'lifestyle': 'Help people navigate reduced appetite: importance of still eating, protein-first strategies',
      'nutrition': '',
      'side-effects': '',
      'medications': '',
      'questions': '',
      'other': ''
    },
    'Starting Out': {
      'questions': 'Create beginner-friendly content: what to expect, how to prepare, first week tips',
      'nutrition': '',
      'side-effects': '',
      'medications': '',
      'lifestyle': '',
      'other': ''
    }
  };

  return suggestions[topic]?.[category] ||
    `Create helpful content about ${topic.toLowerCase()} for the GLP-1 community`;
}

/**
 * Get a full trend report from Reddit and Twitter
 */
export async function getTrendReport(): Promise<TrendReport> {
  const platforms: ('reddit' | 'twitter')[] = ['reddit'];

  // Always fetch Reddit (no auth required)
  const redditPosts = await findRedditOpportunities(
    ['Ozempic', 'Mounjaro', 'Zepbound'],
    20
  );

  // Fetch Twitter if configured
  let tweets: Tweet[] = [];
  if (isTwitterConfigured()) {
    platforms.push('twitter');
    tweets = await findTwitterOpportunities(undefined, 15);
  }

  const topics = analyzeTrends(redditPosts, tweets);

  return {
    topics,
    totalPostsAnalyzed: redditPosts.length + tweets.length,
    fetchedAt: new Date(),
    platforms
  };
}

/**
 * Quick check for what's hot right now
 */
export async function getHotTopics(limit: number = 5): Promise<TrendingTopic[]> {
  const report = await getTrendReport();
  return report.topics.slice(0, limit);
}
