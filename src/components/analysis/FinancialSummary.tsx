import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Clock, Wallet, Target, BarChart3, Users, Percent, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { FinancialAnalysis, ScenarioMetrics } from '@/types/analysis';

interface FinancialSummaryProps {
  financial: FinancialAnalysis;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value);
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
          <span className="text-muted-foreground">Выручка:</span>
          <span className="font-medium">{formatCurrency(metrics.revenue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Валовая прибыль:</span>
          <span className="font-medium">{formatCurrency(metrics.gross_profit)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Чистая прибыль:</span>
          <span className={cn("font-bold", metrics.net_profit >= 0 ? "text-emerald-600" : "text-destructive")}>
            {formatCurrency(metrics.net_profit)}
          </span>
        </div>
        <div className="pt-2 border-t border-border/50">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Валовая маржа:</span>
            <span className="font-medium">{formatPercent(metrics.gross_margin)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Чистая маржа:</span>
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
  const probColors = {
    'низкая': 'bg-emerald-500/10 text-emerald-600',
    'средняя': 'bg-amber-500/10 text-amber-600',
    'высокая': 'bg-red-500/10 text-red-600',
  };

  return (
    <div className="p-3 rounded-lg border border-border bg-card/50">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-medium text-sm">{scenario}</span>
        <span className={cn("px-2 py-0.5 rounded text-xs font-medium", probColors[probability as keyof typeof probColors] || probColors['средняя'])}>
          {probability}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">Прибыль:</span>
        <span className={cn("text-sm font-bold", profit >= 0 ? "text-emerald-600" : "text-destructive")}>
          {formatCurrency(profit)}
        </span>
      </div>
    </div>
  );
}

export function FinancialSummary({ financial }: FinancialSummaryProps) {
  const [showFormulas, setShowFormulas] = useState(false);
  
  // Handle both old and new data structures
  const hasNewStructure = financial.scenarios && financial.unit_economics;
  
  // Get base scenario metrics or fall back to old structure
  const baseProfit = hasNewStructure 
    ? financial.scenarios.base.net_profit 
    : (financial as any).monthly_profit || 0;
  
  const isProfitable = baseProfit > 0;

  const keyMetrics = [
    {
      label: 'Стартовые инвестиции',
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
      label: 'Чистая прибыль/мес',
      value: formatCurrency(baseProfit),
      icon: isProfitable ? TrendingUp : TrendingDown,
      color: isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
      bgColor: isProfitable ? 'bg-emerald-500/10' : 'bg-destructive/10',
    },
    {
      label: 'Срок окупаемости',
      value: `${financial.returns?.payback_period_months || financial.breakeven?.breakeven_months || 0} мес.`,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'ROI год 1',
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
          Финансовый анализ (Universal Framework)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {keyMetrics.map((metric) => (
            <div
              key={metric.label}
              className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("p-1.5 rounded-md", metric.bgColor)}>
                  <metric.icon className={cn("w-4 h-4", metric.color)} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{metric.label}</span>
              </div>
              <p className={cn("text-xl font-bold", metric.color)}>{metric.value}</p>
              {metric.subtext && (
                <p className="text-xs text-muted-foreground mt-1">{metric.subtext}</p>
              )}
            </div>
          ))}
        </div>

        <Tabs defaultValue="scenarios" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scenarios">3 Сценария</TabsTrigger>
            <TabsTrigger value="unit-economics">Unit Economics</TabsTrigger>
            <TabsTrigger value="risks">Риски</TabsTrigger>
            <TabsTrigger value="costs">Затраты</TabsTrigger>
          </TabsList>

          <TabsContent value="scenarios" className="mt-4">
            {hasNewStructure ? (
              <div className="grid md:grid-cols-3 gap-4">
                <ScenarioCard title="Пессимистичный" metrics={financial.scenarios.pessimistic} variant="pessimistic" />
                <ScenarioCard title="Базовый" metrics={financial.scenarios.base} variant="base" />
                <ScenarioCard title="Оптимистичный" metrics={financial.scenarios.optimistic} variant="optimistic" />
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/30 border border-border text-center text-muted-foreground">
                Данные о сценариях недоступны
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
                      <span className="text-sm text-muted-foreground">Маржинальный доход (CM)</span>
                      <span className="font-bold">{formatCurrency(financial.unit_economics.contribution_margin)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Коэффициент CM</span>
                      <span className="font-bold">{(financial.unit_economics.contribution_margin_ratio * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">CAC</span>
                      <span className="font-bold">{formatCurrency(financial.unit_economics.cac)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Окупаемость CAC</span>
                      <span className="font-bold">{formatNumber(financial.unit_economics.cac_payback_months)} мес.</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Ценность клиента
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">LTV</span>
                      <span className="font-bold">{formatCurrency(financial.unit_economics.ltv)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">LTV:CAC</span>
                      <span className={cn("font-bold", financial.unit_economics.ltv_cac_ratio >= 3 ? "text-emerald-600" : "text-amber-600")}>
                        {formatNumber(financial.unit_economics.ltv_cac_ratio)}x
                      </span>
                    </div>
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        {financial.unit_economics.ltv_cac_ratio >= 3 
                          ? "✅ Здоровый показатель (>3x)" 
                          : financial.unit_economics.ltv_cac_ratio >= 1 
                            ? "⚠️ Требует улучшения (1-3x)"
                            : "❌ Убыточная модель (<1x)"}
                      </p>
                    </div>
                  </div>
                </div>
                {financial.breakeven && (
                  <div className="p-4 rounded-lg border border-border bg-card md:col-span-2">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Точка безубыточности
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">В единицах</p>
                        <p className="text-lg font-bold">{formatNumber(financial.breakeven.breakeven_units)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">В деньгах</p>
                        <p className="text-lg font-bold">{formatCurrency(financial.breakeven.breakeven_revenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Месяцев до BE</p>
                        <p className="text-lg font-bold">{financial.breakeven.breakeven_months}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-muted/30 border border-border text-center text-muted-foreground">
                Данные unit economics недоступны
              </div>
            )}
          </TabsContent>

          <TabsContent value="risks" className="mt-4">
            {hasNewStructure && financial.risk_analysis ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="font-medium">Анализ рисков с цифрами</span>
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
                Данные о рисках недоступны
              </div>
            )}
          </TabsContent>

          <TabsContent value="costs" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {financial.monthly_expenses?.breakdown && Object.entries(financial.monthly_expenses.breakdown).map(([key, value]) => {
                  const labels: Record<string, string> = {
                    rent: 'Аренда',
                    utilities: 'Коммунальные',
                    salaries: 'Зарплаты',
                    inventory_replenishment: 'Закупки',
                    marketing: 'Маркетинг',
                    other: 'Прочее',
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
                    <span className="font-medium">Итого расходов/мес:</span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(financial.monthly_expenses.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>Переменные: {formatCurrency(financial.monthly_expenses.variable_costs || 0)}</span>
                    <span>Фиксированные: {formatCurrency(financial.monthly_expenses.fixed_costs || 0)}</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Calculations Summary */}
        {financial.calculations_summary && (
          <div className="space-y-2">
            <button 
              onClick={() => setShowFormulas(!showFormulas)}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              {showFormulas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showFormulas ? 'Скрыть формулы' : 'Показать формулы расчётов'}
            </button>
            {showFormulas && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border">
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {financial.calculations_summary}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
