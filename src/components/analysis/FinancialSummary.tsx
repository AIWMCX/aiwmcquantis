import React, { useState, useCallback } from 'react';
import { TrendingUp, TrendingDown, Clock, Wallet, Target, BarChart3, Users, Percent, AlertTriangle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { breakEvenMonthsLabel, canonicalBreakEven } from '@/lib/break-even';
import { logger } from '@/lib/logger';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatPaybackDisplay } from '@/lib/formatPayback';
import type { FinancialAnalysis, ScenarioMetrics } from '@/types/analysis';
import type { ScenarioType } from './ScenarioSelector';

interface FinancialSummaryProps {
  financial: FinancialAnalysis;
  selectedScenario?: ScenarioType;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

// Copyable metric card component
function CopyableMetricCard({ 
  label, 
  value, 
  rawValue,
  subtext,
  icon: Icon, 
  color, 
  bgColor 
}: { 
  label: string; 
  value: string;
  rawValue: number | string;
  subtext?: string;
  icon: React.ElementType; 
  color: string; 
  bgColor: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(String(rawValue));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy:', err);
    }
  }, [rawValue]);

  return (
    <div className="group relative p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md", bgColor)}>
            <Icon className={cn("w-4 h-4", color)} />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                className={cn(
                  "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                  copied && "opacity-100"
                )}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {copied ? 'Copied!' : 'Copy value'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className={cn("text-xl font-bold", color)}>{value}</p>
      {subtext && (
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      )}
    </div>
  );
}

function ScenarioCard({ title, metrics, variant }: { title: string; metrics: ScenarioMetrics; variant: 'pessimistic' | 'base' | 'optimistic' }) {
  const colors = {
    pessimistic: 'border-orange-500/30 bg-orange-500/5',
    base: 'border-blue-500/30 bg-blue-500/5',
    optimistic: 'border-emerald-500/30 bg-emerald-500/5',
  };
  
  const textColors = {
    pessimistic: 'text-orange-600 dark:text-orange-400',
    base: 'text-blue-600 dark:text-blue-400',
    optimistic: 'text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div className={cn("p-4 rounded-lg border", colors[variant])}>
      <h4 className={cn("font-semibold mb-3", textColors[variant])}>{title}</h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Revenue:</span>
          <span className="font-medium">{formatCurrency(metrics.revenue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Gross Profit:</span>
          <span className="font-medium">{formatCurrency(metrics.gross_profit)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Operating Profit:</span>
          <span className={cn("font-bold", metrics.net_profit >= 0 ? "text-emerald-600" : "text-destructive")}>
            {formatCurrency(metrics.net_profit)}
          </span>
        </div>
        <div className="pt-2 border-t border-border/50">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gross Margin:</span>
            <span className="font-medium">{formatPercent(metrics.gross_margin)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Operating Margin:</span>
            <span className={cn("font-medium", metrics.net_margin >= 0 ? "text-emerald-600" : "text-destructive")}>
              {formatPercent(metrics.net_margin)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskCard({ scenario, description, profit, probability }: { 
  scenario: string; 
  description: string; 
  profit: number; 
  probability: string;
}) {
  const probColors: Record<string, string> = {
    'low': 'bg-emerald-500/10 text-emerald-600',
    'medium': 'bg-amber-500/10 text-amber-600',
    'high': 'bg-red-500/10 text-red-600',
    'низкая': 'bg-emerald-500/10 text-emerald-600',
    'средняя': 'bg-amber-500/10 text-amber-600',
    'высокая': 'bg-red-500/10 text-red-600',
  };

  return (
    <div className="p-3 rounded-lg border border-border bg-card/50">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-medium text-sm">{scenario}</span>
        <span className={cn("px-2 py-0.5 rounded text-xs font-medium", probColors[probability] || probColors['medium'])}>
          {probability}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Profit:</span>
        <span className={cn("text-sm font-bold", profit >= 0 ? "text-emerald-600" : "text-destructive")}>
          {formatCurrency(profit)}
        </span>
      </div>
    </div>
  );
}

export function FinancialSummary({ financial, selectedScenario = 'base' }: FinancialSummaryProps) {
  const [showFormulas, setShowFormulas] = useState(false);
  
  // Handle both old and new data structures
  const hasNewStructure = financial.scenarios && financial.unit_economics;
  
  // Get scenario-specific metrics based on selection
  const currentScenario = hasNewStructure 
    ? financial.scenarios[selectedScenario] 
    : null;
  
  const baseProfit = currentScenario 
    ? currentScenario.net_profit 
    : (financial as any).monthly_profit || 0;
  
  const isProfitable = baseProfit > 0;

  const keyMetrics = [
    {
      label: 'Startup Investment',
      value: formatCurrency(financial.startup_investment?.total || 0),
      icon: Wallet,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'MRR',
      value: formatCurrency(financial.mrr || 0),
      subtext: `ARR: ${formatCurrency(financial.arr || 0)}`,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Operating Profit/mo',
      value: formatCurrency(baseProfit),
      icon: isProfitable ? TrendingUp : TrendingDown,
      color: isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
      bgColor: isProfitable ? 'bg-emerald-500/10' : 'bg-destructive/10',
    },
    {
      label: 'Payback Period',
      value: (() => {
        const raw = financial.returns?.payback_period_months ?? 0;
        return formatPaybackDisplay(raw, baseProfit);
      })(),
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'ROI Year 1',
      value: formatPercent(financial.returns?.roi_year_1 || 0),
      icon: BarChart3,
      color: (financial.returns?.roi_year_1 || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
      bgColor: (financial.returns?.roi_year_1 || 0) > 0 ? 'bg-emerald-500/10' : 'bg-destructive/10',
    },
    {
      label: 'LTV:CAC',
      value: `${formatNumber(financial.unit_economics?.ltv_cac_ratio || 0)}x`,
      icon: Users,
      color: (financial.unit_economics?.ltv_cac_ratio || 0) >= 3 ? 'text-emerald-600' : 'text-amber-600',
      bgColor: (financial.unit_economics?.ltv_cac_ratio || 0) >= 3 ? 'bg-emerald-500/10' : 'bg-amber-500/10',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5 text-primary" />
          Financial Analysis (Universal Framework)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid with Copy */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <CopyableMetricCard
            label="Startup Investment"
            value={formatCurrency(financial.startup_investment?.total || 0)}
            rawValue={financial.startup_investment?.total || 0}
            icon={Wallet}
            color="text-primary"
            bgColor="bg-primary/10"
          />
          <CopyableMetricCard
            label="MRR"
            value={formatCurrency(financial.mrr || 0)}
            rawValue={financial.mrr || 0}
            subtext={`ARR: ${formatCurrency(financial.arr || 0)}`}
            icon={TrendingUp}
            color="text-emerald-600 dark:text-emerald-400"
            bgColor="bg-emerald-500/10"
          />
          <CopyableMetricCard
            label="Operating Profit/mo"
            value={formatCurrency(baseProfit)}
            rawValue={baseProfit}
            icon={isProfitable ? TrendingUp : TrendingDown}
            color={isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}
            bgColor={isProfitable ? 'bg-emerald-500/10' : 'bg-destructive/10'}
          />
          <CopyableMetricCard
            label="Payback Period"
            value={(() => {
              const raw = financial.returns?.payback_period_months ?? 0;
              return formatPaybackDisplay(raw, baseProfit);
            })()}
            rawValue={financial.returns?.payback_period_months ?? 0}
            icon={Clock}
            color="text-amber-600 dark:text-amber-400"
            bgColor="bg-amber-500/10"
          />
          <CopyableMetricCard
            label="ROI Year 1"
            value={formatPercent(financial.returns?.roi_year_1 || 0)}
            rawValue={`${(financial.returns?.roi_year_1 || 0).toFixed(1)}%`}
            icon={BarChart3}
            color={(financial.returns?.roi_year_1 || 0) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}
            bgColor={(financial.returns?.roi_year_1 || 0) > 0 ? 'bg-emerald-500/10' : 'bg-destructive/10'}
          />
          <CopyableMetricCard
            label="LTV:CAC"
            value={`${formatNumber(financial.unit_economics?.ltv_cac_ratio || 0)}x`}
            rawValue={`${(financial.unit_economics?.ltv_cac_ratio || 0).toFixed(2)}`}
            icon={Users}
            color={(financial.unit_economics?.ltv_cac_ratio || 0) >= 3 ? 'text-emerald-600' : 'text-amber-600'}
            bgColor={(financial.unit_economics?.ltv_cac_ratio || 0) >= 3 ? 'bg-emerald-500/10' : 'bg-amber-500/10'}
          />
        </div>

        <Tabs defaultValue="scenarios" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scenarios">3 Scenarios</TabsTrigger>
            <TabsTrigger value="unit-economics">Unit Economics</TabsTrigger>
            <TabsTrigger value="risks">Risks</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
          </TabsList>

          <TabsContent value="scenarios" className="mt-4">
            {hasNewStructure ? (
              <div className="grid md:grid-cols-3 gap-4">
                <ScenarioCard title="Pessimistic" metrics={financial.scenarios.pessimistic} variant="pessimistic" />
                <ScenarioCard title="Base" metrics={financial.scenarios.base} variant="base" />
                <ScenarioCard title="Optimistic" metrics={financial.scenarios.optimistic} variant="optimistic" />
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/30 border border-border text-center text-muted-foreground">
                Scenario data not available
              </div>
            )}
          </TabsContent>

          <TabsContent value="unit-economics" className="mt-4">
            {hasNewStructure && financial.unit_economics ? (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border bg-card">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-primary" />
                    Unit Economics
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Contribution Margin (CM)</span>
                      <span className="font-bold">{formatCurrency(financial.unit_economics?.contribution_margin ?? 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">CM Ratio</span>
                      <span className="font-bold">{((financial.unit_economics?.contribution_margin_ratio ?? 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">CAC</span>
                      <span className="font-bold">{formatCurrency(financial.unit_economics?.cac ?? 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">CAC Payback</span>
                      <span className="font-bold">{(financial.unit_economics?.cac_payback_months ?? 0) >= 999 ? 'N/A (unprofitable)' : `${formatNumber(financial.unit_economics?.cac_payback_months ?? 0)} mo.`}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Customer Value
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">LTV</span>
                      <span className="font-bold">{formatCurrency(financial.unit_economics?.ltv ?? 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">LTV:CAC</span>
                      <span className={cn("font-bold", (financial.unit_economics?.ltv_cac_ratio ?? 0) >= 3 ? "text-emerald-600" : "text-amber-600")}>
                        {formatNumber(financial.unit_economics?.ltv_cac_ratio ?? 0)}x
                      </span>
                    </div>
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        {(financial.unit_economics?.ltv_cac_ratio ?? 0) >= 3 
                          ? "Healthy ratio (>3x)" 
                          : (financial.unit_economics?.ltv_cac_ratio ?? 0) >= 1 
                            ? "Needs improvement (1-3x)"
                            : "Unprofitable model (<1x)"}
                      </p>
                    </div>
                  </div>
                </div>
                {financial.breakeven && (() => {
                  // Handbook §19 Wave 1 — the legacy breakeven_revenue field
                  // floor-guards contribution margin to a minimum 1% rather
                  // than reporting NOT_ACHIEVABLE, which can make an
                  // underwater business look like it has a real break-even
                  // point. cvp.breakEven is the typed, non-floor-guarded
                  // contract computed in parallel — check it before trusting
                  // the legacy figure (same pattern as
                  // AccuracyTransparentResults.tsx). Absent on analyses
                  // saved before this field existed.
                  const be = canonicalBreakEven(financial);
                  const notAchievable = be.status === 'not_achievable';
                  const inconsistent = be.status === 'inconsistent';
                  const insufficient = be.status === 'insufficient_inputs';
                  return (
                  <div className="p-4 rounded-lg border border-border bg-card md:col-span-2">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Break-even Point
                    </h4>
                    {inconsistent ? (
                      <p className="text-sm text-amber-600 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        Needs review: the monthly costs you entered don't reconcile with the itemized cost defaults in this report, so no break-even figure is shown. Re-run with itemized costs to get a reliable break-even.
                      </p>
                    ) : insufficient ? (
                      <p className="text-sm text-amber-600 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        Not enough data to calculate break-even: it needs a price per unit and a variable cost per unit. Add them and re-run to get a break-even figure.
                      </p>
                    ) : notAchievable ? (
                      <p className="text-sm text-amber-600 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        Not achievable at current costs and pricing — contribution margin is zero or negative, so no volume of sales reaches break-even.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">In Units</p>
                          <p className="text-lg font-bold">{be.units != null ? formatNumber(be.units) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">In Revenue</p>
                          <p className="text-lg font-bold">{be.revenue != null ? formatCurrency(be.revenue) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Months to BE</p>
                          <p className="text-lg font-bold">{breakEvenMonthsLabel(financial, baseProfit)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })()}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/30 border border-border text-center text-muted-foreground">
                Unit economics data not available
              </div>
            )}
          </TabsContent>

          <TabsContent value="risks" className="mt-4">
            {hasNewStructure && financial.risk_analysis ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="font-medium">Risk Analysis with Numbers</span>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <RiskCard 
                    scenario={financial.risk_analysis.revenue_drop_20.scenario}
                    description={financial.risk_analysis.revenue_drop_20.description}
                    profit={financial.risk_analysis.revenue_drop_20.resulting_profit}
                    probability={financial.risk_analysis.revenue_drop_20.probability}
                  />
                  <RiskCard 
                    scenario={financial.risk_analysis.costs_rise_15.scenario}
                    description={financial.risk_analysis.costs_rise_15.description}
                    profit={financial.risk_analysis.costs_rise_15.resulting_profit}
                    probability={financial.risk_analysis.costs_rise_15.probability}
                  />
                  <RiskCard 
                    scenario={financial.risk_analysis.cac_doubles.scenario}
                    description={financial.risk_analysis.cac_doubles.description}
                    profit={financial.risk_analysis.cac_doubles.resulting_profit}
                    probability={financial.risk_analysis.cac_doubles.probability}
                  />
                  <RiskCard 
                    scenario={financial.risk_analysis.churn_increase.scenario}
                    description={financial.risk_analysis.churn_increase.description}
                    profit={financial.risk_analysis.churn_increase.resulting_profit}
                    probability={financial.risk_analysis.churn_increase.probability}
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/30 border border-border text-center text-muted-foreground">
                Risk data not available
              </div>
            )}
          </TabsContent>

          <TabsContent value="costs" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {financial.monthly_expenses?.breakdown && Object.entries(financial.monthly_expenses.breakdown).map(([key, value]) => {
                  const labels: Record<string, string> = {
                    rent: 'Rent',
                    utilities: 'Utilities',
                    salaries: 'Salaries',
                    inventory_replenishment: 'Inventory',
                    marketing: 'Marketing',
                    other: 'Other',
                  };
                  const total = financial.monthly_expenses.total || 1;
                  const percentage = ((value / total) * 100).toFixed(0);
                  
                  return (
                    <div key={key} className="flex justify-between items-center p-2 rounded bg-muted/30">
                      <span className="text-sm text-muted-foreground">{labels[key] || key}</span>
                      <div className="text-right">
                        <span className="text-sm font-medium text-foreground">{formatCurrency(value)}</span>
                        <span className="text-xs text-muted-foreground ml-1">({percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {financial.monthly_expenses && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Monthly Expenses</span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(financial.monthly_expenses.total)}</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
