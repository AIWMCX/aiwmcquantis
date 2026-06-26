import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, FileInput, Calculator, BarChart3,
  Shield, TrendingUp, Target, AlertTriangle, CheckCircle2,
  Globe, Layers, Cpu, Search, FileText, Zap, BrainCircuit,
  Activity, Database, MapPin, Lock, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';
import { StructuredData } from '@/components/seo/StructuredData';
import { Footer } from '@/components/layout/Footer';
import { TIERS } from '@/config/tiers';
import {
  BENCHMARK_COUNT_DISPLAY,
  BENCHMARK_SECTORS,
  MONTE_CARLO_ITERATIONS_DISPLAY,
  PIPELINE_LAYERS,
  FINANCIAL_VARIABLES,
  FREE_ANALYSES_PER_MONTH,
  VERDICT_SECONDS,
} from '@/config/canonical-facts';

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
    color: 'bg-primary/10 text-primary',
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
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    step: 3,
    icon: BarChart3,
    title: 'Get Your Risk Report & Action Plan',
    description: `Receive 3-scenario projections (conservative, realistic, optimistic), risk flags, unit economics, and a prioritized action plan — in about ${VERDICT_SECONDS} seconds.`,
    details: [
      'Viability score (0–100) with confidence indicator',
      'Top risks ranked by severity with dollar-impact estimates',
      'P10 / P50 / P90 outcome bands from Monte Carlo',
      'External validation via RVCE (web-sourced cross-referencing)',
    ],
    example: '$4,200/mo profit, 7.1 months payback, 168% ROI, 3 risk flags identified',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
];

const ENGINE_LAYERS = [
  {
    layer: 1,
    icon: Database,
    title: 'Benchmark Calibration',
    desc: `Matches your idea against ${BENCHMARK_COUNT_DISPLAY} industry benchmarks. Queries sector, sub-sector, and business model to pull real CAC, LTV, churn, margins, and growth rates — with percentile confidence bands.`,
  },
  {
    layer: 2,
    icon: MapPin,
    title: 'Location Intelligence',
    desc: 'Applies city-level cost multipliers for rent, salaries, and demand. Covers 16 metros (NYC, SF, Denver, Austin, Chicago, Miami, Seattle, Boston, and more) plus US national baseline. Sources: BLS 2024, Census ACS 2023, CoStar.',
  },
  {
    layer: 3,
    icon: Search,
    title: 'Sub-Industry Detection',
    desc: 'Refines your NAICS classification to the sub-vertical level. Adjusts churn rates, pricing models, and margin profiles — a fintech SaaS is not the same as an HR SaaS.',
  },
  {
    layer: 4,
    icon: Calculator,
    title: 'Financial Engine',
    desc: 'Builds a bottom-up P&L, cash flow statement, and unit economics model. 36-month projection for Plus, 60-month for Pro. All arithmetic via Decimal.js — zero floating-point drift.',
  },
  {
    layer: 5,
    icon: Activity,
    title: 'Market Prior & Anomaly Detection',
    desc: 'Maps your business to market distributions and flags outliers. If your margin claim is in the 99th percentile for your industry, the engine tells you why that\'s suspicious.',
  },
  {
    layer: 6,
    icon: Shield,
    title: 'Quantis Logic Engine',
    desc: 'Deterministic validation and auto-correction. Catches unrealistic inputs (0% churn, 90% margins), applies guardrails, generates health scores and specific recommendations.',
  },
  {
    layer: 7,
    icon: BrainCircuit,
    title: 'AI Narrative & Safety Guardrails',
    desc: 'An AI writes the strategic narrative around your numbers — but the numbers come first. Every claim is truth-labeled ("computed", "benchmark", or "estimated"). The engine, not the AI, is the source of truth.',
  },
  {
    layer: 8,
    icon: Globe,
    title: 'RVCE — Reality Validation Engine',
    desc: `Cross-references ${FINANCIAL_VARIABLES} core metrics against live web data. Searches industry reports, competitor pricing, and market research to validate your revenue, margins, and costs against the real world.`,
  },
];

const REPORT_SECTIONS = [
  {
    icon: TrendingUp,
    title: 'Revenue & Profit Projections',
    desc: '3 scenarios (conservative, realistic, optimistic) with monthly P&L breakdown: revenue, COGS, OpEx (rent, salaries, marketing, software), EBITDA, and net income.',
    tier: 'Free (summary) / Plus (36-month detail) / Pro (60-month)',
  },
  {
    icon: AlertTriangle,
    title: 'Risk Assessment & Pre-Mortem',
    desc: 'Top risks ranked by severity. Plus/Pro adds the Pre-Mortem Stress Test: churn shock, cost spike, capacity overload, and "what breaks first" scenario modeling.',
    tier: 'Free (top 3 risks) / Plus+ (full Pre-Mortem)',
  },
  {
    icon: Target,
    title: 'Unit Economics',
    desc: 'LTV, CAC, LTV:CAC ratio, CAC payback period, customer lifetime, ARPU, and margin per customer — computed from benchmarks, not guessed.',
    tier: 'All tiers',
  },
  {
    icon: BarChart3,
    title: 'Monte Carlo Simulation',
    desc: `${MONTE_CARLO_ITERATIONS_DISPLAY} iterations modeling revenue variability. Produces P10/P25/P50/P75/P90 outcome bands, success probability, and a histogram of possible outcomes.`,
    tier: 'Plus / Pro',
  },
  {
    icon: Activity,
    title: 'Cash Flow & Runway',
    desc: 'Month-by-month cash position, burn rate, break-even month, and runway calculation. See exactly when (or if) the business becomes self-sustaining.',
    tier: 'Plus / Pro',
  },
  {
    icon: Shield,
    title: 'Action Plan',
    desc: 'Top 5 prioritized next steps tied to your specific risks. What to cut, where to double down, and whether to proceed — based on your numbers, not generic advice.',
    tier: 'Plus / Pro',
  },
  {
    icon: Globe,
    title: 'RVCE Validation Results',
    desc: `External cross-referencing of ${FINANCIAL_VARIABLES} metrics against live web data. Each metric tagged: OK, WARN, or OUTLIER — with sources, evidence samples, and recommended corrections.`,
    tier: 'Plus / Pro',
  },
  {
    icon: Database,
    title: 'Benchmark Insights & Confidence',
    desc: `Every metric shows its benchmark source, percentile position, and confidence level. You see exactly where your numbers sit relative to ${BENCHMARK_COUNT_DISPLAY} data points.`,
    tier: 'All tiers',
  },
];

const TOOLS = [
  {
    icon: FileText,
    title: 'Document Studio',
    desc: '12+ professional templates — executive summary, investor snapshot, financial forecast, business plan, NDA, partnership agreement — auto-populated from your analysis. PDF and DOCX export with custom branding.',
    tier: 'Plus / Pro',
  },
  {
    icon: Zap,
    title: 'Invoice & Capacity Check',
    desc: '"Should I accept this client?" Analyzes cash-flow impact, team utilization, engagement economics, and late-payment risk. Returns ACCEPT, ACCEPT_WITH_CONDITIONS, or DECLINE with specific conditions.',
    tier: 'Plus / Pro',
  },
  {
    icon: TrendingUp,
    title: 'TAM / SAM / SOM Calculator',
    desc: 'Total, Serviceable, and Obtainable market sizing with cited research sources. Investor-ready market analysis with data provenance.',
    tier: 'Plus (TAM/SAM/SOM) / Pro (+ pitch deck data)',
  },
  {
    icon: Target,
    title: '5-Year Financial Model & Roadmap',
    desc: '60-month projection horizon with variance bands. Strategic roadmap with week-by-week milestones, critical-path dependencies, and launch sequence.',
    tier: 'Pro',
  },
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
  {
    q: 'How is this different from ChatGPT?',
    a: 'ChatGPT generates text. Quantis runs a deterministic financial engine first — every number is calculated from verified benchmarks, not generated. The AI writes the narrative around the math, but the math is the source of truth. Every metric is tagged as "computed", "benchmark", or "estimated" so you know exactly what\'s proven and what\'s inferred.',
  },
  {
    q: 'What data do you use for projections?',
    a: `${BENCHMARK_COUNT_DISPLAY} industry benchmarks across ${BENCHMARK_SECTORS} sectors. Sources: BLS (Bureau of Labor Statistics), Census Bureau ACS, SBA Office of Advocacy, CoStar (commercial real estate), and public filings. City-level cost data covers 16 metros plus a US national baseline. No synthetic or made-up data.`,
  },
  {
    q: 'Can I trust the projections?',
    a: 'Projections are estimates, not guarantees — that\'s why we provide 3 scenarios and confidence scores. Every metric shows its source, and RVCE cross-checks your numbers against live web data. If something looks off, the engine flags it as an OUTLIER and suggests a correction. You always see the margin of uncertainty.',
  },
  {
    q: 'Do I need a business plan first?',
    a: 'No. Enter your idea and location in one sentence. The engine builds the complete financial model from benchmarks — revenue, costs, unit economics, P&L, cash flow, and risk flags. You get the equivalent of weeks of financial analysis in about 90 seconds.',
  },
  {
    q: 'What if my industry is niche?',
    a: `We cover ${BENCHMARK_SECTORS} industry sectors. For niche businesses, the AI maps your idea to the closest benchmark cluster and the engine flags the confidence level so you know the margin of uncertainty. The more specific your description, the better the match.`,
  },
  {
    q: 'What is RVCE?',
    a: 'RVCE (Reality Validation & Calibration Engine) is Layer 8. After the financial engine calculates your numbers, RVCE searches the web — industry reports, competitor data, market research — and cross-references each of your 12 core metrics. Each metric gets a validation status: OK (within range), WARN (outside typical range), or OUTLIER (significantly different from market data).',
  },
  {
    q: 'What does Monte Carlo simulation do?',
    a: `Instead of giving you one revenue estimate, the Monte Carlo engine runs ${MONTE_CARLO_ITERATIONS_DISPLAY} simulations with different assumptions. The result: P10 (worst reasonable case), P50 (median), P90 (best reasonable case), success probability, and a histogram of all possible outcomes. This shows you the full range of what could happen — not just the best guess.`,
  },
  {
    q: 'What is the Pre-Mortem Stress Test?',
    a: 'The Pre-Mortem identifies how your business could fail before you launch. It models specific scenarios: churn shock (sudden customer loss), cost spikes (materials/rent increases), capacity overload, and cash-flow crunches. Each scenario shows the dollar impact and whether your model survives it.',
  },
  {
    q: 'How does the Invoice & Capacity Check work?',
    a: '"Should I accept this new client?" You enter your current revenue, costs, team capacity, and the proposed client\'s terms. Quantis models the cash-flow bridge, capacity utilization, late-payment risk, and engagement economics. Result: ACCEPT, ACCEPT_WITH_CONDITIONS (e.g., require upfront payment), or DECLINE — with specific reasoning.',
  },
  {
    q: 'What is the difference between Free, Plus, and Pro?',
    a: `Free gives you ${FREE_ANALYSES_PER_MONTH} analyses/month with viability score, top risks, and basic projections. Plus ($${TIERS.plus.priceMonthly}/mo) unlocks unlimited analyses, 36-month P&L, Monte Carlo, Pre-Mortem, Document Studio, and Invoice & Capacity Check. Pro ($${TIERS.pro.priceMonthly}/mo) adds 60-month projections, TAM/SAM/SOM, pitch deck data, strategic roadmap, white-label PDF, and API access. All paid plans include a 14-day free trial.`,
  },
  {
    q: 'How is arithmetic precision handled?',
    a: 'All financial calculations use Decimal.js (arbitrary-precision arithmetic). This eliminates the floating-point errors that plague spreadsheet models — every dollar and cent is exact. The same math library runs on both client and server for full parity.',
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSEO
        title={`How Quantis Works — ${PIPELINE_LAYERS}-Layer AI Financial Stress-Testing Engine`}
        description={`${PIPELINE_LAYERS} layers, ${FINANCIAL_VARIABLES} financial variables, ${BENCHMARK_COUNT_DISPLAY} benchmarks: describe your business idea, get revenue projections, risk flags, Monte Carlo simulation, and an action plan in ${VERDICT_SECONDS} seconds.`}
        canonical="/how-it-works"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'How to Validate a Business Idea with AIWMC Quantis',
          description: `Stress-test your business model in about ${VERDICT_SECONDS} seconds with a deterministic ${PIPELINE_LAYERS}-layer financial engine and ${BENCHMARK_COUNT_DISPLAY} industry benchmarks.`,
          totalTime: `PT${VERDICT_SECONDS}S`,
          step: STEPS.map((s) => ({
            '@type': 'HowToStep',
            position: s.step,
            name: s.title,
            text: s.description,
          })),
        }}
      />

      <StructuredData
        includeFAQ
        faqItems={FAQ_ITEMS.map((f) => ({ question: f.q, answer: f.a }))}
        includeBreadcrumbs
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'How It Works', url: '/how-it-works' },
        ]}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-lg sm:text-xl font-bold text-foreground">
              AIWMC™ Quantis
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Home</Link>
              <Link to="/use-cases" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Use Cases</Link>
              <Link to="/examples" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Examples</Link>
              <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/methodology" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Methodology</Link>
              <Link to="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
            </div>
            <Link to="/app">
              <Button size="sm" className="gap-2 min-h-[48px] px-5 text-sm font-semibold">
                Start Free Analysis <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container max-w-5xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <div className="pt-6 pb-2">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>

        {/* Hero */}
        <section className="py-12 md:py-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground mb-6">
            <Layers className="w-3.5 h-3.5" />
            {PIPELINE_LAYERS}-Layer Deterministic Engine · {BENCHMARK_COUNT_DISPLAY} Benchmarks · {MONTE_CARLO_ITERATIONS_DISPLAY} Monte Carlo Iterations
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            How AIWMC™ Quantis Validates Your Business Model
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Enter your business idea and location. An {PIPELINE_LAYERS}-layer financial engine computes {FINANCIAL_VARIABLES} variables
            against {BENCHMARK_COUNT_DISPLAY} industry benchmarks, runs {MONTE_CARLO_ITERATIONS_DISPLAY} Monte Carlo simulations,
            and cross-references results against live web data — in about {VERDICT_SECONDS} seconds.
          </p>
          <Link to="/app">
            <Button size="lg" className="gap-2 py-6 px-8 text-base">
              Start Free Analysis <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </section>

        {/* 3 Steps */}
        <section className="py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-12">
            3 Steps to Financial Clarity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, idx) => (
              <div key={step.step} className="relative">
                <div className="p-6 rounded-2xl border border-border bg-card h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-xl ${step.color}`}>
                      <step.icon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">Step {step.step}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground mb-4">{step.description}</p>
                  <ul className="space-y-1.5 mb-4 flex-1">
                    {step.details.map((d) => (
                      <li key={d} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-primary font-medium italic">{step.example}</p>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* The 8-Layer Engine */}
        <section className="py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
            The {PIPELINE_LAYERS}-Layer Analysis Engine
          </h2>
          <p className="text-muted-foreground text-center max-w-3xl mx-auto mb-10">
            Every analysis passes through {PIPELINE_LAYERS} sequential layers. The deterministic engine runs first — AI writes the narrative
            around the math, never the other way around. Each layer feeds the next; nothing is skipped.
          </p>
          <div className="space-y-4">
            {ENGINE_LAYERS.map(({ layer, icon: Icon, title, desc }) => (
              <div
                key={layer}
                className="flex gap-4 p-5 rounded-2xl border border-border bg-card hover:border-primary/20 transition-colors"
              >
                <div className="flex-shrink-0 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-muted-foreground/60 uppercase">L{layer}</span>
                  <div className="p-2.5 rounded-xl bg-primary/10">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* The 12 Financial Variables */}
        <section className="py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
            {FINANCIAL_VARIABLES} Financial Variables — Computed, Not Guessed
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            Every analysis computes these {FINANCIAL_VARIABLES} core metrics from benchmark data. RVCE then validates each one against
            live web sources. Each metric is tagged with its source and confidence level.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TWELVE_VARIABLES.map(({ name, desc }) => (
              <div key={name} className="p-4 rounded-xl border border-border bg-card">
                <p className="font-semibold text-foreground text-sm mb-1">{name}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What's Inside Your Report */}
        <section className="py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
            What's Inside Your Report
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            The same financial framework VCs and accelerators use — executive summary, projections,
            unit economics, risk analysis, Monte Carlo, and validation — generated automatically.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {REPORT_SECTIONS.map(({ icon: Icon, title, desc, tier }) => (
              <div key={title} className="p-5 rounded-2xl border border-border bg-card hover:border-primary/20 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <Icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider whitespace-nowrap">{tier}</span>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/examples" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
              See Example Reports <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Additional Tools */}
        <section className="py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
            Beyond Analysis — Built-In Tools
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            Quantis is more than a validator. These tools turn your analysis into documents, decisions, and investor-ready assets.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {TOOLS.map(({ icon: Icon, title, desc, tier }) => (
              <div key={title} className="p-5 rounded-2xl border border-border bg-card hover:border-primary/20 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <Icon className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider whitespace-nowrap">{tier}</span>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Data & Precision */}
        <section className="py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
            Data Sources & Precision
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-border bg-card text-center">
              <Database className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="text-2xl font-bold text-foreground mb-1">{BENCHMARK_COUNT_DISPLAY}</p>
              <p className="text-sm font-medium text-foreground mb-2">Industry Benchmarks</p>
              <p className="text-xs text-muted-foreground">
                {BENCHMARK_SECTORS} sectors. Sources: BLS, Census Bureau, SBA Office of Advocacy, CoStar, public filings. Updated annually.
              </p>
            </div>
            <div className="p-6 rounded-2xl border border-border bg-card text-center">
              <MapPin className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="text-2xl font-bold text-foreground mb-1">16 Cities</p>
              <p className="text-sm font-medium text-foreground mb-2">Location Intelligence</p>
              <p className="text-xs text-muted-foreground">
                NYC, SF, LA, Chicago, Denver, Austin, Boston, Miami, Seattle, Portland, Atlanta, Phoenix, Minneapolis, St. Louis, Las Vegas + US national baseline.
              </p>
            </div>
            <div className="p-6 rounded-2xl border border-border bg-card text-center">
              <Lock className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="text-2xl font-bold text-foreground mb-1">Decimal.js</p>
              <p className="text-sm font-medium text-foreground mb-2">Arbitrary-Precision Math</p>
              <p className="text-xs text-muted-foreground">
                Zero floating-point errors. Every dollar and cent is exact. Same library on client and server — full arithmetic parity.
              </p>
            </div>
          </div>
        </section>

        {/* Tier Comparison (concise) */}
        <section className="py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
            Free vs Plus vs Pro
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            Start free. Upgrade when you need the full engine.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="p-6 rounded-2xl border border-border bg-card">
              <p className="text-sm font-semibold text-muted-foreground mb-1">Free</p>
              <p className="text-3xl font-bold text-foreground mb-4">$0</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> {FREE_ANALYSES_PER_MONTH} analyses per month</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Viability score + top risks</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Basic revenue projections</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Unit economics summary</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Benchmark insights</li>
              </ul>
            </div>
            {/* Plus */}
            <div className="p-6 rounded-2xl border-2 border-primary bg-card relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full">Most Popular</span>
              <p className="text-sm font-semibold text-primary mb-1">Plus</p>
              <p className="text-3xl font-bold text-foreground mb-1">${TIERS.plus.priceMonthly}<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              <p className="text-xs text-muted-foreground mb-4">or ${TIERS.plus.priceAnnualMonthlyEquivalent}/mo annually · 14-day free trial</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Unlimited analyses</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> 36-month P&L + cash flow</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> {MONTE_CARLO_ITERATIONS_DISPLAY}-iteration Monte Carlo</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Pre-Mortem Stress Test</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Document Studio (12 templates)</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Invoice & Capacity Check</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> RVCE external validation</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Action plan + TAM/SAM/SOM</li>
              </ul>
            </div>
            {/* Pro */}
            <div className="p-6 rounded-2xl border border-border bg-card">
              <p className="text-sm font-semibold text-muted-foreground mb-1">Pro</p>
              <p className="text-3xl font-bold text-foreground mb-1">${TIERS.pro.priceMonthly}<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              <p className="text-xs text-muted-foreground mb-4">or ${TIERS.pro.priceAnnualMonthlyEquivalent}/mo annually · 14-day free trial</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Everything in Plus</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> 60-month (5-year) projections</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Pitch deck data package</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> Strategic roadmap</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> White-label PDF export</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> API access</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /> 3 team seats</li>
              </ul>
            </div>
          </div>
          <div className="text-center mt-8">
            <Link to="/pricing" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
              Full pricing comparison <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {FAQ_ITEMS.map(({ q, a }) => (
              <details key={q} className="group p-5 rounded-xl border border-border bg-card">
                <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
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
          <div className="rounded-2xl bg-primary p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
            <div className="relative">
              <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-3">
                Ready to Stress-Test Your Idea?
              </h2>
              <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
                {PIPELINE_LAYERS}-layer engine, {BENCHMARK_COUNT_DISPLAY} benchmarks, {MONTE_CARLO_ITERATIONS_DISPLAY} Monte Carlo iterations.
                Free, no credit card, results in about {VERDICT_SECONDS} seconds.
              </p>
              <Link to="/app">
                <Button size="lg" variant="secondary" className="gap-2 py-6 px-8">
                  Start Free Analysis <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
