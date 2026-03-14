import React, { useMemo } from 'react';
import { BENCHMARK_DATABASE } from '@/lib/benchmark-calibrator';
import { buildCitation, formatCitationCompact } from '@/lib/benchmark-citations';
import { checkFreshness, getFreshnessIcon, getFreshnessLabel } from '@/lib/benchmark-freshness';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { cn } from '@/lib/utils';

type Verdict = 'BEAT' | 'IN-LINE' | 'MISS';

interface BeatMissRow {
  label: string;
  userValue: number;
  p50: number;
  p75: number;
  unit: string;
  verdict: Verdict;
  deltaPct: number;
  source: string;
}

function classify(user: number, p50: number, higherIsBetter: boolean): { verdict: Verdict; deltaPct: number } {
  const delta = ((user - p50) / Math.max(p50, 0.01)) * 100;
  const effective = higherIsBetter ? delta : -delta;
  return {
    verdict: effective > 8 ? 'BEAT' : effective < -8 ? 'MISS' : 'IN-LINE',
    deltaPct: Math.abs(delta),
  };
}

function findBenchmark(industry: string, param: string) {
  return BENCHMARK_DATABASE.find(b => b.industryType === industry && b.parameter === param);
}

const VERDICT_STYLES: Record<Verdict, string> = {
  'BEAT': 'text-[var(--q-status-green)] bg-[var(--q-status-green-bg)] border-[var(--q-status-green-border)]',
  'IN-LINE': 'text-[var(--q-status-yellow)] bg-[var(--q-status-yellow-bg)] border-[var(--q-status-yellow-border)]',
  'MISS': 'text-[var(--q-status-red)] bg-[var(--q-status-red-bg)] border-[var(--q-status-red-border)]',
};

const VERDICT_ICON: Record<Verdict, string> = { 'BEAT': '▲', 'IN-LINE': '●', 'MISS': '▼' };

interface BeatMissEngineProps {
  result: BusinessAnalysisResult;
}

export function BeatMissEngine({ result }: BeatMissEngineProps) {
  const rows = useMemo<BeatMissRow[]>(() => {
    const industry = result.metadata.industry_detected || 'service_business';
    const price = result.financial_analysis?.inputs?.price_per_unit ?? 0;
    const cac = result.financial_analysis?.unit_economics?.cac ?? 0;
    const churn = (result.financial_analysis?.inputs?.churn_rate ?? 0) * 100;
    const gm = result.financial_analysis?.scenarios?.base?.gross_margin ?? 0;
    const ltvCac = result.financial_analysis?.unit_economics?.ltv_cac_ratio ?? 0;
    const be = result.financial_analysis?.returns?.payback_period_months ?? result.financial_analysis?.payback_period_months ?? 99;

    const items: Array<{ label: string; value: number; param: string; unit: string; higherBetter: boolean }> = [
      { label: 'ARPU / Pricing', value: price, param: 'avg_ticket_size', unit: '$', higherBetter: true },
      { label: 'Customer Acq. Cost', value: cac, param: 'cac', unit: '$', higherBetter: false },
      { label: 'Monthly Churn Rate', value: churn, param: 'churn_rate', unit: '%', higherBetter: false },
      { label: 'Gross Margin', value: gm, param: 'gross_margin', unit: '%', higherBetter: true },
      { label: 'LTV:CAC Ratio', value: ltvCac, param: 'ltv', unit: '×', higherBetter: true },
      { label: 'Break-even Timeline', value: be, param: 'break_even_months', unit: 'mo', higherBetter: false },
    ];

    return items.map(item => {
      const bm = findBenchmark(industry, item.param);
      const p50 = bm?.p50 ?? 0;
      const p75 = bm?.p75 ?? 0;

      // For LTV:CAC, derive p50 from ltv/cac benchmarks
      let effectiveP50 = p50;
      let effectiveP75 = p75;
      if (item.param === 'ltv') {
        const ltvBm = findBenchmark(industry, 'ltv');
        const cacBm = findBenchmark(industry, 'cac');
        effectiveP50 = ltvBm && cacBm ? Math.round((ltvBm.p50 / Math.max(cacBm.p50, 1)) * 10) / 10 : 3;
        effectiveP75 = ltvBm && cacBm ? Math.round((ltvBm.p75 / Math.max(cacBm.p25, 1)) * 10) / 10 : 8;
      }

      const { verdict, deltaPct } = classify(item.value, effectiveP50, item.higherBetter);
      return {
        label: item.label,
        userValue: item.value,
        p50: effectiveP50,
        p75: effectiveP75,
        unit: item.unit,
        verdict,
        deltaPct,
        const citation = bm ? buildCitation(bm) : null;
        const freshness = bm ? checkFreshness(bm.lastUpdated) : null;
        const sourceText = citation
          ? `${formatCitationCompact(citation)} ${freshness ? getFreshnessIcon(freshness.warningLevel) : ''}`
          : 'Derived';
      };
    });
  }, [result]);

  const beatCount = rows.filter(r => r.verdict === 'BEAT').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--q-text-primary)]" style={{ fontFamily: 'var(--q-font-heading)' }}>
          Beat / Miss Engine
        </h4>
        <span className="text-[10px] font-medium text-[var(--q-text-tertiary)] uppercase tracking-wider">
          {beatCount}/{rows.length} metrics beat median
        </span>
      </div>

      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center p-2.5 rounded-lg bg-[var(--q-bg-elevated)] border border-[var(--q-border-subtle)]"
          >
            {/* Label */}
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--q-text-primary)] truncate">{row.label}</p>
              <p className="text-[10px] text-[var(--q-text-disabled)] truncate">{row.source}</p>
            </div>

            {/* User value */}
            <div className="text-right">
              <p className="text-[10px] text-[var(--q-text-tertiary)]">Yours</p>
              <p className="text-xs font-bold tabular-nums text-[var(--q-text-primary)]" style={{ fontFamily: 'var(--q-font-mono, monospace)' }}>
                {row.unit === '$' ? `$${row.userValue.toLocaleString()}` : `${row.userValue}${row.unit}`}
              </p>
            </div>

            {/* p50 */}
            <div className="text-right">
              <p className="text-[10px] text-[var(--q-text-tertiary)]">Median</p>
              <p className="text-xs tabular-nums text-[var(--q-text-secondary)]" style={{ fontFamily: 'var(--q-font-mono, monospace)' }}>
                {row.unit === '$' ? `$${row.p50.toLocaleString()}` : `${row.p50}${row.unit}`}
              </p>
            </div>

            {/* p75 */}
            <div className="text-right">
              <p className="text-[10px] text-[var(--q-text-tertiary)]">p75</p>
              <p className="text-xs tabular-nums text-[var(--q-text-secondary)]" style={{ fontFamily: 'var(--q-font-mono, monospace)' }}>
                {row.unit === '$' ? `$${row.p75.toLocaleString()}` : `${row.p75}${row.unit}`}
              </p>
            </div>

            {/* Badge */}
            <div className={cn(
              'px-2 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 whitespace-nowrap',
              VERDICT_STYLES[row.verdict]
            )}>
              <span>{VERDICT_ICON[row.verdict]}</span>
              <span>{row.verdict}</span>
              <span className="font-mono">{row.deltaPct.toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[var(--q-text-disabled)] italic">
        ▲ BEAT = above industry p50 on favorable metric · ▼ MISS = below · Threshold: ±8%
      </p>
    </div>
  );
}
