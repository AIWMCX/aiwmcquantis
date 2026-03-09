import React, { useState, useMemo, useCallback } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResultsTopBar } from './ResultsTopBar';
import { ResultsHeroStrip } from './ResultsHeroStrip';
import { StressMap, calculateStressScores } from './StressMap';
import { RevenueChart } from './RevenueChart';
import { ScenarioBar, ScenarioId } from './ScenarioBar';
import { ScenarioSelector, ScenarioType } from './ScenarioSelector';
import { FinancialSummary } from './FinancialSummary';
import { InlineAssumptionEditor } from './InlineAssumptionEditor';
import { RealismFeedbackWidget } from './RealismFeedbackWidget';
import { ActionableInsights } from './ActionableInsights';
import { ValidationSection } from './ValidationSection';
import { MarketAnalysisSection } from './MarketAnalysisSection';
import { DualEngineBadge } from './DualEngineBadge';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { usePdfExport } from '@/hooks/usePdfExport';
import { useShareReport } from '@/hooks/useShareReport';
import { toast } from 'sonner';

interface AccuracyTransparentResultsProps {
  result: BusinessAnalysisResult;
  analysisId?: string;
  onReset?: () => void;
}

export function AccuracyTransparentResults({ result, analysisId, onReset }: AccuracyTransparentResultsProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const { generatePdf, isGenerating } = usePdfExport();
  const { shareReport, isSharing, shareUrl } = useShareReport();

  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('base');
  const [activeScenario, setActiveScenario] = useState<ScenarioId>('base');
  const [overrides, setOverrides] = useState<{cac?: number; rent?: number; ticketSize?: number}>({});

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
      baseProfit += (baseRevenue * 0.5); // Arbitrary margin expansion
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

  const steps = [
    { id: 1, title: 'Summary & Stress Map' },
    { id: 2, title: 'Financials & Assumptions' },
    { id: 3, title: 'Risks & Action Plan' }
  ];

  return (
    <div className="space-y-6">
      {/* Persistent Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 pt-4">
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
        
        <div className="mt-4">
          <ResultsHeroStrip
            breakEvenMonths={breakEvenMonths}
            month12Revenue={scenarioMetrics.revenue}
            cashRunwayMonths={cashRunwayMonths}
            ltvCacRatio={result.financial_analysis?.unit_economics?.ltv_cac_ratio ?? 0}
            confidenceScore={result.confidence_score || 70}
            netProfit={scenarioMetrics.profit}
          />
        </div>

        {/* Wizard Progress */}
        <div className="mt-6 flex items-center justify-between max-w-3xl mx-auto">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center relative z-10">
              <button 
                onClick={() => setCurrentStep(step.id)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  currentStep === step.id 
                    ? 'bg-primary text-primary-foreground' 
                    : currentStep > step.id 
                      ? 'bg-green-500/20 text-green-600' 
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {currentStep > step.id ? <CheckCircle2 className="w-5 h-5" /> : step.id}
              </button>
              <span className={`text-xs mt-2 font-medium ${currentStep === step.id ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step.title}
              </span>
            </div>
          ))}
          <div className="absolute left-0 right-0 top-4 h-[2px] bg-muted -z-10 max-w-[80%] mx-auto" />
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        {currentStep === 1 && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="q-card p-6 border-l-4 border-l-[var(--q-accent-primary)]">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <DualEngineBadge crossValidation={(result as any).cross_validation} />
                  Executive Summary
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {result.business_plan?.executive_summary || result.business_plan?.product_description || 'Analysis complete.'}
                </p>
              </div>
              <div className="q-card p-6">
                <MarketAnalysisSection market={result.market_analysis} />
              </div>
            </div>
            <div className="q-card p-6">
              <h3 className="font-semibold mb-4 text-center">Operational Stress Map</h3>
              <StressMap {...calculateStressScores(result)} />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
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
            </div>
            <div className="space-y-6">
              <InlineAssumptionEditor 
                initialCac={result.financial_analysis?.unit_economics?.cac_typical || 50}
                initialRent={result.financial_analysis?.monthly_expenses?.fixed_costs || 1000}
                initialTicketSize={result.financial_analysis?.unit_economics?.average_ticket || 100}
                onRecalculate={(newOverrides) => setOverrides(newOverrides)}
              />
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <ValidationSection validation={result.validation} />
              <ActionableInsights strategy={result.action_plan} />
            </div>
            <div className="space-y-6">
              <RealismFeedbackWidget analysisId={analysisId} />
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-6 border-t border-border">
        <Button 
          variant="outline" 
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </Button>
        <Button 
          onClick={() => setCurrentStep(prev => Math.min(3, prev + 1))}
          disabled={currentStep === 3}
          className="gap-2"
        >
          Next Step <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
