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
      <p class="q-note">All figures are modeled by the Quantis deterministic engine using 97,500 real industry benchmarks across 46 sectors. Not a forecast — a stress-test on a set of stated assumptions. See <a href="/methodology">Methodology</a> for the full derivation.</p>
    `
    : `<p>Modeled example page. Detailed figures render after JavaScript loads.</p>`;

  return `
    <article>
      <h1>${escapeHtml(displayTitle)}</h1>
      <p class="q-lede">${escapeHtml(description)}</p>
      ${metrics}
      <h2>What Quantis does with this idea</h2>
      <p>The 8-layer analysis pipeline runs deterministic financial modeling first, then applies AI narration on top of numbers that were computed — never invented. Layer 8 (Reality Validation and Calibration Engine, RVCE) cross-checks the modeled projections against live market data before the report is returned.</p>
      <p>Free plan users get the full modeled scenario and the top three risks. Plus at $17/mo adds the 36-month P&amp;L, Monte Carlo simulation, and the Document Studio. Pro at $49/mo adds the 5-year projection and white-label PDF export.</p>
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
    "/examples": "Worked examples — real modeled analyses across 51 business types",
    "/blog": "AIWMC Quantis — writing on validation, unit economics, financial modeling",
    "/risk-gallery": "Risk gallery — the failure modes Quantis models for",
    "/leaderboard": "Public leaderboard of stress-tested ideas",
    "/research": "Research — how the deterministic engine and benchmarks work",
    "/cases": "Case studies of Quantis analyses",
    "/status": "System status",
    "/state-of-quantis": "State of Quantis",
    "/security": "Security posture and disclosures",
    "/refund-policy": "Refund policy",
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
    <h2>The 8-layer deterministic pipeline</h2>
    <ol>
      <li>Layer 1 — InputSanitizer plus NAICS classification of the described business</li>
      <li>Layer 2 — BenchmarkMatcher across 97,500 real industry data points, 46 sectors</li>
      <li>Layer 3 — CityMultiplierEngine adjusts for 51+ cities' cost bases</li>
      <li>Layer 4 — DeterministicFinancialEngine calculates 12 financial variables through 12 quality gates</li>
      <li>Layer 5 — MonteCarloEngine runs 1,000 iterations with P10/P50/P90 percentile projections</li>
      <li>Layer 6 — Edge Function model layer (classify, narrative, action plan, adversarial review)</li>
      <li>Layer 7 — SourceAttributor tags every number with the benchmark row it derived from</li>
      <li>Layer 8 — Reality Validation and Calibration Engine (RVCE): cross-checks projections against live market data</li>
    </ol>
  `;

  const pricing = `
    <h2>Pricing</h2>
    <table>
      <tr><th>Plan</th><th>Price</th><th>Included</th></tr>
      <tr><td>Free</td><td>$0</td><td>Base modeled scenario, top three risks, JSON export</td></tr>
      <tr><td>Plus</td><td>$17/mo</td><td>Unlimited analyses, 36-month P&amp;L, Monte Carlo, Document Studio (10 templates)</td></tr>
      <tr><td>Pro</td><td>$49/mo</td><td>Everything in Plus, 5-year projection, white-label PDF export, API access</td></tr>
    </table>
    <p>All plans include a 14-day free trial. Cancel any time from the billing portal.</p>
  `;

  const routeSpecific = {
    "/pricing": `${pricing}<p>Every plan runs the same 8-layer deterministic pipeline, including Layer 8 (Reality Validation and Calibration Engine, RVCE) — the plans differ only in analysis volume and export features, never in how the numbers are calculated. See <a href="/how-it-works">how it works</a> for the full pipeline.</p><p><a href="/app">Start free — no card required</a></p>`,
    "/how-it-works": `<p class="q-lede">Describe your business in one sentence. Quantis runs the 8-layer deterministic pipeline and returns a modeled financial scenario with sourced numbers, top risks, and an action plan.</p>${layerList}${pricing}`,
    "/methodology": `<p class="q-lede">Quantis calculates numbers deterministically before AI ever runs. AI writes the narrative around those numbers; it does not invent them. Layer 8 (RVCE) cross-validates the model against live market data before the report is returned.</p>${layerList}<p><a href="/research">See the research</a> · <a href="/security">Security posture</a></p>`,
    "/use-cases": `<p class="q-lede">AIWMC Quantis is built for founders stress-testing their own ideas, consultants validating client ideas, and small teams building financial models faster than a spreadsheet allows.</p><h2>Common uses</h2><ul><li>Pre-launch stress test on a business idea before signing a lease or writing code</li><li>Financial-consulting client intake and modeled projections</li><li>Investor-facing base case with sourced benchmarks and honest downside</li><li>Sensitivity analysis on the two or three variables that make or break the model</li></ul>${pricing}`,
    "/consultants": `<p class="q-lede">Run a client pre-screen. Deliver it under your own brand. A manual feasibility study costs 15 to 25 hours before a consultant bills a dollar; AIWMC Quantis replaces the mechanical work — 97,500 benchmarks, 1,000 Monte Carlo iterations, RVCE cross-validation via the 8-Layer deterministic pipeline — so those hours can go to judgment instead of spreadsheet construction.</p><h2>How consultants use it</h2><ul><li>Client pre-screening — know which engagements are viable before committing billable hours</li><li>Board-deck stress test — deterministic, reproducible numbers, built to be questioned line by line; the engine computes every financial number, the AI narrative layer never originates one</li><li>Quarterly re-validation — benchmarks move, so client plans should be re-run against current market data</li></ul><h2>Your brand on the cover</h2><p>Pro exports replace Quantis branding with the consultant firm's own — logo, company name, header, footer. Every number traces back to its benchmark citation, Monte Carlo distribution, or RVCE validation status underneath.</p>${layerList}${pricing}<p>A consultant charges $1,500-$25,000 (or $350/hr) for one stress-test. This is the one you can afford to run before you write the invoice.</p><p><a href="/examples/coffee-shop-denver">See a sample dossier</a> · <a href="/methodology">Read the methodology</a></p>`,
    "/": `<p class="q-lede">Describe a business idea. Get a modeled financial scenario with sourced numbers, top risks, and an action plan. Not AI-generated numbers dressed up as analysis: a deterministic engine that runs the math first, then uses AI only for narration.</p>${layerList}${pricing}<p><a href="/app">Try a free analysis</a> · <a href="/examples">See worked examples</a></p>`,
    "/vs/liveplan": `<p class="q-lede">LivePlan is a document-focused business-plan tool. AIWMC Quantis is a deterministic financial pre-mortem engine. Different jobs.</p><h2>Where LivePlan is stronger</h2><ul><li>Long-form document formatting for lenders</li><li>Template variety for traditional business plans</li></ul><h2>Where Quantis is stronger</h2><ul><li>Numbers informed by 97,500 benchmark data points instead of user-provided assumptions</li><li>Monte Carlo and Pre-Mortem stress tests as first-class features</li><li>Full audit trail — every number links to its benchmark source</li></ul>${pricing}`,
    "/vs/upmetrics": `<p class="q-lede">Upmetrics is an AI-first business plan writer. AIWMC Quantis is a deterministic financial engine with AI narration on top. The distinction matters when the numbers matter.</p><h2>Trade-offs</h2><ul><li>Upmetrics: fast AI-generated narrative, financial numbers depend on user input</li><li>Quantis: modeled numbers informed by benchmark data, AI narrates numbers it did not invent</li></ul>${pricing}`,
    "/vs/bizplanr": `<p class="q-lede">Bizplanr is an inexpensive AI business-plan generator. AIWMC Quantis is a financial pre-mortem tool with a different job.</p><h2>Which one you want depends on the job</h2><ul><li>Bizplanr: fastest path to a formatted document</li><li>Quantis: fastest path to a defensible modeled scenario with sourced numbers</li></ul>${pricing}`,
    "/state-of-quantis": `<p class="q-lede">An honest account of what Quantis does, what it does not guarantee, and where the deterministic engine ends and AI narration begins.</p><h2>What Quantis does</h2><p>Quantis runs a deterministic financial engine — 1,000-iteration Monte Carlo simulation across an 8-layer pipeline — against a 97,500-row benchmark corpus, and produces a financial verdict plus an AI-authored narrative layered on top of those numbers.</p><h2>What Quantis does not guarantee</h2><ul><li>Quantis does not guarantee any business outcome — it models plausible ranges against comparable-business benchmarks, it does not predict what will happen to your specific business.</li><li>AI-generated commentary is not independently guaranteed to match the underlying numbers on every run; an automated integrity check exists specifically because this has happened and been caught.</li></ul><h2>Where the deterministic engine ends and AI narration begins</h2><p>Every dollar figure, ratio, and verdict is computed by the deterministic financial engine — the AI narrator never invents or recomputes a number, it writes prose around numbers it is handed.</p><p><a href="/status">Reliability history</a> · <a href="/security">Security posture</a></p>`,
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
