// ============================================================================
// AIWMC Quantis — Canonical 90-Day Social Media Content Plan
// ----------------------------------------------------------------------------
// Single source of truth. Refreshed: May 2026. Window: May 1 → Oct 15, 2026.
// Anchor: 6-month rolling content. Generated from QUANTIS_SOCIAL_MEDIA_MASTERPLAN.xlsx.
//
// Consumed by:
//   - src/components/autoposter/ContentPlanView.tsx (instant render, no DB hit)
//   - src/hooks/useAutoposter.ts → useSeedContentPlan (one-click DB seed/refresh)
//   - supabase/functions/publish-due-posts (cron publisher; reads DB, not this file)
//
// Editing rules:
//   - This file is human-curated. Re-run scripts/refresh-content-plan.ts to roll
//     the window forward another quarter (keeps Apr–baseline patterns intact).
//   - After editing, hit "Seed plan" in the Autoposter dashboard to upsert into DB
//     (matches on week_number + day_number — safe to re-run).
// ============================================================================

export type ContentPlatform = 'linkedin' | 'facebook' | 'instagram' | 'threads' | 'reddit' | 'twitter';

export interface ContentPlanEntry {
  week_number: number;
  day_number: number;
  post_date: string; // YYYY-MM-DD
  platforms: ContentPlatform[];
  post_type: string;
  hook: string;
  content_brief: string;
  visual_type: string | null;
  cta: string | null;
  hashtags: string[];
  best_time_mt: string | null;
  expected_reach: string | null;
}

export interface PlatformTiming {
  platform: ContentPlatform;
  best_days: string;
  best_time_mt: string;
  worst_time: string;
  frequency: string;
  format: string;
  max_hashtags: string;
}

export const PLATFORM_TIMING_BIBLE: PlatformTiming[] = [
  { platform: 'linkedin', best_days: 'Tue, Wed, Thu', best_time_mt: '7:30–9:00 AM', worst_time: 'Fri after 2 PM', frequency: '3–5x/week', format: 'Text + 1 image / screenshot', max_hashtags: '5–10' },
  { platform: 'facebook', best_days: 'Wed, Thu, Sat', best_time_mt: '12:00–2:00 PM', worst_time: 'Sunday AM', frequency: '1–2x/day', format: 'Long-form text OR video', max_hashtags: '5–10' },
  { platform: 'instagram', best_days: 'Mon, Wed, Sat', best_time_mt: '9:00–11:00 AM', worst_time: 'Monday AM', frequency: '1x/day', format: 'Carousel (7–10 slides) or Reel', max_hashtags: '20–30' },
  { platform: 'threads', best_days: 'Mon–Fri', best_time_mt: '9:00–10:00 AM', worst_time: 'Late evenings', frequency: '2–4x/week', format: 'Short punchy threads', max_hashtags: '1–3' },
  { platform: 'reddit', best_days: 'Tue, Wed', best_time_mt: '9:00–11:00 AM', worst_time: 'Weekends', frequency: '1–2x/week', format: '80% value, 20% mention', max_hashtags: 'none' },
  { platform: 'twitter', best_days: 'Mon–Thu', best_time_mt: '8:00–9:30 AM', worst_time: 'Sundays', frequency: '3–5x/week', format: 'Thread format (4–6 tweets)', max_hashtags: '0–2' },
];

export const CONTENT_PLAN_VERSION = '2026.05.01';
export const CONTENT_PLAN_WINDOW = { start: '2026-05-01', end: '2026-10-15' };

export const QUANTIS_CONTENT_PLAN: ContentPlanEntry[] = [
  {
    "week_number": 1,
    "day_number": 1,
    "post_date": "2026-05-01",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Founder Story",
    "hook": "I'm 22. Broke. Building a $25,000 tool for $17.",
    "content_brief": "Honest founder intro post. No vanity metrics. Day 1 of building in public. The gap between what financial consultants charge ($1,500–$25,000) and what founders actually have. Introduce Quantis as the bridge.",
    "visual_type": "Selfie / desk photo",
    "cta": "Free trial link in bio",
    "hashtags": [
      "#founder",
      "#buildinginpublic",
      "#SaaS",
      "#startup",
      "#AItools"
    ],
    "best_time_mt": "8:00 AM",
    "expected_reach": "500–2,000"
  },
  {
    "week_number": 1,
    "day_number": 2,
    "post_date": "2026-05-02",
    "platforms": [
      "facebook",
      "instagram"
    ],
    "post_type": "Fear Hook",
    "hook": "90% of businesses fail. Most of them had a plan.",
    "content_brief": "Scroll-stopping stat post. Expand on why having a plan isn't the same as having validation. Pose the question: 'When was the last time someone stress-tested your numbers?' Lead to Quantis as the answer.",
    "visual_type": "Dark background + white stat text",
    "cta": "Link in bio → /app",
    "hashtags": [
      "#businessvalidation",
      "#startup",
      "#entrepreneur",
      "#smallbusiness"
    ],
    "best_time_mt": "12:00 PM",
    "expected_reach": "800–3,000"
  },
  {
    "week_number": 1,
    "day_number": 3,
    "post_date": "2026-05-03",
    "platforms": [
      "reddit"
    ],
    "post_type": "Value-Add Comment",
    "hook": "r/startups: 'Anyone know how to validate a business idea without spending money?'",
    "content_brief": "Find this thread (or similar) and add GENUINE value. Explain 3 real methods for free validation. Mention Quantis naturally at the end only if relevant. Link only if rules allow.",
    "visual_type": "Text only",
    "cta": "Reply CTA",
    "hashtags": [
      "#startups",
      "#validation"
    ],
    "best_time_mt": "Anytime",
    "expected_reach": "50–500 upvotes"
  },
  {
    "week_number": 1,
    "day_number": 4,
    "post_date": "2026-05-04",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Data/Proof",
    "hook": "I ran a financial analysis on a Denver coffee shop. Here's what the AI found.",
    "content_brief": "Share the actual numbers from the example analysis: $28,500 monthly revenue, 62% gross margin, break-even month 8, $85K–120K startup investment. Make the data the content. End with: 'Run your own in 90 seconds.'",
    "visual_type": "Screenshot of analysis results",
    "cta": "aiwmcquantis.com/examples/coffee-shop-denver",
    "hashtags": [
      "#finance",
      "#startup",
      "#coffeeshop",
      "#businessplan",
      "#Denver"
    ],
    "best_time_mt": "7:30 AM",
    "expected_reach": "1,000–4,000"
  },
  {
    "week_number": 1,
    "day_number": 5,
    "post_date": "2026-05-05",
    "platforms": [
      "facebook"
    ],
    "post_type": "Contrarian",
    "hook": "Stop writing a business plan. Do THIS instead.",
    "content_brief": "Contrarian hook. Business plans are documentation. Validation is proof. Explain the difference: plans describe what you want to happen; validation tells you what WILL happen. Quantis = validation in 90 seconds.",
    "visual_type": "Bold text overlay on photo",
    "cta": "Comments: 'Agree or disagree?'",
    "hashtags": [
      "#businessplan",
      "#entrepreneur",
      "#startup",
      "#smallbusiness"
    ],
    "best_time_mt": "1:00 PM",
    "expected_reach": "600–2,500"
  },
  {
    "week_number": 1,
    "day_number": 6,
    "post_date": "2026-05-06",
    "platforms": [
      "instagram"
    ],
    "post_type": "Build in Public",
    "hook": "Day 90 of building Quantis. Here are my real numbers.",
    "content_brief": "Carousel post. Slide 1: The hook. Slide 2: Traffic stats (526 visitors). Slide 3: The problem I found. Slide 4: What I'm fixing this week. Slide 5: CTA. Raw, honest, real. This performs massively.",
    "visual_type": "Carousel — 5 slides data",
    "cta": "Follow for daily updates",
    "hashtags": [
      "#buildinpublic",
      "#solofounder",
      "#SaaS",
      "#indiemaker"
    ],
    "best_time_mt": "9:00 AM",
    "expected_reach": "400–1,500"
  },
  {
    "week_number": 1,
    "day_number": 7,
    "post_date": "2026-05-07",
    "platforms": [
      "threads"
    ],
    "post_type": "Engagement Hook",
    "hook": "Hot take: most AI business tools give you garbage output. Here's the difference.",
    "content_brief": "Short punchy thread. What makes Quantis different: real data sources (SBA, IBISWorld), city-specific calibration, 1,000 Monte Carlo runs. Compare to ChatGPT giving vague answers with no data.",
    "visual_type": "Text thread",
    "cta": "Reply asking 'Have you tried it?'",
    "hashtags": [
      "#AI",
      "#startup",
      "#tech",
      "#SaaS"
    ],
    "best_time_mt": "11:00 AM",
    "expected_reach": "200–800"
  },
  {
    "week_number": 2,
    "day_number": 8,
    "post_date": "2026-05-15",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Case Study",
    "hook": "A food truck owner was about to spend $60K. Here's what Quantis found first.",
    "content_brief": "Story post. Open with the hook (someone's real decision at stake). Walk through exactly what the analysis showed (Austin food truck: $22K revenue, break-even month 5, key risks). The validation changed her launch plan.",
    "visual_type": "Results screenshot",
    "cta": "Visit /examples/food-truck-austin",
    "hashtags": [
      "#entrepreneur",
      "#foodtruck",
      "#startup",
      "#businessvalidation"
    ],
    "best_time_mt": "8:00 AM",
    "expected_reach": "2,000–8,000"
  },
  {
    "week_number": 2,
    "day_number": 9,
    "post_date": "2026-05-16",
    "platforms": [
      "facebook",
      "instagram"
    ],
    "post_type": "Fear",
    "hook": "The #1 reason 90% of businesses fail (it's not what you think)",
    "content_brief": "Hook post. Most people think businesses fail from bad ideas. The real reason: no pre-launch financial validation. Walk through 3 businesses that failed from solvable problems. End: 'Quantis would have caught all 3 in 90 seconds.'",
    "visual_type": "Infographic: 3 failure reasons",
    "cta": "Click to validate your idea",
    "hashtags": [
      "#businessfailure",
      "#startup",
      "#entrepreneur"
    ],
    "best_time_mt": "2:00 PM",
    "expected_reach": "1,000–5,000"
  },
  {
    "week_number": 2,
    "day_number": 10,
    "post_date": "2026-05-17",
    "platforms": [
      "reddit"
    ],
    "post_type": "Original Post",
    "hook": "r/entrepreneur: I built a free alternative to a $25,000 financial analysis. Feedback?",
    "content_brief": "Post to r/entrepreneur as the founder. Share what you built, why, and what it actually does. Be honest about limitations. Ask for brutal feedback. Reddit rewards authenticity. Expect 50–200 upvotes if done right.",
    "visual_type": "Text + link to Quantis",
    "cta": "Engage every comment",
    "hashtags": [],
    "best_time_mt": "Morning",
    "expected_reach": "100–1,000 upvotes"
  },
  {
    "week_number": 2,
    "day_number": 11,
    "post_date": "2026-05-18",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Contrarian",
    "hook": "Your business plan is lying to you.",
    "content_brief": "Financial plans built on hope look real until they meet reality. Explain the difference between a business plan (what you hope) and a financial stress test (what will actually happen). Monte Carlo simulation explained simply.",
    "visual_type": "Simple graphic: plan vs reality",
    "cta": "Read the methodology → link",
    "hashtags": [
      "#financialmodeling",
      "#startup",
      "#SaaS"
    ],
    "best_time_mt": "7:30 AM",
    "expected_reach": "1,500–5,000"
  },
  {
    "week_number": 2,
    "day_number": 12,
    "post_date": "2026-05-19",
    "platforms": [
      "instagram"
    ],
    "post_type": "Tutorial",
    "hook": "How to validate a business idea in 90 seconds (step by step)",
    "content_brief": "Reel / carousel. Show the actual product flow. Type 'Coffee shop in Denver' → loading animation → results appear. Focus on the output quality: revenue projections, risk flags, break-even. Keep under 60 seconds.",
    "visual_type": "Screen recording / Reel",
    "cta": "Link in bio → try free",
    "hashtags": [
      "#tutorial",
      "#AItools",
      "#startup",
      "#businessidea"
    ],
    "best_time_mt": "10:00 AM",
    "expected_reach": "600–2,000"
  },
  {
    "week_number": 2,
    "day_number": 13,
    "post_date": "2026-05-20",
    "platforms": [
      "facebook"
    ],
    "post_type": "Social Proof",
    "hook": "I launched with 0 users 90 days ago. Here's what I learned.",
    "content_brief": "Build in public post. Share the honest metrics: visitors, analyses run, what works, what doesn't. No fake success. Real lessons. The vulnerability is the product — people connect and share it.",
    "visual_type": "Photo of workspace/screen",
    "cta": "Comments: 'What would you fix?'",
    "hashtags": [
      "#buildinpublic",
      "#solofounder",
      "#startup"
    ],
    "best_time_mt": "12:00 PM",
    "expected_reach": "500–2,000"
  },
  {
    "week_number": 2,
    "day_number": 14,
    "post_date": "2026-05-21",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Viral Hook",
    "hook": "I asked AI to validate 50 business ideas in 50 cities. Here's the most surprising result.",
    "content_brief": "Thread/carousel. Go through 5–6 genuinely surprising insights from the example analyses: the Zurich accounting firm at CHF 14,200/mo is the most profitable; the bookstore in Lisbon breaks even fastest. Make data interesting.",
    "visual_type": "Data visual / chart",
    "cta": "Explore all 50 examples → link",
    "hashtags": [
      "#AI",
      "#business",
      "#data",
      "#startup"
    ],
    "best_time_mt": "9:00 AM",
    "expected_reach": "2,000–10,000"
  },
  {
    "week_number": 3,
    "day_number": 15,
    "post_date": "2026-05-29",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Direct Offer",
    "hook": "Validate your business idea for free. No signup. No credit card. 90 seconds.",
    "content_brief": "Clean, direct value post. No story. No hook drama. Just the offer. Three bullet points: what Quantis does, what you get, how fast. For LinkedIn's algorithm, direct value posts perform well mid-funnel.",
    "visual_type": "Clean product screenshot",
    "cta": "aiwmcquantis.com",
    "hashtags": [
      "#freetools",
      "#startup",
      "#business",
      "#validation"
    ],
    "best_time_mt": "8:00 AM",
    "expected_reach": "800–3,000"
  },
  {
    "week_number": 3,
    "day_number": 16,
    "post_date": "2026-05-30",
    "platforms": [
      "facebook",
      "instagram"
    ],
    "post_type": "Story",
    "hook": "I almost gave up on Quantis at day 60.",
    "content_brief": "Honest vulnerability post. What was broken at day 60 (no revenue, high bounce). What I found in session recordings (users were dropping before seeing results). What I fixed. What changed. Raw, real, human.",
    "visual_type": "Selfie / candid photo",
    "cta": "Support: comment 'keep going'",
    "hashtags": [
      "#solofounder",
      "#startup",
      "#buildinpublic"
    ],
    "best_time_mt": "1:00 PM",
    "expected_reach": "1,500–6,000"
  },
  {
    "week_number": 3,
    "day_number": 17,
    "post_date": "2026-05-31",
    "platforms": [
      "reddit"
    ],
    "post_type": "Value Thread",
    "hook": "r/smallbusiness: Before you spend $50K on your idea, read this",
    "content_brief": "Long-form value post. Step-by-step guide to financial validation before launching. Tools (free). Framework (real). Mention Quantis as one option among several. High value = high upvotes = organic traffic.",
    "visual_type": "Text only — detailed",
    "cta": "Visit Quantis if you want automation",
    "hashtags": [],
    "best_time_mt": "Morning",
    "expected_reach": "200–2,000 upvotes"
  },
  {
    "week_number": 3,
    "day_number": 18,
    "post_date": "2026-06-01",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Authority",
    "hook": "I analyzed 50 businesses across 50 cities with AI. Here are the 5 universal truths.",
    "content_brief": "Data-led authority post. Pull insights across the example analyses: average break-even is month 7, consulting has highest margins, food businesses have highest risk. Position Quantis as a research platform, not just a tool.",
    "visual_type": "Infographic / data visual",
    "cta": "Download the full analysis → link",
    "hashtags": [
      "#businessdata",
      "#startup",
      "#entrepreneur",
      "#research"
    ],
    "best_time_mt": "7:30 AM",
    "expected_reach": "3,000–10,000"
  },
  {
    "week_number": 3,
    "day_number": 19,
    "post_date": "2026-06-02",
    "platforms": [
      "instagram"
    ],
    "post_type": "Relatable",
    "hook": "The difference between a business plan and a business validation.",
    "content_brief": "Simple carousel explaining the concept visually. Slide 1: Plan = what you want. Slide 2: Validation = what will actually happen. Slide 3: The tools you need. Slide 4: Quantis does it in 90 seconds. Slide 5: Try free.",
    "visual_type": "Carousel — clean design",
    "cta": "Link in bio",
    "hashtags": [
      "#businessplan",
      "#entrepreneur",
      "#startup",
      "#AI"
    ],
    "best_time_mt": "10:00 AM",
    "expected_reach": "400–1,500"
  },
  {
    "week_number": 3,
    "day_number": 20,
    "post_date": "2026-06-03",
    "platforms": [
      "facebook",
      "threads"
    ],
    "post_type": "Engagement",
    "hook": "What's the biggest financial mistake you almost made before launching?",
    "content_brief": "Pure engagement post. Ask the question. Let people comment. Respond to every single comment. This builds community and signals the algorithm. When the thread has 20+ comments, drop the Quantis link naturally.",
    "visual_type": "Text only",
    "cta": "Comments drive algorithm reach",
    "hashtags": [
      "#startup",
      "#entrepreneur",
      "#business"
    ],
    "best_time_mt": "11:00 AM",
    "expected_reach": "300–1,000 comments"
  },
  {
    "week_number": 3,
    "day_number": 21,
    "post_date": "2026-06-04",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Weekly Wrap",
    "hook": "This week I fixed 3 things that were costing me conversions. Here's exactly what.",
    "content_brief": "Build in public weekly update. Specific fixes made (meta tags, CTAs on example pages, pricing page). Real metrics: before vs after. Shows progress, builds trust, attracts co-founders and potential partners.",
    "visual_type": "Screen comparison before/after",
    "cta": "Follow for weekly updates",
    "hashtags": [
      "#buildinpublic",
      "#SaaS",
      "#startup"
    ],
    "best_time_mt": "9:00 AM",
    "expected_reach": "1,000–4,000"
  },
  {
    "week_number": 4,
    "day_number": 22,
    "post_date": "2026-06-12",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Milestone",
    "hook": "Quantis just crossed 1,000 analyses. Here's the most validated business idea.",
    "content_brief": "Milestone post using real data from your Supabase database. What business type gets validated most? What city? What's the average profit projection? Real data makes real content that gets real shares.",
    "visual_type": "Data screenshot / graphic",
    "cta": "What would you validate? → link",
    "hashtags": [
      "#milestone",
      "#startup",
      "#AI",
      "#business"
    ],
    "best_time_mt": "8:00 AM",
    "expected_reach": "2,000–8,000"
  },
  {
    "week_number": 4,
    "day_number": 23,
    "post_date": "2026-06-13",
    "platforms": [
      "facebook"
    ],
    "post_type": "Direct",
    "hook": "For $17/month you get what used to cost $25,000. This is not normal.",
    "content_brief": "Value anchor post. Compare: financial consultant cost ($1,500–$25,000), time (weeks), output (40-page PDF). Quantis: $17/month, 90 seconds, same benchmarks (SBA, IBISWorld, Census). Unambiguous value statement.",
    "visual_type": "Split comparison graphic",
    "cta": "Upgrade to Plus → link",
    "hashtags": [
      "#pricing",
      "#value",
      "#startup",
      "#AI"
    ],
    "best_time_mt": "12:00 PM",
    "expected_reach": "800–3,500"
  },
  {
    "week_number": 4,
    "day_number": 24,
    "post_date": "2026-06-14",
    "platforms": [
      "instagram"
    ],
    "post_type": "Story",
    "hook": "A DM I got last week that made me keep building.",
    "content_brief": "Share an actual user interaction (with permission) or a relatable fictional composite. Someone who was about to make a bad investment. They ran Quantis. Changed their decision. This format is extremely high-converting.",
    "visual_type": "Screenshot style DM card",
    "cta": "This could be you → link in bio",
    "hashtags": [
      "#testimonial",
      "#startup",
      "#impact"
    ],
    "best_time_mt": "9:00 AM",
    "expected_reach": "600–2,500"
  },
  {
    "week_number": 4,
    "day_number": 25,
    "post_date": "2026-06-15",
    "platforms": [
      "reddit"
    ],
    "post_type": "AMA Thread",
    "hook": "r/entrepreneur: I'm a 22-year-old solo founder who built an AI financial validation tool. AMA.",
    "content_brief": "Ask Me Anything thread. Post as yourself. Be completely honest. Answer every question. This format drives massive organic traffic to your profile → bio link → Quantis. Reddit AMAs go viral when authentic.",
    "visual_type": "Text only",
    "cta": "Profile bio with Quantis link",
    "hashtags": [],
    "best_time_mt": "Morning",
    "expected_reach": "500–5,000 upvotes"
  },
  {
    "week_number": 4,
    "day_number": 26,
    "post_date": "2026-06-16",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Educational",
    "hook": "LTV:CAC ratio explained in 60 seconds (the metric that kills most startups)",
    "content_brief": "Educational post on a key financial metric. Keep it simple. Use a real example. Show how Quantis calculates it automatically. Position yourself as a financial education resource, not just a tool vendor.",
    "visual_type": "Simple formula graphic",
    "cta": "Learn more → /methodology",
    "hashtags": [
      "#finance",
      "#startup",
      "#uniteconomics",
      "#SaaS"
    ],
    "best_time_mt": "7:30 AM",
    "expected_reach": "2,000–7,000"
  },
  {
    "week_number": 4,
    "day_number": 27,
    "post_date": "2026-06-17",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Viral Data",
    "hook": "I asked Quantis to analyze the riskiest business to start in 2026. The answer surprised me.",
    "content_brief": "High-engagement data post. Use your risk gallery data. Reveal which business type has highest failure rate by city. Contrarian or surprising answer. Format as 'the answer is...' reveal. Highly shareable.",
    "visual_type": "Risk data visual",
    "cta": "Analyze your own idea → link",
    "hashtags": [
      "#risk",
      "#business",
      "#startup",
      "#AI",
      "#data"
    ],
    "best_time_mt": "10:00 AM",
    "expected_reach": "3,000–15,000"
  },
  {
    "week_number": 4,
    "day_number": 28,
    "post_date": "2026-06-18",
    "platforms": [
      "facebook",
      "instagram"
    ],
    "post_type": "Community",
    "hook": "Share this with someone who's about to start a business without validating it.",
    "content_brief": "Share/tag mechanic post. Short, punchy. The message: the single most expensive mistake in business is launching without validating. Tag someone. This post is designed to be shared. Keep it short.",
    "visual_type": "Simple bold-text graphic",
    "cta": "Tag 2 people who need this",
    "hashtags": [
      "#startup",
      "#business",
      "#entrepreneur"
    ],
    "best_time_mt": "1:00 PM",
    "expected_reach": "1,000–8,000"
  },
  {
    "week_number": 5,
    "day_number": 29,
    "post_date": "2026-06-26",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Industry Analysis",
    "hook": "The most profitable businesses in America by city (AI-analyzed data)",
    "content_brief": "Data journalism post pulling from your 50 example pages. Which cities have highest average profit margins? Consulting in Zurich vs consulting in Denver. Data storytelling at scale.",
    "visual_type": "Map / chart visual",
    "cta": "See all 50 examples → link",
    "hashtags": [
      "#business",
      "#data",
      "#startup",
      "#cities"
    ],
    "best_time_mt": "8:00 AM",
    "expected_reach": "3,000–12,000"
  },
  {
    "week_number": 5,
    "day_number": 32,
    "post_date": "2026-06-29",
    "platforms": [
      "facebook"
    ],
    "post_type": "Fear + Solution",
    "hook": "The spreadsheet you built for your business idea is probably wrong. Here's why.",
    "content_brief": "Challenge the dominant tool (spreadsheets). Point out 3 common errors founders make in Excel projections: survivor bias in revenue comps, city-blindness in cost estimates, single-scenario thinking. Quantis fixes all 3.",
    "visual_type": "Spreadsheet error graphic",
    "cta": "Run AI validation instead → link",
    "hashtags": [
      "#spreadsheets",
      "#business",
      "#finance",
      "#startup"
    ],
    "best_time_mt": "12:00 PM",
    "expected_reach": "800–4,000"
  },
  {
    "week_number": 5,
    "day_number": 35,
    "post_date": "2026-07-02",
    "platforms": [
      "linkedin"
    ],
    "post_type": "ProductHunt Teaser",
    "hook": "Something big is coming to ProductHunt next month. Follow to be first.",
    "content_brief": "Tease the ProductHunt launch. Build anticipation. Collect supporters in advance. Post across all platforms simultaneously. The cross-platform blast builds social proof before launch day.",
    "visual_type": "ProductHunt logo + teaser",
    "cta": "Follow our PH page → link",
    "hashtags": [
      "#ProductHunt",
      "#launch",
      "#startup",
      "#AI"
    ],
    "best_time_mt": "9:00 AM",
    "expected_reach": "2,000–8,000"
  },
  {
    "week_number": 6,
    "day_number": 36,
    "post_date": "2026-07-10",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Deep Dive",
    "hook": "Monte Carlo simulation: the tool VCs use that founders have never heard of",
    "content_brief": "Educational post demystifying Monte Carlo. Explain P10/P50/P90. Show how it changes a projection. Position Quantis as the only free tool that does this automatically. Tag 3 VC accounts in the post.",
    "visual_type": "Simulation result screenshot",
    "cta": "Try Monte Carlo on your idea → link",
    "hashtags": [
      "#VentureCapital",
      "#startup",
      "#finance",
      "#AI"
    ],
    "best_time_mt": "7:30 AM",
    "expected_reach": "5,000–20,000"
  },
  {
    "week_number": 6,
    "day_number": 40,
    "post_date": "2026-07-14",
    "platforms": [
      "facebook",
      "instagram"
    ],
    "post_type": "Before/After",
    "hook": "Before Quantis: 1 spreadsheet. After Quantis: 3 scenarios, 1,000 simulations, 95,500 benchmarks.",
    "content_brief": "Simple before/after comparison. Make the contrast visceral. The spreadsheet is one person's guess. Quantis is 95,500 data points. One decision with wrong numbers costs more than a year of Plus.",
    "visual_type": "Split screen before/after",
    "cta": "Switch to real data → link",
    "hashtags": [
      "#AI",
      "#business",
      "#tools",
      "#startup"
    ],
    "best_time_mt": "1:00 PM",
    "expected_reach": "1,500–6,000"
  },
  {
    "week_number": 7,
    "day_number": 43,
    "post_date": "2026-07-24",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Milestone",
    "hook": "Quantis has now helped founders avoid [X] in potential bad investments.",
    "content_brief": "Calculate total startup investment avoided via risk flags raised. If 500 analyses run, and average startup investment is $60K, and 20% had high-risk flags = $6M in potential savings. This is a milestone story.",
    "visual_type": "Impact number graphic",
    "cta": "Protect your investment → link",
    "hashtags": [
      "#impact",
      "#startup",
      "#AI",
      "#businessvalidation"
    ],
    "best_time_mt": "8:00 AM",
    "expected_reach": "4,000–15,000"
  },
  {
    "week_number": 7,
    "day_number": 47,
    "post_date": "2026-07-28",
    "platforms": [
      "reddit"
    ],
    "post_type": "Success Story",
    "hook": "r/entrepreneur: Update — 120 days of building my AI validation tool. Real numbers.",
    "content_brief": "Follow-up post to the original Reddit post. Show the journey: metrics before vs after, what you fixed, what's next. Reddit loves follow-up transparency. Link to your IndieHackers post for cross-traffic.",
    "visual_type": "Data screenshots",
    "cta": "Full story on IndieHackers → link",
    "hashtags": [],
    "best_time_mt": "Morning",
    "expected_reach": "300–3,000 upvotes"
  },
  {
    "week_number": 8,
    "day_number": 50,
    "post_date": "2026-08-07",
    "platforms": [
      "linkedin"
    ],
    "post_type": "ProductHunt Launch Day",
    "hook": "We're LIVE on ProductHunt today. Here's what Quantis does.",
    "content_brief": "ProductHunt launch day blitz. All platforms simultaneously. Ask every follower to upvote. Post 3 times throughout the day (morning, noon, evening). This is the single highest-traffic day you can create for free.",
    "visual_type": "ProductHunt badge + demo GIF",
    "cta": "Upvote on PH → link",
    "hashtags": [
      "#ProductHunt",
      "#launch",
      "#AI",
      "#startup"
    ],
    "best_time_mt": "12:01 AM",
    "expected_reach": "10,000–50,000"
  },
  {
    "week_number": 8,
    "day_number": 54,
    "post_date": "2026-08-11",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Post-Launch Reflection",
    "hook": "We hit #X on ProductHunt. Here's what that actually means for a bootstrapped solo founder.",
    "content_brief": "Post-PH reflection. Real metrics from the launch. What drove upvotes. What the traffic spike looked like. What conversions happened. Honest founder analysis. This post performs because people want to learn.",
    "visual_type": "PH results screenshot",
    "cta": "Try Quantis now → link",
    "hashtags": [
      "#ProductHunt",
      "#startup",
      "#founder",
      "#buildinpublic"
    ],
    "best_time_mt": "8:00 AM",
    "expected_reach": "5,000–20,000"
  },
  {
    "week_number": 9,
    "day_number": 57,
    "post_date": "2026-08-21",
    "platforms": [
      "facebook",
      "instagram"
    ],
    "post_type": "Testimonial",
    "hook": "He was going to sign a lease on a restaurant space. Then he ran Quantis.",
    "content_brief": "Customer story format (real or composite). Walk through the decision: $180K investment, 6-year lease, Miami Wynwood. Quantis showed: 6-month break-even, 68% gross margin, key risk = seasonal dependency. He negotiated the lease.",
    "visual_type": "Quote card + numbers",
    "cta": "Your turn → link",
    "hashtags": [
      "#testimonial",
      "#restaurant",
      "#startup",
      "#AI"
    ],
    "best_time_mt": "12:00 PM",
    "expected_reach": "2,000–8,000"
  },
  {
    "week_number": 10,
    "day_number": 64,
    "post_date": "2026-09-04",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Authority",
    "hook": "I've now analyzed businesses in 50 cities on 6 continents. The #1 pattern I found.",
    "content_brief": "Global authority post. Pull insight from the international examples (Dubai, Tokyo, Lagos, Bali, etc.). What's universal: labor as % of revenue is the #1 cost variable regardless of geography. Quantis accounts for all 50.",
    "visual_type": "World map with data points",
    "cta": "See global examples → link",
    "hashtags": [
      "#global",
      "#business",
      "#AI",
      "#data",
      "#startup"
    ],
    "best_time_mt": "7:30 AM",
    "expected_reach": "5,000–18,000"
  },
  {
    "week_number": 11,
    "day_number": 71,
    "post_date": "2026-09-18",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Referral Launch",
    "hook": "Give a friend a free Quantis analysis. Get a free month of Plus.",
    "content_brief": "Referral program launch post. Simple mechanic: share your referral link, friend runs an analysis, you both benefit. Post across all platforms. This starts the viral loop where users become your marketing team.",
    "visual_type": "Referral mechanics graphic",
    "cta": "Get your referral link → /app",
    "hashtags": [
      "#referral",
      "#free",
      "#startup",
      "#AI"
    ],
    "best_time_mt": "10:00 AM",
    "expected_reach": "3,000–12,000"
  },
  {
    "week_number": 12,
    "day_number": 78,
    "post_date": "2026-10-02",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Quarterly Review",
    "hook": "Q2 2026 — what I built, what broke, and what comes next for Quantis.",
    "content_brief": "Quarterly transparency post. Real metrics: MRR, users, analyses run, top traffic sources, what features shipped, what flopped. This is the highest-performing post type for B2B SaaS founders on LinkedIn.",
    "visual_type": "Metrics dashboard screenshot",
    "cta": "Full update on IndieHackers → link",
    "hashtags": [
      "#quarterly",
      "#SaaS",
      "#startup",
      "#buildinpublic",
      "#transparency"
    ],
    "best_time_mt": "8:00 AM",
    "expected_reach": "8,000–25,000"
  },
  {
    "week_number": 13,
    "day_number": 84,
    "post_date": "2026-10-15",
    "platforms": [
      "linkedin"
    ],
    "post_type": "Growth Milestone",
    "hook": "Quantis crossed [target milestone]. Here's the strategy that got us here.",
    "content_brief": "Milestone celebration. Look back at the 90 days. Specific numbers. Specific decisions. What worked (content, SEO, Reddit). What didn't (paid attempts). Frame it as a playbook for other solo founders.",
    "visual_type": "Journey graphic / timeline",
    "cta": "Full story → IndieHackers",
    "hashtags": [
      "#milestone",
      "#solofounder",
      "#SaaS",
      "#AI",
      "#startup"
    ],
    "best_time_mt": "9:00 AM",
    "expected_reach": "10,000–40,000"
  }
];

export const CONTENT_PLAN_STATS = {
  total_posts: QUANTIS_CONTENT_PLAN.length,
  weeks: new Set(QUANTIS_CONTENT_PLAN.map(p => p.week_number)).size,
  platforms_covered: Array.from(new Set(QUANTIS_CONTENT_PLAN.flatMap(p => p.platforms))),
};
