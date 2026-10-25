import { useLocation } from 'react-router-dom';
import { PageMeta } from './PageMeta';
import { TIERS } from '@/config/tiers';
import { LEGAL_ENTITY_NAME, BENCHMARK_COUNT_DISPLAY } from '@/config/canonical-facts';

/**
 * RouteSEO — drop-in component that auto-resolves title/description/canonical
 * for every public route from a single registry. Use on any page that doesn't
 * need a fully custom <PageMeta>. For dynamic routes (blog posts, examples,
 * shared reports), keep using <PageMeta> directly with computed values.
 *
 * Usage:
 *   <RouteSEO />                         // auto from current path
 *   <RouteSEO path="/pricing" />         // override (rare)
 *   <RouteSEO titleOverride="..." />     // partial override
 */

interface RouteMeta {
  title: string;
  description: string;
  noIndex?: boolean;
}

// Single source of truth for static route SEO. Keep titles <60 chars,
// descriptions <160 chars. Pages with dynamic content set their own PageMeta.
const ROUTE_META: Record<string, RouteMeta> = {
  '/': {
    title: 'AIWMC Quantis — Test a Business Decision Before You Fund It',
    description: 'Test a business decision before committing capital: explicit assumptions, deterministic cash, break-even and payback math, downside scenarios. Free to start.',
  },
  '/app': {
    title: 'Run a Business Decision Pre-Mortem — AIWMC Quantis',
    description: `Run a free Decision Run: test assumptions, compare downside scenarios, and see what could reverse the decision before you commit capital.`,
  },
  '/how-it-works': {
    title: 'How Quantis Works — 3 Steps to Financial Clarity',
    description: 'See how Quantis turns your idea into a stress-tested financial model: input, benchmarks, risk report.',
  },
  '/use-cases': {
    title: 'Use Cases — Founders, Investors, Consultants',
    description: 'Quantis use cases for solo founders, angel investors, and finance consultants validating business models pre-launch.',
  },
  '/consultants': {
    title: 'Quantis for Consultants — Client Pre-Screening',
    description: `Stress-test a client recommendation with cited assumptions, downside scenarios, and a decision-ready report for consultants, fractional CFOs, and advisors.`,
  },
  '/examples': {
    title: 'Example Analyses — See Quantis in Action',
    description: 'Explore clearly labeled illustrative Quantis reports with modeled revenue, costs, risks, scenarios, and action plans across industries.',
  },
  '/pricing': {
    title: `Pricing — Free Plan & Plus at $${TIERS.plus.priceMonthly}/mo`,
    description: `Start with ${TIERS.free.limits.analysesPerMonth} free Decision Runs. Plus is $${TIERS.plus.priceMonthly}/month with unlimited analyses, PDF export, scenarios, and decision tools.`,
  },
  '/risk-gallery': {
    title: 'Risk Gallery — How Real Businesses Fail',
    description: 'Explore common business failure patterns Quantis tests for, including weak unit economics, runway gaps, and churn pressure.',
  },
  '/methodology': {
    title: 'Methodology — How Quantis Calculates Risk',
    description: 'How Quantis separates deterministic formulas, modeled benchmark cells, reference datasets, scenarios, confidence levels, and known limitations.',
  },
  '/research': {
    title: 'Research — Data Behind Quantis',
    description: `Research and public sources behind Quantis: a ${BENCHMARK_COUNT_DISPLAY}-cell modeled coverage grid, location indices, and methodology notes.`,
  },
  '/blog': {
    title: 'Blog — Founder Lessons & Validation Tactics',
    description: 'Practical guides to financial validation, startup costs, unit economics, scenario analysis, and business decision-making.',
  },
  '/leaderboard': {
    title: 'Leaderboard — Top Validated Ideas This Week',
    description: 'Explore ranked business ideas and compare their validation activity, financial signals, and community engagement.',
  },
  '/status': {
    title: 'Status — Quantis System Health',
    description: 'Real-time status of Quantis services: API, analysis engine, and integrations.',
  },
  '/state-of-quantis': {
    title: 'State of Quantis — What It Does, What It Doesn\'t Guarantee',
    description: 'An honest account of what Quantis does, what it does not guarantee, where the deterministic engine ends and AI narration begins, and known issues.',
  },
  '/security': {
    title: 'Security — How Quantis Protects Your Data',
    description: 'Review how Quantis protects account and analysis data with access controls, encryption, deletion workflows, and security monitoring.',
  },
  '/privacy': {
    title: 'Privacy Policy',
    description: `How ${LEGAL_ENTITY_NAME} collects, uses, and protects your personal information when you use Quantis.`,
  },
  '/terms': {
    title: 'Terms of Service',
    description: `Terms governing use of the Quantis platform operated by ${LEGAL_ENTITY_NAME}.`,
  },
  '/refund-policy': {
    title: 'Refund Policy',
    description: 'Quantis refund policy: full refund within 14 days of the first charge on Plus and Pro plans, no questions asked. Founder-assisted reviews have their own terms.',
  },
  '/decision-review': {
    title: 'Founder Decision Review & Consultant Pilot — AIWMC Quantis',
    description: 'Founder-assisted financial decision review for one live decision at $349, or a two-case consultant founding pilot at $499.',
  },
  '/changelog': {
    title: 'Changelog — What\'s New in Quantis',
    description: 'Release notes and product updates for AIWMC Quantis: new features, accuracy improvements, and engine versions.',
  },
  '/viral-content': {
    title: 'Viral Content Studio',
    description: 'Marketing posts engineered for founder audiences — anti-validation narratives that convert.',
  },
  '/viral-posts': {
    title: 'Viral Posts',
    description: 'Library of viral marketing posts for founders, investors, and operators built with Quantis.',
  },
  // Competitive comparison pages — each carries its own "Quantis vs …"
  // title so the crawler and the F8-hardened SEO gate see the same intent.
  '/vs/liveplan': {
    title: 'Quantis vs LivePlan — Which financial validator wins?',
    description: 'Compare Quantis and LivePlan for assumption testing, financial scenarios, business planning, and decision-ready outputs.',
  },
  '/vs/upmetrics': {
    title: 'Quantis vs Upmetrics — Financial Pre-Mortem Comparison',
    description: 'Compare Quantis and Upmetrics for unit economics, scenario testing, business planning, and pre-investment decision support.',
  },
  '/vs/bizplanr': {
    title: 'Quantis vs Bizplanr — Deterministic engine vs AI plan writer',
    description: 'Compare Quantis and Bizplanr for deterministic calculations, scenario testing, AI-assisted planning, and pre-launch validation.',
  },
  '/vs/foundra': {
    title: 'Quantis vs Foundra — Strategy cards vs a financial verdict',
    description: "Compare Quantis and Foundra across financial modeling, cited assumptions, scenario testing, and conversational strategy guidance.",
  },
  '/vs/aicofounder': {
    title: 'Quantis vs AI Co-Founder — Companion vs validation verdict',
    description: "Compare Quantis and AI Co-Founder for cited financial analysis, scenario testing, conversational planning, and research guidance.",
  },
  '/vs/chatgpt': {
    title: "Quantis vs ChatGPT — Why a general LLM can't cite its own numbers",
    description: "Compare Quantis and ChatGPT for calculation traceability, cited assumptions, financial scenarios, and business decision support.",
  },
  // Shared in posts and DMs: crawlers (LinkedIn, X, Facebook, Slack) don't run
  // JS, so without these the share card was the homepage's (og:url = "/").
  '/demo/founder-decision-review': {
    title: 'Interactive Decision Demo — Founder Decision Review',
    description: 'See how Quantis tests a real spending decision: change one assumption and watch cash, payback, and the decision gate recompute live.',
  },
  '/demo/hiring-decision': {
    title: 'Hiring Decision Demo — Can the business carry another employee?',
    description: 'Before the next hire, understand the cash commitment: payroll, revenue ramp-up and collection timing on an illustrative example.',
  },
  '/demo/sample-decision-memo': {
    title: 'Sample Decision Memo — what a Founder Decision Review delivers',
    description: 'A fictional, fully worked Decision Memo: facts, assumptions and unknowns, three scenarios, cash and payback reconciled, and what would change the decision.',
  },
  '/demo/consultant-founding-pilot': {
    title: 'Interactive Demo — Consultant Capacity vs Client Demand',
    description: 'The gap every engagement hides: what a client says they can bring in per month versus what your team can actually deliver. Move a slider and see it.',
  },
  '/connect': {
    title: 'Connect with AIWMC Quantis — LinkedIn, Instagram, X, Telegram, Whop',
    description: 'Follow AIWMC Quantis for financial pre-mortem breakdowns, or start a free Decision Run on your own business decision.',
  },
  '/invite': {
    title: "You're invited: 30 days of Quantis Pro, free",
    description: 'A personal invitation to pressure-test one real business decision with AIWMC Quantis Pro. No card, nothing renews automatically.',
    noIndex: true,
  },
  // Auth / transactional — noIndex
  '/auth': { title: 'Sign In', description: 'Sign in or create your AIWMC Quantis account.', noIndex: true },
  '/reset-password': { title: 'Reset Password', description: 'Reset your AIWMC Quantis password.', noIndex: true },
  '/thank-you': { title: 'Thank You', description: 'Thanks for upgrading to Quantis Plus.', noIndex: true },
};

interface RouteSEOProps {
  path?: string;
  titleOverride?: string;
  descriptionOverride?: string;
  noIndex?: boolean;
}

export function RouteSEO({ path, titleOverride, descriptionOverride, noIndex }: RouteSEOProps = {}) {
  const location = useLocation();
  const resolvedPath = path ?? location.pathname;
  const meta = ROUTE_META[resolvedPath];

  // Fallback for unregistered public routes — still emits canonical + brand title.
  const title = titleOverride ?? meta?.title ?? 'AIWMC Quantis';
  const description =
    descriptionOverride ??
    meta?.description ??
    'Test a business decision before committing capital: explicit assumptions, deterministic cash, break-even and payback math, downside scenarios. Free to start.';
  const shouldNoIndex = noIndex ?? meta?.noIndex ?? false;

  return <PageMeta title={title} description={description} path={resolvedPath} noIndex={shouldNoIndex} />;
}
