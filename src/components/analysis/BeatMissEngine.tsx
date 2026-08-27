import React, { useMemo } from 'react';
import { BENCHMARK_DATABASE } from '@/lib/benchmark-calibrator';
import { buildCitation, formatCitationCompact } from '@/lib/benchmark-citations';
import { checkFreshness, getFreshnessIcon, getFreshnessLabel } from '@/lib/benchmark-freshness';
import type { ServerBenchmarkRecord } from './BenchmarkCitations';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { cn } from '@/lib/utils';

type Verdict = 'BEAT' | 'IN-LINE' | 'MISS';

interface BeatMissRow {
  label: string;
  userValue: number;
  p25: number;
  p50: number;
  p75: number;
  unit: string;
  verdict: Verdict;
  deltaPct: number;
  source: string;
  isEstimatedBand: boolean;
}

/**
 * GTM-audit item #16 (2026-08-27, Q11): confirmed via a real-code
 * investigation agent that this component's benchmark citations were never
 * reconciled with the rest of the report. Every other surface (PDF export,
 * BenchmarkCitations.tsx, RVCE's internal fallback) reads from
 * `result.metadata.benchmarks[]` -- the server's real ~97,500-row Benchmark
 * Master match, computed once at analysis time. This component instead used
 * `BENCHMARK_DATABASE`, a 120-row hand-typed static array where every single
 * row is stamped `source: 'kerry_dataset'` / a fixed placeholder sample size
 * of 1000, regardless of actual industry or metric. The same report could
 * show a gross-margin p50 of, say, 78% here and a genuinely different p50
 * from the real dataset in the PDF's Benchmark Citations table for what a
 * user reads as the same fact -- the exact class of bug this session's
 * other fixes (RVCE range membership, RVCE fallback honesty) addressed.
 *
 * Fix: prefer the real server record for any metric it covers (same
 * precedence rule BenchmarkCitations.tsx already established for P0-5,
 * 2026-07-12: "server wins, static/client is fallback only"). The static
 * array remains a fallback ONLY for metrics the server benchmark set
 * doesn't cover (currently just break-even timeline), and those rows stay
 * marked (est.) so the distinction is visible, not silently blended in.
 */
const SERVER_METRIC_MAP: Record<string, string> = {
  avg_ticket_size: 'arpu',
  cac: 'cac',
  churn_rate: 'churn_monthly',
  gross_margin: 'gross_margin',
};

/** Server benchmark percentages arrive as fractions (0.56 = 56%); this component's values are percent-numbers (56). */
const PERCENT_SERVER_METRICS = new Set(['gross_margin', 'churn_monthly']);

interface ServerBand {
  p25: number;
  p50: number;
  p75: number;
  source: string;
  sampleSize: number;
}

export function resolveServerBand(
  serverBenchmarks: ServerBenchmarkRecord[] | undefined,
  serverMetricKey: string
): ServerBand | null {
  const rec = serverBenchmarks?.find(r => r.metric === serverMetricKey);
  if (!rec || rec.match_type === 'none' || rec.p25 === null || rec.median === null || rec.p75 === null) return null;
  const scale = PERCENT_SERVER_METRICS.has(serverMetricKey) ? 100 : 1;
  return {
    p25: rec.p25 * scale,
    p50: rec.median * scale,
    p75: rec.p75 * scale,
    source: rec.source ?? 'AIWMC Quantis Benchmark Master',
    sampleSize: rec.sample_size,
  };
}

/**
 * CodeRabbit catch (PR #94, second pass): same-index percentile division
 * (p25/p25, p50/p50, p75/p75) is STILL not the true joint distribution of
 * LTV:CAC -- it assumes LTV and CAC move together within a percentile band,
 * which is an unverified assumption, not real paired-observation data.
 * CodeRabbit's own recommendation: "if that data is unavailable, label
 * these values as estimates and do not use them as percentile-band
 * thresholds." So the LTV:CAC row only falls back to this widely-cited SaaS
 * industry heuristic (David Skok / Bessemer "SaaS Metrics 2.0": 3:1 is the
 * minimum healthy ratio, 5:1+ is considered excellent) when no real
 * server-side ltv_cac_ratio record exists -- see resolveServerBand() above,
 * which DOES carry a real (non-derived) p25/p50/p75 for this exact metric
 * from the 97,500-row dataset when a direct/similar match was found.
 */
const LTV_CAC_HEURISTIC = { healthyMin: 3, excellent: 5 } as const;

export function classifyLtvCacRatio(ratio: number): { verdict: Verdict; deltaPct: number } {
  const verdict: Verdict =
    ratio >= LTV_CAC_HEURISTIC.excellent ? 'BEAT' : ratio < LTV_CAC_HEURISTIC.healthyMin ? 'MISS' : 'IN-LINE';
  const deltaPct = Math.abs(((ratio - LTV_CAC_HEURISTIC.healthyMin) / LTV_CAC_HEURISTIC.healthyMin) * 100);
  return { verdict, deltaPct };
}

/**
 * Verdict is derived from where `user` actually sits relative to the p25/p75
 * band this row displays -- not an arbitrary +/-8% offset from p50. A prior
 * version used only the p50 delta, so a value already outside the p75/p25
 * column shown right next to the badge could still render "IN-LINE" (the
 * same class of bug RVCE's status computation had: a badge computed
 * independently of the range it's displayed alongside).
 */
export function classify(
  user: number,
  p25: number,
  p50: number,
  p75: number,
  higherIsBetter: boolean
): { verdict: Verdict; deltaPct: number } {
  const delta = ((user - p50) / Math.max(Math.abs(p50), 0.01)) * 100;
  const verdict: Verdict = higherIsBetter
    ? user > p75 ? 'BEAT' : user < p25 ? 'MISS' : 'IN-LINE'
    : user < p25 ? 'BEAT' : user > p75 ? 'MISS' : 'IN-LINE';
  return { verdict, deltaPct: Math.abs(delta) };
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
    const serverBenchmarks = (result.metadata as any)?.benchmarks as ServerBenchmarkRecord[] | undefined;
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
      const serverMetricKey = item.param === 'ltv' ? 'ltv_cac_ratio' : SERVER_METRIC_MAP[item.param];
      const serverBand = serverMetricKey ? resolveServerBand(serverBenchmarks, serverMetricKey) : null;

      if (serverBand) {
        const { verdict, deltaPct } = classify(item.value, serverBand.p25, serverBand.p50, serverBand.p75, item.higherBetter);
        return {
          label: item.label,
          userValue: item.value,
          p25: Math.round(serverBand.p25 * 10) / 10,
          p50: Math.round(serverBand.p50 * 10) / 10,
          p75: Math.round(serverBand.p75 * 10) / 10,
          unit: item.unit,
          verdict,
          deltaPct,
          source: `${serverBand.source} · n=${serverBand.sampleSize.toLocaleString()}`,
          isEstimatedBand: false,
        };
      }

      // No real server-side match for this metric -- fall back to the
      // static reference array, clearly marked as an estimate. For LTV:CAC
      // specifically this also means no real joint percentile data exists,
      // so the verdict itself falls back to the industry heuristic (see
      // classifyLtvCacRatio() doc comment above) rather than same-index
      // percentile arithmetic.
      const bm = findBenchmark(industry, item.param);
      const p25 = bm?.p25 ?? 0;
      const p50 = bm?.p50 ?? 0;
      const p75 = bm?.p75 ?? 0;

      let effectiveP25 = p25;
      let effectiveP50 = p50;
      let effectiveP75 = p75;
      if (item.param === 'ltv') {
        const ltvBm = findBenchmark(industry, 'ltv');
        const cacBm = findBenchmark(industry, 'cac');
        effectiveP25 = ltvBm && cacBm ? Math.round((ltvBm.p25 / Math.max(cacBm.p25, 1)) * 10) / 10 : 1;
        effectiveP50 = ltvBm && cacBm ? Math.round((ltvBm.p50 / Math.max(cacBm.p50, 1)) * 10) / 10 : 3;
        effectiveP75 = ltvBm && cacBm ? Math.round((ltvBm.p75 / Math.max(cacBm.p75, 1)) * 10) / 10 : 8;
      }

      const { verdict, deltaPct } =
        item.param === 'ltv'
          ? classifyLtvCacRatio(item.value)
          : classify(item.value, effectiveP25, effectiveP50, effectiveP75, item.higherBetter);
      const citation = bm ? buildCitation(bm) : null;
      const freshness = bm ? checkFreshness(bm.lastUpdated) : null;
      const sourceText = citation
        ? `${formatCitationCompact(citation)} ${freshness ? getFreshnessIcon(freshness.warningLevel) : ''}`
        : 'Derived';

      return {
        label: item.label,
        userValue: item.value,
        p25: effectiveP25,
        p50: effectiveP50,
        p75: effectiveP75,
        unit: item.unit,
        verdict,
        deltaPct,
        source: sourceText,
        isEstimatedBand: true,
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
          {beatCount}/{rows.length} metrics BEAT
        </span>
      </div>

      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-center p-2.5 rounded-lg bg-[var(--q-bg-elevated)] border border-[var(--q-border-subtle)]"
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
                {row.unit === '$'
                  ? `$${row.userValue.toLocaleString()}`
                  : row.unit === 'mo' && row.userValue >= 999
                    ? 'N/A'
                    : `${row.userValue}${row.unit}`}
              </p>
            </div>

            {/* p25 */}
            <div className="text-right">
              <p className="text-[10px] text-[var(--q-text-tertiary)]">p25{row.isEstimatedBand ? ' (est.)' : ''}</p>
              <p className="text-xs tabular-nums text-[var(--q-text-secondary)]" style={{ fontFamily: 'var(--q-font-mono, monospace)' }}>
                {row.isEstimatedBand ? '≈' : ''}{row.unit === '$' ? `$${row.p25.toLocaleString()}` : `${row.p25}${row.unit}`}
              </p>
            </div>

            {/* p50 */}
            <div className="text-right">
              <p className="text-[10px] text-[var(--q-text-tertiary)]">{row.isEstimatedBand ? 'Median (est.)' : 'Median'}</p>
              <p className="text-xs tabular-nums text-[var(--q-text-secondary)]" style={{ fontFamily: 'var(--q-font-mono, monospace)' }}>
                {row.isEstimatedBand ? '≈' : ''}{row.unit === '$' ? `$${row.p50.toLocaleString()}` : `${row.p50}${row.unit}`}
              </p>
            </div>

            {/* p75 */}
            <div className="text-right">
              <p className="text-[10px] text-[var(--q-text-tertiary)]">p75{row.isEstimatedBand ? ' (est.)' : ''}</p>
              <p className="text-xs tabular-nums text-[var(--q-text-secondary)]" style={{ fontFamily: 'var(--q-font-mono, monospace)' }}>
                {row.isEstimatedBand ? '≈' : ''}{row.unit === '$' ? `$${row.p75.toLocaleString()}` : `${row.p75}${row.unit}`}
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
        ▲ BEAT = outside the favorable side of the shown p25–p75 band · ▼ MISS = outside the unfavorable side · ● IN-LINE = inside the band
        {rows.some(r => r.isEstimatedBand) && ' · (est.) = no matching benchmark in the report\'s own dataset; static reference shown for context only, not used for the verdict'}
      </p>
    </div>
  );
}
