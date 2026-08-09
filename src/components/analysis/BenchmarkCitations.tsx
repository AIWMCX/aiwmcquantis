/**
 * BenchmarkCitations — single panel that lists every benchmark cited
 * in the analysis with P25/P50/P75 range, source, sample size, and date.
 * Backed by the AIWMC Quantis Benchmark Master library.
 *
 * Prefers the server-computed match from result.metadata.benchmarks
 * (`serverRecords` prop) when available for a metric, falling back to the
 * client-side benchmark_lookup RPC only for metrics the server doesn't
 * cover. See P0-5 (Handbook §19, 2026-07-12 audit) for why: these were
 * previously two independent systems that could disagree on the same
 * metric in the same report.
 */
import React, { useEffect, useState } from 'react';
import { Database, Loader2 } from 'lucide-react';
import {
  lookupBenchmark,
  formatBenchmarkValue,
  type BenchmarkContext,
  type BenchmarkMetric,
  type BenchmarkResult,
} from '@/services/benchmark-lookup';

export interface CitedMetric {
  label: string;
  metric: BenchmarkMetric;
  userValue?: number;
}

/** Shape of supabase/functions/analyze-business/benchmark-records.ts's BenchmarkRecord. */
export interface ServerBenchmarkRecord {
  metric: string;
  value: number | null;
  p25: number | null;
  median: number | null;
  p75: number | null;
  sample_size: number;
  source: string | null;
  match_type: 'direct' | 'similar' | 'none' | string;
}

interface BenchmarkCitationsProps {
  metrics: CitedMetric[];
  context: BenchmarkContext;
  className?: string;
  /**
   * Handbook §19 P0-5 (2026-07-12 audit): the server computes its own
   * benchmark match once, at analysis time, and stores it in
   * result.metadata.benchmarks — this is the SAME data the "Live Benchmark
   * Block" (BenchmarkRecordsBlock.tsx) renders. Before this fix, this component
   * always re-queried a completely separate client-side RPC
   * (benchmark_lookup, a different table with a different row count),
   * fresh on every render, with no knowledge of the server's own match —
   * so the same metric on the same report could show "DIRECT" in one
   * place and "Engine fallback" in the other. When a server record exists
   * for a requested metric, it now wins; the client RPC is only used as a
   * fallback for metrics the server-side benchmark set doesn't cover
   * (e.g. survival_years).
   */
  serverRecords?: ServerBenchmarkRecord[];
}

/** cac_payback (client-side metric key) vs cac_payback_months (server key). */
export const CLIENT_TO_SERVER_METRIC: Record<string, string> = {
  cac_payback: 'cac_payback_months',
};

export function serverRecordToResult(rec: ServerBenchmarkRecord, metric: BenchmarkMetric): BenchmarkResult {
  if (rec.match_type === 'none' || rec.p25 === null || rec.median === null || rec.p75 === null) {
    return { matched: false, metric, reason: 'engine_fallback' };
  }
  return {
    matched: true,
    metric,
    p25: rec.p25,
    p50: rec.median,
    p75: rec.p75,
    source: rec.source ?? undefined,
    sampleSize: rec.sample_size,
  };
}

const METRIC_LABELS: Record<string, string> = {
  gross_margin: 'Gross Margin',
  operating_margin: 'Operating Margin',
  ltv_cac_ratio: 'LTV : CAC',
  cac: 'CAC',
  ltv: 'LTV',
  cac_payback: 'CAC Payback',
  churn_monthly: 'Monthly Churn',
  arpu: 'ARPU',
  survival_years: 'Survival',
  rent_pct_rev: 'Rent % Revenue',
  payroll_pct_rev: 'Payroll % Revenue',
  marketing_pct_rev: 'Marketing % Revenue',
};

/** Percent-style metrics arrive as fractions (0.56 = 56%). */
const PERCENT_METRICS = new Set([
  'gross_margin', 'operating_margin', 'churn_monthly',
  'rent_pct_rev', 'payroll_pct_rev', 'marketing_pct_rev',
]);

/**
 * Engine sentinel/garbage guard: a 999-month payback sentinel or a
 * -62,794% operating margin must never render as a real number.
 */
function isDisplayable(metric: string, v: number | undefined): v is number {
  if (v == null || !Number.isFinite(v)) return false;
  if (metric === 'cac_payback' && (v >= 999 || v <= 0)) return false;
  if (metric === 'survival_years' && (v <= 0 || v > 100)) return false;
  if (PERCENT_METRICS.has(metric) && Math.abs(v) > 5) return false; // |500%|+
  if (metric === 'ltv_cac_ratio' && (v <= 0 || v > 100)) return false;
  return true;
}

export function BenchmarkCitations({ metrics, context, className, serverRecords }: BenchmarkCitationsProps) {
  const [rows, setRows] = useState<Array<CitedMetric & { b: BenchmarkResult }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      metrics.map(async (m) => {
        const serverKey = CLIENT_TO_SERVER_METRIC[m.metric] ?? m.metric;
        const serverRec = serverRecords?.find((r) => r.metric === serverKey);
        if (serverRec) {
          return { ...m, b: serverRecordToResult(serverRec, m.metric) };
        }
        return { ...m, b: await lookupBenchmark(m.metric, context) };
      })
    ).then((r) => { if (!cancelled) setRows(r); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(metrics), JSON.stringify(serverRecords), context.sector, context.country, context.cityTier, context.stage, context.size, context.businessModel]);

  return (
    <section className={className} aria-labelledby="bench-citations-h">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[var(--q-accent-primary)]" />
          <h3 id="bench-citations-h" className="font-semibold text-sm">Benchmark Citations</h3>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">
          AIWMC Quantis Benchmark Master
        </span>
      </header>

      {!rows ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Looking up sources…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-[var(--q-border-default)]">
                <th className="text-left py-1.5 pr-3">Metric</th>
                <th className="text-right py-1.5 pr-3">Your value</th>
                <th className="text-right py-1.5 pr-3">P25 – P75</th>
                <th className="text-right py-1.5 pr-3">Median</th>
                <th className="text-left py-1.5 pr-3">Source</th>
                <th className="text-right py-1.5">n · date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const label = r.label || METRIC_LABELS[r.metric] || r.metric;
                const fmt = (v?: number) => formatBenchmarkValue(r.metric, v);
                if (!r.b.matched) {
                  return (
                    <tr key={r.metric} className="border-b border-[var(--q-border-subtle)]">
                      <td className="py-1.5 pr-3">{label}</td>
                      <td className="py-1.5 pr-3 text-right font-mono">{isDisplayable(r.metric, r.userValue) ? fmt(r.userValue) : '—'}</td>
                      <td className="py-1.5 pr-3 text-right text-[var(--q-status-yellow)]" colSpan={2}>
                        Estimated · No direct benchmark
                      </td>
                      <td className="py-1.5 pr-3 text-muted-foreground">Engine fallback</td>
                      <td className="py-1.5 text-right font-mono text-muted-foreground">—</td>
                    </tr>
                  );
                }
                return (
                  <tr key={r.metric} className="border-b border-[var(--q-border-subtle)]">
                    <td className="py-1.5 pr-3">{label}</td>
                    <td className="py-1.5 pr-3 text-right font-mono">{r.userValue != null ? fmt(r.userValue) : '—'}</td>
                    <td className="py-1.5 pr-3 text-right font-mono">{fmt(r.b.p25)} – {fmt(r.b.p75)}</td>
                    <td className="py-1.5 pr-3 text-right font-mono">{fmt(r.b.p50)}</td>
                    <td className="py-1.5 pr-3">{r.b.source ?? 'AIWMC'}</td>
                    <td className="py-1.5 text-right font-mono text-muted-foreground">
                      n={r.b.sampleSize?.toLocaleString() ?? '—'} · {(r.b.dataDate ?? '').slice(0, 7)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground">
        Every numeric metric in this report is matched against the AIWMC Quantis Benchmark
        Master library — the same match computed once for this analysis. When no direct match
        exists, we mark the value as "Estimated" and flag the wider uncertainty band.
      </p>
    </section>
  );
}
