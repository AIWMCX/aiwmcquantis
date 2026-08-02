import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/layout/EmptyState';
import { CompactAnalysisForm } from '@/components/analysis/CompactAnalysisForm';
import { FreeTierResultCard } from '@/components/analysis/FreeTierResultCard';
import { detectQuoteGenTrade } from '@/lib/quotegen-eligibility';
import { Receipt } from 'lucide-react';
// Lazy: pulls @react-pdf/renderer (~1.5 MB). Keep off the dashboard entry bundle.
const AccuracyTransparentResults = lazy(() =>
  import('@/components/analysis/AccuracyTransparentResults').then((m) => ({
    default: m.AccuracyTransparentResults,
  }))
);
import { AnalysisHistory } from '@/components/analysis/AnalysisHistory';
import { AnalysisTopBar } from '@/components/analysis/AnalysisTopBar';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { BENCHMARK_COUNT_DISPLAY, BENCHMARK_SOURCES_DISPLAY } from '@/config/canonical-facts';
import { RateLimitBanner } from '@/components/analysis/RateLimitBanner';
import { QuickStartWizard } from '@/components/onboarding/QuickStartWizard';
import { FirstAnalysisCelebration } from '@/components/onboarding/FirstAnalysisCelebration';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  History,
  FileText,
  Zap,
  CreditCard,
  RefreshCw,
  AlertCircle,
  Settings,
  Brain,
  ChevronDown,
  CheckCircle2,
  Crown,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { usePromoStatus, FOUNDER_PROMO_CODE } from '@/hooks/usePromoStatus';
import { PageSEO } from '@/components/seo/PageSEO';
import { NextStepsBar } from '@/components/analysis/NextStepsBar';
import { PostAnalysisAuthPrompt } from '@/components/analysis/PostAnalysisAuthPrompt';
import { isReturningAnonymousUser } from '@/lib/anonymousTracking';
import { SectionErrorBoundary } from '@/components/analysis/SectionErrorBoundary';
import { AnalysisErrorPanel } from '@/components/analysis/AnalysisErrorPanel';
import { CapacityCheckCard } from '@/components/analysis/CapacityCheckCard';
import { MarketSizingCard } from '@/components/analysis/MarketSizingCard';
import { businessResultToPlusInput } from '@/services/specTierApi';
import { AnalysisCounterTooltip } from '@/components/AnalysisCounterTooltip';
import { recordFunnelEvent } from '@/lib/analytics';
import { ContextualUpgradeBanner } from '@/components/engagement/ContextualUpgradeBanner';
import { normalizeAnalysisResult } from '@/lib/analysis-normalizer';

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Sync activeTab with URL ?tab= param
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'history' ? tabParam : 'analyze';
  const [activeTab, setActiveTab] = useState<'analyze' | 'history'>(initialTab);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'history') {
      setActiveTab(t);
    } else if (!t) {
      setActiveTab('analyze');
    }
  }, [searchParams]);

  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);

  // Spec (AIWMC_Quantis_Scenario_Evidence_System_Spec): "?tab=scenarios" was
  // a static placeholder tab, never a real workspace — replace with route
  // navigation to the actual /app/scenarios workspace rather than rendering
  // dead-end dashboard content.
  useEffect(() => {
    if (searchParams.get('tab') !== 'scenarios') return;
    navigate(
      currentAnalysisId ? `/app/scenarios?analysisId=${currentAnalysisId}` : '/app/scenarios',
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasPrefill, setHasPrefill] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [showScrollBanner, setShowScrollBanner] = useState(false);
  const [showNextSteps, setShowNextSteps] = useState(false);
  const prevResultRef = useRef<boolean>(false);

  const { isAuthenticated, user } = useAuth();
  const { showPromo: showFounderPromoCard } = usePromoStatus();

  // Soft "welcome back" nudge for recognized returning visitors who already ran a
  // free analysis on this device but never created an account. Non-blocking (they
  // can still run another) — it just invites the +1 sign-in. Computed in an effect
  // so the prerendered HTML and the client agree (no hydration mismatch).
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  useEffect(() => {
    if (isAuthenticated) {
      setShowWelcomeBack(false);
      return;
    }
    try {
      if (sessionStorage.getItem('quantis_welcome_back_dismissed')) return;
      if (isReturningAnonymousUser() && localStorage.getItem('has_run_analysis')) {
        setShowWelcomeBack(true);
      }
    } catch {
      /* storage unavailable — skip the nudge */
    }
  }, [isAuthenticated]);

  const {
    shouldShowQuickStart,
    shouldShowFirstAnalysisCelebration,
    markQuickStartComplete,
    markFirstAnalysisCelebrationSeen,
    incrementAnalysisCount,
  } = useOnboarding();
  const {
    isPlus,
    isPro,
    isFree,
    remainingAnalyses,
    loading: subscriptionLoading,
    error: subscriptionError,
    isTimedOut,
    createCheckout,
    openPortal,
    refetch: refetchSubscription,
  } = useSubscription();
  const settingsPath = isPro ? '/pro-settings' : '/plus-settings';

  const {
    idea,
    setIdea,
    location,
    setLocation,
    financialInputs,
    setFinancialInputs,
    errors,
    clearError,
    result,
    setResult,
    freeTierSummary,
    analysisId,
    isLoading,
    isError,
    error,
    retry,
    handleSubmit,
    reset,
    isFormValid,
    files,
    isUploading,
    uploadFiles,
    removeFile,
    maxFiles,
    allowedExtensions,
    rateLimitError,
    clearRateLimitError,
  } = useAnalysis();

  // Tracks how many times the user has clicked Retry for the current error
  // session. Resets on a successful result or a fresh submission via the form.
  const [retryAttempt, setRetryAttempt] = useState(0);
  useEffect(() => {
    if (!isError) setRetryAttempt(0);
  }, [isError]);

  // Compute reliability score from form completeness
  const reliabilityData = useMemo(() => {
    let score = 0;
    let gain = 0;
    let gainHint = '';

    // Step 1: Idea + Location = 40%
    if (idea.trim().length >= 10) score += 20;
    if (location.trim().length >= 2) score += 20;

    // Step 2: Core numbers = 35%
    const f = financialInputs;
    const coreFields = [
      f.startup_investment,
      f.monthly_revenue,
      f.average_price,
      f.expected_customers,
      f.monthly_costs,
      f.cac,
    ];
    const coreFilled = coreFields.filter(Boolean).length;
    score += Math.round((coreFilled / 6) * 35);

    // Step 3: Advanced = 25%
    const advFields = [f.churn_rate];
    const advFilled = advFields.filter(Boolean).length;
    score += Math.round(advFilled * 15);
    if (files.length > 0) score += 10;

    // Calculate gain
    if (coreFilled < 3) {
      gain = 25;
      gainHint = 'add numbers';
    } else if (advFilled < 2) {
      gain = 15;
      gainHint = 'add details';
    }

    return { score: Math.min(100, score), gain, gainHint };
  }, [idea, location, financialInputs, files]);

  const handleQuickStartComplete = useCallback(
    (sampleIdea?: string, sampleLocation?: string) => {
      markQuickStartComplete();
      if (sampleIdea && sampleLocation) {
        setIdea(sampleIdea);
        setLocation(sampleLocation);
      }
    },
    [markQuickStartComplete, setIdea, setLocation]
  );

  // Either a full paid-tier result or a free-tier summary counts as "has a
  // result to show" — the free tier never populates `result` (it lacks
  // financial_analysis and is rendered by FreeTierResultCard instead).
  const hasAnyResult = !!result || !!freeTierSummary;

  useEffect(() => {
    if (hasAnyResult && shouldShowFirstAnalysisCelebration) {
      setShowCelebration(true);
      incrementAnalysisCount();
    }
  }, [hasAnyResult, shouldShowFirstAnalysisCelebration, incrementAnalysisCount]);

  // Auto-scroll & banner when result appears
  useEffect(() => {
    const hadResult = prevResultRef.current;
    prevResultRef.current = hasAnyResult;

    if (hasAnyResult && !hadResult) {
      setShowScrollBanner(true);
      // Auto-scroll after a short delay for render
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 400);
      // Auto-hide banner after 8s
      const timer = setTimeout(() => setShowScrollBanner(false), 8000);
      return () => clearTimeout(timer);
    }
    if (!hasAnyResult) {
      setShowScrollBanner(false);
    }
  }, [hasAnyResult]);

  const scrollToResults = useCallback(() => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setShowScrollBanner(false);
  }, []);

  // Checkout success polling — poll subscription status for up to 30s after Stripe redirect
  const [checkoutPolling, setCheckoutPolling] = useState(false);
  const [checkoutActivated, setCheckoutActivated] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    const successStatus = searchParams.get('success');
    if (checkoutStatus === 'success' || successStatus === 'true') {
      // SOW canonical funnel event — fires on Stripe success redirect
      recordFunnelEvent('paid_checkout_complete', { source: 'stripe_redirect' });
      setSearchParams({});
      setCheckoutPolling(true);
      let attempts = 0;
      const maxAttempts = 10; // 10 x 3s = 30s
      pollingRef.current = setInterval(async () => {
        attempts++;
        await refetchSubscription();
        // isPlus will update via re-render; check after refetch
        if (attempts >= maxAttempts) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setCheckoutPolling(false);
          toast({
            title: 'Activation in progress',
            description: 'Your trial will activate within a few minutes. Refresh to check.',
          });
        }
      }, 3000);
    } else if (checkoutStatus === 'canceled' || successStatus === 'false') {
      toast({
        title: 'Checkout Canceled',
        description: 'Your payment was canceled.',
        variant: 'destructive',
      });
      setSearchParams({});
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [searchParams, setSearchParams, toast, refetchSubscription]);

  // Detect when isPlus becomes true during polling
  useEffect(() => {
    if (checkoutPolling && isPlus) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setCheckoutPolling(false);
      setCheckoutActivated(true);
      toast({
        title: `🎉 Welcome to ${isPro ? 'Pro' : 'Plus'}!`,
        description: 'Your 14-day free trial is active. Enjoy unlimited analyses!',
      });
      setTimeout(() => setCheckoutActivated(false), 5000);
    }
  }, [checkoutPolling, isPlus, isPro, toast]);

  useEffect(() => {
    const prefill =
      localStorage.getItem('quantis_prefill') || sessionStorage.getItem('hero_prefill');
    if (prefill) {
      setHasPrefill(true);
      requestAnimationFrame(() =>
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      );
    }
  }, []);

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  useEffect(() => {
    if (!subscriptionLoading || isTimedOut) {
      const timer = setTimeout(() => setIsInitialLoad(false), 150);
      return () => clearTimeout(timer);
    }
  }, [subscriptionLoading, isTimedOut]);

  // Skeleton for initial load
  const DashboardSkeleton = () => (
    <div className="animate-fade-in">
      <div className="mb-4 p-3 rounded-lg border border-border bg-card flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-1 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg border border-border bg-card">
              <Skeleton className="h-5 w-24 mb-3" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div className="lg:col-span-2">
          <div className="mb-3 grid grid-cols-4 gap-1 bg-muted p-1 rounded-lg">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-9 rounded-md" />
            ))}
          </div>
          <div className="p-8 rounded-xl border border-border bg-card text-center">
            <Skeleton className="w-12 h-12 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-3" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout title="Dashboard">
      <PageSEO
        title="Run a free business idea analysis in 90 seconds | AIWMC Quantis"
        description={`Stress-test any business idea against ${BENCHMARK_COUNT_DISPLAY} benchmark data points informed by ${BENCHMARK_SOURCES_DISPLAY}. Free first analysis — no credit card. Get a profitability verdict and reliability score with Monte Carlo projections.`}
        canonical="/app"
      />

      <div className="container max-w-7xl px-4 sm:px-6 py-6">
        {/* Checkout activation overlay */}
        {checkoutPolling && (
          <div className="mb-6 p-6 rounded-xl border-2 border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-3 animate-fade-in">
            <RefreshCw className="w-6 h-6 text-primary animate-spin" />
            <h3 className="text-lg font-semibold text-foreground">Activating your trial...</h3>
            <p className="text-sm text-muted-foreground text-center">
              Confirming your payment. This usually takes 5–10 seconds.
            </p>
          </div>
        )}
        {checkoutActivated && (
          <div className="mb-6 p-4 rounded-xl border-2 border-green-500/40 bg-green-500/10 flex items-center justify-center gap-3 animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm font-semibold text-foreground">
              Your Plus trial is now active! Enjoy unlimited analyses.
            </span>
          </div>
        )}

        {isAuthenticated && isInitialLoad ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Founder trial promo — prominent, dedicated dashboard CTA (in addition
                to the site-wide top banner in App.tsx). Every new signup lands here
                right after auth, so this is the first thing an eligible new user sees.
                usePromoStatus already excludes users who redeemed before or are
                already Plus/Pro, so this never re-appears for converted users. */}
            {isAuthenticated && showFounderPromoCard && (
              <div className="mb-4 p-4 sm:p-5 rounded-xl border-2 border-primary/40 bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 animate-fade-in">
                <div className="flex items-start gap-3 min-w-0">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">
                      Founder trial — 50 seats, limited time
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Get a full month of Plus free — unlimited analyses, Monte Carlo, Document Studio.
                      Code {FOUNDER_PROMO_CODE}.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(`/trial?code=${FOUNDER_PROMO_CODE}`)}
                  className="gap-2 flex-shrink-0 w-full sm:w-auto"
                >
                  Claim free month <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Welcome-back nudge — recognized returning visitor, not signed in */}
            {showWelcomeBack && (
              <div className="mb-4 p-3 rounded-lg border border-primary/30 bg-primary/5 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <span aria-hidden>👋</span>
                  <span>
                    Welcome back — sign in to save your analyses and pick up where you left off.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => navigate('/auth?returnUrl=%2Fapp')}
                    className="h-7 text-xs"
                  >
                    Sign in
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      try {
                        sessionStorage.setItem('quantis_welcome_back_dismissed', 'true');
                      } catch {
                        /* noop */
                      }
                      setShowWelcomeBack(false);
                    }}
                    className="h-7 text-xs"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {/* Subscription Status Bar — slim */}
            {isAuthenticated && (
              <>
                {subscriptionLoading ? (
                  <div className="mb-4 p-3 rounded-lg border border-border bg-card flex items-center justify-between">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                ) : subscriptionError || isTimedOut ? (
                  <div className="mb-4 p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        {isTimedOut ? 'Connection timeout — using free tier' : subscriptionError}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={refetchSubscription}
                      className="gap-1 h-7 text-xs"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry
                    </Button>
                  </div>
                ) : (
                  <div className="mb-4 p-3 rounded-lg border border-border bg-card flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {isPro ? (
                        <Badge className="gap-1 bg-amber-500/15 text-amber-200 border-amber-500/40 text-xs">
                          <Crown className="w-3 h-3" /> Pro
                        </Badge>
                      ) : isPlus ? (
                        <Badge className="gap-1 bg-primary/10 text-primary border-primary/30 text-xs">
                          <Zap className="w-3 h-3" /> Plus
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          Free
                        </Badge>
                      )}
                      <AnalysisCounterTooltip
                        remainingAnalyses={remainingAnalyses}
                        isFree={isFree}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate('/docs')}
                        className="gap-1 h-7 text-xs"
                      >
                        <FileText className="w-3 h-3" /> Docs
                      </Button>
                      {isFree ? (
                        <Button
                          size="sm"
                          onClick={() => setShowUpgradePrompt(true)}
                          className="gap-1 h-7 text-xs"
                        >
                          <Zap className="w-3 h-3" /> Upgrade
                        </Button>
                      ) : (
                        <>
                          {isPlus && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(settingsPath)}
                              className="gap-1 h-7 text-xs"
                            >
                              <Settings className="w-3 h-3" /> Settings
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={openPortal}
                            className="gap-1 h-7 text-xs"
                          >
                            <CreditCard className="w-3 h-3" /> Billing
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Top Context Bar */}
            <AnalysisTopBar
              idea={idea}
              location={location}
              reliabilityScore={reliabilityData.score}
              reliabilityGain={reliabilityData.gain}
              gainHint={reliabilityData.gainHint}
            />

            {/* Try Sample Priority Panel — visible when no result and not loading */}
            {!hasAnyResult && !isLoading && (
              <div className="mb-4 rounded-xl border border-[var(--q-border-default)] bg-[var(--q-bg-surface)] p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--q-accent-glow)] flex items-center justify-center">
                    <Zap className="w-4.5 h-4.5 text-[var(--q-accent-primary)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      No idea yet? Try a sample or generate one
                    </p>
                    <p className="text-xs text-muted-foreground">
                      See what Quantis delivers in 2 minutes — no commitment
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIdea('Specialty coffee shop with remote workspace');
                      setLocation('Austin, TX');
                      setFinancialInputs((prev) => ({
                        ...prev,
                        startup_investment: 85000,
                        monthly_revenue: 28000,
                        average_price: 6.5,
                        expected_customers: 800,
                        monthly_costs: 22000,
                        cac: 15,
                      }));
                      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="gap-1.5 text-xs h-8"
                  >
                    ☕ Try Coffee Shop Sample
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={async () => {
                      // Prod bug, 2026-08-02: this button rendered for anonymous
                      // visitors too (the panel above is gated only on
                      // !hasAnyResult, not isAuthenticated), showing a "5/mo free"
                      // badge right next to AnonymousUsageNotice's real "1 free
                      // analysis" preview badge -- two different numbers for what
                      // looked like the same "how much can I use for free"
                      // question. The idea-gen quota is real (5/month, enforced
                      // server-side in generate-idea/index.ts), but it only exists
                      // for signed-in free-tier accounts; an anonymous click hit
                      // AUTH_REQUIRED and fell through to a generic "Could not
                      // generate idea" error with no explanation. Route anonymous
                      // clicks to signup instead of the edge function.
                      if (!isAuthenticated) {
                        toast({
                          title: 'Sign in to generate ideas',
                          description: 'Free accounts get 5 AI-generated business ideas per month.',
                        });
                        navigate('/auth?mode=signup');
                        return;
                      }
                      try {
                        const { supabase } = await import('@/integrations/supabase/client');
                        const { data, error } = await supabase.functions.invoke('generate-idea', {
                          body: { industry: 'technology' },
                        });
                        if (error) {
                          let errBody: any = null;
                          try {
                            errBody = await (error as any)?.context?.json?.();
                          } catch {
                            /* ignore */
                          }
                          const code = errBody?.error || '';
                          if (code === 'AUTH_REQUIRED') {
                            toast({
                              title: 'Sign in to generate ideas',
                              description: errBody?.message || 'Sign in to use your 5 free random ideas.',
                            });
                            navigate('/auth?mode=signup');
                            return;
                          }
                          if (code === 'QUOTA_EXCEEDED') {
                            toast({
                              title: 'Monthly limit reached',
                              description:
                                errBody?.message ||
                                'Upgrade to Plus for unlimited idea generations.',
                            });
                            return;
                          }
                          if (
                            code === 'FEATURE_LOCKED' ||
                            /FEATURE_LOCKED|actionPlan/i.test(String(error?.message || ''))
                          ) {
                            toast({
                              title: '5 free ideas/month',
                              description: 'Upgrade to Plus for unlimited AI idea generation.',
                            });
                            return;
                          }
                          throw error;
                        }
                        if (data?.idea) {
                          setIdea(data.idea);
                          setLocation(data.location || 'Denver, CO');
                          setFinancialInputs((prev) => ({
                            ...prev,
                            startup_investment: data.startingCapital || 50000,
                            average_price: data.pricePerCustomer || 99,
                            expected_customers: data.customersAtLaunch || 100,
                            monthly_costs: data.monthlyOpCosts || 8000,
                          }));
                          formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          if (
                            typeof data._ideaGenRemaining === 'number' &&
                            data._ideaGenRemaining <= 2 &&
                            isFree
                          ) {
                            toast({
                              title: `${data._ideaGenRemaining} free idea${data._ideaGenRemaining !== 1 ? 's' : ''} left this month`,
                              description: 'Upgrade to Plus for unlimited generations.',
                            });
                          }
                        }
                      } catch {
                        toast({
                          title: 'Could not generate idea',
                          description: 'Please try again.',
                          variant: 'destructive',
                        });
                      }
                    }}
                    className="gap-1.5 text-xs h-8"
                  >
                    <Brain className="w-3.5 h-3.5" /> Generate Random Idea{' '}
                    {isAuthenticated && isFree && <span className="ml-1 text-[10px] opacity-60">5/mo free</span>}
                    {!isAuthenticated && <span className="ml-1 text-[10px] opacity-60">sign in for 5/mo free</span>}
                  </Button>
                </div>
              </div>
            )}

            {/* Compact Analysis Form */}
            <div ref={formRef}>
              {rateLimitError && (
                <RateLimitBanner
                  message={rateLimitError}
                  isAuthenticated={isAuthenticated}
                  onDismiss={clearRateLimitError}
                />
              )}
              <SectionErrorBoundary
                section="the analysis form"
                onBack={() =>
                  formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              >
                <CompactAnalysisForm
                  idea={idea}
                  location={location}
                  financialInputs={financialInputs}
                  errors={errors}
                  isLoading={isLoading}
                  isFormValid={isFormValid}
                  onIdeaChange={setIdea}
                  onLocationChange={setLocation}
                  onFinancialInputsChange={setFinancialInputs}
                  onClearError={clearError}
                  onSubmit={handleSubmit}
                  files={files}
                  isUploading={isUploading}
                  maxFiles={maxFiles}
                  allowedExtensions={allowedExtensions}
                  onUploadFiles={uploadFiles}
                  onRemoveFile={removeFile}
                  isAuthenticated={isAuthenticated}
                  isPlus={isPlus || isPro}
                />
              </SectionErrorBoundary>
            </div>

            {/* Scroll-down banner */}
            {showScrollBanner && hasAnyResult && (
              <button
                onClick={scrollToResults}
                className="mt-4 w-full p-3 rounded-xl border-2 border-green-500/40 bg-green-500/10 dark:bg-green-500/5 flex items-center justify-center gap-3 animate-fade-in cursor-pointer hover:bg-green-500/15 transition-colors group"
              >
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <span className="text-sm font-medium text-foreground">
                  Analysis complete — scroll down to view full results
                </span>
                <ChevronDown className="w-5 h-5 text-green-500 animate-bounce shrink-0" />
              </button>
            )}

            {/* Results / History */}
            <div className="mt-6" ref={resultsRef}>
              {isAuthenticated && (
                <button
                  onClick={() => setActiveTab('history')}
                  className="mb-3 w-full p-2.5 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground min-h-[44px]"
                >
                  <History className="w-3.5 h-3.5" /> Analysis History
                </button>
              )}
              <div>
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as 'analyze' | 'history')}
                >
                  {isAuthenticated && (
                    <TabsList className="mb-3 grid w-full grid-cols-2">
                      <TabsTrigger value="analyze" className="gap-1.5 min-h-[40px] text-sm">
                        <BarChart3 className="w-3.5 h-3.5" /> Results
                      </TabsTrigger>
                      <TabsTrigger value="history" className="gap-1.5 min-h-[40px] text-sm">
                        <History className="w-3.5 h-3.5" /> History
                      </TabsTrigger>
                    </TabsList>
                  )}

                  <TabsContent value="analyze">
                    <ContextualUpgradeBanner />
                    {isError && error && (
                      <div className="mb-4">
                        <AnalysisErrorPanel
                          error={error}
                          onRetry={() => {
                            setRetryAttempt((n) => n + 1);
                            retry();
                          }}
                          attempt={retryAttempt}
                          maxAttempts={5}
                        />
                      </div>
                    )}
                    {!result && freeTierSummary ? (
                      <SectionErrorBoundary
                        section="your results"
                        onBack={() => {
                          reset();
                          setCurrentAnalysisId(null);
                          setHasPrefill(false);
                        }}
                      >
                        <FreeTierResultCard
                          summary={freeTierSummary}
                          onReset={() => {
                            reset();
                            setCurrentAnalysisId(null);
                            setHasPrefill(false);
                            setShowNextSteps(false);
                          }}
                        />
                      </SectionErrorBoundary>
                    ) : result ? (
                      <SectionErrorBoundary
                        section="your results"
                        onBack={() => {
                          reset();
                          setCurrentAnalysisId(null);
                          setHasPrefill(false);
                        }}
                      >
                        <Suspense
                          fallback={
                            <div className="space-y-3 p-6">
                              <Skeleton className="h-8 w-1/3" />
                              <Skeleton className="h-64 w-full" />
                            </div>
                          }
                        >
                          <AccuracyTransparentResults
                            result={result}
                            analysisId={currentAnalysisId || undefined}
                            onReset={() => {
                              reset();
                              setCurrentAnalysisId(null);
                              setHasPrefill(false);
                              setShowNextSteps(false);
                            }}
                          />
                        </Suspense>
                        {showNextSteps && (
                          <NextStepsBar
                            onShare={() => {
                              // Trigger share from results — scroll to results which has share button
                              toast({
                                title: 'Share',
                                description: 'Use the share button in the results toolbar above.',
                              });
                            }}
                            onExport={() => {
                              if (isFree) {
                                setShowUpgradePrompt(true);
                              } else {
                                toast({
                                  title: 'Export',
                                  description:
                                    'Use the PDF export button in the results toolbar above.',
                                });
                              }
                            }}
                            onNewAnalysis={() => {
                              reset();
                              setCurrentAnalysisId(null);
                              setHasPrefill(false);
                              setShowNextSteps(false);
                              formRef.current?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                              });
                            }}
                          />
                        )}
                        {(() => {
                          const quoteTrade = detectQuoteGenTrade(
                            idea,
                            result.metadata?.industry_detected
                          );
                          if (!quoteTrade) return null;
                          return (
                            <a
                              href={quoteTrade === 'handyman' ? '/quote/new' : `/quote/new?trade=${quoteTrade}`}
                              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                            >
                              <Receipt className="w-4 h-4 text-primary" />
                              Get a job quote for this business →
                            </a>
                          );
                        })()}
                        <PostAnalysisAuthPrompt
                          analysisId={currentAnalysisId ?? analysisId}
                          ideaTitle={idea}
                          monthlyProfit={
                            result?.financial_analysis?.scenarios?.base?.net_profit
                              ? `$${Math.round(result.financial_analysis.scenarios.base.net_profit).toLocaleString()}`
                              : undefined
                          }
                          onDismiss={() => {}}
                        />
                        {!isFree && (
                          <div className="mt-6 grid grid-cols-1 gap-4">
                            <CapacityCheckCard parentAnalysisId={currentAnalysisId ?? undefined} />
                            <MarketSizingCard
                              plusAnalysis={businessResultToPlusInput(
                                result,
                                idea,
                                location,
                                currentAnalysisId
                              )}
                            />
                          </div>
                        )}
                      </SectionErrorBoundary>
                    ) : hasPrefill || isLoading ? (
                      <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center justify-center min-h-[200px] text-center">
                        {isLoading ? (
                          <>
                            <p className="text-muted-foreground text-sm">
                              Your analysis is being generated...
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Results will appear here automatically.
                            </p>
                          </>
                        ) : (
                          <>
                            <Brain className="w-8 h-8 text-primary mb-3" />
                            <h3 className="text-lg font-semibold text-foreground mb-1">
                              Ready to analyze
                            </h3>
                            <p className="text-muted-foreground text-xs">
                              Hit <strong>Analyze</strong> to get your projections.
                            </p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {!isAuthenticated ? (
                          <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center justify-center min-h-[200px] text-center">
                            <BarChart3 className="w-8 h-8 text-muted-foreground/50 mb-3" />
                            <h3 className="text-base font-semibold text-foreground mb-1">
                              Results appear here
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Fill in your idea and location, then hit <strong>Analyze</strong>.
                            </p>
                          </div>
                        ) : (
                          <EmptyState
                            onStartAnalysis={() => {
                              formRef.current?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                              });
                            }}
                            onTrySample={() => {
                              setIdea('Specialty coffee shop with remote workspace');
                              setLocation('Austin, TX');
                              setFinancialInputs((prev) => ({
                                ...prev,
                                startup_investment: 85000,
                                monthly_revenue: 28000,
                                average_price: 6.5,
                                expected_customers: 800,
                                monthly_costs: 22000,
                                cac: 15,
                              }));
                              formRef.current?.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start',
                              });
                            }}
                          />
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="history">
                    <AnalysisHistory
                      onSelect={(selectedResult, analysisId) => {
                        setResult(normalizeAnalysisResult(selectedResult));
                        setCurrentAnalysisId(analysisId);
                        setActiveTab('analyze');
                      }}
                      onClone={(cloneIdea, cloneLocation) => {
                        setIdea(cloneIdea);
                        setLocation(cloneLocation);
                        setResult(null as any);
                        setCurrentAnalysisId(null);
                        setActiveTab('analyze');
                        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        toast({
                          title: 'Analysis cloned',
                          description: 'Edit the details and run a new analysis.',
                        });
                      }}
                    />
                  </TabsContent>

                </Tabs>
              </div>
            </div>
          </>
        )}
      </div>

      <UpgradePrompt
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        remainingAnalyses={remainingAnalyses}
        onUpgrade={async (plan) => {
          await createCheckout(plan);
        }}
      />

      {isAuthenticated && (
        <QuickStartWizard
          open={shouldShowQuickStart}
          onClose={markQuickStartComplete}
          onComplete={handleQuickStartComplete}
          userName={user?.user_metadata?.full_name}
        />
      )}

      <FirstAnalysisCelebration
        open={showCelebration}
        onClose={() => {
          setShowCelebration(false);
          markFirstAnalysisCelebrationSeen();
          setShowNextSteps(true);
        }}
        analysisCount={1}
        remainingFreeAnalyses={remainingAnalyses}
      />
    </AppLayout>
  );
}
