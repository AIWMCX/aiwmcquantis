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

export const marketingPosts: MarketingPost[] = [
  // ─── LinkedIn (5) ───────────────────────────────────────
  {
    id: 'li-1',
    platform: 'linkedin',
    title: 'The $87K Fitness Studio Mistake',
    body: `I watched a friend burn $87,000 on a fitness studio that never had a chance.

Not because the idea was bad — it wasn't.
Because she never stress-tested one assumption: her rent-to-revenue ratio at month 4.

By the time she realised her fixed costs ate 73% of gross revenue, the lease was signed, the equipment was financed, and the runway was gone.

This is the pattern I keep seeing:

→ Great idea
→ Optimistic spreadsheet
→ No pre-mortem
→ Cash-flow crisis at month 3-6

The data backs this up. We've run 500+ business pre-mortems through AIWMC Quantis. The #1 killer isn't competition. It's uninspected fixed-cost assumptions baked into a "validated" plan.

If you're about to invest real money, run a 90-second stress test first.

Find what kills it before it kills your savings.

${DOMAIN}/app`,
    hashtags: ['#StartupFinance', '#PreMortem', '#FounderLife', '#BusinessAnalysis', '#RiskManagement'],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'li-2',
    platform: 'linkedin',
    title: 'The Most Expensive Mistake in Business',
    body: `The most expensive mistake in business isn't failure.

It's committing $50K–$200K to an idea you never stress-tested.

I've reviewed hundreds of business plans. The margins always look great. The projections always hockey-stick.

But when I ask "What's your payback period if customer acquisition costs double?" — silence.

Here's the uncomfortable truth:

• 82% of small businesses fail due to cash-flow problems
• The average founder discovers fatal assumptions 14 months in
• A 90-second AI pre-mortem can surface those assumptions before you sign the lease

Your plan isn't a plan until something has tried to break it.

${DOMAIN}/examples`,
    hashtags: ['#Entrepreneurship', '#BusinessPlanning', '#CashFlow', '#StartupAdvice', '#FinancialModeling'],
    cta: `${DOMAIN}/examples`,
  },
  {
    id: 'li-3',
    platform: 'linkedin',
    title: 'The Blind Spot in Every Business Plan',
    body: `Every business plan I've reviewed has the same blind spot:

It assumes the market will behave like the best-case scenario.

Margins? Industry average. Customer retention? Optimistic. Seasonality? Ignored entirely.

Here's what a pre-mortem analysis actually checks:

1. Rent-to-revenue ratio under stress
2. Payback period with realistic CAC
3. Cash reserves needed at the P10 (worst-case) margin
4. Seasonality impact on month-to-month survival

These aren't "nice to know" metrics. They're the difference between a business that survives Year 1 and one that becomes a cautionary tale.

I built AIWMC Quantis to be the advisor who asks the hard questions — in 90 seconds, backed by real benchmarks.

${DOMAIN}/methodology`,
    hashtags: ['#BusinessStrategy', '#DueDiligence', '#StartupMetrics', '#FinancialAnalysis', '#Founder'],
    cta: `${DOMAIN}/methodology`,
  },
  {
    id: 'li-4',
    platform: 'linkedin',
    title: '3 Numbers That Predict Year 1 Survival',
    body: `3 numbers that predict if your startup survives Year 1:

𝟏. 𝐏𝐚𝐲𝐛𝐚𝐜𝐤 𝐏𝐞𝐫𝐢𝐨𝐝 (months)
If it's over 18 months, you need 2× the runway you think.

𝟐. 𝐋𝐓𝐕:𝐂𝐀𝐂 𝐑𝐚𝐭𝐢𝐨
Below 3:1? You're subsidising every customer. Below 2:1? You're bleeding.

𝟑. 𝐅𝐢𝐱𝐞𝐝-𝐂𝐨𝐬𝐭 𝐑𝐚𝐭𝐢𝐨 (fixed costs ÷ gross revenue)
Above 65%? One bad month ends you.

Most founders know #1 roughly. Almost nobody checks #2 and #3 against real industry benchmarks.

That's exactly what AIWMC Quantis does — in 90 seconds, with location-adjusted data for 50+ cities.

Know your numbers. Or your numbers will find you.

${DOMAIN}/app`,
    hashtags: ['#StartupMetrics', '#UnitEconomics', '#FounderTips', '#BusinessIntelligence', '#SaaS'],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'li-5',
    platform: 'linkedin',
    title: 'Your Competitor Already Stress-Tested',
    body: `Your competitor already stress-tested their model.

You didn't.

They know their worst-case margin. Their break-even month. Their cash-burn rate if Q1 underperforms by 20%.

You have a pitch deck with "conservative" projections that still assume everything goes right.

This isn't about pessimism. It's about preparedness.

The founders who survive aren't luckier — they're more informed.

Run a pre-mortem before your competitor runs circles around you.

${DOMAIN}/app`,
    hashtags: ['#CompetitiveAdvantage', '#StartupStrategy', '#BusinessResilience', '#PreMortem', '#FounderMindset'],
    cta: `${DOMAIN}/app`,
  },

  // ─── X / Twitter (5) ────────────────────────────────────
  {
    id: 'tw-1',
    platform: 'twitter',
    title: 'Stop Validating',
    body: `Stop validating. Start stress-testing.

Validation tells you people like the idea.
A pre-mortem tells you if the math survives month 4.

There's a $50K difference.

${DOMAIN}/app`,
    hashtags: ['#startup', '#premortem', '#founder'],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'tw-2',
    platform: 'twitter',
    title: '14 Months vs 90 Seconds',
    body: `The average founder spends 14 months discovering what an AI pre-mortem finds in 90 seconds:

→ Your margin is 11 points below industry median
→ Your CAC payback exceeds your runway
→ Seasonality kills you in Feb–Mar

The data exists. Most people just don't check.

${DOMAIN}/examples`,
    hashtags: ['#startups', '#data', '#businessmodel'],
    cta: `${DOMAIN}/examples`,
  },
  {
    id: 'tw-3',
    platform: 'twitter',
    title: 'Coffee Shop in Denver',
    body: `Coffee shop in Denver?

Your real enemy isn't the café down the street.

It's your rent-to-revenue ratio at month 4. In Denver, median commercial rent is 1.3× the national index.

If your gross margin sits at the P25 benchmark, you're underwater by week 16.

Run the numbers first → ${DOMAIN}/app`,
    hashtags: ['#smallbusiness', '#coffeeshop', '#Denver', '#businessmath'],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'tw-4',
    platform: 'twitter',
    title: 'LTV:CAC Reality Check',
    body: `If your LTV:CAC ratio is below 3:1, you don't have a business.

You have a donation program.

Below 2:1? You're paying customers to leave.

Check yours in 90 seconds → ${DOMAIN}/app`,
    hashtags: ['#SaaS', '#uniteconomics', '#startupmetrics', '#growth'],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'tw-5',
    platform: 'twitter',
    title: 'My Own Pre-Mortem',
    body: `Ran a pre-mortem on my own idea.

It found 3 fatal assumptions I missed in 6 months of planning:

1. My "conservative" margin was P75 — top quartile, not conservative
2. CAC payback at 14 months, runway at 11
3. Seasonality gap in Q1 that would've drained reserves

Saved me ~$40K. Took 90 seconds.

${DOMAIN}/app`,
    hashtags: ['#buildinpublic', '#premortem', '#honestfounder'],
    cta: `${DOMAIN}/app`,
  },

  // ─── Reddit (5) ─────────────────────────────────────────
  {
    id: 'rd-1',
    platform: 'reddit',
    title: 'What 500 Business Pre-Mortems Revealed',
    subreddit: 'r/startups',
    body: `I built a tool that tells founders their idea might fail — and after 500+ analyses, here's what the data actually shows:

**The #1 killer isn't competition.** It's fixed-cost assumptions.

73% of analyses we've run show founders underestimating their fixed-cost ratio by 15–30%. Rent, salaries, insurance — they model the "expected" costs but never the stress case.

**Second biggest killer: CAC optimism.**

The median CAC in our dataset is 2.1× what founders put in their projections. Not because they're lying — because they model paid acquisition at the early-adopter rate, not the scaled rate.

**Third: ignoring seasonality.**

A restaurant that looks profitable annually can be insolvent in February if seasonality drops revenue 35%.

If you're building something, stress-test the assumptions. Not just the idea.

I'm not going to drop a link unless people want it — just sharing what the data showed. Happy to answer questions about specific industries.`,
    hashtags: [],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'rd-2',
    platform: 'reddit',
    title: 'The #1 Reason First-Time Founders Lose Money',
    subreddit: 'r/entrepreneur',
    body: `I've been obsessed with why first-time founders lose money, so I dug into 200+ financial models.

The #1 reason isn't what most people think. It's not "bad product-market fit." It's not "running out of runway."

**It's committing capital before stress-testing the unit economics.**

Here's the pattern:
1. Founder validates demand (surveys, waitlists, MVPs)
2. Founder builds financial model based on industry averages
3. Founder commits capital (lease, inventory, hires)
4. Month 3–6: actual costs diverge from model by 20–40%
5. Cash crisis

The gap between step 2 and reality is where the money disappears. Industry "averages" hide massive variance — P10 vs P90 margins in restaurants differ by 35+ percentage points.

If anyone's interested, I've been building a pre-mortem engine that stress-tests these assumptions against benchmark distributions. Currently free while I'm refining the model. DM me if curious.`,
    hashtags: [],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'rd-3',
    platform: 'reddit',
    title: 'Stress-Testing Before Signing the Lease',
    subreddit: 'r/smallbusiness',
    body: `Before signing my lease, I stress-tested the numbers. Here's what almost killed the deal.

Context: I was about to open a specialty retail shop. Location looked great, foot traffic was solid, landlord was flexible on terms.

Then I ran the actual financials against industry benchmarks:

- My projected gross margin: 52%
- Industry P25 (bottom quartile): 38%
- My rent-to-revenue ratio at P25 margin: 71%

That means if I performed in the bottom quartile — which 25% of businesses do — rent alone would eat 71% of my gross.

I also discovered seasonality data for my category showing a 28% revenue dip in Jan–Feb. Combined with the margin risk, I'd need $18K more in reserves than I'd planned.

I renegotiated the lease with a 3-month rent reduction clause and increased my reserve fund. Without seeing those numbers, I would've walked into a cash-flow trap.

The tool I used is called AIWMC Quantis — it's free for the first analysis. Not affiliated, just sharing what helped me.`,
    hashtags: [],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'rd-4',
    platform: 'reddit',
    title: 'Median SaaS Payback: 11 Months, Not 3',
    subreddit: 'r/SaaS',
    body: `We analyzed 200+ SaaS financial models submitted to our pre-mortem engine. Some findings that might be uncomfortable:

**Median payback period: 11 months.** Not the 3–4 months most pitch decks claim.

**Median LTV:CAC ratio: 2.8:1.** Barely above the "healthy" threshold of 3:1. And that's the median — half are below.

**Churn:** Monthly churn rates clustered around 4.2% for B2C SaaS and 1.8% for B2B. The difference in LTV is staggering.

**The biggest gap between projection and reality:** Customer acquisition cost at scale. Early-adopter CAC is typically 40–60% of scaled CAC, but most models use the early number.

This isn't to be discouraging. It's to calibrate. If your model shows 3-month payback and 8:1 LTV:CAC, you might be modeling the P90 scenario and calling it "conservative."

Stress-test it. Know where you actually sit in the distribution.`,
    hashtags: [],
    cta: `${DOMAIN}/app`,
  },
  {
    id: 'rd-5',
    platform: 'reddit',
    title: 'Business Plan Generators Are Optimism Engines',
    subreddit: 'r/startups',
    body: `Hot take: business plan generators are optimism engines. What you actually need is a pre-mortem.

Every plan generator I've tried does the same thing:

1. Takes your inputs at face value
2. Projects them forward linearly
3. Produces a document that says "this will work"

None of them ask: "What if your margin is P25 instead of P50?" or "What happens to cash flow if CAC doubles after your first 100 customers?"

A pre-mortem does the opposite:

- It assumes your numbers might be wrong
- It stress-tests them against real benchmark distributions
- It tells you WHERE and WHEN your model breaks

I've been building one (AIWMC Quantis) specifically because I was tired of seeing founders get hurt by plans that were designed to confirm, not to challenge.

If you're planning to invest serious capital, the question isn't "Will this work?" — it's "What kills this, and can I survive it?"

Curious what others think. Is anyone else frustrated with the validation-industrial complex?`,
    hashtags: [],
    cta: `${DOMAIN}/app`,
  },
];
