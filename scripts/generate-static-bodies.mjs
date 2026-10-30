// =============================================================================
// scripts/generate-static-bodies.mjs — Browser-free per-route static bodies.
//
// WHY THIS EXISTS: earlier attempts used Puppeteer to render each route in a
// headless browser and capture its DOM. That approach failed reliably on
// Lovable's publish container ("Publishing failed due to a temporary issue")
// because headless Chrome needs system libraries the container lacks. Rather
// than fight the container, this script generates real, informative,
// per-route <noscript> content directly from the route registry + structured
// data sources (exampleData, canonical facts, TIERS pricing). Zero browser,
// zero binary dependencies, runs in ~200ms.
//
// The output is written INTO each dist/<route>/index.html BEFORE prerender-seo.ts
// re-stamps the head. Crawlers that don't execute JS (which is most SEO
// crawlers on first pass, plus every AI training crawler) see rich, unique,
// route-specific text for every one of the 84 public routes. React hydration
// unchanged.
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
    "/blog": "AIWMC Quantis — writing on validation, unit economics, financial modeling",
    "/risk-gallery": "Risk gallery — the failure modes Quantis models for",
    "/leaderboard": "Public leaderboard of stress-tested ideas",
    "/research": "Research — how the deterministic engine and benchmarks work",
    "/status": "System status",
    "/state-of-quantis": "State of Quantis",
    "/security": "Security posture and disclosures",
    "/refund-policy": "Refund policy",
    "/decision-review": "Founder Decision Review and Consultant Founding Pilot",
    "/consultant-pilot": "Consultant Founding Pilot: two real client decisions, each reviewed by a founder",
    "/changelog": "Changelog",
    "/privacy": "Privacy policy",
    "/terms": "Terms of service",
    "/app": "Run a Quantis analysis",
    "/consultants": "Quantis for consultants — client pre-screening",
    "/vs/liveplan": "AIWMC Quantis vs LivePlan — honest comparison",
    "/vs/upmetrics": "AIWMC Quantis vs Upmetrics — honest comparison",
    "/vs/bizplanr": "AIWMC Quantis vs Bizplanr — honest comparison",
  }[routePath] ?? "AIWMC Quantis";

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
    "/demo/price-change": `<p class="q-lede">Before you change your price, know how many clients you can afford to lose. Put in your clients, price, margin and cash; Quantis compares cash with and without the change over 18 months.</p><h2>What it shows</h2><ul><li>Cash with and without the change, month by month</li><li>How many clients you can lose and still earn the same gross profit</li><li>When the change pays off, and the boundary for each guess</li></ul><p>Your inputs are not checked facts; the result is only as good as they are.</p><p><a href="/demo/hiring-decision">Hiring decision</a> · <a href="/decision-review">Founder Decision Review</a></p>`,
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
    "/state-of-quantis": `<p class="q-lede">An honest account of what Quantis does, what it does not guarantee, and where financial calculations end and AI narration begins.</p><h2>What Quantis does</h2><p>Quantis runs deterministic financial calculations, 1,000 scenario iterations, and a modeled 97,500-cell coverage grid, then produces a decision-support report with bounded AI narration.</p><h2>What Quantis does not guarantee</h2><ul><li>Quantis does not guarantee a business outcome or predict what will happen to a specific business.</li><li>Modeled cells are not observed companies, local coverage is uneven, and per-cell source lineage is not available.</li><li>Automated integrity checks reduce contradictions but do not prove forecast accuracy.</li></ul><h2>Calculation and narration</h2><p>Canonical financial outputs are calculated before narration. The methodology page documents exclusions, evidence limits, and places where direct professional review is still required.</p><p><a href="/status">Reliability history</a> · <a href="/security">Security posture</a></p>`,
  }[routePath];

  const body = routeSpecific ?? `<p class="q-lede">${escapeHtml(H1)}. Full page content renders after JavaScript loads.</p>${layerList}`;

  return `<article><h1>${escapeHtml(H1)}</h1>${body}</article>`;
}

function bodyForRoute(routePath) {
  if (routePath.startsWith("/examples/")) return renderExampleBody(routePath.slice("/examples/".length));
  if (routePath.startsWith("/blog/")) return renderBlogBody(routePath.slice("/blog/".length));
  return renderCoreBody(routePath);
}

// -----------------------------------------------------------------------------
// Injection into dist/<route>/index.html
// -----------------------------------------------------------------------------

/** Replace the shared <noscript> fallback block with a per-route one.
 *  The shared block currently ships the homepage's 50-example list and
 *  full blog list to every route — that IS the duplicate-body bug. This
 *  replaces it entirely with a route-specific noscript block, which is
 *  what crawlers actually read for JS-disabled first passes. React
 *  hydration is unaffected (noscript is ignored when JS runs). */
function injectStaticBody(html, staticBody, routePath) {
  const perRouteNoscript = `
    <!-- Per-route static content — unique per URL, replaces the shared homepage fallback -->
    <noscript>
      <div id="q-static-content" style="max-width:920px;margin:40px auto;padding:0 20px;font-family:system-ui,sans-serif;color:#1a1a1a;line-height:1.6" data-route="${escapeHtml(routePath)}">
        ${staticBody}
      </div>
    </noscript>`;

  // Replace the entire outer <noscript>...</noscript> block that begins with
  // the "Static content for non-JS crawlers and SEO fallback" comment. This
  // targets ONLY that specific block, not the font-loading <noscript>s in
  // <head> (which don't have that leading comment).
  const noscriptRe = /<!-- Static content for non-JS crawlers and SEO fallback -->\s*<noscript>[\s\S]*?<\/noscript>/;

  if (noscriptRe.test(html)) {
    return html.replace(noscriptRe, perRouteNoscript.trim());
  }

  // Fallback: if the marker is gone, append before </body>.
  return html.replace(/<\/body>/, `${perRouteNoscript}\n  </body>`);
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
