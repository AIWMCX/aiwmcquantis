// =============================================================================
// scripts/generate-static-bodies.mjs — Browser-free per-route static bodies.
//
// WHY THIS EXISTS: earlier attempts used Puppeteer to render each route in a
// headless browser and capture its DOM. That approach failed reliably on
// Lovable's publish container ("Publishing failed due to a temporary issue")
// because headless Chrome needs system libraries the container lacks. Rather
// than fight the container, this script generates real, informative,
// per-route content directly from the route registry + structured data
// sources (exampleData, canonical facts, TIERS pricing, the demo engines via
// scripts/static-bodies/demo-bodies.json). Zero browser, zero binary
// dependencies, runs in ~200ms.
//
// The output is written INTO each dist/<route>/index.html BEFORE prerender-seo.ts
// re-stamps the head, as ordinary markup inside <div id="root"> (one <h1> per
// route). It is NOT in <noscript>: many crawlers that don't execute JS (Bing,
// OAI-SearchBot, PerplexityBot, ClaudeBot, Google's first pass) drop noscript
// text. src/main.tsx mounts with createRoot, which replaces #root's children,
// so there is no hydration to mismatch. A one-line inline script removes the
// block when the URL is not the route it was written for (SPA rewrites serve
// dist/index.html for /auth, /admin, /r/... and must not flash the homepage).
// verify-visibility.mjs fails the build if a route has no <h1>, more than one,
// fewer than 80 words, or the "renders after JavaScript loads" placeholder.
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PUBLIC_ROUTES } from "./seo.routes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

// -----------------------------------------------------------------------------
// Data pulls from source of truth files. Everything below is derived, not typed.
// -----------------------------------------------------------------------------

/** Extract EXAMPLE_ANALYSES entries from src/pages/examples/exampleData.ts by
 *  string parsing — avoids importing TS at runtime. Falls back gracefully if
 *  a slug is absent (renders the standard route body without example figures). */
function loadExampleData() {
  const files = [
    path.join(ROOT, "src/pages/examples/exampleData.ts"),
    path.join(ROOT, "src/pages/examples/exampleDataExpanded.ts"),
  ];
  const out = {};
  for (const f of files) {
    if (!existsSync(f)) continue;
    const src = readFileSync(f, "utf8");
    // Match each `'slug-here': { ... },` block at the top level.
    const re = /'([\w-]+)'\s*:\s*\{[\s\S]*?title:\s*['"]([^'"]+)['"][\s\S]*?description:\s*['"]([^'"]+)['"][\s\S]*?monthlyRevenue:\s*['"]([^'"]+)['"][\s\S]*?monthlyProfit:\s*['"]([^'"]+)['"][\s\S]*?paybackMonths:\s*['"]([^'"]+)['"][\s\S]*?startupCost:\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      out[m[1]] = {
        title: m[2],
        description: m[3],
        monthlyRevenue: m[4],
        monthlyProfit: m[5],
        paybackMonths: m[6],
        startupCost: m[7],
      };
    }
  }
  return out;
}

const EXAMPLES = loadExampleData();

/** Read the small set of commercial facts this static renderer needs from the
 * canonical tier config. The renderer runs as plain Node, so importing the TS
 * module directly is not available in the production build container. Fail
 * loudly if the authored config shape changes instead of publishing stale copy. */
function loadTierFacts() {
  const source = readFileSync(path.join(ROOT, "src/config/tiers.ts"), "utf8");
  const section = (tier, nextTier) => {
    const start = source.indexOf(`  ${tier}: {`);
    const end = nextTier ? source.indexOf(`  ${nextTier}: {`, start) : source.indexOf("\n} as const;", start);
    if (start < 0 || end < 0) throw new Error(`generate-static-bodies: cannot parse ${tier} tier`);
    return source.slice(start, end);
  };
  const number = (text, key) => {
    const match = text.match(new RegExp(`${key}:\\s*(\\d+)`));
    if (!match) throw new Error(`generate-static-bodies: missing ${key}`);
    return Number(match[1]);
  };

  const free = section("free", "plus");
  const plus = section("plus", "pro");
  const pro = section("pro", null);
  return {
    freeRuns: number(free, "analysesPerMonth"),
    plusMonthly: number(plus, "priceMonthly"),
    plusAnnual: number(plus, "priceAnnual"),
    plusScenarioSets: number(plus, "scenarioSetsPerAnalysis"),
    proMonthly: number(pro, "priceMonthly"),
    proAnnual: number(pro, "priceAnnual"),
    proSeats: number(pro, "teamSeats"),
  };
}

const TIER_FACTS = loadTierFacts();

/** One-time offer prices from src/config/engagement-offers.ts (same fail-loud
 *  parsing as loadTierFacts). */
function loadOfferPrices() {
  const source = readFileSync(path.join(ROOT, "src/config/engagement-offers.ts"), "utf8");
  const priceOf = (code) => {
    const m = source.match(new RegExp(`code:\\s*'${code}'[\\s\\S]*?price:\\s*(\\d+)`));
    if (!m) throw new Error(`generate-static-bodies: cannot parse ${code} price`);
    return Number(m[1]);
  };
  return { review: priceOf("founder_decision_review"), pilot: priceOf("consultant_founding_pilot") };
}

const OFFER_PRICES = loadOfferPrices();

/** Demo bodies computed by the demo engines (src/lib/demo/static-bodies.ts).
 *  Committed JSON because this script runs as plain Node; the test
 *  demo-static-bodies.test.ts fails when it drifts from the engines. */
const DEMO_BODIES = JSON.parse(
  readFileSync(path.join(__dirname, "static-bodies", "demo-bodies.json"), "utf8"),
);

// Blog post metadata — keyed by slug, used to render informative blog bodies.
// This is authored data (not fetched from a CMS) so it lives here alongside
// the route registry.
const BLOG_POSTS = {
  "how-to-stress-test-your-startup": {
    title: "How to Stress-Test Your Startup Before Launch",
    summary: "A step-by-step framework for stress-testing a business idea before you spend money on it. Covers financial pre-mortem, competitive pressure tests, unit-economics inversion, and how to interpret failure signals when they show up in modeled numbers.",
    keyPoints: [
      "Financial pre-mortem: model 3-5 realistic failure paths, not just the base case",
      "Unit economics inversion: work backward from break-even, not forward from optimism",
      "Competitive pressure tests: what happens when a well-funded competitor cuts price 30%?",
      "Cash runway sensitivity: which single variable, if wrong by 20%, kills you?",
      "Founder-market fit sanity check: honest self-assessment beats every framework",
    ],
  },
  "startup-validation-checklist": {
    title: "The Startup Validation Checklist Founders Actually Use",
    summary: "Twelve concrete checks that separate ideas worth building from ideas that feel right but aren't. Not a template — actual questions with pass/fail criteria you can score honestly.",
    keyPoints: [
      "Problem interviews: 15+ conversations with the target customer before any code",
      "Willingness-to-pay validation: pre-order commitments, not survey responses",
      "Unit economics on the back of a napkin: LTV/CAC greater than 3",
      "Distribution channel proof: at least one channel you can afford to acquire from",
      "Founder honesty test: would you fund this if it was someone else's pitch?",
    ],
  },
  "ai-vs-spreadsheets-startup-planning": {
    title: "AI vs Spreadsheets for Startup Planning: Where Each One Wins",
    summary: "Spreadsheets are auditable but slow to iterate. AI is fast but often confidently wrong. The honest answer: use a deterministic engine for the numbers, use AI for the narrative around them, and never trust AI-generated financial figures.",
    keyPoints: [
      "Spreadsheets: complete auditability, painful iteration, no benchmarks",
      "Pure AI models: fast iteration, invented numbers, no auditability",
      "Deterministic engine + AI narrative: auditable numbers, AI-drafted explanation",
      "Which category real financial due-diligence tools fall into",
      "When a spreadsheet is still the right answer",
    ],
  },
  "validate-startup-idea-using-ai": {
    title: "How to Validate a Startup Idea Using AI (Without Getting Fooled by It)",
    summary: "AI can accelerate startup validation only if you treat it as a research assistant, not an oracle. This post walks through where AI genuinely helps, where it fabricates, and how to separate the two.",
    keyPoints: [
      "Market sizing with citations, not vibes",
      "Cost benchmark research: what AI can verify vs. what it fabricates",
      "Competitive scans: coverage vs. depth trade-offs",
      "Financial modeling with AI: only when numbers are derived from a deterministic engine",
      "The verification layer that separates useful AI from confident hallucination",
    ],
  },
  "how-to-calculate-startup-costs": {
    title: "How to Calculate Startup Costs Accurately",
    summary: "Most first-time founders under-estimate startup costs by 30-50%. This post walks through the standard cost categories, benchmarks per industry, and the hidden costs that kill projections.",
    keyPoints: [
      "The seven cost categories most first-time founders miss entirely",
      "Industry-specific benchmarks: coffee shops, SaaS, consulting, retail",
      "Working capital: the six-month buffer that separates survivors from statistics",
      "Owner draw vs. reinvestment: modeling both scenarios honestly",
      "Contingency reserves: 15-25% depending on business type",
    ],
  },
  "unit-economics-explained-for-founders": {
    title: "Unit Economics Explained for Founders (In Plain English)",
    summary: "LTV, CAC, payback period, and gross margin — the four numbers that determine whether a business model works. This post explains each in founder-friendly language and shows how to compute them from real early data.",
    keyPoints: [
      "Customer Acquisition Cost: fully-loaded, not just ad spend",
      "Lifetime Value: cohort-based, not aggregate average",
      "LTV/CAC ratio: the 3:1 rule and when it lies",
      "Payback period: why 12 months is the honest threshold",
      "Gross margin: SaaS vs. services vs. physical goods benchmarks",
    ],
  },
  "coffee-shop-startup-costs-by-city": {
    title: "Coffee Shop Startup Costs by City: A Modeled Comparison",
    summary: "The same 1,200 square foot coffee shop concept costs dramatically different amounts to open in Denver, San Francisco, Nashville, and Austin. This post breaks down modeled costs by city and identifies the variables that matter most.",
    keyPoints: [
      "Buildout cost per square foot: national baseline and city multipliers",
      "Equipment: espresso machines, grinders, refrigeration, POS",
      "Rent and deposits: high-cost vs. mid-cost metro comparisons",
      "Licensing and permits: municipal variance is larger than most founders expect",
      "Working capital: 6-8 months of operating cost before positive cash flow",
    ],
  },
  "food-truck-profit-calculator": {
    title: "Food Truck Profit Calculator: What the Numbers Actually Look Like",
    summary: "A modeled profit calculator for a food truck operation. Real cost lines, real revenue assumptions, and honest sensitivity analysis on the variables that make or break the model.",
    keyPoints: [
      "Truck purchase vs. lease: which pencils out and when",
      "Commissary and prep costs: often the biggest surprise",
      "Event fees and permits: fixed cost per operating day",
      "Weather and seasonality: 25-40% revenue variance in most markets",
      "Break-even analysis: transactions per day at three price points",
    ],
  },
  "how-to-validate-restaurant-idea": {
    title: "How to Validate a Restaurant Idea (Before Signing the Lease)",
    summary: "Restaurants have a legendary failure rate. This post walks through the validation steps that separate survivable concepts from expensive lessons — before you sign a 5-year commercial lease.",
    keyPoints: [
      "Menu economics: food cost percentage as the leading indicator",
      "Location scoring: foot traffic, comparables, lease terms",
      "Concept-market fit: 12+ conversations with target diners",
      "Capital adequacy: opening costs plus 9-12 months of operating buffer",
      "Operator readiness: the honest experience gap most first-timers ignore",
    ],
  },
  "5-financial-mistakes-early-founders-make": {
    title: "Five Financial Mistakes Early Founders Make",
    summary: "Not fatal individually, but compounding across the first 18 months. Each of these is fixable if caught early, expensive if not.",
    keyPoints: [
      "Mixing personal and business finances past month one",
      "Optimizing for revenue growth before unit economics are proven",
      "Under-pricing to acquire customers who will never pay full price",
      "Burning capital on marketing before product-market fit",
      "Missing the tax-planning window for the first business year",
    ],
  },
  "ai-vs-traditional-business-planning": {
    title: "AI vs Traditional Business Planning: An Honest Comparison",
    summary: "Traditional business planning tools produce documents. AI-powered tools produce faster documents. The real question is whether either produces documents that survive contact with reality.",
    keyPoints: [
      "Traditional planning: exhaustive, static, immediately outdated",
      "AI-drafted plans: fast, plausible, often full of made-up numbers",
      "Deterministic-engine planning: numbers informed by benchmark data, narrative from AI",
      "When traditional planning is still right (regulated industries, investor documents)",
      "When AI planning is dangerous (cost projections, competitive analysis)",
    ],
  },
  "business-validation-for-financial-clients": {
    title: "Business Validation for Financial-Advisory Clients",
    summary: "A framework for financial consultants to validate their clients' business ideas quickly, defensibly, and with a paper trail that survives scrutiny.",
    keyPoints: [
      "Client-facing validation workflow: intake to report in one week",
      "Modeled projections vs. client-provided projections: the reconciliation step",
      "Risk documentation: what to flag, what to escalate, what to decline",
      "Fee framework: fixed-fee validation vs. hourly consulting",
      "Handoff to implementation: what belongs in the report, what belongs in the follow-up",
    ],
  },
};

// -----------------------------------------------------------------------------
// Body renderers per route category
// -----------------------------------------------------------------------------

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderExampleBody(slug) {
  const ex = EXAMPLES[slug];
  const displayTitle = ex?.title ?? slug.replace(/-/g, " ");
  const description = ex?.description ?? `Modeled financial analysis of a ${slug.replace(/-/g, " ")} business, produced by the AIWMC Quantis deterministic engine.`;

  const metrics = ex
    ? `
      <h2>Modeled monthly economics</h2>
      <table>
        <tr><td>Modeled monthly revenue</td><td><strong>${escapeHtml(ex.monthlyRevenue)}</strong></td></tr>
        <tr><td>Modeled monthly profit</td><td><strong>${escapeHtml(ex.monthlyProfit)}</strong></td></tr>
        <tr><td>Modeled payback period</td><td><strong>${escapeHtml(ex.paybackMonths)}</strong></td></tr>
        <tr><td>Modeled startup cost</td><td><strong>${escapeHtml(ex.startupCost)}</strong></td></tr>
      </table>
      <p class="q-note">All figures are illustrative outputs from the Quantis deterministic engine using a 97,500-cell rule-generated benchmark grid. The cells are modeled combinations, not observed businesses. This is a stress test of stated assumptions, not a forecast. See <a href="/methodology">Methodology</a> for the construction and limitations.</p>
    `
    : `<p>Modeled example page. Detailed figures render after JavaScript loads.</p>`;

  return `
    <article>
      <h1>${escapeHtml(displayTitle)}</h1>
      <p class="q-lede">${escapeHtml(description)}</p>
      ${metrics}
      <h2>What Quantis does with this idea</h2>
      <p>The analysis pipeline separates repeatable financial formulas, modeled benchmark ranges, scenario simulation, and AI narration. External evidence checks run when suitable evidence is available; they do not make the result a forecast.</p>
      <p>Free users receive ${TIER_FACTS.freeRuns} complete Decision Runs each month. Plus at $${TIER_FACTS.plusMonthly}/mo adds unlimited runs, additional saved scenarios, Document Studio, and custom-branded exports that retain Quantis attribution. Pro at $${TIER_FACTS.proMonthly}/mo adds a 5-year model, ${TIER_FACTS.proSeats} seats, API access, and fully white-label exports.</p>
      <p><a href="/app">Run your own analysis</a> · <a href="/pricing">See pricing</a> · <a href="/examples">Browse other examples</a></p>
    </article>
  `;
}

function renderBlogBody(slug) {
  const post = BLOG_POSTS[slug];
  if (!post) return `<article><h1>${escapeHtml(slug.replace(/-/g, " "))}</h1><p>Blog post. Content renders after JavaScript loads.</p></article>`;
  const bullets = post.keyPoints.map((p) => `<li>${escapeHtml(p)}</li>`).join("");
  return `
    <article>
      <h1>${escapeHtml(post.title)}</h1>
      <p class="q-lede">${escapeHtml(post.summary)}</p>
      <h2>Key points covered in this post</h2>
      <ul>${bullets}</ul>
      <p><a href="/blog">All posts</a> · <a href="/app">Try Quantis free</a> · <a href="/methodology">How Quantis calculates</a></p>
    </article>
  `;
}

function renderCoreBody(routePath) {
  const H1 = {
    "/": "Stress-test your business idea",
    "/how-it-works": "How AIWMC Quantis works",
    "/use-cases": "Who uses AIWMC Quantis — founders, consultants, builders",
    "/pricing": "AIWMC Quantis pricing — Free, Plus $17/mo, Pro $49/mo",
    "/methodology": "The Quantis methodology — 8-layer deterministic pipeline",
    "/examples": `Worked examples — ${Object.keys(EXAMPLES).length} illustrative modeled analyses`,
    "/blog": "Practical guides for pre-launch and pre-scale decisions",
    "/risk-gallery": "Risk gallery — illustrative stress-test scenarios",
    "/leaderboard": "This Month's Top Business Ideas",
    "/research": "AIWMC Research Foundation",
    "/status": "System status",
    "/state-of-quantis": "State of Quantis",
    "/security": "Security posture",
    "/refund-policy": "Refund policy",
    "/decision-review": "Founder Decision Review and Consultant Founding Pilot",
    "/consultant-pilot": "Consultant Founding Pilot: two real client decisions, each reviewed by a founder",
    "/demo/price-change": "Before you change your price, know how many clients you can afford to lose.",
    "/demo/second-location": "Before you sign the lease, know the month a second location pays back.",
    "/connect": "Connect with AIWMC",
    "/changelog": "Changelog — what's new",
    "/privacy": "Privacy Policy",
    "/terms": "Terms of Service",
    "/ai-policy": "AI policy",
    "/dmca": "Copyright and DMCA policy",
    "/app": "Run a Quantis analysis",
    "/consultants": "Quantis for consultants — client pre-screening",
    "/vs/liveplan": "AIWMC Quantis vs LivePlan — honest comparison",
    "/vs/upmetrics": "AIWMC Quantis vs Upmetrics — honest comparison",
    "/vs/bizplanr": "AIWMC Quantis vs Bizplanr — honest comparison",
    // VsComparePage renders one H1 shared by every /vs page; the static H1
    // uses the page's own per-competitor heading so each URL has its own.
    "/vs/foundra": "AIWMC Quantis vs Foundra — side by side",
    "/vs/aicofounder": "AIWMC Quantis vs AI Co-Founder — side by side",
    "/vs/chatgpt": "AIWMC Quantis vs ChatGPT — side by side",
  }[routePath];
  if (!H1) throw new Error(`generate-static-bodies: no <h1> text for ${routePath}. Add it to the H1 map.`);

  const layerList = `
    <h2>The 8-Layer analysis pipeline</h2>
    <ol>
      <li>Layer 1 — Input sanitization and business classification</li>
      <li>Layer 2 — Benchmark matching against a 97,500-cell modeled coverage grid; cells are not observed companies</li>
      <li>Layer 3 — Coarse location adjustment where supported</li>
      <li>Layer 4 — Deterministic financial calculations and quality checks</li>
      <li>Layer 5 — 1,000 scenario iterations with P10/P50/P90 modeled ranges</li>
      <li>Layer 6 — Classification, bounded narrative, action plan, and adversarial review</li>
      <li>Layer 7 — Reconciliation of supported numeric claims; dataset-level references exist, but per-cell source lineage does not</li>
      <li>Layer 8 — External evidence checks for selected metrics when suitable evidence is available</li>
    </ol>
  `;

  const pricing = `
    <h2>Pricing</h2>
    <table>
      <tr><th>Plan</th><th>Price</th><th>Outcome and continuity</th></tr>
      <tr><td>Free</td><td>$0</td><td>${TIER_FACTS.freeRuns} complete Decision Runs each month, including the financial model, pre-mortem, and one saved scenario set per run</td></tr>
      <tr><td>Plus</td><td>$${TIER_FACTS.plusMonthly}/mo or $${TIER_FACTS.plusAnnual}/yr</td><td>Unlimited runs, ${TIER_FACTS.plusScenarioSets} scenario sets per analysis, Document Studio, clean exports, and custom branding with Quantis attribution retained</td></tr>
      <tr><td>Pro</td><td>$${TIER_FACTS.proMonthly}/mo or $${TIER_FACTS.proAnnual}/yr</td><td>Everything in Plus, 5-year model, ${TIER_FACTS.proSeats} seats, API access, and fully white-label exports</td></tr>
    </table>
    <p>Plus and Pro checkouts include a 14-day trial. Free requires no card. Paid subscribers can manage cancellation from the billing portal.</p>
  `;

  const routeSpecific = {
    "/pricing": `${pricing}<p>Every plan uses the same core financial-analysis path. Paid plans add continuity, saved capacity, professional delivery, and verified advanced capabilities rather than withholding the first complete result. See <a href="/how-it-works">how it works</a> for the pipeline.</p><p><a href="/app">Start free — no card required</a></p>`,
    "/demo/price-change": `<p class="q-lede">A price rise earns more per client and may cost some clients. Put in your clients, price, margin and cash; Quantis compares cash with and without the change over 18 months, with the same deterministic engine behind every Quantis Decision Run. The page opens prefilled with an illustrative example: replace it with your numbers.</p><h2>What it shows</h2><ul><li>Cash with and without the change, month by month</li><li>How many clients you can lose and still earn the same gross profit</li><li>When the change pays off, and the boundary for each guess</li></ul><p>Rule of thumb on the page: at a given gross margin, a price rise earns the same gross profit even if you lose a share of clients equal to the price change ÷ (margin + price change). Serving a client costs the same after the change, so the margin per client moves with the price.</p><p>Your inputs are not checked facts; the result is only as good as they are.</p><p><a href="/demo/hiring-decision">Hiring decision</a> · <a href="/demo/second-location">Second location decision</a> · <a href="/decision-review">Founder Decision Review</a></p>`,
    "/demo/second-location": `<p class="q-lede">It costs money up front, takes months to fill, and some of its clients would have come to you anyway. Put in your clients, capacity, costs and cash; Quantis compares cash with and without the second location over 36 months, with the same deterministic engine behind every Quantis Decision Run. The page opens prefilled with an illustrative example: replace it with your numbers.</p><h2>What it shows</h2><ul><li>Cash with and without the second location, month by month</li><li>When it pays back, and the lowest your cash gets on the way</li><li>The boundary for each guess: new clients, opening cost, overlap with your first location</li></ul><p>Your inputs are not checked facts; the result is only as good as they are.</p><p><a href="/demo/price-change">Price change decision</a> · <a href="/demo/hiring-decision">Hiring decision</a> · <a href="/decision-review">Founder Decision Review</a></p>`,
    // ---- Formerly the "renders after JavaScript loads" fallback (GEO audit
    // 2026-11-08). Text is the live page's own copy; runtime numbers (DB rows,
    // status checks, dates) are left out. Prices come from src/config.
    "/app": `<p class="q-lede">Deterministic math · AI-written narrative. Fill in what you know. Every number feeds directly into your payback period and verdict — this is the real math behind the decision, not a preview.</p><h2>Step 1 · Business</h2><ul><li>Industry: Coffee Shop, SaaS, Ecommerce, Restaurant, Fitness, Consulting, Retail, Real Estate</li><li>Location: required for geo-calibrated benchmarks</li><li>Describe your idea: we'll turn this into a clear, structured decision statement</li></ul><p>No idea yet? Try a sample or generate one.</p><h2>You'll receive</h2><ul><li>36-month P&amp;L</li><li>Stress Map</li><li>Break-even</li><li>Geo-calibrated</li><li>Failure scenarios</li><li>Risk flags</li><li>Mitigation plan</li></ul><h2>Preview Mode</h2><p>Try one run without an account. A free account gives you ${TIER_FACTS.freeRuns} complete Decision Runs a month (full report, scenarios, pre-mortem) and saves your work. No card required.</p><p><a href="/auth">Sign In</a> · <a href="/pricing">Pricing</a> · <a href="/methodology">Methodology</a></p>`,
    "/blog": `<p class="q-lede">Validation Insights for Founders. Financial structuring, unit economics, and using AI to de-risk your next venture.</p><ul><li><a href="/blog/validate-startup-idea-using-ai">How to Validate a Startup Idea Using AI (Step-by-Step Guide)</a></li><li><a href="/blog/5-financial-mistakes-early-founders-make">5 Financial Mistakes Early Founders Make (And How to Avoid Them)</a></li><li><a href="/blog/ai-vs-traditional-business-planning">AI vs Traditional Business Planning: What's Faster and Safer?</a></li><li><a href="/blog/how-to-calculate-startup-costs">How to Calculate Startup Costs for Any Business Idea (2026 Guide)</a></li><li><a href="/blog/unit-economics-explained-for-founders">Unit Economics Explained: CAC, LTV, and Payback Period for Founders</a></li><li><a href="/blog/how-to-stress-test-your-startup">How to Stress-Test Your Startup Before Launch (2026 Guide)</a></li><li><a href="/blog/startup-validation-checklist">Startup Validation Checklist: 7 Questions Before You Build</a></li><li><a href="/blog/ai-vs-spreadsheets-startup-planning">AI vs Spreadsheets: Which Is Better for Startup Financial Planning?</a></li><li><a href="/blog/coffee-shop-startup-costs-by-city">Coffee Shop Startup Costs: Denver vs Austin vs NYC</a></li><li><a href="/blog/food-truck-profit-calculator">Food Truck Profit Calculator: Revenue, Costs &amp; ROI by City (2026)</a></li><li><a href="/blog/how-to-validate-restaurant-idea">How to Validate a Restaurant Idea Before Signing a Lease (2026 Guide)</a></li><li><a href="/blog/business-validation-for-financial-clients">Business Validation for Financial Clients Explained</a></li></ul><h2>Comparing tools?</h2><p>Side-by-side notes on what each tool does, including where it is the better choice.</p><h2>Ready to validate your idea?</h2><p>Revenue projections, risk flags, and a clear action plan — free.</p><p><a href="/examples">View all examples</a> · <a href="/vs/liveplan">Quantis vs LivePlan</a> · <a href="/app">See my numbers — free</a></p>`,
    "/risk-gallery": `<p class="q-lede">Illustrative scenarios built on the assumptions listed on each card, not real companies or customer data. See how revenue shocks, cost spikes, and slowdowns can affect survival.</p><h2>Stress-tested business models</h2><ul><li>SaaS startup stress-test example: Fragile. Needs to cut churn below 3% or raise ARPU to survive a downturn.</li><li>Gym expansion risk analysis: Conditionally viable. Location 2 is the fragile point — delay unless membership pipeline is confirmed.</li><li>Marketplace business model stress test: Promising but margin-thin. A 3% take-rate cut by a competitor would be fatal.</li><li>DTC e-commerce financial stress test: Viable at current scale. Q4 ad cost spikes are the biggest threat — pre-invest in retention.</li><li>Agency revenue concentration risk: High concentration risk. Revenue depends on too few clients — diversify or lock contracts.</li><li>Food truck break-even stress test</li><li>HR SaaS unit economics analysis: Healthy fundamentals. Shift acquisition to content and test a price increase.</li><li>Coworking space occupancy risk model: Under water until occupancy hits 70%. Meeting rooms are the fastest path to break-even.</li><li>Freemium app retention stress test: Unit economics work only if retention improves. Focus on activation before scaling spend.</li></ul><h2>Ready to stress-test your own model?</h2><p>Test your own numbers. Get structured revenue projections, risk signals, and an action plan — free.</p><p><a href="/app">Run a similar stress test</a> · <a href="/methodology">Methodology</a></p>`,
    "/leaderboard": `<p class="q-lede">Shared analyses appear here, anonymized and ranked by score. Only ideas with a public share link appear here.</p><p>Each entry shows the industry, the location, an idea score out of 10, monthly profit, net margin and payback period. When there are no shared analyses yet, the rows shown are illustrative samples, marked Sample.</p><h2>Want to appear on the leaderboard?</h2><p>Run an analysis, then click "Share Link" on your results. Shared analyses automatically appear here when they score in the top 10.</p><p>Run an analysis and click "Share Link" to join the leaderboard.</p><p><a href="/app">Validate My Idea — Free</a> · <a href="/examples">Worked examples</a></p>`,
    "/research": `<p class="q-lede">Artificial Intelligence Wave-Matter Causality. This research introduces the "AIWMC Quantis" — the smallest irreducible unit of causal influence within a model. We propose that Quantis are not static components but dynamic, transient structures, and present three falsifiable hypotheses to develop novel analysis techniques based on field theory, phase transitions, and a new information metric.</p><p>Current Status: Pre-Discovery</p><h2>Formal Definition</h2><p>A research paradigm that models AI internals as an interplay between distributed, wave-like potential fields and discrete, matter-like computational events. The fundamental unit of analysis is the Quantis: the smallest unit of causal influence that produces a state change with measurable information content.</p><h2>Hypothesis 1: The Quantis Field</h2><p>The fundamental unit of representation is not a discrete neuron but a "Quantis Field" — a pattern of potential influence distributed across thousands of parameters.</p><h2>Hypothesis 2: Causal Phase Transitions</h2><p>Emergent abilities and catastrophic forgetting are not smooth processes but first-order phase transitions in the model's causal graph.</p><h2>Hypothesis 3: Quantis Information Metric (QIM)</h2><p>The failure of models to distinguish truth from falsehood (hallucinations) stems from reliance on activation magnitude as a proxy for confidence. We propose a new composite metric: QIM = A × C.</p><h2>Pilot Experiment: "Grokking a Quantis"</h2><p>This experiment is designed to be the simplest possible test for a collective Quantis phenomenon, targeting the well-documented grokking transition.</p><p><a href="/methodology">View full methodology &amp; safety levels</a></p>`,
    "/status": `<p class="q-lede">Live health of each monitored component. "Unmonitored" means there is no live health signal for that component yet — it is not claimed as operational when we cannot actually verify it.</p><h2>Monitored components</h2><ul><li>Database: Accounts, subscriptions, usage tracking, analysis history</li><li>Authentication: Sign in, sign up, session validation</li><li>Analysis Engine (deterministic): Financial calculations, RVCE, invariant safety checks</li><li>AI Narrative Generation: AI-authored commentary layered on top of the deterministic numbers</li><li>Billing: Checkout, Stripe webhooks, subscription sync</li><li>RVCE / Benchmark Corpus: Industry and location benchmark data backing comparisons</li><li>Report / PDF Generation: Business plan document and PDF export</li></ul><p>AI Narrative Generation is tracked separately from the deterministic engine: the financial calculations do not depend on AI output being available.</p><h2>Incident History</h2><p>Each incident is listed with its component, severity, status and summary.</p><h2>Reporting an Issue</h2><p>If you're experiencing a problem not reflected here, email support@aiwmcquantis.com. Include your account email, the time of the issue, and a screenshot of any error message.</p><p><a href="/changelog">View changelog</a> · <a href="/state-of-quantis">State of Quantis</a> · <a href="/security">Security posture</a></p>`,
    "/security": `<p class="q-lede">You upload financial documents. We treat them with the rigor that demands. Below is exactly what we do — concrete, verifiable, no marketing language.</p><h2>Encryption</h2><ul><li>In transit: HTTPS/TLS enforced on all endpoints.</li><li>At rest: AES-256 encryption on all database storage and object storage (managed by Supabase / AWS).</li><li>Sensitive fields: brand-profile phone numbers are stored encrypted at the column level. We never store card numbers, CVVs, or full billing addresses ourselves — Stripe handles that directly.</li><li>Documents you upload: processed in-memory in our edge functions; not retained beyond the analysis lifecycle unless you explicitly save them.</li></ul><h2>Data isolation (Row-Level Security)</h2><p>Admin access is restricted to a single founder account, gated by a database-level role check (not a client-side flag).</p><h2>Privacy &amp; PII handling</h2><ul><li>Anonymous analyses are tracked by hashed device fingerprints, IP addresses, and idea content.</li><li>Email addresses for lead capture are encrypted before storage; we hold a hash for deduplication.</li><li>You can request export or deletion of your data at any time by emailing privacy@aiwmcquantis.com.</li></ul><h2>Anomaly detection &amp; abuse prevention</h2><p>Anonymous endpoints rate-limit by device, fingerprint, and hashed IP. Every entitlement denial (a Free user trying to access a paid feature) is logged for review.</p><h2>Vulnerability Disclosure</h2><p>Found a security issue? Email security@aiwmcquantis.com with reproduction steps. Please do not test against other users' accounts.</p><p><a href="/status">System status</a> · <a href="/privacy">Privacy policy</a> · <a href="/terms">Terms</a></p>`,
    "/connect": `<p class="q-lede">Join our founder community across every channel — pick the platform that works for you.</p><ul><li>LinkedIn (@aiwmc): Company updates, founder insights, and product announcements.</li><li>X (Twitter) (@aiwmcx1): Real-time insights, startup tips, and founder community threads.</li><li>Telegram (@aiwmcx): Short posts from the founder: what we are building, money lessons and demos.</li><li>Facebook (AIWMC): News and community discussions.</li><li>Instagram (@wmc.ai): Behind-the-scenes, visual content, and product showcases.</li><li>GitHub (@AIWMCX): Release notes and technical roadmap.</li><li>Threads (@wmc.ai): Long-form updates, threads, and community conversations.</li><li>Whop (@aiwmc): Membership, community access, and paid offers.</li></ul><p>Try AIWMC Quantis free. Validate your business idea · No credit card required</p><p><a href="/app">Try AIWMC Quantis free</a> · <a href="/pricing">Pricing</a></p>`,
    "/refund-policy": `<p class="q-lede">14-day money-back guarantee on subscriptions. Try Plus or Pro for 14 days. If it doesn't deliver value, we refund the full amount.</p><h2>How to Request a Refund</h2><ul><li>Email support@aiwmcquantis.com from the address on your account.</li><li>Include the subject line "Refund request" so we route it correctly.</li><li>Optionally tell us why — it helps us improve, but it's not required.</li></ul><h2>Founder Decision Review ($${OFFER_PRICES.review}) &amp; Consultant Founding Pilot ($${OFFER_PRICES.pilot})</h2><p>These one-time, founder-assisted engagements are not covered by the 14-day subscription policy below — they have their own terms. After substantive work begins, the engagement is non-refundable, except when AIWMC LLC cannot deliver the agreed scope or where applicable law requires otherwise.</p><h2>What's eligible (subscription plans only)</h2><p>All paid subscription plans — Plus Monthly, Plus Annual, Pro Monthly, Pro Annual — are eligible for a full refund within 14 days of the first successful charge. This includes annual plans where you paid the full year upfront.</p><h2>Trials and refunds</h2><p>If you start with a 14-day trial, you can cancel any time during the trial without being charged at all. The 14-day refund window starts on the date you're first charged, not the date you signed up.</p><p><a href="/pricing">Pricing</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a></p>`,
    "/changelog": `<p class="q-lede">Every feature, security improvement, and bug fix we ship — dated, versioned, and explained.</p><h2>October 25, 2026 · v2.8.0 · Sources, numbers and inputs you can check</h2><ul><li>Benchmark citations now say "Quantis modeled benchmark".</li><li>The result header no longer shows a fixed run time or a fixed AI-agreement score; both appear only when measured.</li><li>Location coverage is stated as it is: 15 US metros plus a US-average baseline.</li><li>Hiring decisions typed on the homepage now open the hiring model, which compares cash with and without the hire, instead of being analysed as a new business.</li></ul><h2>October 24, 2026 · v2.7.0 · Monte Carlo on every report, saved free runs, sample Decision Memo</h2><ul><li>Every report now shows a monthly profit range (low, typical, high) from 1,000 simulated months, with its assumptions printed next to it.</li><li>A sample Decision Memo shows exactly what the Founder Decision Review delivers, worked through on a fictional business.</li></ul><h2>August 27, 2026 · v2.6.0 · Benchmark reconciliation + export safeguards</h2><ul><li>Exporting a report that failed an internal consistency check now requires an explicit confirmation before download, instead of silently allowing a normal-looking export.</li><li>Published a formal security-disclosure policy (security.txt) so security researchers have a documented, direct way to report issues.</li></ul><p><a href="/methodology">Methodology</a> · <a href="/status">Status</a> · <a href="/security">Security</a></p>`,
    "/privacy": `<p class="q-lede">Last updated: November 3, 2026. AIWMC Quantis is operated by AIWMC LLC, a Colorado limited liability company. This privacy policy explains how we collect, use, store, and protect your information when you use our business decision-modeling service, which calculates figures with deterministic code and uses AI models to write narrative commentary.</p><h2>2. Information We Collect</h2><ul><li>Account information (email address, name, phone number)</li><li>Business ideas and location data submitted for analysis</li><li>Payment information (processed securely by Stripe)</li></ul><h2>4. Data Security</h2><ul><li>Encryption in transit: the site and our APIs are served only over HTTPS (TLS), with HSTS</li><li>Row-Level Security (RLS) on database tables</li></ul><h2>5. Third-Party Services</h2><p>Financial calculations remain deterministic and do not depend on which narrative provider handled a given request.</p><h2>6. Your Rights (GDPR/CCPA)</h2><p>To exercise these rights, contact us at privacy@aiwmcquantis.com</p><h2>8. Cookies and Tracking</h2><p>Optional cookies and trackers load only if you accept them in the banner shown on your first visit. Rejecting is as easy as accepting, and the site works the same either way. If your browser sends a Global Privacy Control (GPC) signal, we treat it as a rejection.</p><p><a href="/terms">Terms</a> · <a href="/ai-policy">AI policy</a> · <a href="/refund-policy">Refund policy</a></p>`,
    "/terms": `<p class="q-lede">Last updated: November 3, 2026. AIWMC Quantis ("the Service") is operated by AIWMC LLC, a Colorado limited liability company. By accessing or using the Service, you agree to be bound by these Terms of Service.</p><h2>2. Description of Service</h2><p>AIWMC Quantis is decision-support software for testing business decisions. The Service is decision support. It is not legal, tax, accounting, investment or lending advice, and it does not make decisions for you.</p><h2>3. User Accounts</h2><p>You must be at least 18 years old and able to form a binding contract to create an account or use the Service.</p><h2>4. Subscription Plans &amp; Payment</h2><p>Payments are processed securely by Stripe. Subscriptions are billed either monthly or annually, depending on the plan you select at checkout, and automatically renew at the end of each billing period unless cancelled. You may cancel at any time through your account settings.</p><h2>7. Disclaimer of Warranties</h2><p>Our analyses are informational tools and should not replace professional business, legal, or financial advice. AI-generated text can be wrong or can describe the figures imprecisely; the calculated figures in the report take precedence over any AI-written text.</p><h2>11. Governing Law</h2><p>These Terms shall be governed by and construed in accordance with the laws of the State of Colorado, United States, without regard to its conflict of law provisions.</p><p><a href="/ai-policy">AI Policy</a> · <a href="/refund-policy">Refund Policy</a> · <a href="/dmca">Copyright / DMCA page</a></p>`,
    "/vs/foundra": `<p class="q-lede">Foundra runs a 3-phase conversation and hands you 15 strategy cards — target customer, objection map, MVP scope. That's real, useful work. It is not a financial model. Quantis starts where that conversation ends: a deterministic engine computes the financial model, runs a 1,000-iteration Monte Carlo around it, and labels whether each number is your input or a modeled benchmark.</p><h2>What Foundra says about itself</h2><p>"Validate your startup idea before you build." (foundra.ai)</p><h2>Quantis vs Foundra — side by side</h2><ul><li>Core output. Quantis: deterministic financial verdict: viability score, P10/P50/P90 monthly-profit range, prioritized risk map. Foundra: 15 strategy cards (Idea Snapshot, Target Customer Profile, Objection Map, MVP Scope, Launch Checklist, etc.) from a guided conversation.</li><li>Financial modeling. Quantis: deterministic engine, then a 1,000-iteration Monte Carlo. Foundra: not described as a feature — the product is conversation and strategy-card generation, not quantitative modeling.</li></ul><h2>Is Foundra a Quantis competitor or a complement?</h2><p>Both, depending on what you need. Quantis is the quantitative layer — the actual financial model with labeled assumptions. Some founders reasonably use both: Foundra to think through the strategy, Quantis to pressure-test the numbers.</p><p><a href="/how-it-works">How It Works</a> · <a href="/methodology">Methodology</a> · <a href="/pricing">Pricing</a></p>`,
    "/vs/aicofounder": `<p class="q-lede">AI Co-Founder talks you through building — research, planning, identifying your single biggest blocker. It's a genuinely different tool than Quantis, not a worse one: it's conversational guidance for the building process, while Quantis is a deterministic financial verdict for the validation decision.</p><h2>Quantis vs AI Co-Founder — side by side</h2><ul><li>Core output. Quantis: deterministic financial verdict with labeled assumptions — a validation decision. AI Co-Founder: guided planning, market research via AI agents, task lists, and a visual canvas — a building companion.</li><li>Financial modeling. Quantis: deterministic engine, 1,000-iteration Monte Carlo, labeled assumptions. AI Co-Founder: not described as a feature — conversational and qualitative guidance, no quantitative financial output.</li></ul><h2>Should I switch from AI Co-Founder to Quantis?</h2><p>Probably not "switch" — the tools do different jobs. AI Co-Founder helps you build and plan through conversation.</p><h2>Does AI Co-Founder do financial projections?</h2><p>Not as a described feature — it focuses on research, planning, and identifying blockers conversationally.</p><p><a href="/how-it-works">How It Works</a> · <a href="/methodology">Methodology</a> · <a href="/pricing">Pricing</a></p>`,
    "/vs/chatgpt": `<p class="q-lede">You can absolutely ask ChatGPT to validate your business idea.</p><h2>Isn't Quantis just ChatGPT with extra steps?</h2><p>No — the deterministic engine is the core difference. ChatGPT (and every general LLM) generates financial numbers as plausible-sounding text. Quantis computes them with a deterministic math engine first, matches against 97,500 modeled benchmark rows, and only then lets AI narrate the result. If the AI layer fails entirely, Quantis still returns the deterministic numbers.</p><h2>Quantis vs ChatGPT — side by side</h2><ul><li>Consistency across runs. Quantis: deterministic — the same inputs produce the same core numbers every time. ChatGPT: non-deterministic — re-running the same prompt can produce materially different numbers.</li></ul><h2>Can I trust the financial numbers ChatGPT gives me for a business idea?</h2><p>Treat them as a starting conversation, not a verdict. A general LLM has no persistent benchmark database and no requirement to cite a source for a number it generates — it can sound equally confident whether the figure is accurate or invented.</p><p><a href="/how-it-works">How It Works</a> · <a href="/methodology">Methodology</a> · <a href="/pricing">Pricing</a></p>`,
    "/consultant-pilot": `<p class="q-lede">For consultants, fractional CFOs and advisors: bring two real client decisions within 30 days. Quantis structures each model, a founder reconciles the economics, and you receive a Decision Memo per case that you can review and put your name on.</p><h2>What the pilot includes</h2><ul><li>Two client cases submitted within 30 days</li><li>Founder-led pilot setup and structured intake</li><li>Three scenarios and reconciled economics per case</li><li>Source and uncertainty register per case</li><li>Two consultant-ready Decision Memos</li><li>One review and one revision per case</li></ul><p>It is decision support with explicit limitations, not a guarantee of any outcome.</p><p><a href="/demo/consultant-founding-pilot">See the interactive demo</a> · <a href="/consultants">Quantis for advisors</a> · <a href="/decision-review">Founder Decision Review</a></p>`,
    "/decision-review": `<p class="q-lede">Choose a founder-assisted engagement for a real decision with a deadline. Quantis structures the assumptions, reconciles the financial model, stress-tests the downside, and delivers an inspectable decision memo.</p><h2>Founder Decision Review — $349</h2><ul><li>One active founder decision</li><li>Structured intake and fact-versus-assumption register</li><li>Base, downside, and upside scenarios</li><li>Reconciled revenue, contribution, cash, break-even, and payback</li><li>Five fragile assumptions, decision memo, review call, and one revision</li></ul><h2>Consultant Founding Pilot — $499</h2><ul><li>Two client cases completed within 30 days</li><li>Founder-led setup and quality review</li><li>One inspectable decision memo and review per case</li><li>One revision per case</li></ul><p>These engagements provide decision support, not accounting, tax, investment, lending, or legal advice. Payment is collected before work begins. The delivery clock begins after a complete intake.</p><p><a href="/terms">Terms</a> · <a href="/refund-policy">Refund policy</a> · <a href="/privacy">Privacy</a></p>`,
    "/how-it-works": `<p class="q-lede">Describe the decision and its assumptions. Quantis returns a modeled financial scenario with visible inputs, limitations, top risks, and an action plan.</p>${layerList}${pricing}`,
    "/methodology": `<p class="q-lede">Quantis separates deterministic formulas, modeled benchmark ranges, scenario simulation, and AI narration. Its 97,500 benchmark cells are a rule-generated grid—not 97,500 observed companies—and dataset references are not linked one-to-one to individual cells.</p><h2>Coverage and limitations</h2><ul><li>Five tables of 19,500 modeled cells: core ratios, unit economics, geography, risk, and invoicing</li><li>Country and region coverage is uneven; local conditions require direct evidence</li><li>Grid cells have no per-row source, period, or quality-grade lineage</li><li>Standard outputs do not constitute audited accounting, tax, investment, lending, or legal advice</li></ul>${layerList}<p><a href="/research">See the research</a> · <a href="/security">Security posture</a></p>`,
    "/use-cases": `<p class="q-lede">AIWMC Quantis is built for founders stress-testing their own ideas, consultants validating client ideas, and small teams building financial models faster than a spreadsheet allows.</p><h2>Common uses</h2><ul><li>Pre-launch stress test before signing a lease or writing code</li><li>Financial-consulting intake with explicit assumptions and modeled ranges</li><li>Base and downside cases with visible limitations</li><li>Sensitivity analysis on the variables that make or break the model</li></ul>${pricing}`,
    "/consultants": `<p class="q-lede">Use Quantis to structure a client pre-screen, challenge assumptions, and prepare a reviewable decision artifact. The engine combines a 97,500-cell modeled grid, 1,000 scenario iterations, and external checks when evidence is available; professional judgment remains essential.</p><h2>How consultants use it</h2><ul><li>Client pre-screening before committing delivery capacity</li><li>Assumption and scenario review with calculations separated from narration</li><li>Periodic re-validation when client evidence or operating conditions change</li></ul><h2>Branding and delivery</h2><p>Plus adds a consultant logo and colors while retaining Quantis attribution. Pro can remove Quantis branding entirely. Exports distinguish user inputs, deterministic calculations, modeled ranges, and available validation status; per-cell source lineage is not yet available.</p>${layerList}${pricing}<p><a href="/examples/coffee-shop-denver">See an illustrative sample</a> · <a href="/methodology">Read the methodology</a></p>`,
    "/": `<p class="q-lede">Describe a business decision. Get a modeled financial scenario with visible assumptions, top risks, limitations, and an action plan. The financial engine runs before AI narration.</p>${layerList}${pricing}<p><a href="/app">Try a free analysis</a> · <a href="/examples">See worked examples</a></p>`,
    "/vs/liveplan": `<p class="q-lede">LivePlan combines business planning, forecasts, scenarios, accounting integrations, and performance tracking. Quantis focuses on financial pre-mortem and assumption stress-testing. Different jobs.</p><h2>Where LivePlan is established</h2><ul><li>Full forecast statements and lender-oriented planning</li><li>QuickBooks and Xero integrations</li><li>A large sample-plan library, human onboarding, and support</li></ul><h2>Quantis focus</h2><ul><li>Expose which assumptions control the decision</li><li>Model scenario ranges and failure conditions</li><li>Keep inputs, calculations, modeled ranges, evidence, and limitations visibly distinct</li></ul>${pricing}`,
    "/vs/upmetrics": `<p class="q-lede">Upmetrics combines business-plan drafting, financial forecasting, pitch creation, collaboration, research, and professional services. Quantis focuses on financial pre-mortem and decision thresholds.</p><h2>Trade-offs</h2><ul><li>Upmetrics emphasizes a broad planning and presentation workflow</li><li>Quantis emphasizes explicit assumptions, scenario fragility, and the conditions required for a decision to work</li></ul>${pricing}`,
    "/vs/bizplanr": `<p class="q-lede">Bizplanr and Quantis address different stages of business planning. Compare the current product pages before choosing.</p><h2>Which workflow do you need?</h2><ul><li>Choose a plan generator when the main job is drafting a formatted narrative</li><li>Choose Quantis when the main job is stress-testing assumptions and finding the financial threshold that changes a decision</li></ul>${pricing}`,
    // Every example link, so crawlers that skip JavaScript reach all of them
    // (the live page shows 12 cards and a "Load more" button).
    "/examples": `<p class="q-lede">Each example is illustrative: modeled finances for one business type in one place, with its assumptions stated. None is a real company.</p><h2>All examples</h2><ul>${Object.entries(EXAMPLES).sort((a, b) => a[1].title.localeCompare(b[1].title)).map(([slug, ex]) => `<li><a href="/examples/${escapeHtml(slug)}">${escapeHtml(ex.title)}</a></li>`).join("")}</ul><p><a href="/app">Run your own analysis</a> · <a href="/methodology">Read the methodology</a></p>`,
    "/ai-policy": `<p class="q-lede">How AIWMC Quantis, operated by AIWMC LLC, uses AI.</p><h2>What is calculated, not generated</h2><p>Revenue, costs, cash, break-even, payback and the base, downside and upside scenarios are computed by a deterministic financial engine. Each report runs 1,000 seeded scenario iterations and shows a P10/P50/P90 range: a range, not a prediction.</p><h2>What AI does</h2><p>A third-party language model classifies the idea and writes the narrative around the calculated figures. AI-written text can be wrong; the calculated figures take precedence.</p><h2>What AI does not do</h2><p>No legal, tax, accounting, investment or lending advice, and no automated decisions with legal or similarly significant effects.</p><h2>Providers</h2><p>DeepSeek (primary), Anthropic (fallback), Dahl gateway (controlled rollout). We do not train models of our own on your inputs.</p><p><a href="/terms">Terms</a> · <a href="/privacy">Privacy</a> · <a href="/decision-review">Human review</a></p>`,
    "/dmca": `<p class="q-lede">AIWMC LLC responds to notices of alleged copyright infringement under 17 U.S.C. §512.</p><h2>Where to send notices</h2><p>Email legal@aiwmcquantis.com or write to AIWMC LLC, Attn: Copyright, Denver, Colorado, USA.</p><h2>What a notice must include</h2><p>The elements required by 17 U.S.C. §512(c)(3): signature, the work, the infringing material and its location, your contact details, a good-faith statement, and an accuracy statement under penalty of perjury.</p><h2>Counter-notice</h2><p>If your material was removed by mistake, send a counter-notice with the elements of §512(g)(3).</p><h2>Repeat infringers</h2><p>Accounts of repeat infringers may be terminated. Knowingly false claims can create liability under §512(f).</p><p><a href="/terms">Terms</a></p>`,
    "/state-of-quantis": `<p class="q-lede">An honest account of what Quantis does, what it does not guarantee, and where financial calculations end and AI narration begins.</p><h2>What Quantis does</h2><p>Quantis runs deterministic financial calculations, 1,000 scenario iterations, and a modeled 97,500-cell coverage grid, then produces a decision-support report with bounded AI narration.</p><h2>What Quantis does not guarantee</h2><ul><li>Quantis does not guarantee a business outcome or predict what will happen to a specific business.</li><li>Modeled cells are not observed companies, local coverage is uneven, and per-cell source lineage is not available.</li><li>Automated integrity checks reduce contradictions but do not prove forecast accuracy.</li></ul><h2>Calculation and narration</h2><p>Canonical financial outputs are calculated before narration. The methodology page documents exclusions, evidence limits, and places where direct professional review is still required.</p><p><a href="/status">Reliability history</a> · <a href="/security">Security posture</a></p>`,
  }[routePath];

  // No generic fallback: a route without its own body fails the build here
  // instead of shipping a placeholder (verify-visibility.mjs checks it too).
  if (!routeSpecific) throw new Error(`generate-static-bodies: no static body for ${routePath}. Write one from the page's own copy.`);
  const body = routeSpecific;

  return `<article><h1>${escapeHtml(H1)}</h1>${body}</article>`;
}

function bodyForRoute(routePath) {
  const demo = DEMO_BODIES[routePath];
  if (demo) return `<article><h1>${escapeHtml(demo.h1)}</h1>${demo.body}</article>`;
  if (routePath.startsWith("/examples/")) return renderExampleBody(routePath.slice("/examples/".length));
  if (routePath.startsWith("/blog/")) return renderBlogBody(routePath.slice("/blog/".length));
  return renderCoreBody(routePath);
}

// -----------------------------------------------------------------------------
// Injection into dist/<route>/index.html
// -----------------------------------------------------------------------------

// Scoped typography: Tailwind's preflight (loaded before first paint) resets
// h1/h2/ul to unstyled, so the static body styles itself. Colours inherit from
// the app's body (bg-background / text-foreground).
const STATIC_STYLE = "<style>"
  + "#q-static-content{max-width:920px;margin:0 auto;padding:48px 20px 64px;line-height:1.6;font-size:16px}"
  + "#q-static-content h1{font-size:clamp(1.75rem,4vw,2.5rem);line-height:1.15;font-weight:700;letter-spacing:-0.01em;margin:0 0 1rem}"
  + "#q-static-content h2{font-size:1.25rem;line-height:1.3;font-weight:600;margin:2rem 0 .5rem}"
  + "#q-static-content p,#q-static-content ul,#q-static-content ol,#q-static-content table{margin:0 0 1rem}"
  + "#q-static-content ul{list-style:disc;padding-left:1.25rem}"
  + "#q-static-content ol{list-style:decimal;padding-left:1.25rem}"
  + "#q-static-content li{margin:.25rem 0}"
  + "#q-static-content a{color:inherit;text-decoration:underline}"
  + "#q-static-content .q-lede{font-size:1.125rem}"
  + "#q-static-content .q-note{font-size:.875rem;opacity:.8}"
  + "#q-static-content table{border-collapse:collapse}"
  + "#q-static-content td,#q-static-content th{padding:6px 10px;text-align:left;vertical-align:top;border-bottom:1px solid rgba(127,127,127,.25)}"
  + "</style>";

// dist/index.html (the "/" body) is also what vercel.json rewrites serve for
// SPA-only paths (/auth, /admin, /r/..., /app/...). On those URLs the
// homepage text must not flash before React mounts, so this removes the block
// when the path is not the route it was written for. On its own route nothing
// is removed or hidden: crawlers and visitors get the same text.
const ROUTE_GUARD = String.raw`<script>(function(){var e=document.getElementById("q-static-content");var p=location.pathname.replace(/\/+$/,"")||"/";if(e&&e.getAttribute("data-route")!==p)e.parentNode.removeChild(e)})()</script>`;

/** Put the per-route body inside <div id="root"> as ordinary markup (not
 *  <noscript>). src/main.tsx calls createRoot(...).render(), which replaces
 *  #root's children on mount; there is no hydrateRoot, so nothing has to
 *  match. index.html marks the spot with a `q-static-body` comment. */
function injectStaticBody(html, staticBody, routePath) {
  const marker = /<!-- q-static-body:[\s\S]*?-->/;
  if (!marker.test(html)) {
    throw new Error("generate-static-bodies: the q-static-body marker inside #root is missing from dist/index.html");
  }
  const block = `<div id="q-static-content" data-route="${escapeHtml(routePath)}">${STATIC_STYLE}${staticBody}</div>${ROUTE_GUARD}`;
  // Function replacement: bodies contain "$17" etc., which a string
  // replacement would read as backreferences.
  return html.replace(marker, () => block);
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

function main() {
  const templatePath = path.join(DIST, "index.html");
  if (!existsSync(templatePath)) {
    console.error("generate-static-bodies: dist/index.html not found. Run `vite build` first.");
    process.exit(1);
  }
  const template = readFileSync(templatePath, "utf8");

  let written = 0;
  for (const route of PUBLIC_ROUTES) {
    const routePath = route.path;
    const body = bodyForRoute(routePath);
    const html = injectStaticBody(template, body, routePath);

    if (routePath === "/") {
      writeFileSync(templatePath, html, "utf8");
    } else {
      const outDir = path.join(DIST, ...routePath.split("/").filter(Boolean));
      mkdirSync(outDir, { recursive: true });
      writeFileSync(path.join(outDir, "index.html"), html, "utf8");
    }
    written++;
  }

  console.log(`generate-static-bodies: wrote unique static bodies for ${written} routes.`);
}

main();
