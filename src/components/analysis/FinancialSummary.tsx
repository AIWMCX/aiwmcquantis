import React from 'react';
import { TrendingUp, TrendingDown, Clock, Wallet, Target, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { FinancialAnalysis } from '@/types/analysis';

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

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value);
}

export function FinancialSummary({ financial }: FinancialSummaryProps) {
  const isProfitable = financial.monthly_profit > 0;
  const roi = financial.roi_year_1;
  
  const metrics = [
    {
      label: 'Стартовые инвестиции',
      value: formatCurrency(financial.startup_investment.total),
      icon: Wallet,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Ежемесячная выручка',
      value: formatCurrency(financial.monthly_revenue.realistic),
      subtext: `${formatCurrency(financial.monthly_revenue.conservative)} – ${formatCurrency(financial.monthly_revenue.optimistic)}`,
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Ежемесячная прибыль',
      value: formatCurrency(financial.monthly_profit),
      icon: isProfitable ? TrendingUp : TrendingDown,
      color: isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
      bgColor: isProfitable ? 'bg-emerald-500/10' : 'bg-destructive/10',
    },
    {
      label: 'Срок окупаемости',
      value: `${financial.payback_period_months} мес.`,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Точка безубыточности',
      value: `${financial.break_even_months} мес.`,
      icon: Target,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'ROI за год',
      value: `${roi > 0 ? '+' : ''}${roi}%`,
      icon: BarChart3,
      color: roi > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive',
      bgColor: roi > 0 ? 'bg-emerald-500/10' : 'bg-destructive/10',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5 text-primary" />
          Финансовый анализ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric) => (
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

        {/* Expense Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Структура ежемесячных расходов</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(financial.monthly_expenses.breakdown).map(([key, value]) => {
              const labels: Record<string, string> = {
                rent: 'Аренда',
                utilities: 'Коммунальные',
                salaries: 'Зарплаты',
                inventory_replenishment: 'Закупки',
                marketing: 'Маркетинг',
                other: 'Прочее',
              };
              const percentage = ((value / financial.monthly_expenses.total) * 100).toFixed(0);
              
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
        </div>

        {/* Reasoning */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <h4 className="text-sm font-medium text-foreground mb-2">Обоснование расчётов</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {financial.monthly_revenue.reasoning}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
