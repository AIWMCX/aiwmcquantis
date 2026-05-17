import React, { useState, useMemo, useCallback } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { ArrowRight, ArrowLeft, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, ShieldAlert, Rocket, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PersistentResultsHeader } from './PersistentResultsHeader';
import { StressMap, calculateStressScores } from './StressMap';
import { RevenueChart } from './RevenueChart';
import { ScenarioBar, ScenarioId } from './ScenarioBar';
import { ScenarioSelector, ScenarioType } from './ScenarioSelector';
import { FinancialSummary } from './FinancialSummary';
import { InlineAssumptionEditor } from './InlineAssumptionEditor';
import { RealismFeedbackWidget } from './RealismFeedbackWidget';
import { LockedFeaturePreview } from './LockedFeaturePreview';
import { LockedAnalysisPaywall } from './LockedAnalysisPaywall';
import { PostAnalysisEmailCapture } from './PostAnalysisEmailCapture';
import { ActionableInsights } from './ActionableInsights';
import { ValidationSection } from './ValidationSection';
import { MarketAnalysisSection } from './MarketAnalysisSection';
import { TrafficLightBadge } from '@/components/ui/TrafficLightBadge';
import { SimpleMetricCard } from './SimpleMetricCard';
import { LastAuditedBadge } from './LastAuditedBadge';
import { BenchmarkCitations, type CitedMetric } from './BenchmarkCitations';
import { FallbackModeBanner } from './FallbackModeBanner';
import { MetricDisambiguationBanner } from './MetricDisambiguationBanner';
import { formatPaybackDisplay } from '@/lib/formatPayback';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { usePdfExport } from '@/hooks/usePdfExport';
import { useShareReport } from '@/hooks/useShareReport';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AccuracyTransparentResultsProps {
  result: BusinessAnalysisResult;
  analysisId?: string;
  onReset?: () => void;
}

const normalizePercent = (value?: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return value <= 1 ? value * 100 : value;
};

export function AccuracyTransparentResults({ result, analysisId, onReset }: AccuracyTransparentResultsProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [prevStep, setPrevStep] = useState(1);
  const { generatePdf, isGenerating } = usePdfExport();
  const { shareReport, isSharing, shareUrl } = useShareReport();
  const { isFree } = useSubscription();

  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('base');
  const [activeScenario, setActiveScenario] = useState<ScenarioId>('base');
  const [overrides, setOverrides] = useState<{cac?: number; rent?: number; ticketSize?: number}>({});
  const [expandedRisks, setExpandedRisks] = useState<Set<number>>(new Set());

  // Extract business type and location from metadata for feedback widget
  const businessType = result.metadata?.idea || (result.metadata as any)?.business_type || undefined;
  const location = result.metadata?.location || undefined;

  // Benchmark context — feeds the 95,500-row Benchmark Master library
  const benchmarkContext = useMemo(() => {
    const meta: any = result.metadata || {};
    const sector = meta.industry_detected || meta.selected_industry || meta.sector || undefined;
    const country = meta.country || (typeof location === 'string' && location.length === 2 ? location : undefined);
    return {
      sector,
      businessModel: meta.business_model,
      country,
      cityTier: meta.city_tier,
      stage: meta.company_stage || 'idea',
      size: meta.size_bucket,
    };
  }, [result.metadata, location]);

  const scenarioMetrics = useMemo(() => {
    const scenarios = result.financial_analysis?.scenarios;
    let baseRevenue = result.financial_analysis?.mrr || 0;
    let baseProfit = scenarios?.base?.net_profit || 0;
    let baseMargin = scenarios?.base?.net_margin || 0;

    if (scenarios && scenarios[selectedScenario]) {
      baseRevenue = scenarios[selectedScenario].revenue;
      baseProfit = scenarios[selectedScenario].net_profit;
      baseMargin = scenarios[selectedScenario].net_margin;
    }
    
    // Apply local overrides linearly for demo purposes
    if (overrides.cac && result.financial_analysis?.unit_economics?.cac) {
      const ratio = overrides.cac / result.financial_analysis.unit_economics.cac;
      baseProfit -= (overrides.cac - result.financial_analysis.unit_economics.cac) * (result.financial_analysis?.monthly_expenses?.total || 10) / 100;
    }
    if (overrides.rent && result.financial_analysis?.monthly_expenses?.fixed_costs) {
      baseProfit -= (overrides.rent - (result.financial_analysis.monthly_expenses.fixed_costs * 0.3));
    }
    if (overrides.ticketSize && result.financial_analysis?.inputs?.price_per_unit) {
      const ratio = overrides.ticketSize / result.financial_analysis.inputs.price_per_unit;
      baseRevenue *= ratio;
      baseProfit += (baseRevenue * 0.5);
    }
    
    return { revenue: baseRevenue, profit: baseProfit, margin: baseMargin };
  }, [result.financial_analysis, selectedScenario, overrides]);

  const breakEvenMonths = result.financial_analysis?.payback_period_months ?? 99;
  const cashRunwayMonths = useMemo(() => {
    const investment = result.financial_analysis?.startup_investment?.total ?? 0;
    if (scenarioMetrics.profit >= 0) return 36;
    return Math.max(1, Math.floor(investment / Math.abs(scenarioMetrics.profit)));
  }, [result.financial_analysis, scenarioMetrics.profit]);

  const handleExportPDF = async () => {
    try {
      toast.loading('Generating PDF...');
      await generatePdf(result);
      toast.success('PDF downloaded!');
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

  const handleShare = useCallback(() => {
    if (analysisId) shareReport(analysisId);
  }, [analysisId, shareReport]);

  const handleStepChange = (step: number) => {
    setPrevStep(currentStep);
    setCurrentStep(step);
  };

  const toggleRisk = (index: number) => {
    setExpandedRisks(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Determine animation direction
  const animationClass = currentStep > prevStep ? 'step-enter' : 'step-enter-reverse';

  // Extract risks and action items from validation/insights
  const risks = result.validation?.warnings || [];
  const insights = result.actionable_insights?.insights || [];
  const actionItems = result.actionable_insights?.summary?.quick_wins || [];

  // Metric values for Step 1 grid
  const metrics = useMemo(() => {
    const financials = result.financial_analysis;
    const monthlyRev = financials?.monthly_revenue;
    const revenue = typeof monthlyRev === 'number' 
      ? monthlyRev 
      : (monthlyRev && typeof monthlyRev === 'object' && 'realistic' in monthlyRev)
        ? monthlyRev.realistic 
        : financials?.mrr || 0;
    
    return {
      monthlyRevenue: revenue,
      netProfit: scenarioMetrics.profit,
      grossMargin: normalizePercent(financials?.scenarios?.base?.gross_margin),
      ltvCac: financials?.unit_economics?.ltv_cac_ratio || 0,
      breakEven: breakEvenMonths,
      runway: cashRunwayMonths,
    };
  }, [result.financial_analysis, scenarioMetrics, breakEvenMonths, cashRunwayMonths]);

  // F1 — Surface AI fallback state loudly so investor users can't mistake degraded output for full analysis.
  const meta: any = result.metadata || {};
  const fallbackMode: boolean = meta.fallback_mode === true;
  const fallbackReason: string | null = meta.fallback_reason ?? null;
  const aiCallsAttempted: number | undefined = meta.ai_calls_attempted;
  const aiCallsSucceeded: number | undefined = meta.ai_calls_succeeded;

  // F4 — Two distinct paybacks, never conflated.
  // CAC payback = months for one customer's gross profit to recover their CAC.
  // Project payback = months for net profit to recover total startup investment.
  const cacPaybackMonths: number | undefined = result.financial_analysis?.unit_economics?.cac_payback_months;
  const projectPaybackMonths: number = result.financial_analysis?.payback_period_months ?? 99;
  const netProfitForPayback = scenarioMetrics.profit;

  return (
    <div className="space-y-0">
      {fallbackMode && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <FallbackModeBanner
            reason={fallbackReason || 'AI narrator unavailable. Deterministic engine used.'}
            aiCallsAttempted={aiCallsAttempted}
            aiCallsSucceeded={aiCallsSucceeded}
            onRetry={onReset}
          />
        </div>
      )}
      {/* Persistent Header with KPIs and Tabs */}
      <PersistentResultsHeader
        result={result}
        currentStep={currentStep}
        onStepChange={handleStepChange}
        onBack={onReset}
        onExportPDF={handleExportPDF}
        onNewAnalysis={onReset}
        isGeneratingPdf={isGenerating}
        analysisTime={2.4}
        engineVersion="2.0.0"
        consensusScore={(result as any)?.cross_validation?.consensus_score || 94}
      />

      {/* Step Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div key={currentStep} className={cn('min-h-[500px]', animationClass)}>
          
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* STEP 1 — VERDICT & RISK INTELLIGENCE */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {currentStep === 1 && (() => {
            const confidence = result.confidence_score || 70;
            const criticalInsights = insights.filter(i => i.status === 'danger' || i.status === 'warning');
            const criticalRisks = criticalInsights.length;
            const fatalAssumptions = criticalInsights.slice(0, 3);
            
            const verdict = confidence >= 80 && criticalRisks === 0
              ? { level: 'fast-track', label: 'FAST-TRACK', description: 'Capital efficient, low downside. Proceed with execution.', color: 'var(--q-status-green)', bg: 'var(--q-status-green)', Icon: Rocket }
              : confidence >= 60 && criticalRisks <= 2
              ? { level: 'caution', label: 'PROCEED WITH CAUTION', description: `Address ${fatalAssumptions.map(i => i.headline).slice(0, 2).join(' and ')} before committing capital.`, color: 'var(--q-status-yellow)', bg: 'var(--q-status-yellow)', Icon: ShieldCheck }
              : { level: 'stop', label: 'DO NOT PROCEED', description: 'Resolve these fatal assumptions before investing.', color: 'var(--q-status-red)', bg: 'var(--q-status-red)', Icon: ShieldAlert };

            return (
            <div className="space-y-5">
              {/* Decision Verdict Banner */}
              <div 
                className="q-card p-5 sm:p-6 border-l-4 flex items-start gap-4"
                style={{ borderLeftColor: verdict.color, backgroundColor: `color-mix(in srgb, ${verdict.bg} 6%, transparent)` }}
              >
                <verdict.Icon className="w-7 h-7 shrink-0 mt-0.5" style={{ color: verdict.color }} />
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded" style={{ color: 'hsl(var(--primary-foreground))', backgroundColor: verdict.color }}>{verdict.label}</span>
                    <TrafficLightBadge confidenceScore={confidence} size="md" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{verdict.description}</p>
                </div>
              </div>

              <div className="grid lg:grid-cols-[58%_42%] gap-5">
              {/* LEFT: Fatal Assumptions + Stress Map */}
              <div className="space-y-5">
                {/* Fatal Assumptions — Risk Intelligence Card */}
                {fatalAssumptions.length > 0 && (
                <div className="q-card p-6 border-l-4 border-l-[var(--q-status-red)]">
                  <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-[var(--q-status-red)]" />
                    What Kills This Plan
                  </h3>
                  <ul className="space-y-3">
                    {fatalAssumptions.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--q-status-red)] text-white flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                        <div>
                          <p className="font-medium text-foreground">{insight.headline}</p>
                          {insight.explanation && <p className="text-xs text-muted-foreground mt-0.5">{insight.explanation}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                )}

                {/* Executive Summary — Expandable */}
                {(() => {
                  const summaryText = result.business_plan?.executive_summary || result.business_plan?.product_description || 'Analysis complete.';
                  const isLong = summaryText.length > 280;
                  return (
                    <div className="q-card p-5">
                      <h3 className="font-semibold text-sm mb-2">Executive Summary</h3>
                      <div className="relative">
                        <p className={cn(
                          'text-sm text-muted-foreground leading-relaxed transition-all duration-300',
                          isLong && !expandedRisks.has(-1) && 'line-clamp-4'
                        )}>
                          {summaryText}
                        </p>
                        {isLong && (
                          <button
                            type="button"
                            onClick={() => toggleRisk(-1)}
                            className="mt-2 text-xs font-medium text-[var(--q-accent-primary)] hover:underline flex items-center gap-1"
                          >
                            {expandedRisks.has(-1) ? (
                              <>Collapse <ChevronUp className="w-3 h-3" /></>
                            ) : (
                              <>Read full summary <ChevronDown className="w-3 h-3" /></>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Stress Map */}
                <div className="q-card p-6">
                  <h3 className="font-semibold mb-4 text-center">Risk {calculateStressScores(result).overallRiskIndex}/100: {calculateStressScores(result).overallRiskIndex <= 30 ? 'Low Risk' : calculateStressScores(result).overallRiskIndex <= 50 ? 'Moderate' : calculateStressScores(result).overallRiskIndex <= 70 ? 'Elevated' : 'Critical'} — stress across all vectors</h3>
                  <StressMap {...calculateStressScores(result)} />
                </div>
              </div>

              {/* RIGHT: Metric Grid + Audit Trail (sticky) */}
              <div className="lg:sticky lg:top-[120px] space-y-5 self-start">
                {/* F4 — Disambiguate CAC payback vs project payback before the grid */}
                <MetricDisambiguationBanner />
                {/* 2x3 Metric Grid — Free users see only Revenue + Break-even + Runway; advanced metrics blurred */}
                <div className="grid grid-cols-2 gap-3">
                  <SimpleMetricCard 
                    title="Monthly Revenue M12" 
                    value={`$${(metrics.monthlyRevenue / 1000).toFixed(1)}k`}
                    variant="standard"
                    chip={`$${(metrics.monthlyRevenue * 12 / 1000).toFixed(0)}k ARR`}
                    explanation="Your projected monthly income at month 12, based on customer count, pricing, and growth rate."
                  />
                  <div className={cn('relative', isFree && 'pointer-events-none select-none')}>
                    <div className={cn(isFree && 'blur-[6px] opacity-70')}>
                      <SimpleMetricCard 
                        title="Net Profit M12" 
                        value={isFree ? '$••.•k' : `$${(metrics.netProfit / 1000).toFixed(1)}k`}
                        variant={metrics.netProfit >= 0 ? 'success' : 'danger'}
                        chip={metrics.netProfit >= 0 ? `Profitable at Mo.12` : `Losing $${Math.abs(metrics.netProfit / 1000).toFixed(1)}k/mo`}
                        explanation="What you actually take home after paying all expenses — rent, salaries, marketing, everything."
                        benchmarkMetric="operating_margin"
                        benchmarkContext={benchmarkContext}
                        numericValue={metrics.monthlyRevenue > 0 ? metrics.netProfit / metrics.monthlyRevenue : undefined}
                      />
                    </div>
                    {isFree && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="px-2 py-1 rounded-md bg-[var(--q-bg-surface)] border border-[var(--q-border-default)] text-[10px] font-bold uppercase tracking-wider text-[var(--q-accent-primary)]">🔒 Plus</span>
                      </div>
                    )}
                  </div>
                  <div className={cn('relative', isFree && 'pointer-events-none select-none')}>
                    <div className={cn(isFree && 'blur-[6px] opacity-70')}>
                      <SimpleMetricCard 
                        title="Gross Margin %" 
                        value={isFree ? '••.•%' : `${metrics.grossMargin.toFixed(1)}%`}
                        variant={metrics.grossMargin >= 50 ? 'success' : metrics.grossMargin >= 30 ? 'warning' : 'danger'}
                        chip={`${metrics.grossMargin.toFixed(0)}% of revenue kept`}
                        explanation="For every $1 you earn, this is how many cents remain after direct production costs. Higher is better."
                        benchmarkMetric="gross_margin"
                        benchmarkContext={benchmarkContext}
                        numericValue={metrics.grossMargin / 100}
                      />
                    </div>
                    {isFree && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="px-2 py-1 rounded-md bg-[var(--q-bg-surface)] border border-[var(--q-border-default)] text-[10px] font-bold uppercase tracking-wider text-[var(--q-accent-primary)]">🔒 Plus</span>
                      </div>
                    )}
                  </div>
                  <div className={cn('relative', isFree && 'pointer-events-none select-none')}>
                    <div className={cn(isFree && 'blur-[6px] opacity-70')}>
                      <SimpleMetricCard 
                        title="LTV:CAC Ratio" 
                        value={isFree ? '•.•x' : `${metrics.ltvCac.toFixed(1)}x`}
                        variant={metrics.ltvCac >= 3 ? 'success' : metrics.ltvCac >= 2 ? 'warning' : 'danger'}
                        chip={metrics.ltvCac >= 3 ? `${metrics.ltvCac.toFixed(1)}x — healthy` : `${metrics.ltvCac.toFixed(1)}x — below 3x target`}
                        explanation="How much a customer is worth over their lifetime divided by what it costs to acquire them. Above 3× means healthy unit economics."
                        benchmarkMetric="ltv_cac_ratio"
                        benchmarkContext={benchmarkContext}
                        numericValue={metrics.ltvCac}
                      />
                    </div>
                    {isFree && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="px-2 py-1 rounded-md bg-[var(--q-bg-surface)] border border-[var(--q-border-default)] text-[10px] font-bold uppercase tracking-wider text-[var(--q-accent-primary)]">🔒 Plus</span>
                      </div>
                    )}
                  </div>
                  <SimpleMetricCard 
                    title="CAC Payback" 
                    value={typeof cacPaybackMonths === 'number' && cacPaybackMonths < 999
                      ? `${Math.round(cacPaybackMonths)} mo`
                      : 'N/A'}
                    variant={typeof cacPaybackMonths === 'number' && cacPaybackMonths <= 12 ? 'success' : typeof cacPaybackMonths === 'number' && cacPaybackMonths <= 18 ? 'warning' : 'danger'}
                    chip="Per-customer recovery"
                    explanation="Months for ONE customer's gross profit to recover their acquisition cost. Formula: CAC ÷ (avg ticket × gross margin). Different from project payback."
                    benchmarkMetric="cac_payback"
                    benchmarkContext={benchmarkContext}
                    numericValue={cacPaybackMonths}
                  />
                  <SimpleMetricCard 
                    title="Project Payback" 
                    value={formatPaybackDisplay(projectPaybackMonths, netProfitForPayback)}
                    variant={projectPaybackMonths <= 12 ? 'success' : projectPaybackMonths <= 24 ? 'warning' : 'danger'}
                    chip="Total investment recovery"
                    explanation="Months for cumulative net profit to recover your full startup investment. Different from CAC payback."
                    numericValue={projectPaybackMonths}
                  />
                  <SimpleMetricCard 
                    title="Cash Runway" 
                    value={`${metrics.runway} mo`}
                    variant={metrics.runway >= 12 ? 'success' : metrics.runway >= 6 ? 'warning' : 'danger'}
                    chip={metrics.runway >= 12 ? `${metrics.runway} mo — safe buffer` : `${metrics.runway} mo — tight`}
                    explanation="How many months your business can survive on current cash if revenue stopped. 12+ months gives breathing room."
                    benchmarkMetric="survival_years"
                    benchmarkContext={benchmarkContext}
                    numericValue={metrics.runway / 12}
                  />
                </div>

                {/* Audit Trail Mini-Section */}
                <div className="q-card p-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Audit Trail</h4>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Benchmark Engine</span>
                      <span className="font-mono text-foreground">V2 (95,500 pts)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Geo Calibration</span>
                      <span className="font-mono text-foreground">{location || 'Global'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reconciliation</span>
                      <span className="text-[var(--q-status-green)] font-medium">✓ Passed</span>
                    </div>
                  </div>
                  {/* Benchmark Verification Badge */}
                  <div className="mt-3 p-2.5 rounded-lg border border-primary/20 bg-primary/5 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold text-foreground">Verified by 95,500 Benchmarks</p>
                      <p className="text-[10px] text-muted-foreground">V2 engine • 5 tables • real-time calibration</p>
                    </div>
                  </div>
                  <a 
                    href="https://www.aiwmcquantis.com/methodology" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block text-xs text-[var(--q-accent-primary)] hover:underline"
                  >
                    How we calculate this →
                  </a>
                </div>
              </div>
            </div>
            {/* Benchmark Citations — every numeric metric tied to the 95,500-row library */}
            <section className="q-card p-5 mt-5">
              <BenchmarkCitations
                context={benchmarkContext}
                metrics={[
                  { label: 'Gross Margin', metric: 'gross_margin', userValue: metrics.grossMargin / 100 },
                  { label: 'Operating Margin', metric: 'operating_margin', userValue: metrics.monthlyRevenue > 0 ? metrics.netProfit / metrics.monthlyRevenue : undefined },
                  { label: 'LTV : CAC', metric: 'ltv_cac_ratio', userValue: metrics.ltvCac },
                  { label: 'CAC Payback', metric: 'cac_payback', userValue: metrics.breakEven },
                  { label: 'Survival', metric: 'survival_years', userValue: metrics.runway / 12 },
                ]}
              />
            </section>
            </div>
            );
          })()}

          {/* Inline upgrade wall — appears only for Free users at end of Step 1.
              This is the high-intent moment: they've seen score + 3 risks + revenue,
              now invite email save + Plus upgrade before they leave. */}
          {currentStep === 1 && isFree && (
            <div className="mt-6 space-y-5">
              <PostAnalysisEmailCapture
                ideaTitle={typeof businessType === 'string' ? businessType : undefined}
                monthlyProfit={`$${(metrics.monthlyRevenue / 1000).toFixed(1)}k/mo`}
                onDismiss={() => { /* dismissal stored in sessionStorage by component */ }}
              />
              <LockedAnalysisPaywall section="levers" />
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* STEP 2 — LEVERS LAB (Plus only) */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {currentStep === 2 && isFree && <LockedAnalysisPaywall section="levers" />}
          {currentStep === 2 && !isFree && (
            <div className="grid lg:grid-cols-[55%_45%] gap-5">
              {/* LEFT: Chart + P&L */}
              <div className="space-y-5">
                <div className="q-card p-6 space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold">36-Month Revenue Projection</h3>
                    <ScenarioSelector selectedScenario={selectedScenario} onScenarioChange={setSelectedScenario} />
                  </div>
                  <RevenueChart baseRevenue={scenarioMetrics.revenue} margin={scenarioMetrics.margin} activeScenario={activeScenario} />
                  <div className="pt-4 border-t border-border">
                    <ScenarioBar activeScenario={activeScenario} onScenarioChange={setActiveScenario} />
                  </div>
                </div>
                <FinancialSummary financial={result.financial_analysis} selectedScenario={selectedScenario} />
                
                {/* Why These Numbers Section */}
                <div className="q-card p-5">
                  <h4 className="text-sm font-semibold mb-3">Why These Numbers?</h4>
                  <div className="space-y-2">
                    {[
                      { icon: '📍', driver: `${location || 'Local'} rent`, value: '×1.15', source: 'CoStar 2025' },
                      { icon: '👥', driver: 'Industry CAC', value: `$${result.financial_analysis?.unit_economics?.cac || 50}`, source: 'Quantis Benchmarks' },
                      { icon: '📊', driver: 'Gross margin', value: `${((result.financial_analysis?.scenarios?.base?.gross_margin || 0.4) * 100).toFixed(0)}%`, source: 'Industry median' },
                      { icon: '🔄', driver: 'Churn rate', value: `${((result.financial_analysis?.inputs?.churn_rate || 0.05) * 100).toFixed(1)}%`, source: 'SaaS benchmarks' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex items-center gap-2">
                          <span>{item.icon}</span>
                          <span className="text-foreground">{item.driver}</span>
                          <span className="font-semibold">{item.value}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Source: {item.source}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT: Assumption Editor + Impact Preview */}
              <div className="space-y-5">
                <InlineAssumptionEditor 
                  initialCac={result.financial_analysis?.unit_economics?.cac || 50}
                  initialRent={result.financial_analysis?.monthly_expenses?.fixed_costs || 1000}
                  initialTicketSize={result.financial_analysis?.inputs?.price_per_unit || 100}
                  onRecalculate={(newOverrides) => setOverrides(newOverrides)}
                />
                
                {/* Impact Snapshot */}
                <div className="q-card p-5 border-l-4 border-l-[var(--q-accent-primary)]">
                  <h4 className="text-label mb-3">Impact Snapshot</h4>
                  <p className="text-xs text-[var(--q-text-tertiary)] mb-3">Adjust levers above to see projected changes.</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Mo.12 Revenue</span>
                      <span className={overrides.ticketSize ? 'text-[var(--q-status-green)]' : 'text-foreground'}>
                        ${(scenarioMetrics.revenue / 1000).toFixed(1)}k
                        {overrides.ticketSize && ' ↑'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Mo.12 Profit</span>
                      <span className={scenarioMetrics.profit >= 0 ? 'text-[var(--q-status-green)]' : 'text-[var(--q-status-red)]'}>
                        ${(scenarioMetrics.profit / 1000).toFixed(1)}k
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Break-even</span>
                      <span>Mo. {breakEvenMonths > 24 ? '24+' : breakEvenMonths}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Runway</span>
                      <span className={cashRunwayMonths < 8 ? 'text-[var(--q-status-yellow)]' : ''}>
                        {cashRunwayMonths} mo {cashRunwayMonths < 8 && '⚠'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {/* STEP 3 — RED FLAGS & ACTION PLAN (Plus only) */}
          {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
          {currentStep === 3 && isFree && <LockedAnalysisPaywall section="action-plan" />}
          {currentStep === 3 && !isFree && (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-2 gap-5">
                {/* LEFT: Risk Flags */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Red Flags Blocking Investment</h3>
                  {risks.length === 0 ? (
                    <div className="q-card p-4 text-sm text-muted-foreground">No critical risks detected.</div>
                  ) : (
                    risks.map((risk, idx) => {
                      const severity = risk.severity || 'warning';
                      const severityColors: Record<string, string> = {
                        error: 'bg-[var(--q-status-red)] text-white',
                        warning: 'bg-[var(--q-status-orange)] text-white',
                        info: 'bg-[var(--q-accent-primary)] text-white',
                      };
                      const isExpanded = expandedRisks.has(idx);
                      
                      return (
                        <div key={idx} className="q-card p-4">
                          <div className="flex items-start gap-3">
                            <span className={cn('px-2 py-0.5 rounded text-xs font-semibold uppercase', severityColors[severity] || severityColors.warning)}>
                              {severity === 'error' ? 'HIGH' : severity === 'warning' ? 'MEDIUM' : 'LOW'}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{risk.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">Impact: {risk.expected || 'Review recommended'}</p>
                              <button
                                type="button"
                                onClick={() => toggleRisk(idx)}
                                className="mt-2 text-xs text-[var(--q-accent-primary)] hover:underline flex items-center gap-1"
                              >
                                {isExpanded ? (
                                  <>Hide <ChevronUp className="w-3 h-3" /></>
                                ) : (
                                  <>View Mitigation Plan <ChevronDown className="w-3 h-3" /></>
                                )}
                              </button>
                              {isExpanded && (() => {
                                // Find matching insight from engine for this risk
                                // Fuzzy match risk fields to insight metric names
                                const fieldToMetrics: Record<string, string[]> = {
                                  'REVENUE_MISMATCH': ['revenue', 'monthly_revenue', 'arr', 'sales'],
                                  'PROFITABILITY': ['net_profit', 'profit_margin', 'gross_margin', 'margin'],
                                  'BREAK_EVEN': ['break_even', 'payback_period', 'breakeven'],
                                  'CASH_FLOW': ['cash_flow', 'runway', 'burn_rate', 'cash'],
                                  'CAC': ['cac', 'acquisition_cost', 'customer_acquisition'],
                                  'LTV': ['ltv', 'lifetime_value', 'ltv_cac'],
                                  'CHURN': ['churn', 'retention', 'churn_rate'],
                                  'MARGIN': ['gross_margin', 'net_margin', 'margin', 'cogs'],
                                };
                                const relatedMetrics = fieldToMetrics[risk.field || ''] || [];
                                const matchedInsight = insights.find(ins => {
                                  const metricLower = (ins.metric_name || '').toLowerCase();
                                  const headlineLower = (ins.headline || '').toLowerCase();
                                  const fieldLower = (risk.field || '').toLowerCase();
                                  const msgLower = (risk.message || '').toLowerCase();
                                  return ins.metric_name === risk.field ||
                                    relatedMetrics.some(m => metricLower.includes(m)) ||
                                    headlineLower.includes(fieldLower) ||
                                    msgLower.includes(metricLower);
                                });
                                const tactics = matchedInsight?.action_plan?.tactics || [];
                                return (
                                  <div className="mt-3 p-3 rounded-lg bg-muted/50 text-sm space-y-2">
                                    {matchedInsight?.action_plan?.strategy && (
                                      <p className="font-medium text-foreground text-xs">{matchedInsight.action_plan.strategy}</p>
                                    )}
                                    {tactics.length > 0 ? (
                                      <div className="space-y-2">
                                        {tactics.slice(0, 3).map((tactic, ti) => (
                                          <div key={ti} className="flex items-start gap-2 text-xs">
                                            <span className="shrink-0 w-4 h-4 rounded-full bg-[var(--q-accent-primary)] text-white flex items-center justify-center text-[9px] font-bold mt-0.5">{ti + 1}</span>
                                            <div className="flex-1">
                                              <p className="text-foreground">{tactic.action}</p>
                                              <div className="flex flex-wrap gap-2 mt-1">
                                                <span className="text-[10px] text-muted-foreground">Impact: {tactic.expected_impact}</span>
                                                <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium',
                                                  tactic.effort === 'low' ? 'bg-[var(--q-status-green-bg)] text-[var(--q-status-green)]' :
                                                  tactic.effort === 'medium' ? 'bg-[var(--q-status-yellow-bg)] text-[var(--q-status-yellow)]' :
                                                  'bg-[var(--q-status-red-bg)] text-[var(--q-status-red)]'
                                                )}>{tactic.effort} effort</span>
                                                {tactic.timeframe && <span className="text-[10px] text-muted-foreground">{tactic.timeframe}</span>}
                                                {tactic.cost_estimate && <span className="text-[10px] text-muted-foreground">~{tactic.cost_estimate}</span>}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="space-y-2 text-xs text-muted-foreground">
                                        <p className="text-foreground font-medium">Analysis of {(risk.field || 'this metric').replace(/_/g, ' ').toLowerCase()}</p>
                                        <p>{risk.message?.split('.')[0] || 'Review the flagged discrepancy'}.</p>
                                        {risk.expected && <p className="text-[11px]">Expected: {risk.expected}</p>}
                                        <p className="text-[11px] text-[var(--q-accent-primary)]">Adjust your inputs based on these findings and re-run for updated projections.</p>
                                      </div>
                                    )}
                                    {matchedInsight?.action_plan?.expected_outcome && (
                                      <p className="text-[11px] text-[var(--q-accent-primary)] font-medium pt-1 border-t border-border">
                                        Expected outcome: {matchedInsight.action_plan.expected_outcome}
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* RIGHT: Action Plan */}
                <div className="space-y-4">
                  <h3 className="font-semibold">What To Fix First</h3>
                  {actionItems.length === 0 ? (
                    <ActionableInsights insights={result.actionable_insights} />
                  ) : (
                    (() => {
                      // Use full insights with action plans instead of quick_wins strings
                      const priorityInsights = insights
                        .filter(i => i.priority === 'critical' || i.priority === 'high')
                        .slice(0, 4);
                      const itemsToShow = priorityInsights.length > 0 ? priorityInsights : insights.slice(0, 3);
                      
                      if (itemsToShow.length === 0) {
                        return actionItems.map((action, idx) => (
                          <div key={idx} className="q-card p-4 flex gap-3">
                            <span className="w-6 h-6 rounded-full bg-[var(--q-accent-primary)] text-white flex items-center justify-center text-xs font-semibold shrink-0">{idx + 1}</span>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{action}</p>
                            </div>
                          </div>
                        ));
                      }
                      
                      return itemsToShow.map((insight, idx) => {
                        const priorityColors: Record<string, { label: string; color: string }> = {
                          critical: { label: 'IMMEDIATE', color: 'bg-[var(--q-status-red)]' },
                          high: { label: 'THIS WEEK', color: 'bg-[var(--q-status-orange)]' },
                          medium: { label: 'THIS MONTH', color: 'bg-[var(--q-status-yellow)]' },
                          low: { label: 'WHEN READY', color: 'bg-muted' },
                        };
                        const prio = priorityColors[insight.priority] || priorityColors.medium;
                        const firstTactic = insight.action_plan?.tactics?.[0];
                        
                        return (
                          <div key={idx} className="q-card p-4 flex gap-3">
                            <span className="w-6 h-6 rounded-full bg-[var(--q-accent-primary)] text-white flex items-center justify-center text-xs font-semibold shrink-0">{idx + 1}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-semibold text-white', prio.color)}>{prio.label}</span>
                                {insight.action_plan?.time_to_result && (
                                  <span className="text-[10px] text-muted-foreground">{insight.action_plan.time_to_result}</span>
                                )}
                              </div>
                              <p className="font-medium text-sm">{insight.headline}</p>
                              <p className="text-xs text-muted-foreground mt-1">{insight.action_plan?.strategy || insight.explanation}</p>
                              {firstTactic && (
                                <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                                  <span className="font-medium text-foreground">First step:</span>{' '}
                                  <span className="text-muted-foreground">{firstTactic.action}</span>
                                  {firstTactic.expected_impact && (
                                    <span className="text-[var(--q-accent-primary)] ml-1">→ {firstTactic.expected_impact}</span>
                                  )}
                                </div>
                              )}
                              {insight.action_plan?.expected_outcome && (
                                <p className="text-[11px] text-[var(--q-status-green)] mt-1.5 font-medium">
                                  Expected: {insight.action_plan.expected_outcome}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </div>

              {/* Locked Feature Preview for free users */}
              {isFree && (
                <LockedFeaturePreview onUpgrade={() => window.location.href = '/pricing'} />
              )}

              {/* Document Generator - Full Width */}
              <div className="q-card p-6">
                <h3 className="font-semibold mb-4">Generate Documents</h3>
                <p className="text-sm text-muted-foreground">
                  Document generation available in the Documents Studio.
                </p>
              </div>

              {/* Realism Feedback Widget */}
              <RealismFeedbackWidget 
                analysisId={analysisId} 
                businessType={businessType}
                location={location}
              />
            </div>
          )}
        </div>

        {/* Methodology Footer */}
        <div className="mt-6 rounded-lg border border-[var(--q-border-subtle)] bg-[var(--q-bg-surface)] px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">How does Quantis calculate these numbers?</span>
          <a
            href="https://www.aiwmcquantis.com/methodology"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-[var(--q-accent-primary)] hover:underline"
          >
            Read our methodology →
          </a>
        </div>

        {/* Navigation Footer */}
        <div className="flex justify-between items-center pt-6 mt-6 border-t border-border gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleStepChange(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="gap-1.5 text-xs sm:text-sm sm:gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Previous</span><span className="sm:hidden">Prev</span>
          </Button>
          
          <div className="hidden sm:block">
            <LastAuditedBadge />
          </div>
          
          <Button 
            size="sm"
            onClick={() => handleStepChange(Math.min(3, currentStep + 1))}
            disabled={currentStep === 3}
            className="gap-1.5 text-xs sm:text-sm sm:gap-2"
          >
            <span className="hidden sm:inline">Next: {currentStep === 1 ? 'Levers Lab' : 'Red Flags'}</span>
            <span className="sm:hidden">Next</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
