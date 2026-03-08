/**
 * Versioned Benchmark Knowledge Store
 * 
 * Production-grade benchmark service that reads from the benchmark_store table
 * with geo-aware fallback: exact geo → regional → us_national → null.
 * Tracks source, version, and sample size for full audit trail.
 */

import { supabase } from '@/integrations/supabase/client';
import { BENCHMARK_DATABASE } from '@/lib/benchmark-calibrator';

// ─── Types ───

export interface BenchmarkRecord {
  id: string;
  industry_type: string;
  parameter: string;
  geo_scope: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  unit: string;
  source: string;
  source_year: number;
  sample_size: number | null;
  notes: string | null;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BenchmarkVersionRef {
  industry_type: string;
  parameter: string;
  geo_scope: string;
  version: number;
  source: string;
  source_year: number;
}

// ─── Geo Fallback Hierarchy ───

function getGeoFallbackChain(geo: string): string[] {
  const chain = [geo];
  // Extract regional from city slug (e.g., "denver_co" → "us_west")
  const regionMap: Record<string, string> = {
    '_ca': 'us_west', '_wa': 'us_west', '_or': 'us_west',
    '_co': 'us_west', '_az': 'us_west',
    '_ny': 'us_northeast', '_ma': 'us_northeast', '_pa': 'us_northeast',
    '_tx': 'us_south', '_fl': 'us_south', '_ga': 'us_south',
    '_nc': 'us_south', '_tn': 'us_south',
    '_il': 'us_midwest',
  };
  for (const [suffix, region] of Object.entries(regionMap)) {
    if (geo.endsWith(suffix) && geo !== region) {
      chain.push(region);
      break;
    }
  }
  if (!chain.includes('us_national')) chain.push('us_national');
  return chain;
}

// ─── Core API ───

/**
 * Get a single benchmark with geo fallback.
 * Returns the highest-version active record matching the fallback chain.
 */
export async function getBenchmark(
  industry: string,
  parameter: string,
  geo: string = 'us_national'
): Promise<BenchmarkRecord | null> {
  const geoChain = getGeoFallbackChain(geo);

  for (const geoScope of geoChain) {
    const { data, error } = await supabase
      .from('benchmark_store')
      .select('*')
      .eq('industry_type', industry)
      .eq('parameter', parameter)
      .eq('geo_scope', geoScope)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) return data as BenchmarkRecord;
  }

  return null;
}

/**
 * Get a specific version of a benchmark (for audit trail).
 */
export async function getBenchmarkVersion(
  industry: string,
  parameter: string,
  geo: string,
  version: number
): Promise<BenchmarkRecord | null> {
  const { data, error } = await supabase
    .from('benchmark_store')
    .select('*')
    .eq('industry_type', industry)
    .eq('parameter', parameter)
    .eq('geo_scope', geo)
    .eq('version', version)
    .maybeSingle();

  if (error || !data) return null;
  return data as BenchmarkRecord;
}

/**
 * List all active benchmarks for an industry (optionally filtered by geo).
 */
export async function listBenchmarksForIndustry(
  industry: string,
  geo: string = 'us_national'
): Promise<BenchmarkRecord[]> {
  // Get all active records for this industry with matching geo or us_national
  const geoChain = getGeoFallbackChain(geo);

  const { data, error } = await supabase
    .from('benchmark_store')
    .select('*')
    .eq('industry_type', industry)
    .eq('is_active', true)
    .in('geo_scope', geoChain)
    .order('parameter')
    .order('version', { ascending: false });

  if (error || !data) return [];

  // Deduplicate: for each parameter, prefer the most specific geo scope
  const bestByParam = new Map<string, BenchmarkRecord>();
  for (const record of data as BenchmarkRecord[]) {
    const existing = bestByParam.get(record.parameter);
    if (!existing) {
      bestByParam.set(record.parameter, record);
    } else {
      // Prefer more specific geo (earlier in chain = more specific)
      const existingGeoIdx = geoChain.indexOf(existing.geo_scope);
      const newGeoIdx = geoChain.indexOf(record.geo_scope);
      if (newGeoIdx < existingGeoIdx) {
        bestByParam.set(record.parameter, record);
      }
    }
  }

  return Array.from(bestByParam.values());
}

/**
 * Seed the benchmark_store from the hardcoded BENCHMARK_DATABASE.
 * Idempotent: checks if data already exists before inserting.
 */
export async function seedInitialBenchmarks(): Promise<{ inserted: number; skipped: number }> {
  // Check if any records already exist
  const { count } = await supabase
    .from('benchmark_store')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) {
    return { inserted: 0, skipped: count };
  }

  const records = BENCHMARK_DATABASE.map(b => ({
    industry_type: b.industryType,
    parameter: b.parameter,
    geo_scope: 'us_national',
    p10: b.p10,
    p25: b.p25,
    p50: b.p50,
    p75: b.p75,
    p90: b.p90,
    unit: b.unit,
    source: 'AIWMC Internal v1.0',
    source_year: 2025,
    sample_size: null,
    notes: `Migrated from embedded BENCHMARK_DATABASE. Original source: ${b.source}`,
    version: 1,
    is_active: true,
  }));

  // Insert in batches of 50
  let inserted = 0;
  for (let i = 0; i < records.length; i += 50) {
    const batch = records.slice(i, i + 50);
    const { error } = await supabase
      .from('benchmark_store')
      .insert(batch);
    if (!error) inserted += batch.length;
  }

  return { inserted, skipped: 0 };
}

/**
 * Collect benchmark version references used during a report generation.
 * Attach this to report_metadata.benchmark_versions for audit trail.
 */
export function collectBenchmarkVersionRefs(records: BenchmarkRecord[]): BenchmarkVersionRef[] {
  return records.map(r => ({
    industry_type: r.industry_type,
    parameter: r.parameter,
    geo_scope: r.geo_scope,
    version: r.version,
    source: r.source,
    source_year: r.source_year,
  }));
}
