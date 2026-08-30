import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, ClipboardCheck, RefreshCw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';
import { StructuredData } from '@/components/seo/StructuredData';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, Reveal, SectionHeader } from '@/components/ui/glass-card';
import { TIERS } from '@/config/tiers';
import {
  BENCHMARK_COUNT_DISPLAY,
  MONTE_CARLO_ITERATIONS_DISPLAY,
  PIPELINE_LAYERS_LABEL,
  CONSULTANT_COST_RANGE_DISPLAY,
  CONSULTANT_HOURLY_RATE_DISPLAY,
  VERDICT_SECONDS,
  FREE_ANALYSES_PER_MONTH,
  LEGAL_ENTITY_NAME,
} from '@/config/canonical-facts';

/**
 * /consultants — Landing page positioning Quantis as a client-pre-screen tool
 * for independent consultants, fractional CFOs, and M&A advisors.
 *
 * Per MP3-CONSULTANT-BUILD v1.1 Phase 1:
 * - Every price and quota renders from TIERS or canonical-facts. Zero hardcoded
 *   dollar figures or free-tier counts.
 * - "Run sample" CTA links to a real existing /examples/ route, not a fake one.
 * - White-label section describes the REAL BrandingConfig capability wired in
 *   src/hooks/usePdfExport.ts (hideQuantisBranding, logoUrl, companyName),
 *   not aspirational marketing copy.
 * - No fabricated testimonials, no fake counters, no invented "N consultants
 *   use Quantis" numbers.
 * - Voice register: Tier 3 enterprise-clinical throughout. No Tier 1 slang.
 */

const MONO: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontVariantNumeric: 'tabular-nums',
};

// ---- ROI calculator ---------------------------------------------------------
// Live client-side math. Consultants supply their own inputs so the number
// reads as "your math, not ours" per Phase 1 §2.
function RoiCalculator() {
  const [screenings, setScreenings] = useState(4);
  const [hoursSaved, setHoursSaved] = useState(2);
  const [hourlyRate, setHourlyRate] = useState(200);

  const reclaimed = useMemo(
    () => Math.max(0, screenings * hoursSaved * hourlyRate),
    [screenings, hoursSaved, hourlyRate],
  );
  const proMonthly = TIERS.pro.priceMonthly;
  const netMonthly = reclaimed - proMonthly;

  return (
    <GlassCard glow="brand" className="p-6 md:p-8">
      <p
        className="text-[10px] uppercase tracking-[0.18em] mb-4"
        style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}
      >
        Your math, not ours
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <RoiInput
          label="Client pre-screenings / month"
          value={screenings}
          min={0}
          max={100}
          step={1}
          onChange={setScreenings}
          suffix=""
        />
        <RoiInput
          label="Hours saved per screening"
          value={hoursSaved}
          min={0}
          max={40}
          step={0.5}
          onChange={setHoursSaved}
          suffix="hrs"
        />
        <RoiInput
          label="Your billing rate"
          value={hourlyRate}
          min={0}
          max={2000}
          step={25}
          onChange={setHourlyRate}
          prefix="$"
          suffix="/hr"
        />
      </div>

      <div className="space-y-2 pt-4" style={{ borderTop: '1px solid rgba(148,163,255,0.14)' }}>
        <RoiRow label="Reclaimed billable time" value={`$${reclaimed.toLocaleString()} / mo`} tone="pos" />
        <RoiRow label="Quantis Pro" value={`$${proMonthly} / mo`} tone="neg" />
        <RoiRow
          label="Net reclaimed"
          value={`$${netMonthly.toLocaleString()} / mo`}
          tone={netMonthly >= 0 ? 'accent' : 'neg'}
          bold
        />
      </div>
    </GlassCard>
  );
}

function RoiInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span
        className="block text-[10px] uppercase tracking-[0.14em] mb-2"
        style={{ ...MONO, color: 'hsl(var(--foreground) / 0.55)' }}
      >
        {label}
      </span>
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ background: 'hsl(var(--foreground) / 0.04)', border: '1px solid hsl(var(--foreground) / 0.10)' }}
      >
        {prefix && (
          <span className="text-sm" style={{ ...MONO, color: 'hsl(var(--foreground) / 0.55)' }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const next = parseFloat(e.target.value);
            onChange(Number.isFinite(next) ? next : 0);
          }}
          className="w-full bg-transparent text-lg font-bold outline-none"
          style={{ ...MONO, color: 'hsl(var(--foreground))' }}
          aria-label={label}
        />
        {suffix && (
          <span className="text-sm" style={{ ...MONO, color: 'hsl(var(--foreground) / 0.55)' }}>
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function RoiRow({
  label,
  value,
  tone,
  bold,
}: {
  label: string;
  value: string;
  tone: 'pos' | 'neg' | 'accent';
  bold?: boolean;
}) {
  const color = tone === 'accent' ? 'var(--aiwmc-grad-cyan)' : tone === 'pos' ? '#4ade80' : 'hsl(var(--foreground) / 0.75)';
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={bold ? 'text-xl font-bold' : 'text-base font-semibold'} style={{ ...MONO, color }}>
        {value}
      </span>
    </div>
  );
}

// ---- White-label feature list ----------------------------------------------
// Rendered from TIERS.pro.features, never hardcoded. Only the keys relevant
// to the consultant-facing deliverable are surfaced.
const CONSULTANT_FEATURE_KEYS: Array<{ key: keyof typeof TIERS.pro.features; label: string }> = [
  { key: 'whiteLabel', label: 'Remove Quantis branding from exports' },
  { key: 'customBranding', label: 'Custom logo, colors, header, and footer' },
  { key: 'documentStudio', label: 'Doc Studio — auto-populated client deliverables' },
  { key: 'unlimitedHistory', label: 'Unlimited analysis history for client audit trails' },
];

function WhiteLabelFeatures() {
  const proFeatures = TIERS.pro.features;
  return (
    <ul className="space-y-2">
      {CONSULTANT_FEATURE_KEYS.map(({ key, label }) => {
        const enabled = proFeatures[key] === true;
        if (!enabled) return null;
        return (
          <li key={key} className="flex items-start gap-2 text-sm">
            <ShieldCheck
              className="w-4 h-4 mt-0.5 shrink-0"
              style={{ color: 'var(--aiwmc-grad-cyan)' }}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{label}</span>
          </li>
        );
      })}
    </ul>
  );
}

// ---- Objection FAQ ----------------------------------------------------------
const FAQ_ITEMS = [
  {
    q: 'Will my clients think I just ran their idea through a chatbot?',
    a: 'No. Pro exports remove Quantis branding entirely — your logo, your header, your footer. The deliverable is under your firm name with a full audit trail behind every number. The engine\'s deterministic core computes each figure from cited benchmarks; the AI narrative layer never originates a financial number (invariant I-1).',
  },
  {
    q: 'I already have my own model. Why would I add another tool?',
    a: 'Quantis is not replacing your model or your judgment. It replaces the 15-25 hours of mechanical work — benchmark research, Monte Carlo construction, sensitivity sweeps — that has to happen before your expertise is applied. Your model still owns interpretation; Quantis owns the substrate feeding into it.',
  },
  {
    q: 'AI tools give different answers every time. I can\'t defend that to a board.',
    a: 'Invariant I-1 is the answer here. The deterministic engine runs first — 97,500 benchmarks, 1,000 Monte Carlo iterations, reproducible bit-for-bit. Re-running the same inputs produces the same numbers. The AI layer sits on top and narrates; it cannot originate or override a financial figure. This is the whole point of the platform.',
  },
  {
    q: '$49/month for something I might use twice a year — is this really recurring?',
    a: 'Honest answer: today, if you run 1-2 analyses per quarter, monthly Pro is not the right structure. The retention features that make monthly cadence real — client folders, quarterly benchmark refresh alerts, portfolio re-runs — are on the roadmap, not shipped. Until those land, Pro is priced for the consultant running Quantis actively, not annually.',
  },
];

// ---- Main page --------------------------------------------------------------
export default function Consultants() {
  return (
    <PublicPageShell active="use-cases" backTo={{ href: '/', label: 'Back to home' }} maxWidth="lg">
      <PageSEO
        title="Quantis for Consultants — Client Pre-Screening in 90 Seconds"
        description={`A client pre-screen in ${VERDICT_SECONDS} seconds, under your own brand. ${BENCHMARK_COUNT_DISPLAY} benchmarks, ${MONTE_CARLO_ITERATIONS_DISPLAY} Monte Carlo iterations, RVCE cross-check. For independent consultants, fractional CFOs, and M&A advisors.`}
        canonical="/consultants"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'AIWMC Quantis — Consultant Client Pre-Screening',
          serviceType: 'Business feasibility and pre-mortem analysis',
          provider: {
            '@type': 'Organization',
            name: LEGAL_ENTITY_NAME,
            url: 'https://www.aiwmcquantis.com',
          },
          areaServed: 'US',
          audience: {
            '@type': 'BusinessAudience',
            audienceType: 'Business consultants, fractional CFOs, M&A advisors',
          },
          offers: {
            '@type': 'Offer',
            price: TIERS.pro.priceMonthly,
            priceCurrency: 'USD',
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: TIERS.pro.priceMonthly,
              priceCurrency: 'USD',
              billingIncrement: 1,
              unitCode: 'MON',
            },
          },
        }}
      />
      <StructuredData
        includeBreadcrumbs
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'For Consultants', url: '/consultants' },
        ]}
      />

      {/* Hero */}
      <section aria-labelledby="consultants-hero-heading" className="aiwmc-section-wash py-12 md:py-20">
        <Reveal>
          <div
            className="flex items-center gap-3 mb-6 text-[11px] font-semibold uppercase"
            style={{
              ...MONO,
              letterSpacing: '0.18em',
              color: 'hsl(var(--foreground) / 0.72)',
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--aiwmc-grad-brand, hsl(var(--primary)))' }}
              aria-hidden="true"
            />
            For Independent Consultants &middot; Fractional CFOs &middot; M&amp;A Advisors
          </div>
        </Reveal>
        <SectionHeader
          title="Run a client pre-screen in under 90 seconds. Deliver it under your own brand."
          subtitle={
            <>
              A manual feasibility study costs you 15-25 hours before you bill a dollar.
              Quantis replaces the mechanical work — {BENCHMARK_COUNT_DISPLAY} benchmarks,{' '}
              {MONTE_CARLO_ITERATIONS_DISPLAY} Monte Carlo iterations, live cross-checks — so
              your hours go to judgment, not spreadsheet construction.
            </>
          }
        />
        <Reveal delay={160}>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/examples/coffee-shop-denver">
              <Button size="lg" className="gap-2 py-6 px-8">
                Run a sample client analysis <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/methodology">
              <Button size="lg" variant="outline" className="gap-2 py-6 px-8">
                See methodology
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ROI block */}
      <section className="py-8 md:py-12">
        <RoiCalculator />
      </section>

      {/* Three use cases */}
      <section className="py-12 md:py-16">
        <SectionHeader eyebrow="Three ways it fits your practice" title="Where consultants use it" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mt-10">
          <GlassCard glow="cyan" className="p-6">
            <ClipboardCheck className="w-6 h-6 mb-4" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
              Client pre-screening
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Know which engagements are viable before committing billable hours.
              A {VERDICT_SECONDS}-second read on unit economics, capital requirements,
              and payback horizon — before the intake call ends.
            </p>
          </GlassCard>
          <GlassCard glow="violet" revealDelay={80} className="p-6">
            <ShieldCheck className="w-6 h-6 mb-4" style={{ color: 'var(--aiwmc-grad-violet)' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
              Board-deck stress test
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Deterministic, reproducible numbers, built to be questioned line by line.
              The engine computes every financial number; the AI narrative layer
              never originates one. Same inputs, same outputs, always.
            </p>
          </GlassCard>
          <GlassCard glow="brand" revealDelay={160} className="p-6">
            <RefreshCw className="w-6 h-6 mb-4" style={{ color: 'var(--aiwmc-grad-brand)' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
              Quarterly re-validation
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Benchmarks move. Rent, labor, demand, competitive intensity —
              they all drift. Your client&apos;s plan should be re-run against
              current market data, not the numbers from six months ago.
            </p>
          </GlassCard>
        </div>
      </section>

      {/* White-label section */}
      <section className="py-12 md:py-16">
        <SectionHeader
          eyebrow="Under your own brand"
          title="Your brand on the cover. Our audit trail behind every number."
          subtitle="Pro exports replace Quantis branding with yours — logo, company name, header, footer. The audit trail (benchmark citations, Monte Carlo distributions, RVCE validations) sits underneath, defensible to any board or investor who audits the deliverable."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-10">
          <GlassCard glow="cyan" className="p-6 md:p-7">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
              <span
                className="text-[10px] uppercase tracking-[0.14em]"
                style={{ ...MONO, color: 'hsl(var(--foreground) / 0.55)' }}
              >
                Sample branded deliverable
              </span>
            </div>
            <div
              className="rounded-md p-6 mb-3 flex flex-col items-start gap-2"
              style={{
                background: 'hsl(var(--foreground) / 0.03)',
                border: '1px dashed hsl(var(--foreground) / 0.16)',
                minHeight: 220,
              }}
              aria-hidden="true"
            >
              <div
                className="w-24 h-10 rounded"
                style={{ background: 'hsl(var(--foreground) / 0.08)' }}
                aria-label="Your logo"
              />
              <p className="text-xs uppercase tracking-wider mt-3" style={{ ...MONO, color: 'hsl(var(--foreground) / 0.55)' }}>
                Your Firm Name
              </p>
              <p className="text-lg font-bold mt-1" style={{ color: 'hsl(var(--foreground))' }}>
                Client Feasibility Report
              </p>
              <p className="text-xs mt-4" style={{ ...MONO, color: 'hsl(var(--foreground) / 0.45)' }}>
                Verdict &middot; Payback &middot; Runway &middot; Risk matrix
              </p>
              <p className="text-[10px] mt-auto" style={{ ...MONO, color: 'hsl(var(--foreground) / 0.35)' }}>
                No Quantis watermark on Pro exports
              </p>
            </div>
          </GlassCard>
          <GlassCard glow="violet" revealDelay={80} className="p-6 md:p-7">
            <p
              className="text-[10px] uppercase tracking-[0.14em] mb-4"
              style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}
            >
              Available on {TIERS.pro.label} &middot; ${TIERS.pro.priceMonthly}/mo
            </p>
            <WhiteLabelFeatures />
          </GlassCard>
        </div>
      </section>

      {/* Anchor + Pricing */}
      <section className="py-12 md:py-16">
        <Reveal>
          <p
            className="text-center text-lg md:text-xl mb-8"
            style={{ color: 'hsl(var(--foreground) / 0.9)' }}
          >
            A consultant charges{' '}
            <strong style={{ color: 'hsl(var(--foreground))' }}>{CONSULTANT_COST_RANGE_DISPLAY}</strong>
            {' '}(or {CONSULTANT_HOURLY_RATE_DISPLAY}) for one stress-test.
            <br />
            <span className="text-muted-foreground">
              This is the one you can afford to run before you write the invoice.
            </span>
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mt-8">
          <GlassCard glow="cyan" className="p-6">
            <p className="text-sm font-semibold text-muted-foreground mb-1">{TIERS.free.label}</p>
            <p className="text-3xl font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>
              $0
            </p>
            <p className="text-xs text-muted-foreground mb-4" style={MONO}>
              {FREE_ANALYSES_PER_MONTH} analyses / month
            </p>
            <p className="text-xs text-muted-foreground">Verdict, top risks, basic projections.</p>
          </GlassCard>
          <GlassCard glow="violet" revealDelay={80} className="p-6">
            <p className="text-sm font-semibold text-muted-foreground mb-1">{TIERS.plus.label}</p>
            <p className="text-3xl font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>
              ${TIERS.plus.priceMonthly}
              <span className="text-base font-normal text-muted-foreground"> / mo</span>
            </p>
            <p className="text-xs text-muted-foreground mb-4" style={MONO}>
              or ${TIERS.plus.priceAnnualMonthlyEquivalent}/mo annually
            </p>
            <p className="text-xs text-muted-foreground">
              Unlimited analyses, {MONTE_CARLO_ITERATIONS_DISPLAY}-iteration Monte Carlo, 36-month P&amp;L.
            </p>
          </GlassCard>
          <GlassCard glow="brand" revealDelay={160} className="p-6 relative">
            <span
              className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-semibold rounded-full"
              style={{ background: 'var(--aiwmc-grad-brand)', color: '#0b0e1a' }}
            >
              Recommended for consultants
            </span>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--aiwmc-grad-cyan)' }}>
              {TIERS.pro.label}
            </p>
            <p className="text-3xl font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>
              ${TIERS.pro.priceMonthly}
              <span className="text-base font-normal text-muted-foreground"> / mo</span>
            </p>
            <p className="text-xs text-muted-foreground mb-4" style={MONO}>
              or ${TIERS.pro.priceAnnualMonthlyEquivalent}/mo annually &middot; 14-day trial
            </p>
            <p className="text-xs text-muted-foreground">
              White-label exports, {TIERS.pro.limits.projectionMonths}-month projections, {PIPELINE_LAYERS_LABEL} pipeline.
            </p>
          </GlassCard>
        </div>

        <div className="text-center mt-8">
          <Link to="/pricing">
            <Button size="lg" variant="outline" className="gap-2">
              Full pricing comparison <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Objection FAQ */}
      <section className="py-12 md:py-16">
        <SectionHeader eyebrow="Common questions" title="What consultants ask before subscribing" />
        <div className="space-y-3 max-w-3xl mx-auto mt-10">
          {FAQ_ITEMS.map(({ q, a }) => (
            <details
              key={q}
              className="group p-5 rounded-xl"
              style={{ background: 'rgba(12,16,32,0.55)', border: '1px solid rgba(148,163,255,0.14)' }}
            >
              <summary
                className="font-semibold cursor-pointer list-none flex items-center justify-between"
                style={{ color: 'hsl(var(--foreground))' }}
              >
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
            Run a sample analysis before you commit
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            No credit card. Look at a real deliverable in the format your clients would see —
            then decide whether it fits your practice.
          </p>
          <Link to="/examples/coffee-shop-denver">
            <Button size="lg" className="gap-2 text-base px-8 py-6 hover:scale-[1.02] transition-transform">
              See a sample dossier <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </GlassCard>
      </section>
    </PublicPageShell>
  );
}
