/**
 * SCENARIO ENGINE
 * 
 * Built-in scenario presets and comparison runner for stress-testing
 * business models via Monte Carlo simulation.
 * 
 * @module ScenarioEngine
 * @version 1.0.0
 */

import { runMonteCarlo, type MonteCarloParam } from '@/lib/monte-carlo';
import { QuantisMath } from '@/lib/quantis-math';

// ========== INTERFACES ==========

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  shocks: Record<string, { multiplier: number; absoluteChange?: number }>;
}

export interface ScenarioComparison {
  scenarioId: string;
  scenarioName: string;
  revenueMonth12: number;
  profitMonth12: number;
  cashRunwayMonths: number;
  breakEvenMonth: number | null;
  survivalProbability: number;
  confidenceScore: number;
}

export interface AnalysisParams {
  monthlyRevenue: number;
  monthlyCosts: number;
  cac: number;
  ltv: number;
  churnRate: number;
  conversionRate: number;
  trafficMonthly: number;
  marketingSpend: number;
  rent: number;
  startupInvestment: number;
  pricePerUnit: number;
  unitsSoldMonthly: number;
}

// ========== BUILT-IN SCENARIOS ==========

export const BUILT_IN_SCENARIOS: ScenarioPreset[] = [
  {
    id: 'recession',
    name: 'Recession',
    description: 'Economic downturn: revenue -30%, CAC +40%, conversion -25%',
    icon: '📉',
    shocks: {
      monthlyRevenue: { multiplier: 0.7 },
      cac: { multiplier: 1.4 },
      conversionRate: { multiplier: 0.75 },
    },
  },
  {
    id: 'rent_doubles',
    name: 'Rent Doubles',
    description: 'Unexpected rent increase of +100%',
    icon: '🏢',
    shocks: {
      rent: { multiplier: 2.0 },
    },
  },
  {
    id: 'ad_surge',
    name: 'Ad Surge',
    description: 'Aggressive marketing: spend +30%, traffic +20%, conversion +5%',
    icon: '📢',
    shocks: {
      marketingSpend: { multiplier: 1.3 },
      trafficMonthly: { multiplier: 1.2 },
      conversionRate: { multiplier: 1.05 },
    },
  },
  {
    id: 'slow_launch',
    name: 'Slow Launch',
    description: 'Sluggish start: traffic -50% for first 6 months',
    icon: '🐢',
    shocks: {
      trafficMonthly: { multiplier: 0.5 },
      unitsSoldMonthly: { multiplier: 0.5 },
    },
  },
  {
    id: 'best_case',
    name: 'Best Case',
    description: 'All positives +15%, all costs -10%',
    icon: '🚀',
    shocks: {
      monthlyRevenue: { multiplier: 1.15 },
      trafficMonthly: { multiplier: 1.15 },
      conversionRate: { multiplier: 1.15 },
      unitsSoldMonthly: { multiplier: 1.15 },
      monthlyCosts: { multiplier: 0.9 },
      cac: { multiplier: 0.9 },
      rent: { multiplier: 0.9 },
      marketingSpend: { multiplier: 0.9 },
    },
  },
  {
    id: 'worst_case',
    name: 'Worst Case',
    description: 'Revenue -40%, costs +25%, churn +30%',
    icon: '💀',
    shocks: {
      monthlyRevenue: { multiplier: 0.6 },
      unitsSoldMonthly: { multiplier: 0.6 },
      monthlyCosts: { multiplier: 1.25 },
      rent: { multiplier: 1.25 },
      churnRate: { multiplier: 1.3 },
    },
  },
  {
    id: 'competitor_entry',
    name: 'Competitor Entry',
    description: 'New competitor: traffic -20%, CAC +25%, conversion -15%',
    icon: '⚔️',
    shocks: {
      trafficMonthly: { multiplier: 0.8 },
      cac: { multiplier: 1.25 },
      conversionRate: { multiplier: 0.85 },
    },
  },
  {
    id: 'viral_moment',
    name: 'Viral Moment',
    description: 'Viral spike: traffic +200% peak, decaying to +40%',
    icon: '🔥',
    shocks: {
      trafficMonthly: { multiplier: 2.4 },
      unitsSoldMonthly: { multiplier: 1.8 },
      conversionRate: { multiplier: 1.1 },
    },
  },
];

// ========== FUNCTIONS ==========

/** Apply a scenario preset to base params, returning modified params */
export function applyScenario(baseParams: AnalysisParams, preset: ScenarioPreset): AnalysisParams {
  const result = { ...baseParams };
  
  for (const [key, shock] of Object.entries(preset.shocks)) {
    if (key in result) {
      const k = key as keyof AnalysisParams;
      let val = result[k] * shock.multiplier;
      if (shock.absoluteChange !== undefined) {
        val += shock.absoluteChange;
      }
      result[k] = QuantisMath.toNumber(QuantisMath.from(val), 2);
    }
  }
  
  return result;
}

/** Run scenario comparison across multiple presets using Monte Carlo */
export async function runScenarioComparison(
  base: AnalysisParams,
  scenarios: ScenarioPreset[]
): Promise<ScenarioComparison[]> {
  const results: ScenarioComparison[] = [];

  for (const scenario of scenarios) {
    const adjusted = applyScenario(base, scenario);

    // Build Monte Carlo params from the adjusted scenario
    const mcParams: MonteCarloParam[] = [
      {
        name: 'revenue',
        baseValue: adjusted.monthlyRevenue,
        minValue: adjusted.monthlyRevenue * 0.8,
        maxValue: adjusted.monthlyRevenue * 1.2,
        distribution: 'triangular',
      },
      {
        name: 'costs',
        baseValue: adjusted.monthlyCosts,
        minValue: adjusted.monthlyCosts * 0.9,
        maxValue: adjusted.monthlyCosts * 1.15,
        distribution: 'triangular',
      },
    ];

    const profitFn = (p: Record<string, number>) => p.revenue - p.costs;

    const mc = await runMonteCarlo({
      iterations: 1000,
      params: mcParams,
      outputFn: profitFn,
      seed: hashString(scenario.id),
    });

    // Month 12 projections with 2% monthly growth
    const growthFactor = Math.pow(1.02, 11); // 11 months of growth from month 1
    const revenueMonth12 = QuantisMath.toNumber(QuantisMath.multiply(adjusted.monthlyRevenue, growthFactor), 2);
    const profitMonth12 = QuantisMath.toNumber(QuantisMath.multiply(mc.median, growthFactor), 2);

    // Cash runway = investment / monthly burn (if burning)
    const monthlyBurn = mc.median < 0 ? Math.abs(mc.median) : 0;
    const cashRunwayMonths = monthlyBurn > 0
      ? QuantisMath.toNumber(QuantisMath.divide(adjusted.startupInvestment, monthlyBurn), 0)
      : 36; // 36 months = profitable

    // Break-even month estimate
    let breakEvenMonth: number | null = null;
    if (mc.median > 0) {
      const monthsToRecover = QuantisMath.toNumber(
        QuantisMath.divide(adjusted.startupInvestment, mc.median), 0
      );
      breakEvenMonth = Math.min(monthsToRecover, 36);
    }

    results.push({
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      revenueMonth12,
      profitMonth12,
      cashRunwayMonths: Math.min(cashRunwayMonths, 36),
      breakEvenMonth,
      survivalProbability: mc.probabilityPositive,
      confidenceScore: Math.round(mc.probabilityPositive * 0.7 + 30), // heuristic
    });
  }

  return results;
}

/** Simple string hash for deterministic seeds */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
