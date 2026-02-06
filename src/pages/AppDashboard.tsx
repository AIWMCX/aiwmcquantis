import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { EmptyState } from '@/components/layout/EmptyState';
import { WizardForm } from '@/components/analysis/WizardForm';
import { AnalysisResults } from '@/components/analysis/AnalysisResults';
import { AnalysisHistory } from '@/components/analysis/AnalysisHistory';
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
import { Sparkles, History, BarChart3, FileText, TrendingUp, Target, Zap, Download, CreditCard, RefreshCw, AlertCircle, Settings } from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const [activeTab, setActiveTab] = useState<'analyze' | 'history'>('analyze');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const { isAuthenticated, user } = useAuth();
  
  // Onboarding state
  const {
    shouldShowQuickStart,
    shouldShowFirstAnalysisCelebration,
    markQuickStartComplete,
    markFirstAnalysisCelebrationSeen,
    incrementAnalysisCount,
  } = useOnboarding();
  const { 
    isPlus,
    isFree, 
    remainingAnalyses, 
    loading: subscriptionLoading,
    error: subscriptionError,
    isTimedOut,
    createCheckout,
    openPortal,
    refetch: refetchSubscription,
  } = useSubscription();

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
    isLoading,
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

  // Handle QuickStart wizard completion - pre-fill form if sample chosen
  const handleQuickStartComplete = useCallback((sampleIdea?: string, sampleLocation?: string) => {
    markQuickStartComplete();
    if (sampleIdea && sampleLocation) {
      setIdea(sampleIdea);
      setLocation(sampleLocation);
    }
  }, [markQuickStartComplete, setIdea, setLocation]);

  // Show celebration after first analysis completes
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
      toast({
        title: '🎉 Welcome to Your Trial!',
        description: 'Your 14-day free trial has started. Enjoy unlimited analyses!',
      });
      // Refetch subscription after a short delay to allow webhook processing
      setTimeout(() => {
        refetchSubscription();
      }, 2000);
      // Clear the URL parameters
      setSearchParams({});
    } else if (checkoutStatus === 'canceled' || successStatus === 'false') {
      toast({
        title: 'Checkout Canceled',
        description: 'Your payment was canceled. You can try again anytime.',
        variant: 'destructive',
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast, refetchSubscription]);

  // Apply dark mode
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const features = [
    {
      icon: BarChart3,
      title: 'Financial Analysis',
      description: 'Investment, revenue, expenses and payback period calculation',
    },
    {
      icon: FileText,
      title: 'Business Plan',
      description: 'Step-by-step launch plan with specific actions',
    },
    {
      icon: TrendingUp,
      title: 'Marketing Strategy',
      description: 'Customer acquisition channels and CAC/LTV calculation',
    },
    {
      icon: Target,
      title: 'Market Analysis',
      description: 'Competition, trends and opportunities assessment',
    },
    {
      icon: Download,
      title: 'PDF Export',
      description: 'Save results for investor presentations',
    },
    {
      icon: Zap,
      title: 'Real Data',
      description: 'Current market data by location',
    },
  ];

  // Subscription status bar skeleton
  const SubscriptionSkeleton = () => (
    <div className="mb-6 p-4 rounded-lg border border-border bg-card flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-9 w-24" />
    </div>
  );

  // Full page loading skeleton for initial load
  const DashboardSkeleton = () => (
    <div className="animate-fade-in">
      {/* Subscription skeleton */}
      <SubscriptionSkeleton />

      {/* Hero skeleton */}
      <div className="text-center mb-12">
        <Skeleton className="h-8 w-48 mx-auto mb-6 rounded-full" />
        <Skeleton className="h-12 w-80 mx-auto mb-4" />
        <Skeleton className="h-6 w-96 mx-auto max-w-full" />
      </div>

      {/* Main content skeleton - Mobile-first layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-16">
        {/* Form skeleton - hidden on mobile initially */}
        <div className="lg:col-span-1 order-2 lg:order-1 hidden lg:block">
          <div className="space-y-4">
            <div className="p-6 rounded-xl border border-border bg-card space-y-4">
              <Skeleton className="h-5 w-32 mb-4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full mt-4" />
            </div>
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>

        {/* Results skeleton - visible first on mobile */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          {/* Tabs skeleton */}
          <div className="mb-4 lg:mb-6 grid grid-cols-2 gap-1 bg-muted p-1 rounded-lg">
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
          </div>
          
          {/* Empty state skeleton */}
          <div className="p-8 md:p-12 rounded-2xl border border-border bg-card text-center">
            <Skeleton className="w-16 h-16 rounded-full mx-auto mb-6" />
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-5 w-80 mx-auto mb-8 max-w-full" />
            
            {/* Feature cards skeleton - 2 cols on mobile */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-w-2xl mx-auto">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-3 md:p-4 rounded-xl border border-border bg-card/50">
                  <Skeleton className="w-8 h-8 rounded-lg mx-auto mb-2" />
                  <Skeleton className="h-4 w-20 mx-auto mb-1" />
                  <Skeleton className="h-3 w-full md:block hidden" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile form skeleton - only visible on mobile */}
        <div className="lg:hidden order-2">
          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-border bg-card space-y-4">
              <Skeleton className="h-5 w-32 mb-4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-12 w-full mt-4" />
            </div>
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );

  // Track initial page load
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Clear initial load state after subscription data loads or times out
  useEffect(() => {
    if (!subscriptionLoading || isTimedOut) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => setIsInitialLoad(false), 150);
      return () => clearTimeout(timer);
    }
  }, [subscriptionLoading, isTimedOut]);

  // Subscription error state
  const SubscriptionError = () => (
    <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3 text-destructive">
        <AlertCircle className="w-5 h-5" />
        <span className="text-sm">
          {isTimedOut ? 'Connection timeout - using free tier' : subscriptionError}
        </span>
      </div>
      <Button size="sm" variant="outline" onClick={refetchSubscription} className="gap-1">
        <RefreshCw className="w-3 h-3" />
        Retry
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PageSEO
        title="Dashboard | AIWMC Quantis™"
        description="Access your AI-powered business analyses, financial projections, and business plans."
        canonical="/app"
        noindex={true}
      />
      <Header darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} />

      <main id="main-content" className="flex-1 container max-w-7xl px-4 sm:px-6 py-8">
        {/* Show skeleton during initial page load for authenticated users */}
        {isAuthenticated && isInitialLoad ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Subscription Status Bar */}
            {isAuthenticated && (
              <>
                {subscriptionLoading ? (
                  <SubscriptionSkeleton />
                ) : subscriptionError || isTimedOut ? (
                  <SubscriptionError />
                ) : (
                  <div className="mb-6 p-4 rounded-lg border border-border bg-card flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {isPlus ? (
                          <Badge className="gap-1 bg-primary/10 text-primary border-primary/30">
                            <Zap className="w-3 h-3" />
                            Plus
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            Free Plan
                          </Badge>
                        )}
                      </div>
                      {isFree && (
                        <span className="text-sm text-muted-foreground">
                          {remainingAnalyses} of 3 analyses remaining this month
                        </span>
                      )}
                      {isPlus && (
                        <span className="text-sm text-muted-foreground">
                          Unlimited analyses
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isFree ? (
                        <Button size="sm" onClick={() => setShowUpgradePrompt(true)} className="gap-1">
                          <Zap className="w-3 h-3" />
                          Upgrade
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          {isPlus && (
                            <>
                            <Button size="sm" variant="outline" onClick={() => navigate('/docs')} className="gap-1">
                              <FileText className="w-3 h-3" />
                              Docs Studio
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => navigate('/plus-settings')} className="gap-1">
                              <Settings className="w-3 h-3" />
                              Plus Settings
                            </Button>
                            </>
                          )}
                          <Button size="sm" variant="outline" onClick={openPortal} className="gap-1">
                            <CreditCard className="w-3 h-3" />
                            Billing
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            AIWMC Quantis™ Analysis
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Complete Analysis
            <span className="text-primary"> in Seconds</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get detailed financial projections, business plan, marketing strategy 
            and market analysis for your business idea.
          </p>
        </div>

        {/* Main Content - Mobile-first layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {/* Form Column - Appears second on mobile for results-first experience */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Rate-limit banner when hit */}
              {rateLimitError && (
                <RateLimitBanner
                  message={rateLimitError}
                  isAuthenticated={isAuthenticated}
                  onDismiss={clearRateLimitError}
                />
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
              
              {/* Quick History Access */}
              <button
                onClick={() => setActiveTab('history')}
                className="w-full p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground min-h-[48px]"
              >
                <History className="w-4 h-4" />
                Analysis History
              </button>
            </div>
          </div>

          {/* Results Column - Appears first on mobile */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'analyze' | 'history')}>
              <TabsList className="mb-4 lg:mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="analyze" className="gap-2 min-h-[44px]">
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden sm:inline">Results</span>
                  <span className="sm:hidden">📊</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2 min-h-[44px]">
                  <History className="w-4 h-4" />
                  <span className="hidden sm:inline">History</span>
                  <span className="sm:hidden">📋</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analyze">
                {result ? (
                  <AnalysisResults 
                    result={result} 
                    analysisId={currentAnalysisId || undefined}
                    onReset={() => {
                      reset();
                      setCurrentAnalysisId(null);
                    }} 
                  />
                ) : (
                  <EmptyState />
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

        {/* Features Section */}
        <div className="border-t border-border pt-16">
          <h2 className="text-2xl font-bold text-center text-foreground mb-12">
            What You Get
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all"
              >
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
          </>
        )}
      </main>

      <Footer />

      <UpgradePrompt
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        remainingAnalyses={remainingAnalyses}
        onUpgrade={async (plan) => {
          // Don't close dialog - let redirect happen
          await createCheckout(plan);
        }}
      />

      {/* Onboarding Wizard - shows for new users */}
      {isAuthenticated && (
        <QuickStartWizard
          open={shouldShowQuickStart}
          onClose={markQuickStartComplete}
          onComplete={handleQuickStartComplete}
          userName={user?.user_metadata?.full_name}
        />
      )}

      {/* First Analysis Celebration */}
      <FirstAnalysisCelebration
        open={showCelebration}
        onClose={() => {
          setShowCelebration(false);
          markFirstAnalysisCelebrationSeen();
        }}
        analysisCount={1}
        remainingFreeAnalyses={remainingAnalyses}
      />
    </div>
  );
}
