/**
 * Reality Bridge — Compares actual business data against model projections
 * and recalibrates parameters based on real-world performance.
 */

import { QMath } from '@/lib/quantis-math';

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
  return QMath.sub(actual, projected).div(Math.abs(projected)).mul(100).toNumber();
}

// ==================== CORE FUNCTIONS ====================

export function compareActualsToModel(
  actuals: ActualsDataPoint[],
  projections: ProjectionDataPoint[],
  currentParams: AnalysisParams
): ModelCalibrationResult {
  const divergences: DivergenceItem[] = [];
  const absDiffs: number[] = [];

  // Compare each month across revenue, costs, customers
  for (const actual of actuals) {
    const proj = projections.find(p => p.month === actual.month);
    if (!proj) continue;

    const metrics: { metric: string; actual: number; projected: number }[] = [
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

  // Accuracy score: 100 - average absolute % difference, clamped [0, 100]
  const avgAbsDiff = absDiffs.length > 0
    ? QMath.sum(...absDiffs).div(absDiffs.length).toNumber()
    : 50;
  const modelAccuracyScore = Math.max(0, Math.min(100, Math.round(100 - avgAbsDiff)));

  // Suggest param updates based on actual trends
  const suggestedParamUpdates: ParamUpdate[] = [];

  // Implied growth rate from revenue trend
  if (actuals.length >= 2) {
    const sorted = [...actuals].sort((a, b) => a.month - b.month);
    const firstRev = sorted[0].revenue;
    const lastRev = sorted[sorted.length - 1].revenue;
    if (firstRev > 0) {
      const impliedMonthlyGrowth = QMath.sub(lastRev, firstRev)
        .div(firstRev)
        .div(sorted.length - 1)
        .mul(100)
        .toNumber();
      suggestedParamUpdates.push({
        paramName: 'monthly_growth_rate',
        oldValue: 0,
        newValue: Math.round(impliedMonthlyGrowth * 10) / 10,
        rationale: `Actual revenue grew from $${firstRev.toLocaleString()} to $${lastRev.toLocaleString()} over ${sorted.length - 1} months`,
      });
    }
  }

  // Implied CAC from total costs & customers
  const totalCosts = QMath.sum(...actuals.map(a => a.costs)).toNumber();
  const totalCustomers = QMath.sum(...actuals.map(a => a.customers)).toNumber();
  if (totalCustomers > 0) {
    const impliedCAC = QMath.div(totalCosts * 0.3, totalCustomers).toNumber(); // ~30% of costs as acquisition
    if (currentParams.cac && Math.abs(pctDiff(impliedCAC, currentParams.cac)) > 15) {
      suggestedParamUpdates.push({
        paramName: 'cac',
        oldValue: currentParams.cac,
        newValue: Math.round(impliedCAC),
        rationale: `Implied CAC from actual data (~30% of costs / customers) differs from model`,
      });
    }
  }

  // Implied churn from customer retention
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
      const avgChurn = QMath.sum(...churnRates).div(churnRates.length).toNumber();
      if (currentParams.churn_rate !== undefined && Math.abs(avgChurn - currentParams.churn_rate) > 0.02) {
        suggestedParamUpdates.push({
          paramName: 'churn_rate',
          oldValue: currentParams.churn_rate,
          newValue: Math.round(avgChurn * 1000) / 1000,
          rationale: `Actual average monthly churn is ${(avgChurn * 100).toFixed(1)}% vs projected ${(currentParams.churn_rate * 100).toFixed(1)}%`,
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
    insights.push('Revenue is consistently below projections — review pricing and customer acquisition strategy.');
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

  // Derive average revenue per customer → price_per_unit proxy
  const totalRev = QMath.sum(...sorted.map(a => a.revenue)).toNumber();
  const totalCust = QMath.sum(...sorted.map(a => a.customers)).toNumber();
  if (totalCust > 0) {
    updated.price_per_unit = Math.round(QMath.div(totalRev, totalCust).toNumber());
  }

  // Derive average monthly customers
  updated.units_sold_monthly = Math.round(totalCust / sorted.length);

  // Derive average costs → fixed_opex proxy
  const totalCosts = QMath.sum(...sorted.map(a => a.costs)).toNumber();
  updated.fixed_opex = Math.round(totalCosts / sorted.length);

  // Derive churn from retention
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
      updated.churn_rate = Math.round(QMath.sum(...churnRates).div(churnRates.length).toNumber() * 1000) / 1000;
    }
  }

  // Derive CAC if leads/conversions available
  const leadsTotal = QMath.sum(...sorted.filter(a => a.leads).map(a => a.leads!)).toNumber();
  const conversionsTotal = QMath.sum(...sorted.filter(a => a.conversions).map(a => a.conversions!)).toNumber();
  if (conversionsTotal > 0 && totalCosts > 0) {
    const marketingShare = totalCosts * 0.25;
    updated.cac = Math.round(QMath.div(marketingShare, conversionsTotal).toNumber());
  }

  return updated;
}
