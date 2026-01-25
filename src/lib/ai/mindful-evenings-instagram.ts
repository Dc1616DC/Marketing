// Mindful Evenings Instagram Content Engine
// Generates high-volume faceless slideshow content for Instagram

import OpenAI from 'openai';
import { VOICE_GUIDELINES, INTUITIVE_EATING_PRINCIPLES, HUMANIZATION_RULES } from './brand-voice';

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

// Brand colors for Mindful Evenings
export const BRAND_COLORS = {
  primary: '#6366f1', // Indigo
  secondary: '#8b5cf6', // Purple
  accent: '#ec4899', // Pink
  dark: '#1e1b4b', // Deep indigo
  light: '#f5f3ff', // Light purple
  text: '#ffffff',
  textDark: '#1f2937',
};

// Proven hooks that resonate (from testing + article insights)
export const PROVEN_HOOKS = [
  "It's 9pm and you're not hungry, but you're standing at the fridge anyway.",
  "The medication works during the day, but evenings are still hard.",
  "Cravings are data, not weakness.",
  "What if instead of fighting the craving, you got curious about it?",
  "The medication quiets physical hunger. It doesn't quiet the stress, boredom, or exhaustion.",
  "You're not failing. The medication just wasn't designed for this.",
  "Evening eating isn't about willpower. It never was.",
  "Your body isn't broken. Your coping mechanism is just asking for attention.",
  "The fridge won't fix what's actually wrong.",
  "Tired isn't hungry. But they feel the same at 9pm.",
  "Bored isn't hungry. But the pantry doesn't know that.",
  "Lonely isn't hungry. But food is always there.",
  "What are you actually hungry for right now?",
  "The craving will pass. So will the feeling behind it.",
  "Two minutes of awareness beats two hours of guilt.",
  "You don't need more willpower. You need more understanding.",
  "Evening cravings are messages, not mistakes.",
  "Pause before the pantry. Just pause.",
  "What would happen if you didn't eat right now?",
  "The urge to eat at night is often the urge to feel something else.",
];

// Content themes for carousel slides
export const CONTENT_THEMES = {
  halt: {
    name: "HALT Framework",
    hooks: [
      "Before you eat, ask yourself: HALT",
      "Are you Hungry? Angry? Lonely? Tired?",
      "HALT: The 4-question evening check-in",
      "Not sure if you're actually hungry? Try HALT.",
    ],
    slideTopics: [
      "H - Hungry: When did you last eat? Is this physical hunger?",
      "A - Angry/Anxious: What's bothering you right now?",
      "L - Lonely: Who could you reach out to?",
      "T - Tired: Would rest serve you better than food?",
      "The answer changes what you actually need.",
    ]
  },
  headVsStomach: {
    name: "Head Hunger vs Stomach Hunger",
    hooks: [
      "Head hunger vs stomach hunger: How to tell the difference",
      "Your brain wants chips. But is your stomach even talking?",
      "Two types of hunger. One needs food. One needs something else.",
    ],
    slideTopics: [
      "Stomach hunger: Builds gradually, any food sounds good",
      "Head hunger: Sudden, wants something specific",
      "Stomach hunger: Goes away when you eat enough",
      "Head hunger: Still there even after eating",
      "Head hunger isn't wrong. It's just asking for something different.",
    ]
  },
  eveningTriggers: {
    name: "Evening Trigger Awareness",
    hooks: [
      "Your evening eating triggers (and what they're really saying)",
      "The real reason you eat at night (it's not hunger)",
      "Evening eating decoded: What's really going on",
    ],
    slideTopics: [
      "Stress eating: Your nervous system wants to calm down",
      "Boredom eating: You need stimulation, not snacks",
      "Procrastination eating: Avoiding something uncomfortable",
      "Reward eating: You deserve pleasure (but does it have to be food?)",
      "Habit eating: Just because you always have doesn't mean you need to",
    ]
  },
  twoMinuteCheckin: {
    name: "2-Minute Check-in",
    hooks: [
      "The 2-minute check-in that changes everything",
      "Before you open the fridge: 2 minutes",
      "What if you paused for just 2 minutes?",
    ],
    slideTopics: [
      "Step 1: Notice the urge (don't fight it)",
      "Step 2: Ask what you're feeling",
      "Step 3: Ask what you actually need",
      "Step 4: Choose consciously",
      "Still want to eat? That's okay. Now it's a choice, not a reaction.",
    ]
  },
  reframes: {
    name: "Mindset Reframes",
    hooks: [
      "Stop calling them 'cravings'. Start calling them 'information'.",
      "You're not weak. You're human.",
      "The goal isn't to never want food. It's to understand why you do.",
    ],
    slideTopics: [
      "Old thought: I have no self-control",
      "New thought: My body is trying to tell me something",
      "Old thought: I shouldn't want to eat",
      "New thought: Wanting to eat is normal. Understanding why helps.",
      "Awareness over restriction. Always.",
    ]
  },
  alternatives: {
    name: "Non-Food Alternatives",
    hooks: [
      "10 things to try before eating at night",
      "What to do when you want to eat but aren't hungry",
      "The not-hungry-but-want-to-eat toolkit",
    ],
    slideTopics: [
      "If you're stressed: 5 deep breaths, text a friend, step outside",
      "If you're bored: Move your body, start a show, call someone",
      "If you're tired: Go to bed. Seriously. Just go to bed.",
      "If you're lonely: Reach out. Even a text counts.",
      "If you're actually hungry: Eat. No guilt. Honor that hunger.",
    ]
  },
  permission: {
    name: "Permission Statements",
    hooks: [
      "Permission slip: You're allowed to eat",
      "Restriction leads to obsession. Permission leads to peace.",
      "What if eating wasn't the enemy?",
    ],
    slideTopics: [
      "You're allowed to eat when you're hungry",
      "You're allowed to eat when you're not hungry",
      "You're allowed to eat for pleasure",
      "You're allowed to figure this out as you go",
      "Awareness, not restriction. That's the whole game.",
    ]
  }
};

// Generate carousel content for Instagram
export interface CarouselSlide {
  text: string;
  isHook: boolean;
  slideNumber: number;
}

export interface CarouselPost {
  theme: string;
  hook: string;
  slides: CarouselSlide[];
  caption: string;
  hashtags: string[];
  cta: string;
}

// System prompt for carousel generation
const CAROUSEL_SYSTEM_PROMPT = `You are creating Instagram carousel content for Mindful Evenings, an app that helps people with evening/emotional eating through awareness and self-compassion.

BRAND VOICE:
${VOICE_GUIDELINES}

INTUITIVE EATING FOUNDATION:
${INTUITIVE_EATING_PRINCIPLES}

CRITICAL - WRITE LIKE A HUMAN:
${HUMANIZATION_RULES}

CAROUSEL CONTENT RULES:
- Slide 1: Strong hook that stops the scroll (relatable problem or surprising reframe)
- Slides 2-5: Short, punchy text (max 15 words per slide)
- Each slide should be one clear thought
- Use "you" language throughout
- End with a soft CTA or reflection prompt
- NO diet culture language ever
- Cravings are information, not weakness
- Awareness over restriction always
- Reflective tone, not cheerleading

FORMATTING:
- Keep text SHORT (carousel slides need to be readable at a glance)
- One idea per slide
- Use line breaks for emphasis if needed
- Emoji sparingly (1-2 per carousel max, if any)
`;

// Generate a single carousel post
export async function generateCarouselPost(theme: keyof typeof CONTENT_THEMES): Promise<CarouselPost> {
  const themeData = CONTENT_THEMES[theme];
  
  const userPrompt = `Create an Instagram carousel (5-6 slides) about: "${themeData.name}"

Use these hooks as inspiration: ${themeData.hooks.join(' | ')}
Cover these concepts: ${themeData.slideTopics.join(' | ')}

Return JSON:
{
  "hook": "The attention-grabbing first slide text",
  "slides": [
    {"text": "Slide 2 text", "slideNumber": 2},
    {"text": "Slide 3 text", "slideNumber": 3},
    {"text": "Slide 4 text", "slideNumber": 4},
    {"text": "Slide 5 text", "slideNumber": 5}
  ],
  "caption": "Instagram caption (2-3 sentences, end with save/share prompt)",
  "hashtags": ["mindfulevening", "emotionaleating", "etc"],
  "cta": "Soft call-to-action for last slide"
}`;

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: CAROUSEL_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.8,
    max_tokens: 1500,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('No content returned from AI');

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in response');

  const parsed = JSON.parse(jsonMatch[0]);
  
  return {
    theme: themeData.name,
    hook: parsed.hook,
    slides: [
      { text: parsed.hook, isHook: true, slideNumber: 1 },
      ...parsed.slides.map((s: { text: string; slideNumber: number }) => ({
        text: s.text,
        isHook: false,
        slideNumber: s.slideNumber
      })),
      { text: parsed.cta, isHook: false, slideNumber: parsed.slides.length + 2 }
    ],
    caption: parsed.caption,
    hashtags: parsed.hashtags,
    cta: parsed.cta
  };
}

// Generate batch of carousel posts (for weekly content)
export async function generateWeeklyCarousels(postsPerDay: number = 3): Promise<CarouselPost[]> {
  const themes = Object.keys(CONTENT_THEMES) as (keyof typeof CONTENT_THEMES)[];
  const totalPosts = postsPerDay * 7; // 21 posts for a week at 3/day
  const posts: CarouselPost[] = [];
  
  // Rotate through themes
  for (let i = 0; i < totalPosts; i++) {
    const theme = themes[i % themes.length];
    try {
      const post = await generateCarouselPost(theme);
      posts.push(post);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error generating post for theme ${theme}:`, error);
    }
  }
  
  return posts;
}

// Generate single post variations (for A/B testing hooks)
export async function generateHookVariations(originalHook: string, count: number = 5): Promise<string[]> {
  const userPrompt = `Generate ${count} variations of this Instagram hook for Mindful Evenings:

Original: "${originalHook}"

Rules:
- Keep the same core message
- Each should be scroll-stopping
- Max 15 words each
- Vary the approach (question, statement, reframe, relatable moment)
- No diet culture language

Return JSON array: ["variation 1", "variation 2", ...]`;

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: CAROUSEL_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.9,
    max_tokens: 500,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return [originalHook];

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    return [originalHook];
  }
  
  return [originalHook];
}

// Simple content queue for scheduling
export interface QueuedPost {
  id: string;
  post: CarouselPost;
  scheduledFor: Date;
  status: 'pending' | 'posted' | 'failed';
  createdAt: Date;
}

export function createPostQueue(posts: CarouselPost[], postsPerDay: number = 3): QueuedPost[] {
  const queue: QueuedPost[] = [];
  const now = new Date();
  
  // Optimal posting times for Instagram (EST)
  const postingTimes = ['09:00', '13:00', '19:00', '21:00', '17:00'];
  
  posts.forEach((post, index) => {
    const dayOffset = Math.floor(index / postsPerDay);
    const timeIndex = index % postsPerDay;
    
    const scheduledDate = new Date(now);
    scheduledDate.setDate(scheduledDate.getDate() + dayOffset);
    
    const [hours, minutes] = postingTimes[timeIndex % postingTimes.length].split(':');
    scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    queue.push({
      id: `post-${Date.now()}-${index}`,
      post,
      scheduledFor: scheduledDate,
      status: 'pending',
      createdAt: now
    });
  });
  
  return queue;
}

// Export all hooks for quick access
export function getAllHooks(): string[] {
  const themeHooks = Object.values(CONTENT_THEMES).flatMap(t => t.hooks);
  return [...PROVEN_HOOKS, ...themeHooks];
}
