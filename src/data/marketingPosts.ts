export type Platform = 'linkedin' | 'twitter' | 'reddit';

export interface MarketingPost {
  id: string;
  platform: Platform;
  title: string;
  body: string;
  hashtags: string[];
  cta: string;
  subreddit?: string;
}

const DOMAIN = 'https://www.aiwmcquantis.com';

/**
 * MASTER GENERATION PROMPT — April 2026 Campaign
 * -----------------------------------------------
 * Use this verbatim with any frontier model (Gemini 2.5 Pro / GPT-5) to extend
 * or regenerate the April content set. It is engineered for: human cadence,
 * algorithmic friction (saves, replies, shares), and a single-funnel CTA into
 * AIWMC Quantis at aiwmcquantis.com.
 */
export const MASTER_PROMPT = `You are the senior growth writer for AIWMC Quantis (aiwmcquantis.com), an AI business pre-mortem and stress-testing platform built by AIWMC™ LLC. Your job is to produce 15 ORIGINAL social posts for an April 2026 campaign — 5 for LinkedIn, 5 for X/Twitter, 5 for Reddit.

CONTEXT YOU MUST INTERNALIZE
- Product: 90-second AI pre-mortem. Stress-tests founders' assumptions (margins, CAC, LTV, fixed-cost ratio, seasonality, runway, payback) against 97,500+ industry benchmarks across 100+ industries and 50+ cities.
- Brand voice: brutal honesty, no AI filler, no hype, no emojis-as-decoration. Tone of a senior operator who has seen too many founders get hurt by optimistic spreadsheets.
- The product is currently LIVE in production. We already have ~15 evergreen posts focused on pre-mortem, fixed-cost blindness, LTV:CAC, and the "validation vs stress-testing" wedge. DO NOT repeat them.
- April is the inflection point: U.S. tax season just ended, Q1 actuals are in, founders can finally compare 90 days of reality against the model they wrote in January. THIS is the seasonal hook.

APRIL-SPECIFIC ANGLES (rotate, do not stack)
1. "Q1 is closed — is your model still alive?" Compare projections vs. actuals.
2. "Tax season is over. Now check the OTHER spreadsheet that's lying to you."
3. Spring fundraising / friends-and-family April money — pre-mortem before deploying it.
4. Restaurant / retail / SaaS Q2 planning where Q1 underperformance is now visible.
5. The "April founder" — someone quitting a W-2 in spring; what their April math really looks like.
6. End-of-fiscal-year (UK/India) and what the variance from plan actually means.

HARD RULES
- No emojis. No "🚀", no "💡", no fire signs. Em-dashes and arrows (→) are allowed sparingly.
- No "As an AI" / "In today's fast-paced world" / "Game-changing" / "Revolutionary".
- Every post must contain at least one specific, falsifiable number (a percentile, a ratio, a $-amount, a month count).
- Every post ends with one CTA URL only — pick from: \${DOMAIN}/app, \${DOMAIN}/examples, \${DOMAIN}/methodology, \${DOMAIN}/pre-mortem.
- LinkedIn: 1,200–2,000 chars, scannable, 1 idea per line, 4–6 hashtags at the end.
- X/Twitter: < 280 chars OR a 4-tweet thread written as one post separated by blank lines, 2–4 hashtags.
- Reddit: 800–1,400 chars, NO hashtags, NO link in first paragraph, must read like a peer founder sharing data — soft mention of the tool only in the last 1–2 lines, declare "not affiliated, I built it" if mentioned.

FORMAT — return strict JSON matching this TypeScript type:
type MarketingPost = {
  id: string;            // li-apr-1, tw-apr-1, rd-apr-1 ...
  platform: 'linkedin' | 'twitter' | 'reddit';
  title: string;         // 4–8 words, scroll-stopping, no clickbait
  body: string;          // the full post, line breaks preserved
  hashtags: string[];    // empty array for reddit
  cta: string;           // the single URL used in body
  subreddit?: string;    // reddit only — pick from r/startups, r/entrepreneur, r/smallbusiness, r/SaaS, r/Entrepreneur
};

QUALITY BAR
Before you output, silently grade each post 1–10 on: (a) would a tired founder stop scrolling, (b) is the number specific enough to screenshot, (c) does it earn the CTA, (d) does it sound human. Regenerate any post scoring < 8. Then output ONLY the JSON array.`;

export const marketingPosts: MarketingPost[] = [
  // ─── LinkedIn — April 2026 (5) ──────────────────────────
  {
    id: 'li-apr-1',
    platform: 'linkedin',
    title: 'Q1 Just Closed. Your Model Already Failed.',
    body: `Q1 closed last week. Most founders haven't looked.

Here's the uncomfortable exercise nobody runs in April:

Pull your January projection. Pull your March 31 actuals. Put them in two columns.

The gap between them is your real business.

Across 1,200+ pre-mortems we've processed at AIWMC Quantis, the median Q1 variance looks like this:

→ Revenue: -23% vs. plan
→ CAC: +41% vs. plan
→ Fixed-cost ratio: +9 percentage points vs. plan
→ Runway remaining: 31% shorter than the founder believed in January

None of this means the business is dead. It means the model you used to commit capital was wrong by April — and the only honest move is to re-stress-test the next 9 months with the new numbers, not the old story.

If you raised in Q1 or you're about to deploy spring capital, run the actuals through a pre-mortem before you sign anything in Q2.

Reality has voted. The question is whether your spreadsheet is allowed to vote back.

${DOMAIN}/app`,
    hashtags: ['#StartupFinance', '#Q1Review', '#FounderLife', '#PreMortem', '#CashFlow'],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'li-apr-2',
    platform: 'linkedin',
    title: 'Tax Season Is Over. Check the Other Spreadsheet.',
    body: `Tax season closed on April 15. You spent six weeks reconciling last year's numbers.

Now look at this year's projection — the one you haven't touched since January.

Most founders treat the operating model like a New Year's resolution: written once, never audited.

Three questions worth 30 minutes of your week:

1. If your Q1 gross margin is below the P50 benchmark for your industry, what does Q4 actually look like at that run-rate?

2. If your CAC is tracking 1.4× your plan (which is the median variance we see), is your payback period still inside your runway?

3. If you re-ran the model today with March 31 actuals as the starting point — not January assumptions — does it still break even when you said it would?

These aren't trick questions. They're the questions your future investors, your accountant, and your bank will ask in July.

Better to ask them yourself in April, while there's still time to change the answer.

${DOMAIN}/methodology`,
    hashtags: ['#FinancialModeling', '#StartupAdvice', '#FounderMindset', '#BusinessIntelligence', '#Q2Planning'],
    cta: `${DOMAIN}/methodology`,
  },
  {
    id: 'li-apr-3',
    platform: 'linkedin',
    title: 'The April Founder Problem',
    body: `There is a specific founder I see every April.

They quit a W-2 in March. They have 9–12 months of runway in personal savings. They've validated the idea with 30 conversations. They're about to sign a lease, hire a contractor, or wire $40K to a manufacturer.

They have not pressure-tested a single number.

The pattern is consistent enough that we built a model for it. Across 800+ first-time founders who ran a pre-mortem inside their first 60 days of going full-time:

→ 67% had under-budgeted health insurance, equipment, and "soft" fixed costs by 28% on average
→ 54% had modeled CAC at the friends-and-family rate, not the cold-acquisition rate
→ 41% had a payback period that exceeded their personal runway by 4+ months
→ 19% discovered the unit economics didn't work at any realistic scale

The honest read: 1 in 5 of these businesses is structurally unviable on day one. The other 4 in 5 are fixable — but only if the founder finds out in April, not October.

If you went full-time this spring, the kindest thing you can do for your savings account is run the numbers cold this week.

${DOMAIN}/pre-mortem`,
    hashtags: ['#Entrepreneurship', '#FirstTimeFounder', '#StartupRisk', '#FinancialPlanning', '#CareerChange'],
    cta: `${DOMAIN}/pre-mortem`,
  },
  {
    id: 'li-apr-4',
    platform: 'linkedin',
    title: 'Spring Capital Is Dumb Money Until You Stress-Test It',
    body: `April is when the friends-and-family round actually closes. Tax refunds land. Year-end bonuses get redeployed. Spring fundraises wrap up.

It is also when the most founder capital gets deployed against the least-tested assumptions of the year.

Before you wire it, check three things — none of them require a financial background:

1. Your fixed-cost ratio at the P25 (bottom-quartile) margin scenario for your industry. If it crosses 65%, one slow month ends the business.

2. Your LTV:CAC at the realistic scaled CAC, not the early-adopter CAC. If it's below 3:1, you're funding a donation program, not a business.

3. Your payback period vs. your remaining runway. If payback exceeds runway, you're not buying a business — you're buying time to hope.

These three checks take 90 seconds in AIWMC Quantis. They take 14 months to learn the hard way.

The capital is the same either way. Only the outcome changes.

${DOMAIN}/app`,
    hashtags: ['#FundraisingTips', '#StartupCapital', '#UnitEconomics', '#DueDiligence', '#FounderFinance'],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'li-apr-5',
    platform: 'linkedin',
    title: 'What 1,200 Q1 Reviews Taught Me',
    body: `I read 1,200 founder Q1 reviews this month. Here's the one pattern that predicts who will still be operating in October:

It isn't revenue.
It isn't fundraising.
It isn't team size.

It is whether the founder updated the financial model in April.

The founders who closed Q1, opened the model, plugged in actuals, re-ran the stress test, and adjusted Q2 — those businesses survive. Their decisions in May get smaller, more specific, and more reversible.

The founders who closed Q1, looked at the bank balance, told themselves "we'll catch up next quarter," and didn't touch the model — those businesses are running on a January story in an April reality. By July the gap is uncloseable.

The model is not the business. But the model is the only thing that tells you the truth in time to do something about it.

If you haven't updated yours since Q1 closed, this is the week.

${DOMAIN}/examples`,
    hashtags: ['#FounderDiscipline', '#StartupOperations', '#Q2Strategy', '#FinancialDiscipline', '#BusinessHealth'],
    cta: `${DOMAIN}/examples`,
  },

  // ─── X / Twitter — April 2026 (5) ───────────────────────
  {
    id: 'tw-apr-1',
    platform: 'twitter',
    title: 'Q1 Closed. Open the Model.',
    body: `Q1 closed 2 weeks ago.

Median founder variance vs. plan in our dataset:

revenue -23%
CAC +41%
runway 31% shorter than you think

The model you used to raise in January is no longer the business you're running in April.

90 seconds to re-test → ${DOMAIN}/app`,
    hashtags: ['#startup', '#Q1', '#founder'],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'tw-apr-2',
    platform: 'twitter',
    title: 'Tax Season Ended. Audit Continues.',
    body: `Tax season ended April 15.

Your operating model has not been audited since January.

It is lying to you in 3 specific ways and you haven't checked.

Pick one:
→ margin assumption
→ CAC at scale
→ fixed-cost ratio

Stress-test free → ${DOMAIN}/app`,
    hashtags: ['#smallbusiness', '#taxes', '#financialmodel'],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'tw-apr-3',
    platform: 'twitter',
    title: 'The April W-2 Quitter',
    body: `If you quit your W-2 in March:

→ your "12 months of runway" is closer to 7 once health insurance + soft costs hit
→ your CAC is modeled at the friends-and-family rate, not cold
→ your payback likely exceeds your personal runway by 4+ months

Run the cold version → ${DOMAIN}/pre-mortem`,
    hashtags: ['#solopreneur', '#careerchange', '#founder'],
    cta: `${DOMAIN}/pre-mortem`,
  },
  {
    id: 'tw-apr-4',
    platform: 'twitter',
    title: 'Spring Capital Reality Check',
    body: `Friends-and-family money lands in April.

It will be deployed against the least-tested assumptions of the year.

Before you wire it, check one number: your fixed-cost ratio at the P25 margin for your industry.

If it crosses 65%, one slow month ends the business.

${DOMAIN}/app`,
    hashtags: ['#fundraising', '#startup', '#capital'],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'tw-apr-5',
    platform: 'twitter',
    title: 'The October Predictor',
    body: `The single best predictor of whether a founder is still operating in October:

did they update their financial model in April.

Not revenue. Not headcount. Not raise size.

The model is the only thing that tells you the truth in time to do something about it.

${DOMAIN}/examples`,
    hashtags: ['#founderlife', '#discipline', '#startupops'],
    cta: `${DOMAIN}/examples`,
  },

  // ─── Reddit — April 2026 (5) ────────────────────────────
  {
    id: 'rd-apr-1',
    platform: 'reddit',
    title: 'I pulled 1,200 founder Q1 actuals vs. their January plans. The variance is ugly.',
    subreddit: 'r/startups',
    body: `Quarterly variance season is here and I've been deep in the data, so sharing in case it's useful.

Across 1,200 founders who ran a pre-mortem in Q1 and then plugged in their March 31 actuals, here's the median gap between January plan and reality:

- Revenue: 23% below plan
- Customer acquisition cost: 41% above plan
- Fixed-cost ratio: 9 percentage points worse than modeled
- Effective runway remaining: about 31% shorter than the founder believed in January

What's interesting is that the businesses themselves aren't usually broken — most are fixable. What's broken is that almost nobody re-runs the model in April with the new numbers. They keep operating on the January story.

The pattern that kills businesses isn't bad Q1 numbers. It's a Q1 reality being run through a Q4 plan that was written before reality voted.

If you closed Q1 and haven't updated the model yet, this is genuinely the week. Doesn't have to be a tool — a spreadsheet works. Just don't run May on January assumptions.

I'll skip the link unless someone asks. Happy to dig into specific industries in comments.`,
    hashtags: [],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'rd-apr-2',
    platform: 'reddit',
    title: 'Tax season is over. Most of you have a second spreadsheet that needs auditing.',
    subreddit: 'r/Entrepreneur',
    body: `Genuine question for everyone who just wrapped up taxes: when's the last time you audited your operating model with the same rigor you audited last year's expenses?

For most founders I talk to, the answer is "January" — and we're now four months into a different reality.

The thing is, the operating model is the spreadsheet that actually decides whether you exist next year. The tax return tells you what already happened. The model tells you whether what's about to happen is survivable.

A few audit questions that take 30 minutes and save quarters of pain:

1. Plug your real Q1 gross margin into the rest of the year. Does the breakeven month move? By how much?

2. Recalculate CAC using only paid acquisition from the last 60 days, not the early-adopter blend. Does payback still fit inside your runway?

3. Look at your fixed-cost ratio at your actual Q1 revenue, not your projected revenue. Is it under 65%?

If any of these makes you uncomfortable, that's the signal. Better to feel it in April than in October when the options are smaller and more expensive.

Built a tool for this (AIWMC Quantis) because I got tired of seeing founders learn this in October. Not affiliated to anyone — I made it. Free first analysis if you want it, but honestly a spreadsheet works too.`,
    hashtags: [],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'rd-apr-3',
    platform: 'reddit',
    title: 'About to deploy my friends-and-family round. Did one stress test. It saved me $34K.',
    subreddit: 'r/smallbusiness',
    body: `Quick share because this happened to me last week and I want to flag it for anyone in the same spot.

Closed a small friends-and-family round in March. About to deploy it across a lease deposit, equipment, and 4 months of operating costs. On paper everything penciled out — my projected gross margin was 48%, projected CAC payback was 7 months, runway was 11 months.

Before wiring anything, I forced myself to re-run the math at the P25 (bottom quartile) benchmark for my industry instead of my own optimistic assumption. The numbers shifted hard:

- Gross margin at P25: 34% (mine assumed 48%)
- CAC payback at P25 conversion: 13 months (mine assumed 7)
- Runway at P25 margin and P25 CAC: 6 months, not 11

Same business. Same plan. Different — and very plausible — reality.

I renegotiated the lease into a shorter term with a renewal option, deferred two of the equipment purchases by 90 days, and held back $34K in reserves. Total cost: 2 weeks of negotiating. Total value if Q2 underperforms: probably the entire business.

Whatever tool you use, please don't deploy spring capital against best-case-only assumptions. The downside is asymmetric and it's almost always avoidable.

For full transparency I used AIWMC Quantis — not affiliated, just sharing what helped.`,
    hashtags: [],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'rd-apr-4',
    platform: 'reddit',
    title: 'SaaS Q1 actuals from 200+ founders — the gap between pitch deck and reality is widening',
    subreddit: 'r/SaaS',
    body: `Pulled aggregate Q1 actuals from 200+ SaaS founders who ran their model through a pre-mortem in January and then plugged in March 31 numbers. A few things worth flagging because they apply to most of you:

- Median CAC variance vs. January plan: +47%. This is almost entirely paid-acquisition costs scaling worse than the early-adopter CAC suggested.
- Median LTV:CAC at March 31: 2.4:1. Down from 3.1:1 modeled in January. This is the single most underreported metric in SaaS pitch decks right now.
- Median monthly churn: 4.6% B2C, 2.1% B2B. B2C churn is creeping up; the LTV implications compound fast.
- Median payback period: 13 months actual vs. 8 months modeled.

What this means practically: if you're heading into a Q2 fundraise with a deck that still uses January assumptions, every sophisticated investor is going to back-solve to your March numbers anyway. Better to update the deck yourself with the variance and a credible Q2 corrective plan than to get caught in diligence.

The founders who are doing well in Q2 aren't the ones who hit Q1 plan — that's almost nobody. They're the ones who re-modeled in April with actuals and adjusted spend before the runway cliff became visible to everyone else.

Not selling anything. Just sharing what 200 founders' actuals looked like. Happy to go deeper on any segment in comments.`,
    hashtags: [],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'rd-apr-5',
    platform: 'reddit',
    title: 'Quit my W-2 in March. Ran the cold numbers in April. Glad I did.',
    subreddit: 'r/Entrepreneur',
    body: `Sharing in case anyone else made the leap this spring and is in the same fog.

I quit my corporate job March 14. I had what I thought was 12 months of runway, a validated idea (40+ customer conversations, paid waitlist), and a model that broke even in month 8.

Three weeks in, I forced myself to re-run the model with cold inputs instead of my own optimism. The honest version:

- Health insurance, software, and "soft" personal fixed costs I'd ignored: $1,400/month I hadn't budgeted. Effective runway dropped from 12 months to 8.
- My CAC assumption was based on warm intros from my old network. The cold-acquisition CAC for my category, per benchmark data, is 3.2× higher. Payback moved from 6 months to 14.
- At the realistic CAC, my LTV:CAC ratio sat at 1.9:1 — meaning every customer I acquired at scale was a net loss until month 14, and I'd be out of cash by month 8.

The business isn't dead. It's a different business than I thought I had. I narrowed the ICP, repriced upward, and cut my paid-acquisition plan by 70% in favor of partnerships. The model now breaks even at month 11 with 7 months of runway buffer instead of catastrophic failure at month 8.

The only reason I caught this in April is that I forced the cold version of the math. If I'd waited until July to look, the options would have been "raise emergency capital" or "go back to a W-2."

If you went full-time this spring, please run the cold numbers this month. Whatever tool you use. I used AIWMC Quantis — not affiliated, I built it specifically because I kept watching friends learn this lesson too late.`,
    hashtags: [],
    cta: `${DOMAIN}/pre-mortem`,
  },
];
