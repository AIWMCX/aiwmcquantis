import React from 'react';
import { TrendingUp, Clock, Percent, PieChart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalculatedMetrics, Verdict, VerdictInfo } from './types';
import { formatCurrency, formatPercent, formatPayback, getVerdict, getVerdictInfo } from './calculations';

interface MetricsDisplayProps {
  metrics: CalculatedMetrics;
  industryDetected?: string;
}

export function MetricsDisplay({ metrics, industryDetected }: MetricsDisplayProps) {
  const { monthlyProfit, annualRoi, paybackMonths, netMargin } = metrics;
  const verdict = getVerdict(annualRoi);
  const verdictInfo = getVerdictInfo(verdict);

  return (
    <div className="space-y-4">
      {/* Verdict Badge */}
      <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full", verdictInfo.bg)}>
        <Sparkles className={cn("w-4 h-4", verdictInfo.color)} />
        <span className={cn("text-sm font-semibold", verdictInfo.color)}>
          {verdictInfo.label}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Monthly Profit */}
        <div className="p-3 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className={cn("w-3.5 h-3.5", monthlyProfit >= 0 ? "text-success" : "text-destructive")} />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Monthly Profit</span>
          </div>
          <p className={cn("text-lg font-bold", monthlyProfit >= 0 ? "text-success" : "text-destructive")}>
            {formatCurrency(monthlyProfit)}
          </p>
        </div>

        {/* Annual ROI */}
        <div className="p-3 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <Percent className={cn("w-3.5 h-3.5", annualRoi >= 100 ? "text-success" : annualRoi >= 50 ? "text-amber-500" : "text-destructive")} />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Annual ROI</span>
          </div>
          <p className={cn("text-lg font-bold", annualRoi >= 100 ? "text-success" : annualRoi >= 50 ? "text-amber-500" : "text-foreground")}>
            {formatPercent(annualRoi)}
          </p>
        </div>

        {/* Payback Period */}
        <div className="p-3 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className={cn("w-3.5 h-3.5", paybackMonths <= 12 ? "text-success" : paybackMonths <= 24 ? "text-amber-500" : "text-muted-foreground")} />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Payback</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {formatPayback(paybackMonths)}
          </p>
        </div>

        {/* Net Margin */}
        <div className="p-3 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <PieChart className={cn("w-3.5 h-3.5", netMargin >= 20 ? "text-success" : netMargin >= 10 ? "text-amber-500" : "text-muted-foreground")} />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Net Margin</span>
          </div>
          <p className={cn("text-lg font-bold", netMargin >= 20 ? "text-success" : netMargin >= 10 ? "text-amber-500" : "text-foreground")}>
            {netMargin > 0 ? formatPercent(netMargin).replace('+', '') : '0%'}
          </p>
        </div>
      </div>

      {/* Industry Badge (if detected) */}
      {industryDetected && (
        <p className="text-xs text-muted-foreground">
          Industry: <span className="font-medium text-foreground">{industryDetected}</span>
        </p>
      )}
    </div>
  );
}
