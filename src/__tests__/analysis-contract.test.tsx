/**
 * analysis-contract.test.ts
 *
 * Contract tests for the Benchmark-First analysis pipeline:
 *   1. Zod boundary schemas reject malformed engine responses.
 *   2. AnalysisErrorPanel surfaces ANALYSIS_UNAVAILABLE with a retry CTA.
 *   3. BenchmarkRecordsBlock renders P25/Median/P75 strictly from metadata.benchmarks[]
 *      and never invents values when the array is empty.
 *
 * These run in jsdom via vitest and never touch the network.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { z } from 'zod';
import { benchmarksToCsv } from '@/lib/benchmarksCsv';
import {
  BenchmarkRecordsBlock,
  type BenchmarkRecord,
} from '@/components/analysis/BenchmarkRecordsBlock';
import { AnalysisErrorPanel } from '@/components/analysis/AnalysisErrorPanel';

// Mirror of supabase/functions/analyze-business/boundary-schemas.ts:BenchmarkRecord.
// Kept inline so this test does not import Deno-only code.
const BenchmarkRecordSchema = z.object({
  metric: z.string().min(1),
  unit: z.enum(['percent', 'months', 'usd', 'ratio']),
  value: z.number().nullable(),
  p25: z.number().nullable(),
  median: z.number().nullable(),
  p75: z.number().nullable(),
  sample_size: z.number().int().nonnegative(),
  source: z.string().nullable(),
  dataset_date: z.string().nullable(),
  match_type: z.enum(['direct', 'similar', 'none']),
  match_level: z.string().nullable(),
});
const ResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    metadata: z.object({
      benchmark_mode: z.enum(['live', 'unavailable']),
      benchmarks: z.array(BenchmarkRecordSchema),
    }),
  }),
});

const goodRecord: BenchmarkRecord = {
  metric: 'gross_margin',
  unit: 'percent',
  value: 0.62,
  p25: 0.5,
  median: 0.6,
  p75: 0.72,
  sample_size: 1280,
  source: 'XBRL 2024',
  dataset_date: '2024-12-31',
  match_type: 'direct',
  match_level: 'industry+region',
};

describe('Zod boundary — analyze-business response', () => {
  it('accepts a well-formed live response', () => {
    const ok = ResponseSchema.safeParse({
      success: true,
      data: {
        metadata: { benchmark_mode: 'live', benchmarks: [goodRecord] },
      },
    });
    expect(ok.success).toBe(true);
  });

  it('rejects responses with a junk match_type', () => {
    const bad = ResponseSchema.safeParse({
      success: true,
      data: {
        metadata: {
          benchmark_mode: 'live',
          benchmarks: [{ ...goodRecord, match_type: 'maybe' }],
        },
      },
    });
    expect(bad.success).toBe(false);
  });

  it('rejects responses with NaN percentiles', () => {
    const bad = ResponseSchema.safeParse({
      success: true,
      data: {
        metadata: {
          benchmark_mode: 'live',
          benchmarks: [{ ...goodRecord, median: 'broken' as unknown as number }],
        },
      },
    });
    expect(bad.success).toBe(false);
  });
});

describe('AnalysisErrorPanel — ANALYSIS_UNAVAILABLE handling', () => {
  it('renders a retry button and preserves-inputs guidance', () => {
    render(<AnalysisErrorPanel error={new Error('ANALYSIS_UNAVAILABLE: engine offline')} onRetry={() => {}} />);
    expect(screen.getByText(/Analysis engine temporarily unreachable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByText(/inputs are preserved/i)).toBeInTheDocument();
  });

  it('renders SCHEMA_INVALID with integrity-check copy', () => {
    render(
      <AnalysisErrorPanel
        error={new Error('RESPONSE_SCHEMA_INVALID: benchmarks shape')}
        onRetry={() => {}}
      />
    );
    expect(screen.getByText(/integrity check/i)).toBeInTheDocument();
  });
});

describe('BenchmarkRecordsBlock — P25/Median/P75 from metadata.benchmarks[]', () => {
  it('renders all percentile columns from a single record', () => {
    render(
      <BenchmarkRecordsBlock
        records={[goodRecord]}
        mode="live"
        summary={{ direct: 1, similar: 0, none: 0, total: 1 }}
      />
    );
    // Gross Margin formatted from 0.62 → 62.0%
    expect(screen.getByText(/62\.0%/)).toBeInTheDocument(); // your value
    expect(screen.getByText(/50\.0%/)).toBeInTheDocument(); // p25
    expect(screen.getByText(/60\.0%/)).toBeInTheDocument(); // median
    expect(screen.getByText(/72\.0%/)).toBeInTheDocument(); // p75
    expect(screen.getByText(/Direct/i)).toBeInTheDocument();
  });

  it('says "no benchmark records" when the engine returned nothing', () => {
    render(<BenchmarkRecordsBlock records={[]} mode="unavailable" />);
    expect(screen.getByText(/No benchmark records were returned/i)).toBeInTheDocument();
  });
});

describe('benchmarksToCsv', () => {
  it('emits a header even for empty records', () => {
    const csv = benchmarksToCsv([]);
    expect(csv.split('\n')[0]).toContain('metric,your_value,p25,median,p75');
  });

  it('round-trips a record with percentiles + match_type', () => {
    const csv = benchmarksToCsv([goodRecord]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('gross_margin');
    expect(lines[1]).toContain('0.62');
    expect(lines[1]).toContain('direct');
    expect(lines[1]).toContain('XBRL 2024');
  });

  it('escapes commas and quotes in source strings', () => {
    const csv = benchmarksToCsv([
      { ...goodRecord, source: 'Vendor, Inc. "official" data' },
    ]);
    expect(csv).toMatch(/"Vendor, Inc\. ""official"" data"/);
  });
});
