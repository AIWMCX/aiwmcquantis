/**
 * RVCE Layer 8 — External Reality Validation edge function.
 *
 * Receives analysis core metrics + business profile, uses Claude Haiku
 * with web_search to gather external observations per metric, aggregates,
 * and returns a validation payload.
 *
 * Fail-safe: any internal error produces an UNAVAILABLE payload (200 OK)
 * so the calling analysis never breaks.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RVCE_VERSION = 'rvce-0.1.0';
const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const METRICS_TO_VALIDATE = [
  'revenue_monthly',
  'gross_margin_pct',
  'opex_marketing_monthly',
  'opex_rent_monthly',
  'opex_payroll_monthly',
  'total_opex_monthly',
  'ltv',
  'cac',
  'ltv_cac_ratio',
  'cac_payback_months',
  'startup_investment_total',
  'som_year1_revenue',
];

const QUERY_TEMPLATES: Record<string, string[]> = {
  revenue_monthly: [
    '{industry} average monthly revenue {city}',
    '{industry} small business revenue benchmark',
  ],
  gross_margin_pct: [
    '{industry} gross margin benchmark',
    'average gross margin {business_model}',
  ],
  opex_marketing_monthly: [
    '{industry} monthly marketing budget small business',
    '{business_model} average marketing spend per month',
  ],
  opex_rent_monthly: [
    'commercial rent {city} small business monthly',
    '{industry} rent cost {city}',
  ],
  opex_payroll_monthly: [
    '{industry} payroll cost small business {city}',
    '{industry} labor cost percentage revenue',
  ],
  total_opex_monthly: [
    '{industry} monthly operating expenses small business',
    '{business_model} typical monthly opex',
  ],
  ltv: [
    '{industry} customer lifetime value benchmark',
    '{business_model} average LTV',
  ],
  cac: [
    '{industry} customer acquisition cost benchmark',
    '{business_model} average CAC',
  ],
  ltv_cac_ratio: [
    '{industry} LTV CAC ratio benchmark healthy',
    'good LTV to CAC ratio {business_model}',
  ],
  cac_payback_months: [
    '{industry} CAC payback period months benchmark',
    '{business_model} payback period months',
  ],
  startup_investment_total: [
    'cost to start {industry} business {city}',
    '{industry} startup costs breakdown',
  ],
  som_year1_revenue: [
    '{industry} first year revenue realistic',
    'average year 1 revenue {industry} startup',
  ],
};

interface Observation {
  value: number;
  source: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  // Identify caller (best-effort) — RVCE works for both authed + anon analyses.
  let userId: string | null = null;
  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (auth.startsWith('Bearer ') && SUPABASE_URL) {
      const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
      const { data } = await supa.auth.getUser(auth.replace('Bearer ', ''));
      userId = data?.user?.id ?? null;
    }
  } catch { /* ignore */ }

  let analysisId = 'unknown';

  try {
    const payload = await req.json();
    analysisId = payload?.analysis_id ?? 'unknown';
    const businessProfile = payload?.business_profile;
    const coreMetrics = payload?.core_metrics;

    if (!businessProfile || !coreMetrics) {
      return jsonResponse(
        unavailablePayload(analysisId, Date.now() - startTime, 'Missing payload'),
        200,
      );
    }
    if (!ANTHROPIC_API_KEY) {
      return jsonResponse(
        unavailablePayload(
          analysisId,
          Date.now() - startTime,
          'ANTHROPIC_API_KEY missing',
        ),
        200,
      );
    }

    const industry = String(businessProfile.industry ?? 'General');
    const city = String(businessProfile.location_city ?? '');
    const country = String(businessProfile.location_country ?? 'US');
    const businessModel = String(businessProfile.business_model ?? 'B2C');

    // Reference classes (descriptive only at this layer)
    const referenceClasses = [
      {
        id: `rc-${slug(industry)}-${slug(city)}`,
        description: `${city} ${industry} businesses`,
        industry,
        geo_region: `${city}, ${country}`,
        business_model: businessModel,
        sample_size: 0,
      },
      {
        id: `rc-${slug(industry)}-${slug(country)}`,
        description: `${country} ${industry} businesses`,
        industry,
        geo_region: country,
        business_model: businessModel,
        sample_size: 0,
      },
      ...(businessModel
        ? [
            {
              id: `rc-${slug(businessModel)}`,
              description: `${businessModel} reference class`,
              business_model: businessModel,
              sample_size: 0,
            },
          ]
        : []),
    ];

    // Validate metrics in parallel batches of 3 (Anthropic rate-limit friendly)
    const candidates = METRICS_TO_VALIDATE.filter(
      (m) =>
        typeof coreMetrics[m] === 'number' &&
        Number.isFinite(coreMetrics[m]) &&
        coreMetrics[m] !== 0,
    );

    const metricsValidation: Record<string, ReturnType<typeof calibrate>> = {};
    const evidenceSamples: Array<{
      metric: string;
      source: string;
      summary: string;
      value: number;
    }> = [];
    let totalObservations = 0;

    for (const batch of chunk(candidates, 3)) {
      const results = await Promise.all(
        batch.map((metric) =>
          validateSingleMetric(metric, coreMetrics[metric], {
            industry,
            city,
            business_model: businessModel,
          }).catch(() => ({
            validation: noDataValidation(coreMetrics[metric], 0, 'Validation error'),
            evidence: [] as typeof evidenceSamples,
            obsCount: 0,
          })),
        ),
      );
      results.forEach((r, i) => {
        const metric = batch[i];
        metricsValidation[metric] = r.validation;
        totalObservations += r.obsCount;
        for (const e of r.evidence) evidenceSamples.push(e);
      });
    }

    const entries = Object.values(metricsValidation);
    let confidence = 85;
    confidence -= entries.filter((e) => e.status === 'OUTLIER').length * 12;
    confidence -= entries.filter((e) => e.status === 'WARN').length * 5;
    confidence -= entries.filter((e) => e.status === 'NO_DATA').length * 3;
    const avgObs =
      entries.reduce((s, e) => s + (e.observation_count ?? 0), 0) /
      Math.max(1, entries.length);
    if (avgObs >= 10) confidence += 5;
    confidence = Math.max(0, Math.min(100, confidence)) / 100;

    const flags = Object.entries(metricsValidation)
      .filter(([, v]) => v.status === 'OUTLIER')
      .map(([metricKey, v]) => ({
        severity: 'high' as const,
        metric: metricKey,
        message: `${metricKey.replace(/_/g, ' ')} is ${Math.abs(
          v.discrepancy_score,
        ).toFixed(1)}σ ${v.discrepancy_score > 0 ? 'above' : 'below'} external benchmarks. ${v.notes}`,
        impacted_sections: ['Financial Analysis', 'Scenario Analysis'],
      }));

    const latencyMs = Date.now() - startTime;
    const outlierCount = entries.filter((e) => e.status === 'OUTLIER').length;
    const warnCount = entries.filter((e) => e.status === 'WARN').length;
    const noDataCount = entries.filter((e) => e.status === 'NO_DATA').length;

    const response = {
      analysis_id: analysisId,
      rvce_version: RVCE_VERSION,
      global_confidence_score: Number(confidence.toFixed(3)),
      reference_classes: referenceClasses,
      metrics_validation: metricsValidation,
      flags,
      evidence_samples: evidenceSamples.slice(0, 20),
      latency_ms: latencyMs,
      status: Object.keys(metricsValidation).length > 0 ? 'COMPLETED' : 'PARTIAL',
    };

    // Best-effort log (never blocks response)
    void logRun({
      analysis_id: analysisId,
      user_id: userId,
      global_confidence: response.global_confidence_score,
      metrics_count: entries.length,
      outlier_count: outlierCount,
      warn_count: warnCount,
      no_data_count: noDataCount,
      total_observations: totalObservations,
      reference_classes: referenceClasses,
      metrics_validation: metricsValidation,
      flags,
      evidence_samples: response.evidence_samples,
      latency_ms: latencyMs,
      status: response.status,
    });

    return jsonResponse(response, 200);
  } catch (err) {
    return jsonResponse(
      unavailablePayload(
        analysisId,
        Date.now() - startTime,
        err instanceof Error ? err.message : 'unknown',
      ),
      200,
    );
  }
});

// ─────────────────────────────────────────────────────────
// Validate a single metric using Claude Haiku + web_search
// ─────────────────────────────────────────────────────────
async function validateSingleMetric(
  metric: string,
  originalValue: number,
  profile: { industry: string; city: string; business_model: string },
) {
  const templates = QUERY_TEMPLATES[metric] ?? [
    `${profile.industry} ${metric.replace(/_/g, ' ')} benchmark`,
  ];
  const queries = templates.map((t) =>
    t
      .replace('{industry}', profile.industry)
      .replace('{city}', profile.city)
      .replace('{business_model}', profile.business_model),
  );

  const prompt = `You are a financial benchmark researcher. Find real market data for the metric "${metric.replace(/_/g, ' ')}" for businesses in the "${profile.industry}" industry${profile.city ? ` in ${profile.city}` : ''}.

Search queries to consider: ${queries.join(' | ')}

After searching, extract ALL numeric values you find that are relevant to this metric. Return ONLY valid JSON (no markdown, no backticks, no commentary):
{"observations":[{"value":12000,"source":"BLS data on restaurant revenue"},{"value":15000,"source":"Industry report on coffee shops"}],"notes":"Brief context"}

Rules:
- Only include numbers that specifically relate to "${metric.replace(/_/g, ' ')}".
- Convert annual figures to monthly when the metric is monthly.
- For percentage metrics return whole-number percent (e.g. 56 for 56%, NOT 0.56).
- For ratio metrics (ltv_cac_ratio) return the ratio as a number (e.g. 3.2, not 320%).
- If nothing relevant found, return {"observations":[],"notes":"No relevant data found"}.
- Output JSON only, nothing else.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 1024,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    return {
      validation: noDataValidation(originalValue, 0, `Anthropic ${res.status}`),
      evidence: [],
      obsCount: 0,
    };
  }

  const data = await res.json();
  const textContent: string =
    (data?.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('\n') ?? '';

  const observations = parseObservations(textContent);

  if (observations.length < 2) {
    return {
      validation: noDataValidation(
        originalValue,
        observations.length,
        'Insufficient external data found.',
      ),
      evidence: [],
      obsCount: observations.length,
    };
  }

  const validation = calibrate(originalValue, observations);
  const evidence = observations.slice(0, 3).map((o) => ({
    metric,
    source: o.source,
    summary: `Found value: ${formatVal(o.value)}`,
    value: o.value,
  }));

  return { validation, evidence, obsCount: observations.length };
}

function parseObservations(text: string): Observation[] {
  // Try strict JSON first
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed?.observations)) {
      return parsed.observations
        .filter(
          (o: { value: unknown }) =>
            typeof o.value === 'number' && Number.isFinite(o.value) && o.value > 0,
        )
        .map((o: { value: number; source?: string }) => ({
          value: o.value,
          source: o.source ?? 'web search',
        }));
    }
  } catch {
    /* fall through to regex */
  }

  // Loose extract: try first JSON object inside the string
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed?.observations)) {
        return parsed.observations
          .filter(
            (o: { value: unknown }) =>
              typeof o.value === 'number' && Number.isFinite(o.value) && o.value > 0,
          )
          .map((o: { value: number; source?: string }) => ({
            value: o.value,
            source: o.source ?? 'web search',
          }));
      }
    } catch { /* ignore */ }
  }

  return [];
}

function calibrate(originalValue: number, observations: Observation[]) {
  const values = observations.map((o) => o.value).sort((a, b) => a - b);
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const median =
    n % 2 === 0 ? (values[n / 2 - 1] + values[n / 2]) / 2 : values[Math.floor(n / 2)];
  const p25 = values[Math.max(0, Math.floor(n * 0.25))];
  const p75 = values[Math.min(n - 1, Math.floor(n * 0.75))];
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, n - 1);
  const std = Math.sqrt(variance);
  const effectiveStd = std > 0 ? std : Math.max(1e-6, Math.abs(median) * 0.1);
  const discrepancy = (originalValue - median) / effectiveStd;
  const abs = Math.abs(discrepancy);

  let status: 'OK' | 'WARN' | 'OUTLIER';
  if (abs < 1.0) status = 'OK';
  else if (abs < 2.0) status = 'WARN';
  else status = 'OUTLIER';

  const out = {
    original_value: originalValue,
    external_median: round2(median),
    p25: round2(p25),
    p75: round2(p75),
    status,
    discrepancy_score: round2(discrepancy),
    notes:
      status === 'OUTLIER'
        ? `Value is ${abs.toFixed(1)}σ ${discrepancy > 0 ? 'above' : 'below'} external median.`
        : status === 'WARN'
          ? 'Value is at the boundary of the typical range.'
          : 'Value aligns with external reality.',
    observation_count: n,
  } as {
    original_value: number;
    external_median: number;
    p25: number;
    p75: number;
    status: 'OK' | 'WARN' | 'OUTLIER' | 'NO_DATA';
    discrepancy_score: number;
    recommended_value?: number;
    notes: string;
    observation_count: number;
  };

  if (status === 'OUTLIER') out.recommended_value = round2(median);
  return out;
}

function noDataValidation(originalValue: number, obsCount: number, notes: string) {
  return {
    original_value: originalValue,
    external_median: null as number | null,
    p25: null as number | null,
    p75: null as number | null,
    status: 'NO_DATA' as const,
    discrepancy_score: 0,
    notes,
    observation_count: obsCount,
  };
}

function unavailablePayload(analysisId: string, latencyMs: number, reason: string) {
  return {
    analysis_id: analysisId,
    rvce_version: RVCE_VERSION,
    global_confidence_score: 0,
    reference_classes: [],
    metrics_validation: {},
    flags: [],
    evidence_samples: [],
    latency_ms: latencyMs,
    status: 'UNAVAILABLE',
    error: reason,
  };
}

async function logRun(row: Record<string, unknown>): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_ROLE) return;
  try {
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);
    await supa.from('rvce_validation_log').insert({
      ...row,
      rvce_version: RVCE_VERSION,
    });
  } catch { /* never block */ }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function slug(s: string): string {
  return (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatVal(v: number): string {
  if (v >= 1000) return `$${Math.round(v).toLocaleString()}`;
  return v.toString();
}
