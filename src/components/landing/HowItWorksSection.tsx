import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Pencil, Hexagon, ShieldCheck, ArrowRight, Star, ChevronRight, FileText, BarChart3, Brain } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EXAMPLE_ANALYSES } from '@/pages/examples/exampleData';

/* ─── Count-up hook ─── */
function useCountUp(end: number, duration = 1600) {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * end));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, end, duration]);

  return { value, ref };
}

/* ─── Example entries ─── */
const exampleKeys = Object.keys(EXAMPLE_ANALYSES).slice(0, 5);

const industryIcons: Record<string, string> = {
  'Coffee Shop': '☕', 'B2B SaaS': '💻', 'Fitness': '💪', 'E-commerce': '🛒',
  'Restaurant': '🍽️', 'Consulting': '📊', 'Education': '📚', 'Healthcare': '🏥',
};

/* ─── Steps data ─── */
const steps = [
  { num: '01', icon: Pencil, title: 'Enter Your Idea', body: 'Type your business concept, select a city, and enter your key numbers. No spreadsheet required — just the basics.' },
  { num: '02', icon: Hexagon, title: 'Two AIs Analyze It', body: 'GPT-4o mini and Gemini independently stress-test your model. Cross-validated by two engines for reliable results.', badges: ['GPT-4o mini', 'Gemini'] },
  { num: '03', icon: ShieldCheck, title: 'Get Your Stress-Test', body: 'Risk map, 3-year projections, survival scenarios, and ready-to-export documents — in under 90 seconds.', showMini: true },
];

/* ─── Feature highlights data ─── */
const features = [
  {
    title: 'Visual Stress Map',
    subtitle: 'See exactly where your business is vulnerable',
    bullets: ['4-zone risk assessment with live scoring', 'Color-coded severity from green to red', 'Scenario-aware — changes when you toggle stress cases'],
    mockup: 'stressmap',
  },
  {
    title: 'Dual AI Consensus',
    subtitle: 'Two models. One verdict you can trust.',
    bullets: ['GPT-4o mini and Gemini analyze independently', 'Consensus score shows how aligned both models are', 'Disagreements flagged so you know where uncertainty lives'],
    mockup: 'consensus',
  },
  {
    title: 'Instant Document Generation',
    subtitle: 'From analysis to investor-ready docs in one click',
    bullets: ['Business plans, pitch decks, financial forecasts', '10+ templates with auto-populated data', 'Export to PDF or DOCX — branded with your logo'],
    mockup: 'docs',
  },
];

/* ─── Trust stats ─── */
const trustStats = [
  { end: 1000, label: 'Industry Benchmarks', suffix: '+' },
  { end: 15, label: 'Business Types Covered', suffix: '' },
  { end: 2, label: 'AI Models Verified', suffix: '' },
  { end: 90, label: 'Seconds to Complete', prefix: '< ', suffix: 's' },
];

function TrustStat({ end, label, suffix = '', prefix = '' }: { end: number; label: string; suffix?: string; prefix?: string }) {
  const { value, ref } = useCountUp(end);
  return (
    <div ref={ref} className="text-center py-6">
      <div className="text-4xl md:text-5xl font-bold tracking-tight" style={{ color: 'var(--q-text-primary)', fontFamily: 'var(--q-font-heading, inherit)' }}>
        {prefix}{value.toLocaleString()}{suffix}
      </div>
      <div className="mt-2 text-sm font-medium tracking-wide uppercase" style={{ color: 'var(--q-text-secondary)' }}>
        {label}
      </div>
    </div>
  );
}

/* ─── Mini mockups ─── */
function StressMapMockup() {
  const zones = [
    { label: 'Revenue', pct: 72, color: 'var(--q-status-green)' },
    { label: 'Costs', pct: 45, color: 'var(--q-status-yellow)' },
    { label: 'Market', pct: 88, color: 'var(--q-status-green)' },
    { label: 'Operations', pct: 31, color: 'var(--q-status-red)' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 p-5 rounded-2xl" style={{ background: 'var(--q-bg-elevated)', border: '1px solid var(--q-border-subtle)' }}>
      {zones.map(z => (
        <div key={z.label} className="p-3 rounded-xl" style={{ background: 'var(--q-bg-surface)' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium" style={{ color: 'var(--q-text-secondary)' }}>{z.label}</span>
            <span className="text-sm font-bold" style={{ color: z.color }}>{z.pct}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: 'var(--q-bg-overlay)' }}>
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${z.pct}%`, background: z.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ConsensusMockup() {
  return (
    <div className="flex gap-3 p-5 rounded-2xl" style={{ background: 'var(--q-bg-elevated)', border: '1px solid var(--q-border-subtle)' }}>
      {['GPT-4o mini', 'Gemini'].map((name, i) => (
        <div key={name} className="flex-1 p-4 rounded-xl" style={{ background: 'var(--q-bg-surface)' }}>
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--q-status-ai)' }}>{name}</div>
          <div className="text-2xl font-bold mb-1" style={{ color: 'var(--q-text-primary)' }}>{i === 0 ? '74' : '71'}/100</div>
          <div className="text-xs" style={{ color: 'var(--q-text-tertiary)' }}>{i === 0 ? 'Moderate Risk' : 'Moderate Risk'}</div>
          <div className="mt-3 h-1.5 rounded-full" style={{ background: 'var(--q-bg-overlay)' }}>
            <div className="h-full rounded-full" style={{ width: i === 0 ? '74%' : '71%', background: 'var(--q-status-ai)' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DocsMockup() {
  const docs = ['Business Plan', 'Pitch Deck', 'Financial Forecast'];
  return (
    <div className="grid grid-cols-3 gap-2 p-5 rounded-2xl" style={{ background: 'var(--q-bg-elevated)', border: '1px solid var(--q-border-subtle)' }}>
      {docs.map(d => (
        <div key={d} className="p-3 rounded-xl text-center" style={{ background: 'var(--q-bg-surface)' }}>
          <FileText className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--q-accent-primary)' }} />
          <div className="text-xs font-medium" style={{ color: 'var(--q-text-primary)' }}>{d}</div>
        </div>
      ))}
    </div>
  );
}

const mockupMap: Record<string, React.FC> = { stressmap: StressMapMockup, consensus: ConsensusMockup, docs: DocsMockup };

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export function HowItWorksSection() {
  return (
    <>
      {/* ── SECTION 2: How It Works ── */}
      <section id="how-it-works" className="py-20 md:py-28" style={{ background: 'var(--q-bg-base)' }}>
        <div className="container max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold tracking-wider uppercase mb-3" style={{ color: 'var(--q-accent-primary)' }}>How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--q-text-primary)', fontFamily: 'var(--q-font-heading, inherit)' }}>
              Three steps. Ninety seconds. Full clarity.
            </h2>
            <p className="text-base" style={{ color: 'var(--q-text-secondary)' }}>
              No spreadsheets, no guesswork — just verified financial intelligence.
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Dashed connector lines (desktop only) */}
            <svg className="hidden md:block absolute top-16 left-0 w-full h-1 pointer-events-none" style={{ zIndex: 0 }}>
              <line x1="33%" y1="0" x2="66%" y2="0" stroke="var(--q-border-default)" strokeWidth="2" strokeDasharray="8 6" />
            </svg>

            {steps.map((s) => (
              <div key={s.num} className="relative z-10 p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1" style={{ background: 'var(--q-bg-surface)', border: '1px solid var(--q-border-subtle)', boxShadow: 'var(--q-shadow-card)', borderRadius: 'var(--q-radius-lg)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl font-bold" style={{ color: 'var(--q-accent-primary)', fontFamily: 'var(--q-font-heading, inherit)' }}>{s.num}</span>
                  <div className="p-2 rounded-xl" style={{ background: 'var(--q-accent-glow)' }}>
                    <s.icon className="w-5 h-5" style={{ color: 'var(--q-accent-primary)' }} />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--q-text-primary)' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--q-text-secondary)' }}>{s.body}</p>

                {s.badges && (
                  <div className="flex gap-2 mt-4">
                    {s.badges.map(b => (
                      <span key={b} className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full" style={{ background: 'var(--q-status-ai-bg)', color: 'var(--q-status-ai)', border: '1px solid var(--q-status-ai-border)' }}>
                        {b}
                      </span>
                    ))}
                  </div>
                )}

                {s.showMini && (
                  <div className="flex gap-1.5 mt-4">
                    {['var(--q-status-green)', 'var(--q-status-yellow)', 'var(--q-status-red)', 'var(--q-status-green)'].map((c, i) => (
                      <div key={i} className="h-3 flex-1 rounded-sm" style={{ background: c, opacity: 0.7 }} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: Example Results Gallery ── */}
      <section className="py-20 md:py-28" style={{ background: 'var(--q-bg-surface)' }}>
        <div className="container max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-sm font-semibold tracking-wider uppercase mb-3" style={{ color: 'var(--q-accent-primary)' }}>Real Examples</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--q-text-primary)', fontFamily: 'var(--q-font-heading, inherit)' }}>
              See What Quantis Reveals
            </h2>
            <p className="text-base" style={{ color: 'var(--q-text-secondary)' }}>
              Explore real analyses across industries and cities.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {exampleKeys.map(key => {
              const ex = EXAMPLE_ANALYSES[key];
              const icon = industryIcons[ex.industry] || '📈';
              return (
                <Link
                  key={key}
                  to={`/examples/${key}`}
                  className="group block p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1"
                  style={{ background: 'var(--q-bg-elevated)', border: '1px solid var(--q-border-subtle)', borderRadius: 'var(--q-radius-lg)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{icon}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--q-text-tertiary)' }}>{ex.location} · {ex.industry}</span>
                  </div>
                  <div className="text-2xl font-bold mb-3" style={{ color: 'var(--q-status-green)' }}>
                    {ex.metrics.monthlyProfit}<span className="text-sm font-normal" style={{ color: 'var(--q-text-tertiary)' }}>/mo</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: 'var(--q-bg-surface)', color: 'var(--q-text-secondary)' }}>{ex.metrics.paybackMonths}</span>
                    <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: 'var(--q-bg-surface)', color: 'var(--q-text-secondary)' }}>{ex.metrics.roi} ROI</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all" style={{ color: 'var(--q-accent-primary)' }}>
                    View Analysis <ChevronRight className="w-4 h-4" />
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <Link to="/examples" className="inline-flex items-center gap-1 text-sm font-medium hover:gap-2 transition-all" style={{ color: 'var(--q-accent-primary)' }}>
              View all {Object.keys(EXAMPLE_ANALYSES).length} examples <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Trust Indicators ── */}
      <section className="py-16 md:py-20" style={{ background: 'var(--q-bg-elevated)' }}>
        <div className="container max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {trustStats.map(s => (
              <TrustStat key={s.label} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: Feature Highlights ── */}
      <section className="py-20 md:py-28" style={{ background: 'var(--q-bg-base)' }}>
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 space-y-20">
          {features.map((f, idx) => {
            const Mockup = mockupMap[f.mockup];
            const reversed = idx % 2 !== 0;
            return (
              <div key={f.title} className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${reversed ? 'md:[direction:rtl]' : ''}`}>
                <div className={reversed ? 'md:[direction:ltr]' : ''}>
                  {Mockup && <Mockup />}
                </div>
                <div className={reversed ? 'md:[direction:ltr]' : ''}>
                  <h3 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--q-text-primary)', fontFamily: 'var(--q-font-heading, inherit)' }}>{f.title}</h3>
                  <p className="text-base mb-6" style={{ color: 'var(--q-text-secondary)' }}>{f.subtitle}</p>
                  <ul className="space-y-3">
                    {f.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="mt-1 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--q-accent-glow)' }}>
                          <Star className="w-3 h-3" style={{ color: 'var(--q-accent-primary)' }} />
                        </div>
                        <span className="text-sm leading-relaxed" style={{ color: 'var(--q-text-secondary)' }}>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-16 text-center" style={{ background: 'var(--q-bg-surface)' }}>
        <div className="container max-w-2xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: 'var(--q-text-primary)', fontFamily: 'var(--q-font-heading, inherit)' }}>
            Ready to stress-test your idea?
          </h2>
          <p className="text-base mb-8" style={{ color: 'var(--q-text-secondary)' }}>
            Free forever for your first analysis. No credit card required.
          </p>
          <Link to="/app">
            <Button size="lg" className="gap-2 h-13 px-8 text-base font-semibold" style={{ background: 'var(--q-gradient-accent)', border: 'none' }}>
              ⚡ Run Free Stress-Test <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
