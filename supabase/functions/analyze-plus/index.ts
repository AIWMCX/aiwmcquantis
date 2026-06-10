/**
 * AIWMC Quantis — PLUS Tier Main Analysis Edge Function
 * ----------------------------------------------------
 * Master Spec v1.0 §04.2. Entry point for the PLUS-tier full analysis.
 *
 * Pipeline:
 *   1. tierGate(ENDPOINTS.ANALYSE_MAIN) — enforce PLUS+ subscription.
 *   2. Validate + sanitize inputs (reuse analyze-business safety guardrails).
 *   3. Receive pre-computed MONTE_CARLO_DATA from the client (browser engine,
 *      src/lib/monte-carlo.ts). Spec calls for 95,500 scenarios; the client
 *      decides the actual count and the LLM only references what it sees.
 *   4. Build PLUS system prompt via buildSystemPrompt('PLUS', 'main').
 *   5. Lovable AI Gateway call (google/gemini-2.5-pro by default).
 *   6. Strip non-PLUS fields per FEATURE_MANIFEST.allowed_output_fields.
 *   7. Increment monthly usage and persist to ai_calls / analyses (best-effort).
 *
 * Returns: { success: true, data: PlusAnalysisJson, request_id, tier: 'PLUS' }
 *          or 402 TierGateBlock body on insufficient tier.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeadersFor } from '../_shared/cors.ts';
import { tierGate, incrementMonthlyUsage } from '../_shared/tier-gate.ts';
import { buildSystemPrompt } from '../_shared/prompts.ts';
import { ENDPOINTS, type FeatureManifest } from '../_shared/tier-spec.ts';
import { validateAndSanitizeInput } from '../_shared/ai-safety-guardrails.ts';
import { logAnalysisEvent } from '../_shared/analysis-event-logger.ts';
import { aiCall } from '../_shared/llm-call.ts';

// ── Live Benchmark Fetcher (pulls from benchmark_master_* tables) ────────────

async function fetchLiveBenchmarks(
  idea: string,
  location: string,
  industry?: string,
  stage?: string
): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseKey) return '';

  // Sector detection from idea text
  const lower = (idea + ' ' + (industry ?? '')).toLowerCase();
  let sector_level1 = 'Services';
  let sector_level2 = '';
  let business_model = 'transactional';

  const sectorMap: Array<[string, string, string, string]> = [
    ['saas', 'SaaS', 'B2B SMB SaaS', 'subscription'],
    ['software', 'SaaS', 'B2B SMB SaaS', 'subscription'],
    ['enterprise', 'SaaS', 'B2B Enterprise SaaS', 'subscription'],
    ['devtools', 'SaaS', 'DevTools / API-first', 'usage_based'],
    ['api ', 'SaaS', 'DevTools / API-first', 'usage_based'],
    ['restaurant', 'Food & Beverage', 'Casual Dining Restaurant', 'transactional'],
    ['coffee', 'Food & Beverage', 'Coffee Shop / Café', 'transactional'],
    ['café', 'Food & Beverage', 'Coffee Shop / Café', 'transactional'],
    ['food truck', 'Food & Beverage', 'Food Truck / Ghost Kitchen', 'transactional'],
    ['ecommerce', 'Retail', 'DTC Ecommerce', 'transactional'],
    ['e-commerce', 'Retail', 'DTC Ecommerce', 'transactional'],
    ['retail', 'Retail', 'Brick & Mortar Specialty Retail', 'transactional'],
    ['marketplace', 'Marketplace', 'B2C Service Marketplace', 'marketplace'],
    ['consulting', 'Services', 'B2B Consulting (Strategy/Mgmt)', 'transactional'],
    ['agency', 'Services', 'Marketing / Creative Agency', 'transactional'],
    ['dental', 'Healthcare', 'Dental Practice', 'transactional'],
    ['clinic', 'Healthcare', 'Primary Care / Family Medicine', 'transactional'],
    ['healthcare', 'Healthcare', 'Primary Care / Family Medicine', 'transactional'],
    ['fintech', 'Fintech', 'Payments / Payment Processing', 'transactional'],
    ['construction', 'Construction', 'General Contractor (Residential)', 'transactional'],
    ['logistics', 'Logistics', 'Last-Mile Delivery (B2C)', 'transactional'],
    ['education', 'Education', 'Online Course / EdTech Platform', 'hybrid'],
    ['gym', 'Beauty & Wellness', 'Fitness Studio / Gym', 'subscription'],
    ['salon', 'Beauty & Wellness', 'Hair Salon / Barbershop', 'transactional'],
  ];
  for (const [kw, l1, l2, bm] of sectorMap) {
    if (lower.includes(kw)) {
      sector_level1 = l1;
      sector_level2 = l2;
      business_model = bm;
      break;
    }
  }

  // Geo detection
  let country = 'US';
  let geo_region = 'US';
  let city_tier = 'T2';
  const loc = location.toLowerCase();
  if (
    loc.includes('new york') ||
    loc.includes('nyc') ||
    loc.includes('los angeles') ||
    loc.includes('san francisco') ||
    loc.includes('chicago') ||
    loc.includes('miami') ||
    loc.includes('boston') ||
    loc.includes('seattle')
  ) {
    city_tier = 'T1';
  }
  if (loc.includes('uk') || loc.includes('london') || loc.includes('england')) {
    country = 'UK';
    geo_region = 'EU';
    city_tier = 'T1';
  } else if (loc.includes('canada') || loc.includes('toronto') || loc.includes('vancouver')) {
    country = 'CA';
    geo_region = 'CA';
  } else if (loc.includes('australia') || loc.includes('sydney') || loc.includes('melbourne')) {
    country = 'AU';
    geo_region = 'APAC';
  } else if (loc.includes('germany') || loc.includes('berlin')) {
    country = 'DE';
    geo_region = 'EU';
  } else if (loc.includes('france') || loc.includes('paris')) {
    country = 'FR';
    geo_region = 'EU';
  } else if (loc.includes('india') || loc.includes('mumbai') || loc.includes('bangalore')) {
    country = 'IN';
    geo_region = 'APAC';
  } else if (loc.includes('dubai') || loc.includes('uae')) {
    country = 'AE';
    geo_region = 'MENA';
  }

  const company_stage =
    stage === 'GROWTH' ? 'growth' : stage === 'ESTABLISHED' ? 'established' : 'idea';

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch all 5 benchmark tables in parallel with cascading fallback
  const filters = [
    {
      sector_level1,
      sector_level2,
      business_model,
      geo_region,
      country,
      city_tier,
      company_stage,
      size_bucket: '0_100k',
    },
    { sector_level1, sector_level2, business_model, geo_region, country, city_tier, company_stage },
    { sector_level1, sector_level2, business_model, geo_region, country, city_tier },
    { sector_level1, sector_level2, business_model, geo_region, country },
    { sector_level1, business_model, geo_region },
    { sector_level1 },
  ];

  async function fetchWithFallback(
    table: string,
    cols: string
  ): Promise<Record<string, unknown> | null> {
    for (const f of filters) {
      let q = supabase.from(table).select(cols);
      for (const [k, v] of Object.entries(f)) if (v) q = (q as any).eq(k, v);
      const { data, error } = await (q as any).limit(1).maybeSingle();
      if (!error && data) return data as Record<string, unknown>;
    }
    return null;
  }

  const [core, ue, geo, risk, inv] = await Promise.all([
    fetchWithFallback(
      'benchmark_master_core',
      'gm_margin_p25,gm_margin_p50,gm_margin_p75,op_margin_p50,ebitda_margin_p50,revenue_growth_yoy_p50,revenue_volatility,rent_pct_rev_p50,payroll_pct_rev_p50,marketing_pct_rev_p50,days_receivable,days_payable'
    ),
    fetchWithFallback(
      'benchmark_master_unit_econ',
      'cac_p50,ltv_p50,ltv_cac_ratio_p50,cac_payback_p50,churn_monthly_p50,retention_12m,arpu_median'
    ),
    fetchWithFallback(
      'benchmark_master_geo',
      'cost_of_living_index,wage_multiplier,rent_multiplier,consumer_spend_index'
    ),
    fetchWithFallback(
      'benchmark_master_risk',
      'risk_market_volatility,risk_regulatory,risk_operational,median_survival_years,failure_mode_1,failure_mode_2,failure_mode_3'
    ),
    fetchWithFallback(
      'benchmark_master_invoice',
      'avg_invoice_terms_days,late_payment_rate,bad_debt_pct_rev,safe_dscr_threshold,max_safe_invoice_to_rev_ratio'
    ),
  ]);

  if (!core && !ue) return '';

  const parts: string[] = [
    `LIVE_BENCHMARK_DATA (from AIWMC Quantis Master Benchmark v2, 97,500 data points):`,
    `Sector: ${sector_level1}${sector_level2 ? ' > ' + sector_level2 : ''} | Model: ${business_model} | Geo: ${country} ${city_tier} | Stage: ${company_stage}`,
  ];
  if (core)
    parts.push(
      `CORE: GM p25/p50/p75=${core.gm_margin_p25}/${core.gm_margin_p50}/${core.gm_margin_p75} | OpMargin=${core.op_margin_p50} | EBITDA=${core.ebitda_margin_p50} | RevGrowth=${core.revenue_growth_yoy_p50} | Volatility=${core.revenue_volatility} | Rent%Rev=${core.rent_pct_rev_p50} | Payroll%Rev=${core.payroll_pct_rev_p50} | Mktg%Rev=${core.marketing_pct_rev_p50} | DaysRec=${core.days_receivable} | DaysPay=${core.days_payable}`
    );
  if (ue)
    parts.push(
      `UNIT_ECON: CAC_p50=${ue.cac_p50} | LTV_p50=${ue.ltv_p50} | LTV/CAC=${ue.ltv_cac_ratio_p50} | Payback=${ue.cac_payback_p50}mo | Churn=${ue.churn_monthly_p50}/mo | Retention12m=${ue.retention_12m} | ARPU=${ue.arpu_median}`
    );
  if (geo)
    parts.push(
      `GEO_MULTIPLIERS: CoL=${geo.cost_of_living_index} | Wage=${geo.wage_multiplier}x | Rent=${geo.rent_multiplier}x | Spend=${geo.consumer_spend_index}`
    );
  if (risk)
    parts.push(
      `RISK: MarketVol=${risk.risk_market_volatility} | Regulatory=${risk.risk_regulatory} | Operational=${risk.risk_operational} | SurvivalYrs=${risk.median_survival_years} | Failure1="${risk.failure_mode_1}" | Failure2="${risk.failure_mode_2}" | Failure3="${risk.failure_mode_3}"`
    );
  if (inv)
    parts.push(
      `INVOICE: Terms=${inv.avg_invoice_terms_days}d | LateRate=${inv.late_payment_rate} | BadDebt=${inv.bad_debt_pct_rev} | SafeDSCR=${inv.safe_dscr_threshold} | MaxInv/Rev=${inv.max_safe_invoice_to_rev_ratio}`
    );
  parts.push(
    `SOURCE: AIWMC Quantis Benchmark Master v2.0 | 97,500 data points | Data date: 2025-04-01`
  );
  parts.push(
    `INSTRUCTION: You MUST anchor ALL financial figures to these live benchmarks. Deviation >25% from p50 requires explicit justification.`
  );

  return '\n' + parts.join('\n');
}

const DEFAULT_MODEL = 'deepseek-v4-flash'; // Fix #3 — legacy 'deepseek-chat' retires 2026-07-24

interface PlusRequestBody {
  idea: string;
  location: string;
  industry?: string;
  stage?: 'IDEA' | 'EARLY' | 'GROWTH' | 'ESTABLISHED';
  monte_carlo_data: unknown; // result from src/lib/monte-carlo.ts
  model?: string;
}

serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json', 'X-Request-Id': requestId },
    });

  try {
    // ── 1. Tier gate (PLUS+) ────────────────────────────────────────────────
    const gate = await tierGate(req, ENDPOINTS.ANALYSE_MAIN);
    if (gate.blocked) {
      return json(gate.body, gate.status);
    }
    // Even though FREE can hit ANALYSE_MAIN per manifest, the PLUS *prompt*
    // requires PLUS+. Hard-enforce here:
    if (gate.tier === 'FREE') {
      return json(
        {
          success: false,
          error: 'TIER_GATE',
          message: 'PLUS subscription required for full analysis.',
          required_tier: 'PLUS',
          upgrade_url: 'https://www.aiwmcquantis.com/pricing',
          cta: 'Upgrade to Plus — $17/mo',
        },
        402
      );
    }

    // ── 2. Parse + validate body ────────────────────────────────────────────
    const body = (await req.json().catch(() => ({}))) as PlusRequestBody;
    if (!body.idea || !body.location) {
      return json(
        { success: false, error: 'VALIDATION_ERROR', message: 'idea and location are required.' },
        400
      );
    }
    if (!body.monte_carlo_data || typeof body.monte_carlo_data !== 'object') {
      return json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'monte_carlo_data is required (run src/lib/monte-carlo.ts on the client first).',
        },
        400
      );
    }
    const safety = validateAndSanitizeInput(body.idea, body.location, 5000, 200);
    if (safety.blocked) {
      return json(
        {
          success: false,
          error: 'INVALID_BUSINESS_IDEA',
          message: safety.blockReason ?? 'Input rejected by safety layer.',
        },
        400
      );
    }

    // ── 3. Build system prompt + LLM payload ────────────────────────────────
    const { system, budget } = buildSystemPrompt('PLUS', 'main');

    // Fetch live benchmarks from DB (non-blocking — empty string on failure)
    const liveBenchmarks = await fetchLiveBenchmarks(
      safety.sanitizedIdea,
      safety.sanitizedLocation,
      body.industry,
      body.stage
    ).catch(() => '');

    const userBlock = [
      `BUSINESS_IDEA: ${safety.sanitizedIdea}`,
      `LOCATION: ${safety.sanitizedLocation}`,
      `USER_INDUSTRY: ${body.industry ?? 'unspecified'}`,
      `USER_STAGE: ${body.stage ?? 'IDEA'}`,
      `ANALYSIS_ID: ${requestId}`,
      liveBenchmarks,
      ``,
      `MONTE_CARLO_DATA:`,
      JSON.stringify(body.monte_carlo_data, null, 2),
    ].join('\n');

    const aiResult = await aiCall(
      {
        model: body.model ?? DEFAULT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userBlock },
        ],
        temperature: budget.temperature,
        top_p: budget.top_p,
        max_tokens: budget.max_tokens,
        response_format: { type: 'json_object' },
      },
      {
        task: 'analyze-plus',
        timeoutMs: budget.timeout_ms,
        injectUniversalRules: false, // already prepended by buildSystemPrompt
        analysisId: requestId,
        userId: gate.userId,
        requestId,
        metadata: { tier: gate.tier, endpoint: 'ANALYSE_MAIN' },
      }
    );

    if (!aiResult.ok) {
      const code = aiResult.error;
      const status = aiResult.status;
      await logAnalysisEvent({
        analysis_id: requestId,
        user_id: gate.userId,
        event_type: 'engine_error',
        severity: 'error',
        payload: { code, status },
      });
      return json({ success: false, error: code, message: aiResult.message }, status);
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

    // ── 4. Strip fields per tier manifest (defence in depth) ────────────────
    const stripped = stripToManifest(parsed, gate.manifest);
    // Ensure spec invariants are present
    stripped.tier = 'PLUS';
    stripped.analysis_id = (stripped.analysis_id as string) || requestId;
    stripped.generated_at = (stripped.generated_at as string) || new Date().toISOString();

    // ── 5. Best-effort persistence + usage increment ────────────────────────
    if (gate.userId) {
      try {
        await incrementMonthlyUsage(gate.userId);
      } catch (e) {
        console.warn('[analyze-plus] usage increment failed', e);
      }
      try {
        const admin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        await admin.from('analyses').insert({
          id: stripped.analysis_id as string,
          user_id: gate.userId,
          idea: safety.sanitizedIdea,
          location: safety.sanitizedLocation,
          result: stripped,
          tier_at_creation: 'plus',
          depth: 'full',
          confidence_score:
            typeof (stripped as any)?.confidence_score === 'number'
              ? (stripped as any).confidence_score
              : null,
        });
      } catch (e) {
        console.warn('[analyze-plus] persist failed', e);
      }
    }

    // Observability: success event
    const durationMs = Date.now() - startedAt;
    await logAnalysisEvent({
      analysis_id: stripped.analysis_id as string,
      user_id: gate.userId,
      event_type: 'analysis_complete',
      severity: 'info',
      payload: {
        durationMs,
        confidence: (stripped as any)?.confidence_score ?? null,
        depth: 'full',
        tier: 'PLUS',
        model: body.model ?? DEFAULT_MODEL,
        industry_detected: (stripped as any)?.industry_detected ?? null,
        reconciled: (stripped as any)?.validation?.reconciled ?? null,
      },
    });
    if (durationMs > 30_000) {
      await logAnalysisEvent({
        analysis_id: stripped.analysis_id as string,
        user_id: gate.userId,
        event_type: 'performance_warning',
        severity: 'warning',
        payload: { code: 'QE-PERF-001', durationMs, threshold: 30_000 },
      });
    }

    return json({
      success: true,
      tier: 'PLUS',
      request_id: requestId,
      data: stripped,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[analyze-plus] fatal', message);
    await logAnalysisEvent({
      analysis_id: requestId,
      event_type: 'engine_error',
      severity: 'error',
      payload: { code: 'INTERNAL', message: message.slice(0, 500) },
    });
    return json({ success: false, error: 'INTERNAL', message, request_id: requestId }, 500);
  }
});

/** Field-level allowlist enforcement per Master Spec §08. */
function stripToManifest(
  obj: Record<string, unknown>,
  manifest: FeatureManifest
): Record<string, unknown> {
  if (manifest.allowed_output_fields === '__ALL__') return obj;
  const allow = new Set<string>(manifest.allowed_output_fields as readonly string[]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (allow.has(k)) out[k] = v;
  }
  return out;
}
