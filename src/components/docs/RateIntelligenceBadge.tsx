import React from 'react';
import { TrendingUp, Sparkles, CheckCircle } from 'lucide-react';
import { BENCHMARK_DATABASE, type IndustryBenchmark } from '@/lib/benchmark-calibrator';
import { Button } from '@/components/ui/button';

interface RateIntelligenceBadgeProps {
  industryType: string;
  unitPrice: number;
  onApplyMarketRate: (p50: number) => void;
}

function getTicketBenchmark(industryType: string): IndustryBenchmark | undefined {
  return BENCHMARK_DATABASE.find(
    (b) => b.industryType === industryType && b.parameter === 'avg_ticket_size'
  );
}

export function RateIntelligenceBadge({
  industryType,
  unitPrice,
  onApplyMarketRate,
}: RateIntelligenceBadgeProps) {
  const benchmark = getTicketBenchmark(industryType);

  if (!benchmark || unitPrice <= 0) return null;

  const { p25, p50, p75 } = benchmark;

  // Above p75 → premium
  if (unitPrice > p75) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
        <CheckCircle className="w-3 h-3" />
        Premium Pricing ✓
      </span>
    );
  }

  // Between p25–p75 → neutral, no badge
  if (unitPrice >= p25) return null;

  // Below p25 → under-pricing warning
  return (
    <div className="flex flex-col gap-1 mt-1">
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
        <TrendingUp className="w-3 h-3" />
        Rate ${unitPrice.toFixed(0)} is below market range ${p25}–${p75}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 text-xs text-primary px-2 w-fit"
        onClick={() => onApplyMarketRate(p50)}
      >
        <Sparkles className="w-3 h-3 mr-1" />
        Apply Market Rate (${p50})
      </Button>
    </div>
  );
}
