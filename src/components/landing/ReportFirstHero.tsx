import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, Lock, Download, Maximize2, FileText, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnalysis } from '@/hooks/useAnalysis';
import { recordFunnelEvent, trackCtaClick } from '@/lib/analytics';
import sampleReportAsset from '@/assets/quantis-sample-report.pdf.asset.json';

const SAMPLE_URL = sampleReportAsset.url;

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

            {/* PDF viewer (scrollable) */}
            <div
              className="relative w-full"
              style={{
                height: 'clamp(420px, 62vh, 720px)',
                background: '#0B1220',
              }}
            >
              <object
                data={`${SAMPLE_URL}#view=FitH&toolbar=0&navpanes=0`}
                type="application/pdf"
                aria-label="Sample Quantis executive report — The Draft Lab, Austin TX"
                className="absolute inset-0 w-full h-full"
              >
                <iframe
                  src={`${SAMPLE_URL}#view=FitH&toolbar=0&navpanes=0`}
                  title="Sample Quantis executive report — The Draft Lab, Austin TX"
                  className="absolute inset-0 w-full h-full border-0"
                />
              </object>
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
