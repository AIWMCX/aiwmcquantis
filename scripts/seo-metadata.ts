/**
 * Per-route SEO metadata used by scripts/prerender-seo.ts to write unique
 * <title>/description/canonical/OG tags into each pre-rendered HTML file.
 *
 * Keep titles ≤60 chars and descriptions ≤155 chars.
 */

export interface RouteMeta {
  title: string;
  description: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
}

const SITE = 'https://aiwmcquantis.com';

export const CORE_META: Record<string, RouteMeta> = {
  '/': {
    title: 'AIWMC Quantis — AI Business Idea Validator',
    description:
      'Stress-test your business idea in 90 seconds. AI-powered financial pre-mortem with 95,500 real benchmarks. Free to start.',
  },
  '/how-it-works': {
    title: 'How Quantis works — AI financial stress-testing',
    description:
      '3 steps: describe your idea, AI stress-tests 12 financial variables against 95,500 benchmarks, get your risk report in 90 seconds.',
  },
  '/use-cases': {
    title: 'Who uses Quantis — founders, consultants & builders',
    description:
      'Quantis helps founders validate ideas, consultants stress-test client models, and indie builders de-risk new ventures before spending a dollar.',
  },
  '/pricing': {
    title: 'Quantis pricing — free plan & Plus at $17/mo',
    description:
      'Start free forever with 3 analyses/month. Upgrade to Plus at $17/mo for unlimited analyses, PDF export, location comparison, and custom branding.',
  },
  '/methodology': {
    title: 'Quantis methodology — 95,500 benchmarks & Monte Carlo',
    description:
      'How Quantis calculates projections: 95,500 industry benchmarks, 50+ city cost indices, 12 financial variables, and Monte Carlo simulation.',
  },
  '/examples': {
    title: 'Business validation examples — 50+ real AI reports',
    description:
      'Browse 50+ complete AI-generated financial reports by city and industry. Revenue projections, risk flags, break-even timeline, and action plans.',
  },
  '/risk-gallery': {
    title: 'Startup risk gallery — common business model failures',
    description:
      'Browse real risk flags caught by Quantis: fatal assumptions, cash flow gaps, pricing errors, and market timing risks for 50+ business types.',
  },
  '/blog': {
    title: 'Startup validation blog — AIWMC Quantis insights',
    description:
      'Practical guides on validating startup ideas, financial stress-testing, unit economics, and AI-powered business analysis for founders.',
  },
  '/leaderboard': {
    title: 'Top validated business ideas — Quantis leaderboard',
    description:
      'Live leaderboard of the highest-scoring business ideas validated on AIWMC Quantis. Real metrics, real verdicts, updated continuously.',
  },
  '/research': {
    title: 'Research & data sources — AIWMC Quantis',
    description:
      'The 95,500 benchmarks, government datasets, and academic sources powering Quantis financial models. Full transparency on every input.',
  },
  '/status': {
    title: 'System status — AIWMC Quantis',
    description: 'Live system status, uptime, and incident history for the AIWMC Quantis platform.',
  },
  '/security': {
    title: 'Security & data protection — AIWMC Quantis',
    description:
      'How AIWMC Quantis protects your data: encryption, access controls, GDPR compliance, and our security disclosure policy.',
  },
  '/refund-policy': {
    title: 'Refund policy — AIWMC Quantis',
    description: 'Refund terms, eligibility, and the 14-day guarantee for AIWMC Quantis subscriptions.',
  },
  '/changelog': {
    title: 'Changelog — AIWMC Quantis product updates',
    description: 'Every product update, model improvement, and new feature shipped by AIWMC Quantis.',
  },
  '/cases': {
    title: 'Analysis case library — AIWMC Quantis',
    description:
      'Reference library of canonical analysis cases: P&L, DCF, DSCR, Monte Carlo, and more across 11 categories.',
  },
  '/privacy': { title: 'Privacy policy — AIWMC Quantis', description: 'Privacy policy for AIWMC Quantis.', noindex: true },
  '/terms': { title: 'Terms of service — AIWMC Quantis', description: 'Terms of service for AIWMC Quantis.', noindex: true },
};

export const BLOG_META: Record<string, RouteMeta> = {
  '/blog/how-to-stress-test-your-startup': {
    title: 'How to stress-test your startup before launch (2026)',
    description:
      'Learn the 5-step framework for validating your business model before spending a dollar. Break-even analysis, unit economics, and risk flags.',
    ogType: 'article',
  },
  '/blog/startup-validation-checklist': {
    title: 'Startup validation checklist: 7 questions before you build',
    description:
      'The 7 critical questions every founder must answer before writing code or signing a lease. Based on analysis of 10,000+ business ideas.',
    ogType: 'article',
  },
  '/blog/ai-vs-spreadsheets-startup-planning': {
    title: 'AI vs spreadsheets for startup financial planning',
    description:
      'Why AI-powered financial modeling catches 3x more risk factors than manual spreadsheets. Comparison of accuracy, speed, and blind spots.',
    ogType: 'article',
  },
  '/blog/validate-startup-idea-using-ai': {
    title: 'How to validate a startup idea using AI (step-by-step)',
    description:
      'Step-by-step guide to using AI tools for market validation, financial stress-testing, and competitive analysis. Includes real examples.',
    ogType: 'article',
  },
  '/blog/how-to-calculate-startup-costs': {
    title: 'How to calculate startup costs (2026 guide)',
    description:
      'Complete guide to estimating startup costs by industry and location. Equipment, rent, licensing, marketing, and working capital benchmarks.',
    ogType: 'article',
  },
  '/blog/unit-economics-explained-for-founders': {
    title: 'Unit economics explained for founders',
    description:
      'LTV, CAC, LTV:CAC ratio, payback period, and churn rate demystified. Learn what healthy unit economics look like for your industry.',
    ogType: 'article',
  },
  '/blog/coffee-shop-startup-costs-by-city': {
    title: 'Coffee shop startup costs 2026: Denver vs Austin vs NYC',
    description:
      'What it actually costs to open a coffee shop in Denver, Austin, and NYC. Location-adjusted startup costs, monthly expenses, and real profit numbers.',
    ogType: 'article',
  },
  '/blog/food-truck-profit-calculator': {
    title: 'Food truck profit calculator: revenue, costs & ROI by city',
    description:
      'How much does a food truck make? Real profit projections for Austin, LA, and Miami. Startup costs, permit fees, and monthly revenue breakdowns.',
    ogType: 'article',
  },
  '/blog/how-to-validate-restaurant-idea': {
    title: 'How to validate a restaurant idea before signing a lease',
    description:
      'Data-driven framework for validating restaurant concepts. Location analysis, financial stress-testing, and 7 metrics that predict survival.',
    ogType: 'article',
  },
  '/blog/5-financial-mistakes-early-founders-make': {
    title: '5 financial mistakes early founders make (and how to avoid them)',
    description:
      'The 5 financial mistakes that kill early-stage startups: underpricing, ignoring CAC, vanity revenue, runway miscalculations, and tax surprises.',
    ogType: 'article',
  },
  '/blog/ai-vs-traditional-business-planning': {
    title: 'AI vs traditional business planning — which actually works?',
    description:
      'Comparing AI-powered business planning with traditional MBA-style plans. Speed, accuracy, blind spots, and what each does best.',
    ogType: 'article',
  },
};

/**
 * Generate human-readable example metadata from the slug.
 * Slugs like "coffee-shop-denver" → "Coffee shop in Denver".
 */
const KNOWN_CITIES = new Set([
  'denver', 'austin', 'nyc', 'chicago', 'boston', 'seattle', 'portland', 'dallas',
  'phoenix', 'charlotte', 'tampa', 'houston', 'nashville', 'la', 'miami',
  'san-francisco', 'san-diego', 'atlanta', 'berlin', 'london', 'singapore',
  'sydney', 'dubai', 'toronto', 'amsterdam', 'mumbai', 'tokyo', 'zurich',
]);

const CITY_DISPLAY: Record<string, string> = {
  la: 'Los Angeles',
  nyc: 'New York',
  'san-francisco': 'San Francisco',
  'san-diego': 'San Diego',
  dach: 'DACH',
};

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayCity(slug: string) {
  return CITY_DISPLAY[slug] ?? titleCase(slug.replace(/-/g, ' '));
}

export function buildExampleMeta(slug: string): RouteMeta {
  const parts = slug.split('-');
  // Find longest trailing run of tokens that forms a known city.
  let city = '';
  let bizTokens = parts;
  for (let i = parts.length - 1; i >= 0; i--) {
    const candidate = parts.slice(i).join('-');
    if (KNOWN_CITIES.has(candidate)) {
      city = displayCity(candidate);
      bizTokens = parts.slice(0, i);
      break;
    }
  }
  const business = titleCase(bizTokens.join(' '));
  const subject = city ? `${business} in ${city}` : business;
  const title = `${subject} — AI financial analysis | Quantis`.slice(0, 70);
  const description =
    `AI-generated financial report for a ${business.toLowerCase()}${city ? ' in ' + city : ''}. ` +
    `Revenue projections, gross margin, break-even timeline, risk flags, and startup-cost benchmarks from 95,500 real data points.`;
  return { title, description: description.slice(0, 200) };
}

export function getRouteMeta(route: string): RouteMeta | null {
  if (CORE_META[route]) return CORE_META[route];
  if (BLOG_META[route]) return BLOG_META[route];
  if (route.startsWith('/examples/')) {
    const slug = route.slice('/examples/'.length);
    return buildExampleMeta(slug);
  }
  return null;
}

export const SITE_URL = SITE;
