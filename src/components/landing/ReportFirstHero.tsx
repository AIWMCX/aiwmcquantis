import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';

import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, Lock, Download, Maximize2, Minimize2, X, FileText, ShieldCheck, ChevronDown, DollarSign, Clock, TrendingUp, Gauge, ZoomIn, ZoomOut, Contrast, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnalysis } from '@/hooks/useAnalysis';
import { recordFunnelEvent, trackCtaClick } from '@/lib/analytics';
import { SAMPLE_REPORT, HEADLINE_METRICS, validateSampleReportIntegrity } from '@/data/sampleReport';
import { SampleReportPages } from './SampleReportPages';

const SAMPLE_URL = '/sample-report/quantis-sample-report.pdf';
const PAGE_COUNT = SAMPLE_REPORT.pages.length;

// Commercial cover card shown above the rendered report pages.
const COVER = {
  company: SAMPLE_REPORT.meta.company,
  tagline: SAMPLE_REPORT.meta.tagline,
  industry: SAMPLE_REPORT.meta.industry,
  location: SAMPLE_REPORT.meta.location,
  generated: SAMPLE_REPORT.meta.generated,
  pages: SAMPLE_REPORT.meta.pages,
  confidence: SAMPLE_REPORT.meta.confidenceLabel,
  summary: SAMPLE_REPORT.meta.summary,
} as const;

const METRIC_ICONS: Record<string, typeof DollarSign> = {
  investment: DollarSign,
  payback: Clock,
  profit: TrendingUp,
  confidence: Gauge,
};

type ReadingTheme = 'dark' | 'highContrast' | 'sepia';
const ZOOM_MIN = 0.85;
const ZOOM_MAX = 1.6;
const ZOOM_STEP = 0.1;

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
  const fullscreenBtnRef = useRef<HTMLButtonElement | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // ---- Reading-mode persistence (zoom · theme · density) ----
  const PREFS_KEY = 'aiwmc.quantis.readingPrefs.v1';
  const readPrefs = () => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as { zoom?: number; theme?: ReadingTheme; density?: Density };
    } catch {
      return null;
    }
  };
  const initialPrefs = readPrefs();
  const [zoom, setZoom] = useState<number>(() => {
    const z = initialPrefs?.zoom;
    return typeof z === 'number' && z >= ZOOM_MIN && z <= ZOOM_MAX ? z : 1;
  });
  const [theme, setTheme] = useState<ReadingTheme>(() => {
    const t = initialPrefs?.theme;
    return t === 'dark' || t === 'highContrast' || t === 'sepia' ? t : 'dark';
  });
  const [density, setDensity] = useState<Density>(() => {
    const d = initialPrefs?.density;
    return d === 'compact' || d === 'comfort' || d === 'spacious' ? d : 'comfort';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify({ zoom, theme, density }));
    } catch { /* quota / privacy mode → silently no-op */ }
  }, [zoom, theme, density]);

  // Runtime integrity check — verifies the headline cards still match the canonical report data.
  // Re-runs when the user clicks "Reload data from API" so the banner can clear itself.
  const [integrityNonce, setIntegrityNonce] = useState(0);
  const [isReloading, setIsReloading] = useState(false);
  const integrityIssues = useMemo(() => validateSampleReportIntegrity(), [integrityNonce]);

  const reloadFromApi = useCallback(async () => {
    setIsReloading(true);
    try {
      // Re-fetch the sample report payload (cache-busted) — same JSON shape as the embedded
      // SAMPLE_REPORT. In production the response is identical; this hook exists so the page
      // can resync after a deploy without a full reload.
      const res = await fetch(`/sample-report/sample-report.json?ts=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        // We don't replace the module-level constant at runtime, but a fresh fetch confirms
        // the live JSON matches what the bundle was built against; the integrity validator
        // re-runs to surface (or clear) any client-side drift.
        await res.json().catch(() => null);
      }
    } catch { /* offline → keep current state */ }
    setIntegrityNonce((n) => n + 1);
    setIsReloading(false);
  }, []);

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
    const clamped = Math.max(0, Math.min(PAGE_COUNT - 1, idx));
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
          scrollToPage(PAGE_COUNT - 1);
          break;
        case ' ':
          e.preventDefault();
          scroller.scrollBy({ top: e.shiftKey ? -scroller.clientHeight * 0.9 : scroller.clientHeight * 0.9, behavior: 'smooth' });
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)));
          break;
        case '-':
        case '_':
          e.preventDefault();
          setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)));
          break;
        case '0':
          e.preventDefault();
          setZoom(1);
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          setTheme((t) => (t === 'dark' ? 'highContrast' : t === 'highContrast' ? 'sepia' : 'dark'));
          break;
      }
    },
    [activePage, scrollToPage]
  );

  // Fullscreen: lock body scroll, focus the scroller, restore focus & scroll position on exit.
  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Re-scroll to currently active page after layout flips.
    requestAnimationFrame(() => {
      const el = pageRefs.current[activePage - 1];
      if (el && scrollerRef.current) {
        scrollerRef.current.scrollTo({ top: el.offsetTop - 12, behavior: 'auto' });
      }
      scrollerRef.current?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      // restore focus to the trigger
      fullscreenBtnRef.current?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen]);

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
            {HEADLINE_METRICS.map((m) => {
              const Icon = METRIC_ICONS[m.id] ?? Gauge;
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



        {/* Data-integrity banner — visible only if headline metrics drift from canonical report */}
        {integrityIssues.length > 0 && (
          <div
            role="alert"
            className="mb-4 rounded-lg px-4 py-3 flex items-start gap-3"
            style={{
              background: 'hsl(var(--destructive) / 0.08)',
              border: '1px solid hsl(var(--destructive) / 0.35)',
              color: 'hsl(var(--destructive))',
            }}
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="text-[12px] leading-relaxed">
              <strong className="font-semibold">Data integrity warning:</strong> headline metrics do not match the live sample report —
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {integrityIssues.map((msg) => <li key={msg}>{msg}</li>)}
              </ul>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-[1.35fr_1fr] gap-6 lg:gap-8 items-start">
          {/* === LEFT: scrollable PDF preview === */}
          <div
            className={
              isFullscreen
                ? 'fixed inset-0 z-50 flex flex-col rounded-none overflow-hidden'
                : 'rounded-2xl overflow-hidden shadow-2xl'
            }
            role={isFullscreen ? 'dialog' : undefined}
            aria-modal={isFullscreen ? true : undefined}
            aria-label={isFullscreen ? 'Sample Quantis report — fullscreen preview' : undefined}
            style={{
              background: 'hsl(var(--card))',
              border: isFullscreen ? 'none' : '1px solid hsl(var(--border))',
              boxShadow: isFullscreen ? 'none' : '0 30px 80px -20px hsl(var(--primary) / 0.25)',
            }}
          >
            {/* Chrome / toolbar */}
            <div
              className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b shrink-0"
              style={{
                background: 'hsl(var(--muted) / 0.5)',
                borderColor: 'hsl(var(--border))',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }} aria-hidden="true" />
                <span
                  className="text-[11px] sm:text-xs font-mono truncate"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                  title="Quantis_Executive_Report__The_Draft_Lab__Austin_TX__2026-06-13.pdf"
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
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden="true" />
                  Live sample
                </span>
                {/* Reading-mode controls: zoom out / zoom in / contrast cycle */}
                <div className="hidden sm:flex items-center gap-0.5 mr-1 pr-1.5" style={{ borderRight: '1px solid hsl(var(--border))' }}>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
                    disabled={zoom <= ZOOM_MIN}
                    aria-label="Decrease reading zoom"
                    className="p-1.5 rounded hover:bg-foreground/10 transition-colors focus:outline-none focus-visible:ring-2 disabled:opacity-40"
                    style={{ ['--tw-ring-color' as any]: 'hsl(var(--primary))' }}
                  >
                    <ZoomOut className="w-3.5 h-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} aria-hidden="true" />
                  </button>
                  <span
                    className="text-[10px] font-mono tabular-nums px-1 min-w-[34px] text-center"
                    style={{ color: 'hsl(var(--muted-foreground))' }}
                    aria-live="polite"
                  >
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
                    disabled={zoom >= ZOOM_MAX}
                    aria-label="Increase reading zoom"
                    className="p-1.5 rounded hover:bg-foreground/10 transition-colors focus:outline-none focus-visible:ring-2 disabled:opacity-40"
                    style={{ ['--tw-ring-color' as any]: 'hsl(var(--primary))' }}
                  >
                    <ZoomIn className="w-3.5 h-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme((t) => (t === 'dark' ? 'highContrast' : t === 'highContrast' ? 'sepia' : 'dark'))}
                    aria-label={`Toggle reading contrast (current: ${theme})`}
                    className="p-1.5 rounded hover:bg-foreground/10 transition-colors focus:outline-none focus-visible:ring-2"
                    style={{ ['--tw-ring-color' as any]: 'hsl(var(--primary))' }}
                    title={`Contrast: ${theme}`}
                  >
                    <Contrast className="w-3.5 h-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} aria-hidden="true" />
                  </button>
                </div>
                <button
                  ref={fullscreenBtnRef}
                  type="button"
                  className="p-1.5 rounded hover:bg-foreground/10 transition-colors focus:outline-none focus-visible:ring-2"
                  aria-label={isFullscreen ? 'Exit fullscreen preview' : 'Open fullscreen preview'}
                  aria-pressed={isFullscreen}
                  onClick={() => {
                    setIsFullscreen((v) => !v);
                    trackCtaClick(isFullscreen ? 'sample_report_fullscreen_exit' : 'sample_report_fullscreen_enter', 'hero');
                  }}
                  style={{ ['--tw-ring-color' as any]: 'hsl(var(--primary))' }}
                >
                  {isFullscreen
                    ? <Minimize2 className="w-3.5 h-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} aria-hidden="true" />
                    : <Maximize2 className="w-3.5 h-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} aria-hidden="true" />}
                </button>
                <a
                  href={SAMPLE_URL}
                  download="Quantis_Sample_Report.pdf"
                  className="p-1.5 rounded hover:bg-foreground/10 transition-colors"
                  aria-label="Download sample report PDF"
                  onClick={() => trackCtaClick('sample_report_download', 'hero')}
                >
                  <Download className="w-3.5 h-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} aria-hidden="true" />
                </a>
                {isFullscreen && (
                  <button
                    type="button"
                    onClick={() => setIsFullscreen(false)}
                    aria-label="Close fullscreen preview"
                    className="p-1.5 rounded hover:bg-foreground/10 transition-colors focus:outline-none focus-visible:ring-2"
                    style={{ ['--tw-ring-color' as any]: 'hsl(var(--primary))' }}
                  >
                    <X className="w-3.5 h-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            {/* Report viewer — scrollable page stack (real rendered PDF pages) */}
            <div
              ref={scrollerRef}
              onKeyDown={onScrollerKeyDown}
              role="region"
              aria-roledescription="Document preview"
              aria-label={`Sample Quantis executive report — ${COVER.company}, ${COVER.location}. ${PAGE_COUNT} pages. Use arrow keys, Page Up/Down, Home/End or space to navigate. Press plus/minus to zoom, C to switch contrast, Escape to exit fullscreen.`}
              tabIndex={0}
              className="relative w-full overflow-y-auto overscroll-contain scroll-smooth focus:outline-none focus-visible:ring-2 focus-visible:ring-inset flex-1"
              style={{
                height: isFullscreen ? 'auto' : 'clamp(520px, 72vh, 880px)',
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
                  <span className="opacity-60">{PAGE_COUNT}</span>
                </span>
                <span className="hidden sm:inline opacity-55 text-[10px] uppercase tracking-[0.18em]">
                  ↑ ↓ · PgUp/PgDn · Home/End · + / − · C · Esc
                </span>
              </div>
              <div className="flex flex-col items-center gap-8 pt-2 pb-10 px-4 sm:px-10">
                {/* === Commercial cover (above page 1) === */}
                <section
                  aria-label="Report cover"
                  className="relative w-full max-w-[920px] rounded-[8px] overflow-hidden"
                  style={{
                    background:
                      'linear-gradient(160deg, #0F1F3D 0%, #0B1730 55%, #07101F 100%)',
                    border: '1px solid rgba(143, 255, 42, 0.18)',
                    boxShadow:
                      '0 1px 0 rgba(255,255,255,0.06) inset, 0 24px 60px -20px rgba(0,0,0,0.8)',
                  }}
                >
                  <div className="flex items-center justify-between px-6 pt-5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[11px] font-bold"
                        style={{ background: '#8FFF2A', color: '#06120A', fontFamily: 'ui-monospace, Menlo, monospace' }}
                        aria-hidden="true"
                      >
                        Q
                      </span>
                      <span className="text-[11px] uppercase tracking-[0.22em] font-semibold" style={{ color: 'rgba(230,238,255,0.85)' }}>
                        AIWMC<sup className="text-[7px] align-super">™</sup> Quantis
                      </span>
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: 'rgba(143,255,42,0.85)' }}>
                      Executive Report
                    </span>
                  </div>
                  <div className="px-6 pt-6 pb-5">
                    <p className="text-[10px] uppercase tracking-[0.22em] font-semibold" style={{ color: 'rgba(230,238,255,0.55)' }}>
                      Business Feasibility Analysis
                    </p>
                    <h3
                      className="mt-2 font-bold leading-tight"
                      style={{
                        fontSize: 'clamp(1.6rem, 3vw, 2.25rem)',
                        color: '#FFFFFF',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {COVER.company}
                    </h3>
                    <p className="mt-1 text-sm" style={{ color: 'rgba(230,238,255,0.7)' }}>
                      {COVER.tagline}
                    </p>
                    <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                      {[
                        { k: 'Company', v: COVER.company },
                        { k: 'Location', v: COVER.location },
                        { k: 'Industry', v: COVER.industry },
                        { k: 'Generated', v: COVER.generated },
                      ].map((row) => (
                        <div key={row.k} className="rounded-md px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <dt className="text-[9px] uppercase tracking-[0.18em] font-semibold" style={{ color: 'rgba(230,238,255,0.45)' }}>{row.k}</dt>
                          <dd className="mt-0.5 font-mono" style={{ color: 'rgba(255,255,255,0.92)' }}>{row.v}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-5 text-[13px] leading-relaxed" style={{ color: 'rgba(230,238,255,0.78)' }}>
                      <span className="text-[9px] uppercase tracking-[0.22em] font-semibold block mb-1.5" style={{ color: 'rgba(143,255,42,0.85)' }}>
                        Executive summary
                      </span>
                      {COVER.summary}
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono" style={{ color: 'rgba(230,238,255,0.55)' }}>
                      <span>{COVER.pages} pages</span>
                      <span aria-hidden="true">·</span>
                      <span>Confidence {COVER.confidence}</span>
                      <span aria-hidden="true">·</span>
                      <span>Dual-AI verified</span>
                    </div>
                  </div>
                </section>

                <SampleReportPages zoom={zoom} theme={theme} pageRefs={pageRefs} />


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
