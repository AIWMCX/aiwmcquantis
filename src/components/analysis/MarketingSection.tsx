import React from 'react';
import { Megaphone, Target, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MarketingPlan } from '@/types/analysis';

interface MarketingSectionProps {
  marketing: MarketingPlan;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function MarketingSection({ marketing }: MarketingSectionProps) {
  const ltvCacRatio = marketing.ltv && marketing.cac ? (marketing.ltv / marketing.cac).toFixed(1) : null;
  const isHealthyRatio = ltvCacRatio && parseFloat(ltvCacRatio) >= 3;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Megaphone className="w-5 h-5 text-primary" />
          Marketing Strategy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/30 border border-border text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">CAC</span>
            </div>
            <p className="text-lg font-bold text-foreground">{formatCurrency(marketing.cac)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">LTV</span>
            </div>
            <p className="text-lg font-bold text-foreground">{formatCurrency(marketing.ltv)}</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/30 border border-border text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">LTV/CAC</span>
            </div>
            <p className={`text-lg font-bold ${isHealthyRatio ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {ltvCacRatio}x
            </p>
          </div>
        </div>

        {/* Positioning */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Positioning</h4>
          <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/30">
            {marketing.positioning}
          </p>
        </div>

        {/* Pricing Strategy */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Pricing Strategy</h4>
          <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/30">
            {marketing.pricing_strategy}
          </p>
        </div>

        {/* Marketing Channels */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">Marketing Channels</h4>
          <div className="space-y-2">
            {marketing.channels.map((channel, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-medium text-foreground text-sm">{channel.channel}</span>
                  <Badge variant="secondary" className="text-xs">
                    {formatCurrency(channel.budget_monthly)}/mo
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{channel.description}</p>
                <p className="text-xs text-primary">
                  Expected ROI: {channel.expected_roi}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* First 3 Months Plan */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">First 3 Months Plan</h4>
          <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/30 whitespace-pre-line">
            {marketing.first_3_months_plan}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
