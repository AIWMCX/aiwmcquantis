import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { isRvceFanoutEnabled, getTierForAnalysis, RVCE_OBS_CAP, type Tier } from '../_shared/tier.ts';
import { calibrateWithHaiku, fanoutVariable } from '../_shared/rvce-fanout.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RVCE_VERSION = 'rvce-0.3.0';

const METRICS_TO_VALIDATE = [
  'revenue_monthly', 'gross_margin_pct', 'opex_marketing_monthly',
  'opex_rent_monthly', 'opex_payroll_monthly', 'ltv', 'cac',
  'ltv_cac_ratio', 'cac_payback_months', 'startup_investment_total',
  'churn_rate_monthly', 'arpu_monthly',
];

const QUERY_TEMPLATES: Record<string, { primary: string[]; fallback: string[] }> = {
  revenue_monthly: {
    primary: [
      '{industry} average monthly revenue {city} 2024 2025',
      '{industry} small business revenue benchmark United States',
    ],
    fallback: [
      'average monthly revenue small business {industry}',
      'how much does a {industry} business make per month',
    ],
  },
  gross_margin_pct: {
    primary: [
      '{industry} gross margin percentage benchmark 2024',
      '{industry} average gross profit margin small business',
    ],
    fallback: [
      'typical gross margin {business_model} business',
      'gross margin benchmark by industry',
    ],
  },
  opex_marketing_monthly: {
    primary: [
      '{industry} monthly marketing budget small business {city}',
      '{business_model} average marketing spend per month 2024',
    ],
    fallback: [
      'small business marketing spend percentage revenue',
      'average monthly marketing cost startup',
    ],
  },
  opex_rent_monthly: {
    primary: [
      'commercial rent {city} small business per month 2024 2025',
      '{industry} office rent cost {city} monthly',
    ],
    fallback: [
      'average commercial rent per month {city}',
      'small business rent cost United States average',
    ],
  },
  opex_payroll_monthly: {
    primary: [
      '{industry} payroll cost small business {city} 2024',
      '{industry} average employee salary {city}',
    ],
    fallback: [
      'small business payroll percentage of revenue',
      'average payroll cost per employee {city}',
    ],
  },
  ltv: {
    primary: [
      '{industry} customer lifetime value benchmark',
      '{business_model} average customer LTV 2024',
    ],
    fallback: [
      'average customer lifetime value by industry',
      'LTV benchmark small business',
    ],
  },
  cac: {
    primary: [
      '{industry} customer acquisition cost 2024 2025',
      '{business_model} average CAC benchmark',
    ],
    fallback: [
      'average customer acquisition cost by industry',
      'CAC benchmark small business digital',
    ],
  },
  ltv_cac_ratio: {
    primary: [
      '{industry} LTV to CAC ratio benchmark healthy',
      'good LTV CAC ratio {business_model} 2024',
    ],
    fallback: [
      'ideal LTV CAC ratio by industry',
    ],
  },
  cac_payback_months: {
    primary: [
      '{industry} CAC payback period months benchmark',
      '{business_model} payback period average',
    ],
    fallback: [
      'average CAC payback period months startup',
    ],
  },
  startup_investment_total: {
    primary: [
      'how much does it cost to start a {industry} business in {city} 2024 2025',
      '{industry} startup costs breakdown average',
    ],
    fallback: [
      'average startup cost {industry} United States',
      'cost to open a {industry} business',
    ],
  },
};

interface SearchDiagnostics {
  metric: string;
  queries_sent: string[];
  web_search_tool_fired: boolean;
  tool_use_count: number;
  tool_result_count: number;
  raw_results_found: number;
  parsed_observations: number;
  fallback_used: boolean;
  source_urls: string[];
  error: string | null;
}

interface Observation {
  value: number;
  source: string;
  url?: string;
  confidence: number;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Auth gate: require a valid bearer token (user JWT or service role).
  // Prevents unauthenticated abuse of the Anthropic API budget.
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
  const token = authHeader.slice(7);
  if (token !== SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        },
      });
      if (!verifyRes.ok) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }
  }


  const startTime = Date.now();

  try {
    const payload = await req.json();
    const { analysis_id, business_profile, core_metrics } = payload;

    if (!business_profile || !core_metrics) {
      return jsonResponse({ error: 'Missing business_profile or core_metrics' }, 400);
    }

    const { industry, location_city, business_model } = business_profile;
    const location_country = business_profile.location_country || 'US';

    // ── Phase 1B: tier-aware DeepSeek fan-out path (flag-gated) ─────
    const tier: Tier = getTierForAnalysis({
      tier_at_creation: payload.tier_at_creation ?? business_profile?.tier_at_creation,
      plan_id: payload.plan_id ?? business_profile?.plan_id,
      user_tier: payload.user_tier ?? business_profile?.user_tier,
    });

    if (isRvceFanoutEnabled() && Deno.env.get('DEEPSEEK_API_KEY')) {
      const fanoutResult = await runFanoutPipeline({
        analysis_id,
        tier,
        startTime,
        core_metrics,
        ctx: {
          industry,
          city: location_city,
          country: location_country,
          business_model,
        },
      });
      logValidation(fanoutResult).catch(() => {});
      return jsonResponse(fanoutResult);
    }
    // ── End fan-out branch ──────────────────────────────────────────


    const referenceClasses = [
      { id: `rc-${slug(industry)}-${slug(location_city)}`, description: `${location_city} ${industry}`, sample_size: 0 },
      { id: `rc-${slug(industry)}-${slug(location_country)}`, description: `${location_country} ${industry}`, sample_size: 0 },
      ...(business_model ? [{ id: `rc-${slug(business_model)}`, description: `${business_model} class`, sample_size: 0 }] : []),
    ];

    const metricsValidation: Record<string, any> = {};
    const evidenceSamples: any[] = [];
    const searchDiagnostics: SearchDiagnostics[] = [];

    const metricsToProcess = METRICS_TO_VALIDATE.filter(
      m => core_metrics[m] !== undefined && core_metrics[m] !== null && core_metrics[m] !== 0
    );

    const batches = chunk(metricsToProcess, 3);

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map(metric =>
          validateMetricWithSearch(
            metric,
            core_metrics[metric],
            { industry, city: location_city, business_model, country: location_country }
          )
        )
      );

      results.forEach((result, i) => {
        const metric = batch[i];
        if (result.status === 'fulfilled') {
          metricsValidation[metric] = result.value.validation;
          evidenceSamples.push(...result.value.evidence);
          searchDiagnostics.push(result.value.diagnostics);
        } else {
          metricsValidation[metric] = {
            original_value: core_metrics[metric],
            external_median: null,
            p25: null, p75: null,
            status: 'NO_DATA',
            discrepancy_score: 0,
            notes: `Search failed: ${result.reason}`,
            observation_count: 0,
            web_search_fired: false,
          };
          searchDiagnostics.push({
            metric,
            queries_sent: [],
            web_search_tool_fired: false,
            tool_use_count: 0,
            tool_result_count: 0,
            raw_results_found: 0,
            parsed_observations: 0,
            fallback_used: false,
            source_urls: [],
            error: String(result.reason),
          });
        }
      });
    }

    const entries = Object.values(metricsValidation) as any[];
    let confidence = 85;
    confidence -= entries.filter((e: any) => e.status === 'OUTLIER').length * 12;
    confidence -= entries.filter((e: any) => e.status === 'WARN').length * 5;
    confidence -= entries.filter((e: any) => e.status === 'NO_DATA').length * 3;

    const searchFiredCount = searchDiagnostics.filter(d => d.web_search_tool_fired).length;
    const searchFiredRatio = metricsToProcess.length > 0
      ? searchFiredCount / metricsToProcess.length
      : 0;
    if (searchFiredRatio >= 0.8) confidence += 5;
    if (searchFiredRatio < 0.3) confidence -= 10;

    confidence = Math.max(0, Math.min(100, confidence)) / 100;

    const flags = Object.entries(metricsValidation)
      .filter(([, v]: [string, any]) => v.status === 'OUTLIER')
      .map(([metric, v]: [string, any]) => ({
        severity: 'high' as const,
        metric,
        message: `${metric.replace(/_/g, ' ')} is ${Math.abs(v.discrepancy_score).toFixed(1)}σ ${v.discrepancy_score > 0 ? 'above' : 'below'} external benchmarks. ${v.notes}`,
        impacted_sections: ['Financial Analysis', 'Scenario Analysis'],
      }));

    const latencyMs = Date.now() - startTime;

    const searchHealth = {
      total_metrics_searched: metricsToProcess.length,
      web_search_fired_count: searchFiredCount,
      web_search_fired_ratio: parseFloat(searchFiredRatio.toFixed(2)),
      total_observations_collected: searchDiagnostics.reduce((s, d) => s + d.parsed_observations, 0),
      total_source_urls: [...new Set(searchDiagnostics.flatMap(d => d.source_urls))].length,
      fallback_queries_used: searchDiagnostics.filter(d => d.fallback_used).length,
      metrics_with_zero_observations: searchDiagnostics.filter(d => d.parsed_observations === 0).length,
    };

    const validationPayload = {
      analysis_id,
      rvce_version: RVCE_VERSION,
      global_confidence_score: parseFloat(confidence.toFixed(3)),
      reference_classes: referenceClasses,
      metrics_validation: metricsValidation,
      flags,
      evidence_samples: evidenceSamples.slice(0, 30),
      latency_ms: latencyMs,
      status: searchFiredCount > 0 ? 'COMPLETED' : (metricsToProcess.length > 0 ? 'PARTIAL' : 'UNAVAILABLE'),
      search_health: searchHealth,
      search_diagnostics: searchDiagnostics,
    };

    logValidation(validationPayload).catch(() => {});

    return jsonResponse(validationPayload);

  } catch (err) {
    return jsonResponse({
      analysis_id: 'unknown',
      rvce_version: RVCE_VERSION,
      global_confidence_score: 0,
      reference_classes: [],
      metrics_validation: {},
      flags: [],
      evidence_samples: [],
      latency_ms: Date.now() - startTime,
      status: 'UNAVAILABLE',
      search_health: { total_metrics_searched: 0, web_search_fired_count: 0, web_search_fired_ratio: 0, total_observations_collected: 0, total_source_urls: 0, fallback_queries_used: 0, metrics_with_zero_observations: 0 },
      search_diagnostics: [],
      error: (err as Error).message,
    });
  }
});

async function validateMetricWithSearch(
  metric: string,
  originalValue: number,
  profile: { industry: string; city: string; business_model: string; country: string }
): Promise<{ validation: any; evidence: any[]; diagnostics: SearchDiagnostics }> {

  const templates = QUERY_TEMPLATES[metric] || {
    primary: [`${profile.industry} ${metric.replace(/_/g, ' ')} benchmark`],
    fallback: [`average ${metric.replace(/_/g, ' ')} small business`],
  };

  const fillTemplate = (tpl: string) =>
    tpl.replace(/{industry}/g, profile.industry)
       .replace(/{city}/g, profile.city)
       .replace(/{business_model}/g, profile.business_model)
       .replace(/{country}/g, profile.country);

  const primaryQueries = templates.primary.map(fillTemplate);
  const fallbackQueries = templates.fallback.map(fillTemplate);

  const diagnostics: SearchDiagnostics = {
    metric,
    queries_sent: [],
    web_search_tool_fired: false,
    tool_use_count: 0,
    tool_result_count: 0,
    raw_results_found: 0,
    parsed_observations: 0,
    fallback_used: false,
    source_urls: [],
    error: null,
  };

  let observations: Observation[] = [];

  try {
    const result1 = await callClaudeWithWebSearch(metric, originalValue, primaryQueries, profile);
    diagnostics.queries_sent.push(...primaryQueries);
    diagnostics.web_search_tool_fired = result1.searchFired;
    diagnostics.tool_use_count += result1.toolUseCount;
    diagnostics.tool_result_count += result1.toolResultCount;
    diagnostics.source_urls.push(...result1.sourceUrls);
    observations.push(...result1.observations);
  } catch (err) {
    diagnostics.error = `Primary search failed: ${(err as Error).message}`;
  }

  if (observations.length < 3 && fallbackQueries.length > 0) {
    diagnostics.fallback_used = true;
    try {
      const result2 = await callClaudeWithWebSearch(metric, originalValue, fallbackQueries, profile);
      diagnostics.queries_sent.push(...fallbackQueries);
      if (result2.searchFired) diagnostics.web_search_tool_fired = true;
      diagnostics.tool_use_count += result2.toolUseCount;
      diagnostics.tool_result_count += result2.toolResultCount;
      diagnostics.source_urls.push(...result2.sourceUrls);
      observations.push(...result2.observations);
    } catch (err) {
      diagnostics.error = (diagnostics.error || '') + ` Fallback also failed: ${(err as Error).message}`;
    }
  }

  observations = deduplicateObservations(observations);
  diagnostics.source_urls = [...new Set(diagnostics.source_urls)];
  diagnostics.raw_results_found = observations.length;
  diagnostics.parsed_observations = observations.length;

  if (observations.length < 2) {
    return {
      validation: {
        original_value: originalValue,
        external_median: null,
        p25: null, p75: null,
        status: 'NO_DATA',
        discrepancy_score: 0,
        notes: diagnostics.web_search_tool_fired
          ? 'Web search ran but found insufficient relevant data for this metric.'
          : 'Web search did not activate. Insufficient data.',
        observation_count: observations.length,
        web_search_fired: diagnostics.web_search_tool_fired,
        sources_used: diagnostics.source_urls.length,
      },
      evidence: [],
      diagnostics,
    };
  }

  const values = observations.map(o => o.value).sort((a, b) => a - b);
  const n = values.length;
  const median = n % 2 === 0 ? (values[n / 2 - 1] + values[n / 2]) / 2 : values[Math.floor(n / 2)];
  const p25 = values[Math.max(0, Math.floor(n * 0.25))];
  const p75 = values[Math.min(n - 1, Math.floor(n * 0.75))];
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const std = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, n - 1));
  const effectiveStd = std > 0 ? std : Math.max(1e-6, Math.abs(median) * 0.1);
  const discrepancy = (originalValue - median) / effectiveStd;

  let status: string;
  if (Math.abs(discrepancy) < 1.0) status = 'OK';
  else if (Math.abs(discrepancy) < 2.0) status = 'WARN';
  else status = 'OUTLIER';

  const validation: any = {
    original_value: originalValue,
    external_median: parseFloat(median.toFixed(2)),
    p25: parseFloat(p25.toFixed(2)),
    p75: parseFloat(p75.toFixed(2)),
    status,
    discrepancy_score: parseFloat(discrepancy.toFixed(2)),
    notes: status === 'OUTLIER'
      ? `Value is ${Math.abs(discrepancy).toFixed(1)}σ ${discrepancy > 0 ? 'above' : 'below'} the external median of $${median.toLocaleString()} from ${n} external sources.`
      : status === 'WARN'
      ? `Value is at the boundary of the typical range ($${p25.toLocaleString()}–$${p75.toLocaleString()}) from ${n} external sources.`
      : `Value aligns with external reality (median $${median.toLocaleString()}) from ${n} sources.`,
    observation_count: observations.length,
    web_search_fired: diagnostics.web_search_tool_fired,
    sources_used: diagnostics.source_urls.length,
  };

  if (status === 'OUTLIER') {
    validation.recommended_value = parseFloat(median.toFixed(2));
  }

  const evidence = observations.slice(0, 5).map(o => ({
    metric,
    source: o.source,
    url: o.url || '',
    summary: `$${o.value.toLocaleString()} — ${o.source}`,
    value: o.value,
  }));

  return { validation, evidence, diagnostics };
}

async function callClaudeWithWebSearch(
  metric: string,
  _originalValue: number,
  queries: string[],
  profile: { industry: string; city: string; business_model: string }
): Promise<{
  observations: Observation[];
  searchFired: boolean;
  toolUseCount: number;
  toolResultCount: number;
  sourceUrls: string[];
}> {
  const metricLabel = metric.replace(/_/g, ' ');
  const isPercentage = metric.includes('pct') || metric.includes('ratio');
  const unit = isPercentage ? (metric.includes('ratio') ? 'x' : '%') : 'USD per month';

  const systemPrompt = `You are a financial benchmark researcher. You MUST use the web_search tool to find real, current data. Do NOT answer from memory or training data — every number you return MUST come from a web search result you just retrieved. If you cannot find data via web search, return an empty observations array. Never fabricate benchmarks.`;

  const userPrompt = `I need you to find real market benchmark data for "${metricLabel}" for a ${profile.industry} business in ${profile.city} (${profile.business_model}).

STEP 1: Use your web_search tool to search for EACH of these queries (search for ALL of them):
${queries.map((q, i) => `  ${i + 1}. "${q}"`).join('\n')}

STEP 2: From the search results, extract every numeric value that specifically represents "${metricLabel}". The unit is ${unit}.

STEP 3: Return ONLY this JSON (no markdown, no backticks, no preamble):
{
  "observations": [
    {"value": 12000, "source": "Brief description of where this number came from", "url": "https://source-url-if-available"},
    {"value": 15000, "source": "Another source", "url": ""}
  ],
  "search_executed": true
}

CRITICAL RULES:
- You MUST call web_search before returning any data
- Convert annual figures to monthly (divide by 12) for monthly metrics
- For percentage metrics, return the number (e.g., 62 not 0.62 for 62%)
- Only include numbers directly related to "${metricLabel}"
- If search returns nothing relevant, return {"observations": [], "search_executed": true}
- Include the source URL when available from search results`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: systemPrompt,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.content || [];

  let searchFired = false;
  let toolUseCount = 0;
  let toolResultCount = 0;
  const sourceUrls: string[] = [];
  const textBlocks: string[] = [];

  for (const block of content) {
    if (block.type === 'tool_use' || block.type === 'server_tool_use') {
      toolUseCount++;
      if (block.name === 'web_search') searchFired = true;
    }
    if (block.type === 'tool_result' || block.type === 'web_search_tool_result') {
      toolResultCount++;
      const resultContent = block.content;
      if (Array.isArray(resultContent)) {
        for (const item of resultContent) {
          if (item.type === 'web_search_result' && item.url) {
            sourceUrls.push(item.url);
          } else if (item.url) {
            sourceUrls.push(item.url);
          }
        }
      }
      if (typeof resultContent === 'string' && resultContent.includes('http')) {
        const urls = resultContent.match(/https?:\/\/[^\s"'<>]+/g);
        if (urls) sourceUrls.push(...urls);
      }
    }
    if (block.type === 'text') {
      textBlocks.push(block.text);
    }
  }

  const fullText = textBlocks.join('\n');
  let observations: Observation[] = [];

  try {
    const cleaned = fullText.replace(/```json|```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*"observations"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      observations = (parsed.observations || [])
        .filter((o: any) => typeof o.value === 'number' && isFinite(o.value) && o.value > 0)
        .map((o: any) => ({
          value: o.value,
          source: o.source || 'web search',
          url: o.url || '',
          confidence: searchFired ? 0.8 : 0.3,
        }));
    }
  } catch {
    const patterns = isPercentage
      ? /(\d+(?:\.\d+)?)\s*%/g
      : /\$\s*([\d,]+(?:\.\d+)?)/g;
    const matches = [...fullText.matchAll(patterns)];
    observations = matches.slice(0, 8).map(m => ({
      value: parseFloat((m[1] || m[0]).replace(/[$,]/g, '')),
      source: 'extracted from search text',
      confidence: searchFired ? 0.5 : 0.2,
    })).filter(o => isFinite(o.value) && o.value > 0);
  }

  return { observations, searchFired, toolUseCount, toolResultCount, sourceUrls: [...new Set(sourceUrls)] };
}

function deduplicateObservations(obs: Observation[]): Observation[] {
  const unique: Observation[] = [];
  for (const o of obs) {
    const isDupe = unique.some(u => Math.abs(u.value - o.value) / Math.max(u.value, 1) < 0.01);
    if (!isDupe) unique.push(o);
  }
  return unique;
}

function slug(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

/* ─────────────────────────────────────────────────────────────────────
 * Phase 1B fan-out pipeline (flag-gated). Builds an rvce-validate-shaped
 * payload using DeepSeek per-variable fan-out + Anthropic Haiku calibration.
 * ──────────────────────────────────────────────────────────────────── */
async function runFanoutPipeline(args: {
  analysis_id: string | undefined;
  tier: Tier;
  startTime: number;
  core_metrics: Record<string, number>;
  ctx: { industry: string; city: string; country: string; business_model: string };
}) {
  const { analysis_id, tier, startTime, core_metrics, ctx } = args;

  const metricsToProcess = METRICS_TO_VALIDATE.filter(
    (m) => core_metrics[m] !== undefined && core_metrics[m] !== null && core_metrics[m] !== 0,
  );

  // Fan out across ALL variables in parallel — internal pLimit caps inflight calls.
  const settled = await Promise.all(
    metricsToProcess.map((m) => fanoutVariable(m, core_metrics[m], ctx, tier)),
  );

  let perVariable: Record<string, ReturnType<typeof toLegacyShape>['legacy']> = {};
  const evidenceSamples: any[] = [];
  const fanoutMap: Record<string, (typeof settled)[number]> = {};

  metricsToProcess.forEach((m, i) => {
    fanoutMap[m] = settled[i];
  });

  // Calibrate via single Haiku call (best-effort).
  const calibrated = await calibrateWithHaiku(fanoutMap, core_metrics);

  metricsToProcess.forEach((m) => {
    const v = calibrated[m];
    const { legacy, samples } = toLegacyShape(m, v);
    perVariable[m] = legacy;
    evidenceSamples.push(...samples);
  });

  const entries = Object.values(perVariable);
  let confidence = 90;
  confidence -= entries.filter((e) => e.status === 'OUTLIER').length * 12;
  confidence -= entries.filter((e) => e.status === 'WARN').length * 5;
  confidence -= entries.filter((e) => e.status === 'NO_DATA').length * 4;
  confidence = Math.max(0, Math.min(100, confidence)) / 100;

  const flags = Object.entries(perVariable)
    .filter(([, v]) => v.status === 'OUTLIER')
    .map(([metric, v]) => ({
      severity: 'high' as const,
      metric,
      message: `${metric.replace(/_/g, ' ')} is ${Math.abs(v.discrepancy_pct).toFixed(0)}% off the fan-out median (${v.observation_count} obs). ${v.notes}`,
      impacted_sections: ['Financial Analysis', 'Scenario Analysis'],
    }));

  const totalObs = entries.reduce((s, e) => s + e.observation_count, 0);
  const cacheHits = entries.filter((e) => (e as any).cache_hit).length;
  const expectedCap = RVCE_OBS_CAP[tier];

  return {
    analysis_id,
    rvce_version: RVCE_VERSION,
    rvce_engine: 'fanout',
    tier,
    obs_cap_per_variable: expectedCap,
    global_confidence_score: parseFloat(confidence.toFixed(3)),
    reference_classes: [
      { id: `rc-${slug(ctx.industry)}-${slug(ctx.city)}`, description: `${ctx.city} ${ctx.industry}`, sample_size: totalObs },
      { id: `rc-${slug(ctx.industry)}-${slug(ctx.country)}`, description: `${ctx.country} ${ctx.industry}`, sample_size: totalObs },
    ],
    metrics_validation: perVariable,
    flags,
    evidence_samples: evidenceSamples.slice(0, 60),
    latency_ms: Date.now() - startTime,
    status: totalObs > 0 ? 'COMPLETED' : 'PARTIAL',
    search_health: {
      total_metrics_searched: metricsToProcess.length,
      total_observations_collected: totalObs,
      cache_hit_count: cacheHits,
      cache_hit_ratio: parseFloat((metricsToProcess.length ? cacheHits / metricsToProcess.length : 0).toFixed(2)),
      web_search_fired_count: metricsToProcess.length - cacheHits,
      web_search_fired_ratio: parseFloat((metricsToProcess.length ? (metricsToProcess.length - cacheHits) / metricsToProcess.length : 0).toFixed(2)),
      total_source_urls: new Set(evidenceSamples.flatMap((e: any) => (e.url ? [e.url] : []))).size,
      fallback_queries_used: 0,
      metrics_with_zero_observations: entries.filter((e) => e.observation_count === 0).length,
    },
    search_diagnostics: [],
  };
}

function toLegacyShape(metric: string, v: ReturnType<typeof fanoutVariable> extends Promise<infer R> ? R : never) {
  const legacy = {
    original_value: v.original_value,
    external_median: v.external_median,
    p25: v.p25,
    p75: v.p75,
    status: v.status,
    discrepancy_score: v.discrepancy_pct, // legacy field name kept for UI compat
    discrepancy_pct: v.discrepancy_pct,
    notes: v.notes,
    observation_count: v.observation_count,
    web_search_fired: !v.cache_hit,
    sources_used: new Set(v.observations.map((o) => o.url || o.source)).size,
    confidence: v.confidence,
    cache_hit: v.cache_hit,
    observations: v.observations, // full evidence for the modal
    ...(v.status === 'OUTLIER' && v.external_median != null
      ? { recommended_value: v.external_median }
      : {}),
  };
  const samples = v.observations.slice(0, 5).map((o) => ({
    metric,
    source: o.source,
    url: o.url || '',
    summary: `${o.metric_estimate} ${o.units} — ${o.source}`,
    value: o.metric_estimate,
    snippet: o.snippet,
  }));
  return { legacy, samples };
}


function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function logValidation(payload: any) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rvce_validation_log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        analysis_id: payload.analysis_id || crypto.randomUUID(),
        rvce_version: payload.rvce_version,
        global_confidence: payload.global_confidence_score,
        metrics_count: Object.keys(payload.metrics_validation || {}).length,
        outlier_count: payload.flags?.length || 0,
        warn_count: Object.values(payload.metrics_validation || {}).filter((v: any) => v.status === 'WARN').length,
        no_data_count: Object.values(payload.metrics_validation || {}).filter((v: any) => v.status === 'NO_DATA').length,
        total_observations: Object.values(payload.metrics_validation || {}).reduce((s: number, v: any) => s + (v.observation_count || 0), 0),
        reference_classes: payload.reference_classes,
        metrics_validation: payload.metrics_validation,
        flags: payload.flags,
        evidence_samples: payload.evidence_samples,
        latency_ms: payload.latency_ms,
      }),
    });
  } catch { /* best-effort */ }
}
