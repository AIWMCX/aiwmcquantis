/**
 * UNIFIED REPORT SCHEMA — QuantisReport
 *
 * Canonical output schema for all Quantis reports.
 * v1 fields are always present; v2-only sections are optional.
 *
 * @module ReportSchema
 * @version 2.0.0
 */

import type {
  PLStatement,
  CashFlowStatement,
  UnitEconomicsResult,
} from '@/lib/financial-engine';
import type { ReconciliationReport } from '@/lib/reconciliation-engine';
import type {
  BusinessAnalysisResult,
  MarketAnalysis as MarketAnalysisType,
  ScenarioAnalysis,
} from '@/types/analysis';

// ─── Confidence ─────────────────────────────────────────────

export type ConfidenceTier = 'high' | 'medium' | 'low' | 'very_low';

export function confidenceTierFromScore(score: number): ConfidenceTier {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  if (score >= 40) return 'low';
  return 'very_low';
}

// ─── Report Metadata ────────────────────────────────────────

export interface BenchmarkVersionRef {
  parameter: string;
  version: number;
  source: string;
}

export interface GeoCalibrationRef {
  geoSlug: string;
  appliedCoefficients: Record<string, number>;
}

export interface DualModelConsensus {
  gptConfidence: number;
  geminiConfidence: number;
  consensusScore: number;
}

export interface ReportMetadata {
  engineVersion: string;
  benchmarkVersions: BenchmarkVersionRef[];
  geoCalibration: GeoCalibrationRef;
  dualModelConsensus?: DualModelConsensus;
  overallConfidence: number;
  confidenceTier: ConfidenceTier;
  processingMs: number;
  reconciled: boolean;
  reconciliationNotes?: string;
}

// ─── Analysis Params ────────────────────────────────────────

export interface AnalysisParams {
  idea: string;
  location: string;
  industry?: string;
  financialInputs?: Record<string, number>;
}

// ─── Executive Summary ──────────────────────────────────────

export interface ExecutiveSummary {
  headline: string;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Very High';
  viabilityScore: number;
  keyFindings: string[];
  recommendation: string;
}

// ─── Financials Section ─────────────────────────────────────

export interface RevenueProjection {
  month: number;
  revenue: number;
}

export interface FinancialsSection {
  // v1 fields (always present)
  revenueProjections: RevenueProjection[];
  startupInvestment: number;
  monthlyExpenses: number;
  monthlyProfit: number;
  scenarios: ScenarioAnalysis;

  // v2 additions (optional)
  plStatements?: PLStatement[];
  cashFlows?: CashFlowStatement[];
  unitEconomics?: UnitEconomicsResult;
  breakEvenMonth?: number;
  cashRunwayMonths?: number;
  roi?: number;
  paybackPeriodMonths?: number;
}

// ─── Risk Assessment ────────────────────────────────────────

export interface RiskAssessment {
  overallRisk: 'Low' | 'Moderate' | 'High' | 'Very High';
  topRisks: Array<{
    risk: string;
    probability: string;
    impact: string;
    mitigation: string;
  }>;
}

// ─── v2-only Sections ───────────────────────────────────────

export interface ScenariosSection {
  scenarioIds: string[];
  comparisonSummary?: string;
}

export interface ExplainabilitySection {
  assumptionGraph?: {
    nodes: Array<{ id: string; label: string; value: number; source: string; confidence: number }>;
    edges: Array<{ from: string; to: string; weight: number }>;
    criticalPath: Array<{ assumption: string; sensitivity: number; breakingThreshold: number; currentValue: number; direction: string; recommendation: string }>;
    fragility_score: number;
  };
  sanityFlags?: Array<{ rule_id: string; severity: string; explanation: string; suggested_correction: string }>;
}

export interface MonteCarloSection {
  iterations: number;
  p10: number;
  p50: number;
  p90: number;
  successProbability: number;
}

export interface ValidationStage {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
}

export interface SolverResult {
  targetMetric: string;
  targetValue: number;
  requiredInputs: Record<string, number>;
  feasible: boolean;
}

// ─── Main Report Interface ──────────────────────────────────

export interface QuantisReport {
  // Meta
  reportId: string;
  version: 'v1' | 'v2';
  generatedAt: string; // ISO string
  analysisParams: AnalysisParams;
  metadata: ReportMetadata;

  // Core sections (v1 + v2)
  executiveSummary: ExecutiveSummary;
  financials: FinancialsSection;
  marketAnalysis: MarketAnalysisType;
  riskAssessment: RiskAssessment;

  // v2-only sections (optional, undefined in v1)
  scenarios?: ScenariosSection;
  explainability?: ExplainabilitySection;
  monteCarlo?: MonteCarloSection;
  unitEconomics?: UnitEconomicsResult;
  reconciliation?: ReconciliationReport;
  goalSolver?: SolverResult;
  validationJourney?: ValidationStage[];
}

// ─── Type Guard ─────────────────────────────────────────────

export function isV2Report(report: QuantisReport): boolean {
  return report.version === 'v2';
}

// ─── Adapter ────────────────────────────────────────────────

export function mapBusinessAnalysisToReport(
  result: BusinessAnalysisResult,
  version: 'v1' | 'v2',
  options?: {
    reportId?: string;
    processingMs?: number;
    plStatements?: PLStatement[];
    cashFlows?: CashFlowStatement[];
    unitEconomicsResult?: UnitEconomicsResult;
    reconciliationReport?: ReconciliationReport;
  }
): QuantisReport {
  const fa = result.financial_analysis;
  const bp = result.business_plan;

  // Build revenue projections from scenarios or fallback
  const baseRevenue = fa.mrr ?? fa.monthly_revenue?.realistic ?? 0;
  const revenueProjections: RevenueProjection[] = Array.from({ length: 36 }, (_, i) => ({
    month: i + 1,
    revenue: baseRevenue * (1 + 0.03 * i), // simple growth estimate if no detailed data
  }));

  // Risk level mapping
  const riskLevel = mapRiskLevel(result);

  const report: QuantisReport = {
    reportId: options?.reportId ?? crypto.randomUUID(),
    version,
    generatedAt: new Date().toISOString(),
    analysisParams: {
      idea: result.metadata.idea,
      location: result.metadata.location,
      industry: result.metadata.industry_detected,
    },
    metadata: {
      engineVersion: result.metadata.version ?? '1.0.0',
      benchmarkVersions: [],
      geoCalibration: {
        geoSlug: result.metadata.location,
        appliedCoefficients: result.metadata.location_cost_multiplier
          ? { overall: result.metadata.location_cost_multiplier }
          : {},
      },
      overallConfidence: result.confidence_score,
      confidenceTier: confidenceTierFromScore(result.confidence_score),
      processingMs: options?.processingMs ?? 0,
      reconciled: false,
      reconciliationNotes: undefined,
    },
    executiveSummary: {
      headline: bp.executive_summary?.slice(0, 200) ?? '',
      riskLevel,
      viabilityScore: result.confidence_score,
      keyFindings: result.actionable_insights?.key_insights?.map(i =>
        typeof i === 'string' ? i : (i as { text?: string }).text ?? String(i)
      ) ?? [],
      recommendation: bp.executive_summary ?? '',
    },
    financials: {
      revenueProjections,
      startupInvestment: fa.startup_investment?.total ?? 0,
      monthlyExpenses: fa.monthly_expenses?.total ?? 0,
      monthlyProfit: fa.scenarios?.base?.net_profit ?? fa.monthly_profit ?? 0,
      scenarios: fa.scenarios ?? {
        pessimistic: { revenue: 0, variable_costs: 0, fixed_costs: 0, gross_profit: 0, net_profit: 0, gross_margin: 0, net_margin: 0 },
        base: { revenue: 0, variable_costs: 0, fixed_costs: 0, gross_profit: 0, net_profit: 0, gross_margin: 0, net_margin: 0 },
        optimistic: { revenue: 0, variable_costs: 0, fixed_costs: 0, gross_profit: 0, net_profit: 0, gross_margin: 0, net_margin: 0 },
      },
    },
    marketAnalysis: result.market_analysis,
    riskAssessment: {
      overallRisk: riskLevel,
      topRisks: bp.risks?.map(r => ({
        risk: r.risk,
        probability: r.probability,
        impact: r.impact,
        mitigation: r.mitigation,
      })) ?? [],
    },
  };

  // v2 enrichments
  if (version === 'v2') {
    if (options?.plStatements) {
      report.financials.plStatements = options.plStatements;
    }
    if (options?.cashFlows) {
      report.financials.cashFlows = options.cashFlows;
      const breakEven = options.cashFlows.find(cf => cf.breakEvenReached);
      if (breakEven) report.financials.breakEvenMonth = breakEven.month;
      const lastCf = options.cashFlows[options.cashFlows.length - 1];
      if (lastCf) report.financials.cashRunwayMonths = lastCf.cashRunwayMonths;
    }
    if (options?.unitEconomicsResult) {
      report.financials.unitEconomics = options.unitEconomicsResult;
      report.unitEconomics = options.unitEconomicsResult;
      report.financials.roi = options.unitEconomicsResult.ltvCacRatio;
      report.financials.paybackPeriodMonths = options.unitEconomicsResult.cacPaybackMonths;
    }
    if (options?.reconciliationReport) {
      report.reconciliation = options.reconciliationReport;
      report.metadata.reconciled = options.reconciliationReport.overallReconciled;
      report.metadata.reconciliationNotes = options.reconciliationReport.reconciliationNotes;
    }
    if (result.assumption_graph) {
      report.explainability = {
        assumptionGraph: result.assumption_graph,
        sanityFlags: result.sanity_flags,
      };
    }
  }

  return report;
}

// ─── Helpers ────────────────────────────────────────────────

function mapRiskLevel(result: BusinessAnalysisResult): 'Low' | 'Moderate' | 'High' | 'Very High' {
  const score = result.confidence_score;
  if (score >= 80) return 'Low';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'High';
  return 'Very High';
}
