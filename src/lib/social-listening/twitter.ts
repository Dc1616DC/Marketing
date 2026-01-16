// Twitter/X Social Listener for Chase Wellness Marketing
// Searches for GLP-1 conversations and trending topics

export interface Tweet {
  id: string;
  text: string;
  authorId: string;
  authorUsername?: string;
  authorName?: string;
  url: string;
  createdAt: Date;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    impressions?: number;
  };
  isQuestion: boolean;
  relevanceScore: number;
  keywords: string[];
}

export interface TwitterSearchResult {
  tweets: Tweet[];
  query: string;
  fetchedAt: Date;
  nextToken?: string;
}

// Search queries for finding GLP-1 conversations
export const GLP1_SEARCH_QUERIES = [
  // Medication mentions with questions
  '(ozempic OR wegovy OR mounjaro OR zepbound) (help OR advice OR tips OR question)',
  // Nutrition on GLP-1s
  '(ozempic OR mounjaro) (protein OR eating OR food OR meal)',
  // Side effects
  '(ozempic OR mounjaro OR wegovy) (nausea OR constipation OR tired)',
  // Muscle concerns
  '(glp1 OR ozempic OR mounjaro) (muscle OR strength)',
  // General struggles
  '(ozempic OR mounjaro) (struggling OR confused OR not sure)'
];

// Keywords for relevance scoring
const OPPORTUNITY_KEYWORDS = [
  'protein', 'eating', 'food', 'meal', 'nutrition', 'calories',
  'nausea', 'constipation', 'fatigue', 'side effect',
  'muscle', 'muscle loss', 'strength',
  'help', 'advice', 'tips', 'anyone', 'question',
  'struggling', 'confused'
];

const QUESTION_INDICATORS = ['?', 'help', 'advice', 'anyone', 'how do', 'should i'];

/**
 * Calculate relevance score for a tweet
 */
function calculateRelevance(text: string, metrics: Tweet['metrics']): { score: number; keywords: string[] } {
  const lowerText = text.toLowerCase();
  const foundKeywords: string[] = [];
  let score = 0;

  for (const keyword of OPPORTUNITY_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      foundKeywords.push(keyword);
      score += 10;
    }
  }

  // Question bonus
  if (QUESTION_INDICATORS.some(q => lowerText.includes(q))) {
    score += 15;
  }

  // Engagement sweet spot (engaged but not viral = good opportunity)
  if (metrics.replies < 5) score += 10;
  if (metrics.likes > 0 && metrics.likes < 50) score += 5;

  return { score, keywords: Array.from(new Set(foundKeywords)) };
}

function isQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  return QUESTION_INDICATORS.some(q => lower.includes(q));
}

// Twitter API response types
interface TwitterApiTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    impression_count?: number;
  };
}

interface TwitterApiUser {
  id: string;
  username: string;
  name: string;
}

interface TwitterApiResponse {
  data?: TwitterApiTweet[];
  includes?: {
    users?: TwitterApiUser[];
  };
  meta?: {
    next_token?: string;
  };
}

/**
 * Search Twitter for relevant conversations
 * Requires TWITTER_BEARER_TOKEN environment variable
 */
export async function searchTwitter(
  query: string,
  maxResults: number = 20
): Promise<TwitterSearchResult> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (!bearerToken) {
    console.warn('TWITTER_BEARER_TOKEN not set - Twitter search disabled');
    return {
      tweets: [],
      query,
      fetchedAt: new Date()
    };
  }

  try {
    // Twitter API v2 recent search endpoint
    const params = new URLSearchParams({
      query: `${query} -is:retweet lang:en`,
      'tweet.fields': 'created_at,public_metrics,author_id',
      'user.fields': 'username,name',
      expansions: 'author_id',
      max_results: Math.min(maxResults, 100).toString()
    });

    const response = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?${params}`,
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`
        }
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Twitter API error:', response.status, error);
      return {
        tweets: [],
        query,
        fetchedAt: new Date()
      };
    }

    const data: TwitterApiResponse = await response.json();

    // Build user lookup map
    const users = new Map<string, { username: string; name: string }>();
    if (data.includes?.users) {
      for (const user of data.includes.users) {
        users.set(user.id, { username: user.username, name: user.name });
      }
    }

    // Parse tweets
    const tweets: Tweet[] = (data.data || []).map((tweet: TwitterApiTweet) => {
      const metrics = {
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
        impressions: tweet.public_metrics?.impression_count
      };

      const { score, keywords } = calculateRelevance(tweet.text, metrics);
      const user = users.get(tweet.author_id);

      return {
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id,
        authorUsername: user?.username,
        authorName: user?.name,
        url: `https://twitter.com/${user?.username || 'i'}/status/${tweet.id}`,
        createdAt: new Date(tweet.created_at),
        metrics,
        isQuestion: isQuestion(tweet.text),
        relevanceScore: score,
        keywords
      };
    });

    return {
      tweets: tweets.sort((a, b) => b.relevanceScore - a.relevanceScore),
      query,
      fetchedAt: new Date(),
      nextToken: data.meta?.next_token
    };
  } catch (error) {
    console.error('Twitter search error:', error);
    return {
      tweets: [],
      query,
      fetchedAt: new Date()
    };
  }
}

/**
 * Find Twitter opportunities across multiple search queries
 */
export async function findTwitterOpportunities(
  queries: string[] = GLP1_SEARCH_QUERIES.slice(0, 3),
  maxPerQuery: number = 15
): Promise<Tweet[]> {
  const allTweets: Tweet[] = [];
  const seenIds = new Set<string>();

  for (const query of queries) {
    const result = await searchTwitter(query, maxPerQuery);

    // Deduplicate
    for (const tweet of result.tweets) {
      if (!seenIds.has(tweet.id)) {
        seenIds.add(tweet.id);
        allTweets.push(tweet);
      }
    }

    // Rate limit respect
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return allTweets
    .filter(t => t.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * Search for tweets about a specific topic
 */
export async function searchTopic(topic: string): Promise<Tweet[]> {
  const query = `(ozempic OR mounjaro OR wegovy OR zepbound OR glp1) ${topic}`;
  const result = await searchTwitter(query, 25);
  return result.tweets.filter(t => t.isQuestion);
}

/**
 * Check if Twitter API is configured
 */
export function isTwitterConfigured(): boolean {
  return !!process.env.TWITTER_BEARER_TOKEN;
}
