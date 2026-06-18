import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, Lock, Download, Maximize2, Minimize2, X, FileText, ShieldCheck, ChevronDown, DollarSign, Clock, TrendingUp, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnalysis } from '@/hooks/useAnalysis';
import { recordFunnelEvent, trackCtaClick } from '@/lib/analytics';
const SAMPLE_URL = '/sample-report/quantis-sample-report.pdf';
const PAGES = Array.from({ length: 15 }, (_, i) => ({
  url: `/sample-report/qpage-${String(i + 1).padStart(2, '0')}.jpg`,
  label: `Page ${i + 1} of 15`,
}));

// Commercial cover card shown above the rendered PDF pages.
// Values MUST mirror the actual sample report (The Draft Lab · Austin, TX · Jun 13 2026).
const COVER = {
  company: 'The Draft Lab',
  tagline: 'Specialty coffee + co-writing studio · downtown Austin',
  industry: 'Consulting / F&B hybrid',
  location: 'Austin, TX',
  generated: 'Jun 13, 2026',
  pages: 15,
  confidence: '79%',
  summary:
    'Hybrid daytime coffee + sound-treated writing nooks targeting 180 paying members at $89/mo. Base-case payback in 18 months, Y2 monthly profit ~$11.8k, dual-AI verified at 79% confidence.',
} as const;

// Headline metrics extracted from the sample Quantis report (The Draft Lab · Austin, TX · Jun 2026).
// Each card opens a short expansion explaining how the figure was produced.
const METRICS = [
  {
    id: 'investment',
    icon: DollarSign,
    label: 'Initial investment',
    value: '$142,500',
    sub: 'Build-out + 4-mo runway',
    detail:
      'Sum of one-time CAPEX ($86,200 — buildout, equipment, deposits) and 4 months of fixed OPEX burn before break-even ($56,300). Sourced from sample report, pages 6–8.',
  },
  {
    id: 'payback',
    icon: Clock,
    label: 'Payback period',
    value: '18 months',
    sub: 'Base case (P50)',
    detail:
      'Cumulative free cash flow turns positive in month 18 under the base scenario. P25 = 14mo, P75 = 26mo across 12-variable Monte Carlo. Sample report, page 9.',
  },
  {
    id: 'profit',
    icon: TrendingUp,
    label: 'Monthly profit (Y2)',
    value: '$11,800',
    sub: 'Net, after all OpEx',
    detail:
      'Steady-state monthly net income at month 24, assuming 180 paying members × $89 ARPU and 4.1% monthly churn. Bottom-up P&L on sample report, page 7.',
  },
  {
    id: 'confidence',
    icon: Gauge,
    label: 'Confidence',
    value: '79%',
    sub: 'Dual-AI verified',
    detail:
      'Model Confidence Score: benchmark match quality 0.82, assumption fragility 0.71, narrative coherence 0.84, cross-model agreement 0.79. Sample report, page 2.',
  },
] as const;

const NARRATION = [
  { t: 0,  label: 'Reading your idea…' },
  { t: 8,  label: 'Matching against 95,500 industry benchmarks…' },
  { t: 22, label: 'Stress-testing unit economics (CAC, LTV, churn)…' },
  { t: 38, label: 'Running 12-variable Monte Carlo on cash flow…' },
  { t: 55, label: 'Cross-validating with second AI model…' },
  { t: 72, label: 'Compiling verdict…' },
];

/**
 * Report-first hero.
 * Left/top: a real, scrollable PDF preview of a Quantis report ("The Draft Lab", Austin TX, June 2026).
 * Right/bottom: the idea + location inputs. The buyer sees the artifact before being asked for anything.
 */
export function ReportFirstHero() {
  const navigate = useNavigate();
  const {
    idea, setIdea,
    location, setLocation,
    handleSubmit, isLoading, analysisId, result,
  } = useAnalysis();

  const [progressStep, setProgressStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isLoading) { setProgressStep(0); setElapsed(0); return; }
    const start = Date.now();
    const i = setInterval(() => {
      const seconds = Math.floor((Date.now() - start) / 1000);
      setElapsed(seconds);
      const step = NARRATION.findIndex((n, idx) => {
        const next = NARRATION[idx + 1];
        return seconds >= n.t && (!next || seconds < next.t);
      });
      if (step >= 0) setProgressStep(step);
    }, 500);
    return () => clearInterval(i);
  }, [isLoading]);

  useEffect(() => {
    if (analysisId && result && !isLoading) {
      recordFunnelEvent('analysis_complete', { source: 'report_first_hero' });
      navigate(`/r/${analysisId}`, { replace: false });
    }
  }, [analysisId, result, isLoading, navigate]);

  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim().length < 10) return;
    trackCtaClick('report_first_hero_submit', 'hero');
    recordFunnelEvent('idea_submitted', { source: 'report_first_hero', idea_length: idea.length });
    recordFunnelEvent('analysis_start', { source: 'report_first_hero', idea_length: idea.length });
    recordFunnelEvent('analysis_started', { source: 'report_first_hero', idea_length: idea.length });
    handleSubmit(e, 'quick');
  }, [idea, handleSubmit]);

  const valid = idea.trim().length >= 10;
  const current = NARRATION[progressStep] ?? NARRATION[0];

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Array<HTMLElement | null>>([]);
  const [activePage, setActivePage] = useState(1);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  // Track which page is most visible inside the scroller (for aria-live "Page X of 15").
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const idx = pageRefs.current.findIndex((el) => el === visible.target);
          if (idx >= 0) setActivePage(idx + 1);
        }
      },
      { root, threshold: [0.25, 0.5, 0.75] }
    );
    pageRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const scrollToPage = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(PAGES.length - 1, idx));
    const el = pageRefs.current[clamped];
    if (el && scrollerRef.current) {
      scrollerRef.current.scrollTo({ top: el.offsetTop - 12, behavior: 'smooth' });
    }
  }, []);

  const onScrollerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
        case 'j':
          e.preventDefault();
          scrollToPage(activePage); // 1-based → next index
          break;
        case 'ArrowUp':
        case 'PageUp':
        case 'k':
          e.preventDefault();
          scrollToPage(activePage - 2);
          break;
        case 'Home':
          e.preventDefault();
          scrollToPage(0);
          break;
        case 'End':
          e.preventDefault();
          scrollToPage(PAGES.length - 1);
          break;
        case ' ':
          e.preventDefault();
          scroller.scrollBy({ top: e.shiftKey ? -scroller.clientHeight * 0.9 : scroller.clientHeight * 0.9, behavior: 'smooth' });
          break;
      }
    },
    [activePage, scrollToPage]
  );

  return (
    <section
      aria-label="See a real Quantis report, then generate yours"
      className="relative w-full overflow-hidden"
      style={{
        background:
          'radial-gradient(80% 60% at 50% 0%, hsl(var(--primary) / 0.08), transparent 60%), hsl(var(--background))',
        borderBottom: '1px solid hsl(var(--border))',
      }}
    >
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-16">
        {/* Eyebrow */}
        <div className="flex flex-col items-center text-center mb-8 md:mb-10">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-4 border"
            style={{
              background: 'hsl(var(--primary) / 0.08)',
              color: 'hsl(var(--primary))',
              borderColor: 'hsl(var(--primary) / 0.25)',
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Live sample · Audit-grade
          </span>
          <h1
            className="font-bold leading-[1.05] tracking-tight max-w-4xl"
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              color: 'hsl(var(--foreground))',
              letterSpacing: '-0.03em',
            }}
          >
            This is the report your investor will read.
          </h1>
          <p className="mt-4 text-base md:text-lg max-w-2xl" style={{ color: 'hsl(var(--muted-foreground))' }}>
            Scroll through a real Quantis pre-mortem below — same engine, same format you'll get.
            Then drop your idea and generate yours in 90 seconds.
          </p>
        </div>

        {/* === Headline metrics from the sample report (expandable) === */}
        <div className="mb-8 md:mb-10">
          <ul
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            aria-label="Key metrics from the sample Quantis report"
          >
            {METRICS.map((m) => {
              const Icon = m.icon;
              const open = expandedMetric === m.id;
              const panelId = `metric-panel-${m.id}`;
              return (
                <li key={m.id}>
                  <div
                    className="rounded-xl overflow-hidden h-full flex flex-col"
                    style={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                    }}
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => {
                        const next = open ? null : m.id;
                        setExpandedMetric(next);
                        if (next) trackCtaClick(`hero_metric_${m.id}`, 'hero');
                      }}
                      className="w-full text-left p-4 flex flex-col gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      style={{ outlineColor: 'hsl(var(--primary))' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                          {m.label}
                        </span>
                        <ChevronDown
                          className="w-3.5 h-3.5 transition-transform"
                          aria-hidden="true"
                          style={{
                            color: 'hsl(var(--muted-foreground))',
                            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}
                        />
                      </div>
                      <span
                        className="font-bold leading-none mt-1"
                        style={{
                          fontSize: 'clamp(1.4rem, 2.4vw, 1.9rem)',
                          color: 'hsl(var(--foreground))',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {m.value}
                      </span>
                      <span className="text-[11px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {m.sub}
                      </span>
                      <span className="text-[10px] mt-1 underline-offset-2" style={{ color: 'hsl(var(--primary))' }}>
                        {open ? 'Hide explanation' : 'Show how this was produced'}
                      </span>
                    </button>
                    <div
                      id={panelId}
                      role="region"
                      aria-label={`${m.label} — explanation`}
                      hidden={!open}
                      className="px-4 pb-4 text-[12px] leading-relaxed border-t"
                      style={{
                        color: 'hsl(var(--muted-foreground))',
                        borderColor: 'hsl(var(--border))',
                        background: 'hsl(var(--muted) / 0.35)',
                      }}
                    >
                      <p className="pt-3">{m.detail}</p>
                      <a
                        href={SAMPLE_URL}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold"
                        style={{ color: 'hsl(var(--primary))' }}
                        onClick={() => trackCtaClick(`hero_metric_open_pdf_${m.id}`, 'hero')}
                      >
                        Open full plan <Maximize2 className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>



        <div className="grid lg:grid-cols-[1.35fr_1fr] gap-6 lg:gap-8 items-start">
          {/* === LEFT: scrollable PDF preview === */}
          <div
            className="rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              boxShadow: '0 30px 80px -20px hsl(var(--primary) / 0.25)',
            }}
          >
            {/* Chrome / toolbar */}
            <div
              className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b"
              style={{
                background: 'hsl(var(--muted) / 0.5)',
                borderColor: 'hsl(var(--border))',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-1.5 mr-2 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                </div>
                <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} />
                <span
                  className="text-[11px] sm:text-xs font-mono truncate"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                  title="Quantis_Executive_Report__The_Draft_Lab__Austin_TX__2026-06-14.pdf"
                >
                  Quantis_Executive_Report — The_Draft_Lab — Austin_TX.pdf
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <span
                  className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider"
                  style={{
                    background: 'hsl(var(--primary) / 0.12)',
                    color: 'hsl(var(--primary))',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  Live sample
                </span>
                <a
                  href={SAMPLE_URL}
                  target="_blank"
                  rel="noopener"
                  className="p-1.5 rounded hover:bg-foreground/10 transition-colors"
                  aria-label="Open full report in new tab"
                  onClick={() => trackCtaClick('sample_report_open', 'hero')}
                >
                  <Maximize2 className="w-3.5 h-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} />
                </a>
                <a
                  href={SAMPLE_URL}
                  download="Quantis_Sample_Report.pdf"
                  className="p-1.5 rounded hover:bg-foreground/10 transition-colors"
                  aria-label="Download sample report"
                  onClick={() => trackCtaClick('sample_report_download', 'hero')}
                >
                  <Download className="w-3.5 h-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} />
                </a>
              </div>
            </div>

            {/* Report viewer — scrollable page stack (real rendered PDF pages) */}
            <div
              ref={scrollerRef}
              onKeyDown={onScrollerKeyDown}
              role="region"
              aria-roledescription="Document preview"
              aria-label={`Sample Quantis executive report — The Draft Lab, Austin TX. ${PAGES.length} pages. Use arrow keys, Page Up/Down, Home/End or space to navigate.`}
              tabIndex={0}
              className="relative w-full overflow-y-auto overscroll-contain scroll-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
              style={{
                height: 'clamp(520px, 72vh, 880px)',
                background:
                  'radial-gradient(120% 80% at 50% 0%, #11203A 0%, #0A1426 55%, #060C18 100%)',
                scrollbarWidth: 'thin',
                ['--tw-ring-color' as any]: 'hsl(var(--primary))',
              }}
            >
              {/* Sticky page counter / live region */}
              <div
                className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-2 text-[11px] font-mono pointer-events-none backdrop-blur-md"
                style={{
                  background:
                    'linear-gradient(to bottom, rgba(6,12,24,0.85), rgba(6,12,24,0.55) 75%, rgba(6,12,24,0))',
                  color: 'rgba(230,238,255,0.78)',
                  letterSpacing: '0.04em',
                }}
              >
                <span aria-live="polite" aria-atomic="true" className="tabular-nums">
                  <span className="opacity-60">Page</span>{' '}
                  <span className="text-white font-semibold">{String(activePage).padStart(2, '0')}</span>{' '}
                  <span className="opacity-40">/</span>{' '}
                  <span className="opacity-60">{PAGES.length}</span>
                </span>
                <span className="hidden sm:inline opacity-55 text-[10px] uppercase tracking-[0.18em]">
                  ↑ ↓ · PgUp/PgDn · Home/End
                </span>
              </div>
              <div className="flex flex-col items-center gap-8 pt-2 pb-10 px-4 sm:px-10">
                {PAGES.map((page, i) => (
                  <figure
                    key={i}
                    ref={(el) => { pageRefs.current[i] = el; }}
                    aria-label={page.label}
                    className="relative w-full max-w-[920px] rounded-[6px] overflow-hidden group"
                    style={{
                      background: '#0F1A2E',
                      boxShadow:
                        '0 1px 0 rgba(255,255,255,0.06) inset, 0 24px 60px -20px rgba(0,0,0,0.75), 0 6px 18px -8px rgba(0,0,0,0.55)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <img
                      src={page.url}
                      alt={`Quantis sample report — page ${i + 1} of ${PAGES.length}`}
                      loading={i < 2 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="block w-full h-auto select-none"
                      draggable={false}
                      style={{ imageRendering: 'auto' }}
                    />
                    <figcaption
                      className="absolute bottom-2.5 right-3 px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: 'rgba(6,12,24,0.78)',
                        color: 'rgba(230,238,255,0.7)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      {String(i + 1).padStart(2, '0')} / {PAGES.length}
                    </figcaption>
                  </figure>
                ))}

                <a
                  href={SAMPLE_URL}
                  target="_blank"
                  rel="noopener"
                  onClick={() => trackCtaClick('sample_report_open_end', 'hero')}
                  className="inline-flex items-center gap-2 mt-2 mb-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: 'hsl(var(--primary) / 0.12)',
                    color: 'hsl(var(--primary))',
                    border: '1px solid hsl(var(--primary) / 0.3)',
                  }}
                >
                  Open full PDF in new tab <Maximize2 className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Caption strip */}
            <div
              className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2.5 border-t text-[11px] font-mono"
              style={{
                background: 'hsl(var(--muted) / 0.4)',
                borderColor: 'hsl(var(--border))',
                color: 'hsl(var(--muted-foreground))',
              }}
            >
              <span>15 pages · Confidence 79% · Generated Jun 13 2026</span>
              <span className="hidden sm:inline">Industry: Consulting / F&amp;B hybrid · Austin, TX</span>
            </div>
          </div>

          {/* === RIGHT: inputs === */}
          <div className="lg:sticky lg:top-24">
            <form
              onSubmit={onSubmit}
              className="rounded-2xl p-5 sm:p-6"
              style={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                boxShadow: '0 12px 40px -12px hsl(var(--primary) / 0.18)',
              }}
            >
              <div className="mb-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'hsl(var(--primary))' }}>
                  Step 2 · Now do yours
                </p>
                <h2 className="text-xl sm:text-2xl font-bold leading-tight" style={{ color: 'hsl(var(--foreground))', letterSpacing: '-0.02em' }}>
                  Generate a report like this — free, 90s.
                </h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="hero-idea" className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Your business idea
                  </label>
                  <textarea
                    id="hero-idea"
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="e.g. Subscription specialty coffee + co-writing studio for remote creatives in downtown Austin, $12/hr access, 180 members target."
                    maxLength={300}
                    disabled={isLoading}
                    rows={4}
                    aria-label="Business idea"
                    className="w-full bg-transparent rounded-lg px-3 py-2.5 text-sm outline-none resize-none transition-colors disabled:opacity-60"
                    style={{
                      border: '1px solid hsl(var(--border))',
                      color: 'hsl(var(--foreground))',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'hsl(var(--primary))')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'hsl(var(--border))')}
                  />
                  <div className="flex justify-between mt-1 text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    <span>{idea.trim().length < 10 ? `${10 - idea.trim().length} more chars` : 'Looks good'}</span>
                    <span className="font-mono">{idea.length}/300</span>
                  </div>
                </div>

                <div>
                  <label htmlFor="hero-location" className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Location <span className="font-normal normal-case opacity-70">(city or country)</span>
                  </label>
                  <input
                    id="hero-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Austin, TX"
                    maxLength={80}
                    disabled={isLoading}
                    aria-label="Location"
                    className="w-full bg-transparent rounded-lg px-3 py-2.5 text-sm outline-none transition-colors disabled:opacity-60"
                    style={{
                      border: '1px solid hsl(var(--border))',
                      color: 'hsl(var(--foreground))',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = 'hsl(var(--primary))')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'hsl(var(--border))')}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={!valid || isLoading}
                  className="w-full h-[52px] gap-2 text-base font-semibold"
                >
                  {isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>
                  ) : (
                    <>Generate my report <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>

                {isLoading && (
                  <div
                    className="p-3 rounded-lg text-center"
                    role="status"
                    aria-live="polite"
                    style={{ background: 'hsl(var(--muted) / 0.5)', border: '1px solid hsl(var(--border))' }}
                  >
                    <div className="flex items-center justify-center gap-2 mb-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'hsl(var(--primary))' }} />
                      <span className="text-xs font-medium" style={{ color: 'hsl(var(--foreground))' }}>{current.label}</span>
                    </div>
                    <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'hsl(var(--border))' }}>
                      <div
                        className="h-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(95, (elapsed / 75) * 100)}%`, background: 'hsl(var(--primary))' }}
                      />
                    </div>
                    <p className="text-[10px] mt-1.5 font-mono" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Typical 60–90s · {elapsed}s elapsed
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-1 text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> Idea not stored publicly</span>
                  <span>·</span>
                  <span>95,500 benchmarks</span>
                  <span>·</span>
                  <span>Dual-AI verified</span>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
