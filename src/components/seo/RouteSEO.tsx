import { useLocation } from 'react-router-dom';
import { PageMeta } from './PageMeta';
import { TIERS } from '@/config/tiers';
import { LEGAL_ENTITY_NAME } from '@/config/canonical-facts';

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
    title: 'AIWMC Quantis — AI Business Idea Validator',
    description: `Stress-test your business idea in 90 seconds. AI-powered financial pre-mortem with ${BENCHMARK_COUNT_DISPLAY} benchmark data points. Free to start.`,
  },
  '/how-it-works': {
    title: 'How Quantis Works — 3 Steps to Financial Clarity',
    description: 'See how Quantis turns your idea into a stress-tested financial model in 90 seconds: input, benchmarks, risk report.',
  },
  '/use-cases': {
    title: 'Use Cases — Founders, Investors, Consultants',
    description: 'Quantis use cases for solo founders, angel investors, and finance consultants validating business models pre-launch.',
  },
  '/consultants': {
    title: 'Quantis for Consultants — Client Pre-Screening in 90 Seconds',
    description: `A client pre-screen under 90 seconds, under your own brand. ${BENCHMARK_COUNT_DISPLAY} benchmark data points and 1,000 Monte Carlo iterations behind every deliverable. For consultants, fractional CFOs, and M&A advisors.`,
  },
  '/examples': {
    title: 'Example Analyses — See Quantis in Action',
    description: 'Browse real Quantis analyses across industries. See risk flags, scenarios, and unit economics on actual business ideas.',
  },
  '/pricing': {
    title: `Pricing — Free Plan & Plus at $${TIERS.plus.priceMonthly}/mo`,
    description: `Quantis pricing: ${TIERS.free.limits.analysesPerMonth} free analyses or unlimited Plus at $${TIERS.plus.priceMonthly}/mo with PDF export, Doc Studio, and location comparison.`,
  },
  '/risk-gallery': {
    title: 'Risk Gallery — How Real Businesses Fail',
    description: 'Curated gallery of business failure patterns Quantis detects: weak unit economics, runway gaps, churn spirals.',
  },
  '/methodology': {
    title: 'Methodology — How Quantis Calculates Risk',
    description: 'Transparent methodology: 12 financial variables, Monte Carlo simulations, P10/P50/P90 percentiles, sourced benchmarks.',
  },
  '/research': {
    title: 'Research — Data Behind Quantis',
    description: `Research and primary sources powering Quantis: ${BENCHMARK_COUNT_DISPLAY} benchmark data points, location indices, and validation studies.`,
  },
  '/blog': {
    title: 'Blog — Founder Lessons & Validation Tactics',
    description: 'Brutally honest essays on financial validation, fundraising, and the math behind why most startups fail.',
  },
  '/leaderboard': {
    title: 'Leaderboard — Top Validated Ideas This Week',
    description: 'Live leaderboard of the most-validated business ideas on Quantis. Updated every 5 minutes.',
  },
  '/cases': {
    title: 'Case Browser — 440+ Reference Analyses',
    description: 'Browse 440+ canonical financial analysis cases across P&L, DCF, DSCR, Monte Carlo and more.',
  },
  '/status': {
    title: 'Status — Quantis System Health',
    description: 'Real-time status of Quantis services: API, analysis engine, and integrations.',
  },
  '/security': {
    title: 'Security — How Quantis Protects Your Data',
    description: 'Quantis security posture: RLS, encryption at rest, GDPR-compliant deletion, SOC 2-aligned controls.',
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
    description: 'Quantis refund policy: 14-day money-back guarantee on all paid plans, no questions asked.',
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
    description: 'Side-by-side: Quantis (97,500 benchmarks + Monte Carlo) vs LivePlan for stress-testing a business idea in 90 seconds.',
  },
  '/vs/upmetrics': {
    title: 'Quantis vs Upmetrics — 90-second financial pre-mortem',
    description: 'Side-by-side: Quantis vs Upmetrics for founders who need a defensible unit-economics model before spending capital.',
  },
  '/vs/bizplanr': {
    title: 'Quantis vs Bizplanr — Deterministic engine vs AI plan writer',
    description: 'Side-by-side: Quantis (deterministic engine + Monte Carlo + RVCE) vs Bizplanr for pre-launch financial validation.',
  },
  '/vs/foundra': {
    title: 'Quantis vs Foundra — Strategy cards vs a financial verdict',
    description: "Side-by-side: Quantis (deterministic engine + Monte Carlo + cited benchmarks) vs Foundra's conversational strategy-card system.",
  },
  '/vs/aicofounder': {
    title: 'Quantis vs AI Co-Founder — Companion vs validation verdict',
    description: "Side-by-side: Quantis's cited financial verdict vs AI Co-Founder's conversational planning and research guidance.",
  },
  '/vs/chatgpt': {
    title: "Quantis vs ChatGPT — Why a general LLM can't cite its own numbers",
    description: "Side-by-side: Quantis's deterministic, source-cited engine vs asking ChatGPT to validate a business idea directly.",
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
    `Stress-test your business idea in 90 seconds. AI-powered financial pre-mortem with ${BENCHMARK_COUNT_DISPLAY} benchmark data points.`;
  const shouldNoIndex = noIndex ?? meta?.noIndex ?? false;

  return <PageMeta title={title} description={description} path={resolvedPath} noIndex={shouldNoIndex} />;
}
