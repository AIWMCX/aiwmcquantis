import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle, ArrowLeft, ExternalLink, Calendar, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { FinancialSummary } from '@/components/analysis/FinancialSummary';
import { BusinessPlanSection } from '@/components/analysis/BusinessPlanSection';
import { MarketingSection } from '@/components/analysis/MarketingSection';
import { MarketAnalysisSection } from '@/components/analysis/MarketAnalysisSection';
import { ConfidenceIndicator } from '@/components/analysis/ConfidenceIndicator';
import { ActionableInsights } from '@/components/analysis/ActionableInsights';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import aiwmcLogoText from '@/assets/aiwmc-quantis-logo-text.png';

interface SharedReportData {
  analysis: {
    id: string;
    idea: string;
    location: string;
    result: BusinessAnalysisResult;
    confidence_score: number;
    monthly_profit: number;
    payback_months: number;
    startup_investment: number;
    created_at: string;
  };
  shared_at: string;
  expires_at: string;
  view_count: number;
}

export default function SharedReport() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSharedReport() {
      if (!token || token === ':token') {
        setError('Invalid share link');
        setIsLoading(false);
        return;
      }

      // Validate token format (64-char hex)
      if (!/^[a-f0-9]{64}$/i.test(token)) {
        setError('Invalid share link format');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL || 'https://gafxacjhkqsdzwwzhbor.supabase.co'}/functions/v1/share-report?token=${encodeURIComponent(token)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhZnhhY2poa3FzZHp3d3poYm9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNjUwMTUsImV4cCI6MjA3OTg0MTAxNX0.d7lRtUFSzVdeq4oiX2JC_iogXeP4J5G_WXkT3tgVTew',
            },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'Failed to load report');
          return;
        }

        if (!result.success || !result.data) {
          setError('Report not found or expired');
          return;
        }

        setData(result.data);
      } catch (err) {
        console.error('[SharedReport] Error:', err);
        setError('Failed to load report');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSharedReport();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading shared report...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Report Not Available</h1>
          <p className="text-muted-foreground mb-6">
            {error || 'This shared report may have expired or been revoked by the owner.'}
          </p>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go to Homepage
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const result = data.analysis.result;
  const analysisDate = new Date(data.analysis.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img src={aiwmcLogoText} alt="AIWMC Quantis" width={109} height={32} className="h-8 w-auto object-contain dark:invert" />
            </Link>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="gap-1">
                <Eye className="w-3 h-3" />
                Shared Report
              </Badge>
              <Link to="/app">
                <Button size="sm" className="gap-2">
                  Try It Free
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-6">
          {/* Report Header */}
          <div className="section-card">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">{result.metadata.idea}</h1>
                <p className="text-muted-foreground">📍 {result.metadata.location}</p>
                {result.metadata.industry_detected && (
                  <Badge variant="outline" className="text-xs">
                    Industry: {result.metadata.industry_detected}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Analyzed: {analysisDate}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{data.view_count} views</span>
              </div>
            </div>
          </div>

          {/* Confidence Indicator */}
          <ConfidenceIndicator 
            score={result.confidence_score} 
            breakdown={result.validation?.confidence_breakdown}
            suggestions={result.validation?.improvement_suggestions}
          />

          {/* Actionable Insights */}
          {result.actionable_insights && result.actionable_insights.insights.length > 0 && (
            <ActionableInsights insights={result.actionable_insights} />
          )}

          {/* Tabs for different sections */}
          <Tabs defaultValue="financial" className="w-full">
            <TabsList className="w-full grid grid-cols-4 mb-4">
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="business">Business Plan</TabsTrigger>
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
              <TabsTrigger value="market">Market</TabsTrigger>
            </TabsList>
            
            <TabsContent value="financial">
              <FinancialSummary financial={result.financial_analysis} />
            </TabsContent>
            
            <TabsContent value="business">
              <BusinessPlanSection plan={result.business_plan} />
            </TabsContent>
            
            <TabsContent value="marketing">
              <MarketingSection marketing={result.marketing_plan} />
            </TabsContent>
            
            <TabsContent value="market">
              <MarketAnalysisSection market={result.market_analysis} />
            </TabsContent>
          </Tabs>

          {/* Footer Info */}
          <div className="section-card space-y-4">
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">Data Sources</h4>
              <div className="flex flex-wrap gap-2">
                {result.data_sources.map((source, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{source}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">Analysis Limitations</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {result.limitations.map((limitation, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Want to analyze your own business idea?
            </h3>
            <p className="text-muted-foreground mb-4">
              Get your own financial projections, business plan, and marketing strategy in under 2 minutes.
            </p>
            <Link to="/app">
              <Button size="lg" className="gap-2">
                Try It Free
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <img src={aiwmcLogoText} alt="AIWMC Quantis" width={109} height={32} className="h-8 w-auto object-contain dark:invert" />
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} AIWMC Quantis. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
