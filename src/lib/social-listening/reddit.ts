// Reddit Social Listener for Chase Wellness Marketing
// Monitors GLP-1 subreddits for questions and opportunities to provide helpful answers

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  url: string;
  permalink: string;
  score: number;
  numComments: number;
  created: Date;
  flair?: string;
  isQuestion: boolean;
  relevanceScore: number;
  keywords: string[];
}

export interface RedditSearchResult {
  posts: RedditPost[];
  subreddit: string;
  query?: string;
  fetchedAt: Date;
}

// GLP-1 related subreddits to monitor
// Note: r/tirzepatide doesn't exist - use r/Mounjaro and r/Zepbound for tirzepatide content
export const GLP1_SUBREDDITS = [
  'Ozempic',
  'Mounjaro',
  'Zepbound',
  'Semaglutide',
  'GLP1_Medicines',
  'loseit',
  'WeightLossAdvice'
];

// Keywords that indicate good opportunities to provide value
const OPPORTUNITY_KEYWORDS = [
  // Nutrition questions
  'protein', 'eating', 'food', 'meal', 'diet', 'nutrition', 'calories',
  'hungry', 'appetite', 'not eating enough', 'what to eat',
  // Side effects
  'nausea', 'constipation', 'fatigue', 'tired', 'sick', 'side effect',
  'stomach', 'bloating', 'reflux', 'heartburn',
  // Muscle concerns
  'muscle', 'muscle loss', 'losing muscle', 'strength', 'weak',
  // General help
  'help', 'advice', 'tips', 'suggestions', 'recommend', 'should I',
  'how do', 'what do', 'anyone else', 'struggling',
  // Specific nutrition topics
  'fiber', 'hydration', 'water', 'snack', 'breakfast', 'dinner',
  'protein shake', 'supplement'
];

// Question indicators
const QUESTION_INDICATORS = [
  '?', 'help', 'advice', 'tips', 'anyone', 'should i', 'how do',
  'what do', 'can i', 'is it', 'does anyone', 'has anyone',
  'struggling', 'confused', 'not sure'
];

/**
 * Calculate relevance score for a post based on keywords and engagement
 */
function calculateRelevance(post: { title: string; selftext: string; score: number; numComments: number }): { score: number; keywords: string[] } {
  const text = `${post.title} ${post.selftext}`.toLowerCase();
  const foundKeywords: string[] = [];
  let score = 0;

  // Check for opportunity keywords
  for (const keyword of OPPORTUNITY_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
      score += 10;
    }
  }

  // Boost for questions
  for (const indicator of QUESTION_INDICATORS) {
    if (text.includes(indicator.toLowerCase())) {
      score += 5;
      break;
    }
  }

  // Engagement bonus (but not too high - we want fresh posts too)
  if (post.score > 0 && post.score < 50) score += 5;
  if (post.numComments < 10) score += 10; // Less comments = more opportunity to help

  return { score, keywords: Array.from(new Set(foundKeywords)) };
}

/**
 * Check if a post is likely a question seeking help
 */
function isQuestion(title: string, selftext: string): boolean {
  const text = `${title} ${selftext}`.toLowerCase();
  return QUESTION_INDICATORS.some(indicator => text.includes(indicator.toLowerCase()));
}

// Reddit API response types
interface RedditApiChild {
  kind: string;
  data: {
    id: string;
    title: string;
    selftext?: string;
    author: string;
    subreddit: string;
    permalink: string;
    score: number;
    num_comments: number;
    created_utc: number;
    link_flair_text?: string;
  };
}

interface RedditApiResponse {
  data?: {
    children?: RedditApiChild[];
  };
}

/**
 * Parse Reddit API response into our format
 */
function parseRedditResponse(data: RedditApiResponse, subreddit: string): RedditPost[] {
  if (!data?.data?.children) return [];

  return data.data.children
    .filter((child: RedditApiChild) => child.kind === 't3') // t3 = post
    .map((child: RedditApiChild) => {
      const post = child.data;
      const { score: relevanceScore, keywords } = calculateRelevance({
        title: post.title || '',
        selftext: post.selftext || '',
        score: post.score || 0,
        numComments: post.num_comments || 0
      });

      return {
        id: post.id,
        title: post.title,
        selftext: post.selftext || '',
        author: post.author,
        subreddit: post.subreddit || subreddit,
        url: `https://reddit.com${post.permalink}`,
        permalink: post.permalink,
        score: post.score || 0,
        numComments: post.num_comments || 0,
        created: new Date(post.created_utc * 1000),
        flair: post.link_flair_text,
        isQuestion: isQuestion(post.title, post.selftext || ''),
        relevanceScore,
        keywords
      } as RedditPost;
    });
}

/**
 * Fetch recent posts from a subreddit
 */
export async function fetchSubredditPosts(
  subreddit: string,
  sort: 'new' | 'hot' | 'rising' = 'new',
  limit: number = 25
): Promise<RedditSearchResult> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ChaseWellness:MarketingTool:v1.0 (by /u/ChaseWellnessRD)'
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const data = await response.json();
    const posts = parseRedditResponse(data, subreddit);

    return {
      posts,
      subreddit,
      fetchedAt: new Date()
    };
  } catch (error) {
    console.error(`Error fetching r/${subreddit}:`, error);
    return {
      posts: [],
      subreddit,
      fetchedAt: new Date()
    };
  }
}

/**
 * Search a subreddit for specific keywords
 */
export async function searchSubreddit(
  subreddit: string,
  query: string,
  limit: number = 25
): Promise<RedditSearchResult> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&sort=new&limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ChaseWellness:MarketingTool:v1.0 (by /u/ChaseWellnessRD)'
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const data = await response.json();
    const posts = parseRedditResponse(data, subreddit);

    return {
      posts,
      subreddit,
      query,
      fetchedAt: new Date()
    };
  } catch (error) {
    console.error(`Error searching r/${subreddit}:`, error);
    return {
      posts: [],
      subreddit,
      query,
      fetchedAt: new Date()
    };
  }
}

/**
 * Find opportunities across all GLP-1 subreddits
 * Returns posts sorted by date (newest first) with relevance as secondary sort
 */
export async function findRedditOpportunities(
  subreddits: string[] = GLP1_SUBREDDITS.slice(0, 5), // Limit to avoid rate limiting
  postsPerSubreddit: number = 15,
  sortBy: 'date' | 'relevance' = 'date'
): Promise<RedditPost[]> {
  const allPosts: RedditPost[] = [];

  // Fetch from each subreddit with a small delay to be respectful
  for (const subreddit of subreddits) {
    const result = await fetchSubredditPosts(subreddit, 'new', postsPerSubreddit);
    allPosts.push(...result.posts);

    // Small delay between requests to be nice to Reddit
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Filter to relevant posts
  const filtered = allPosts.filter(post => post.relevanceScore > 0);

  // Sort based on preference
  if (sortBy === 'date') {
    // Sort by date (newest first), with relevance as tiebreaker
    return filtered.sort((a, b) => {
      const dateDiff = b.created.getTime() - a.created.getTime();
      if (Math.abs(dateDiff) < 3600000) { // Within 1 hour, use relevance
        return b.relevanceScore - a.relevanceScore;
      }
      return dateDiff;
    });
  } else {
    // Sort by relevance score (highest first)
    return filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}

/**
 * Find posts about specific nutrition topics
 */
export async function findNutritionQuestions(
  topic: 'protein' | 'nausea' | 'constipation' | 'muscle' | 'general'
): Promise<RedditPost[]> {
  const topicQueries: Record<string, string> = {
    protein: 'protein OR "not eating enough" OR "how much protein"',
    nausea: 'nausea OR "feeling sick" OR "can\'t eat"',
    constipation: 'constipation OR fiber OR "bathroom issues"',
    muscle: 'muscle loss OR "losing muscle" OR strength',
    general: 'nutrition OR food OR eating OR meal'
  };

  const query = topicQueries[topic];
  const allPosts: RedditPost[] = [];

  // Search top 3 most active subreddits
  for (const subreddit of ['Ozempic', 'Mounjaro', 'Zepbound']) {
    const result = await searchSubreddit(subreddit, query, 10);
    allPosts.push(...result.posts);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return allPosts
    .filter(post => post.isQuestion)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
