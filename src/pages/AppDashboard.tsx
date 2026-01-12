import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { EmptyState } from '@/components/layout/EmptyState';
import { AnalysisForm } from '@/components/analysis/AnalysisForm';
import { AnalysisResults } from '@/components/analysis/AnalysisResults';
import { AnalysisHistory } from '@/components/analysis/AnalysisHistory';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, History, BarChart3, FileText, TrendingUp, Target, Zap, Download, Crown, CreditCard, RefreshCw, AlertCircle } from 'lucide-react';

export default function Index() {
  const [searchParams, setSearchParams] = useSearchParams();
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

  const { isAuthenticated } = useAuth();
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
  } = useAnalysis();

  // Handle checkout success/cancel URL parameters (supports both patterns)
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
      <Header darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} />

      <main className="flex-1 container max-w-7xl px-4 sm:px-6 py-8">
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
                    {isPro ? (
                      <Badge className="gap-1 bg-warning/10 text-warning border-warning/30">
                        <Crown className="w-3 h-3" />
                        Pro
                      </Badge>
                    ) : isPlus ? (
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
                  {(isPlus || isPro) && (
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
                    <Button size="sm" variant="outline" onClick={openPortal} className="gap-1">
                      <CreditCard className="w-3 h-3" />
                      Manage Subscription
                    </Button>
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
            AI Business Analysis
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Professional Analysis
            <span className="text-primary"> in Seconds</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get detailed financial projections, business plan, marketing strategy 
            and market analysis for your business idea.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {/* Form Column */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <AnalysisForm
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
                className="w-full p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <History className="w-4 h-4" />
                Analysis History
              </button>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'analyze' | 'history')}>
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="analyze" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Results
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="w-4 h-4" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analyze">
                {result ? (
                  <AnalysisResults result={result} onReset={reset} />
                ) : (
                  <EmptyState />
                )}
              </TabsContent>

              <TabsContent value="history">
                <AnalysisHistory
                  onSelect={(selectedResult) => {
                    setResult(selectedResult);
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
    </div>
  );
}
