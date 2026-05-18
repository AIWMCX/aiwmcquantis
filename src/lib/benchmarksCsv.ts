/**
 * benchmarksCsv — convert `metadata.benchmarks[]` into a downloadable CSV.
 *
 * Spec:
 *   metric, your_value, p25, median, p75, sample_size, match_type, match_level,
 *   source, dataset_date, unit
 *
 * Numeric values are written in their *engine-native* unit (percentages stay as
 * fractions, USD as raw numbers, etc.) so spreadsheets can chart them without
 * extra parsing. A human-readable "unit" column tells the reader how to read it.
 */
import type { BenchmarkRecord } from '@/components/analysis/BenchmarkRecordsBlock';

const HEADER = [
  'metric',
  'your_value',
  'p25',
  'median',
  'p75',
  'sample_size',
  'match_type',
  'match_level',
  'source',
  'dataset_date',
  'unit',
] as const;

function escape(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return '';
  const s = String(field);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function benchmarksToCsv(records: BenchmarkRecord[] | null | undefined): string {
  const rows: string[] = [HEADER.join(',')];
  if (!records || records.length === 0) return rows.join('\n');
  for (const r of records) {
    rows.push(
      [
        escape(r.metric),
        escape(r.value),
        escape(r.p25),
        escape(r.median),
        escape(r.p75),
        escape(r.sample_size),
        escape(r.match_type),
        escape(r.match_level),
        escape(r.source),
        escape(r.dataset_date),
        escape(r.unit),
      ].join(',')
    );
  }
  return rows.join('\n');
}

export function downloadBenchmarksCsv(
  records: BenchmarkRecord[] | null | undefined,
  filename = 'quantis-benchmarks.csv'
): void {
  const csv = benchmarksToCsv(records);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
