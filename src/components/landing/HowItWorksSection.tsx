import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ClipboardEdit, Cpu, FileCheck, ArrowRight } from 'lucide-react';
import { GlassCard, Reveal, SectionHeader } from '@/components/ui/glass-card';
import { MONTE_CARLO_ITERATIONS_DISPLAY, BENCHMARK_COUNT_DISPLAY, PIPELINE_LAYERS } from '@/config/canonical-facts';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

const steps = [
  {
    num: '01',
    icon: ClipboardEdit,
    title: 'Tell us what you know',
    body: `Industry, city, a few numbers. We fill in the gaps from ${BENCHMARK_COUNT_DISPLAY}+ benchmarks.`,
    glow: 'cyan' as const,
    preview: 'Industry ▾ · City · Startup Capital',
  },
  {
    num: '02',
    icon: Cpu,
    title: 'Quantis simulates 1,000 futures',
    body: 'Multi-model checks, risk stress-tests, and pre-mortem engine run in the background.',
    glow: 'violet' as const,
    preview: `L1–L${PIPELINE_LAYERS} · ${MONTE_CARLO_ITERATIONS_DISPLAY} iterations`,
    badges: ['Quantis Engine'],
  },
  {
    num: '03',
    icon: FileCheck,
    title: 'You get a reviewable decision report',
    body: 'Verdict, P&L, risk matrix, launch plan, and invoice capacity in one PDF + dashboard.',
    glow: 'brand' as const,
    preview: '24 pages · PDF',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className="aiwmc-section-wash py-20 md:py-28">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="How It Works"
          title="Describe it once. Full clarity."
          subtitle="No spreadsheets, no guesswork — just verified financial intelligence."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 mt-12">
          {steps.map((s, i) => (
            <GlassCard key={s.num} glow={s.glow} revealDelay={i * 80} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold" style={{ ...MONO, color: 'hsl(var(--foreground))' }}>
                  {s.num}
                </span>
                <div className="p-2 rounded-xl" style={{ background: 'rgba(148,163,255,0.10)' }}>
                  <s.icon className="w-5 h-5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
                </div>
              </div>

              <div
                className="rounded-lg mb-4 h-14 flex items-center justify-center px-3"
                style={{ background: 'rgba(148,163,255,0.06)', border: '1px solid rgba(148,163,255,0.14)' }}
              >
                <span className="text-[11px] uppercase tracking-[0.1em] text-center" style={{ ...MONO, color: 'var(--aiwmc-grad-violet)' }}>
                  {s.preview}
                </span>
              </div>

              <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>

              {s.badges && (
                <div className="flex gap-2 mt-4">
                  {s.badges.map((b) => (
                    <span
                      key={b}
                      className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                      style={{ background: 'var(--q-status-ai-bg)', color: 'var(--q-status-ai)', border: '1px solid var(--q-status-ai-border)' }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </GlassCard>
          ))}
        </div>

        <Reveal delay={280}>
          <div className="text-center mt-14 flex flex-col items-center gap-3">
            <Link to="/app">
              <Button size="lg" className="gap-2 h-[52px] px-8 text-base font-semibold">
                Run my first analysis free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <span className="text-xs uppercase tracking-[0.14em]" style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}>
              &lt; 90 sec
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
