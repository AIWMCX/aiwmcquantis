import React from 'react';
import type { BusinessAnalysisResult } from '@/types/analysis';
import { pdfStyles } from './pdfStyles';
import { ReportHeader, ReportFooter } from './ReportPageElements';

/**
 * ReportBenchmarks — PDF page that renders ONLY `metadata.benchmarks[]`.
 *
 * Step 8 of the Benchmark-First Hardening Plan. No recomputed percentiles,
 * no legacy `benchmark_source` lookups, no synthesised "industry average"
 * numbers. If the engine did not ship a record, we print "—" with a
 * "No match" badge.
 */

interface Props {
  result: BusinessAnalysisResult;
}

type MatchType = 'direct' | 'similar' | 'none';
interface Rec {
  metric: string;
  unit: 'percent' | 'months' | 'usd' | 'ratio';
  value: number | null;
  p25: number | null;
  median: number | null;
  p75: number | null;
  sample_size: number;
  source: string | null;
  dataset_date: string | null;
  match_type: MatchType;
}

const LABELS: Record<string, string> = {
  gross_margin: 'Gross Margin',
  operating_margin: 'Operating Margin',
  net_margin: 'Net Margin',
  revenue_growth_yoy: 'Revenue Growth YoY',
  cac: 'CAC',
  ltv: 'LTV',
  ltv_cac_ratio: 'LTV : CAC',
  cac_payback_months: 'CAC Payback',
  churn_monthly: 'Monthly Churn',
  retention_12m: '12-mo Retention',
  arpu: 'ARPU',
  rent_pct_rev: 'Rent % of Revenue',
  payroll_pct_rev: 'Payroll % of Revenue',
  marketing_pct_rev: 'Marketing % of Revenue',
  survival_years: 'Median Survival',
};

function fmt(v: number | null, unit: Rec['unit']): string {
  if (v === null || !Number.isFinite(v)) return '—';
  // Same class of leak found and fixed elsewhere in the Handbook §19
  // five-analysis audit (2026-07-12): 999 is the engine's internal
  // "not achieved within horizon" sentinel, never a real month count.
  if (unit === 'months' && v >= 999) return 'N/A';
  if (unit === 'percent')
    return Math.abs(v) <= 1.5 ? `${(v * 100).toFixed(1)}%` : `${v.toFixed(1)}%`;
  if (unit === 'months') return `${v.toFixed(1)} mo`;
  if (unit === 'usd') return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return `${v.toFixed(2)}×`;
}

const MATCH_COLOR: Record<MatchType, string> = {
  direct: '#10b981',
  similar: '#f59e0b',
  none: '#94a3b8',
};

export function ReportBenchmarks({ result }: Props) {
  const meta = (result.metadata ?? {}) as Record<string, unknown>;
  const records = (meta.benchmarks as Rec[] | undefined) ?? [];
  const mode = (meta.benchmark_mode as 'live' | 'unavailable' | undefined) ?? 'unavailable';
  const summary = meta.benchmark_match_summary as
    | { direct: number; similar: number; none: number; total: number }
    | undefined;
  const source = records[0]?.source ?? 'AIWMC Quantis Benchmark Master';

  return (
    <div style={pdfStyles.page}>
      <ReportHeader title="Benchmarks" idea={result.metadata.idea} pageNumber={7} />

      <div style={pdfStyles.sectionTitle}>Live Benchmark Block</div>
      <div style={{ ...pdfStyles.paragraph, fontSize: 10, color: '#94a3b8' }}>
        Mode:{' '}
        <span style={{ color: mode === 'live' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
          {mode}
        </span>
        {summary
          ? `  ·  Direct ${summary.direct} / Similar ${summary.similar} / None ${summary.none} of ${summary.total}`
          : null}
      </div>

      {records.length === 0 ? (
        <div style={pdfStyles.paragraph}>
          No benchmark records were returned by the engine. This report shows engine-computed values
          only; no percentile comparisons are claimed.
        </div>
      ) : (
        <table style={pdfStyles.table}>
          <thead>
            <tr>
              <th style={pdfStyles.tableHeader}>Metric</th>
              <th style={{ ...pdfStyles.tableHeader, textAlign: 'right' }}>Your value</th>
              <th style={{ ...pdfStyles.tableHeader, textAlign: 'right' }}>P25</th>
              <th style={{ ...pdfStyles.tableHeader, textAlign: 'right' }}>Median</th>
              <th style={{ ...pdfStyles.tableHeader, textAlign: 'right' }}>P75</th>
              <th style={{ ...pdfStyles.tableHeader, textAlign: 'center' }}>Match</th>
              <th style={{ ...pdfStyles.tableHeader, textAlign: 'right' }}>n</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.metric}>
                <td style={pdfStyles.tableCell}>{LABELS[r.metric] ?? r.metric}</td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'right', fontWeight: 600 }}>
                  {fmt(r.value, r.unit)}
                </td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>{fmt(r.p25, r.unit)}</td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                  {fmt(r.median, r.unit)}
                </td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>{fmt(r.p75, r.unit)}</td>
                <td
                  style={{
                    ...pdfStyles.tableCell,
                    textAlign: 'center',
                    color: MATCH_COLOR[r.match_type],
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontSize: 9,
                  }}
                >
                  {r.match_type}
                </td>
                <td style={{ ...pdfStyles.tableCell, textAlign: 'right' }}>
                  {r.sample_size > 0 ? r.sample_size : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ ...pdfStyles.paragraph, fontSize: 9, color: '#94a3b8', marginTop: 12 }}>
        Source: {source}. Percentiles are rendered exactly as the engine produced them — this page
        does not recompute or interpolate values.
      </div>

      <ReportFooter pageNumber={7} />
    </div>
  );
}
