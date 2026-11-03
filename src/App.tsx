import { Suspense, lazy, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { PendingInviteRedirect } from "@/components/invite/PendingInviteRedirect";
import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/react";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { AccountConsentGate } from "@/components/consent/AccountConsentGate";
import { useTrackingConsent } from "@/hooks/useTrackingConsent";
import { SpeedInsights } from "@vercel/speed-insights/react";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingFallback from "./components/layout/LoadingFallback";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { SkipToContent } from "./components/accessibility/SkipToContent";
import { SEOPreviewPanel } from "./components/seo/SEOPreviewPanel";
import { FounderPromoBanner } from "./components/promo/FounderPromoBanner";
import { initWebVitals } from "./lib/webVitals";
import { initEngagementTracking } from "./lib/engagementTracking";
import { trackReturnVisitIfApplicable } from "./lib/activationTracking";

// CRITICAL: Landing page is NOT lazy loaded for instant first paint
import Landing from "./pages/Landing";
const AdminLayout = lazy(() => import("./components/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })));
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
const AiPolicy = lazy(() => import("./pages/AiPolicy"));
const Dmca = lazy(() => import("./pages/Dmca"));
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
const Consultants = lazy(() => import("./pages/Consultants"));
const PricingPage = lazy(() => import("./pages/Pricing"));
const TrialPage = lazy(() => import("./pages/Trial"));
const RiskGallery = lazy(() => import("./pages/RiskGallery"));
const QuantisHealth = lazy(() => import("./pages/admin/QuantisHealth"));
const EdgeHealth = lazy(() => import("./pages/admin/EdgeHealth"));
const InvoiceManager = lazy(() => import("./pages/InvoiceManager"));
const BrandProfileSettings = lazy(() => import("./pages/settings/BrandProfile"));
const ApiKeysSettings = lazy(() => import("./pages/settings/ApiKeys"));
const FormulasDashboard = lazy(() => import("./pages/admin/FormulasDashboard"));
const AccuracyDashboard = lazy(() => import("./pages/admin/AccuracyDashboard"));
const InvariantSweeps = lazy(() => import("./pages/admin/InvariantSweeps"));
const DataSources = lazy(() => import("./pages/admin/DataSources"));
const Methodology = lazy(() => import("./pages/Methodology"));
const VsComparePage = lazy(() => import("./pages/vs/VsComparePage"));
const DirectoryTracker = lazy(() => import("./pages/DirectoryTracker"));
const Research = lazy(() => import("./pages/Research"));
const PreMortem = lazy(() => import("./pages/PreMortem"));
const FirstDecisionExperience = lazy(() => import("./pages/FirstDecisionExperience"));
const NewDecision = lazy(() => import("./pages/NewDecision"));
const ClientDetail = lazy(() => import("./pages/ClientDetail"));
const ScenarioWorkspace = lazy(() => import("./pages/ScenarioWorkspace"));
const Status = lazy(() => import("./pages/Status"));
const StateOfQuantis = lazy(() => import("./pages/StateOfQuantis"));
const FeedbackBaseline = lazy(() => import("./pages/admin/FeedbackBaseline"));
const PaidEngagements = lazy(() => import("./pages/admin/PaidEngagements"));
const AdminToday = lazy(() => import("./pages/admin/Today"));
const IncidentManager = lazy(() => import("./pages/admin/IncidentManager"));
const Security = lazy(() => import("./pages/Security"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const DecisionReview = lazy(() => import("./pages/DecisionReview"));
const FounderDecisionDemo = lazy(() => import("./pages/FounderDecisionDemo"));
const HiringDecisionDemo = lazy(() => import("./pages/HiringDecisionDemo"));
const PriceChangeDemo = lazy(() => import("./pages/PriceChangeDemo"));
const SecondLocationDemo = lazy(() => import("./pages/SecondLocationDemo"));
const SampleDecisionMemo = lazy(() => import("./pages/SampleDecisionMemo"));
const ConsultantCapacityDemo = lazy(() => import("./pages/ConsultantCapacityDemo"));
const EngagementIntake = lazy(() => import("./pages/EngagementIntake"));
const PaidWorkspace = lazy(() => import("./pages/PaidWorkspace"));
const Changelog = lazy(() => import("./pages/Changelog"));
const AdminDenials = lazy(() => import("./pages/admin/Denials"));
const MyStats = lazy(() => import("./pages/MyStats"));
const MyDocuments = lazy(() => import("./pages/MyDocuments"));
const EngineInfo = lazy(() => import("./pages/admin/EngineInfo"));
const SearchConsole = lazy(() => import("./pages/admin/SearchConsole"));
const Autoposter = lazy(() => import("./pages/admin/Autoposter"));
const ContentStudio = lazy(() => import("./pages/admin/ContentStudio"));
const LinkedInGrowth = lazy(() => import("./pages/admin/LinkedInGrowth"));
const CommercialOps = lazy(() => import("./pages/admin/CommercialOps"));
const InstagramHarvest = lazy(() => import("./pages/admin/InstagramHarvest"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const BusinessInbox = lazy(() => import("./pages/admin/BusinessInbox"));
const Invite = lazy(() => import("./pages/Invite"));
const AiCosts = lazy(() => import("./pages/admin/AiCosts"));
const EmailFunnel = lazy(() => import("./pages/admin/EmailFunnel"));
const AdminFunnel = lazy(() => import("./pages/admin/Funnel"));
const QocMonitor = lazy(() => import("./pages/admin/QocMonitor"));
const RvceTestPanel = lazy(() => import("./pages/dev/RvceTestPanel"));
const EmailConfirmed = lazy(() => import("./pages/EmailConfirmed"));
const EmailPreferences = lazy(() => import("./pages/EmailPreferences"));
const Connect = lazy(() => import("./pages/Connect"));
const QuoteIndex = lazy(() => import("./pages/quote/QuoteIndex"));
const QuoteNew = lazy(() => import("./pages/quote/QuoteNew"));
const QuoteEdit = lazy(() => import("./pages/quote/QuoteEdit"));
const QuoteResult = lazy(() => import("./pages/quote/QuoteResult"));

// Spec-requested "/scenario" compatibility alias -> "/app/scenarios",
// preserving the query string (e.g. ?analysisId=...) — plain <Navigate
// to="..."> does not carry the current location's search params.
function ScenarioAliasRedirect() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/app/scenarios", search: location.search }} replace />;
}

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
  // Vercel Web Analytics mounts only after consent (src/lib/consent.ts).
  const trackingAllowed = useTrackingConsent();
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
            <ScrollToTop />
            <SkipToContent />
            <ConsentBanner />
            <AccountConsentGate />
            <FounderPromoBanner />
            <PendingInviteRedirect />
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
                <Route path="/ai-policy" element={<AiPolicy />} />
                <Route path="/dmca" element={<Dmca />} />
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
                <Route path="/consultants" element={<Consultants />} />
                <Route path="/methodology" element={<Methodology />} />
                <Route path="/vs/:slug" element={<VsComparePage />} />
                <Route path="/research" element={<Research />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/trial" element={<TrialPage />} />
                <Route path="/invite/:token" element={<Invite />} />
                <Route path="/risk-gallery" element={<RiskGallery />} />
                <Route path="/status" element={<Status />} />
                <Route path="/state-of-quantis" element={<StateOfQuantis />} />
                <Route path="/security" element={<Security />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/decision-review" element={<DecisionReview />} />
                <Route path="/consultant-pilot" element={<DecisionReview variant="pilot" />} />
                <Route path="/demo/founder-decision-review" element={<FounderDecisionDemo />} />
                <Route path="/demo/hiring-decision" element={<HiringDecisionDemo />} />
                <Route path="/demo/price-change" element={<PriceChangeDemo />} />
                <Route path="/demo/second-location" element={<SecondLocationDemo />} />
                <Route path="/demo/sample-decision-memo" element={<SampleDecisionMemo />} />
                <Route path="/demo/consultant-founding-pilot" element={<ConsultantCapacityDemo />} />
                <Route path="/engagement-intake" element={<EngagementIntake />} />
                <Route path="/engagement-workspace" element={<PaidWorkspace />} />
                <Route path="/changelog" element={<Changelog />} />
                {/* /cases needs 11 analysis_* tables that do not exist in production (it
                    showed "No cases match" under a "440+ Reference Analyses" title). */}
                <Route path="/cases" element={<Navigate to="/examples" replace />} />
                <Route path="/dev/rvce-test" element={
                  <ProtectedRoute requireAdmin>
                    <RvceTestPanel />
                  </ProtectedRoute>
                } />
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
                <Route path="/app/documents" element={
                  <ProtectedRoute>
                    <MyDocuments />
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
                    <DocsStudio />
                  </ProtectedRoute>
                } />
                <Route path="/app/invoices" element={
                  <ProtectedRoute>
                    <InvoiceManager />
                  </ProtectedRoute>
                } />
                <Route path="/app/pre-mortem" element={
                  <ProtectedRoute>
                    <PreMortem />
                  </ProtectedRoute>
                } />
                {/* First Decision Experience, Wave 1: reachable directly for QA/founder
                    review. Not yet wired into the post-login redirect -- that is a
                    later wave, per the spec's own "no routing change" instruction. */}
                <Route path="/app/start" element={
                  <ProtectedRoute>
                    <FirstDecisionExperience />
                  </ProtectedRoute>
                } />
                {/* Activation-to-revenue Wave 4: intent-capture step, hands off into
                    the existing /app analysis workflow via router state -- no second
                    analysis engine. Behind VITE_FLAG_NEW_DECISION_V1 (page redirects
                    to /app itself when off, so this route always exists safely). */}
                <Route path="/app/new-decision" element={
                  <ProtectedRoute>
                    <NewDecision />
                  </ProtectedRoute>
                } />
                {/* Client workspace, Stage 5: lightweight client detail --
                    that client's own decisions grouped together, plus
                    "start a new decision for this client". Not a full CRM
                    page (see PR description). */}
                <Route path="/app/clients/:id" element={
                  <ProtectedRoute>
                    <ClientDetail />
                  </ProtectedRoute>
                } />
                {/* Decision tools stay discoverable. Server entitlements protect
                    paid actions; the route itself never becomes a sales wall. */}
                <Route path="/app/scenarios" element={
                  <ProtectedRoute>
                    <ScenarioWorkspace />
                  </ProtectedRoute>
                } />
                {/* Spec-requested compatibility alias. */}
                <Route path="/scenario" element={<ScenarioAliasRedirect />} />
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
                
                                {/* Admin: one shell for every /admin page, never the customer app shell */}
                <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
                  <Route index element={<AdminToday />} />
                  <Route path="insights" element={<AdminDashboard />} />
                  <Route path="benchmarks" element={<AdminBenchmarkUpload />} />
                  <Route path="health" element={<QuantisHealth />} />
                  <Route path="edge-health" element={<EdgeHealth />} />
                  <Route path="formulas" element={<FormulasDashboard />} />
                  <Route path="accuracy" element={<AccuracyDashboard />} />
                  <Route path="invariant-sweeps" element={<InvariantSweeps />} />
                  <Route path="feedback-baseline" element={<FeedbackBaseline />} />
                  <Route path="paid-engagements" element={<PaidEngagements />} />
                  <Route path="today" element={<Navigate to="/admin" replace />} />
                  <Route path="incidents" element={<IncidentManager />} />
                  <Route path="data-sources" element={<DataSources />} />
                  <Route path="denials" element={<AdminDenials />} />
                  <Route path="engine" element={<EngineInfo />} />
                  <Route path="search-console" element={<SearchConsole />} />
                  <Route path="autoposter" element={<Autoposter />} />
                  <Route path="content-studio" element={<ContentStudio />} />
                  <Route path="linkedin-growth" element={<LinkedInGrowth />} />
                  <Route path="commercial" element={<CommercialOps />} />
                  <Route path="instagram-harvest" element={<InstagramHarvest />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="inbox" element={<BusinessInbox />} />
                  <Route path="ai-costs" element={<AiCosts />} />
                  <Route path="email-funnel" element={<EmailFunnel />} />
                  <Route path="funnel" element={<AdminFunnel />} />
                  <Route path="qoc" element={<QocMonitor />} />
                </Route>
                <Route path="/directory-tracker" element={<DirectoryTracker />} />

                <Route path="/quote" element={<ProtectedRoute><QuoteIndex /></ProtectedRoute>} />
                <Route path="/quote/new" element={<ProtectedRoute><QuoteNew /></ProtectedRoute>} />
                <Route path="/quote/:id" element={<ProtectedRoute><QuoteEdit /></ProtectedRoute>} />
                <Route path="/quote/:id/result" element={<ProtectedRoute><QuoteResult /></ProtectedRoute>} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <RenderedFlag />
              <SEOPreviewPanel />
            </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
        {trackingAllowed && <Analytics />}
        <SpeedInsights />
      </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
