import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnalysis } from '@/hooks/useAnalysis';
import {
  recordFunnelEvent,
  trackCtaClick,
  trackAnalysisView,
  trackAnalysisStep,
  trackAnalysisAbandon,
} from '@/lib/analytics';
import { EmbeddedSampleReport } from '@/components/landing/EmbeddedSampleReport';

const NARRATION = [
  { t: 0,    label: 'Reading your idea…' },
  { t: 8,    label: 'Matching against 95,500 industry benchmarks…' },
  { t: 22,   label: 'Stress-testing unit economics (CAC, LTV, churn)…' },
  { t: 38,   label: 'Running 12-variable Monte Carlo on cash flow…' },
  { t: 55,   label: 'Cross-validating with second AI model…' },
  { t: 72,   label: 'Compiling verdict…' },
];

/**
 * Anonymous-first single-input flow + embedded sample report (proof) inline.
 * Visitor types one line, presses Enter or clicks the CTA. On success, we
 * navigate to /r/:id where they see their verdict.
 *
 * Per-step funnel events emitted (see /admin/conversion-by-source):
 *   analysis_view           — section becomes visible
 *   analysis_step_view      — step="idea" | "location" | "submit"
 *   analysis_step_complete  — fires when leaving a step with content
 *   analysis_abandon        — user leaves without completing
 *   analysis_start          — submit pressed (existing)
 *   analysis_complete       — result returned (existing)
 */
export function HeroSingleInput() {
  const navigate = useNavigate();
  const {
    idea, setIdea,
    location, setLocation,
    handleSubmit, isLoading, analysisId, result,
  } = useAnalysis();

  const [progressStep, setProgressStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Per-step tracking refs
  const viewedRef = useRef(false);
  const enteredAt = useRef<number>(Date.now());
  const stepEnteredAt = useRef<Record<string, number>>({});
  const completedStepsRef = useRef<Set<string>>(new Set());
  const lastStepRef = useRef<string>('idea');
  const submittedRef = useRef(false);

  // 1. analysis_view + idea step view on mount
  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackAnalysisView('hero_single_input');
    trackAnalysisStep('view', 'idea');
    stepEnteredAt.current['idea'] = Date.now();
    enteredAt.current = Date.now();
  }, []);

  // 2. abandonment tracking — fire on page hide if user never submitted
  useEffect(() => {
    const onLeave = () => {
      if (submittedRef.current) return;
      const ms = Date.now() - enteredAt.current;
      // Only count meaningful sessions (>2s) to filter bounces.
      if (ms > 2000) {
        trackAnalysisAbandon(lastStepRef.current, ms, {
          had_idea: idea.trim().length > 0,
        });
      }
    };
    const onVis = () => { if (document.visibilityState === 'hidden') onLeave(); };
    window.addEventListener('pagehide', onLeave);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', onLeave);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [idea]);

  // 3. mark "idea" step complete once user types ≥10 chars (after a debounce)
  useEffect(() => {
    if (idea.trim().length < 10 || completedStepsRef.current.has('idea')) return;
    const t = setTimeout(() => {
      completedStepsRef.current.add('idea');
      const ms = Date.now() - (stepEnteredAt.current['idea'] ?? Date.now());
      trackAnalysisStep('complete', 'idea', { ms_on_step: ms, length: idea.trim().length });
    }, 800);
    return () => clearTimeout(t);
  }, [idea]);

  // Default the location field invisibly so the edge function validation passes.
  useEffect(() => {
    if (!location) setLocation('Global');
  }, [location, setLocation]);

  // Progress narration
  useEffect(() => {
    if (!isLoading) {
      setProgressStep(0);
      setElapsed(0);
      return;
    }
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

  // Navigate to result page once we have an id
  useEffect(() => {
    if (analysisId && result && !isLoading) {
      recordFunnelEvent('analysis_complete', { source: 'hero_single_input' });
      navigate(`/r/${analysisId}`, { replace: false });
    }
  }, [analysisId, result, isLoading, navigate]);

  const onSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (idea.trim().length < 10) return;
    submittedRef.current = true;
    lastStepRef.current = 'submit';
    trackAnalysisStep('view', 'submit');
    trackAnalysisStep('complete', 'submit', { ms_on_step: Date.now() - enteredAt.current });
    trackCtaClick('hero_single_input_submit', 'hero');
    recordFunnelEvent('analysis_start', { source: 'hero_single_input', idea_length: idea.length });
    handleSubmit(e, 'quick', { isLandingDemo: true });
  }, [idea, handleSubmit]);

  const valid = idea.trim().length >= 10;
  const current = NARRATION[progressStep] ?? NARRATION[0];

  return (
    <section
      aria-label="Stress-test your business idea"
      className="relative w-full"
      style={{
        background: 'var(--q-gradient-hero, linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted)) 100%))',
        borderBottom: '1px solid var(--q-border-default, hsl(var(--border)))',
      }}
    >
      <div className="container max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        <div className="text-center mb-6">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-4"
            style={{
              background: 'var(--q-status-ai-bg, hsl(var(--primary) / 0.1))',
              color: 'var(--q-status-ai, hsl(var(--primary)))',
              border: '1px solid var(--q-status-ai-border, hsl(var(--primary) / 0.2))',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Free · No signup · 90 seconds
          </span>
          <h1
            className="font-bold leading-[1.1] mb-3"
            style={{
              fontSize: 'clamp(1.95rem, 4.4vw, 3rem)',
              fontFamily: 'var(--q-font-heading, inherit)',
              color: 'var(--q-text-primary, hsl(var(--foreground)))',
              letterSpacing: '-0.025em',
            }}
          >
            Find out if your business idea actually makes money — before you spend a dollar.
          </h1>
          <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: 'var(--q-text-secondary, hsl(var(--muted-foreground)))' }}>
            Describe your idea in one sentence. Get the monthly profit, break-even date, the three things most likely to kill it, and an honest go / pivot / kill verdict — in 90 seconds. Free.
          </p>
        </div>

        <form onSubmit={onSubmit} className="max-w-2xl mx-auto">
          <div
            className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl"
            style={{
              background: 'var(--q-bg-elevated, hsl(var(--card)))',
              border: '1px solid var(--q-border-default, hsl(var(--border)))',
              boxShadow: '0 12px 40px -12px hsl(var(--primary) / 0.18)',
            }}
          >
            <input
              type="text"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              onFocus={() => { lastStepRef.current = 'idea'; }}
              placeholder="e.g. Subscription coffee shop in Austin, $8/cup, 200 customers/mo"
              maxLength={300}
              disabled={isLoading}
              autoFocus={false}
              aria-label="Business idea"
              className="flex-1 bg-transparent border-0 outline-none px-4 py-3 text-base sm:text-lg placeholder:text-muted-foreground/60 disabled:opacity-60"
              style={{ color: 'var(--q-text-primary, hsl(var(--foreground)))' }}
            />
            <Button
              type="submit"
              size="lg"
              disabled={!valid || isLoading}
              className="h-[52px] px-6 gap-2 text-base font-semibold shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running your analysis…
                </>
              ) : (
                <>Analyze my idea — free</>
              )}
            </Button>
          </div>

          {isLoading && (
            <div
              className="mt-4 p-4 rounded-xl text-center"
              role="status"
              aria-live="polite"
              style={{
                background: 'var(--q-bg-elevated, hsl(var(--card)))',
                border: '1px solid var(--q-border-default, hsl(var(--border)))',
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm font-medium" style={{ color: 'var(--q-text-primary, hsl(var(--foreground)))' }}>
                  {current.label}
                </span>
              </div>
              <div className="h-1 w-full max-w-md mx-auto rounded-full overflow-hidden" style={{ background: 'var(--q-border-default, hsl(var(--muted)))' }}>
                <div
                  className="h-full transition-all duration-500 ease-out"
                  style={{
                    width: `${Math.min(95, (elapsed / 75) * 100)}%`,
                    background: 'var(--q-accent-primary, hsl(var(--primary)))',
                  }}
                />
              </div>
              <p className="text-[11px] mt-2" style={{ color: 'var(--q-text-tertiary, hsl(var(--muted-foreground)))' }}>
                Typical run: 60–90 seconds · {elapsed}s elapsed
              </p>
            </div>
          )}

          {!isLoading && (
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4 text-xs" style={{ color: 'var(--q-text-tertiary, hsl(var(--muted-foreground)))' }}>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                Your idea stays private
              </span>
              <span>·</span>
              <span>No credit card</span>
              <span>·</span>
              <span>Real numbers, sourced</span>
            </div>
          )}
        </form>
      </div>

      {/* Inline proof-of-output, immediately below the input so it's
          truly above the fold for most viewports. */}
      {!isLoading && (
        <div className="border-t border-border bg-background/40">
          <EmbeddedSampleReport />
        </div>
      )}
    </section>
  );
}
