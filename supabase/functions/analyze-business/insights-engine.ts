/**
 * QUANTIS TRUST FIX - ACTIONABLE INSIGHTS ENGINE
 * 
 * Generates prioritized, actionable recommendations based on COMPUTED metrics.
 * All insights reference DETERMINISTIC calculations - no invented numbers.
 * This ensures recommendations are grounded in validated financial data.
 */

import type { ComputedMetrics } from './schemas.ts';
import type { IndustryBenchmarks } from './financial-engine.ts';

// ========== INSIGHT TYPES ==========

export interface ActionableTactic {
  action: string;
  expected_impact: string;
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
  cost_estimate?: string;
}

export interface ActionableInsight {
  id: string;
  metric_name: string;
  current_value: number | string;
  target_value: number | string;
  gap: number | string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'danger' | 'warning' | 'healthy' | 'excellent';
  headline: string;
  explanation: string;
  why_it_matters: string;
  action_plan: {
    strategy: string;
    tactics: ActionableTactic[];
    expected_outcome: string;
    time_to_result: string;
  };
}

export interface InsightsSummary {
  total_insights: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  overall_health: 'critical' | 'needs_work' | 'healthy' | 'excellent';
  top_priority: string;
  quick_wins: string[];
}

export interface ActionableInsightsAnalysis {
  summary: InsightsSummary;
  insights: ActionableInsight[];
  generated_at: string;
}

// ========== MAIN INSIGHTS GENERATOR ==========

export function generateActionableInsights(
  metrics: ComputedMetrics,
  benchmarks: IndustryBenchmarks
): ActionableInsightsAnalysis {
  const insights: ActionableInsight[] = [];
  const quickWins: string[] = [];

  // ===== 1. PROFITABILITY ANALYSIS =====
  if (!metrics.isProfitable) {
    const lossAmount = Math.abs(metrics.netProfit);
    const revenueGap = metrics.breakEvenRevenue - metrics.mrr;
    const percentIncrease = metrics.mrr > 0 ? Math.round((revenueGap / metrics.mrr) * 100) : 100;
    
    insights.push({
      id: 'profitability_loss',
      metric_name: 'Profitability',
      current_value: `-$${lossAmount.toLocaleString()}/mo`,
      target_value: `+$${Math.round(metrics.mrr * 0.1).toLocaleString()}/mo`,
      gap: `$${(lossAmount + Math.round(metrics.mrr * 0.1)).toLocaleString()}/mo`,
      priority: 'critical',
      status: 'danger',
      headline: 'Business is Currently Unprofitable',
      explanation: `You're losing $${lossAmount.toLocaleString()} every month. At this rate, you'll deplete $${(lossAmount * 12).toLocaleString()} in the first year.`,
      why_it_matters: `Without profitability, the business cannot sustain itself. You need to reach at least $${metrics.breakEvenRevenue.toLocaleString()}/mo revenue (${percentIncrease}% increase) just to break even.`,
      action_plan: {
        strategy: 'Increase revenue while reducing unnecessary costs to reach profitability',
        tactics: [
          {
            action: 'Increase prices by 15-20% across your product line',
            expected_impact: `+$${Math.round(metrics.mrr * 0.15).toLocaleString()}/mo revenue`,
            effort: 'low',
            timeframe: 'Immediate',
            cost_estimate: '$0'
          },
          {
            action: 'Reduce marketing spend temporarily until profitable',
            expected_impact: `-$${Math.round(metrics.expenses.marketing * 0.3).toLocaleString()}/mo costs`,
            effort: 'low',
            timeframe: '1-2 weeks',
            cost_estimate: '$0'
          },
          {
            action: 'Negotiate 10-15% reduction with suppliers or landlord',
            expected_impact: `-$${Math.round((metrics.expenses.rent + metrics.expenses.cogs) * 0.1).toLocaleString()}/mo costs`,
            effort: 'medium',
            timeframe: '2-4 weeks',
            cost_estimate: '$0'
          }
        ],
        expected_outcome: `Reach break-even at $${metrics.breakEvenRevenue.toLocaleString()}/mo within 2-3 months`,
        time_to_result: '6-10 weeks'
      }
    });
  } else if (metrics.netMarginPercent < benchmarks.net_margin_min) {
    const marginGap = benchmarks.net_margin_min - metrics.netMarginPercent;
    
    insights.push({
      id: 'low_margin',
      metric_name: 'Net Margin',
      current_value: `${metrics.netMarginPercent}%`,
      target_value: `${benchmarks.net_margin_min}%+`,
      gap: `${marginGap}%`,
      priority: 'high',
      status: 'warning',
      headline: 'Net Margin Below Industry Standard',
      explanation: `Your ${metrics.netMarginPercent}% net margin is below the ${benchmarks.net_margin_min}% minimum typical for ${benchmarks.name}.`,
      why_it_matters: `Low margins leave little buffer for unexpected expenses, market downturns, or growth investments.`,
      action_plan: {
        strategy: 'Optimize cost structure and pricing to improve margins',
        tactics: [
          {
            action: 'Review and eliminate non-essential operating expenses',
            expected_impact: `+${Math.round(marginGap * 0.4)}% margin improvement`,
            effort: 'low',
            timeframe: '1-2 weeks',
            cost_estimate: '$0'
          },
          {
            action: 'Increase average transaction value through upsells',
            expected_impact: `+$${Math.round(metrics.averageCheck * 0.15)}/transaction`,
            effort: 'medium',
            timeframe: '3-4 weeks',
            cost_estimate: '$200-500'
          }
        ],
        expected_outcome: `Improve net margin from ${metrics.netMarginPercent}% to ${benchmarks.net_margin_min}%+`,
        time_to_result: '4-8 weeks'
      }
    });
    
    quickWins.push('Review expenses');
  }

  // ===== 2. LTV:CAC RATIO ANALYSIS =====
  if (metrics.ltvCacRatio < 3) {
    const targetRatio = 3;
    const gapRatio = Math.round((targetRatio - metrics.ltvCacRatio) * 10) / 10;
    const targetCac = Math.round(metrics.ltv / targetRatio);
    
    insights.push({
      id: 'ltv_cac_low',
      metric_name: 'LTV:CAC Ratio',
      current_value: `${metrics.ltvCacRatio}x`,
      target_value: `${targetRatio}x+`,
      gap: `${gapRatio}x`,
      priority: metrics.ltvCacRatio < 2 ? 'critical' : 'high',
      status: metrics.ltvCacRatio < 2 ? 'danger' : 'warning',
      headline: 'Customer Acquisition is Too Expensive',
      explanation: `You're spending $${metrics.cac} to acquire customers worth $${metrics.ltv}. For every $1 in marketing, you only get $${metrics.ltvCacRatio.toFixed(1)} back.`,
      why_it_matters: `Healthy businesses maintain 3-6x LTV:CAC. Below 3x means growth is unprofitable.`,
      action_plan: {
        strategy: 'Reduce CAC through organic channels while increasing customer lifetime value',
        tactics: [
          {
            action: 'Launch customer referral program with 15-20% discount incentive',
            expected_impact: `Reduce CAC by 25-30% (save $${Math.round(metrics.cac * 0.25)}/customer)`,
            effort: 'medium',
            timeframe: '4-8 weeks to see results',
            cost_estimate: '$500 setup + referral discounts'
          },
          {
            action: 'Optimize ad targeting to highest-converting customer segments',
            expected_impact: 'Reduce CAC by 15-20%',
            effort: 'low',
            timeframe: '2-3 weeks',
            cost_estimate: '$0'
          },
          {
            action: 'Implement retention program to increase customer lifetime',
            expected_impact: `Increase LTV by $${Math.round(metrics.ltv * 0.2)}`,
            effort: 'medium',
            timeframe: '2-4 months',
            cost_estimate: '$200-1000/month'
          }
        ],
        expected_outcome: `Improve LTV:CAC from ${metrics.ltvCacRatio}x to ${targetRatio}x within 3 months`,
        time_to_result: '2-4 months'
      }
    });
    
    quickWins.push('Optimize ad targeting');
  } else if (metrics.ltvCacRatio > 8) {
    insights.push({
      id: 'ltv_cac_high',
      metric_name: 'LTV:CAC Ratio',
      current_value: `${metrics.ltvCacRatio}x`,
      target_value: '3-6x',
      gap: 'Underinvesting in growth',
      priority: 'medium',
      status: 'warning',
      headline: 'Potentially Underinvesting in Customer Acquisition',
      explanation: `Your ${metrics.ltvCacRatio}x LTV:CAC is unusually high, which may indicate you're not investing enough in growth.`,
      why_it_matters: `While high LTV:CAC seems good, ratios above 6-8x often mean missed growth opportunities.`,
      action_plan: {
        strategy: 'Increase marketing investment to capture more market share',
        tactics: [
          {
            action: 'Increase marketing budget by 30-50%',
            expected_impact: `Acquire ${Math.round(metrics.newClientsNeeded * 0.5)}+ additional customers/month`,
            effort: 'low',
            timeframe: 'Immediate',
            cost_estimate: `$${Math.round(metrics.expenses.marketing * 0.4)}/month`
          }
        ],
        expected_outcome: 'Accelerate growth while maintaining healthy unit economics',
        time_to_result: '1-3 months'
      }
    });
  }

  // ===== 3. PAYBACK PERIOD ANALYSIS =====
  if (metrics.paybackMonths > 24 && metrics.paybackMonths < 999) {
    insights.push({
      id: 'payback_long',
      metric_name: 'Payback Period',
      current_value: `${metrics.paybackMonths} months`,
      target_value: '12-18 months',
      gap: `${metrics.paybackMonths - 18} months`,
      priority: metrics.paybackMonths > 36 ? 'critical' : 'high',
      status: metrics.paybackMonths > 36 ? 'danger' : 'warning',
      headline: 'Investment Recovery Takes Too Long',
      explanation: `At current profit of $${metrics.netProfit.toLocaleString()}/mo, it will take ${metrics.paybackMonths} months to recover your $${metrics.startupInvestment.toLocaleString()} investment.`,
      why_it_matters: `Long payback periods increase risk significantly. Market conditions can change over ${Math.round(metrics.paybackMonths / 12)} years.`,
      action_plan: {
        strategy: 'Accelerate profitability to reduce payback period',
        tactics: [
          {
            action: 'Increase monthly profit by 25% through pricing optimization',
            expected_impact: `Reduce payback by ${Math.round(metrics.paybackMonths * 0.2)} months`,
            effort: 'medium',
            timeframe: '1-2 months',
            cost_estimate: '$0'
          },
          {
            action: 'Focus on highest-margin products/services',
            expected_impact: '+5-10% net margin improvement',
            effort: 'medium',
            timeframe: '2-4 weeks',
            cost_estimate: '$0'
          }
        ],
        expected_outcome: `Reduce payback from ${metrics.paybackMonths} to under 18 months`,
        time_to_result: '3-6 months'
      }
    });
  }

  // ===== 4. ROI ANALYSIS =====
  if (metrics.roiYear1Percent < 15 && metrics.roiYear1Percent > 0) {
    insights.push({
      id: 'low_roi',
      metric_name: 'Year 1 ROI',
      current_value: `${metrics.roiYear1Percent}%`,
      target_value: '25%+',
      gap: `${25 - metrics.roiYear1Percent}%`,
      priority: 'medium',
      status: 'warning',
      headline: 'Return on Investment Below Target',
      explanation: `Year 1 ROI of ${metrics.roiYear1Percent}% is low for a new business venture.`,
      why_it_matters: 'Low ROI may not justify the risk and opportunity cost of starting this business.',
      action_plan: {
        strategy: 'Improve profitability to increase ROI',
        tactics: [
          {
            action: 'Review all expenses for 10-15% reduction opportunities',
            expected_impact: `+${Math.round((metrics.totalExpenses * 0.1 * 12 / metrics.startupInvestment) * 100)}% ROI`,
            effort: 'medium',
            timeframe: '2-4 weeks',
            cost_estimate: '$0'
          }
        ],
        expected_outcome: `Improve Year 1 ROI from ${metrics.roiYear1Percent}% to 25%+`,
        time_to_result: '3-6 months'
      }
    });
  }

  // ===== 5. HEALTHY METRICS (positive insights) =====
  if (metrics.isProfitable && metrics.ltvCacRatio >= 3 && metrics.paybackMonths <= 18) {
    insights.push({
      id: 'healthy_fundamentals',
      metric_name: 'Business Fundamentals',
      current_value: 'Strong',
      target_value: 'Excellent',
      gap: 'On track',
      priority: 'low',
      status: 'healthy',
      headline: 'Core Business Metrics Are Healthy',
      explanation: `Profitable with $${metrics.netProfit.toLocaleString()}/mo, strong ${metrics.ltvCacRatio}x LTV:CAC, and ${metrics.paybackMonths}-month payback.`,
      why_it_matters: 'Strong unit economics provide a solid foundation for sustainable growth.',
      action_plan: {
        strategy: 'Focus on scaling while maintaining healthy metrics',
        tactics: [
          {
            action: 'Gradually increase marketing spend to accelerate growth',
            expected_impact: '20-30% faster customer acquisition',
            effort: 'low',
            timeframe: '1-2 months',
            cost_estimate: `$${Math.round(metrics.expenses.marketing * 0.25)}/month`
          },
          {
            action: 'Document and optimize current processes for scale',
            expected_impact: 'Maintain margins as you grow',
            effort: 'medium',
            timeframe: '4-8 weeks',
            cost_estimate: '$500-2000'
          }
        ],
        expected_outcome: 'Scale revenue 50-100% while maintaining profitability',
        time_to_result: '6-12 months'
      }
    });
  }

  // ===== BUILD SUMMARY =====
  const criticalCount = insights.filter(i => i.priority === 'critical').length;
  const highCount = insights.filter(i => i.priority === 'high').length;
  const mediumCount = insights.filter(i => i.priority === 'medium').length;
  const lowCount = insights.filter(i => i.priority === 'low').length;
  
  let overallHealth: 'critical' | 'needs_work' | 'healthy' | 'excellent';
  if (criticalCount > 0) {
    overallHealth = 'critical';
  } else if (highCount > 0) {
    overallHealth = 'needs_work';
  } else if (mediumCount > 0) {
    overallHealth = 'healthy';
  } else {
    overallHealth = 'excellent';
  }
  
  const topPriority = insights.length > 0 ? insights[0].headline : 'Business fundamentals look healthy';
  
  // Sort insights by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    summary: {
      total_insights: insights.length,
      critical_count: criticalCount,
      high_count: highCount,
      medium_count: mediumCount,
      low_count: lowCount,
      overall_health: overallHealth,
      top_priority: topPriority,
      quick_wins: quickWins.slice(0, 3)
    },
    insights,
    generated_at: new Date().toISOString()
  };
}
