/**
 * AIWMC Quantis — PRO Tier Extension Edge Function
 * ------------------------------------------------
 * Master Spec v1.0 §05.2. Extends a completed PLUS analysis with
 * investor-grade modules (5-year model, TAM/SAM/SOM, pitch deck data,
 * 12-week strategic roadmap).
 *
 * Pipeline:
 *   1. tierGate(ENDPOINTS.ANALYSE_PRO_EXTENSION) — PRO-only.
 *   2. Validate plus_analysis (must contain a valid PLUS JSON).
 *   3. Build PRO extension prompt.
 *   4. Lovable AI Gateway call.
 *   5. Strip output to PRO manifest (which is __ALL__ — pass-through).
 *
 * Returns: { success: true, data: ProExtensionJson, request_id, tier: 'PRO' }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeadersFor } from '../_shared/cors.ts';
import { tierGate } from '../_shared/tier-gate.ts';
import { buildSystemPrompt } from '../_shared/prompts.ts';
import { ENDPOINTS } from '../_shared/tier-spec.ts';
import { aiCall } from '../_shared/llm-call.ts';
import {
  CANONICAL_DATA_SOURCES_PROMPT,
  canonicalDataSourcesAsStrings,
  mergeCanonicalDataSources,
} from '../_shared/canonical-data-sources.ts';

// ── Live Benchmark Injector ────────────────────────────────────────────────────
// Pulls all 5 benchmark tables for the detected sector/geo combination.
// Used to ground TAM/SAM/SOM and 5-year projections in real data.
async function buildBenchmarkContext(plusAnalysis: Record<string, unknown>): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseKey) return '';

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract sector/geo from PLUS analysis output
    const benchmarks = (plusAnalysis as any)?.benchmarks ?? {};
    const sector_level1: string =
      benchmarks?.sector_level1 ?? (plusAnalysis as any)?.industry_detected ?? 'Services';
    const sector_level2: string = benchmarks?.sector_level2 ?? '';
    const business_model: string = benchmarks?.business_model ?? '';
    const country: string = benchmarks?.country ?? 'US';
    const city_tier: string = benchmarks?.city_tier ?? 'T2';
    const geo_region: string = benchmarks?.geo_region ?? 'US';

    // Cascading fallback filter levels
    const fallbackLevels = [
      { sector_level1, sector_level2, business_model, geo_region, country, city_tier },
      { sector_level1, sector_level2, business_model, geo_region, country },
      { sector_level1, sector_level2, business_model, geo_region },
      { sector_level1, business_model },
      { sector_level1 },
    ];

    async function fetchBm(table: string, cols: string): Promise<Record<string, unknown> | null> {
      for (const f of fallbackLevels) {
        let q = supabase.from(table).select(cols);
        for (const [k, v] of Object.entries(f)) if (v) q = (q as any).eq(k, v);
        const { data, error } = await (q as any).limit(1).maybeSingle();
        if (!error && data) return data as Record<string, unknown>;
      }
      return null;
    }

    const [core, ue, geo, risk, inv] = await Promise.all([
      fetchBm(
        'benchmark_master_core',
        'gm_margin_p25,gm_margin_p50,gm_margin_p75,op_margin_p50,ebitda_margin_p50,revenue_growth_yoy_p50,revenue_volatility'
      ),
      fetchBm(
        'benchmark_master_unit_econ',
        'cac_p25,cac_p50,cac_p75,ltv_p50,ltv_cac_ratio_p50,cac_payback_p50,churn_monthly_p50,retention_12m,arpu_median'
      ),
      fetchBm(
        'benchmark_master_geo',
        'cost_of_living_index,wage_multiplier,rent_multiplier,consumer_spend_index'
      ),
      fetchBm(
        'benchmark_master_risk',
        'risk_market_volatility,risk_regulatory,risk_operational,median_survival_years,failure_mode_1,failure_mode_2,failure_mode_3'
      ),
      fetchBm(
        'benchmark_master_invoice',
        'avg_invoice_terms_days,late_payment_rate,bad_debt_pct_rev,safe_dscr_threshold,max_safe_invoice_to_rev_ratio'
      ),
    ]);

    if (!core && !ue) return '';

    const parts = [
      `LIVE_BENCHMARK_CONTEXT (AIWMC Quantis Master v2, 97,500 data points):`,
      `Sector: ${sector_level1}${sector_level2 ? ' > ' + sector_level2 : ''} | Model: ${business_model} | Geo: ${country} ${city_tier}`,
    ];
    if (core)
      parts.push(
        `CORE MARGINS: GM=${core.gm_margin_p50} (${core.gm_margin_p25}–${core.gm_margin_p75}) | OpMargin=${core.op_margin_p50} | EBITDA=${core.ebitda_margin_p50} | RevGrowth=${core.revenue_growth_yoy_p50} | Volatility=${core.revenue_volatility}`
      );
    if (ue)
      parts.push(
        `UNIT ECON: CAC=${ue.cac_p50} (${ue.cac_p25}–${ue.cac_p75}) | LTV=${ue.ltv_p50} | LTV/CAC=${ue.ltv_cac_ratio_p50} | Payback=${ue.cac_payback_p50}mo | Churn=${ue.churn_monthly_p50}/mo | Retention12m=${ue.retention_12m} | ARPU=${ue.arpu_median}`
      );
    if (geo)
      parts.push(
        `GEO: CoL=${geo.cost_of_living_index} | Wage=${geo.wage_multiplier}x | Rent=${geo.rent_multiplier}x | ConsumerSpend=${geo.consumer_spend_index}`
      );
    if (risk)
      parts.push(
        `RISK: MarketVol=${risk.risk_market_volatility} | Regulatory=${risk.risk_regulatory} | SurvivalYrs=${risk.median_survival_years} | TopFailures: "${risk.failure_mode_1}", "${risk.failure_mode_2}", "${risk.failure_mode_3}"`
      );
    if (inv)
      parts.push(
        `INVOICE: Terms=${inv.avg_invoice_terms_days}d | LateRate=${inv.late_payment_rate} | BadDebt=${inv.bad_debt_pct_rev} | SafeDSCR=${inv.safe_dscr_threshold}`
      );
    parts.push(
      `USE THESE BENCHMARKS to size TAM/SAM/SOM, calibrate 5-year projections, and anchor risk ratings. Deviations >30% from p50 must be explicitly justified.`
    );

    return '\n\nLIVE_BENCHMARK_CONTEXT:\n' + parts.join('\n');
  } catch {
    return '';
  }
}

const DEFAULT_MODEL = 'deepseek-v4-flash'; // Fix #3 — legacy 'deepseek-chat' retires 2026-07-24
interface ProRequestBody {
  plus_analysis: Record<string, unknown>;
  market_data?: Record<string, unknown>;
  model?: string;
}

serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const requestId = crypto.randomUUID();
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
    });

  try {
    const gate = await tierGate(req, ENDPOINTS.ANALYSE_PRO_EXTENSION);
    if (gate.blocked) return json(gate.body, gate.status);

    const body = (await req.json().catch(() => ({}))) as ProRequestBody;
    if (!body.plus_analysis || typeof body.plus_analysis !== 'object') {
      return json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'plus_analysis is required (run /analyze-plus first).',
        },
        400
      );
    }
    if (body.plus_analysis.tier !== 'PLUS' && body.plus_analysis.tier !== 'PRO') {
      return json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'plus_analysis.tier must be "PLUS" (or "PRO" for refresh).',
        },
        400
      );
    }

    const { system, budget } = buildSystemPrompt('PRO', 'pro_extension');

    // Fetch live benchmarks keyed to the sector/geo from the PLUS analysis
    const benchmarkContext = await buildBenchmarkContext(body.plus_analysis).catch(() => '');

    const userBlock = [
      `PARENT_ANALYSIS_ID: ${(body.plus_analysis.analysis_id as string) ?? requestId}`,
      benchmarkContext,
      ``,
      `PLUS_ANALYSIS_CONTEXT:`,
      JSON.stringify(body.plus_analysis, null, 2),
      ``,
      `MARKET_DATA_CONTEXT:`,
      JSON.stringify(body.market_data ?? {}, null, 2),
    ].join('\n');

    const aiResult = await aiCall(
      {
        model: body.model ?? DEFAULT_MODEL,
        messages: [
          { role: 'system', content: `${system}\n\n${CANONICAL_DATA_SOURCES_PROMPT}` },
          { role: 'user', content: userBlock },
        ],
        temperature: budget.temperature,
        top_p: budget.top_p,
        max_tokens: budget.max_tokens,
        response_format: { type: 'json_object' },
      },
      {
        task: 'analyze-pro-extension',
        timeoutMs: budget.timeout_ms,
        injectUniversalRules: false,
        userId: gate.userId,
        requestId,
        metadata: { tier: gate.tier, endpoint: 'ANALYSE_PRO_EXTENSION' },
      }
    );
    if (!aiResult.ok) {
      return json(
        { success: false, error: aiResult.error, message: aiResult.message },
        aiResult.status
      );
    }
    const aiJson = aiResult.data as { choices?: Array<{ message?: { content?: string } }> };
    const rawContent = aiJson.choices?.[0]?.message?.content ?? '{}';
    let parsed: Record<string, unknown> = {};
    try {
      parsed = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
    } catch {
      return json(
        { success: false, error: 'SCHEMA_PARSE', message: 'Model returned invalid JSON.' },
        502
      );
    }

    parsed.tier = 'PRO';
    parsed.parent_analysis_id =
      (parsed.parent_analysis_id as string) ||
      (body.plus_analysis.analysis_id as string) ||
      requestId;
    parsed.pro_generated_at = (parsed.pro_generated_at as string) || new Date().toISOString();

    // Force canonical provenance into data_sources (merge, dedup) so PRO PDFs
    // cite the same ingested datasets as Free/Plus tiers.
    const incomingSources = Array.isArray(parsed.data_sources)
      ? (parsed.data_sources as unknown[]).filter((s): s is string => typeof s === 'string')
      : typeof parsed.sources === 'string'
        ? (parsed.sources as string).split(/[,;]\s*/).filter(Boolean)
        : [];
    parsed.data_sources = mergeCanonicalDataSources(incomingSources);
    parsed.sources = canonicalDataSourcesAsStrings().join('; ');

    return json({
      success: true,
      tier: 'PRO',
      request_id: requestId,
      data: parsed,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[analyze-pro-extension] fatal', message);
    return json({ success: false, error: 'INTERNAL', message, request_id: requestId }, 500);
  }
});
