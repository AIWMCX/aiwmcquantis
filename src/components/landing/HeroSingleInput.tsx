import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, Sparkles, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnalysis } from '@/hooks/useAnalysis';
import { recordFunnelEvent, trackCtaClick } from '@/lib/analytics';

const NARRATION = [
  { t: 0,    label: 'Reading your idea…' },
  { t: 8,    label: 'Matching against 95,500 industry benchmarks…' },
  { t: 22,   label: 'Stress-testing unit economics (CAC, LTV, churn)…' },
  { t: 38,   label: 'Running 12-variable Monte Carlo on cash flow…' },
  { t: 55,   label: 'Cross-validating with second AI model…' },
  { t: 72,   label: 'Compiling verdict…' },
];

/**
 * Anonymous-first single-input flow.
 * Visitor types one line, presses Enter or clicks the CTA.
 * No auth, no second field, no document upload, no tier picker.
 * On success, we navigate to /r/:id where they see their verdict
 * with a save/share rail that converts them to an account.
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

  // Default the location field invisibly so the edge function validation
  // (which requires location ≥ 2 chars) passes for the single-input flow.
  // Visitors who care about geo precision use the full /app form.
  useEffect(() => {
    if (!location) setLocation('Global');
  }, [location, setLocation]);

  // Progress narration during the wait
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
    trackCtaClick('hero_single_input_submit', 'hero');
    // Canonical Prompt 3 funnel: north-star starts at idea_submitted.
    recordFunnelEvent('idea_submitted', { source: 'hero_single_input', idea_length: idea.length });
    recordFunnelEvent('analysis_start', { source: 'hero_single_input', idea_length: idea.length });
    recordFunnelEvent('analysis_started', { source: 'hero_single_input', idea_length: idea.length });
    handleSubmit(e, 'quick');
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
          <h2
            className="font-bold leading-[1.1] mb-3"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              fontFamily: 'var(--q-font-heading, inherit)',
              color: 'var(--q-text-primary, hsl(var(--foreground)))',
              letterSpacing: '-0.025em',
            }}
          >
            Type your business idea. Get a verdict.
          </h2>
          <p className="text-sm md:text-base max-w-xl mx-auto" style={{ color: 'var(--q-text-secondary, hsl(var(--muted-foreground)))' }}>
            One sentence is enough. We stress-test it against 95,500 real benchmarks and tell you, brutally, if the math holds.
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
                  Analyzing…
                </>
              ) : (
                <>
                  Stress-test it free
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>

          {/* Progress narration during the 60-90s wait — keeps the user from bouncing */}
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

          {/* Trust micro-row */}
          {!isLoading && (
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-4 text-xs" style={{ color: 'var(--q-text-tertiary, hsl(var(--muted-foreground)))' }}>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="w-3 h-3" />
                We don't store your idea publicly.
              </span>
              <span>·</span>
              <span>95,500 verified benchmarks</span>
              <span>·</span>
              <span>Multi-model cross-checked</span>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
