import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAnalysisForView } from '@/services/analysisDb';
import { computeVerdict, type Verdict } from '@/lib/verdict';
import { useAuth } from '@/hooks/useAuth';
import { useShareReport } from '@/hooks/useShareReport';
import { trackEvent } from '@/lib/analytics';
import { PageSEO } from '@/components/seo/PageSEO';
import { Footer } from '@/components/layout/Footer';
import { ShareRail } from '@/components/result/ShareRail';
import { AnalysisResultsSkeleton } from '@/components/analysis/AnalysisResultsSkeleton';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { toast } from 'sonner';

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

  const onShare = async () => {
    if (!id) return;
    trackCtaClick('share_result', 'result_rail');
    if (!isAuthenticated) {
      toast.info('Sign in to create a permanent share link', {
        action: { label: 'Sign in', onClick: () => navigate('/auth') },
      });
      // Fallback: copy current URL
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Link copied to clipboard');
      } catch {}
      return;
    }
    await shareReport(id);
  };

  const onSave = () => {
    trackCtaClick('save_result', 'result_rail');
    if (!id) return;
    // Stash the id so post-signup we auto-claim
    try { localStorage.setItem('quantis_claim_analysis_id', id); } catch {}
    navigate(`/auth?next=/r/${id}`);
  };

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading your analysis…</p>
        </div>
      </div>
    );
  }

  if (error || !data || !verdict) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-foreground mb-2">Analysis not found</h1>
          <p className="text-sm text-muted-foreground mb-6">{error || 'This analysis link is invalid.'}</p>
          <Link to="/">
            <Button>Run a new analysis</Button>
          </Link>
        </div>
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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-2" onClick={onCopyLink}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy link'}</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={onShare} disabled={isSharing}>
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
            {!isAuthenticated && (
              <Button size="sm" className="gap-2" onClick={onSave}>
                <Save className="w-4 h-4" />
                Save analysis
              </Button>
            )}
          </div>
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
        </section>

        {/* Conversion rail — anonymous nudge */}
        {!isAuthenticated && (
          <section
            className="mb-8 md:mb-10 p-5 md:p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            style={{
              background: 'var(--q-bg-elevated, hsl(var(--muted) / 0.4))',
              border: '1px solid var(--q-border-default, hsl(var(--border)))',
            }}
          >
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="text-sm md:text-base font-semibold text-foreground">
                  This page disappears when you close the tab.
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Save it free to keep your analysis, edit assumptions, and run unlimited stress-tests.
                </p>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button onClick={onSave} className="gap-2 flex-1 sm:flex-none">
                <Save className="w-4 h-4" />
                Save free
              </Button>
              <Button variant="outline" onClick={onShare} className="gap-2 flex-1 sm:flex-none">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </section>
        )}

        {/* Full report — assumption graph, scenarios, financials */}
        <Suspense
          fallback={
            <div className="rounded-2xl bg-muted/30 animate-pulse" style={{ height: 600 }} />
          }
        >
          <AccuracyTransparentResults result={data.result} analysisId={id} />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
