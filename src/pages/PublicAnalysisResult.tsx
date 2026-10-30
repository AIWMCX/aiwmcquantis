import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAnalysisForView } from '@/services/analysisDb';
import { computeVerdict, type Verdict } from '@/lib/verdict';
import { useAuth } from '@/hooks/useAuth';
import { useShareReport } from '@/hooks/useShareReport';
import { trackEvent, recordFunnelEvent } from '@/lib/analytics';
import { PageSEO } from '@/components/seo/PageSEO';
import { Footer } from '@/components/layout/Footer';
import { ShareRail } from '@/components/result/ShareRail';
import { AnalysisResultsSkeleton } from '@/components/analysis/AnalysisResultsSkeleton';
import { PostAnalysisEmailCapture } from '@/components/analysis/PostAnalysisEmailCapture';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { toast } from 'sonner';
import { GlassCard } from '@/components/ui/glass-card';
import { IndustryCorrection } from '@/components/result/IndustryCorrection';

const AccuracyTransparentResults = lazy(() =>
  import('@/components/analysis/AccuracyTransparentResults').then((m) => ({
    default: m.AccuracyTransparentResults,
  })),
);

interface LoadedAnalysis {
  idea: string;
  location: string;
  result: BusinessAnalysisResult;
  source: 'db' | 'cache';
}

export default function PublicAnalysisResult() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { shareReport, isSharing } = useShareReport();

  const [data, setData] = useState<LoadedAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    fetchAnalysisForView(id)
      .then((res) => {
        if (cancelled) return;
        if (!res) {
          setError('We could not find this analysis. It may have expired or the link is wrong.');
        } else {
          setData(res);
          // result_view is logged via a non-funnel custom event so it doesn't pollute the SOW funnel
          import('@/lib/analytics').then(({ trackEvent }) => trackEvent('result_view', { id, source: res.source }));
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load this analysis.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const verdict: Verdict | null = data ? computeVerdict(data.result) : null;

  // Auto-fire lead-capture eligibility once verdict has been visible for 5s
  useEffect(() => {
    if (!verdict || isAuthenticated) return;
    const t = setTimeout(() => {
      import('@/lib/analytics').then(({ trackEvent }) => trackEvent('verdict_seen_5s', { tone: verdict.tone }));
    }, 5000);
    return () => clearTimeout(t);
  }, [verdict, isAuthenticated]);

  const onCreateShareLink = async () => {
    if (!id) return;
    if (!isAuthenticated) {
      toast.info('Sign in to create a permanent share link', {
        action: { label: 'Sign in', onClick: () => navigate(`/auth?returnUrl=${encodeURIComponent(`/r/${id}`)}`) },
      });
      return;
    }
    await shareReport(id);
  };

  const onSave = () => {
    if (!id) return;
    // Stash the id so post-signup we auto-claim
    try { localStorage.setItem('quantis_claim_analysis_id', id); } catch {}
    navigate(`/auth?returnUrl=${encodeURIComponent(`/r/${id}`)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-lg">
          <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              New analysis
            </Link>
          </div>
        </header>
        <main className="container max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
          <AnalysisResultsSkeleton />
        </main>
      </div>
    );
  }

  if (error || !data || !verdict) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <GlassCard glow="none" className="text-center max-w-md p-8">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-foreground mb-2">Analysis not found</h1>
          <p className="text-sm text-muted-foreground mb-6">{error || 'This analysis link is invalid.'}</p>
          <Link to="/">
            <Button>Run a new analysis</Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSEO
        title={`${verdict.toneLabel} — ${data.idea.slice(0, 60)} | Quantis`}
        description={verdict.headline}
        canonical={`/r/${id}`}
        noindex
      />

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            New analysis
          </Link>
          <ShareRail
            title={verdict.headline}
            analysisId={id}
            isAuthenticated={isAuthenticated}
            showSave={!isAuthenticated}
            onSave={onSave}
            onCreateShareLink={onCreateShareLink}
            isCreatingShareLink={isSharing}
          />
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* VERDICT — single-line, 32px, above the fold */}
        <section className="mb-8 md:mb-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-4"
            style={{
              background: `${verdict.toneColor}1A`,
              color: verdict.toneColor,
              border: `1px solid ${verdict.toneColor}40`,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: verdict.toneColor }} />
            {verdict.toneLabel}
          </div>
          <h1
            className="font-bold leading-[1.1] mb-3"
            style={{
              fontSize: 'clamp(1.5rem, 3.6vw, 2rem)',
              letterSpacing: '-0.02em',
              color: 'var(--q-text-primary, hsl(var(--foreground)))',
            }}
          >
            {verdict.headline}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mb-2">
            {verdict.subline}
          </p>
          <p className="text-xs text-muted-foreground/80">
            <span className="font-medium">Idea:</span> {data.idea}
            {data.location && data.location !== 'Global' && (
              <> · <span className="font-medium">Location:</span> {data.location}</>
            )}
          </p>
          <IndustryCorrection
            idea={data.idea}
            location={data.location}
            detectedIndustry={(data.result.metadata as { industry_detected?: string; selected_industry?: string } | undefined)?.industry_detected ?? (data.result.metadata as { selected_industry?: string } | undefined)?.selected_industry}
          />
        </section>

        {/* Conversion rail — anonymous nudge */}
        {!isAuthenticated && (
          <GlassCard
            glow="cyan"
            className="mb-8 md:mb-10 p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
              <div>
                <p className="text-sm md:text-base font-semibold text-foreground">
                  This page disappears when you close the tab.
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Save it free to keep your analysis, edit assumptions, and run unlimited stress-tests.
                </p>
              </div>
            </div>
            <ShareRail
              title={verdict.headline}
              analysisId={id}
              isAuthenticated={isAuthenticated}
              showSave
              onSave={onSave}
              onCreateShareLink={onCreateShareLink}
              isCreatingShareLink={isSharing}
              className="w-full sm:w-auto"
            />
          </GlassCard>
        )}

        {/* Full report — assumption graph, scenarios, financials */}
        <Suspense fallback={<AnalysisResultsSkeleton />}>
          <AccuracyTransparentResults result={data.result} analysisId={id} />
        </Suspense>

        {/* #100: a shared report is the only page a forwarded reader sees, and its
            only route onward was a small "New analysis" link in the top bar. */}
        <GlassCard
          glow="cyan"
          className="mt-8 md:mt-10 p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          data-testid="test-your-own-cta"
        >
          <div>
            <p className="text-sm md:text-base font-semibold text-foreground">Test a decision of your own</p>
            <p className="text-xs md:text-sm text-muted-foreground">
              Describe a hire, a price change or a new location in plain words. You get the same kind of report, with every assumption labeled. Free to try, no card.
            </p>
          </div>
          <Button asChild className="w-full sm:w-auto shrink-0">
            <Link
              to="/app"
              onClick={() => recordFunnelEvent('shared_report_cta_click', { surface: 'public_report' })}
            >
              Test your decision
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </GlassCard>

        {/* #120: a reason to share. A second reader is the honest next step for a founder,
            and every forwarded report reaches someone who could use Quantis. */}
        <GlassCard
          glow="cyan"
          className="mt-8 md:mt-10 p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          data-testid="second-opinion-share"
        >
          <div>
            <p className="text-sm md:text-base font-semibold text-foreground">Get a second opinion on these numbers</p>
            <p className="text-xs md:text-sm text-muted-foreground">
              Send this report to your accountant, a partner or an advisor. Every assumption is labeled, so they can check the inputs, not just the verdict.
            </p>
          </div>
          <ShareRail
            title={verdict.headline}
            analysisId={id}
            isAuthenticated={isAuthenticated}
            showSave={false}
            onSave={onSave}
            onCreateShareLink={onCreateShareLink}
            isCreatingShareLink={isSharing}
            className="w-full sm:w-auto"
          />
        </GlassCard>

        {/* Above-the-fold-of-decision email capture — anon users only.
            Wired through useLeadCapture → capture_lead RPC → send-welcome-email edge fn. */}
        {!isAuthenticated && (
          <PostAnalysisEmailCapture
            ideaTitle={data.idea}
            monthlyProfit={
              typeof data.result?.financial_analysis?.monthly_profit === 'number'
                ? `$${Math.round(data.result.financial_analysis.monthly_profit).toLocaleString('en-US')}`
                : undefined
            }
            onDismiss={() => {
              trackEvent('post_results_email_dismissed', { analysis_id: id });
            }}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
