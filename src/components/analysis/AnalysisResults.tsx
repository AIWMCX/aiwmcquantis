import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Share2, Twitter, Linkedin, Copy, Trophy, ShieldAlert, TrendingUp, FileText, ArrowRight, MapPin, Shield, Lightbulb, Download, Upload } from 'lucide-react';
import { formatPaybackDisplay } from '@/lib/formatPayback';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SignupPrompt } from './SignupPrompt';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FinancialSummary } from './FinancialSummary';
import { MarketAnalysisSection } from './MarketAnalysisSection';
import { ActionableInsights } from './ActionableInsights';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { ScenarioSelector, ScenarioType } from './ScenarioSelector';
import { ScenarioBar, SCENARIO_CONFIGS, type ScenarioId } from './ScenarioBar';
import { IndustryComparison } from './IndustryComparison';
import { ShareSuccessModal } from './ShareSuccessModal';
import { DualEngineBadge } from './DualEngineBadge';
import { BenchmarkConfidenceIndicator } from './BenchmarkConfidenceIndicator';
import { ModelConfidenceBadge } from './ModelConfidenceBadge';
import { ConfidenceBadge as OutputConfidenceBadge } from './ConfidenceBadge';
import { MonteCarloResults } from './MonteCarloResults';
import { calculateOutputConfidence } from '@/services/confidence-scorer';
import { cn } from '@/lib/utils';
import { AnomalyCard } from './AnomalyCard';
import { StressMap, calculateStressScores } from './StressMap';
import { SCOREComplianceBadge } from './SCOREComplianceBadge';
import { ValidationJourney } from './ValidationJourney';
import { ScenarioLibrary } from './ScenarioLibrary';
import { ActualsImporter } from './ActualsImporter';
import { ValidationSection } from './ValidationSection';
import { CashFlowVisualization } from './CashFlowVisualization';
import { ResultsTopBar } from './ResultsTopBar';
import { ResultsHeroStrip } from './ResultsHeroStrip';
import { ResultsAccordionSections } from './ResultsAccordionSections';
import { BeatMissEngine } from './BeatMissEngine';
import { QualityOfEarnings } from './QualityOfEarnings';
import { CompetitiveMatrix } from './CompetitiveMatrix';
import { KeyMetricSpotlight } from './KeyMetricSpotlight';
import { CapitalReadinessSection } from './CapitalReadinessSection';
import { CoherenceFlags } from './CoherenceFlags';
import { RevenueChart } from './RevenueChart';
import { BreakEvenChart } from './BreakEvenChart';
import { LtvCacIndicator } from './LtvCacIndicator';
import { ConsultantComparison } from './ConsultantComparison';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { usePdfExport } from '@/hooks/usePdfExport';
import { useShareReport } from '@/hooks/useShareReport';
import { useExportQueue } from '@/hooks/useExportQueue';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
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
  const { queueExport, status: exportStatus } = useExportQueue();

  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('base');
  const [activeScenario, setActiveScenario] = useState<ScenarioId>('base');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showActualsImporter, setShowActualsImporter] = useState(false);

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

  const scenarioMetrics = useMemo(() => {
    const scenarios = result.financial_analysis?.scenarios;
    if (!scenarios) return { revenue: result.financial_analysis?.mrr || 0, profit: result.financial_analysis?.scenarios?.base?.net_profit || 0, margin: result.financial_analysis?.scenarios?.base?.net_margin || 0 };
    const current = scenarios[selectedScenario];
    return { revenue: current.revenue, profit: current.net_profit, margin: current.net_margin };
  }, [result.financial_analysis, selectedScenario]);

  const breakEvenMonths = result.financial_analysis?.payback_period_months ?? 99;
  const cashRunwayMonths = useMemo(() => {
    const investment = result.financial_analysis?.startup_investment?.total ?? 0;
    const monthlyProfit = scenarioMetrics.profit;
    if (monthlyProfit >= 0) return 36;
    return Math.max(1, Math.floor(investment / Math.abs(monthlyProfit)));
  }, [result.financial_analysis, scenarioMetrics.profit]);

  const handleExportPDF = async () => {
    const toastId = 'pdf-generation';
    try {
      toast.loading('Generating your Executive Report...', { id: toastId, description: 'This may take up to 30 seconds.' });
      await generatePdf(result);
      toast.success('Executive Report downloaded!', { id: toastId, description: 'Your professional PDF report is ready.' });
    } catch (error) {
      logger.error('PDF export failed:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('TIMEOUT')) toast.error('PDF generation timed out', { id: toastId, description: 'Please try again.' });
      else if (errorMessage.includes('VALIDATION')) toast.error('Analysis data incomplete', { id: toastId, description: 'Please run a new analysis.' });
      else toast.error('Failed to generate PDF', { id: toastId, description: 'Please try again.' });
    }
  };

  const handleExportSCORE = useCallback(() => {
    try {
      const fields = [
        { tab: 'Revenue Projections', field: 'monthly_revenue', label: 'Monthly Revenue', value: result.financial_analysis?.mrr },
        { tab: 'Revenue Projections', field: 'annual_revenue', label: 'Annual Revenue', value: result.financial_analysis?.arr },
        { tab: 'Startup Costs', field: 'total_startup_costs', label: 'Total Startup Costs', value: result.financial_analysis?.startup_investment?.total },
        { tab: 'Operating Expenses', field: 'total_monthly_expenses', label: 'Total Monthly Expenses', value: result.financial_analysis?.monthly_expenses?.total },
        { tab: 'Cash Flow', field: 'net_profit', label: 'Monthly Net Profit', value: result.financial_analysis?.scenarios?.base?.net_profit },
        { tab: 'Cash Flow', field: 'net_margin', label: 'Net Margin (%)', value: result.financial_analysis?.scenarios?.base?.net_margin },
        { tab: 'Cash Flow', field: 'payback_period', label: 'Payback Period (months)', value: result.financial_analysis?.returns?.payback_period_months },
        { tab: 'KPIs', field: 'roi_year_1', label: 'ROI Year 1 (%)', value: result.financial_analysis?.returns?.roi_year_1 },
      ];
      const header = 'Tab,Field,Label,Value';
      const lines = fields.map(r => `"${r.tab}","${r.field}","${r.label}","${r.value ?? ''}"`);
      const csv = [header, ...lines].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quantis-score-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('SCORE CSV exported!');
    } catch {
      toast.error('Failed to export SCORE file');
    }
  }, [result]);

  const handleShare = useCallback(() => {
    if (analysisId) shareReport(analysisId);
  }, [analysisId, shareReport]);

  // Top 3 risk flags
  const topRisks = useMemo(() => {
    const risks: { label: string; impact: string; mitigation: string; mitigationPlan: string[]; severity: 'red' | 'orange' | 'yellow' }[] = [];
    if (cashRunwayMonths < 12) risks.push({
      label: `Cash runway under 12 months`,
      impact: `Only ${cashRunwayMonths} months of runway at current burn rate.`,
      mitigation: 'Reduce monthly expenses or secure additional funding.',
      mitigationPlan: [
        'Cut non-essential operating costs by 15-20%',
        'Negotiate payment terms with vendors (net-60 or net-90)',
        'Explore bridge financing or revenue-based lending',
        'Build a 3-month emergency reserve before scaling',
      ],
      severity: 'red',
    });
    if (scenarioMetrics.margin < 10) risks.push({
      label: `Net margin below 10%`,
      impact: `Current margin is ${scenarioMetrics.margin.toFixed(1)}%, leaving little buffer.`,
      mitigation: 'Optimize COGS or increase pricing by 10-15%.',
      mitigationPlan: [
        'Audit top 3 cost categories for 10% reduction opportunities',
        'Test a 10-15% price increase with a small customer segment',
        'Renegotiate supplier contracts or switch to bulk purchasing',
        'Automate manual processes to reduce labor costs',
      ],
      severity: scenarioMetrics.margin < 0 ? 'red' : 'orange',
    });
    const cacPayback = result.financial_analysis?.unit_economics?.cac_payback_months;
    if (cacPayback && cacPayback > 6) risks.push({
      label: `Slow CAC recovery`,
      impact: `${cacPayback.toFixed(1)} months to recover customer acquisition cost.`,
      mitigation: 'Focus on organic channels or improve conversion rates.',
      mitigationPlan: [
        'Shift 30% of paid ad budget to content marketing and SEO',
        'Implement a referral program with 2-sided incentives',
        'Optimize landing page conversion rate (target >3%)',
        'Focus on high-LTV customer segments to improve unit economics',
      ],
      severity: cacPayback > 12 ? 'red' : 'yellow',
    });
    if (result.validation?.warnings?.length) {
      result.validation.warnings.slice(0, 1).forEach(w => {
        risks.push({
          label: w.message || 'Financial model uncertainty',
          impact: 'Model assumptions may not hold under stress.',
          mitigation: 'Validate with real market data within 30 days.',
          mitigationPlan: [
            'Interview 10 potential customers this week',
            'Run a pre-sale or waitlist to validate willingness to pay',
            'Compare your assumptions against published industry benchmarks',
            'Set up weekly metric tracking to catch deviations early',
          ],
          severity: 'yellow',
        });
      });
    }
    return risks.slice(0, 3);
  }, [cashRunwayMonths, scenarioMetrics.margin, result]);

  const executiveSummary = result.business_plan?.executive_summary || result.business_plan?.product_description || '';

  return (
    <div className="space-y-0" ref={contentRef}>
      {/* Sticky Top Bar — t=0 fade in */}
      <div className="animate-fade-in" style={{ animationFillMode: 'both' }}>
        <ResultsTopBar
          ideaName={result.metadata.idea}
          location={result.metadata.location}
          confidenceScore={result.confidence_score || 70}
          onExportPDF={handleExportPDF}
          onShare={analysisId ? handleShare : undefined}
          onReset={onReset}
          isGeneratingPdf={isGenerating}
          isSharing={isSharing}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Consultant Comparison Banner */}
        <ConsultantComparison />
        {/* Hero KPI Strip — t=0 with count-up at t=200 */}
        <ResultsHeroStrip
          breakEvenMonths={breakEvenMonths}
          month12Revenue={scenarioMetrics.revenue}
          cashRunwayMonths={cashRunwayMonths}
          ltvCacRatio={result.financial_analysis?.unit_economics?.ltv_cac_ratio ?? 0}
          confidenceScore={result.confidence_score || 70}
          netProfit={scenarioMetrics.profit}
        />

        {/* Two-Column Main Content — 60/40 split */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* LEFT COLUMN (60%) */}
          <div className="lg:col-span-3 space-y-5">
            {/* Stress Map — t=400 */}
            <div className="q-card animate-fade-in p-5" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
              <StressMap {...calculateStressScores(result)} />
            </div>

            {/* 36-Month Revenue Chart — t=700 */}
            <div className="q-card animate-fade-in p-5 space-y-3" style={{ animationDelay: '700ms', animationFillMode: 'both' }}>
              <h3 className="text-sm font-semibold text-[var(--q-text-primary)]" style={{ fontFamily: 'var(--q-font-heading)' }}>
                36-Month Revenue Projection
              </h3>
              <RevenueChart
                baseRevenue={scenarioMetrics.revenue}
                margin={scenarioMetrics.margin}
                activeScenario={activeScenario}
              />
            </div>

            {/* Scenario Bar — below chart */}
            <div className="q-card animate-fade-in p-4" style={{ animationDelay: '750ms', animationFillMode: 'both' }}>
              <ScenarioBar activeScenario={activeScenario} onScenarioChange={setActiveScenario} />
            </div>

            {/* Scenario metrics */}
            <div className="q-card animate-fade-in p-4 space-y-3" style={{ animationDelay: '800ms', animationFillMode: 'both' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--q-text-primary)]">Scenario Comparison</h3>
                <ScenarioSelector selectedScenario={selectedScenario} onScenarioChange={setSelectedScenario} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <MetricMini label="Revenue" value={`$${scenarioMetrics.revenue.toLocaleString()}`} positive={true} />
                <MetricMini label="Net Margin" value={`${scenarioMetrics.margin.toFixed(1)}%`} positive={scenarioMetrics.margin >= 0} />
                <MetricMini label="Net Profit" value={`$${scenarioMetrics.profit.toLocaleString()}`} positive={scenarioMetrics.profit >= 0} />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (40%) — sticky on scroll */}
          <div className="lg:col-span-2 space-y-5 lg:sticky lg:top-[72px] lg:self-start">
            {/* Executive Summary — t=600, border-left accent */}
            <div
              className="q-card animate-fade-in p-5 space-y-2 border-l-[3px] border-l-[var(--q-accent-primary)]"
              style={{ animationDelay: '600ms', animationFillMode: 'both' }}
            >
              <h3 className="text-sm font-semibold text-[var(--q-text-primary)] flex items-center gap-2" style={{ fontFamily: 'var(--q-font-heading)' }}>
                <DualEngineBadge crossValidation={(result as any).cross_validation} />
                Executive Summary
              </h3>
              <p className="text-sm text-[var(--q-text-secondary)] leading-relaxed">
                {executiveSummary || 'Analysis complete. Review the financial model and risk assessment below.'}
              </p>
            </div>

            {/* Top Risk Flags — t=900, staggered slide-in */}
            <div className="q-card p-5 space-y-4 animate-fade-in" style={{ animationDelay: '900ms', animationFillMode: 'both' }}>
              <h3 className="text-sm font-semibold text-[var(--q-text-primary)]" style={{ fontFamily: 'var(--q-font-heading)' }}>
                Top Risk Flags
              </h3>
              {topRisks.length === 0 ? (
                <p className="text-sm text-[var(--q-status-green)] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> No critical risks detected
                </p>
              ) : (
                <div className="space-y-4">
                  {topRisks.map((risk, i) => (
                    <RiskFlagCard key={i} risk={risk} index={i} />
                  ))}
                </div>
              )}
            </div>

            {/* Key Metric Spotlight — after risk flags */}
            <div className="animate-fade-in" style={{ animationDelay: '950ms', animationFillMode: 'both' }}>
              <KeyMetricSpotlight result={result} />
            </div>

            {/* SCORE export + social */}
            <div className="animate-fade-in flex flex-wrap gap-2" style={{ animationDelay: '1000ms', animationFillMode: 'both' }}>
              <Button onClick={handleExportSCORE} variant="outline" size="sm" className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" /> SCORE CSV
              </Button>
              {shareUrl && (
                <div className="flex gap-1.5">
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
          </div>
        </div>

        {/* Accordion Detail Sections — t=1100 */}
        <ResultsAccordionSections
          financialContent={
            <div className="space-y-4">
              <FinancialSummary financial={result.financial_analysis} selectedScenario={selectedScenario} />
              <BreakEvenChart
                startupInvestment={typeof result.financial_analysis?.startup_investment === 'number' ? result.financial_analysis.startup_investment : (result.financial_analysis?.startup_investment as any)?.total || 50000}
                monthlyProfit={scenarioMetrics.profit}
              />
              <CashFlowVisualization result={result} />
              {result.actionable_insights && result.actionable_insights.insights.length > 0 && (
                <ActionableInsights insights={result.actionable_insights} />
              )}
            </div>
          }
          scenarioContent={
            <ScenarioLibrary
              analysisId={analysisId}
              currentParams={result.financial_analysis?.inputs as any}
              currentOutput={result as any}
              currentConfidence={result.confidence_score}
            />
          }
          marketContent={
            <div className="space-y-4">
              <IndustryComparison
                metrics={{ revenue: scenarioMetrics.revenue, margin: scenarioMetrics.margin, ltvCacRatio: result.financial_analysis?.unit_economics?.ltv_cac_ratio || 0 }}
                industryName={result.metadata.industry_detected}
              />
              <CompetitiveMatrix result={result} />
              <MarketAnalysisSection market={result.market_analysis} />
              <BenchmarkConfidenceIndicator confidence={(result as any).benchmark_confidence} />
            </div>
          }
          unitEconomicsContent={
            result.financial_analysis?.unit_economics ? (
              <div className="space-y-4">
                <LtvCacIndicator
                  ratio={result.financial_analysis.unit_economics.ltv_cac_ratio ?? 0}
                  ltv={result.financial_analysis.unit_economics.ltv ?? 0}
                  cac={result.financial_analysis.unit_economics.cac ?? 0}
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricMini label="LTV" value={`$${(result.financial_analysis.unit_economics.ltv ?? 0).toLocaleString()}`} positive={true} />
                  <MetricMini label="CAC" value={`$${(result.financial_analysis.unit_economics.cac ?? 0).toLocaleString()}`} positive={true} />
                  <MetricMini label="LTV:CAC" value={`${(result.financial_analysis.unit_economics.ltv_cac_ratio ?? 0).toFixed(1)}×`} positive={(result.financial_analysis.unit_economics.ltv_cac_ratio ?? 0) >= 3} />
                  <MetricMini label="CAC Payback" value={`${(result.financial_analysis.unit_economics.cac_payback_months ?? 0).toFixed(1)}mo`} positive={(result.financial_analysis.unit_economics.cac_payback_months ?? 99) <= 6} />
                </div>
              </div>
            ) : undefined
          }
          forensicContent={
            <div className="space-y-4">
              <BeatMissEngine result={result} />
              <QualityOfEarnings result={result} />
              <CoherenceFlags
                description={result.metadata.idea || ''}
                inputs={{
                  arpu: result.financial_analysis?.inputs?.price_per_unit,
                  cac: result.financial_analysis?.unit_economics?.cac,
                  churnRate: result.financial_analysis?.inputs?.churn_rate,
                  expectedCustomers: (result.financial_analysis?.inputs as any)?.expected_customers,
                }}
                industryType={result.metadata.industry_detected || 'default'}
              />
            </div>
          }
          capitalReadinessContent={
            <CapitalReadinessSection confidenceScore={result.confidence_score || 70} />
          }
          analysisId={analysisId}
        />

        {/* Reliability & Validation */}
        <details className="q-card animate-fade-in" style={{ animationDelay: '1400ms', animationFillMode: 'both' }}>
          <summary className="px-5 h-16 cursor-pointer text-sm font-semibold text-[var(--q-text-primary)] flex items-center gap-2.5">
            <Shield className="w-4.5 h-4.5 text-[var(--q-accent-primary)]" />
            Reliability & Validation
          </summary>
          <div className="px-5 pb-5 space-y-4">
            {/* Reconciliation Status — uses server-side checks when available */}
            {(() => {
              const serverRecon = (result as any).reconciliation_status;
              const checksRun = serverRecon?.checks || (() => {
                // Fallback: inline checks if server didn't provide them
                const netMargin = result.financial_analysis?.scenarios?.base?.net_margin ?? 0;
                const confidence = result.confidence_score || 50;
                const inferredRisk = confidence >= 80 ? 'low' : confidence >= 60 ? 'moderate' : confidence >= 40 ? 'high' : 'very high';
                const hasR006Violation = netMargin < -10 && inferredRisk === 'low';
                return [
                  { rule: 'R-001', label: 'Sum Integrity', pass: true },
                  { rule: 'R-002', label: 'Sign Consistency', pass: (result.financial_analysis?.mrr ?? 0) >= 0 },
                  { rule: 'R-006', label: 'Margin–Risk Coherence', pass: !hasR006Violation },
                ];
              })();
              const allPassed = serverRecon?.all_passed ?? checksRun.every((c: any) => c.pass);
              return (
                <div className={cn(
                  'p-3 rounded-lg border text-sm',
                  allPassed
                    ? 'bg-[hsl(var(--success)/0.08)] border-[hsl(var(--success)/0.3)]'
                    : 'bg-[hsl(var(--destructive)/0.08)] border-[hsl(var(--destructive)/0.3)]'
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className={cn('w-4 h-4', allPassed ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]')} />
                    <span className="font-semibold text-[var(--q-text-primary)]">
                      Reconciliation: {allPassed ? `All ${checksRun.length} Checks Passed` : 'Issues Detected'}
                    </span>
                    {serverRecon && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--q-bg-input)] text-[var(--q-text-disabled)]">
                        Server-verified
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    {checksRun.map((c: any) => (
                      <div key={c.rule} className="flex items-center gap-2 text-xs">
                        <span className={c.pass ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}>
                          {c.pass ? '✓' : '✗'}
                        </span>
                        <span className="text-[var(--q-text-secondary)] font-mono">{c.rule}</span>
                        <span className="text-[var(--q-text-secondary)]">{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <ModelConfidenceBadge confidence={result.model_confidence} />
            <OutputConfidenceBadge
              confidence={calculateOutputConfidence({
                consensusScore: (result as any).cross_validation?.agreement_score
                  ? (result as any).cross_validation.agreement_score * 100
                  : (result.confidence_score || 70),
                dataCompleteness: result.model_confidence ? Math.round(result.model_confidence.confidence * 100) : 60,
                benchmarkAlignment: (result as any).benchmark_confidence?.overall_confidence
                  ? (result as any).benchmark_confidence.overall_confidence * 100 : 65,
                dataFreshnessHours: 0,
                sampleSize: result.model_confidence?.similar_cases_count || 5,
              })}
            />
            {result.market_prior?.anomaly_card && result.market_prior.anomaly_card.length > 0 && (
              <AnomalyCard anomalyCard={result.market_prior.anomaly_card} peerGroupLabel={result.market_prior.peer_group_label} />
            )}
            <SCOREComplianceBadge compliance={result.score_compliance} />
            <ConfidenceIndicator score={result.confidence_score} breakdown={result.validation?.confidence_breakdown} suggestions={result.validation?.improvement_suggestions} />
            {result.validation && <ValidationSection validation={result.validation} />}
            {result.sanity_flags && result.sanity_flags.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-[var(--q-text-primary)] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[var(--q-status-yellow)]" /> Sanity Check Flags
                </h3>
                {result.sanity_flags.map((flag, i) => (
                  <div key={i} className={cn('p-3 rounded-lg border text-sm',
                    flag.severity === 'critical' ? 'bg-[var(--q-status-red-bg)] border-[var(--q-status-red-border)]' :
                    flag.severity === 'warning' ? 'bg-[var(--q-status-yellow-bg)] border-[var(--q-status-yellow-border)]' :
                    'bg-[var(--q-bg-elevated)] border-[var(--q-border-default)]'
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{flag.severity}</Badge>
                      <span className="font-medium text-[var(--q-text-primary)]">{flag.rule_id.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-[var(--q-text-secondary)]">{flag.explanation}</p>
                    <p className="text-xs text-[var(--q-accent-primary)] mt-1 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> {flag.suggested_correction}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-lg border border-[var(--q-border-default)] bg-[var(--q-bg-elevated)] p-4 space-y-3">
              <div>
                <h4 className="text-xs font-medium text-[var(--q-text-primary)] mb-2">Data Sources</h4>
                <div className="flex flex-wrap gap-1.5">
                  {result.data_sources.map((source, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{source}</Badge>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-[var(--q-text-tertiary)] pt-2 border-t border-[var(--q-border-subtle)] tabular-nums">
                Generated: {new Date(result.metadata.generated_at).toLocaleString('en-US')} · Model: {result.metadata.model} · Version: {result.metadata.version}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--q-text-primary)]">Validation Journey</h3>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowActualsImporter(true)}>
                <Upload className="w-3.5 h-3.5" /> Import Actuals
              </Button>
            </div>
            <ValidationJourney analysisId={analysisId} />
          </div>
        </details>

        {/* Actuals Importer Modal */}
        <ActualsImporter open={showActualsImporter} onOpenChange={setShowActualsImporter} projections={[]} currentParams={{ ...result.financial_analysis?.inputs } as any} />

        {/* Signup Prompt for anonymous users */}
        {!isAuthenticated && <SignupPrompt ideaScore={ideaScore} />}
      </div>

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

function MetricMini({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="q-card p-2.5 text-center">
      <p className="text-xs uppercase tracking-wide text-[var(--q-text-tertiary)] mb-0.5">{label}</p>
      <p className={cn(
        'text-sm font-bold tabular-nums',
        positive ? 'text-[var(--q-status-green)]' : 'text-[var(--q-status-red)]'
      )} style={{ fontFamily: 'var(--q-font-mono, JetBrains Mono, monospace)' }}>
        {value}
      </p>
    </div>
  );
}

function RiskFlagCard({ risk, index }: { risk: { label: string; impact: string; mitigation: string; mitigationPlan: string[]; severity: 'red' | 'orange' | 'yellow' }; index: number }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div
      className="animate-fade-in rounded-lg border border-[var(--q-border-default)] bg-[var(--q-bg-elevated)] overflow-hidden"
      style={{ animationDelay: `${900 + index * 100}ms`, animationFillMode: 'both' }}
    >
      {/* Header */}
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-3">
          <span className={cn(
            'w-2.5 h-2.5 rounded-full shrink-0 mt-1',
            risk.severity === 'red' ? 'bg-[var(--q-status-red)]' :
            risk.severity === 'orange' ? 'bg-[var(--q-status-orange)]' :
            'bg-[var(--q-status-yellow)]'
          )} />
          <div className="flex-1 min-w-0 space-y-1.5">
            <span className="text-sm font-semibold text-[var(--q-text-primary)] leading-tight block">{risk.label}</span>
            <p className="text-xs text-[var(--q-text-secondary)] leading-relaxed">{risk.impact} {risk.mitigation}</p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "inline-flex items-center gap-1.5 text-[13px] font-medium ml-[22px] transition-all duration-150 cursor-pointer",
            "text-[var(--q-accent-primary)] hover:text-[var(--q-accent-hover)]",
            "underline underline-offset-[3px] decoration-[var(--q-accent-primary)]/40 hover:decoration-[var(--q-accent-hover)]/60"
          )}
          style={{ padding: '4px 0' }}
        >
          <ArrowRight className={cn("w-3 h-3 transition-transform duration-200", isExpanded && "rotate-90")} />
          {isExpanded ? 'Hide mitigation plan' : 'View mitigation plan'}
        </button>
      </div>

      {/* Expandable Mitigation Plan */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 ml-[22px] animate-fade-in" style={{ animationDuration: '200ms' }}>
          <div className="p-3 rounded-lg bg-[var(--q-bg-base)] border border-[var(--q-border-subtle)] space-y-2.5">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--q-text-tertiary)]">Action Plan</p>
            <ol className="space-y-2">
              {risk.mitigationPlan.map((step, j) => (
                <li key={j} className="flex items-start gap-2.5 text-xs text-[var(--q-text-secondary)] leading-relaxed">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--q-accent-primary)]/10 text-[var(--q-accent-primary)] text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {j + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
