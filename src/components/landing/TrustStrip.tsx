import React from 'react';
import { ShieldCheck, Database, Cpu, Lock } from 'lucide-react';
import { GlassCard, Reveal, SectionHeader } from '@/components/ui/glass-card';
import { BENCHMARK_COUNT_DISPLAY, BENCHMARK_SOURCE_DETAILS } from '@/config/canonical-facts';

/**
 * TrustStrip — replaces the Testimonials section on landing until real
 * linkable founder profiles are wired in. Communicates trust through
 * verifiable numbers and named public data sources — not stock quotes.
 */

const SOURCES = BENCHMARK_SOURCE_DETAILS;

const METRICS = [
  { icon: Database,    value: `${BENCHMARK_COUNT_DISPLAY}+`, label: 'verified benchmarks',      glow: 'indigo' as const },
  { icon: Cpu,         value: 'Multi-Model', label: 'consensus cross-check',    glow: 'violet' as const },
  { icon: ShieldCheck, value: 'SOC 2',   label: 'security posture in prep', glow: 'cyan'   as const },
  { icon: Lock,        value: 'GDPR',    label: '& CCPA compliant',         glow: 'brand'  as const },
];

export function TrustStrip() {
  return (
    <section
      aria-labelledby="trust-strip-heading"
      className="aiwmc-section-wash py-16 md:py-24"
      style={{ background: 'hsl(var(--background))' }}
    >
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="Vetted by the numbers"
          title={<><span className="text-foreground">Trust the math, not the marketing.</span></>}
          subtitle="Every projection is anchored in public, citeable data — not vibes. When we can't back a number responsibly, we say so."
        />

        {/* Metric quad */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 mt-12">
          {METRICS.map((m, i) => {
            const Icon = m.icon;
            return (
              <GlassCard key={m.label} glow={m.glow} revealDelay={i * 60} className="p-5 md:p-6">
                <div className="flex items-start gap-3">
                  <span
                    className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(79,70,229,0.18), rgba(103,232,249,0.10))',
                      boxShadow: '0 0 0 1px rgba(148,163,255,0.18) inset',
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
                  </span>
                  <div className="min-w-0">
                    <div
                      className="text-xl md:text-2xl font-bold leading-tight tracking-tight"
                      style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: 'hsl(var(--foreground))' }}
                    >
                      {m.value}
                    </div>
                    <div className="text-xs md:text-sm mt-1 text-muted-foreground">{m.label}</div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* Source strip */}
        <Reveal delay={240}>
          <div
            className="mt-10 rounded-2xl px-4 sm:px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            style={{
              background: 'rgba(12,16,32,0.45)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 0 0 1px rgba(148,163,255,0.10) inset',
            }}
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: 'var(--aiwmc-grad-violet)', fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
            >
              Sources
            </span>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 md:justify-end">
              {SOURCES.map((s) => (
                <li
                  key={s.name}
                  title={s.full}
                  className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", letterSpacing: '0.02em' }}
                >
                  {s.name}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {/* Honest note replacing fake testimonials */}
        <Reveal delay={320}>
          <p className="mt-6 text-center text-xs md:text-sm text-muted-foreground max-w-2xl mx-auto">
            Named founder case studies are being verified with real, linkable profiles and
            will replace this section when public consent is confirmed. We don't ship stock quotes.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
