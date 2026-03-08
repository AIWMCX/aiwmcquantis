import { Suspense, lazy, useEffect } from "react";
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

// CRITICAL: Landing page is NOT lazy loaded for instant first paint
import Landing from "./pages/Landing";
const AppDashboard = lazy(() => import("./pages/AppDashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SharedReport = lazy(() => import("./pages/SharedReport"));
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
const ExamplesIndex = lazy(() => import("./pages/examples/ExamplesIndex"));
const ExampleAnalysis = lazy(() => import("./pages/examples/ExampleAnalysis"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const UseCases = lazy(() => import("./pages/UseCases"));
const PricingPage = lazy(() => import("./pages/Pricing"));
const RiskGallery = lazy(() => import("./pages/RiskGallery"));
const QuantisHealth = lazy(() => import("./pages/admin/QuantisHealth"));
const InvoiceManager = lazy(() => import("./pages/InvoiceManager"));

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

const App = () => {
  // Initialize performance and engagement tracking on mount
  useEffect(() => {
    initWebVitals();
    initEngagementTracking();
  }, []);

  return (
    <ErrorBoundary>
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
                <Route path="/examples" element={<ExamplesIndex />} />
                <Route path="/examples/:slug" element={<ExampleAnalysis />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/use-cases" element={<UseCases />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/risk-gallery" element={<RiskGallery />} />
                
                {/* Public share route - no auth required */}
                <Route path="/share/:token" element={<SharedReport />} />
                
                {/* Protected routes - require authentication */}
                <Route path="/app" element={<AppDashboard />} />
                <Route path="/plus-settings" element={
                  <ProtectedRoute>
                    <PlusSettings />
                  </ProtectedRoute>
                } />
                <Route path="/docs" element={
                  <ProtectedRoute>
                    <DocsStudio />
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
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
