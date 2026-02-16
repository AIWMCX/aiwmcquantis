import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminMetricsDashboard } from '@/components/admin/AdminMetricsDashboard';
import { SystemHealthDashboard } from '@/components/admin/SystemHealthDashboard';
import { UptimeStatusCard } from '@/components/admin/UptimeStatusCard';
import { WebVitalsCard } from '@/components/admin/WebVitalsCard';
import { EngagementMetricsCard } from '@/components/admin/EngagementMetricsCard';
import { ABTestingCard } from '@/components/admin/ABTestingCard';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Shield, Database, ArrowLeft, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageSEO } from '@/components/seo/PageSEO';

// Note: Authentication and admin role checks are handled by ProtectedRoute in App.tsx

export default function AdminDashboard() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageSEO
        title="Admin Dashboard | AIWMC Quantis"
        description="Admin dashboard for monitoring metrics and system health."
        canonical="/admin"
        noindex={true}
      />
      <Header darkMode={darkMode} onToggleTheme={() => setDarkMode(!darkMode)} />
      
      <main className="flex-1 container max-w-7xl mx-auto px-4 py-8">
        {/* Admin Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Monitor business metrics, performance, and experiments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/app">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to App
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/benchmarks">
                <Database className="w-4 h-4 mr-2" />
                Benchmarks
              </Link>
            </Button>
          </div>
        </div>

        {/* Tabbed Dashboard */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="experiments">Experiments</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* System Health & Uptime Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              <SystemHealthDashboard />
              <UptimeStatusCard />
            </div>

            {/* Metrics Dashboard */}
            <AdminMetricsDashboard />
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <WebVitalsCard />
              <EngagementMetricsCard />
            </div>

            {/* Performance Tips */}
            <div className="p-6 rounded-lg border bg-muted/30">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Performance Optimization Tips
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• <strong>LCP &lt; 2.5s</strong>: Largest Contentful Paint should be under 2.5 seconds for good user experience</li>
                <li>• <strong>FID &lt; 100ms</strong>: First Input Delay should be under 100ms for responsive interactions</li>
                <li>• <strong>CLS &lt; 0.1</strong>: Cumulative Layout Shift should be under 0.1 to prevent visual instability</li>
                <li>• <strong>Scroll Depth &gt; 50%</strong>: Target users scrolling past half the page for engagement</li>
                <li>• <strong>Time on Page &gt; 30s</strong>: Indicates users are actively engaging with content</li>
              </ul>
            </div>
          </TabsContent>

          {/* Experiments Tab */}
          <TabsContent value="experiments" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <ABTestingCard />
              
              {/* Experiment Results Summary */}
              <div className="p-6 rounded-lg border bg-card">
                <h3 className="font-semibold mb-4">How to Analyze Results</h3>
                <div className="space-y-4 text-sm">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">1. Check Google Analytics</h4>
                    <p className="text-muted-foreground">
                      Go to GA4 → Reports → Events and filter by:
                    </p>
                    <ul className="mt-2 space-y-1 text-muted-foreground">
                      <li>• <code className="text-xs bg-muted px-1 rounded">experiment_exposure</code> - See variant assignments</li>
                      <li>• <code className="text-xs bg-muted px-1 rounded">experiment_conversion</code> - Track conversions</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">2. Calculate Statistical Significance</h4>
                    <p className="text-muted-foreground">
                      Need at least 100+ conversions per variant for reliable results. 
                      Use a chi-squared test or online calculator.
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">3. Implement Winner</h4>
                    <p className="text-muted-foreground">
                      Once a variant shows 95%+ confidence, update the codebase 
                      to use the winning variant as the new default.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
