import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, ListChecks, ArrowRight } from 'lucide-react';
import { recordFunnelEvent } from '@/lib/analytics';

const questions = [
  {
    icon: Clock,
    question: 'Can I survive the first 18 months?',
    answer: 'Survivability analysis + cash runway projection',
    color: 'var(--q-status-yellow)',
  },
  {
    icon: AlertTriangle,
    question: 'What will likely kill me?',
    answer: 'Risk matrix + pre-mortem failure scenarios',
    color: 'var(--q-status-red)',
  },
  {
    icon: ListChecks,
    question: 'What should I do next?',
    answer: 'Launch timeline + 90-day marketing plan',
    color: 'var(--q-status-green)',
  },
];

/* Stylized report preview cards */
function ReportPreview() {
  return (
    <div className="space-y-4">
      {/* Financial Summary card */}
      <div
        className="rounded-xl p-5"
        style={{ background: 'var(--q-bg-elevated)', border: '1px solid var(--q-border-subtle)' }}
      >
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--q-accent-primary)' }}>
          Financial Summary
        </p>
        <div className="space-y-2">
          {['Startup Investment', 'Monthly Revenue', 'Monthly Costs', 'Net Profit/Loss'].map((label, i) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-xs" style={{ color: 'var(--q-text-secondary)' }}>{label}</span>
              <span
                className="text-sm font-bold tabular-nums"
                style={{
                  color: i === 3 ? 'var(--q-status-red)' : 'var(--q-text-primary)',
                  fontFamily: 'var(--q-font-mono, monospace)',
                  filter: 'blur(3px)',
                }}
              >
                {['$145,000', '$12,400', '$14,800', '-$2,400'][i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Matrix card */}
      <div
        className="rounded-xl p-5"
        style={{ background: 'var(--q-bg-elevated)', border: '1px solid var(--q-border-subtle)' }}
      >
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--q-accent-primary)' }}>
          Risk Matrix
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: 'Cash Flow', level: 85, color: 'var(--q-status-red)' },
            { name: 'Market', level: 45, color: 'var(--q-status-yellow)' },
            { name: 'Operations', level: 62, color: 'var(--q-status-yellow)' },
            { name: 'Regulation', level: 28, color: 'var(--q-status-green)' },
          ].map(r => (
            <div key={r.name} className="p-2 rounded-lg" style={{ background: 'var(--q-bg-surface)' }}>
              <div className="flex justify-between mb-1">
                <span className="text-[10px]" style={{ color: 'var(--q-text-tertiary)' }}>{r.name}</span>
                <span className="text-[10px] font-bold" style={{ color: r.color }}>{r.level}%</span>
              </div>
              <div className="h-1 rounded-full" style={{ background: 'var(--q-bg-overlay)' }}>
                <div className="h-full rounded-full" style={{ width: `${r.level}%`, background: r.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Launch Timeline card */}
      <div
        className="rounded-xl p-5"
        style={{ background: 'var(--q-bg-elevated)', border: '1px solid var(--q-border-subtle)' }}
      >
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--q-accent-primary)' }}>
          Launch Timeline
        </p>
        <div className="space-y-2">
          {['Phase 1: Planning & Permits', 'Phase 2: Build-out', 'Phase 3: Hiring & Training', 'Phase 4: Soft Launch'].map((phase, i) => (
            <div key={phase} className="flex items-center gap-3">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: i === 0 ? 'var(--q-status-green)' : 'var(--q-border-default)' }}
              />
              <span className="text-xs" style={{ color: 'var(--q-text-secondary)' }}>{phase}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OpenTheHood() {
  const sectionRef = useRef<HTMLElement>(null);
  const viewFired = useRef(false);
  const scrollFired = useRef(false);

  // View + scroll-depth instrumentation (SoW Screen 5): fires once per
  // mount, not per pixel — cheap enough to leave on permanently.
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
    <section ref={sectionRef} className="py-20 md:py-28" style={{ background: 'var(--q-bg-base)' }}>
      <div className="container max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-sm font-semibold tracking-wider uppercase mb-3" style={{ color: 'var(--q-accent-primary)' }}>
            Open the Hood
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold mb-4"
            style={{ color: 'var(--q-text-primary)', fontFamily: 'var(--q-font-heading)' }}
          >
            See exactly what you get
          </h2>
          <p style={{ color: 'var(--q-text-secondary)' }}>
            A real executive report for a specialty coffee shop in Austin, TX.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Left: report previews */}
          <ReportPreview />

          {/* Right: problem → solution */}
          <div className="space-y-8 lg:pt-4">
            {questions.map(q => (
              <div key={q.question} className="flex gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `color-mix(in srgb, ${q.color} 12%, transparent)` }}
                >
                  <q.icon className="w-5 h-5" style={{ color: q.color }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--q-text-primary)', fontFamily: 'var(--q-font-heading)' }}>
                    {q.question}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--q-text-secondary)' }}>
                    → {q.answer}
                  </p>
                </div>
              </div>
            ))}

            <Link to="/examples" onClick={handleCtaClick}>
              <Button
                size="lg"
                className="gap-2 mt-4 text-base font-semibold px-7 h-[52px]"
                style={{ background: 'var(--q-gradient-accent)' }}
              >
                Download example report (PDF)
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
