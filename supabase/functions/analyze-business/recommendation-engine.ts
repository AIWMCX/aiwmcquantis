/**
 * QUANTIS™ 2.0 - INTELLIGENT RECOMMENDATION ENGINE
 * 
 * Generates actionable, prioritized recommendations based on:
 * - Validation errors and warnings
 * - Financial health indicators
 * - Industry benchmarks
 * - Business model analysis
 * 
 * Features:
 * - Priority classification (immediate, short-term, long-term)
 * - Impact scoring (critical, high, medium, low)
 * - Specific action items with timelines
 * - Expected outcomes for each recommendation
 */

import type { 
  BulletproofValidationResult, 
  ValidationError, 
  AutoCorrection 
} from './bulletproof-validator.ts';

// ========== RECOMMENDATION TYPES ==========

export type RecommendationPriority = 'immediate' | 'short-term' | 'long-term';
export type RecommendationImpact = 'critical' | 'high' | 'medium' | 'low';
export type RecommendationCategory = 
  | 'data-quality'
  | 'profitability'
  | 'unit-economics'
  | 'cost-structure'
  | 'growth'
  | 'risk-mitigation';

export interface ActionItem {
  action: string;
  timeline: string;
  effort: 'low' | 'medium' | 'high';
  expectedImpact: string;
  costEstimate?: string;
  metric?: string;
}

export interface Recommendation {
  id: string;
  title: string;
  category: RecommendationCategory;
  priority: RecommendationPriority;
  impact: RecommendationImpact;
  
  // Problem description
  issue: string;
  currentState: string;
  targetState: string;
  
  // Why this matters
  whyItMatters: string;
  riskIfIgnored: string;
  
  // Action plan
  actions: ActionItem[];
  expectedOutcome: string;
  timeToResult: string;
  
  // Metrics to track
  successMetrics: string[];
  
  // Source of this recommendation
  triggeredBy: string;  // Which validation error/metric triggered this
}

export interface RecommendationPlan {
  summary: {
    totalRecommendations: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    overallHealth: 'critical' | 'needs-attention' | 'healthy' | 'excellent';
    topPriority: string;
    quickWins: string[];
  };
  
  priorities: {
    immediate: Recommendation[];
    shortTerm: Recommendation[];
    longTerm: Recommendation[];
  };
  
  actionPlan: {
    week1: string[];
    month1: string[];
    month3: string[];
    month6: string[];
  };
  
  generatedAt: string;
  version: string;
}

// ========== RECOMMENDATION TEMPLATES ==========

const RECOMMENDATION_TEMPLATES: Record<string, Partial<Recommendation>> = {
  UNPROFITABLE: {
    category: 'profitability',
    priority: 'immediate',
    impact: 'critical',
    whyItMatters: 'Without profitability, the business cannot sustain itself and will eventually fail.',
    riskIfIgnored: 'Business will deplete cash reserves and may need to close.',
    timeToResult: '4-8 weeks',
  },
  
  LTV_CAC_LOW: {
    category: 'unit-economics',
    priority: 'immediate',
    impact: 'critical',
    whyItMatters: 'Customer acquisition is unprofitable - you lose money on every customer.',
    riskIfIgnored: 'More marketing spend will accelerate losses rather than growth.',
    timeToResult: '2-4 months',
  },
  
  EXPENSE_MISMATCH: {
    category: 'data-quality',
    priority: 'immediate',
    impact: 'high',
    whyItMatters: 'Incorrect expense data leads to wrong profit calculations and decisions.',
    riskIfIgnored: 'Business decisions based on wrong numbers.',
    timeToResult: '1 day',
  },
  
  SALARY_TOO_HIGH: {
    category: 'cost-structure',
    priority: 'immediate',
    impact: 'critical',
    whyItMatters: 'Salary costs exceeding revenue means the business cannot survive.',
    riskIfIgnored: 'Cash runway will be extremely short - potential business failure.',
    timeToResult: '2-4 weeks',
  },
  
  PAYBACK_LONG: {
    category: 'risk-mitigation',
    priority: 'short-term',
    impact: 'high',
    whyItMatters: 'Long payback periods increase risk from market changes.',
    riskIfIgnored: 'Investment may become obsolete before recovering costs.',
    timeToResult: '2-4 months',
  },
  
  LOW_MARGIN: {
    category: 'profitability',
    priority: 'short-term',
    impact: 'medium',
    whyItMatters: 'Low margins leave no buffer for unexpected costs or investments.',
    riskIfIgnored: 'Any market disruption could push business into losses.',
    timeToResult: '4-8 weeks',
  },
  
  DATA_INCOMPLETE: {
    category: 'data-quality',
    priority: 'immediate',
    impact: 'medium',
    whyItMatters: 'Analysis accuracy depends on complete data.',
    riskIfIgnored: 'Recommendations may not match actual business situation.',
    timeToResult: 'Immediate',
  },
};

// ========== MAIN RECOMMENDATION GENERATOR ==========

export function generateRecommendations(
  validation: BulletproofValidationResult,
  industryBenchmarks?: {
    netMarginMin: number;
    netMarginMax: number;
    ltvCacMin: number;
    ltvCacMax: number;
  }
): RecommendationPlan {
  const recommendations: Recommendation[] = [];
  const quickWins: string[] = [];
  
  const { calculatedMetrics, errors, warnings, corrections, healthScores } = validation;
  
  // ===== 1. GENERATE RECOMMENDATIONS FROM ERRORS =====
  
  for (const error of errors) {
    const recommendation = generateRecommendationFromError(error, calculatedMetrics);
    if (recommendation) {
      recommendations.push(recommendation);
    }
  }
  
  // ===== 2. GENERATE RECOMMENDATIONS FROM WARNINGS =====
  
  for (const warning of warnings) {
    const recommendation = generateRecommendationFromWarning(warning, calculatedMetrics);
    if (recommendation) {
      recommendations.push(recommendation);
    }
  }
  
  // ===== 3. GENERATE RECOMMENDATIONS FROM CORRECTIONS =====
  
  if (corrections.length > 0) {
    recommendations.push({
      id: 'data_corrections',
      title: 'Fix Data Inconsistencies',
      category: 'data-quality',
      priority: 'immediate',
      impact: corrections.length > 2 ? 'high' : 'medium',
      issue: `${corrections.length} data inconsistencies were auto-corrected`,
      currentState: corrections.map(c => `${c.field}: $${c.original.toLocaleString()}`).join(', '),
      targetState: 'Consistent data that matches across all fields',
      whyItMatters: 'Analysis is only as good as the input data.',
      riskIfIgnored: 'Decisions based on corrected values may not match your actual situation.',
      actions: corrections.map(c => ({
        action: `Verify ${c.field}: Changed from $${c.original.toLocaleString()} to $${c.corrected.toLocaleString()}`,
        timeline: 'Today',
        effort: 'low' as const,
        expectedImpact: 'Accurate analysis',
      })),
      expectedOutcome: 'All data fields are accurate and consistent',
      timeToResult: 'Immediate',
      successMetrics: ['All corrections verified', 'No auto-corrections needed on next analysis'],
      triggeredBy: 'auto_corrections',
    });
    
    quickWins.push('Verify auto-corrected data values');
  }
  
  // ===== 4. GENERATE PROFITABILITY RECOMMENDATIONS =====
  
  if (calculatedMetrics.monthlyNetProfit <= 0) {
    const lossAmount = Math.abs(calculatedMetrics.monthlyNetProfit);
    const breakEvenGap = calculatedMetrics.reconciledExpenseTotal - calculatedMetrics.calculatedMRR;
    
    recommendations.push({
      id: 'reach_profitability',
      title: 'Reach Profitability',
      category: 'profitability',
      priority: 'immediate',
      impact: 'critical',
      issue: `Business loses $${lossAmount.toLocaleString()} per month`,
      currentState: `Monthly revenue: $${calculatedMetrics.calculatedMRR.toLocaleString()}, Expenses: $${calculatedMetrics.reconciledExpenseTotal.toLocaleString()}`,
      targetState: `Break-even at minimum, target 10%+ net margin`,
      whyItMatters: RECOMMENDATION_TEMPLATES.UNPROFITABLE.whyItMatters!,
      riskIfIgnored: RECOMMENDATION_TEMPLATES.UNPROFITABLE.riskIfIgnored!,
      actions: [
        {
          action: 'Increase prices by 15-20%',
          timeline: 'This week',
          effort: 'low',
          expectedImpact: `+$${Math.round(calculatedMetrics.calculatedMRR * 0.15).toLocaleString()}/mo`,
          costEstimate: '$0',
        },
        {
          action: 'Reduce marketing spend temporarily',
          timeline: '1-2 weeks',
          effort: 'low',
          expectedImpact: `Save $${Math.round(calculatedMetrics.reconciledExpenseTotal * 0.1).toLocaleString()}/mo`,
          costEstimate: '$0',
        },
        {
          action: 'Renegotiate with suppliers/vendors',
          timeline: '2-4 weeks',
          effort: 'medium',
          expectedImpact: 'Reduce COGS by 10-15%',
          costEstimate: '$0',
        },
        {
          action: 'Focus on highest-margin products/services',
          timeline: '2-4 weeks',
          effort: 'medium',
          expectedImpact: 'Improve gross margin by 5-10%',
          costEstimate: '$0',
        },
      ],
      expectedOutcome: `Reach break-even with revenue > $${calculatedMetrics.reconciledExpenseTotal.toLocaleString()}/mo`,
      timeToResult: '4-8 weeks',
      successMetrics: [
        'Monthly net profit > $0',
        'Net margin > 10%',
        'Positive cash flow',
      ],
      triggeredBy: 'negative_net_profit',
    });
  } else if (calculatedMetrics.netMarginPercent < (industryBenchmarks?.netMarginMin || 10)) {
    recommendations.push({
      id: 'improve_margins',
      title: 'Improve Profit Margins',
      category: 'profitability',
      priority: 'short-term',
      impact: 'medium',
      issue: `Net margin of ${calculatedMetrics.netMarginPercent}% is below industry minimum`,
      currentState: `Current margin: ${calculatedMetrics.netMarginPercent}%`,
      targetState: `Target: ${industryBenchmarks?.netMarginMin || 15}%+ net margin`,
      whyItMatters: RECOMMENDATION_TEMPLATES.LOW_MARGIN.whyItMatters!,
      riskIfIgnored: RECOMMENDATION_TEMPLATES.LOW_MARGIN.riskIfIgnored!,
      actions: [
        {
          action: 'Review and cut non-essential expenses',
          timeline: '1-2 weeks',
          effort: 'low',
          expectedImpact: '+2-5% margin improvement',
        },
        {
          action: 'Implement upsell strategies',
          timeline: '3-4 weeks',
          effort: 'medium',
          expectedImpact: '+10-20% revenue per customer',
        },
      ],
      expectedOutcome: `Improve margin to ${industryBenchmarks?.netMarginMin || 15}%+`,
      timeToResult: '4-8 weeks',
      successMetrics: ['Net margin > industry minimum', 'Monthly profit growth'],
      triggeredBy: 'low_net_margin',
    });
    
    quickWins.push('Review expenses for quick cuts');
  }
  
  // ===== 5. CALCULATE SUMMARY =====
  
  const criticalCount = recommendations.filter(r => r.impact === 'critical').length;
  const highCount = recommendations.filter(r => r.impact === 'high').length;
  const mediumCount = recommendations.filter(r => r.impact === 'medium').length;
  const lowCount = recommendations.filter(r => r.impact === 'low').length;
  
  let overallHealth: 'critical' | 'needs-attention' | 'healthy' | 'excellent';
  if (criticalCount > 0) {
    overallHealth = 'critical';
  } else if (highCount > 0 || healthScores.overallHealthScore < 60) {
    overallHealth = 'needs-attention';
  } else if (healthScores.overallHealthScore >= 85) {
    overallHealth = 'excellent';
  } else {
    overallHealth = 'healthy';
  }
  
  // Sort recommendations by priority and impact
  const sortedRecommendations = recommendations.sort((a, b) => {
    const priorityOrder = { immediate: 0, 'short-term': 1, 'long-term': 2 };
    const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    return impactOrder[a.impact] - impactOrder[b.impact];
  });
  
  // Build action plan timeline
  const actionPlan = {
    week1: sortedRecommendations
      .filter(r => r.priority === 'immediate')
      .flatMap(r => r.actions.slice(0, 2).map(a => a.action)),
    month1: sortedRecommendations
      .filter(r => r.priority === 'immediate' || r.priority === 'short-term')
      .flatMap(r => r.actions.map(a => a.action)),
    month3: sortedRecommendations
      .filter(r => r.priority === 'short-term')
      .map(r => r.expectedOutcome),
    month6: sortedRecommendations
      .filter(r => r.priority === 'long-term')
      .map(r => r.expectedOutcome),
  };
  
  return {
    summary: {
      totalRecommendations: recommendations.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      overallHealth,
      topPriority: sortedRecommendations[0]?.title || 'No immediate actions needed',
      quickWins: quickWins.slice(0, 3),
    },
    priorities: {
      immediate: sortedRecommendations.filter(r => r.priority === 'immediate'),
      shortTerm: sortedRecommendations.filter(r => r.priority === 'short-term'),
      longTerm: sortedRecommendations.filter(r => r.priority === 'long-term'),
    },
    actionPlan,
    generatedAt: new Date().toISOString(),
    version: '2.0.0',
  };
}

// ========== HELPER FUNCTIONS ==========

function generateRecommendationFromError(
  error: ValidationError,
  metrics: BulletproofValidationResult['calculatedMetrics']
): Recommendation | null {
  switch (error.code) {
    case 'REVENUE_MISMATCH':
      return {
        id: 'fix_revenue_data',
        title: 'Fix Revenue Data Mismatch',
        category: 'data-quality',
        priority: 'immediate',
        impact: 'high',
        issue: error.message,
        currentState: `Provided: $${error.originalValue}, Calculated: $${error.expectedValue}`,
        targetState: 'Revenue matches customer count × price',
        whyItMatters: 'Accurate revenue data is essential for profit calculations.',
        riskIfIgnored: 'All downstream calculations will be based on incorrect revenue.',
        actions: [
          {
            action: 'Verify paying customer count',
            timeline: 'Today',
            effort: 'low',
            expectedImpact: 'Accurate revenue calculation',
          },
          {
            action: 'Confirm unit price',
            timeline: 'Today',
            effort: 'low',
            expectedImpact: 'Revenue matches reality',
          },
        ],
        expectedOutcome: 'Revenue = Customers × Price (no mismatch)',
        timeToResult: 'Immediate',
        successMetrics: ['No revenue mismatch errors', 'Consistent financial data'],
        triggeredBy: error.code,
      };
      
    case 'EXPENSE_BREAKDOWN_MISMATCH':
      return {
        id: 'fix_expense_data',
        title: 'Fix Expense Breakdown Mismatch',
        category: 'data-quality',
        priority: 'immediate',
        impact: 'high',
        issue: error.message,
        currentState: `Line items: $${error.expectedValue}, Total: $${error.originalValue}`,
        targetState: 'Expense total matches sum of line items',
        whyItMatters: RECOMMENDATION_TEMPLATES.EXPENSE_MISMATCH.whyItMatters!,
        riskIfIgnored: RECOMMENDATION_TEMPLATES.EXPENSE_MISMATCH.riskIfIgnored!,
        actions: [
          {
            action: 'Review each expense line item for accuracy',
            timeline: 'Today',
            effort: 'low',
            expectedImpact: 'Correct expense breakdown',
          },
          {
            action: 'Update total to match sum or add missing categories',
            timeline: 'Today',
            effort: 'low',
            expectedImpact: 'Consistent expense data',
          },
        ],
        expectedOutcome: 'All expense line items sum to total',
        timeToResult: 'Immediate',
        successMetrics: ['No expense mismatch errors', 'Total = Sum of line items'],
        triggeredBy: error.code,
      };
      
    case 'UNSUSTAINABLE_SALARY_COSTS':
      return {
        id: 'fix_salary_structure',
        title: 'Restructure Unsustainable Salary Costs',
        category: 'cost-structure',
        priority: 'immediate',
        impact: 'critical',
        issue: error.message,
        currentState: `Salaries are ${error.originalValue}x revenue`,
        targetState: 'Salaries < 60% of revenue',
        whyItMatters: RECOMMENDATION_TEMPLATES.SALARY_TOO_HIGH.whyItMatters!,
        riskIfIgnored: RECOMMENDATION_TEMPLATES.SALARY_TOO_HIGH.riskIfIgnored!,
        actions: [
          {
            action: 'Convert key roles to equity compensation',
            timeline: '1-2 weeks',
            effort: 'medium',
            expectedImpact: 'Reduce cash salary costs by 30-50%',
          },
          {
            action: 'Reduce to essential roles only',
            timeline: '2-4 weeks',
            effort: 'high',
            expectedImpact: 'Cut salary costs significantly',
          },
          {
            action: 'Consider freelance/contract work vs full-time',
            timeline: '2-4 weeks',
            effort: 'medium',
            expectedImpact: 'Variable cost structure',
          },
        ],
        expectedOutcome: 'Salary costs sustainable relative to revenue',
        timeToResult: '2-4 weeks',
        successMetrics: ['Salary < 60% revenue', 'Positive net profit'],
        triggeredBy: error.code,
      };
      
    case 'LTV_CAC_BELOW_MINIMUM':
      return {
        id: 'fix_unit_economics',
        title: 'Fix Broken Unit Economics',
        category: 'unit-economics',
        priority: 'immediate',
        impact: 'critical',
        issue: error.message,
        currentState: `LTV:CAC ratio: ${error.originalValue}:1`,
        targetState: `LTV:CAC ratio: ${error.expectedValue}:1 or higher`,
        whyItMatters: RECOMMENDATION_TEMPLATES.LTV_CAC_LOW.whyItMatters!,
        riskIfIgnored: RECOMMENDATION_TEMPLATES.LTV_CAC_LOW.riskIfIgnored!,
        actions: [
          {
            action: 'Pause paid marketing immediately',
            timeline: 'Today',
            effort: 'low',
            expectedImpact: 'Stop losing money on acquisition',
          },
          {
            action: 'Launch customer referral program',
            timeline: '2-4 weeks',
            effort: 'medium',
            expectedImpact: 'Reduce CAC by 25-40%',
          },
          {
            action: 'Implement retention program to increase LTV',
            timeline: '4-8 weeks',
            effort: 'medium',
            expectedImpact: 'Increase LTV by 20-30%',
          },
          {
            action: 'Focus on organic/content marketing',
            timeline: '4-8 weeks',
            effort: 'high',
            expectedImpact: 'Long-term CAC reduction',
          },
        ],
        expectedOutcome: 'LTV:CAC ratio above 3:1',
        timeToResult: '2-4 months',
        successMetrics: ['LTV:CAC > 3:1', 'Profitable customer acquisition', 'Positive CAC payback < 12 months'],
        triggeredBy: error.code,
      };
      
    default:
      return null;
  }
}

function generateRecommendationFromWarning(
  warning: ValidationError,
  metrics: BulletproofValidationResult['calculatedMetrics']
): Recommendation | null {
  switch (warning.code) {
    case 'PAYBACK_TOO_LONG':
      return {
        id: 'reduce_payback',
        title: 'Reduce Investment Payback Period',
        category: 'risk-mitigation',
        priority: 'short-term',
        impact: 'high',
        issue: warning.message,
        currentState: `Current payback: ${metrics.paybackPeriodMonths} months`,
        targetState: 'Payback within 24 months',
        whyItMatters: RECOMMENDATION_TEMPLATES.PAYBACK_LONG.whyItMatters!,
        riskIfIgnored: RECOMMENDATION_TEMPLATES.PAYBACK_LONG.riskIfIgnored!,
        actions: [
          {
            action: 'Increase monthly profit by 25% through pricing',
            timeline: '1-2 months',
            effort: 'medium',
            expectedImpact: `Reduce payback by ${Math.round((metrics.paybackPeriodMonths || 0) * 0.2)} months`,
          },
          {
            action: 'Focus on highest-margin products/services',
            timeline: '2-4 weeks',
            effort: 'medium',
            expectedImpact: 'Improve profit contribution',
          },
        ],
        expectedOutcome: 'Payback period under 24 months',
        timeToResult: '2-4 months',
        successMetrics: ['Payback < 24 months', 'Monthly profit growth'],
        triggeredBy: warning.code,
      };
      
    case 'HIGH_SALARY_RATIO':
      return {
        id: 'optimize_labor_costs',
        title: 'Optimize Labor Cost Ratio',
        category: 'cost-structure',
        priority: 'short-term',
        impact: 'medium',
        issue: warning.message,
        currentState: 'Salaries consume too much revenue',
        targetState: 'Salaries < 40% of revenue',
        whyItMatters: 'High labor costs reduce margins and flexibility.',
        riskIfIgnored: 'Profits will remain squeezed.',
        actions: [
          {
            action: 'Automate repetitive tasks',
            timeline: '4-8 weeks',
            effort: 'medium',
            expectedImpact: 'Reduce labor hours by 20-30%',
          },
          {
            action: 'Outsource non-core functions',
            timeline: '4-8 weeks',
            effort: 'medium',
            expectedImpact: 'Convert fixed to variable costs',
          },
        ],
        expectedOutcome: 'Labor costs as % of revenue reduced',
        timeToResult: '2-3 months',
        successMetrics: ['Salary ratio < 40%', 'Improved net margin'],
        triggeredBy: warning.code,
      };
      
    case 'NO_REVENUE_DATA':
      return {
        id: 'add_revenue_data',
        title: 'Add Revenue Data for Accurate Analysis',
        category: 'data-quality',
        priority: 'immediate',
        impact: 'medium',
        issue: 'No revenue data provided for analysis',
        currentState: 'Missing revenue figures',
        targetState: 'Complete revenue data with customer metrics',
        whyItMatters: RECOMMENDATION_TEMPLATES.DATA_INCOMPLETE.whyItMatters!,
        riskIfIgnored: RECOMMENDATION_TEMPLATES.DATA_INCOMPLETE.riskIfIgnored!,
        actions: [
          {
            action: 'Add monthly revenue estimate',
            timeline: 'Today',
            effort: 'low',
            expectedImpact: 'Enable profitability analysis',
          },
          {
            action: 'Add customer count and pricing',
            timeline: 'Today',
            effort: 'low',
            expectedImpact: 'Enable unit economics analysis',
          },
        ],
        expectedOutcome: 'Complete financial picture for analysis',
        timeToResult: 'Immediate',
        successMetrics: ['Revenue data present', 'No missing data warnings'],
        triggeredBy: warning.code,
      };
      
    default:
      return null;
  }
}

// ========== QUICK WIN IDENTIFIER ==========

export function identifyQuickWins(
  recommendations: Recommendation[]
): string[] {
  const quickWins: string[] = [];
  
  for (const rec of recommendations) {
    for (const action of rec.actions) {
      if (action.effort === 'low' && 
          (action.timeline === 'Today' || action.timeline.includes('week'))) {
        quickWins.push(action.action);
      }
    }
  }
  
  return quickWins.slice(0, 5);
}

// ========== ACTION PLAN FORMATTER ==========

export function formatActionPlan(plan: RecommendationPlan): string {
  const lines: string[] = [];
  
  lines.push('# ACTION PLAN');
  lines.push('');
  
  if (plan.summary.criticalCount > 0) {
    lines.push('## ⛔ CRITICAL: Address Immediately');
    for (const rec of plan.priorities.immediate.filter(r => r.impact === 'critical')) {
      lines.push(`- **${rec.title}**: ${rec.issue}`);
      for (const action of rec.actions.slice(0, 2)) {
        lines.push(`  - ${action.action} (${action.timeline})`);
      }
    }
    lines.push('');
  }
  
  if (plan.priorities.immediate.length > 0) {
    lines.push('## 🎯 Week 1 Actions');
    for (const action of plan.actionPlan.week1.slice(0, 5)) {
      lines.push(`- ${action}`);
    }
    lines.push('');
  }
  
  if (plan.priorities.shortTerm.length > 0) {
    lines.push('## 📅 Month 1 Goals');
    for (const action of plan.actionPlan.month1.slice(0, 5)) {
      lines.push(`- ${action}`);
    }
    lines.push('');
  }
  
  if (plan.summary.quickWins.length > 0) {
    lines.push('## ⚡ Quick Wins');
    for (const win of plan.summary.quickWins) {
      lines.push(`- ${win}`);
    }
  }
  
  return lines.join('\n');
}
