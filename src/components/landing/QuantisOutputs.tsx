import React from 'react';
import { GlassCard, Reveal, SectionHeader } from '@/components/ui/glass-card';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

function Sparkline() {
  return (
    <svg viewBox="0 0 120 40" className="w-full h-10" aria-hidden="true">
      <polyline
        points="0,32 15,30 30,26 45,27 60,18 75,20 90,10 105,8 120,4"
        fill="none"
        stroke="var(--aiwmc-grad-cyan)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DistributionCurve() {
  return (
    <svg viewBox="0 0 120 40" className="w-full h-10" aria-hidden="true">
      <path
        d="M0,36 C20,36 28,4 44,4 C60,4 68,36 88,36 C100,36 108,20 120,20"
        fill="none"
        stroke="var(--aiwmc-grad-violet)"
        strokeWidth="2"
      />
      <line x1="30" y1="4" x2="30" y2="36" stroke="var(--aiwmc-grad-violet)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
      <line x1="60" y1="4" x2="60" y2="36" stroke="var(--aiwmc-grad-violet)" strokeWidth="1.5" opacity="0.8" />
      <line x1="90" y1="4" x2="90" y2="36" stroke="var(--aiwmc-grad-violet)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
    </svg>
  );
}

function CashflowArrow() {
  return (
    <svg viewBox="0 0 120 40" className="w-full h-10" aria-hidden="true">
      <path d="M0,10 L60,10 L60,4 L80,14 L60,24 L60,18 L0,18 Z" fill="var(--aiwmc-grad-cyan)" opacity="0.9" />
      <path d="M0,30 L40,30 L40,26 L54,33 L40,40 L40,36 L0,36 Z" fill="#f87171" opacity="0.75" transform="translate(0,-4)" />
    </svg>
  );
}

const outputs = [
  {
    key: 'bi',
    tag: 'BI · deterministic',
    title: 'BI Report',
    description: 'Full 36-month P&L, unit economics, benchmark percentiles.',
    verdict: '→ payback: month 22',
    glow: 'cyan' as const,
    Viz: Sparkline,
    hero: false,
  },
  {
    key: 'premortem',
    tag: 'PRE-MORTEM · monte carlo',
    title: 'Pre-Mortem Analysis',
    description: 'We assume your business failed in 18 months, then explain how.',
    verdict: '→ top failure: cash burn, 34%',
    glow: 'violet' as const,
    Viz: DistributionCurve,
    hero: true,
  },
  {
    key: 'invoice',
    tag: 'INVOICE · runway check',
    title: 'Invoice Capacity Check',
    description: 'Connect your invoices. See if your model can support that volume and margin.',
    verdict: '→ runway gap: 4.2 months',
    glow: 'brand' as const,
    Viz: CashflowArrow,
    hero: false,
  },
];

export function QuantisOutputs() {
  return (
    <section aria-labelledby="quantis-outputs-heading" className="aiwmc-section-wash py-20 md:py-28">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="What Quantis Actually Does"
          title="Three engines. One verdict."
          subtitle="Every analysis runs all three — you get the full picture, not a fragment."
        />

        {/* Asymmetric: Pre-Mortem hero, center + largest */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 mt-12 items-stretch">
          {outputs.map((o, i) => (
            <GlassCard
              key={o.key}
              glow={o.glow}
              revealDelay={i * 80}
              className={o.hero ? 'p-7 md:p-8 md:-my-3 md:scale-[1.06] z-10' : 'p-6 md:p-7'}
            >
              <span
                className="inline-block text-[10px] font-semibold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full mb-5"
                style={{ ...MONO, background: 'rgba(148,163,255,0.10)', color: 'var(--aiwmc-grad-cyan)' }}
              >
                {o.tag}
              </span>

              <div className="mb-5">
                <o.Viz />
              </div>

              <h3 className="text-lg md:text-xl font-bold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                {o.title}
              </h3>
              <p className="text-sm leading-relaxed mb-4 text-muted-foreground">{o.description}</p>
              <p className="text-sm font-semibold" style={{ ...MONO, color: 'hsl(var(--foreground))' }}>
                {o.verdict}
              </p>
            </GlassCard>
          ))}
        </div>

        <Reveal delay={280}>
          <p className="text-center mt-10 md:mt-12 text-sm md:text-base text-muted-foreground">
            run all three →{' '}
            <span style={{ ...MONO, color: 'var(--aiwmc-grad-violet)', fontWeight: 700 }}>
              composite verdict: PIVOT
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
