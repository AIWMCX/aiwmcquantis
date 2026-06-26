import { Suspense, lazy, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingFallback from "./components/layout/LoadingFallback";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { SkipToContent } from "./components/accessibility/SkipToContent";
import { initWebVitals } from "./lib/webVitals";
import { initEngagementTracking } from "./lib/engagementTracking";
import { trackReturnVisitIfApplicable } from "./lib/activationTracking";

// CRITICAL: Landing page is NOT lazy loaded for instant first paint
import Landing from "./pages/Landing";
const AppDashboard = lazy(() => import("./pages/AppDashboard"));
const AppDiagnostics = lazy(() => import("./pages/AppDiagnostics"));
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SharedReport = lazy(() => import("./pages/SharedReport"));
const PublicAnalysisResult = lazy(() => import("./pages/PublicAnalysisResult"));
const AdminBenchmarkUpload = lazy(() => import("./pages/AdminBenchmarkUpload"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const PlusSettings = lazy(() => import("./pages/PlusSettings"));
const DocsStudio = lazy(() => import("./pages/DocsStudio"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogArticle = lazy(() => import("./pages/BlogArticle"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const ViralContent = lazy(() => import("./pages/ViralContent"));
const ViralPosts = lazy(() => import("./pages/ViralPosts"));
const ExamplesIndex = lazy(() => import("./pages/examples/ExamplesIndex"));
const ExampleAnalysis = lazy(() => import("./pages/examples/ExampleAnalysis"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const UseCases = lazy(() => import("./pages/UseCases"));
const PricingPage = lazy(() => import("./pages/Pricing"));
const RiskGallery = lazy(() => import("./pages/RiskGallery"));
const QuantisHealth = lazy(() => import("./pages/admin/QuantisHealth"));
const EdgeHealth = lazy(() => import("./pages/admin/EdgeHealth"));
const InvoiceManager = lazy(() => import("./pages/InvoiceManager"));
const BrandProfileSettings = lazy(() => import("./pages/settings/BrandProfile"));
const ApiKeysSettings = lazy(() => import("./pages/settings/ApiKeys"));
const FormulasDashboard = lazy(() => import("./pages/admin/FormulasDashboard"));
const AccuracyDashboard = lazy(() => import("./pages/admin/AccuracyDashboard"));
const DataSources = lazy(() => import("./pages/admin/DataSources"));
const Methodology = lazy(() => import("./pages/Methodology"));
const VsComparePage = lazy(() => import("./pages/vs/VsComparePage"));
const DirectoryTracker = lazy(() => import("./pages/DirectoryTracker"));
const Research = lazy(() => import("./pages/Research"));
const PreMortem = lazy(() => import("./pages/PreMortem"));
const Status = lazy(() => import("./pages/Status"));
const Security = lazy(() => import("./pages/Security"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const Changelog = lazy(() => import("./pages/Changelog"));
const AdminDenials = lazy(() => import("./pages/admin/Denials"));
const MyStats = lazy(() => import("./pages/MyStats"));
const CaseBrowser = lazy(() => import("./pages/CaseBrowser"));
const EngineInfo = lazy(() => import("./pages/admin/EngineInfo"));
const SearchConsole = lazy(() => import("./pages/admin/SearchConsole"));
const Autoposter = lazy(() => import("./pages/admin/Autoposter"));
const ContentStudio = lazy(() => import("./pages/admin/ContentStudio"));
const AiCosts = lazy(() => import("./pages/admin/AiCosts"));
const EmailFunnel = lazy(() => import("./pages/admin/EmailFunnel"));
const QocMonitor = lazy(() => import("./pages/admin/QocMonitor"));
const RvceTestPanel = lazy(() => import("./pages/dev/RvceTestPanel"));
const EmailConfirmed = lazy(() => import("./pages/EmailConfirmed"));
const EmailPreferences = lazy(() => import("./pages/EmailPreferences"));
const Connect = lazy(() => import("./pages/Connect"));
const QuoteIndex = lazy(() => import("./pages/quote/QuoteIndex"));
const QuoteNew = lazy(() => import("./pages/quote/QuoteNew"));
const QuoteEdit = lazy(() => import("./pages/quote/QuoteEdit"));
const QuoteResult = lazy(() => import("./pages/quote/QuoteResult"));
import { PlusGate } from "./components/PlusGate";

// Optimized QueryClient configuration for production
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - cache garbage collection
      retry: 2, // Retry failed requests twice
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false, // Don't refetch on tab focus
      refetchOnReconnect: true, // Refetch when network reconnects
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

function RenderedFlag() {
  useEffect(() => {
    document.documentElement.setAttribute('data-rendered', 'true');
    return () => { document.documentElement.removeAttribute('data-rendered'); };
  }, []);
  return null;
}

const App = () => {
  // Initialize performance and engagement tracking on mount
  useEffect(() => {
    initWebVitals();
    initEngagementTracking();
    trackReturnVisitIfApplicable();
  }, []);

  return (
    <ErrorBoundary>
      <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="light" storageKey="theme" enableSystem={false}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster richColors position="top-center" />
            <BrowserRouter>
            <SkipToContent />
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/__maintenance" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/thank-you" element={
                  <ProtectedRoute>
                    <ThankYou />
                  </ProtectedRoute>
                } />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogArticle />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/viral-content" element={<ViralContent />} />
                <Route path="/viral-posts" element={<ViralPosts />} />
                <Route path="/examples" element={<ExamplesIndex />} />
                <Route path="/examples/:slug" element={<ExampleAnalysis />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/use-cases" element={<UseCases />} />
                <Route path="/methodology" element={<Methodology />} />
                <Route path="/vs/:slug" element={<VsComparePage />} />
                <Route path="/research" element={<Research />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/risk-gallery" element={<RiskGallery />} />
                <Route path="/status" element={<Status />} />
                <Route path="/security" element={<Security />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/changelog" element={<Changelog />} />
                <Route path="/cases" element={<CaseBrowser />} />
                <Route path="/dev/rvce-test" element={<RvceTestPanel />} />
                <Route path="/email-confirmed" element={<EmailConfirmed />} />
                <Route path="/email-preferences" element={<EmailPreferences />} />
                <Route path="/connect" element={<Connect />} />
                
                {/* Public share route - no auth required */}
                <Route path="/share/:token" element={<SharedReport />} />

                {/* Anonymous-first result page — visitor lands here right after running their hero analysis */}
                <Route path="/r/:id" element={<PublicAnalysisResult />} />
                
                {/* Protected routes - require authentication */}
                <Route path="/app" element={<RouteErrorBoundary routeName="app"><AppDashboard /></RouteErrorBoundary>} />
                <Route path="/app/diagnostics" element={<RouteErrorBoundary routeName="app-diagnostics"><AppDiagnostics /></RouteErrorBoundary>} />
                <Route path="/app/stats" element={
                  <ProtectedRoute>
                    <MyStats />
                  </ProtectedRoute>
                } />
                <Route path="/plus-settings" element={
                  <ProtectedRoute>
                    <PlusSettings />
                  </ProtectedRoute>
                } />
                <Route path="/pro-settings" element={
                  <ProtectedRoute>
                    <PlusSettings />
                  </ProtectedRoute>
                } />
                <Route path="/docs" element={
                  <ProtectedRoute>
                    <PlusGate module="docs">
                      <DocsStudio />
                    </PlusGate>
                  </ProtectedRoute>
                } />
                <Route path="/app/invoices" element={
                  <ProtectedRoute>
                    <PlusGate module="invoices">
                      <InvoiceManager />
                    </PlusGate>
                  </ProtectedRoute>
                } />
                <Route path="/app/pre-mortem" element={
                  <ProtectedRoute>
                    <PlusGate module="pre-mortem">
                      <PreMortem />
                    </PlusGate>
                  </ProtectedRoute>
                } />
                <Route path="/settings/brand" element={
                  <ProtectedRoute>
                    <BrandProfileSettings />
                  </ProtectedRoute>
                } />
                <Route path="/settings/api-keys" element={
                  <ProtectedRoute>
                    <ApiKeysSettings />
                  </ProtectedRoute>
                } />
                
                {/* Admin routes - require authentication + admin role */}
                <Route path="/admin" element={
                  <ProtectedRoute requireAdmin>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/benchmarks" element={
                  <ProtectedRoute requireAdmin>
                    <AdminBenchmarkUpload />
                  </ProtectedRoute>
                } />
                <Route path="/admin/health" element={
                  <ProtectedRoute requireAdmin>
                    <QuantisHealth />
                  </ProtectedRoute>
                } />
                <Route path="/admin/edge-health" element={
                  <ProtectedRoute requireAdmin>
                    <EdgeHealth />
                  </ProtectedRoute>
                } />
                <Route path="/admin/formulas" element={
                  <ProtectedRoute requireAdmin>
                    <FormulasDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/accuracy" element={
                  <ProtectedRoute requireAdmin>
                    <AccuracyDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/admin/data-sources" element={
                  <ProtectedRoute requireAdmin>
                    <DataSources />
                  </ProtectedRoute>
                } />
                <Route path="/admin/denials" element={
                  <ProtectedRoute requireAdmin>
                    <AdminDenials />
                  </ProtectedRoute>
                } />
                <Route path="/admin/engine" element={
                  <ProtectedRoute requireAdmin>
                    <EngineInfo />
                  </ProtectedRoute>
                } />
                <Route path="/admin/search-console" element={
                  <ProtectedRoute requireAdmin>
                    <SearchConsole />
                  </ProtectedRoute>
                } />
                <Route path="/admin/autoposter" element={
                  <ProtectedRoute requireAdmin>
                    <Autoposter />
                  </ProtectedRoute>
                } />
                <Route path="/admin/content-studio" element={
                  <ProtectedRoute requireAdmin>
                    <ContentStudio />
                  </ProtectedRoute>
                } />
                <Route path="/admin/ai-costs" element={
                  <ProtectedRoute requireAdmin>
                    <AiCosts />
                  </ProtectedRoute>
                } />
                <Route path="/admin/email-funnel" element={
                  <ProtectedRoute requireAdmin>
                    <EmailFunnel />
                  </ProtectedRoute>
                } />
                <Route path="/admin/qoc" element={
                  <ProtectedRoute requireAdmin>
                    <QocMonitor />
                  </ProtectedRoute>
                } />
                <Route path="/directory-tracker" element={<DirectoryTracker />} />

                <Route path="/quote" element={<ProtectedRoute><QuoteIndex /></ProtectedRoute>} />
                <Route path="/quote/new" element={<ProtectedRoute><QuoteNew /></ProtectedRoute>} />
                <Route path="/quote/:id" element={<ProtectedRoute><QuoteEdit /></ProtectedRoute>} />
                <Route path="/quote/:id/result" element={<ProtectedRoute><QuoteResult /></ProtectedRoute>} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <RenderedFlag />
            </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
