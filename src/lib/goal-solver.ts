/**
 * GOAL-INVERSE SOLVER
 * 
 * Reverse-projection engine: given a financial goal, calculates
 * what parameters are required to achieve it using iterative binary search.
 * All arithmetic via QMath for precision safety.
 * 
 * @module GoalSolver
 * @version 1.0.0
 */

import { QuantisMath } from './quantis-math';
import type { AnalysisParams } from '@/services/scenario-engine';

// ========== INTERFACES ==========

export interface GoalDefinition {
  type: 'monthly_profit' | 'cash_runway' | 'break_even' | 'revenue_target';
  targetValue: number;
  targetMonth: number;
}

export interface BenchmarkData {
  [paramName: string]: {
    median: number;
    p25: number;
    p75: number;
    p90: number;
    min: number;
    max: number;
  };
}

export interface SolverResult {
  feasible: boolean;
  requiredParams: Record<string, number>;
  benchmarkComparison: Record<string, {
    required: number;
    benchmarkMedian: number;
    benchmarkP75: number;
    difficulty: 'easy' | 'moderate' | 'hard' | 'unrealistic';
    pctAboveMedian: number;
  }>;
  overallFeasibilityScore: number;
  feasibilityLabel: string;
  narrative: string;
  suggestedAdjustments: {
    param: string;
    currentValue: number;
    suggestedValue: number;
    impact: string;
  }[];
}

// ========== GOAL OUTPUT FUNCTIONS ==========

/** Calculate the output metric for a given goal type */
function calculateGoalMetric(
  params: AnalysisParams,
  goalType: GoalDefinition['type'],
  targetMonth: number
): number {
  const growthFactor = Math.pow(1.02, targetMonth - 1);
  const revenue = QuantisMath.toNumber(QuantisMath.multiply(params.monthlyRevenue, growthFactor), 2);
  const costs = params.monthlyCosts;
  const profit = QuantisMath.toNumber(QuantisMath.subtract(revenue, costs), 2);

  switch (goalType) {
    case 'monthly_profit':
      return profit;
    case 'revenue_target':
      return revenue;
    case 'break_even': {
      // Find month where cumulative profit offsets startup investment
      let cumulative = -params.startupInvestment;
      for (let m = 1; m <= 36; m++) {
        const mRevenue = QuantisMath.toNumber(QuantisMath.multiply(params.monthlyRevenue, Math.pow(1.02, m - 1)), 2);
        cumulative = QuantisMath.toNumber(QuantisMath.add(cumulative, QuantisMath.subtract(mRevenue, costs)), 2);
        if (cumulative >= 0) return m;
      }
      return 999;
    }
    case 'cash_runway': {
      if (profit >= 0) return 36; // profitable = infinite runway (capped)
      return QuantisMath.toNumber(QuantisMath.divide(params.startupInvestment, Math.abs(profit)), 0);
    }
    default:
      return 0;
  }
}

/** Check if goal is met */
function isGoalMet(metric: number, goal: GoalDefinition): boolean {
  switch (goal.type) {
    case 'monthly_profit':
    case 'revenue_target':
      return metric >= goal.targetValue;
    case 'break_even':
      return metric <= goal.targetValue; // break-even month <= target month
    case 'cash_runway':
      return metric >= goal.targetValue; // runway months >= target
    default:
      return false;
  }
}

// ========== SOLVABLE PARAMETERS ==========

interface SolvableParam {
  key: keyof AnalysisParams;
  label: string;
  direction: 'increase' | 'decrease'; // which direction helps the goal
  stepPct: number; // step size as fraction
  maxSteps: number;
}

const REVENUE_LEVERS: SolvableParam[] = [
  { key: 'pricePerUnit', label: 'Price per Unit', direction: 'increase', stepPct: 0.01, maxSteps: 200 },
  { key: 'unitsSoldMonthly', label: 'Units Sold Monthly', direction: 'increase', stepPct: 0.01, maxSteps: 300 },
  { key: 'conversionRate', label: 'Conversion Rate', direction: 'increase', stepPct: 0.01, maxSteps: 200 },
  { key: 'trafficMonthly', label: 'Monthly Traffic', direction: 'increase', stepPct: 0.01, maxSteps: 300 },
  { key: 'monthlyCosts', label: 'Monthly Costs', direction: 'decrease', stepPct: 0.01, maxSteps: 80 },
  { key: 'cac', label: 'Customer Acquisition Cost', direction: 'decrease', stepPct: 0.01, maxSteps: 80 },
];

/** Binary search for the minimum param value that meets the goal */
function binarySearchParam(
  baseParams: AnalysisParams,
  lever: SolvableParam,
  goal: GoalDefinition
): number | null {
  const original = baseParams[lever.key];
  if (original === 0) return null;

  // Define search bounds
  let lo: number, hi: number;
  if (lever.direction === 'increase') {
    lo = original;
    hi = original * (1 + lever.stepPct * lever.maxSteps);
  } else {
    lo = Math.max(0, original * (1 - lever.stepPct * lever.maxSteps));
    hi = original;
  }

  // Check if even the extreme value achieves the goal
  const extremeParams = { ...baseParams };
  extremeParams[lever.key] = lever.direction === 'increase' ? hi : lo;
  // Recalculate revenue if revenue-driving params change
  recalcDerivedParams(extremeParams);
  const extremeMetric = calculateGoalMetric(extremeParams, goal.type, goal.targetMonth);
  if (!isGoalMet(extremeMetric, goal)) return null; // Not feasible even at extreme

  // Binary search for minimum required value
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const testParams = { ...baseParams };
    testParams[lever.key] = mid;
    recalcDerivedParams(testParams);
    const metric = calculateGoalMetric(testParams, goal.type, goal.targetMonth);

    if (isGoalMet(metric, goal)) {
      if (lever.direction === 'increase') {
        hi = mid; // can achieve with less
      } else {
        lo = mid; // can achieve with higher cost
      }
    } else {
      if (lever.direction === 'increase') {
        lo = mid; // need more
      } else {
        hi = mid; // need lower cost
      }
    }

    if (Math.abs(hi - lo) < original * 0.001) break;
  }

  return QuantisMath.toNumber(
    QuantisMath.from(lever.direction === 'increase' ? hi : lo),
    2
  );
}

/** Recalculate derived params (revenue) when base params change */
function recalcDerivedParams(params: AnalysisParams): void {
  // Revenue = price * units (simplified model)
  params.monthlyRevenue = QuantisMath.toNumber(
    QuantisMath.multiply(params.pricePerUnit, params.unitsSoldMonthly),
    2
  );
}

// ========== BENCHMARK COMPARISON ==========

type Difficulty = 'easy' | 'moderate' | 'hard' | 'unrealistic';

function assessDifficulty(
  required: number,
  benchmark: BenchmarkData[string],
  direction: 'increase' | 'decrease'
): { difficulty: Difficulty; pctAboveMedian: number } {
  const { median, p75, p90 } = benchmark;

  // For 'decrease' params (costs), lower is harder — invert the comparison
  let pctAboveMedian: number;
  if (direction === 'increase') {
    pctAboveMedian = median > 0
      ? QuantisMath.toNumber(QuantisMath.percentage(QuantisMath.subtract(required, median), median), 1)
      : 0;
  } else {
    // For costs: being below median is good
    pctAboveMedian = median > 0
      ? QuantisMath.toNumber(QuantisMath.percentage(QuantisMath.subtract(median, required), median), 1)
      : 0;
  }

  let difficulty: Difficulty;
  if (direction === 'increase') {
    if (required <= median) difficulty = 'easy';
    else if (required <= p75) difficulty = 'moderate';
    else if (required <= p90) difficulty = 'hard';
    else difficulty = 'unrealistic';
  } else {
    // For decreasing params: below p25 is hard, below min is unrealistic
    if (required >= median) difficulty = 'easy';
    else if (required >= p75) difficulty = 'moderate'; // p75 for costs is lower
    else if (required >= p90) difficulty = 'hard';
    else difficulty = 'unrealistic';
  }

  return { difficulty, pctAboveMedian };
}

const DIFFICULTY_PENALTY: Record<Difficulty, number> = {
  easy: 0,
  moderate: 20,
  hard: 45,
  unrealistic: 80,
};

// ========== MAIN SOLVER ==========

export async function solveForGoal(
  currentParams: AnalysisParams,
  goal: GoalDefinition,
  benchmarks: BenchmarkData
): Promise<SolverResult> {
  // 1. Check if goal is already met
  recalcDerivedParams(currentParams);
  const currentMetric = calculateGoalMetric(currentParams, goal.type, goal.targetMonth);
  if (isGoalMet(currentMetric, goal)) {
    return {
      feasible: true,
      requiredParams: {},
      benchmarkComparison: {},
      overallFeasibilityScore: 100,
      feasibilityLabel: 'Already Achieved',
      narrative: `Your current parameters already meet this goal. Current value: ${formatMetric(currentMetric, goal.type)}.`,
      suggestedAdjustments: [],
    };
  }

  // 2. Find required values for each lever via binary search
  const solutions: {
    lever: SolvableParam;
    requiredValue: number;
    originalValue: number;
  }[] = [];

  for (const lever of REVENUE_LEVERS) {
    const required = binarySearchParam(currentParams, lever, goal);
    if (required !== null) {
      solutions.push({
        lever,
        requiredValue: required,
        originalValue: currentParams[lever.key],
      });
    }
  }

  if (solutions.length === 0) {
    return {
      feasible: false,
      requiredParams: {},
      benchmarkComparison: {},
      overallFeasibilityScore: 0,
      feasibilityLabel: 'Unrealistic',
      narrative: `This goal of ${formatMetric(goal.targetValue, goal.type)} by month ${goal.targetMonth} is not achievable with reasonable parameter adjustments.`,
      suggestedAdjustments: [],
    };
  }

  // 3. Sort by smallest change required (most efficient levers first)
  solutions.sort((a, b) => {
    const changeA = Math.abs(a.requiredValue - a.originalValue) / Math.max(a.originalValue, 1);
    const changeB = Math.abs(b.requiredValue - b.originalValue) / Math.max(b.originalValue, 1);
    return changeA - changeB;
  });

  // Take top 3 most impactful
  const top3 = solutions.slice(0, 3);

  // 4. Build benchmark comparisons
  const requiredParams: Record<string, number> = {};
  const benchmarkComparison: SolverResult['benchmarkComparison'] = {};
  const suggestedAdjustments: SolverResult['suggestedAdjustments'] = [];
  const difficultyScores: number[] = [];

  for (const sol of top3) {
    const paramKey = sol.lever.key;
    requiredParams[paramKey] = sol.requiredValue;

    const bm = benchmarks[paramKey];
    if (bm) {
      const { difficulty, pctAboveMedian } = assessDifficulty(sol.requiredValue, bm, sol.lever.direction);
      benchmarkComparison[paramKey] = {
        required: sol.requiredValue,
        benchmarkMedian: bm.median,
        benchmarkP75: bm.p75,
        difficulty,
        pctAboveMedian,
      };
      difficultyScores.push(100 - DIFFICULTY_PENALTY[difficulty]);
    } else {
      // No benchmark data — assume moderate
      benchmarkComparison[paramKey] = {
        required: sol.requiredValue,
        benchmarkMedian: sol.originalValue,
        benchmarkP75: sol.originalValue * 1.3,
        difficulty: 'moderate',
        pctAboveMedian: 0,
      };
      difficultyScores.push(80);
    }

    const changePct = QuantisMath.toNumber(
      QuantisMath.percentage(
        QuantisMath.subtract(sol.requiredValue, sol.originalValue),
        Math.max(sol.originalValue, 1)
      ),
      1
    );

    suggestedAdjustments.push({
      param: sol.lever.label,
      currentValue: sol.originalValue,
      suggestedValue: sol.requiredValue,
      impact: `${changePct >= 0 ? '+' : ''}${changePct}% change needed`,
    });
  }

  // 5. Feasibility score
  const overallFeasibilityScore = difficultyScores.length > 0
    ? QuantisMath.toNumber(QuantisMath.mean(difficultyScores), 0)
    : 0;

  const feasibilityLabel = overallFeasibilityScore >= 80 ? 'Achievable'
    : overallFeasibilityScore >= 60 ? 'Stretch'
    : overallFeasibilityScore >= 40 ? 'Very Aggressive'
    : 'Unrealistic';

  const feasible = overallFeasibilityScore >= 30;

  // 6. Generate narrative
  const narrative = generateGoalNarrative(
    { feasible, requiredParams, benchmarkComparison, overallFeasibilityScore, feasibilityLabel, narrative: '', suggestedAdjustments },
    goal
  );

  return {
    feasible,
    requiredParams,
    benchmarkComparison,
    overallFeasibilityScore,
    feasibilityLabel,
    narrative,
    suggestedAdjustments,
  };
}

// ========== NARRATIVE GENERATOR ==========

function formatMetric(value: number, type: GoalDefinition['type']): string {
  switch (type) {
    case 'monthly_profit':
    case 'revenue_target':
      return `$${value.toLocaleString()}/month`;
    case 'break_even':
      return `month ${value}`;
    case 'cash_runway':
      return `${value} months`;
    default:
      return String(value);
  }
}

const GOAL_LABELS: Record<GoalDefinition['type'], string> = {
  monthly_profit: 'monthly profit',
  revenue_target: 'monthly revenue',
  break_even: 'break-even',
  cash_runway: 'cash runway',
};

export function generateGoalNarrative(result: SolverResult, goalDef: GoalDefinition): string {
  if (!result.feasible && result.overallFeasibilityScore === 0) {
    return `Reaching ${formatMetric(goalDef.targetValue, goalDef.type)} ${GOAL_LABELS[goalDef.type]} by month ${goalDef.targetMonth} is not feasible with current business model parameters.`;
  }

  const parts: string[] = [];
  parts.push(`To reach ${formatMetric(goalDef.targetValue, goalDef.type)} ${GOAL_LABELS[goalDef.type]} by month ${goalDef.targetMonth}`);

  const adjustments = result.suggestedAdjustments.slice(0, 2);
  if (adjustments.length > 0) {
    const paramDescriptions = adjustments.map(adj => {
      const bm = result.benchmarkComparison[Object.keys(result.requiredParams).find(k =>
        result.suggestedAdjustments.find(a => a.param === adj.param)
      ) || ''];

      let difficultyNote = '';
      if (bm) {
        switch (bm.difficulty) {
          case 'easy': difficultyNote = 'which is achievable'; break;
          case 'moderate': difficultyNote = 'which is a moderate stretch'; break;
          case 'hard': difficultyNote = `which is in the top ${Math.max(5, 100 - Math.abs(bm.pctAboveMedian))}% of similar businesses`; break;
          case 'unrealistic': difficultyNote = 'which is extremely aggressive'; break;
        }
      }

      return `${adj.param.toLowerCase()} of ${adj.suggestedValue.toLocaleString()} (${adj.impact})${difficultyNote ? ` — ${difficultyNote}` : ''}`;
    });

    parts.push(`, you need a ${paramDescriptions.join(', and a ')}.`);
  } else {
    parts.push('.');
  }

  parts.push(` Overall feasibility: ${result.feasibilityLabel} (${result.overallFeasibilityScore}/100).`);

  return parts.join('');
}
