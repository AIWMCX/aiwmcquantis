import React, { useRef, useMemo, useState, useEffect } from 'react';
import { FileDown, RefreshCw, CheckCircle2, AlertCircle, Info, Loader2, Share2, Twitter, Linkedin, MessageCircle, Copy, Trophy, Target, ShieldAlert, TrendingUp, FileText, ArrowRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SignupPrompt } from './SignupPrompt';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FinancialSummary } from './FinancialSummary';
import { BusinessPlanSection } from './BusinessPlanSection';
import { MarketingSection } from './MarketingSection';
import { MarketAnalysisSection } from './MarketAnalysisSection';
import { ValidationSection } from './ValidationSection';
import { ActionableInsights } from './ActionableInsights';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { DocumentInsights } from './DocumentInsights';
import { ScenarioSelector, ScenarioType } from './ScenarioSelector';
import { IndustryComparison } from './IndustryComparison';
import { ShareSuccessModal } from './ShareSuccessModal';
import { cn } from '@/lib/utils';
import type { BusinessAnalysisResult } from '@/types/analysis';
import type { ExtractedFinancials, DocumentAnalysisSummary } from '@/types/documentAnalysis';
import { usePdfExport } from '@/hooks/usePdfExport';
import { useShareReport } from '@/hooks/useShareReport';
import { useExportQueue } from '@/hooks/useExportQueue';
import { toast } from 'sonner';

interface AnalysisResultsProps {
  result: BusinessAnalysisResult;
  analysisId?: string;
  onReset?: () => void;
}

export function AnalysisResults({ result, analysisId, onReset }: AnalysisResultsProps) {
  const { isAuthenticated } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);
  const { generatePdf, isGenerating } = usePdfExport();
  const { shareReport, isSharing, shareUrl } = useShareReport();
  const { queueExport, status: exportStatus, progress: exportProgress, reset: resetExport } = useExportQueue();
  
  // Scenario selector state
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('base');
  const [showShareModal, setShowShareModal] = useState(false);

  // Auto-show share modal on first render (first analysis completion)
  useEffect(() => {
    const key = `quantis_shared_${result.metadata.generated_at}`;
    if (!sessionStorage.getItem(key)) {
      const timer = setTimeout(() => {
        setShowShareModal(true);
        sessionStorage.setItem(key, '1');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [result.metadata.generated_at]);

  // === IDEA SCORE (1-10) ===
  const ideaScore = useMemo(() => {
    const confidence = result.confidence_score || 50;
    const margin = result.financial_analysis?.scenarios?.base?.net_margin ?? 0;
    const ltvCac = result.financial_analysis?.unit_economics?.ltv_cac_ratio ?? 0;
    const isRealistic = result.validation?.is_realistic ? 1 : 0;
    const isProfitable = result.validation?.is_profitable ? 1 : 0;

    // Weighted score: confidence (30%), margin health (25%), LTV:CAC (25%), viability (20%)
    const confidenceScore = Math.min(confidence / 100, 1) * 3;
    const marginScore = margin > 20 ? 2.5 : margin > 10 ? 1.5 : margin > 0 ? 0.75 : 0;
    const ltvCacScore = ltvCac >= 5 ? 2.5 : ltvCac >= 3 ? 1.75 : ltvCac >= 1 ? 1 : 0;
    const viabilityScore = (isRealistic + isProfitable);

    const raw = confidenceScore + marginScore + ltvCacScore + viabilityScore;
    return Math.max(1, Math.min(10, Math.round(raw)));
  }, [result]);

  const ideaScoreLabel = ideaScore >= 8 ? 'Strong Opportunity' : ideaScore >= 5 ? 'Needs Work' : 'High Risk';
  const ideaScoreColor = ideaScore >= 8 
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' 
    : ideaScore >= 5 
    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
    : 'bg-destructive/10 text-destructive border-destructive/30';

  // === SWOT derived from result data ===
  const swot = useMemo(() => {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const opportunities: string[] = [];
    const threats: string[] = [];

    // Strengths
    if (result.financial_analysis?.unit_economics?.ltv_cac_ratio && result.financial_analysis.unit_economics.ltv_cac_ratio >= 3)
      strengths.push(`Strong unit economics (LTV:CAC ${result.financial_analysis.unit_economics.ltv_cac_ratio.toFixed(1)}x)`);
    if ((result.financial_analysis?.scenarios?.base?.net_margin ?? 0) > 15)
      strengths.push(`Healthy profit margins (${result.financial_analysis?.scenarios?.base?.net_margin?.toFixed(1)}%)`);
    if (result.business_plan?.competitive_advantages)
      strengths.push(result.business_plan.competitive_advantages.slice(0, 120));
    if (strengths.length === 0)
      strengths.push(result.business_plan?.product_description?.slice(0, 120) || 'Unique value proposition');

    // Weaknesses
    if ((result.financial_analysis?.scenarios?.base?.net_margin ?? 0) < 5)
      weaknesses.push('Thin profit margins require careful cost management');
    if (result.financial_analysis?.unit_economics?.cac_payback_months && result.financial_analysis.unit_economics.cac_payback_months > 12)
      weaknesses.push(`Long CAC payback (${result.financial_analysis.unit_economics.cac_payback_months} months)`);
    if (result.validation?.warnings?.length)
      weaknesses.push(result.validation.warnings[0]?.message || 'Financial model has uncertainty areas');
    if (weaknesses.length === 0)
      weaknesses.push('Early-stage with unproven market fit');

    // Opportunities
    if (result.market_analysis?.growth_opportunities)
      opportunities.push(result.market_analysis.growth_opportunities.slice(0, 120));
    if (result.market_analysis?.trends?.length)
      opportunities.push(result.market_analysis.trends[0]?.slice(0, 120) || 'Growing market trends');
    if (opportunities.length === 0)
      opportunities.push('Market expansion potential');

    // Threats
    if (result.business_plan?.risks?.length)
      threats.push(result.business_plan.risks[0]?.risk || 'Competitive pressure');
    if (result.market_analysis?.barriers_to_entry)
      threats.push(result.market_analysis.barriers_to_entry.slice(0, 120));
    if (threats.length === 0)
      threats.push('Market competition and regulation');

    return { strengths, weaknesses, opportunities, threats };
  }, [result]);

  // Get scenario-specific metrics
  const scenarioMetrics = useMemo(() => {
    const scenarios = result.financial_analysis?.scenarios;
    if (!scenarios) {
      return {
        revenue: result.financial_analysis?.mrr || 0,
        profit: result.financial_analysis?.scenarios?.base?.net_profit || 0,
        margin: result.financial_analysis?.scenarios?.base?.net_margin || 0,
      };
    }
    
    const current = scenarios[selectedScenario];
    return {
      revenue: current.revenue,
      profit: current.net_profit,
      margin: current.net_margin,
    };
  }, [result.financial_analysis, selectedScenario]);

  // Convert documents_used to ExtractedFinancials format for DocumentInsights
  const documentInsightsData = useMemo(() => {
    if (!result.documents_used || result.documents_used.length === 0) {
      return { documents: [] as ExtractedFinancials[], summary: null };
    }

    // Convert DocumentUsage[] to ExtractedFinancials[] format
    const documents: ExtractedFinancials[] = result.documents_used.map(doc => ({
      document_type: doc.document_type as ExtractedFinancials['document_type'],
      confidence: doc.confidence,
      key_findings: doc.metrics_extracted,
      source_document: doc.source_document,
      extraction_notes: [],
    }));

    // Build summary from result data
    const summary: DocumentAnalysisSummary = {
      total_documents: result.documents_used.length,
      documents_with_financials: result.documents_used.filter(d => d.metrics_extracted.length > 0).length,
      total_confidence_boost: result.document_analysis_summary?.confidenceBoost || 0,
      primary_data_sources: result.documents_used.map(d => d.source_document),
      extracted_values: {}
    };

    return { documents, summary };
  }, [result.documents_used, result.document_analysis_summary]);

  const handleExportPDF = async () => {
    const toastId = 'pdf-generation';
    
    try {
      toast.loading('Generating your Executive Report...', { 
        id: toastId,
        description: 'This may take up to 30 seconds for the 8-page report.',
      });
      
      await generatePdf(result);
      
      toast.success('Executive Report downloaded!', { 
        id: toastId,
        description: 'Your professional 8-page PDF report is ready.',
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : '';
      
      if (errorMessage.includes('TIMEOUT')) {
        toast.error('PDF generation timed out', { 
          id: toastId,
          description: 'Please try again. If the problem persists, try with a simpler analysis.',
        });
      } else if (errorMessage.includes('VALIDATION')) {
        toast.error('Analysis data incomplete', { 
          id: toastId,
          description: 'Please run a new analysis to generate a complete report.',
        });
      } else {
        toast.error('Failed to generate PDF', { 
          id: toastId,
          description: 'Please try again or contact support if the issue persists.',
        });
      }
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    if (score >= 60) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
    return 'bg-destructive/10 text-destructive border-destructive/30';
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 80) return CheckCircle2;
    if (score >= 60) return Info;
    return AlertCircle;
  };

  const ConfidenceIcon = getConfidenceIcon(result.confidence_score);

  return (
    <div className="space-y-6" ref={contentRef}>
      {/* Header */}
      <div className="section-card">
        {/* Idea Score Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "inline-flex items-center gap-3 px-5 py-3 rounded-xl border-2 font-bold text-lg",
            ideaScoreColor
          )}>
            <Trophy className="w-6 h-6" />
            <span className="text-3xl font-black">{ideaScore}/10</span>
            <span className="text-sm font-semibold">{ideaScoreLabel}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            Confidence: {result.confidence_score}%
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{result.metadata.idea}</h2>
            <p className="text-muted-foreground flex items-center gap-1.5"><Target className="w-4 h-4" /> {result.metadata.location}</p>
            {result.metadata.industry_detected && (
              <Badge variant="outline" className="text-xs">
                Industry: {result.metadata.industry_detected}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Scenario-aware headline metrics */}
        <div className="grid grid-cols-3 gap-3 mt-4 p-3 rounded-lg bg-muted/30 border border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Monthly Revenue</p>
            <p className="text-lg font-bold text-foreground">
              ${scenarioMetrics.revenue.toLocaleString()}
            </p>
          </div>
          <div className="text-center border-x border-border">
            <p className="text-xs text-muted-foreground">Net Profit/mo</p>
            <p className={cn(
              "text-lg font-bold",
              scenarioMetrics.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
            )}>
              ${scenarioMetrics.profit.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Net Margin</p>
            <p className={cn(
              "text-lg font-bold",
              scenarioMetrics.margin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
            )}>
              {scenarioMetrics.margin.toFixed(1)}%
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4">
          <Button 
            onClick={handleExportPDF} 
            variant="outline" 
            className="gap-2"
            disabled={isGenerating || exportStatus === 'processing'}
          >
            {isGenerating || exportStatus === 'processing' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            {isGenerating ? 'Generating...' : 
             exportStatus === 'processing' ? 'Processing...' : 'Export PDF'}
          </Button>
          
          {/* Export progress bar */}
          {(exportStatus === 'pending' || exportStatus === 'processing') && (
            <div className="w-full mt-2">
              <Progress value={exportProgress} className="h-1" />
              <p className="text-xs text-muted-foreground mt-1">
                {exportStatus === 'pending' ? 'Queuing export...' : 'Generating report...'}
              </p>
            </div>
          )}
          
          {analysisId && (
            <Button 
              onClick={() => shareReport(analysisId)} 
              variant="outline" 
              className="gap-2"
              disabled={isSharing}
            >
              {isSharing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              {isSharing ? 'Creating...' : 'Share Link'}
            </Button>
          )}
          {onReset && (
            <Button onClick={onReset} variant="ghost" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              New Analysis
            </Button>
          )}
        </div>

        {/* Social Share Buttons - visible when share URL exists */}
        {shareUrl && (
          <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Share your analysis:</p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => {
                  window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I scored ${ideaScore}/10 on my business idea analysis! 🚀`)}&url=${encodeURIComponent(shareUrl)}`,
                    '_blank'
                  );
                }}
              >
                <Twitter className="w-3.5 h-3.5" />
                Twitter
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => {
                  window.open(
                    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
                    '_blank'
                  );
                }}
              >
                <Linkedin className="w-3.5 h-3.5" />
                LinkedIn
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => {
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(`Check out my business analysis (scored ${ideaScore}/10): ${shareUrl}`)}`,
                    '_blank'
                  );
                }}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success('Link copied!');
                }}
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Link
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Scenario Selector - Top-level toggle */}
      <ScenarioSelector 
        selectedScenario={selectedScenario}
        onScenarioChange={setSelectedScenario}
      />

      {/* Confidence Indicator - Always visible at top */}
      <ConfidenceIndicator 
        score={result.confidence_score} 
        breakdown={result.validation?.confidence_breakdown}
        suggestions={result.validation?.improvement_suggestions}
      />

      {/* Validation Section - Show data quality */}
      {result.validation && (
        <ValidationSection validation={result.validation} />
      )}

      {/* Document Insights - Show how documents improved analysis */}
      {documentInsightsData.documents.length > 0 && documentInsightsData.summary && (
        <DocumentInsights 
          documents={documentInsightsData.documents}
          summary={documentInsightsData.summary}
        />
      )}

      {/* Actionable Insights - Priority action plan */}
      {result.actionable_insights && result.actionable_insights.insights.length > 0 && (
        <ActionableInsights insights={result.actionable_insights} />
      )}

      {/* SWOT Analysis */}
      <div className="section-card">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          SWOT Analysis
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Strengths
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {swot.strengths.map((s, i) => <li key={i} className="flex items-start gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />{s}</li>)}
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> Weaknesses
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {swot.weaknesses.map((w, i) => <li key={i} className="flex items-start gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />{w}</li>)}
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Opportunities
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {swot.opportunities.map((o, i) => <li key={i} className="flex items-start gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />{o}</li>)}
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
            <h4 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> Threats
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {swot.threats.map((t, i) => <li key={i} className="flex items-start gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-destructive mt-0.5 shrink-0" />{t}</li>)}
            </ul>
          </div>
        </div>
      </div>

      {/* Industry Comparison */}
      <IndustryComparison
        metrics={{
          revenue: scenarioMetrics.revenue,
          margin: scenarioMetrics.margin,
          ltvCacRatio: result.financial_analysis?.unit_economics?.ltv_cac_ratio || 0,
        }}
        industryName={result.metadata.industry_detected}
      />

      {/* Tabs for different sections */}
      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-4">
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="business">Business Plan</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
        </TabsList>
        
        <TabsContent value="financial">
          <FinancialSummary financial={result.financial_analysis} selectedScenario={selectedScenario} />
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

      {/* Signup Prompt for anonymous users */}
      {!isAuthenticated && (
        <SignupPrompt ideaScore={ideaScore} />
      )}

      {/* Recommended Next Step — Retention CTA (authenticated only) */}
      {isAuthenticated && analysisId && (
        <div className="section-card bg-primary/5 border-primary/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">Recommended next: Create a Quarterly Summary</h3>
                <p className="text-sm text-muted-foreground">
                  Turn this analysis into a professional quarterly report — auto-filled with your data.
                </p>
              </div>
            </div>
            <Link to={`/docs?analysis=${analysisId}`}>
              <Button className="gap-2 shrink-0">
                Open Docs Studio
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Limitations & Sources */}
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
        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
          Generated: {new Date(result.metadata.generated_at).toLocaleString('en-US')} • 
          Model: {result.metadata.model} • Version: {result.metadata.version}
        </p>
      </div>

      {/* Share Success Modal */}
      <ShareSuccessModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        ideaScore={ideaScore}
        ideaName={result.metadata.idea}
        shareUrl={shareUrl || undefined}
        onExportPDF={handleExportPDF}
        profit={scenarioMetrics.profit}
        margin={scenarioMetrics.margin}
      />
    </div>
  );
}
