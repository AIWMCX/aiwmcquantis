import React, { useRef, useMemo, useState, useEffect } from 'react';
import { FileDown, RefreshCw, CheckCircle2, AlertCircle, Info, Loader2, Share2, Twitter, Linkedin, MessageCircle, Copy, Trophy, Target, ShieldAlert, TrendingUp, FileText, ArrowRight, MapPin, BarChart3, Shield, Lightbulb } from 'lucide-react';
import { formatPaybackDisplay } from '@/lib/formatPayback';
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
import { SensitivityTornado } from './SensitivityTornado';
import { DualEngineBadge } from './DualEngineBadge';
import { BenchmarkConfidenceIndicator } from './BenchmarkConfidenceIndicator';
import { AssumptionGraph } from './AssumptionGraph';
import { ModelConfidenceBadge } from './ModelConfidenceBadge';
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
  
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('base');
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const key = `quantis_shared_${result.metadata.generated_at}`;
    if (!sessionStorage.getItem(key)) {
      const timer = setTimeout(() => {
        setShowShareModal(true);
        sessionStorage.setItem(key, '1');
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [result.metadata.generated_at]);

  // === IDEA SCORE ===
  const ideaScore = useMemo(() => {
    const confidence = result.confidence_score || 50;
    const margin = result.financial_analysis?.scenarios?.base?.net_margin ?? 0;
    const ltvCac = result.financial_analysis?.unit_economics?.ltv_cac_ratio ?? 0;
    const isRealistic = result.validation?.is_realistic ? 1 : 0;
    const isProfitable = result.validation?.is_profitable ? 1 : 0;
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

  // === SWOT ===
  const swot = useMemo(() => {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const opportunities: string[] = [];
    const threats: string[] = [];
    if (result.financial_analysis?.unit_economics?.ltv_cac_ratio && result.financial_analysis.unit_economics.ltv_cac_ratio >= 3)
      strengths.push(`Strong unit economics (LTV:CAC ${result.financial_analysis.unit_economics.ltv_cac_ratio.toFixed(1)}x)`);
    if ((result.financial_analysis?.scenarios?.base?.net_margin ?? 0) > 15)
      strengths.push(`Healthy profit margins (${result.financial_analysis?.scenarios?.base?.net_margin?.toFixed(1)}%)`);
    if (result.business_plan?.competitive_advantages) strengths.push(result.business_plan.competitive_advantages.slice(0, 120));
    if (strengths.length === 0) strengths.push(result.business_plan?.product_description?.slice(0, 120) || 'Unique value proposition');
    if ((result.financial_analysis?.scenarios?.base?.net_margin ?? 0) < 5) weaknesses.push('Thin profit margins require careful cost management');
    if (result.financial_analysis?.unit_economics?.cac_payback_months && result.financial_analysis.unit_economics.cac_payback_months > 12) weaknesses.push(`Long CAC payback (${result.financial_analysis.unit_economics.cac_payback_months} months)`);
    if (result.validation?.warnings?.length) weaknesses.push(result.validation.warnings[0]?.message || 'Financial model has uncertainty areas');
    if (weaknesses.length === 0) weaknesses.push('Early-stage with unproven market fit');
    if (result.market_analysis?.growth_opportunities) opportunities.push(result.market_analysis.growth_opportunities.slice(0, 120));
    if (result.market_analysis?.trends?.length) opportunities.push(result.market_analysis.trends[0]?.slice(0, 120) || 'Growing market trends');
    if (opportunities.length === 0) opportunities.push('Market expansion potential');
    if (result.business_plan?.risks?.length) threats.push(result.business_plan.risks[0]?.risk || 'Competitive pressure');
    if (result.market_analysis?.barriers_to_entry) threats.push(result.market_analysis.barriers_to_entry.slice(0, 120));
    if (threats.length === 0) threats.push('Market competition and regulation');
    return { strengths, weaknesses, opportunities, threats };
  }, [result]);

  const scenarioMetrics = useMemo(() => {
    const scenarios = result.financial_analysis?.scenarios;
    if (!scenarios) return { revenue: result.financial_analysis?.mrr || 0, profit: result.financial_analysis?.scenarios?.base?.net_profit || 0, margin: result.financial_analysis?.scenarios?.base?.net_margin || 0 };
    const current = scenarios[selectedScenario];
    return { revenue: current.revenue, profit: current.net_profit, margin: current.net_margin };
  }, [result.financial_analysis, selectedScenario]);

  const documentInsightsData = useMemo(() => {
    if (!result.documents_used || result.documents_used.length === 0) return { documents: [] as ExtractedFinancials[], summary: null };
    const documents: ExtractedFinancials[] = result.documents_used.map(doc => ({
      document_type: doc.document_type as ExtractedFinancials['document_type'],
      confidence: doc.confidence,
      key_findings: doc.metrics_extracted,
      source_document: doc.source_document,
      extraction_notes: [],
    }));
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
      toast.loading('Generating your Executive Report...', { id: toastId, description: 'This may take up to 30 seconds.' });
      await generatePdf(result);
      toast.success('Executive Report downloaded!', { id: toastId, description: 'Your professional PDF report is ready.' });
    } catch (error) {
      console.error('PDF export failed:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('TIMEOUT')) toast.error('PDF generation timed out', { id: toastId, description: 'Please try again.' });
      else if (errorMessage.includes('VALIDATION')) toast.error('Analysis data incomplete', { id: toastId, description: 'Please run a new analysis.' });
      else toast.error('Failed to generate PDF', { id: toastId, description: 'Please try again.' });
    }
  };

  return (
    <div className="space-y-4" ref={contentRef}>
      {/* Compact Header Card */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold text-sm", ideaScoreColor)}>
            <Trophy className="w-4 h-4" />
            <span className="text-xl font-black tabular-nums">{ideaScore}/10</span>
            <span className="text-xs font-semibold">{ideaScoreLabel}</span>
          </div>
          <DualEngineBadge crossValidation={(result as any).cross_validation} />
        </div>

        {/* 2x2 Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <MetricCard
            label="Monthly Revenue"
            value={`$${scenarioMetrics.revenue.toLocaleString()}`}
            positive={true}
          />
          <MetricCard
            label="Net Margin"
            value={`${scenarioMetrics.margin.toFixed(1)}%`}
            positive={scenarioMetrics.margin >= 0}
          />
          <MetricCard
            label="LTV:CAC"
            value={`${(result.financial_analysis?.unit_economics?.ltv_cac_ratio ?? 0).toFixed(1)}x`}
            positive={(result.financial_analysis?.unit_economics?.ltv_cac_ratio ?? 0) >= 3}
          />
          <MetricCard
            label="Payback"
            value={formatPaybackDisplay(result.financial_analysis?.payback_period_months ?? 999, scenarioMetrics.profit)}
            positive={(result.financial_analysis?.payback_period_months ?? 999) <= 18}
          />
        </div>

        {/* Scenario + Actions row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <ScenarioSelector selectedScenario={selectedScenario} onScenarioChange={setSelectedScenario} />
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={handleExportPDF} variant="outline" size="sm" className="gap-1.5 text-xs h-8" disabled={isGenerating || exportStatus === 'processing'}>
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              PDF
            </Button>
            {analysisId && (
              <Button onClick={() => shareReport(analysisId)} variant="outline" size="sm" className="gap-1.5 text-xs h-8" disabled={isSharing}>
                {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                Share
              </Button>
            )}
            {onReset && (
              <Button onClick={onReset} variant="ghost" size="sm" className="gap-1.5 text-xs h-8">
                <RefreshCw className="w-3.5 h-3.5" />
                New
              </Button>
            )}
          </div>
        </div>

        {/* Social Share strip */}
        {shareUrl && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Share:</span>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Quantis gave my idea ${ideaScore}/10`)}&url=${encodeURIComponent(shareUrl)}`, '_blank')}>
              <Twitter className="w-3 h-3" /> X
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank')}>
              <Linkedin className="w-3 h-3" /> LinkedIn
            </Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Link copied!'); }}>
              <Copy className="w-3 h-3" /> Copy
            </Button>
          </div>
        )}
      </div>

      {/* 4-Tab Mini Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-4 mb-3">
          <TabsTrigger value="overview" className="text-xs sm:text-sm gap-1">
            <BarChart3 className="w-3.5 h-3.5 hidden sm:block" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sensitivity" className="text-xs sm:text-sm gap-1">
            <TrendingUp className="w-3.5 h-3.5 hidden sm:block" />
            Sensitivity
          </TabsTrigger>
          <TabsTrigger value="benchmarks" className="text-xs sm:text-sm gap-1">
            <Target className="w-3.5 h-3.5 hidden sm:block" />
            Benchmarks
          </TabsTrigger>
          <TabsTrigger value="reliability" className="text-xs sm:text-sm gap-1">
            <Shield className="w-3.5 h-3.5 hidden sm:block" />
            Reliability
          </TabsTrigger>
        </TabsList>

        {/* TAB: Overview */}
        <TabsContent value="overview" className="space-y-4 animate-in fade-in duration-200">
          <FinancialSummary financial={result.financial_analysis} selectedScenario={selectedScenario} />
          
          {/* SWOT */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> SWOT Analysis
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SwotQuadrant title="Strengths" items={swot.strengths} color="emerald" icon={TrendingUp} itemIcon={CheckCircle2} />
              <SwotQuadrant title="Weaknesses" items={swot.weaknesses} color="amber" icon={AlertCircle} itemIcon={AlertCircle} />
              <SwotQuadrant title="Opportunities" items={swot.opportunities} color="blue" icon={TrendingUp} itemIcon={TrendingUp} />
              <SwotQuadrant title="Threats" items={swot.threats} color="red" icon={ShieldAlert} itemIcon={ShieldAlert} />
            </div>
          </div>

          {/* Actionable Insights */}
          {result.actionable_insights && result.actionable_insights.insights.length > 0 && (
            <ActionableInsights insights={result.actionable_insights} />
          )}

          {/* Detailed Sections as sub-tabs */}
          <Tabs defaultValue="financial" className="w-full">
            <TabsList className="w-full grid grid-cols-4 mb-3">
              <TabsTrigger value="financial" className="text-xs">Financial</TabsTrigger>
              <TabsTrigger value="business" className="text-xs">Business</TabsTrigger>
              <TabsTrigger value="marketing" className="text-xs">Marketing</TabsTrigger>
              <TabsTrigger value="market" className="text-xs">Market</TabsTrigger>
            </TabsList>
            <TabsContent value="financial"><FinancialSummary financial={result.financial_analysis} selectedScenario={selectedScenario} /></TabsContent>
            <TabsContent value="business"><BusinessPlanSection plan={result.business_plan} /></TabsContent>
            <TabsContent value="marketing"><MarketingSection marketing={result.marketing_plan} /></TabsContent>
            <TabsContent value="market"><MarketAnalysisSection market={result.market_analysis} /></TabsContent>
          </Tabs>
        </TabsContent>

        {/* TAB: Sensitivity */}
        <TabsContent value="sensitivity" className="space-y-4 animate-in fade-in duration-200">
          {(result as any).sensitivity_analysis && (
            <SensitivityTornado 
              tornado={(result as any).sensitivity_analysis.tornado}
              mostSensitiveVariable={(result as any).sensitivity_analysis.most_sensitive_variable}
              leastSensitiveVariable={(result as any).sensitivity_analysis.least_sensitive_variable}
              summary={(result as any).sensitivity_analysis.summary}
            />
          )}
          <AssumptionGraph graph={result.assumption_graph} />
        </TabsContent>

        {/* TAB: Benchmarks */}
        <TabsContent value="benchmarks" className="space-y-4 animate-in fade-in duration-200">
          <IndustryComparison
            metrics={{
              revenue: scenarioMetrics.revenue,
              margin: scenarioMetrics.margin,
              ltvCacRatio: result.financial_analysis?.unit_economics?.ltv_cac_ratio || 0,
            }}
            industryName={result.metadata.industry_detected}
          />
          <BenchmarkConfidenceIndicator confidence={(result as any).benchmark_confidence} />
        </TabsContent>

        {/* TAB: Reliability */}
        <TabsContent value="reliability" className="space-y-4 animate-in fade-in duration-200">
          <ModelConfidenceBadge confidence={result.model_confidence} />
          
          <ConfidenceIndicator 
            score={result.confidence_score} 
            breakdown={result.validation?.confidence_breakdown}
            suggestions={result.validation?.improvement_suggestions}
          />

          {result.validation && <ValidationSection validation={result.validation} />}

          {/* Sanity Flags */}
          {result.sanity_flags && result.sanity_flags.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" /> Sanity Check Flags
              </h3>
              <div className="space-y-2">
                {result.sanity_flags.map((flag, i) => (
                  <div key={i} className={cn(
                    'p-3 rounded-lg border text-sm',
                    flag.severity === 'critical' ? 'bg-destructive/5 border-destructive/30' :
                    flag.severity === 'warning' ? 'bg-amber-500/5 border-amber-500/30' :
                    'bg-muted/30 border-border'
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{flag.severity}</Badge>
                      <span className="font-medium text-foreground">{flag.rule_id.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-muted-foreground">{flag.explanation}</p>
                    <p className="text-xs text-primary mt-1 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" />
                      {flag.suggested_correction}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document Insights */}
          {documentInsightsData.documents.length > 0 && documentInsightsData.summary && (
            <DocumentInsights documents={documentInsightsData.documents} summary={documentInsightsData.summary} />
          )}

          {/* Data Sources & Limitations */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div>
              <h4 className="text-xs font-medium text-foreground mb-2">Data Sources</h4>
              <div className="flex flex-wrap gap-1.5">
                {result.data_sources.map((source, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{source}</Badge>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium text-foreground mb-2">Limitations</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                {result.limitations.map((limitation, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-muted-foreground">•</span>
                    {limitation}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-[10px] text-muted-foreground pt-2 border-t border-border tabular-nums">
              Generated: {new Date(result.metadata.generated_at).toLocaleString('en-US')} · Model: {result.metadata.model} · Version: {result.metadata.version}
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Signup Prompt for anonymous users */}
      {!isAuthenticated && <SignupPrompt ideaScore={ideaScore} />}

      {/* Recommended Next Step */}
      {isAuthenticated && analysisId && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Create a Quarterly Summary</h3>
                <p className="text-xs text-muted-foreground">Auto-filled with your analysis data.</p>
              </div>
            </div>
            <Link to={`/docs?analysis=${analysisId}`}>
              <Button size="sm" className="gap-1.5 text-xs">
                Docs Studio <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      <ShareSuccessModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        ideaScore={ideaScore}
        ideaName={result.metadata.idea}
        shareUrl={shareUrl || undefined}
        onExportPDF={handleExportPDF}
        profit={scenarioMetrics.profit}
        margin={scenarioMetrics.margin}
        paybackMonths={result.financial_analysis?.payback_period_months ?? undefined}
      />
    </div>
  );
}

// --- Sub-components ---

function MetricCard({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <p className={cn(
        "text-base sm:text-lg font-bold tabular-nums transition-all duration-300",
        positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
      )}>
        {value}
      </p>
    </div>
  );
}

function SwotQuadrant({ title, items, color, icon: Icon, itemIcon: ItemIcon }: {
  title: string;
  items: string[];
  color: string;
  icon: React.ElementType;
  itemIcon: React.ElementType;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400',
    amber: 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400',
    blue: 'bg-blue-500/5 border-blue-500/20 text-blue-700 dark:text-blue-400',
    red: 'bg-destructive/5 border-destructive/20 text-destructive',
  };
  const iconColorMap: Record<string, string> = {
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    blue: 'text-blue-500',
    red: 'text-destructive',
  };

  return (
    <div className={cn('p-3 rounded-lg border', colorMap[color])}>
      <h4 className="text-xs font-semibold mb-1.5 flex items-center gap-1">
        <Icon className="w-3.5 h-3.5" /> {title}
      </h4>
      <ul className="text-xs text-muted-foreground space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1">
            <ItemIcon className={cn("w-3 h-3 mt-0.5 shrink-0", iconColorMap[color])} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
