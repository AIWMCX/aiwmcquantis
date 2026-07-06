import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Briefcase,
  Building2,
  Handshake,
  GraduationCap,
  Target,
  TrendingUp,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';
import { StructuredData } from '@/components/seo/StructuredData';
import { Footer } from '@/components/layout/Footer';
import { GlassCard, Reveal, SectionHeader } from '@/components/ui/glass-card';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

/**
 * 5 ICP tiers from Juno lead-gen segmentation. Uses composite personas
 * clearly labelled `illustrative` — no fabricated names or dollar
 * outcomes. Each ICP links to a real example report already in
 * src/pages/examples/exampleData.ts so the "See a real report" link
 * always resolves.
 */
const TIERS = [
  {
    id: 'consultants',
    tier: 'T1',
    icon: Briefcase,
    title: 'Consultants & Fractional CFOs',
    uses: 'client intake · projections · white-label PDF',
    detail:
      'Trade 20+ hours per feasibility study for a first-pass model in minutes, then layer your judgment on top. Plus/Pro branding removes the Quantis logo for client-facing deliverables.',
    exampleSlug: 'consulting-firm-new-york',
    exampleLabel: 'Consulting firm · New York',
    glow: 'cyan' as const,
  },
  {
    id: 'ma',
    tier: 'T2',
    icon: Handshake,
    title: 'M&A Advisors',
    uses: 'target diligence · sensitivity analysis · deal-book support',
    detail:
      'Stress-test target financials against sector benchmarks before committing IOI/LOI cycles. Distribution curves and P10/P50/P90 bands land straight into your CIM.',
    exampleSlug: 'saas-project-management',
    exampleLabel: 'SaaS · project management',
    glow: 'violet' as const,
  },
  {
    id: 'founders',
    tier: 'T3',
    icon: Lightbulb,
    title: 'Early Founders',
    uses: 'idea validation · runway math · pivot decisions',
    detail:
      'Before writing code or signing a lease, run the numbers against 95,500 real benchmarks. Get a proceed / pivot / kill verdict in 90 seconds with cited sources on every line.',
    exampleSlug: 'coffee-shop-denver',
    exampleLabel: 'Coffee shop · Denver',
    glow: 'brand' as const,
  },
  {
    id: 'operators',
    tier: 'T4',
    icon: Building2,
    title: 'SMB Owners & Operators',
    uses: 'expansion sanity check · location comparison · pricing scenarios',
    detail:
      "You already run a business and are considering another location, product line, or price change. Model the downside before you commit capital — location-adjusted for 50+ cities.",
    exampleSlug: 'restaurant-miami',
    exampleLabel: 'Restaurant · Miami',
    glow: 'cyan' as const,
  },
  {
    id: 'accelerators',
    tier: 'T5',
    icon: GraduationCap,
    title: 'Accelerators & University Directors',
    uses: 'cohort screening · curriculum · office-hours prep',
    detail:
      'Screen inbound applications with a deterministic first-pass check. Give your cohort a shared vocabulary for unit economics and pre-mortem thinking — with a Doc Studio for pitch decks and business plans included.',
    exampleSlug: 'mobile-app-startup-san-francisco',
    exampleLabel: 'Mobile-app startup · San Francisco',
    glow: 'violet' as const,
  },
] as const;

const WHAT_YOU_GET = [
  {
    icon: TrendingUp,
    label: '3-Scenario Projections',
    desc: 'Conservative, base, optimistic — bands drawn from the P10/P50/P90 of Monte Carlo output.',
  },
  {
    icon: Shield,
    label: 'Risk Matrix',
    desc: 'Fatal assumptions surfaced up front, with mitigation steps and severity ranking.',
  },
  {
    icon: Target,
    label: 'Unit Economics',
    desc: 'CAC, LTV, payback period, contribution margin — computed, not narrated.',
  },
  {
    icon: CheckCircle2,
    label: 'Action Plan',
    desc: 'What to cut, where to invest, whether to proceed — with a launch timeline.',
  },
];

export default function UseCases() {
  return (
    <div className="min-h-screen rmg-surface dark text-[var(--rmg-text)]">
      <PageSEO
        title="Who Uses Quantis — Founders, Consultants & Builders"
        description="Quantis helps founders validate ideas, consultants scale client analysis, M&A advisors stress-test targets, operators plan expansion, and accelerators screen cohorts. See how it serves your role."
        canonical="/use-cases"
      />
      <StructuredData
        includeBreadcrumbs
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Use Cases', url: '/use-cases' },
        ]}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-lg" style={{ background: 'rgba(11,14,26,0.72)' }}>
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-lg sm:text-xl font-bold text-foreground font-sans">AIWMC™ Quantis</Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Home</Link>
              <Link to="/how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
              <Link to="/methodology" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Methodology</Link>
              <Link to="/examples" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Examples</Link>
              <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
            </div>
            <Link to="/app">
              <Button size="sm" className="gap-2 min-h-[48px] px-5 text-sm font-semibold">
                Start Free Analysis → <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container max-w-6xl mx-auto px-4 sm:px-6">
        <div className="pt-6 pb-2">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>

        {/* Hero */}
        <section aria-labelledby="usecases-hero" className="aiwmc-section-wash py-12 md:py-20">
          <SectionHeader
            eyebrow="Who Uses Quantis"
            title={
              <>
                Five roles. <span style={{ color: 'var(--aiwmc-grad-cyan)' }}>One deterministic engine.</span>
              </>
            }
            subtitle="Whether you're validating a first idea, screening a deal, or stress-testing an expansion, Quantis runs the same 8-layer pipeline and gives you a cited, saveable verdict in 90 seconds."
          />

          {/* ICP × outcome matrix — visual signal instead of a generic paragraph block. */}
          <Reveal delay={200}>
            <div className="mt-12 grid grid-cols-2 md:grid-cols-5 gap-3 max-w-4xl mx-auto">
              {TIERS.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  className="rounded-xl px-3 py-3 text-center transition-all hover:-translate-y-0.5"
                  style={{
                    background: 'rgba(148,163,255,0.06)',
                    border: '1px solid rgba(148,163,255,0.14)',
                  }}
                >
                  <span
                    className="block text-[10px] font-semibold uppercase tracking-[0.16em] mb-1"
                    style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}
                  >
                    {t.tier}
                  </span>
                  <span className="block text-xs text-muted-foreground leading-tight">
                    {t.title.replace(/ &.*/, '').replace(/s$/, '')}
                  </span>
                </a>
              ))}
            </div>
          </Reveal>
        </section>

        {/* Tier cards */}
        <section className="py-4 md:py-8 space-y-6 md:space-y-8">
          {TIERS.map((t, i) => (
            <GlassCard key={t.id} glow={t.glow} revealDelay={i * 60} className="p-6 md:p-10 scroll-mt-24" as="div">
              <div id={t.id} />
              <div className="grid md:grid-cols-[minmax(0,1fr)_320px] gap-8 md:gap-10 items-start">
                {/* Left: role narrative */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.16em] px-2 py-1 rounded-md"
                      style={{ ...MONO, background: 'rgba(103,232,249,0.10)', color: 'var(--aiwmc-grad-cyan)' }}
                    >
                      {t.tier}
                    </span>
                    <div className="p-2 rounded-xl" style={{ background: 'rgba(148,163,255,0.10)' }}>
                      <t.icon className="w-5 h-5" style={{ color: 'var(--aiwmc-grad-violet)' }} />
                    </div>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                    {t.title}
                  </h2>
                  <p className="text-xs uppercase tracking-[0.14em] mb-4" style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}>
                    Uses Quantis for: {t.uses}
                  </p>

                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-6 max-w-2xl">{t.detail}</p>

                  <div className="flex flex-wrap items-center gap-4">
                    <Link to="/app">
                      <Button className="gap-2 min-h-[48px]">
                        Run my first analysis <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Link
                      to={`/examples/${t.exampleSlug}`}
                      className="text-sm font-medium hover:underline inline-flex items-center gap-1"
                      style={{ color: 'var(--aiwmc-grad-cyan)' }}
                    >
                      See a real report → {t.exampleLabel}
                    </Link>
                  </div>
                </div>

                {/* Right: composite profile + report thumbnail */}
                <div className="space-y-4">
                  <div
                    className="rounded-xl p-4"
                    style={{ background: 'rgba(12,16,32,0.55)', border: '1px solid rgba(148,163,255,0.14)' }}
                  >
                    <p className="text-[10px] uppercase tracking-[0.16em] mb-3" style={{ ...MONO, color: 'var(--aiwmc-grad-violet)' }}>
                      Illustrative profile
                    </p>
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{
                          background: 'linear-gradient(135deg, rgba(79,70,229,0.35), rgba(103,232,249,0.20))',
                          color: 'hsl(var(--foreground))',
                          border: '1px solid rgba(148,163,255,0.24)',
                        }}
                        aria-hidden="true"
                      >
                        {t.tier}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                          Composite persona
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Named case studies land when a real user opts in.
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/examples/${t.exampleSlug}`}
                      className="block rounded-lg p-3 hover:opacity-90 transition-opacity"
                      style={{
                        background: 'rgba(148,163,255,0.06)',
                        border: '1px solid rgba(148,163,255,0.14)',
                      }}
                    >
                      <p className="text-[10px] uppercase tracking-[0.16em] mb-1" style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}>
                        Report preview
                      </p>
                      <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                        {t.exampleLabel}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                        Open example report <ArrowRight className="w-3 h-3" />
                      </p>
                    </Link>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </section>

        {/* What You Get */}
        <section aria-labelledby="what-you-get" className="aiwmc-section-wash py-16 md:py-20 mt-8">
          <SectionHeader
            eyebrow="What you get"
            title="Every report ships with the same four deliverables"
            subtitle="Regardless of your role — every analysis returns the same structured artifact."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mt-12">
            {WHAT_YOU_GET.map(({ icon: Icon, label, desc }, i) => (
              <GlassCard key={label} glow={i % 2 === 0 ? 'cyan' : 'violet'} revealDelay={i * 60} className="p-5">
                <div className="p-2 rounded-xl w-fit mb-3" style={{ background: 'rgba(148,163,255,0.10)' }}>
                  <Icon className="w-5 h-5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
                </div>
                <h3 className="font-semibold mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                  {label}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Closing CTA — glass treatment, no gradient block */}
        <section className="py-16 md:py-20">
          <GlassCard glow="brand" className="p-8 md:p-12 text-center">
            <SectionHeader
              eyebrow="Ready?"
              title="Your idea deserves real numbers."
              subtitle="Free, no credit card, results in about 90 seconds."
            />
            <div className="mt-8 flex flex-col items-center gap-3">
              <Link to="/app">
                <Button size="lg" className="gap-2 h-[52px] px-8 text-base font-semibold">
                  Start free analysis <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <span className="text-xs uppercase tracking-[0.14em]" style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}>
                &lt; 90 sec · no signup
              </span>
            </div>
          </GlassCard>
        </section>
      </main>

      <Footer />
    </div>
  );
}
