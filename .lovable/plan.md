

# Fresh Social Media & Marketing Posts Library

## What This Does
Adds a new **Marketing Copy Library** page (`/viral-posts`) with 15 unique, never-before-used social media posts across LinkedIn, X/Twitter, and Reddit — all aligned with the new "Pre-Mortem Engine" positioning. Each post has a one-click copy button. Posts are SEO-optimized, platform-native in tone, and designed for viral engagement.

## Post Strategy (NOT repeating any existing copy)

**LinkedIn (5 posts)** — Professional authority, founder pain points:
1. "I watched a friend burn $87,000 on a fitness studio..." — storytelling hook about fatal assumptions
2. "The most expensive mistake in business isn't failure..." — contrarian insight about uninformed commitment
3. "Every business plan I've reviewed has the same blind spot..." — advisor/investor angle
4. "3 numbers that predict if your startup survives Year 1..." — data-driven educational thread
5. "Your competitor already stress-tested their model. You didn't..." — competitive urgency

**X/Twitter (5 posts)** — Punchy, metric-driven, shareable:
1. "Stop validating. Start stress-testing. There's a $50K difference."
2. "The average founder spends 14 months discovering what an AI pre-mortem finds in 90 seconds."
3. "Coffee shop in Denver? Your real enemy isn't the café down the street. It's your rent-to-revenue ratio at month 4."
4. "If your LTV:CAC ratio is below 3:1, you don't have a business. You have a donation program."
5. "Ran a pre-mortem on my own idea. It found 3 fatal assumptions I missed in 6 months of planning."

**Reddit (5 posts)** — Raw, honest, anti-hype narrative:
1. r/startups: "I built a tool that tells founders their idea will fail — here's what 500 analyses revealed"
2. r/entrepreneur: "The #1 reason first-time founders lose money (it's not what you think)"
3. r/smallbusiness: "Before signing my lease, I stress-tested the numbers. Here's what almost killed the deal."
4. r/SaaS: "We analyzed 200+ SaaS models. The median payback period is 11 months, not 3."
5. r/startups: "Hot take: business plan generators are optimism engines. You need a pre-mortem."

## Technical Implementation

### New Files
| File | Purpose |
|------|---------|
| `src/pages/ViralPosts.tsx` | Marketing Copy Library page with 15 posts, copy buttons, platform tabs |
| `src/data/marketingPosts.ts` | Post data array with full text, platform, hashtags, CTA links |

### Modified Files
| File | Change |
|------|--------|
| `src/App.tsx` | Add `/viral-posts` route |

### Page Features
- Tab navigation: LinkedIn / X / Reddit
- Each post card shows: full post text, suggested hashtags, character count, one-click copy button
- All links use production domain `www.aiwmcquantis.com`
- Posts include platform-specific formatting (LinkedIn: line breaks + emojis; X: concise + hashtags; Reddit: narrative + no self-promo feel)
- SEO meta via PageSEO component

### Post Content Rules
- Zero overlap with existing hero copy, blog titles, or BeforeAfterComparison text
- Every post contains a specific number, metric, or scenario (not generic advice)
- Each post has a clear CTA that drives to the app or a specific example page
- Anti-validation angle throughout: "find what kills it" not "validate your idea"

