# Chase Wellness Marketing Automation System

A **human-approval marketing automation system** for Chase Wellness / GLP-1 Sidekick. Generate brand-consistent content for Twitter/X, Instagram, and Reddit—with you in control of what gets published.

## Features

- **Brand-Aware AI Content Generator**: Generates content in Dan Chase's expert RD voice with clinical accuracy
- **Multi-Platform Support**: Twitter/X, Instagram, and Reddit (manual posting)
- **Human Approval Workflow**: Review, edit, approve, and publish—nothing goes live without your OK
- **Content Repurposing**: Turn blog posts into social media content
- **Reddit Reply Helper**: Generate helpful, non-promotional replies for GLP-1 communities

## Mode A: Human-Approval

This system operates in **Mode A**, meaning:
- AI generates drafts
- You review and edit
- You approve before publishing
- Only approved content can be published
- Reddit is always manual (copy/paste) to respect community guidelines

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your API keys:

- **OpenAI API Key**: For content generation ([Get one here](https://platform.openai.com/api-keys))
- **Twitter/X API**: For publishing tweets ([Developer Portal](https://developer.twitter.com/))
- **Instagram API**: For publishing posts ([Facebook Developers](https://developers.facebook.com/))

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page, or go directly to [http://localhost:3000/dashboard/marketing](http://localhost:3000/dashboard/marketing) for the dashboard.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── drafts/          # CRUD operations for drafts
│   │   ├── generate/        # AI content generation
│   │   ├── publish/         # Publish to platforms
│   │   └── stats/           # Dashboard statistics
│   ├── dashboard/
│   │   └── marketing/       # Main dashboard page
│   └── page.tsx             # Landing page
├── components/
│   └── marketing/           # Dashboard UI components
├── lib/
│   ├── ai/
│   │   ├── brand-voice.ts   # Brand guidelines & prompts
│   │   └── generator.ts     # Content generation logic
│   ├── db/
│   │   ├── index.ts         # Database operations
│   │   └── types.ts         # TypeScript types
│   └── publishers/
│       ├── twitter.ts       # Twitter/X API integration
│       └── instagram.ts     # Instagram Graph API integration
└── data/
    └── db.json              # JSON file database (auto-created)
```

## How It Works

### Content Generation

1. Enter a topic (e.g., "Managing nausea on GLP-1 medications")
2. Select target platforms (Twitter, Instagram, Reddit)
3. Click "Generate Drafts"
4. AI creates platform-optimized content in Dan's brand voice

### Approval Workflow

1. **Pending**: New drafts start here
2. **Approved**: Ready to publish (Twitter/X, Instagram) or copy (Reddit)
3. **Published**: Successfully posted to the platform
4. **Rejected**: Drafts you don't want to use

### Publishing

- **Twitter/X**: Click "Publish Now" on approved drafts
- **Instagram**: Click "Publish Now" (requires image URL)
- **Reddit**: Copy text and post manually to respect community rules

## API Credentials Setup

### OpenAI

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to `.env.local` as `OPENAI_API_KEY`

### Twitter/X

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a project and app
3. Under "User authentication settings":
   - Enable OAuth 1.0a
   - Set App permissions to "Read and Write"
4. Generate API Key & Secret
5. Generate Access Token & Secret
6. Add all four values to `.env.local`

### Instagram

Instagram requires a Business/Creator account connected to a Facebook Page:

1. Convert your Instagram to a Business/Creator account
2. Connect it to a Facebook Page
3. Go to [Facebook Developers](https://developers.facebook.com/)
4. Create an app and add Instagram Graph API
5. Generate a User Access Token with permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
6. Exchange for a long-lived token (valid 60 days)
7. Get your Instagram Business Account ID via the API
8. Add both to `.env.local`

## Content Pillars

The AI is trained on these content themes:

1. **GLP-1 Nutrition Basics**: Protein, fiber, hydration, meal structure
2. **Side Effect Management**: Nausea, constipation, fatigue, reflux
3. **Practical Meal Ideas**: High-protein snacks, nausea-friendly meals
4. **Behavior & Mindset**: Food noise, evening cravings, HALT framework
5. **Product Features**: GLP-1 Sidekick, Mindful Evenings

## Brand Voice Guidelines

The AI generates content following Dan's voice:

**DO:**
- "Protein-first (not calorie counting)"
- "Protect muscle, lose fat"
- "Sustainable beats perfect"
- "Curiosity over criticism"

**DON'T:**
- "Diet" / "dieting"
- "Cheat meals"
- "Clean eating"
- Anything punitive or guilt-inducing

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4o
- **Database**: JSON file (easy to migrate to Prisma/Postgres later)
- **Icons**: Lucide React

## Future Enhancements

- [ ] Scheduled publishing (cron jobs)
- [ ] Analytics integration
- [ ] Image upload for Instagram
- [ ] Thread support for Twitter
- [ ] Carousel support for Instagram
- [ ] Content calendar view

## License

Private - Chase Wellness, LLC
