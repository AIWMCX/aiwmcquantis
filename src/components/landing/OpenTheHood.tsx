import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, ListChecks, ArrowRight } from 'lucide-react';
import { recordFunnelEvent } from '@/lib/analytics';
import { GlassCard, Reveal, SectionHeader } from '@/components/ui/glass-card';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

const questions = [
  {
    icon: Clock,
    question: 'Can I survive the first 18 months?',
    answer: 'Survivability analysis + cash runway projection',
    glow: 'cyan' as const,
  },
  {
    icon: AlertTriangle,
    question: 'What will likely kill me?',
    answer: 'Risk matrix + pre-mortem failure scenarios',
    glow: 'violet' as const,
  },
  {
    icon: ListChecks,
    question: 'What should I do next?',
    answer: 'Launch timeline + 90-day marketing plan',
    glow: 'brand' as const,
  },
];

const rows = [
  { label: 'Startup Investment', value: '$145,000', tone: 'default' as const },
  { label: 'Monthly Revenue',    value: '$12,400',  tone: 'default' as const },
  { label: 'Monthly Costs',      value: '$14,800',  tone: 'default' as const },
  { label: 'Net Profit / Loss',  value: '-$2,400',  tone: 'red'     as const },
];

const risks = [
  { name: 'Cash Flow',  level: 85, tone: 'red'    as const },
  { name: 'Market',     level: 45, tone: 'yellow' as const },
  { name: 'Operations', level: 62, tone: 'yellow' as const },
  { name: 'Regulation', level: 28, tone: 'green'  as const },
];

const toneColor = (t: 'default' | 'red' | 'yellow' | 'green') => {
  switch (t) {
    case 'red':    return '#f87171';
    case 'yellow': return '#facc15';
    case 'green':  return '#4ade80';
    default:       return 'hsl(var(--foreground))';
  }
};

function ReportPreview() {
  return (
    <div className="space-y-4">
      {/* Financial Summary */}
      <GlassCard glow="cyan" reveal={false} className="p-5">
        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-3" style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}>
          Financial Summary
        </p>
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{r.label}</span>
              <span
                className="text-sm font-bold tabular-nums"
                style={{ ...MONO, color: toneColor(r.tone) }}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Risk Matrix */}
      <GlassCard glow="violet" reveal={false} className="p-5">
        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-3" style={{ ...MONO, color: 'var(--aiwmc-grad-violet)' }}>
          Risk Matrix
        </p>
        <div className="grid grid-cols-2 gap-2">
          {risks.map((r) => (
            <div
              key={r.name}
              className="p-2 rounded-lg"
              style={{ background: 'rgba(148,163,255,0.06)', border: '1px solid rgba(148,163,255,0.14)' }}
            >
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">{r.name}</span>
                <span className="text-[10px] font-bold" style={{ ...MONO, color: toneColor(r.tone) }}>
                  {r.level}%
                </span>
              </div>
              <div className="h-1 rounded-full" style={{ background: 'rgba(148,163,255,0.10)' }}>
                <div className="h-full rounded-full" style={{ width: `${r.level}%`, background: toneColor(r.tone) }} />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Launch Timeline */}
      <GlassCard glow="brand" reveal={false} className="p-5">
        <p className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-3" style={{ ...MONO, color: 'var(--aiwmc-grad-brand)' }}>
          Launch Timeline
        </p>
        <div className="space-y-2">
          {['Phase 1: Planning & Permits', 'Phase 2: Build-out', 'Phase 3: Hiring & Training', 'Phase 4: Soft Launch'].map((phase, i) => (
            <div key={phase} className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: i === 0 ? '#4ade80' : 'rgba(148,163,255,0.24)' }}
              />
              <span className="text-xs text-muted-foreground">{phase}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

export function OpenTheHood() {
  const sectionRef = useRef<HTMLElement>(null);
  const viewFired = useRef(false);
  const scrollFired = useRef(false);

  // View + scroll-depth instrumentation (MP2-DESIGN-01 Screen 5).
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!viewFired.current && entry.intersectionRatio >= 0.25) {
            viewFired.current = true;
            recordFunnelEvent('open_the_hood_view');
          }
          if (!scrollFired.current && entry.intersectionRatio >= 0.75) {
            scrollFired.current = true;
            recordFunnelEvent('open_the_hood_scroll_75');
          }
        }
      },
      { threshold: [0.25, 0.75] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleCtaClick = () => recordFunnelEvent('open_the_hood_cta_click');

  return (
    <section ref={sectionRef} aria-labelledby="open-the-hood-heading" className="aiwmc-section-wash py-20 md:py-28">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="Open the Hood"
          title="See exactly what you get"
          subtitle="A real executive report for a specialty coffee shop in Austin, TX."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start mt-14">
          {/* Left: report previews (glass) */}
          <ReportPreview />

          {/* Right: questions the report answers */}
          <div className="space-y-6 lg:pt-2">
            {questions.map((q, i) => (
              <GlassCard key={q.question} glow={q.glow} revealDelay={i * 80} className="p-5">
                <div className="flex gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(148,163,255,0.10)' }}
                  >
                    <q.icon className="w-5 h-5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>
                      {q.question}
                    </h3>
                    <p className="text-sm text-muted-foreground" style={MONO}>
                      → {q.answer}
                    </p>
                  </div>
                </div>
              </GlassCard>
            ))}

            <Reveal delay={280}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
                <Link to="/examples" onClick={handleCtaClick}>
                  <Button size="lg" className="gap-2 h-[52px] px-7 text-base font-semibold">
                    Download example report (PDF)
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <span className="text-xs uppercase tracking-[0.14em]" style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}>
                  24 pages · free
                </span>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
