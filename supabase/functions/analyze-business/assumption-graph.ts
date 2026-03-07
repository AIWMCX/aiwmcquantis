/**
 * ASSUMPTION GRAPH ENGINE
 * 
 * Models each analysis as a Directed Acyclic Graph (DAG) of assumptions.
 * Identifies the "Critical Path" — the top 3-5 assumptions that most break the model.
 */

import type { SensitivityResult, SensitivityVariable } from './sensitivity-analyzer.ts';

// ========== TYPES ==========

export interface AssumptionNode {
  id: string;
  label: string;
  value: number;
  source: 'user' | 'benchmark' | 'calculated';
  confidence: number; // 0-100
}

export interface AssumptionEdge {
  from: string;
  to: string;
  weight: number; // 0-1 strength of dependency
}

export interface CriticalPathItem {
  assumption: string;
  sensitivity: number;       // 0-1 from tornado
  breakingThreshold: number; // % change that flips profit to loss
  currentValue: number;
  direction: string;
  recommendation: string;
}

export interface AssumptionGraphResult {
  nodes: AssumptionNode[];
  edges: AssumptionEdge[];
  criticalPath: CriticalPathItem[];
  fragility_score: number; // 0-100 (100 = extremely fragile)
}

// ========== DEPENDENCY GRAPH DEFINITION ==========

const DEPENDENCY_EDGES: AssumptionEdge[] = [
  // LTV depends on churn, price, margin
  { from: 'churn', to: 'ltv', weight: 0.9 },
  { from: 'price', to: 'ltv', weight: 0.7 },
  { from: 'gross_margin', to: 'ltv', weight: 0.5 },
  
  // Revenue depends on price, customers
  { from: 'price', to: 'revenue', weight: 0.8 },
  { from: 'customers', to: 'revenue', weight: 0.8 },
  
  // Net profit depends on revenue, fixed costs, COGS
  { from: 'revenue', to: 'net_profit', weight: 1.0 },
  { from: 'fixed_costs', to: 'net_profit', weight: 0.7 },
  { from: 'cogs', to: 'net_profit', weight: 0.6 },
  
  // CAC affects marketing spend and unit economics
  { from: 'cac', to: 'net_profit', weight: 0.5 },
  { from: 'cac', to: 'ltv_cac_ratio', weight: 0.9 },
  { from: 'ltv', to: 'ltv_cac_ratio', weight: 0.9 },
  
  // Growth depends on market size and churn
  { from: 'market_size', to: 'growth', weight: 0.4 },
  { from: 'churn', to: 'growth', weight: 0.6 },
];

// Map tornado variable names to node IDs
const TORNADO_TO_NODE: Record<string, string> = {
  'Price (Avg Check)': 'price',
  'Customer Count': 'customers',
  'CAC': 'cac',
  'Churn Rate': 'churn',
  'COGS %': 'cogs',
  'Fixed Costs': 'fixed_costs',
};

// ========== MAIN FUNCTION ==========

interface MetricsInput {
  averageCheck: number;
  clientsActive: number;
  cac: number;
  churnRate: number;
  cogsPercent: number;
  fixedCosts: number;
  ltv: number;
  grossMarginPercent: number;
  netProfit: number;
  mrr: number;
  marketSize?: number;
}

export function computeAssumptionGraph(
  metrics: MetricsInput,
  sensitivity: SensitivityResult | undefined,
  benchmarkConfidence: number = 75
): AssumptionGraphResult {
  // Build nodes from metrics
  const nodes: AssumptionNode[] = [
    { id: 'price', label: 'Price (Avg Check)', value: metrics.averageCheck, source: 'user', confidence: 85 },
    { id: 'customers', label: 'Customer Count', value: metrics.clientsActive, source: 'calculated', confidence: 70 },
    { id: 'cac', label: 'Customer Acquisition Cost', value: metrics.cac, source: 'benchmark', confidence: benchmarkConfidence },
    { id: 'churn', label: 'Monthly Churn Rate', value: metrics.churnRate, source: 'benchmark', confidence: benchmarkConfidence * 0.9 },
    { id: 'cogs', label: 'COGS %', value: metrics.cogsPercent, source: 'benchmark', confidence: benchmarkConfidence },
    { id: 'fixed_costs', label: 'Fixed Costs', value: metrics.fixedCosts, source: 'calculated', confidence: 75 },
    { id: 'ltv', label: 'Customer Lifetime Value', value: metrics.ltv, source: 'calculated', confidence: 65 },
    { id: 'gross_margin', label: 'Gross Margin %', value: metrics.grossMarginPercent, source: 'calculated', confidence: 70 },
  ];

  // Build critical path from sensitivity data
  const criticalPath: CriticalPathItem[] = [];

  if (sensitivity?.tornado) {
    // Take top 5 most sensitive variables
    const topVars = sensitivity.tornado.slice(0, 5);

    for (const sv of topVars) {
      // Calculate breaking threshold: how much % change to flip profit to loss
      let breakingThreshold = 100; // default: very robust
      if (metrics.netProfit > 0) {
        // If profit drops to 0 at some swing, calculate that %
        const profitSwingPerPercent = sv.profitSwing / 40; // swing covers 40% range (-20 to +20)
        if (profitSwingPerPercent > 0) {
          breakingThreshold = Math.round((metrics.netProfit / profitSwingPerPercent) * 100) / 100;
          breakingThreshold = Math.min(breakingThreshold, 100);
        }
      }

      criticalPath.push({
        assumption: sv.variable,
        sensitivity: sv.sensitivity,
        breakingThreshold,
        currentValue: sv.baseValue,
        direction: sv.direction,
        recommendation: sv.recommendation,
      });
    }
  }

  // Calculate fragility score (0-100)
  // Higher = more fragile = small changes break the model
  let fragility_score = 0;
  if (criticalPath.length > 0) {
    // Average sensitivity of top-3 variables, weighted
    const top3 = criticalPath.slice(0, 3);
    const avgSensitivity = top3.reduce((sum, cp) => sum + cp.sensitivity, 0) / top3.length;
    
    // Low breaking threshold = fragile
    const minBreaking = Math.min(...top3.map(cp => cp.breakingThreshold));
    const breakingFactor = minBreaking < 10 ? 30 : minBreaking < 25 ? 20 : minBreaking < 50 ? 10 : 0;
    
    // Low benchmark confidence = more uncertain = fragile
    const confidencePenalty = benchmarkConfidence < 50 ? 15 : benchmarkConfidence < 70 ? 8 : 0;
    
    fragility_score = Math.min(100, Math.round(
      avgSensitivity * 50 + breakingFactor + confidencePenalty
    ));
  }

  return {
    nodes,
    edges: DEPENDENCY_EDGES,
    criticalPath,
    fragility_score,
  };
}
