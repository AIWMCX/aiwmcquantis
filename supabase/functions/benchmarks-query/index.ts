// Thin wrapper around the `benchmark_lookup` RPC. Lets CI and external
// callers test that the 95,500-row dataset actually returns real P25/P50/P75
// values, independent of the analyze-business orchestration.
//
// POST /benchmarks/query
// Body: { context: { sector, sub_sector?, business_model?, country?, city_tier?, stage?, size? },
//         metrics: string[] }
//
// Returns: { matches: BenchmarkRecord[] }

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeadersFor } from '../_shared/cors.ts';

type MatchType = 'direct' | 'similar' | 'none';

interface RpcRow {
  matched: boolean;
  metric?: string;
  match_level?: string;
  p25?: number | null;
  p50?: number | null;
  p75?: number | null;
  source?: string | null;
  sample_size?: number | null;
  data_version?: string | null;
  data_date?: string | null;
  reason?: string;
}

const DIRECT_LEVELS = new Set(['exact', 'no_size', 'no_city']);

function levelToMatchType(level: string | undefined | null): MatchType {
  if (!level) return 'none';
  if (DIRECT_LEVELS.has(level)) return 'direct';
  if (level === 'sector_model' || level === 'sector_only') return 'similar';
  return 'none';
}

function unitFor(metric: string): 'percent' | 'months' | 'usd' | 'ratio' {
  if (
    metric.endsWith('_pct_rev') ||
    metric.endsWith('_margin') ||
    metric.endsWith('_growth_yoy') ||
    metric.startsWith('churn') ||
    metric.startsWith('retention') ||
    metric === 'late_payment_rate' ||
    metric === 'bad_debt_pct_rev'
  )
    return 'percent';
  if (metric.endsWith('_months') || metric === 'invoice_terms_days' || metric === 'survival_years')
    return 'months';
  if (metric === 'cac' || metric === 'ltv' || metric === 'arpu') return 'usd';
  return 'ratio';
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const ctx = body?.context ?? {};
  const metrics: string[] = Array.isArray(body?.metrics) ? body.metrics : [];
  if (metrics.length === 0 || metrics.length > 50) {
    return new Response(
      JSON.stringify({ error: 'metrics must be a non-empty array of at most 50 entries' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Benchmark service is not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const results = await Promise.all(
    metrics.map(async (metric) => {
      try {
        const { data, error } = await supabase.rpc('benchmark_lookup', {
          p_metric: metric,
          p_sector: ctx.sector ?? null,
          p_business_model: ctx.business_model ?? null,
          p_country: ctx.country ?? null,
          p_city_tier: ctx.city_tier ?? null,
          p_stage: ctx.stage ?? null,
          p_size: ctx.size ?? null,
        });
        if (error) {
          return {
            metric,
            unit: unitFor(metric),
            value: null,
            p25: null,
            median: null,
            p75: null,
            sample_size: 0,
            source: null,
            dataset_date: null,
            match_type: 'none' as MatchType,
            match_level: null,
            error: error.message,
          };
        }
        const row = (data as RpcRow) || { matched: false };
        const matchType = row.matched ? levelToMatchType(row.match_level) : 'none';
        return {
          metric,
          unit: unitFor(metric),
          value: null,
          p25: row.p25 ?? null,
          median: row.p50 ?? null,
          p75: row.p75 ?? null,
          sample_size: row.sample_size ?? 0,
          source: row.source ?? null,
          dataset_date: row.data_date ?? null,
          match_type: matchType,
          match_level: row.match_level ?? null,
        };
      } catch (e) {
        return {
          metric,
          unit: unitFor(metric),
          value: null,
          p25: null,
          median: null,
          p75: null,
          sample_size: 0,
          source: null,
          dataset_date: null,
          match_type: 'none' as MatchType,
          match_level: null,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    })
  );

  return new Response(JSON.stringify({ status: 'ok', matches: results }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
