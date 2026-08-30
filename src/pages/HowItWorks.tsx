import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, FileInput, Calculator, BarChart3,
  Shield, TrendingUp, Target, AlertTriangle, CheckCircle2,
  Globe, Layers, Cpu, Search, FileText, Zap, BrainCircuit,
  Activity, Database, MapPin, Lock, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';
import { StructuredData } from '@/components/seo/StructuredData';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, Reveal, SectionHeader } from '@/components/ui/glass-card';
import { TIERS } from '@/config/tiers';
import {
  BENCHMARK_COUNT_DISPLAY,
  BENCHMARK_SECTORS,
  BENCHMARK_SOURCES_DISPLAY,
  MONTE_CARLO_ITERATIONS_DISPLAY,
  PIPELINE_LAYERS,
  FINANCIAL_VARIABLES,
  FREE_ANALYSES_PER_MONTH,
  DOC_TEMPLATE_COUNT,
} from '@/config/canonical-facts';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;
const PANEL: React.CSSProperties = { background: 'rgba(12,16,32,0.55)', border: '1px solid rgba(148,163,255,0.14)' };

const STEPS = [
  {
    step: 1,
    icon: FileInput,
    title: 'Describe Your Business Idea',
    description: 'Enter your business concept and target location in plain language. No financial background needed — Quantis infers the industry, cost structure, and competitive landscape from your description.',
    details: [
      'Natural language input — no forms, no templates',
      'Auto-detects industry vertical, NAICS code, and sub-sector',
      'Location intelligence for 16 major metros + US national baseline',
      'Works for any business model: SaaS, retail, services, e-commerce, food & beverage',
    ],
    example: '"Coffee shop with remote work focus in Denver, Colorado"',
    glow: 'cyan' as const,
  },
  {
    step: 2,
    icon: Cpu,
    title: `${PIPELINE_LAYERS}-Layer Engine Runs Financial Stress Tests`,
    description: `A deterministic financial engine calculates ${FINANCIAL_VARIABLES} financial variables against ${BENCHMARK_COUNT_DISPLAY} industry benchmarks, calibrated to your city's cost structure.`,
    details: [
      `${BENCHMARK_COUNT_DISPLAY} benchmarks across ${BENCHMARK_SECTORS} sectors (BLS, Census, SBA, CoStar)`,
      'City-level cost indices: rent, salary, and demand multipliers',
      'Decimal-precision arithmetic (Decimal.js) — no floating-point drift',
      `${MONTE_CARLO_ITERATIONS_DISPLAY}-iteration Monte Carlo simulation (Plus/Pro)`,
    ],
    example: 'Revenue, margins, OpEx, unit economics, cash flow — all computed from verified data',
    glow: 'violet' as const,
  },
  {
    step: 3,
    icon: BarChart3,
    title: 'Get Your Risk Report & Action Plan',
    description: `Receive 3-scenario projections (conservative, realistic, optimistic), risk flags, unit economics, and a prioritized action plan.`,
    details: [
      'Viability score (0–100) with confidence indicator',
      'Top risks ranked by severity with dollar-impact estimates',
      'P10 / P50 / P90 outcome bands from Monte Carlo',
      'External validation via RVCE (web-sourced cross-referencing)',
    ],
    example: '$4,200/mo profit, 7.1 months payback, 168% ROI, 3 risk flags identified',
    glow: 'brand' as const,
  },
];

const ENGINE_LAYERS = [
  { layer: 1, icon: Database, title: 'Benchmark Calibration', desc: `Matches your idea against ${BENCHMARK_COUNT_DISPLAY} industry benchmarks. Queries sector, sub-sector, and business model to pull real CAC, LTV, churn, margins, and growth rates — with percentile confidence bands.` },
  { layer: 2, icon: MapPin, title: 'Location Intelligence', desc: 'Applies city-level cost multipliers for rent, salaries, and demand. Covers 16 metros (NYC, SF, Denver, Austin, Chicago, Miami, Seattle, Boston, and more) plus US national baseline. Sources: BLS 2024, Census ACS 2023, CoStar.' },
  { layer: 3, icon: Search, title: 'Sub-Industry Detection', desc: 'Refines your NAICS classification to the sub-vertical level. Adjusts churn rates, pricing models, and margin profiles — a fintech SaaS is not the same as an HR SaaS.' },
  { layer: 4, icon: Calculator, title: 'Financial Engine', desc: 'Builds a bottom-up P&L, cash flow statement, and unit economics model. 36-month projection for Plus, 60-month for Pro. All arithmetic via Decimal.js — zero floating-point drift.' },
  { layer: 5, icon: Activity, title: 'Market Prior & Anomaly Detection', desc: 'Maps your business to market distributions and flags outliers. If your margin claim is in the 99th percentile for your industry, the engine tells you why that\'s suspicious.' },
  { layer: 6, icon: Shield, title: 'Quantis Logic Engine', desc: 'Deterministic validation and auto-correction. Catches unrealistic inputs (0% churn, 90% margins), applies guardrails, generates health scores and specific recommendations.' },
  { layer: 7, icon: BrainCircuit, title: 'AI Narrative & Safety Guardrails', desc: 'An AI writes the strategic narrative around your numbers — but the numbers come first. Every claim is truth-labeled ("computed", "benchmark", or "estimated"). The engine, not the AI, is the source of truth.' },
  { layer: 8, icon: Globe, title: 'RVCE — Reality Validation Engine', desc: `Cross-references ${FINANCIAL_VARIABLES} core metrics against live web data. Searches industry reports, competitor pricing, and market research to validate your revenue, margins, and costs against the real world.` },
];

const REPORT_SECTIONS = [
  { icon: TrendingUp, title: 'Revenue & Profit Projections', desc: '3 scenarios (conservative, realistic, optimistic) with monthly P&L breakdown: revenue, COGS, OpEx (rent, salaries, marketing, software), EBITDA, and net income.', tier: 'Free (summary) / Plus (36-month detail) / Pro (60-month)' },
  { icon: AlertTriangle, title: 'Risk Assessment & Pre-Mortem', desc: 'Top risks ranked by severity. Plus/Pro adds the Pre-Mortem Stress Test: churn shock, cost spike, capacity overload, and "what breaks first" scenario modeling.', tier: 'Free (top 3 risks) / Plus+ (full Pre-Mortem)' },
  { icon: Target, title: 'Unit Economics', desc: 'LTV, CAC, LTV:CAC ratio, CAC payback period, customer lifetime, ARPU, and margin per customer — computed from benchmarks, not guessed.', tier: 'All tiers' },
  { icon: BarChart3, title: 'Monte Carlo Simulation', desc: `${MONTE_CARLO_ITERATIONS_DISPLAY} iterations modeling revenue variability. Produces P10/P25/P50/P75/P90 outcome bands, success probability, and a histogram of possible outcomes.`, tier: 'Plus / Pro' },
  { icon: Activity, title: 'Cash Flow & Runway', desc: 'Month-by-month cash position, burn rate, break-even month, and runway calculation. See exactly when (or if) the business becomes self-sustaining.', tier: 'Plus / Pro' },
  { icon: Shield, title: 'Action Plan', desc: 'Top 5 prioritized next steps tied to your specific risks. What to cut, where to double down, and whether to proceed — based on your numbers, not generic advice.', tier: 'Plus / Pro' },
  { icon: Globe, title: 'RVCE Validation Results', desc: `External cross-referencing of ${FINANCIAL_VARIABLES} metrics against live web data. Each metric tagged: OK, WARN, or OUTLIER — with sources, evidence samples, and recommended corrections.`, tier: 'Plus / Pro' },
  { icon: Database, title: 'Benchmark Insights & Confidence', desc: `Every metric shows its benchmark source, percentile position, and confidence level. You see exactly where your numbers sit relative to ${BENCHMARK_COUNT_DISPLAY} data points.`, tier: 'All tiers' },
];

const TOOLS = [
  { icon: FileText, title: 'Document Studio', desc: '10 professional templates — executive summary, investor snapshot, financial forecast, business plan, NDA, partnership agreement — auto-populated from your analysis. PDF and DOCX export with custom branding.', tier: 'Plus / Pro' },
  { icon: Zap, title: 'Invoice & Capacity Check', desc: '"Should I accept this client?" Analyzes cash-flow impact, team utilization, engagement economics, and late-payment risk. Returns ACCEPT, ACCEPT_WITH_CONDITIONS, or DECLINE with specific conditions.', tier: 'Plus / Pro' },
  { icon: TrendingUp, title: 'TAM / SAM / SOM Calculator', desc: 'Total, Serviceable, and Obtainable market sizing with cited research sources. Investor-ready market analysis with data provenance.', tier: 'Plus (TAM/SAM/SOM) / Pro (+ pitch deck data)' },
  { icon: Target, title: '5-Year Financial Model & Roadmap', desc: '60-month projection horizon with variance bands. Strategic roadmap with week-by-week milestones, critical-path dependencies, and launch sequence.', tier: 'Pro' },
];

const TWELVE_VARIABLES = [
  { name: 'Monthly Revenue', desc: 'Expected monthly recurring or transactional revenue' },
  { name: 'Gross Margin %', desc: 'Revenue minus cost of goods sold, as a percentage' },
  { name: 'Total Monthly OpEx', desc: 'All operating expenses: rent, salaries, marketing, tools' },
  { name: 'Marketing Spend', desc: 'Monthly acquisition and retention marketing budget' },
  { name: 'Rent / Facilities', desc: 'Location-adjusted commercial space costs' },
  { name: 'Payroll', desc: 'Salaries and team costs, geo-calibrated' },
  { name: 'Customer LTV', desc: 'Lifetime value = margin per customer × lifetime months' },
  { name: 'Customer CAC', desc: 'Cost to acquire one customer (marketing ÷ new customers)' },
  { name: 'LTV:CAC Ratio', desc: 'Unit economics health — 3:1 is baseline, <1 is fatal' },
  { name: 'CAC Payback', desc: 'Months to recoup acquisition cost from margin' },
  { name: 'Startup Investment', desc: 'Total capital required before revenue begins' },
  { name: 'Year 1 Revenue (SOM)', desc: 'Serviceable obtainable market — realistic first-year revenue' },
];

const FAQ_ITEMS = [
  { q: 'How is this different from ChatGPT?', a: 'ChatGPT generates text. Quantis runs a deterministic financial engine first — every number is calculated from verified benchmarks, not generated. The AI writes the narrative around the math, but the math is the source of truth. Every metric is tagged as "computed", "benchmark", or "estimated" so you know exactly what\'s proven and what\'s inferred.' },
  { q: 'What data do you use for projections?', a: `${BENCHMARK_COUNT_DISPLAY} industry benchmarks across ${BENCHMARK_SECTORS} sectors, informed by ${BENCHMARK_SOURCES_DISPLAY}. City-level cost data covers 16 metros plus a US national baseline.` },
  { q: 'Can I trust the projections?', a: 'Projections are estimates, not guarantees — that\'s why we provide 3 scenarios and confidence scores. Every metric shows its source, and RVCE cross-checks your numbers against live web data. If something looks off, the engine flags it as an OUTLIER and suggests a correction. You always see the margin of uncertainty.' },
  { q: 'Do I need a business plan first?', a: 'No. Enter your idea and location in one sentence. The engine builds the complete financial model from benchmarks — revenue, costs, unit economics, P&L, cash flow, and risk flags. You get the equivalent of weeks of financial analysis in a fraction of the time.' },
  { q: 'What if my industry is niche?', a: `We cover ${BENCHMARK_SECTORS} industry sectors. For niche businesses, the AI maps your idea to the closest benchmark cluster and the engine flags the confidence level so you know the margin of uncertainty. The more specific your description, the better the match.` },
  { q: 'What is RVCE?', a: 'RVCE (Reality Validation & Calibration Engine) is Layer 8. After the financial engine calculates your numbers, RVCE searches the web — industry reports, competitor data, market research — and cross-references each of your 12 core metrics. Each metric gets a validation status: OK (within range), WARN (outside typical range), or OUTLIER (significantly different from market data).' },
  { q: 'What does Monte Carlo simulation do?', a: `Instead of giving you one revenue estimate, the Monte Carlo engine runs ${MONTE_CARLO_ITERATIONS_DISPLAY} simulations with different assumptions. The result: P10 (worst reasonable case), P50 (median), P90 (best reasonable case), success probability, and a histogram of all possible outcomes. This shows you the full range of what could happen — not just the best guess.` },
  { q: 'What is the Pre-Mortem Stress Test?', a: 'The Pre-Mortem identifies how your business could fail before you launch. It models specific scenarios: churn shock (sudden customer loss), cost spikes (materials/rent increases), capacity overload, and cash-flow crunches. Each scenario shows the dollar impact and whether your model survives it.' },
  { q: 'How does the Invoice & Capacity Check work?', a: '"Should I accept this new client?" You enter your current revenue, costs, team capacity, and the proposed client\'s terms. Quantis models the cash-flow bridge, capacity utilization, late-payment risk, and engagement economics. Result: ACCEPT, ACCEPT_WITH_CONDITIONS (e.g., require upfront payment), or DECLINE — with specific reasoning.' },
  { q: 'What is the difference between Free, Plus, and Pro?', a: `Free gives you ${FREE_ANALYSES_PER_MONTH} analyses/month with viability score, top risks, and basic projections. Plus ($${TIERS.plus.priceMonthly}/mo) unlocks unlimited analyses, 36-month P&L, Monte Carlo, Pre-Mortem, Document Studio, and Invoice & Capacity Check. Pro ($${TIERS.pro.priceMonthly}/mo) adds 60-month projections, TAM/SAM/SOM, pitch deck data, strategic roadmap, white-label PDF, and API access. All paid plans include a 14-day free trial.` },
  { q: 'How is arithmetic precision handled?', a: 'All financial calculations use Decimal.js (arbitrary-precision arithmetic). This eliminates the floating-point errors that plague spreadsheet models — every dollar and cent is exact. The same math library runs on both client and server for full parity.' },
];

export default function HowItWorks() {
  return (
    <PublicPageShell active="how-it-works" backTo={{ href: '/', label: 'Back to home' }} maxWidth="lg">
      <PageSEO
        title={`How Quantis Works — ${PIPELINE_LAYERS}-Layer AI Financial Stress-Testing Engine`}
        description={`${PIPELINE_LAYERS} layers, ${FINANCIAL_VARIABLES} financial variables, ${BENCHMARK_COUNT_DISPLAY} benchmarks: describe your business idea, get revenue projections, risk flags, Monte Carlo simulation, and an action plan.`}
        canonical="/how-it-works"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'How to Validate a Business Idea with AIWMC Quantis',
          description: `Stress-test your business model with a deterministic ${PIPELINE_LAYERS}-layer financial engine and ${BENCHMARK_COUNT_DISPLAY} industry benchmarks.`,
          step: STEPS.map((s) => ({ '@type': 'HowToStep', position: s.step, name: s.title, text: s.description })),
        }}
      />
      <StructuredData
        includeFAQ
        faqItems={FAQ_ITEMS.map((f) => ({ question: f.q, answer: f.a }))}
        includeBreadcrumbs
        breadcrumbs={[{ name: 'Home', url: '/' }, { name: 'How It Works', url: '/how-it-works' }]}
      />

      {/* Hero */}
      <section aria-labelledby="hiw-hero-heading" className="aiwmc-section-wash py-12 md:py-20 text-center">
        <Reveal>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
            style={{ ...PANEL, ...MONO, color: 'var(--aiwmc-grad-cyan)' }}
          >
            <Layers className="w-3.5 h-3.5" />
            {PIPELINE_LAYERS}-Layer Deterministic Engine · {BENCHMARK_COUNT_DISPLAY} Benchmarks · {MONTE_CARLO_ITERATIONS_DISPLAY} Monte Carlo Iterations
          </div>
        </Reveal>
        <SectionHeader
          title="How AIWMC™ Quantis validates your business model"
          subtitle={
            <>
              Enter your business idea and location. An {PIPELINE_LAYERS}-layer financial engine computes {FINANCIAL_VARIABLES} variables
              against {BENCHMARK_COUNT_DISPLAY} industry benchmarks, runs {MONTE_CARLO_ITERATIONS_DISPLAY} Monte Carlo simulations,
              and cross-references results against live web data.
            </>
          }
        />
        <Reveal delay={160}>
          <div className="mt-8">
            <Link to="/app">
              <Button size="lg" className="gap-2 py-6 px-8 text-base">
                Start free analysis <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* 3 Steps */}
      <section className="py-12 md:py-16">
        <SectionHeader eyebrow="The process" title="3 steps to financial clarity" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 mt-12">
          {STEPS.map((step, i) => (
            <GlassCard key={step.step} glow={step.glow} revealDelay={i * 80} className="p-6 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl" style={{ background: 'rgba(148,163,255,0.10)' }}>
                  <step.icon className="w-6 h-6" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
                </div>
                <span className="text-sm font-semibold uppercase tracking-[0.1em]" style={MONO}>Step {step.step}</span>
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>{step.title}</h3>
              <p className="text-muted-foreground mb-4">{step.description}</p>
              <ul className="space-y-1.5 mb-4 flex-1">
                {step.details.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} />
                    {d}
                  </li>
                ))}
              </ul>
              <p className="text-sm font-medium italic" style={{ color: 'var(--aiwmc-grad-cyan)' }}>{step.example}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* The 8-Layer Engine */}
      <section className="py-12 md:py-16">
        <SectionHeader
          eyebrow="Architecture"
          title={`The ${PIPELINE_LAYERS}-layer analysis engine`}
          subtitle="Every analysis passes through 8 sequential layers. The deterministic engine runs first — AI writes the narrative around the math, never the other way around. Each layer feeds the next; nothing is skipped."
        />
        <div className="space-y-3 mt-10">
          {ENGINE_LAYERS.map(({ layer, icon: Icon, title, desc }, i) => (
            <GlassCard key={layer} glow={i % 2 === 0 ? 'cyan' : 'violet'} revealDelay={Math.min(i, 6) * 40} className="p-5">
              <div className="flex gap-4">
                <div className="flex-shrink-0 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold uppercase" style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}>L{layer}</span>
                  <div className="p-2.5 rounded-xl" style={{ background: 'rgba(148,163,255,0.10)' }}>
                    <Icon className="w-5 h-5" style={{ color: 'var(--aiwmc-grad-violet)' }} />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-1" style={{ color: 'hsl(var(--foreground))' }}>{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* The 12 Financial Variables */}
      <section className="py-12 md:py-16">
        <SectionHeader
          eyebrow="Inputs"
          title={`${FINANCIAL_VARIABLES} financial variables — computed, not guessed`}
          subtitle="Every analysis computes these 12 core metrics from benchmark data. RVCE then validates each one against live web sources. Each metric is tagged with its source and confidence level."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {TWELVE_VARIABLES.map(({ name, desc }) => (
            <div key={name} className="p-4 rounded-xl" style={PANEL}>
              <p className="font-semibold text-sm mb-1" style={{ color: 'hsl(var(--foreground))' }}>{name}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What's Inside Your Report */}
      <section className="py-12 md:py-16">
        <SectionHeader
          eyebrow="Deliverable"
          title="What's inside your report"
          subtitle="The same financial framework VCs and accelerators use — executive summary, projections, unit economics, risk analysis, Monte Carlo, and validation — generated automatically."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
          {REPORT_SECTIONS.map(({ icon: Icon, title, desc, tier }, i) => (
            <GlassCard key={title} glow={i % 3 === 0 ? 'cyan' : i % 3 === 1 ? 'violet' : 'brand'} revealDelay={Math.min(i, 6) * 40} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
                <span className="text-[10px] font-medium uppercase tracking-wider whitespace-nowrap" style={MONO}>{tier}</span>
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </GlassCard>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link to="/examples" className="text-sm font-medium hover:underline inline-flex items-center gap-1" style={{ color: 'var(--aiwmc-grad-cyan)' }}>
            See example reports <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Additional Tools */}
      <section className="py-12 md:py-16">
        <SectionHeader eyebrow="Beyond analysis" title="Built-in tools" subtitle="These tools turn your analysis into documents, decisions, and investor-ready assets." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
          {TOOLS.map(({ icon: Icon, title, desc, tier }, i) => (
            <GlassCard key={title} glow={i % 2 === 0 ? 'cyan' : 'violet'} revealDelay={i * 60} className="p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
                <span className="text-[10px] font-medium uppercase tracking-wider whitespace-nowrap" style={MONO}>{tier}</span>
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Data & Precision */}
      <section className="py-12 md:py-16">
        <SectionHeader eyebrow="Trust" title="Data sources & precision" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
          <GlassCard glow="cyan" className="p-6 text-center">
            <Database className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
            <p className="text-2xl font-bold mb-1" style={MONO}>{BENCHMARK_COUNT_DISPLAY}</p>
            <p className="text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>Industry Benchmarks</p>
            <p className="text-xs text-muted-foreground">{BENCHMARK_SECTORS} sectors. Sources: BLS, Census Bureau, SBA Office of Advocacy, CoStar, public filings. Updated annually.</p>
          </GlassCard>
          <GlassCard glow="violet" revealDelay={80} className="p-6 text-center">
            <MapPin className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--aiwmc-grad-violet)' }} />
            <p className="text-2xl font-bold mb-1" style={MONO}>16 Cities</p>
            <p className="text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>Location Intelligence</p>
            <p className="text-xs text-muted-foreground">NYC, SF, LA, Chicago, Denver, Austin, Boston, Miami, Seattle, Portland, Atlanta, Phoenix, Minneapolis, St. Louis, Las Vegas + US national baseline.</p>
          </GlassCard>
          <GlassCard glow="brand" revealDelay={160} className="p-6 text-center">
            <Lock className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--aiwmc-grad-brand)' }} />
            <p className="text-2xl font-bold mb-1" style={MONO}>Decimal.js</p>
            <p className="text-sm font-medium mb-2" style={{ color: 'hsl(var(--foreground))' }}>Arbitrary-Precision Math</p>
            <p className="text-xs text-muted-foreground">Zero floating-point errors. Every dollar and cent is exact. Same library on client and server — full arithmetic parity.</p>
          </GlassCard>
        </div>
      </section>

      {/* Tier Comparison (concise) */}
      <section className="py-12 md:py-16">
        <SectionHeader eyebrow="Plans" title="Free vs Plus vs Pro" subtitle="Start free. Upgrade when you need the full engine." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
          <GlassCard glow="cyan" className="p-6">
            <p className="text-sm font-semibold text-muted-foreground mb-1">Free</p>
            <p className="text-3xl font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>$0</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> {FREE_ANALYSES_PER_MONTH} analyses per month</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> Viability score + top risks</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> Basic revenue projections</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> Unit economics summary</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> Benchmark insights</li>
            </ul>
          </GlassCard>
          <GlassCard glow="brand" revealDelay={80} className="p-6 relative">
            <span
              className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-semibold rounded-full"
              style={{ background: 'var(--aiwmc-grad-brand)', color: '#0b0e1a' }}
            >
              Most Popular
            </span>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--aiwmc-grad-cyan)' }}>Plus</p>
            <p className="text-3xl font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>
              ${TIERS.plus.priceMonthly}<span className="text-base font-normal text-muted-foreground">/mo</span>
            </p>
            <p className="text-xs text-muted-foreground mb-4">or ${TIERS.plus.priceAnnualMonthlyEquivalent}/mo annually · 14-day free trial</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> Unlimited analyses</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> 36-month P&L + cash flow</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> {MONTE_CARLO_ITERATIONS_DISPLAY}-iteration Monte Carlo</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> Pre-Mortem Stress Test</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> Document Studio ({DOC_TEMPLATE_COUNT} templates)</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> Invoice & Capacity Check</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> RVCE external validation</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> Action plan + TAM/SAM/SOM</li>
            </ul>
          </GlassCard>
          <GlassCard glow="violet" revealDelay={160} className="p-6">
            <p className="text-sm font-semibold text-muted-foreground mb-1">Pro</p>
            <p className="text-3xl font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>
              ${TIERS.pro.priceMonthly}<span className="text-base font-normal text-muted-foreground">/mo</span>
            </p>
            <p className="text-xs text-muted-foreground mb-4">or ${TIERS.pro.priceAnnualMonthlyEquivalent}/mo annually · 14-day free trial</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> Everything in Plus</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> 60-month (5-year) projections</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> Pitch deck data package</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> Strategic roadmap</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> White-label PDF export</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> API access</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }} /> 3 team seats</li>
            </ul>
          </GlassCard>
        </div>
        <div className="text-center mt-8">
          <Link to="/pricing" className="text-sm font-medium hover:underline inline-flex items-center gap-1" style={{ color: 'var(--aiwmc-grad-cyan)' }}>
            Full pricing comparison <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 md:py-16">
        <SectionHeader eyebrow="FAQ" title="Frequently asked questions" />
        <div className="space-y-3 max-w-3xl mx-auto mt-10">
          {FAQ_ITEMS.map(({ q, a }) => (
            <details key={q} className="group p-5 rounded-xl" style={PANEL}>
              <summary className="font-semibold cursor-pointer list-none flex items-center justify-between" style={{ color: 'hsl(var(--foreground))' }}>
                {q}
                <span className="ml-2 text-muted-foreground group-open:rotate-45 transition-transform text-xl">+</span>
              </summary>
              <p className="mt-3 text-muted-foreground text-sm leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 md:py-16">
        <GlassCard glow="brand" className="p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
            Ready to stress-test your idea?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            {PIPELINE_LAYERS}-layer engine, {BENCHMARK_COUNT_DISPLAY} benchmarks, {MONTE_CARLO_ITERATIONS_DISPLAY} Monte Carlo iterations.
            Free, no credit card required.
          </p>
          <Link to="/app">
            <Button size="lg" className="gap-2 py-6 px-8">
              Start free analysis <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </GlassCard>
      </section>
    </PublicPageShell>
  );
}
