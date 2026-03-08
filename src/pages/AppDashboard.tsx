import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState } from '@/components/layout/EmptyState';
import { WizardForm } from '@/components/analysis/WizardForm';
import { AnalysisResults } from '@/components/analysis/AnalysisResults';
import { AnalysisHistory } from '@/components/analysis/AnalysisHistory';
import { AnalysisTopBar } from '@/components/analysis/AnalysisTopBar';
import { UpgradePrompt } from '@/components/UpgradePrompt';
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
import { BarChart3, History, FileText, Zap, CreditCard, RefreshCw, AlertCircle, Settings, Brain } from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'analyze' | 'history'>('analyze');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasPrefill, setHasPrefill] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const { isAuthenticated, user } = useAuth();
  
  const {
    shouldShowQuickStart,
    shouldShowFirstAnalysisCelebration,
    markQuickStartComplete,
    markFirstAnalysisCelebrationSeen,
    incrementAnalysisCount,
  } = useOnboarding();
  const { 
    isPlus, isFree, remainingAnalyses, 
    loading: subscriptionLoading, error: subscriptionError, isTimedOut,
    createCheckout, openPortal, refetch: refetchSubscription,
  } = useSubscription();

  const {
    idea, setIdea, location, setLocation,
    financialInputs, setFinancialInputs,
    errors, clearError, result, setResult,
    isLoading, handleSubmit, reset, isFormValid,
    files, isUploading, uploadFiles, removeFile, maxFiles, allowedExtensions,
    rateLimitError, clearRateLimitError,
  } = useAnalysis();

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
    const coreFields = [f.startup_investment, f.monthly_revenue, f.average_price, f.expected_customers, f.monthly_costs, f.cac];
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

  const handleQuickStartComplete = useCallback((sampleIdea?: string, sampleLocation?: string) => {
    markQuickStartComplete();
    if (sampleIdea && sampleLocation) { setIdea(sampleIdea); setLocation(sampleLocation); }
  }, [markQuickStartComplete, setIdea, setLocation]);

  useEffect(() => {
    if (result && shouldShowFirstAnalysisCelebration) {
      setShowCelebration(true);
      incrementAnalysisCount();
    }
  }, [result, shouldShowFirstAnalysisCelebration, incrementAnalysisCount]);

  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    const successStatus = searchParams.get('success');
    if (checkoutStatus === 'success' || successStatus === 'true') {
      toast({ title: 'Welcome to Your Trial!', description: 'Your 14-day free trial has started. Enjoy unlimited analyses!' });
      setTimeout(() => refetchSubscription(), 2000);
      setSearchParams({});
    } else if (checkoutStatus === 'canceled' || successStatus === 'false') {
      toast({ title: 'Checkout Canceled', description: 'Your payment was canceled.', variant: 'destructive' });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast, refetchSubscription]);

  useEffect(() => {
    const prefill = localStorage.getItem('quantis_prefill') || sessionStorage.getItem('hero_prefill');
    if (prefill) {
      setHasPrefill(true);
      requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
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
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 rounded-lg border border-border bg-card">
              <Skeleton className="h-5 w-24 mb-3" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div className="lg:col-span-2">
          <div className="mb-3 grid grid-cols-4 gap-1 bg-muted p-1 rounded-lg">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-9 rounded-md" />)}
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
        title="Dashboard | AIWMC Quantis"
        description="Access your AI-powered business analyses, financial projections, and business plans."
        canonical="/app"
        noindex={true}
      />

      <div className="container max-w-7xl px-4 sm:px-6 py-6">
        {isAuthenticated && isInitialLoad ? (
          <DashboardSkeleton />
        ) : (
          <>
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
                      <span>{isTimedOut ? 'Connection timeout — using free tier' : subscriptionError}</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={refetchSubscription} className="gap-1 h-7 text-xs">
                      <RefreshCw className="w-3 h-3" /> Retry
                    </Button>
                  </div>
                ) : (
                  <div className="mb-4 p-3 rounded-lg border border-border bg-card flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {isPlus ? (
                        <Badge className="gap-1 bg-primary/10 text-primary border-primary/30 text-xs">
                          <Zap className="w-3 h-3" /> Plus
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-xs">Free</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {isFree ? `${remainingAnalyses} of 3 remaining` : 'Unlimited analyses'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate('/docs')} className="gap-1 h-7 text-xs">
                        <FileText className="w-3 h-3" /> Docs
                      </Button>
                      {isFree ? (
                        <Button size="sm" onClick={() => setShowUpgradePrompt(true)} className="gap-1 h-7 text-xs">
                          <Zap className="w-3 h-3" /> Upgrade
                        </Button>
                      ) : (
                        <>
                          {isPlus && (
                            <Button size="sm" variant="outline" onClick={() => navigate('/plus-settings')} className="gap-1 h-7 text-xs">
                              <Settings className="w-3 h-3" /> Settings
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={openPortal} className="gap-1 h-7 text-xs">
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

            {/* Main Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Left: Wizard */}
              <div ref={formRef} className="lg:col-span-1 order-1">
                <div className="lg:sticky lg:top-20 space-y-3">
                  {rateLimitError && (
                    <RateLimitBanner message={rateLimitError} isAuthenticated={isAuthenticated} onDismiss={clearRateLimitError} />
                  )}
                  <WizardForm
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
                  />
                  {isAuthenticated && (
                    <button
                      onClick={() => setActiveTab('history')}
                      className="w-full p-2.5 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground min-h-[44px]"
                    >
                      <History className="w-3.5 h-3.5" /> Analysis History
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Results */}
              <div className="lg:col-span-2 order-2">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'analyze' | 'history')}>
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
                    {result ? (
                      <AnalysisResults 
                        result={result} 
                        analysisId={currentAnalysisId || undefined}
                        onReset={() => { reset(); setCurrentAnalysisId(null); setHasPrefill(false); }} 
                      />
                    ) : hasPrefill || isLoading ? (
                      <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center justify-center min-h-[200px] text-center">
                        {isLoading ? (
                          <>
                            <p className="text-muted-foreground text-sm">Your analysis is being generated...</p>
                            <p className="text-xs text-muted-foreground mt-2">Results will appear here automatically.</p>
                          </>
                        ) : (
                          <>
                            <Brain className="w-8 h-8 text-primary mb-3" />
                            <h3 className="text-lg font-semibold text-foreground mb-1">Ready to analyze</h3>
                            <p className="text-muted-foreground text-xs">Hit <strong>Analyze</strong> to get your projections.</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {!isAuthenticated ? (
                          <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center justify-center min-h-[200px] text-center">
                            <BarChart3 className="w-8 h-8 text-muted-foreground/50 mb-3" />
                            <h3 className="text-base font-semibold text-foreground mb-1">Results appear here</h3>
                            <p className="text-xs text-muted-foreground">Fill in your idea and location, then hit <strong>Analyze</strong>.</p>
                          </div>
                        ) : (
                          <EmptyState />
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="history">
                    <AnalysisHistory
                      onSelect={(selectedResult, analysisId) => {
                        setResult(selectedResult);
                        setCurrentAnalysisId(analysisId);
                        setActiveTab('analyze');
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
        onUpgrade={async (plan) => { await createCheckout(plan); }}
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
        onClose={() => { setShowCelebration(false); markFirstAnalysisCelebrationSeen(); }}
        analysisCount={1}
        remainingFreeAnalyses={remainingAnalyses}
      />
    </AppLayout>
  );
}
