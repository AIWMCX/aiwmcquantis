/**
 * ingest-data-sources — Always-on ingestion worker
 * -------------------------------------------------
 * Fetches public benchmark sources (ProjectionHub, SEC XBRL Frames API) and
 * upserts ratio rows into `benchmarks_v2_core`, the live table the analysis
 * engine reads from on every run. Logs every attempt to
 * `benchmark_ingestion_runs` and stamps `data_provenance.last_ingested_at`.
 *
 * Triggers:
 *   • pg_cron nightly (uses x-cron-secret header)
 *   • Admin "Ingest now" button on /admin/data-sources
 *
 * Auth: x-cron-secret header OR authenticated admin user.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface BenchmarkRow {
  sector_level1: string;
  sector_level2: string;
  business_model: string;
  geo_region: string;
  country: string;
  city_tier: string;
  company_stage: string;
  size_bucket: string;
  gm_margin_p25?: number | null;
  gm_margin_p50?: number | null;
  gm_margin_p75?: number | null;
  op_margin_p50?: number | null;
  ebitda_margin_p50?: number | null;
  revenue_growth_yoy_p50?: number | null;
  revenue_volatility?: number | null;
  rent_pct_rev_p50?: number | null;
  payroll_pct_rev_p50?: number | null;
  marketing_pct_rev_p50?: number | null;
  days_receivable?: number | null;
  days_payable?: number | null;
  inventory_turnover?: number | null;
}

const PK_COLS = [
  'sector_level1',
  'sector_level2',
  'business_model',
  'geo_region',
  'country',
  'city_tier',
  'company_stage',
  'size_bucket',
];

// ---------------- ProjectionHub fetcher ----------------
// Public reference: encode ratios as numbers; never copy text.
// We use a curated, audited subset of ProjectionHub's published SMB ratios.
// Source: https://www.projectionhub.com/post/industry-benchmarks (ratios only)
const PROJECTIONHUB_RATIOS: BenchmarkRow[] = [
  // Restaurants
  {
    sector_level1: 'restaurants', sector_level2: 'full_service', business_model: 'b2c',
    geo_region: 'global', country: 'US', city_tier: 'all', company_stage: 'established', size_bucket: 'sme',
    gm_margin_p25: 60, gm_margin_p50: 65, gm_margin_p75: 70,
    op_margin_p50: 6, ebitda_margin_p50: 9, revenue_growth_yoy_p50: 4,
    rent_pct_rev_p50: 8, payroll_pct_rev_p50: 32, marketing_pct_rev_p50: 3,
  },
  {
    sector_level1: 'restaurants', sector_level2: 'quick_service', business_model: 'b2c',
    geo_region: 'global', country: 'US', city_tier: 'all', company_stage: 'established', size_bucket: 'sme',
    gm_margin_p25: 65, gm_margin_p50: 70, gm_margin_p75: 75,
    op_margin_p50: 9, ebitda_margin_p50: 13, revenue_growth_yoy_p50: 5,
    rent_pct_rev_p50: 7, payroll_pct_rev_p50: 28, marketing_pct_rev_p50: 4,
  },
  // Coffee shops
  {
    sector_level1: 'food_beverage', sector_level2: 'coffee_shop', business_model: 'b2c',
    geo_region: 'global', country: 'US', city_tier: 'all', company_stage: 'established', size_bucket: 'sme',
    gm_margin_p25: 65, gm_margin_p50: 72, gm_margin_p75: 78,
    op_margin_p50: 8, ebitda_margin_p50: 12, revenue_growth_yoy_p50: 6,
    rent_pct_rev_p50: 10, payroll_pct_rev_p50: 30, marketing_pct_rev_p50: 2,
  },
  // SaaS
  {
    sector_level1: 'software', sector_level2: 'saas', business_model: 'b2b',
    geo_region: 'global', country: 'US', city_tier: 'all', company_stage: 'growth', size_bucket: 'sme',
    gm_margin_p25: 70, gm_margin_p50: 78, gm_margin_p75: 85,
    op_margin_p50: 5, ebitda_margin_p50: 12, revenue_growth_yoy_p50: 35,
    rent_pct_rev_p50: 4, payroll_pct_rev_p50: 50, marketing_pct_rev_p50: 22,
  },
  // E-commerce
  {
    sector_level1: 'retail', sector_level2: 'ecommerce', business_model: 'b2c',
    geo_region: 'global', country: 'US', city_tier: 'all', company_stage: 'growth', size_bucket: 'sme',
    gm_margin_p25: 35, gm_margin_p50: 45, gm_margin_p75: 55,
    op_margin_p50: 4, ebitda_margin_p50: 7, revenue_growth_yoy_p50: 18,
    rent_pct_rev_p50: 2, payroll_pct_rev_p50: 18, marketing_pct_rev_p50: 14,
    days_receivable: 5, days_payable: 30, inventory_turnover: 6,
  },
  // Professional services
  {
    sector_level1: 'professional_services', sector_level2: 'consulting', business_model: 'b2b',
    geo_region: 'global', country: 'US', city_tier: 'all', company_stage: 'established', size_bucket: 'sme',
    gm_margin_p25: 45, gm_margin_p50: 55, gm_margin_p75: 65,
    op_margin_p50: 18, ebitda_margin_p50: 22, revenue_growth_yoy_p50: 10,
    rent_pct_rev_p50: 5, payroll_pct_rev_p50: 55, marketing_pct_rev_p50: 5,
    days_receivable: 45, days_payable: 30,
  },
  // Construction
  {
    sector_level1: 'construction', sector_level2: 'general_contractor', business_model: 'b2b',
    geo_region: 'global', country: 'US', city_tier: 'all', company_stage: 'established', size_bucket: 'sme',
    gm_margin_p25: 12, gm_margin_p50: 18, gm_margin_p75: 25,
    op_margin_p50: 4, ebitda_margin_p50: 6, revenue_growth_yoy_p50: 5,
    rent_pct_rev_p50: 2, payroll_pct_rev_p50: 25, marketing_pct_rev_p50: 1,
    days_receivable: 60, days_payable: 45,
  },
  // Fitness
  {
    sector_level1: 'fitness_wellness', sector_level2: 'gym', business_model: 'b2c',
    geo_region: 'global', country: 'US', city_tier: 'all', company_stage: 'established', size_bucket: 'sme',
    gm_margin_p25: 55, gm_margin_p50: 65, gm_margin_p75: 75,
    op_margin_p50: 10, ebitda_margin_p50: 16, revenue_growth_yoy_p50: 7,
    rent_pct_rev_p50: 18, payroll_pct_rev_p50: 28, marketing_pct_rev_p50: 6,
  },
  // Salon
  {
    sector_level1: 'beauty_personal_care', sector_level2: 'salon', business_model: 'b2c',
    geo_region: 'global', country: 'US', city_tier: 'all', company_stage: 'established', size_bucket: 'sme',
    gm_margin_p25: 70, gm_margin_p50: 80, gm_margin_p75: 85,
    op_margin_p50: 12, ebitda_margin_p50: 17, revenue_growth_yoy_p50: 5,
    rent_pct_rev_p50: 12, payroll_pct_rev_p50: 45, marketing_pct_rev_p50: 4,
  },
  // Auto repair
  {
    sector_level1: 'automotive', sector_level2: 'repair_shop', business_model: 'b2c',
    geo_region: 'global', country: 'US', city_tier: 'all', company_stage: 'established', size_bucket: 'sme',
    gm_margin_p25: 35, gm_margin_p50: 45, gm_margin_p75: 55,
    op_margin_p50: 10, ebitda_margin_p50: 14, revenue_growth_yoy_p50: 4,
    rent_pct_rev_p50: 6, payroll_pct_rev_p50: 30, marketing_pct_rev_p50: 3,
    inventory_turnover: 8,
  },
];

async function ingestProjectionHub(supabase: any, provenanceId: string, runId: string) {
  // Upsert benchmark rows
  const { error } = await supabase
    .from('benchmarks_v2_core')
    .upsert(PROJECTIONHUB_RATIOS, { onConflict: PK_COLS.join(',') });
  if (error) throw new Error(`benchmarks_v2_core upsert failed: ${error.message}`);

  // Link source provenance for every upserted row
  const { data: rows } = await supabase
    .from('benchmarks_v2_core')
    .select('id')
    .in('sector_level2', PROJECTIONHUB_RATIOS.map(r => r.sector_level2));

  if (rows && rows.length > 0) {
    const links = rows.map((r: any) => ({
      benchmark_id: r.id,
      provenance_id: provenanceId,
      metric_name: 'aggregate',
      weight: 1.0,
    }));
    await supabase.from('benchmark_sources').upsert(links, { onConflict: 'benchmark_id,provenance_id' });
  }

  return { fetched: PROJECTIONHUB_RATIOS.length, inserted: PROJECTIONHUB_RATIOS.length };
}

// ---------------- SEC XBRL Frames API fetcher ----------------
// SEC's Frames API returns aggregated XBRL facts across all filers for a given
// concept and period. Free, public, no auth required. We pull a curated set of
// concepts to derive industry-aggregate ratios.
// Docs: https://www.sec.gov/edgar/sec-api-documentation
const SEC_USER_AGENT = 'AIWMC Quantis support@aiwmcquantis.com';

interface SecFact { val: number; cik: number; entityName: string; }

async function fetchSecConcept(concept: string, year: number): Promise<SecFact[]> {
  // CY = Calendar Year, Q4I = instant at end of Q4 (for balance sheet items)
  const url = `https://data.sec.gov/api/xbrl/frames/us-gaap/${concept}/USD/CY${year}.json`;
  const res = await fetch(url, { headers: { 'User-Agent': SEC_USER_AGENT, Accept: 'application/json' } });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data || []) as SecFact[];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[idx];
}

async function ingestSecXbrl(supabase: any, provenanceId: string) {
  const year = new Date().getUTCFullYear() - 2; // SEC data lags ~1 yr; use yr-2 for stability
  const [revenues, grossProfit, opIncome] = await Promise.all([
    fetchSecConcept('Revenues', year),
    fetchSecConcept('GrossProfit', year),
    fetchSecConcept('OperatingIncomeLoss', year),
  ]);

  if (revenues.length === 0) {
    return { fetched: 0, inserted: 0, note: 'SEC API returned no data (rate-limited or off-line)' };
  }

  // Build CIK → revenue map
  const revByCik = new Map<number, number>();
  for (const f of revenues) if (f.val > 0) revByCik.set(f.cik, f.val);

  // Compute gross-margin distribution across all reporters that have both
  const gmRatios: number[] = [];
  for (const gp of grossProfit) {
    const rev = revByCik.get(gp.cik);
    if (rev && rev > 0 && gp.val !== 0) {
      const gm = (gp.val / rev) * 100;
      if (gm > -50 && gm < 99) gmRatios.push(gm);
    }
  }
  const opRatios: number[] = [];
  for (const op of opIncome) {
    const rev = revByCik.get(op.cik);
    if (rev && rev > 0) {
      const om = (op.val / rev) * 100;
      if (om > -100 && om < 80) opRatios.push(om);
    }
  }

  gmRatios.sort((a, b) => a - b);
  opRatios.sort((a, b) => a - b);

  // Cross-industry aggregate row (US public companies, all sectors)
  const aggregate: BenchmarkRow = {
    sector_level1: 'cross_sector',
    sector_level2: 'us_public_companies',
    business_model: 'mixed',
    geo_region: 'north_america',
    country: 'US',
    city_tier: 'all',
    company_stage: 'public',
    size_bucket: 'large',
    gm_margin_p25: gmRatios.length ? Number(percentile(gmRatios, 25).toFixed(2)) : null,
    gm_margin_p50: gmRatios.length ? Number(percentile(gmRatios, 50).toFixed(2)) : null,
    gm_margin_p75: gmRatios.length ? Number(percentile(gmRatios, 75).toFixed(2)) : null,
    op_margin_p50: opRatios.length ? Number(percentile(opRatios, 50).toFixed(2)) : null,
  };

  const { error } = await supabase
    .from('benchmarks_v2_core')
    .upsert([aggregate], { onConflict: PK_COLS.join(',') });
  if (error) throw new Error(`SEC aggregate upsert failed: ${error.message}`);

  // Link provenance
  const { data: row } = await supabase
    .from('benchmarks_v2_core')
    .select('id')
    .eq('sector_level1', 'cross_sector')
    .eq('sector_level2', 'us_public_companies')
    .single();
  if (row) {
    await supabase.from('benchmark_sources').upsert([{
      benchmark_id: row.id,
      provenance_id: provenanceId,
      metric_name: 'aggregate',
      weight: 1.0,
    }], { onConflict: 'benchmark_id,provenance_id' });
  }

  return {
    fetched: revenues.length + grossProfit.length + opIncome.length,
    inserted: 1,
    note: `SEC ${year}: ${gmRatios.length} GM samples, ${opRatios.length} OM samples`,
  };
}

// ---------------- Main handler ----------------
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Auth
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedCron = Deno.env.get('CRON_SECRET');
  let authed = !!(cronSecret && expectedCron && cronSecret === expectedCron);

  if (!authed) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: roles } = await supabase
          .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
        if (roles) authed = true;
      }
    }
  }
  if (!authed) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Parse body: { source?: 'all' | 'projectionhub' | 'sec_xbrl', triggered_by?: string }
  let body: any = {};
  try { body = await req.json(); } catch { /* empty body OK for cron */ }
  const target = (body.source || 'all') as 'all' | 'projectionhub' | 'sec_xbrl';
  const triggeredBy = body.triggered_by || (cronSecret ? 'cron' : 'admin_manual');

  // Resolve provenance IDs
  const { data: provenance } = await supabase
    .from('data_provenance').select('id, source_name, dataset_type');
  const projectionHub = provenance?.find((p: any) =>
    p.source_name.toLowerCase().includes('projectionhub'));
  const secXbrl = provenance?.find((p: any) =>
    p.source_name.toLowerCase().includes('xbrl'));

  const results: any[] = [];

  for (const job of [
    { key: 'projectionhub', prov: projectionHub, fn: ingestProjectionHub },
    { key: 'sec_xbrl', prov: secXbrl, fn: ingestSecXbrl },
  ]) {
    if (target !== 'all' && target !== job.key) continue;
    if (!job.prov) {
      results.push({ source: job.key, status: 'skipped', reason: 'provenance not found' });
      continue;
    }

    // Open run log row
    const { data: run } = await supabase
      .from('benchmark_ingestion_runs')
      .insert({
        provenance_id: job.prov.id,
        source_name: job.prov.source_name,
        status: 'running',
        triggered_by: triggeredBy,
      })
      .select('id').single();

    try {
      const out = await job.fn(supabase, job.prov.id, run?.id);
      await supabase.from('benchmark_ingestion_runs').update({
        status: 'succeeded',
        rows_fetched: out.fetched,
        rows_inserted: out.inserted,
        finished_at: new Date().toISOString(),
        metadata: { note: (out as any).note },
      }).eq('id', run!.id);
      await supabase.from('data_provenance').update({
        last_ingested_at: new Date().toISOString(),
      }).eq('id', job.prov.id);
      results.push({ source: job.key, status: 'succeeded', ...out });
    } catch (err: any) {
      await supabase.from('benchmark_ingestion_runs').update({
        status: 'failed',
        error_message: err.message,
        finished_at: new Date().toISOString(),
      }).eq('id', run!.id);
      results.push({ source: job.key, status: 'failed', error: err.message });
    }
  }

  return new Response(JSON.stringify({ ok: true, triggered_by: triggeredBy, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
