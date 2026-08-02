import React, { useMemo } from 'react';
import { BENCHMARK_DATABASE } from '@/lib/benchmark-calibrator';
import { buildCitation, formatCitationCompact } from '@/lib/benchmark-citations';
import { checkFreshness, getFreshnessIcon } from '@/lib/benchmark-freshness';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { cn } from '@/lib/utils';

type Verdict = 'BEAT' | 'IN-LINE' | 'MISS';

function classify(user: number, p50: number, higherBetter: boolean): Verdict {
  const delta = ((user - p50) / Math.max(p50, 0.01)) * 100;
  const eff = higherBetter ? delta : -delta;
  return eff > 8 ? 'BEAT' : eff < -8 ? 'MISS' : 'IN-LINE';
}

const VERDICT_COLORS: Record<Verdict, string> = {
  'BEAT': 'text-[var(--q-status-green)]',
  'IN-LINE': 'text-[var(--q-status-yellow)]',
  'MISS': 'text-[var(--q-status-red)]',
};

interface CompetitiveMatrixProps {
  result: BusinessAnalysisResult;
}

export function CompetitiveMatrix({ result }: CompetitiveMatrixProps) {
  const data = useMemo(() => {
    const industry = result.metadata.industry_detected || 'service_business';
    const find = (param: string) => BENCHMARK_DATABASE.find(b => b.industryType === industry && b.parameter === param);

    const gmBm = find('gross_margin');
    const cacBm = find('cac');
    const churnBm = find('churn_rate');
    const priceBm = find('avg_ticket_size');
    const beBm = find('break_even_months');
    const ltvBm = find('ltv');

    const userArpu = result.financial_analysis?.inputs?.price_per_unit ?? 0;
    const userChurn = (result.financial_analysis?.inputs?.churn_rate ?? 0) * 100;
    const userCac = result.financial_analysis?.unit_economics?.cac ?? 0;
    const userGm = result.financial_analysis?.scenarios?.base?.gross_margin ?? 0;
    const userBe = result.financial_analysis?.returns?.payback_period_months ?? result.financial_analysis?.payback_period_months ?? 99;
    const userLtvCac = result.financial_analysis?.unit_economics?.ltv_cac_ratio ?? 0;
    const userNet = result.financial_analysis?.scenarios?.base?.net_profit ?? 0;

    const medianLtvCac = ltvBm && cacBm ? Math.round((ltvBm.p50 / Math.max(cacBm.p50, 1)) * 10) / 10 : 3;
    const p75LtvCac = ltvBm && cacBm ? Math.round((ltvBm.p75 / Math.max(cacBm.p25, 1)) * 10) / 10 : 8;

    const cols = [
      { label: 'ARPU', higher: true },
      { label: 'Churn', higher: false },
      { label: 'CAC', higher: false },
      { label: 'GM%', higher: true },
      { label: 'B/E', higher: false },
      { label: 'LTV:CAC', higher: true },
      { label: 'Net P/L', higher: true },
    ];

    const userRow = [userArpu, userChurn, userCac, userGm, userBe, userLtvCac, userNet];
    const medianRow = [priceBm?.p50 ?? 0, churnBm?.p50 ?? 0, cacBm?.p50 ?? 0, gmBm?.p50 ?? 0, beBm?.p50 ?? 0, medianLtvCac, 0];
    const p75Row = [priceBm?.p75 ?? 0, churnBm?.p25 ?? 0, cacBm?.p25 ?? 0, gmBm?.p75 ?? 0, beBm?.p25 ?? 0, p75LtvCac, 0];

    const formatCell = (val: number, idx: number) => {
      if (idx === 0 || idx === 2) return `$${val.toLocaleString()}`;
      if (idx === 1 || idx === 3) return `${val.toFixed(1)}%`;
      if (idx === 4) return val >= 999 ? 'N/A' : `Mo.${val}`;
      if (idx === 5) return `${val.toFixed(1)}×`;
      if (idx === 6) return val >= 0 ? `+$${val.toLocaleString()}` : `−$${Math.abs(val).toLocaleString()}`;
      return String(val);
    };

    // Build citation from first available benchmark
    const anyBm = gmBm || cacBm || priceBm;
    const citation = anyBm ? buildCitation(anyBm) : null;
    const freshness = anyBm ? checkFreshness(anyBm.lastUpdated) : null;
    const sourceLabel = citation
      ? `${formatCitationCompact(citation)} ${freshness ? getFreshnessIcon(freshness.warningLevel) : ''}`
      : 'Proprietary Industry Benchmark Database';

    return { cols, userRow, medianRow, p75Row, formatCell, sourceLabel };
  }, [result]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--q-text-primary)]" style={{ fontFamily: 'var(--q-font-heading)' }}>
          Competitive Sector Matrix
        </h4>
        <span className="text-[10px] text-[var(--q-text-disabled)]">
          {data.sourceLabel}
        </span>
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <thead>
            <tr className="border-b border-[var(--q-border-default)]">
              <th className="text-left py-2 px-2 text-[10px] font-medium text-[var(--q-text-tertiary)] uppercase tracking-wider">Model</th>
              {data.cols.map(c => (
                <th key={c.label} className="text-right py-2 px-2 text-[10px] font-medium text-[var(--q-text-tertiary)] uppercase tracking-wider">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* User row */}
            <tr className="border-l-[3px] border-l-[var(--q-accent-primary)] bg-[var(--q-accent-glow)]">
              <td className="py-2.5 px-2 font-semibold text-[var(--q-text-primary)]">Your Business</td>
              {data.userRow.map((val, j) => {
                const verdict = j < 6 ? classify(val, data.medianRow[j], data.cols[j].higher) : undefined;
                return (
                  <td key={j} className="py-2.5 px-2 text-right font-mono font-bold text-[var(--q-text-primary)]" style={{ fontFamily: 'var(--q-font-mono, monospace)' }}>
                    <span className={verdict ? VERDICT_COLORS[verdict] : (val >= 0 ? 'text-[var(--q-status-green)]' : 'text-[var(--q-status-red)]')}>
                      {data.formatCell(val, j)}
                    </span>
                  </td>
                );
              })}
            </tr>
            {/* Median */}
            <tr className="border-b border-[var(--q-border-subtle)]">
              <td className="py-2 px-2 text-[var(--q-text-secondary)]">Industry Median (p50)</td>
              {data.medianRow.map((val, j) => (
                <td key={j} className="py-2 px-2 text-right text-[var(--q-text-secondary)]" style={{ fontFamily: 'var(--q-font-mono, monospace)' }}>
                  {j === 6 ? '—' : data.formatCell(val, j)}
                </td>
              ))}
            </tr>
            {/* p75 */}
            <tr>
              <td className="py-2 px-2 text-[var(--q-text-secondary)]">Top Tier (p75)</td>
              {data.p75Row.map((val, j) => (
                <td key={j} className="py-2 px-2 text-right text-[var(--q-text-secondary)]" style={{ fontFamily: 'var(--q-font-mono, monospace)' }}>
                  {j === 6 ? '—' : data.formatCell(val, j)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-[var(--q-text-disabled)] italic">
        Values colored by beat/miss vs. industry median · Higher ARPU, GM%, LTV:CAC = better · Lower Churn, CAC, B/E = better
      </p>
    </div>
  );
}
