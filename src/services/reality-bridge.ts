/**
 * Reality Bridge — Compares actual business data against model projections
 * and recalibrates parameters based on real-world performance.
 */

import { QuantisMath } from '@/lib/quantis-math';

// ==================== TYPES ====================

export interface ActualsDataPoint {
  month: number;
  revenue: number;
  costs: number;
  customers: number;
  leads?: number;
  conversions?: number;
  churn?: number;
}

export interface ProjectionDataPoint {
  month: number;
  revenue: number;
  costs: number;
  customers: number;
}

export interface DivergenceItem {
  metric: string;
  projected: number;
  actual: number;
  pctDiff: number;
  severity: 'within_range' | 'notable' | 'significant' | 'critical';
}

export interface ParamUpdate {
  paramName: string;
  oldValue: number;
  newValue: number;
  rationale: string;
}

export interface ModelCalibrationResult {
  divergences: DivergenceItem[];
  suggestedParamUpdates: ParamUpdate[];
  modelAccuracyScore: number;
  recalibratedForecast: boolean;
  insights: string[];
}

export interface AnalysisParams {
  price_per_unit?: number;
  units_sold_monthly?: number;
  purchase_frequency?: number;
  cogs_per_unit?: number;
  fixed_opex?: number;
  marketing_budget?: number;
  cac?: number;
  churn_rate?: number;
  startup_investment?: number;
  [key: string]: number | undefined;
}

// ==================== HELPERS ====================

function classifySeverity(absPctDiff: number): DivergenceItem['severity'] {
  if (absPctDiff <= 10) return 'within_range';
  if (absPctDiff <= 25) return 'notable';
  if (absPctDiff <= 50) return 'significant';
  return 'critical';
}

function pctDiff(actual: number, projected: number): number {
  if (projected === 0) return actual === 0 ? 0 : 100;
  return QuantisMath.subtract(actual, projected).dividedBy(Math.abs(projected)).times(100).toNumber();
}

function sumValues(arr: number[]): number {
  return arr.reduce((acc, v) => QuantisMath.add(acc, v).toNumber(), 0);
}

// ==================== CORE FUNCTIONS ====================

export function compareActualsToModel(
  actuals: ActualsDataPoint[],
  projections: ProjectionDataPoint[],
  currentParams: AnalysisParams
): ModelCalibrationResult {
  const divergences: DivergenceItem[] = [];
  const absDiffs: number[] = [];

  for (const actual of actuals) {
    const proj = projections.find(p => p.month === actual.month);
    if (!proj) continue;

    const metrics = [
      { metric: `Month ${actual.month} Revenue`, actual: actual.revenue, projected: proj.revenue },
      { metric: `Month ${actual.month} Costs`, actual: actual.costs, projected: proj.costs },
      { metric: `Month ${actual.month} Customers`, actual: actual.customers, projected: proj.customers },
    ];

    for (const m of metrics) {
      const diff = pctDiff(m.actual, m.projected);
      const absDiff = Math.abs(diff);
      absDiffs.push(absDiff);
      divergences.push({
        metric: m.metric,
        projected: m.projected,
        actual: m.actual,
        pctDiff: Math.round(diff * 10) / 10,
        severity: classifySeverity(absDiff),
      });
    }
  }

  const avgAbsDiff = absDiffs.length > 0
    ? sumValues(absDiffs) / absDiffs.length
    : 50;
  const modelAccuracyScore = Math.max(0, Math.min(100, Math.round(100 - avgAbsDiff)));

  const suggestedParamUpdates: ParamUpdate[] = [];

  // Implied growth rate
  if (actuals.length >= 2) {
    const sorted = [...actuals].sort((a, b) => a.month - b.month);
    const firstRev = sorted[0].revenue;
    const lastRev = sorted[sorted.length - 1].revenue;
    if (firstRev > 0) {
      const impliedMonthlyGrowth = QuantisMath.subtract(lastRev, firstRev)
        .dividedBy(firstRev)
        .dividedBy(sorted.length - 1)
        .times(100)
        .toNumber();
      suggestedParamUpdates.push({
        paramName: 'monthly_growth_rate',
        oldValue: 0,
        newValue: Math.round(impliedMonthlyGrowth * 10) / 10,
        rationale: `Revenue grew from $${firstRev.toLocaleString('en-US')} to $${lastRev.toLocaleString('en-US')} over ${sorted.length - 1} months`,
      });
    }
  }

  // Implied CAC
  const totalCosts = sumValues(actuals.map(a => a.costs));
  const totalCustomers = sumValues(actuals.map(a => a.customers));
  if (totalCustomers > 0) {
    const impliedCAC = QuantisMath.divide(totalCosts * 0.3, totalCustomers).toNumber();
    if (currentParams.cac && Math.abs(pctDiff(impliedCAC, currentParams.cac)) > 15) {
      suggestedParamUpdates.push({
        paramName: 'cac',
        oldValue: currentParams.cac,
        newValue: Math.round(impliedCAC),
        rationale: `Implied CAC from actual data differs from model`,
      });
    }
  }

  // Implied churn
  if (actuals.length >= 2) {
    const sorted = [...actuals].sort((a, b) => a.month - b.month);
    const churnRates: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i - 1].customers > 0) {
        const retained = Math.min(sorted[i].customers, sorted[i - 1].customers);
        const lost = sorted[i - 1].customers - retained;
        churnRates.push(lost / sorted[i - 1].customers);
      }
    }
    if (churnRates.length > 0) {
      const avgChurn = sumValues(churnRates) / churnRates.length;
      if (currentParams.churn_rate !== undefined && Math.abs(avgChurn - currentParams.churn_rate) > 0.02) {
        suggestedParamUpdates.push({
          paramName: 'churn_rate',
          oldValue: currentParams.churn_rate,
          newValue: Math.round(avgChurn * 1000) / 1000,
          rationale: `Actual monthly churn is ${(avgChurn * 100).toFixed(1)}% vs projected ${(currentParams.churn_rate * 100).toFixed(1)}%`,
        });
      }
    }
  }

  // Generate insights
  const insights: string[] = [];
  const criticalCount = divergences.filter(d => d.severity === 'critical').length;
  const withinRangeCount = divergences.filter(d => d.severity === 'within_range').length;

  if (modelAccuracyScore >= 85) {
    insights.push(`Your model is highly accurate (${modelAccuracyScore}%) — projections closely match reality.`);
  } else if (modelAccuracyScore >= 60) {
    insights.push(`Model accuracy is moderate (${modelAccuracyScore}%). Consider recalibrating key assumptions.`);
  } else {
    insights.push(`Model accuracy is low (${modelAccuracyScore}%). Significant recalibration is recommended.`);
  }

  if (criticalCount > 0) {
    insights.push(`${criticalCount} metric(s) show critical divergence (>50% off) — review those assumptions first.`);
  }

  if (withinRangeCount === divergences.length && divergences.length > 0) {
    insights.push('All metrics are within ±10% of projections — your model is well-calibrated.');
  }

  const revDivs = divergences.filter(d => d.metric.includes('Revenue'));
  const avgRevDiff = revDivs.length > 0
    ? revDivs.reduce((sum, d) => sum + d.pctDiff, 0) / revDivs.length
    : 0;
  if (avgRevDiff > 15) {
    insights.push('Revenue is consistently above projections — you may be underestimating demand.');
  } else if (avgRevDiff < -15) {
    insights.push('Revenue is consistently below projections — review pricing and customer acquisition.');
  }

  return {
    divergences,
    suggestedParamUpdates,
    modelAccuracyScore,
    recalibratedForecast: suggestedParamUpdates.length > 0,
    insights: insights.slice(0, 4),
  };
}

export function recalibrateParams(
  actuals: ActualsDataPoint[],
  currentParams: AnalysisParams
): AnalysisParams {
  const updated = { ...currentParams };
  if (actuals.length < 1) return updated;

  const sorted = [...actuals].sort((a, b) => a.month - b.month);

  const totalRev = sumValues(sorted.map(a => a.revenue));
  const totalCust = sumValues(sorted.map(a => a.customers));
  if (totalCust > 0) {
    updated.price_per_unit = Math.round(QuantisMath.divide(totalRev, totalCust).toNumber());
  }

  updated.units_sold_monthly = Math.round(totalCust / sorted.length);

  const totalCosts = sumValues(sorted.map(a => a.costs));
  updated.fixed_opex = Math.round(totalCosts / sorted.length);

  if (sorted.length >= 2) {
    const churnRates: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i - 1].customers > 0) {
        const retained = Math.min(sorted[i].customers, sorted[i - 1].customers);
        const lost = sorted[i - 1].customers - retained;
        churnRates.push(Math.max(0, lost / sorted[i - 1].customers));
      }
    }
    if (churnRates.length > 0) {
      updated.churn_rate = Math.round((sumValues(churnRates) / churnRates.length) * 1000) / 1000;
    }
  }

  const conversionsTotal = sumValues(sorted.filter(a => a.conversions).map(a => a.conversions!));
  if (conversionsTotal > 0 && totalCosts > 0) {
    const marketingShare = totalCosts * 0.25;
    updated.cac = Math.round(QuantisMath.divide(marketingShare, conversionsTotal).toNumber());
  }

  return updated;
}
