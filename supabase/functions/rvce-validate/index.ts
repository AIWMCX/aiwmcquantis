/**
 * RVCE — Rapid Validation & Competitive Evidence
 * v0.3.0-deepseek
 *
 * Architecture:
 *   1. Search  → Tavily (shared client), DuckDuckGo HTML fallback. Every call records its
 *               outcome (search-outcome.ts); a failed provider is never reported as "no data".
 *   2. Extract → DeepSeek deepseek-v4-flash (JSON mode, temp=0.1) to pull numeric observations
 *      (legacy deepseek model deprecated 2026-07-24 — migrated to V4 model name directly)
 *   3. Gate    → Tier-aware budgets: free=20 obs, plus=40 obs, pro=100 obs.
 *               RVCE runs for every authenticated user (canonical spec 2026-06-20).
 *
 * Why DeepSeek: directive from product spec. No ANTHROPIC_API_KEY required.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getUserTier } from '../_shared/entitlements.ts';
import { maybeHealthResponse } from '../_shared/health.ts';
import { computeRvceStatus, fmtMetricValue } from './status.ts';
import { logAiCall } from '../_shared/ai-logger.ts';
import { deepseekCostUsd } from './cost.ts';
import { createTavilyClient } from '../_shared/tavily-client.ts';
import {
  describeFailures,
  duckDuckGoSearch,
  noDataNote,
  noEvidenceRejectionReason,
  providerOutcomeCounts,
  searchWithFallback,
  summarizeAttempts,
  type ProviderAttempt,
  type ProviderOutcome,
  type SearchProviderId,
  type SearchResult,
} from './search-outcome.ts';

const FUNCTION_NAME = 'rvce-validate';
const FUNCTION_VERSION = '0.5.1';


const DEEPSEEK_API_KEY  = Deno.env.get('DEEPSEEK_API_KEY') ?? '';
const TAVILY_API_KEY    = Deno.env.get('TAVILY_API_KEY') ?? '';
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const DEEPSEEK_URL      = 'https://api.deepseek.com/v1/chat/completions';
const RVCE_VERSION      = 'rvce-0.5.1-deepseek';

// Tier → max total observations collected across all metrics.
// Canonical spec (2026-06-20, locked): Free 20 / Plus 40 / Pro 100.
const OBS_LIMITS: Record<string, number> = {
  free:  20,
  plus:  40,
  pro:   100,
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Max-Age': '86400',
};

// ── Query templates (unchanged from v0.2) ──────────────────────────────────

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
    fallback: ['ideal LTV CAC ratio by industry'],
  },
  cac_payback_months: {
    primary: [
      '{industry} CAC payback period months benchmark',
      '{business_model} payback period average',
    ],
    fallback: ['average CAC payback period months startup'],
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

const METRICS_TO_VALIDATE = Object.keys(QUERY_TEMPLATES);

interface Observation {
  value: number;
  source: string;
  url: string;
  confidence: number;
  /** The search provider whose result this value was extracted from. */
  provider?: SearchProviderId;
}

interface SearchDiagnostics {
  metric: string;
  queries_sent: string[];
  web_search_tool_fired: boolean;
  tool_use_count: number;
  tool_result_count: number;
  raw_results_found: number;
  web_search_fired: boolean;
  results_found: number;
  parsed_observations: number;
  fallback_used: boolean;
  source_urls: string[];
  error: string | null;
  /** Counts by normalization_status across all extracted observations for this metric — no raw text, counts only. */
  normalization_counts: Record<string, number>;
  /** success / degraded / failed across every provider call for this metric (search-outcome.ts). */
  search_outcome: ProviderOutcome;
  /** One entry per provider call, in order, with the failure reason when it failed. */
  provider_attempts: ProviderAttempt[];
}

// ── Web Search ──────────────────────────────────────────────────────────────
// Tavily first, DuckDuckGo when Tavily failed or returned nothing. Errors are
// recorded per call, never turned into an empty list (F1, search-outcome.ts).

const tavily = createTavilyClient({ apiKey: TAVILY_API_KEY });

function webSearch(query: string) {
  return searchWithFallback(query, { tavily, duckDuckGo: (q) => duckDuckGoSearch(q) });
}

// ── Unit-safety layer ───────────────────────────────────────────────────────
// See unit-normalization.ts for the full contract and rationale. Every raw
// extracted number is classified by unit and run through normalizeObservation
// before it can reach calibration — accepted, converted, quarantined (missing
// conversion context), or rejected, never silently guessed or dropped.
import {
  normalizeObservation,
  classifyRawUnitFromContext,
  type NormalizedObservation,
  type RawUnit,
} from './unit-normalization.ts';

interface ExtractionResult {
  accepted: Observation[];
  normalized: NormalizedObservation[];
}

function splitNormalized(normalized: NormalizedObservation[]): ExtractionResult {
  const accepted: Observation[] = [];
  for (const n of normalized) {
    if (
      (n.normalization_status === 'accepted_exact' || n.normalization_status === 'accepted_converted') &&
      n.normalized_value !== null
    ) {
      accepted.push({
        value: n.normalized_value,
        source: n.source_title || 'web search',
        url: n.source_url,
        confidence: n.extraction_method === 'deepseek' ? 0.78 : 0.52,
      });
    }
  }
  return { accepted, normalized };
}

function summarizeNormalization(normalized: NormalizedObservation[]): string {
  const counts: Record<string, number> = {};
  for (const n of normalized) counts[n.normalization_status] = (counts[n.normalization_status] ?? 0) + 1;
  return Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', ');
}

// ── DeepSeek Observation Extraction ────────────────────────────────────────

async function extractObservations(
  metric: string,
  searchResults: SearchResult[],
  profile: { industry: string; city: string; business_model: string },
  logCtx: RvceLogCtx = {},
): Promise<ExtractionResult> {
  if (searchResults.length === 0) return { accepted: [], normalized: [] };
  if (!DEEPSEEK_API_KEY) return extractNumericFallback(metric, searchResults);

  const isPercentage = metric.includes('pct');
  const isRatio      = metric.includes('ratio');
  const isMonths     = metric.includes('months');
  const unit = isPercentage ? '%' : isRatio ? 'x' : isMonths ? 'months' : 'USD';

  const searchText = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`)
    .join('\n\n');

  const rawUnitList = 'monthly_usd, annual_usd, weekly_usd, daily_usd, per_sqft_monthly, per_sqft_annual, ' +
    'per_hour, per_transaction, per_customer, per_unit, percentage, ratio_x, months, total_usd, unknown';

  const userPrompt =
`Extract every numeric ${metric.replace(/_/g, ' ')} benchmark from these web results.
Context: ${profile.industry} business, ${profile.city}, model=${profile.business_model}.
Target unit: ${unit}.

${searchText}

For EACH number found, report its unit EXACTLY as stated in the source text —
do NOT convert or assume it matches the target unit. raw_unit must be one of:
${rawUnitList}
raw_currency should be a 3-letter code (USD if unmarked or a $ sign is used).

Return ONLY valid JSON:
{"observations":[{"value":12000,"raw_unit":"monthly_usd","raw_currency":"USD","source":"site name or brief description","url":"https://..."}]}
Rules:
- Only real numbers from the text — no fabrication
- Max 8 observations
- Report the unit as written in the source (e.g. "$3/sq ft" -> raw_unit "per_sqft_monthly", value 3) — never silently convert it yourself
- If nothing found: {"observations":[]}`;

  const startedAt = Date.now();
  try {
    const resp = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        // V4 defaults to thinking mode (empty content + reasoning_content),
        // which breaks the JSON extraction below — disable explicitly.
        thinking: { type: 'disabled' },
        messages: [
          {
            role: 'system',
            content: 'You are a financial benchmark extractor. Extract numeric values and their stated units only from provided text. Never convert units yourself. Return only valid JSON.',
          },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 700,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!resp.ok) {
      void logRvceCall(logCtx, metric, startedAt, 0, 0, false, `HTTP ${resp.status}`);
      return extractNumericFallback(metric, searchResults);
    }

    const data = await resp.json();
    void logRvceCall(
      logCtx, metric, startedAt,
      Number(data.usage?.prompt_tokens) || 0, Number(data.usage?.completion_tokens) || 0, true, null,
    );
    const content: string = data.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);

    const raw = (parsed.observations ?? []) as any[];
    const normalized = raw
      .filter((o) => typeof o.value === 'number' && Number.isFinite(o.value) && o.value > 0)
      .map((o) => normalizeObservation(
        metric,
        o.value as number,
        (VALID_RAW_UNITS.has(o.raw_unit) ? o.raw_unit : 'unknown') as RawUnit,
        { url: (o.url as string) || '', title: (o.source as string) || 'web search' },
        'deepseek',
        typeof o.raw_currency === 'string' && o.raw_currency.length === 3 ? o.raw_currency.toUpperCase() : 'USD',
      ));

    if (normalized.length > 0) {
      console.log(`[RVCE] ${metric} (deepseek): ${summarizeNormalization(normalized)}`);
    }
    return splitNormalized(normalized);
  } catch (e) {
    void logRvceCall(logCtx, metric, startedAt, 0, 0, false, (e as Error)?.message ?? 'error');
    return extractNumericFallback(metric, searchResults);
  }
}

interface RvceLogCtx { analysis_id?: string | null; user_id?: string | null }

/** #129: every RVCE extraction call goes to ai_calls, so "validated" claims
 *  can be checked against what actually ran. Never throws. */
function logRvceCall(
  ctx: RvceLogCtx, metric: string, startedAt: number,
  inputTokens: number, outputTokens: number, ok: boolean, error: string | null,
): Promise<void> {
  return logAiCall({
    user_id: ctx.user_id ?? null,
    analysis_id: ctx.analysis_id ?? null,
    task: 'rvce_extract',
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: deepseekCostUsd(inputTokens, outputTokens),
    latency_ms: Date.now() - startedAt,
    ok,
    error,
    metadata: { metric, rvce_version: RVCE_VERSION },
  });
}

const VALID_RAW_UNITS = new Set<string>([
  'monthly_usd', 'annual_usd', 'weekly_usd', 'daily_usd', 'per_sqft_monthly', 'per_sqft_annual',
  'per_hour', 'per_transaction', 'per_customer', 'per_unit', 'percentage', 'ratio_x', 'months',
  'total_usd', 'unknown',
]);

function extractNumericFallback(metric: string, searchResults: SearchResult[]): ExtractionResult {
  const normalized: NormalizedObservation[] = [];
  const isPercentage = metric.includes('pct') || metric.includes('margin') || metric.includes('rate');
  const numberRegex = /(?:\$\s*)?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(\s?%|\s?percent|\s?x|\s?months?)?/gi;
  const CONTEXT_WINDOW = 40;

  let acceptedCount = 0;
  for (const result of searchResults) {
    const text = `${result.title} ${result.snippet}`;
    const matches = [...text.matchAll(numberRegex)].slice(0, 4);
    for (const match of matches) {
      const raw = match[1]?.replace(/,/g, '');
      const suffix = (match[2] || '').toLowerCase();
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) continue;
      if (isPercentage && value > 100) continue;
      if (!isPercentage && suffix.includes('%')) continue;

      const matchIndex = match.index ?? 0;
      const contextStart = Math.max(0, matchIndex - CONTEXT_WINDOW);
      const contextEnd = Math.min(text.length, matchIndex + (match[0]?.length ?? 0) + CONTEXT_WINDOW);
      // The suffix regex group already caught inline "%/x/months" markers;
      // fall back to the surrounding window for "/sq ft", "/hour", "annual", etc.
      const rawUnit = suffix.includes('%') ? 'percentage'
        : suffix.includes('x') ? 'ratio_x'
        : suffix.includes('month') ? 'months'
        : classifyRawUnitFromContext(text.slice(contextStart, contextEnd));

      const n = normalizeObservation(
        metric, value, rawUnit,
        { url: result.url || '', title: result.title || 'web search numeric extraction' },
        'regex_fallback',
      );
      normalized.push(n);
      if (n.normalization_status === 'accepted_exact' || n.normalization_status === 'accepted_converted') {
        acceptedCount += 1;
      }
      if (acceptedCount >= 4) {
        console.log(`[RVCE] ${metric} (regex_fallback): ${summarizeNormalization(normalized)}`);
        return splitNormalized(normalized);
      }
    }
  }

  if (normalized.length > 0) {
    console.log(`[RVCE] ${metric} (regex_fallback): ${summarizeNormalization(normalized)}`);
  }
  return splitNormalized(normalized);
}

// ── Per-metric validation ───────────────────────────────────────────────────

async function validateMetric(
  metric: string,
  originalValue: number,
  profile: { industry: string; city: string; business_model: string; country: string },
  adminClient?: any,
  logCtx: RvceLogCtx = {},
): Promise<{ validation: any; evidence: any[]; diagnostics: SearchDiagnostics }> {
  const fill = (tpl: string) =>
    tpl.replace(/{industry}/g,      profile.industry)
       .replace(/{city}/g,          profile.city)
       .replace(/{business_model}/g, profile.business_model)
       .replace(/{country}/g,       profile.country);

  const templates = QUERY_TEMPLATES[metric] ?? {
    primary:  [`${profile.industry} ${metric.replace(/_/g, ' ')} benchmark`],
    fallback: [`average ${metric.replace(/_/g, ' ')} small business`],
  };

  const diag: SearchDiagnostics = {
    metric,
    queries_sent: [],
    web_search_tool_fired: false,
    tool_use_count: 0,
    tool_result_count: 0,
    raw_results_found: 0,
    web_search_fired: false,
    results_found: 0,
    parsed_observations: 0,
    fallback_used: false,
    source_urls: [],
    error: null,
    normalization_counts: {},
    search_outcome: 'failed',
    provider_attempts: [],
  };

  const addNormalizationCounts = (normalized: NormalizedObservation[]) => {
    for (const n of normalized) {
      diag.normalization_counts[n.normalization_status] = (diag.normalization_counts[n.normalization_status] ?? 0) + 1;
    }
  };

  let observations: Observation[] = [];

  // Primary queries
  for (const q of templates.primary.map(fill)) {
    diag.queries_sent.push(q);
    try {
      const { results, provider, attempts } = await webSearch(q);
      diag.provider_attempts.push(...attempts);
      if (results.length > 0) {
        diag.web_search_fired = true;
        (diag as any).web_search_tool_fired = true;
        (diag as any).tool_use_count += 1;
        (diag as any).tool_result_count += results.length;
        (diag as any).raw_results_found += results.length;
        diag.results_found += results.length;
        diag.source_urls.push(...results.map(r => r.url).filter(Boolean));
        const extracted = await extractObservations(metric, results, profile, logCtx);
        observations.push(...extracted.accepted.map(o => ({ ...o, provider: provider ?? undefined })));
        addNormalizationCounts(extracted.normalized);
      }
    } catch (e) {
      diag.error = `Primary query "${q}" failed: ${(e as Error).message}`;
    }
    if (observations.length >= 4) break;
  }

  // Fallback queries if we don't have enough observations
  if (observations.length < 3 && templates.fallback.length > 0) {
    diag.fallback_used = true;
    for (const q of templates.fallback.map(fill)) {
      diag.queries_sent.push(q);
      try {
        const { results, provider, attempts } = await webSearch(q);
        diag.provider_attempts.push(...attempts);
        if (results.length > 0) {
          diag.web_search_fired = true;
          (diag as any).web_search_tool_fired = true;
          (diag as any).tool_use_count += 1;
          (diag as any).tool_result_count += results.length;
          (diag as any).raw_results_found += results.length;
          diag.results_found += results.length;
          diag.source_urls.push(...results.map(r => r.url).filter(Boolean));
          const extracted = await extractObservations(metric, results, profile, logCtx);
          observations.push(...extracted.accepted.map(o => ({ ...o, provider: provider ?? undefined })));
          addNormalizationCounts(extracted.normalized);
        }
      } catch { /* best-effort */ }
      if (observations.length >= 4) break;
    }
  }

  // Deduplicate & clean
  observations = dedupe(observations);
  diag.source_urls = [...new Set(diag.source_urls)];
  diag.parsed_observations = observations.length;

  // A metric whose providers all failed shows the failure, never "no data".
  diag.search_outcome = summarizeAttempts(diag.provider_attempts);
  if (diag.search_outcome === 'failed' && !diag.error) {
    diag.error = `Search failed (${describeFailures(diag.provider_attempts) || 'no search call completed'})`;
  }

  if (observations.length < 2) {
    const benchmarkFallback = await internalBenchmarkFallback(metric, originalValue, profile, adminClient);
    if (benchmarkFallback) {
      diag.parsed_observations = benchmarkFallback.validation.observation_count;
      return {
        ...benchmarkFallback,
        validation: { ...benchmarkFallback.validation, search_outcome: diag.search_outcome },
        diagnostics: diag,
      };
    }

    return {
      validation: {
        original_value: originalValue,
        external_median: null,
        p25: null, p75: null,
        status: 'NO_DATA',
        discrepancy_score: 0,
        notes: noDataNote({ webSearchFired: diag.web_search_fired, attempts: diag.provider_attempts }),
        observation_count: observations.length,
        web_search_fired: diag.web_search_fired,
        sources_used: diag.source_urls.length,
        search_outcome: diag.search_outcome,
      },
      evidence: [],
      diagnostics: diag,
    };
  }

  const values = observations.map(o => o.value).sort((a, b) => a - b);
  const n   = values.length;
  const med = n % 2 === 0 ? (values[n / 2 - 1] + values[n / 2]) / 2 : values[Math.floor(n / 2)];
  // Rounded ONCE here (CodeRabbit catch on PR #86) and reused for both
  // status classification and the response payload -- previously status was
  // classified against the full-precision p25/p75 while the payload
  // returned them rounded to 2dp, so a value like 200.002 could classify
  // OK against a raw p75 of 200.004 while the user-visible range read
  // "...–200.00", making an in-range classification look wrong at exactly
  // the rounding boundary. Classifying against the SAME numbers the user
  // sees closes that gap.
  const p25 = parseFloat(values[Math.max(0, Math.floor(n * 0.25))].toFixed(2));
  const p75 = parseFloat(values[Math.min(n - 1, Math.floor(n * 0.75))].toFixed(2));
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const std  = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, n - 1));
  const effStd = std > 0 ? std : Math.max(1e-6, Math.abs(med) * 0.1);
  const discrepancy = (originalValue - med) / effStd;

  // P0 (2026-08-25 RVCE audit): status was previously decided PURELY by the
  // sigma-based `discrepancy` measure, entirely independent of the p25/p75
  // band actually displayed to the user. Because `effStd` can be wider than
  // the p25-p75 interval (e.g. a skewed source distribution), a value could
  // sit numerically OUTSIDE the displayed range and still register
  // |discrepancy| < 1.0 -> status 'OK' -> a green "Validated" badge. A real
  // production report showed exactly this: Customer LTV $391 above a
  // displayed P75 of $200, and Rent $156 below a displayed P25 of $235,
  // both marked "Validated". See computeRvceStatus() for the fix.
  const status = computeRvceStatus(metric, originalValue, p25, p75, discrepancy);

  const validation: any = {
    original_value: originalValue,
    external_median: parseFloat(med.toFixed(2)),
    p25,
    p75,
    status,
    discrepancy_score: parseFloat(discrepancy.toFixed(2)),
    notes: status === 'OUTLIER'
      ? `Value is ${Math.abs(discrepancy).toFixed(1)}σ ${discrepancy > 0 ? 'above' : 'below'} the external median (${fmtMetricValue(metric, med)}) from ${n} sources.`
      : status === 'WARN'
      ? `Value (${fmtMetricValue(metric, originalValue)}) falls outside the typical range (${fmtMetricValue(metric, p25)}–${fmtMetricValue(metric, p75)}) from ${n} sources.`
      : `Value aligns with external benchmarks (median ${fmtMetricValue(metric, med)}) from ${n} sources.`,
    observation_count: observations.length,
    web_search_fired: diag.web_search_fired,
    sources_used: diag.source_urls.length,
    search_outcome: diag.search_outcome,
  };

  if (status === 'OUTLIER') validation.recommended_value = parseFloat(med.toFixed(2));

  const evidence = observations.slice(0, 5).map(o => ({
    metric,
    source: o.source,
    url: o.url,
    summary: `$${o.value.toLocaleString()} — ${o.source}`,
    value: o.value,
    provider: o.provider ?? null,
  }));

  return { validation, evidence, diagnostics: diag };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function dedupe(obs: Observation[]): Observation[] {
  const out: Observation[] = [];
  for (const o of obs) {
    if (!out.some(u => Math.abs(u.value - o.value) / Math.max(u.value, 1) < 0.01)) out.push(o);
  }
  return out;
}

function mapToBenchmarkMetric(metric: string): string | null {
  const map: Record<string, string> = {
    gross_margin_pct: 'gross_margin',
    cac: 'cac',
    ltv: 'ltv',
    ltv_cac_ratio: 'ltv_cac_ratio',
  };
  return map[metric] ?? null;
}

async function internalBenchmarkFallback(
  metric: string,
  originalValue: number,
  profile: { industry: string; city: string; business_model: string; country: string },
  adminClient?: any,
): Promise<{ validation: any; evidence: any[] } | null> {
  const benchmarkMetric = mapToBenchmarkMetric(metric);
  if (!benchmarkMetric || !adminClient) return null;

  try {
    const { data, error } = await adminClient.rpc('benchmark_lookup', {
      p_metric: benchmarkMetric,
      p_sector: profile.industry,
      p_business_model: profile.business_model,
      p_country: profile.country,
      p_city_tier: null,
      p_stage: 'pre-revenue',
      p_size: null,
    });
    if (error || !data?.matched) return null;

    const p25 = Number(data.p25);
    const p50 = Number(data.p50);
    const p75 = Number(data.p75);
    if (![p25, p50, p75].every(Number.isFinite)) return null;

    const unitScale = metric.includes('pct') && p50 <= 1 ? 100 : 1;
    const scaledP50 = p50 * unitScale;
    // Rounded ONCE, same rounding-boundary fix as the web-search path above
    // (CodeRabbit catch on PR #86): status must classify against the exact
    // numbers returned in the payload, not full-precision values that then
    // get rounded away before the user ever sees them.
    const scaledP25 = parseFloat((p25 * unitScale).toFixed(2));
    const scaledP75 = parseFloat((p75 * unitScale).toFixed(2));
    const band = Math.max(1e-6, Math.abs(scaledP75 - scaledP25) / 1.35 || Math.abs(scaledP50) * 0.1);
    const discrepancy = (originalValue - scaledP50) / band;
    // Same computeRvceStatus() fix as the web-search path -- see its doc
    // comment. `band` (derived from the IQR / 1.35) could otherwise admit a
    // borderline-outside value as "within 1 sigma" purely from how the
    // ratio works out.
    const status = computeRvceStatus(metric, originalValue, scaledP25, scaledP75, discrepancy);
    const calibrationSource = `internal benchmark master (${data.normalized_sector}, ${data.match_level}, sample ${data.sample_size?.toLocaleString?.() ?? data.sample_size})`;

    const validation: any = {
      original_value: originalValue,
      external_median: parseFloat(scaledP50.toFixed(2)),
      p25: scaledP25,
      p75: scaledP75,
      status,
      discrepancy_score: parseFloat(discrepancy.toFixed(2)),
      // CodeRabbit catch on PR #86: this used to be a single fixed
      // "Calibrated against..." string regardless of status. Once the
      // OUTLIER flag message started reusing `notes` verbatim (see the
      // double-rounding fix above), a fallback-path OUTLIER lost its
      // severity/direction/median entirely -- the flag just said
      // "Calibrated against internal benchmark master (...)" with no
      // indication anything was actually wrong. Mirror validateMetric()'s
      // status-branching notes so both paths' OUTLIER/WARN messages carry
      // the same information, just attributed to a different source.
      notes: status === 'OUTLIER'
        ? `Value is ${Math.abs(discrepancy).toFixed(1)}σ ${discrepancy > 0 ? 'above' : 'below'} the calibrated median (${fmtMetricValue(metric, scaledP50)}) -- ${calibrationSource}.`
        : status === 'WARN'
        ? `Value (${fmtMetricValue(metric, originalValue)}) falls outside the typical range (${fmtMetricValue(metric, scaledP25)}–${fmtMetricValue(metric, scaledP75)}) -- ${calibrationSource}.`
        : `Value aligns with ${calibrationSource}.`,
      // GTM-audit item #12 (2026-08-26, Q16): this used to hardcode
      // observation_count: 3 regardless of the real (zero) web-observation
      // count, and the frontend badge rendered a normal green "Validated"
      // exactly as if 3 real external sources had been checked. This path
      // has zero web observations by construction (it only runs when the
      // web-search path returned <2) -- report that honestly so the badge
      // can distinguish "externally validated" from "internally estimated".
      observation_count: 0,
      web_search_fired: false,
      sources_used: 0,
    };
    if (status === 'OUTLIER') validation.recommended_value = parseFloat(scaledP50.toFixed(2));

    return {
      validation,
      evidence: [{
        metric,
        source: data.source || 'AIWMC Quantis Benchmark Master',
        url: '',
        summary: `P50 ${scaledP50.toLocaleString()} from ${data.normalized_sector} benchmark master`,
        value: scaledP50,
      }],
    };
  } catch {
    return null;
  }
}

function chunk<T>(arr: T[], n: number): T[][] {
  const r: T[][] = [];
  for (let i = 0; i < arr.length; i += n) r.push(arr.slice(i, i + n));
  return r;
}

function jsonResp(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  const healthResp = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (healthResp) return healthResp;
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });


  const start = Date.now();

  try {
    // ── Tier resolution ──
    // RVCE is non-blocking. A failure here MUST NOT return 4xx — the client
    // would render it as "could not be reached" which is a lie. Instead we
    // return a structured 200 with status: SKIPPED_TIER or SKIPPED_AUTH so
    // the UI can render the honest reason.
    const authHeader = req.headers.get('Authorization') ?? '';
    let tier: 'free' | 'plus' | 'pro' = 'free';
    let userId: string | null = null;
    let tierResolutionReason = 'no_auth_header';
    const adminClient: ReturnType<typeof createClient> | null =
      SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
        ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        : null;

    if (authHeader.startsWith('Bearer ') && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: claims, error: authErr } = await userClient.auth.getUser();
        if (authErr) {
          tierResolutionReason = `auth_error:${authErr.message}`;
        } else if (claims?.user?.id) {
          userId = claims.user.id;
          try {
            const { tier: resolvedTier } = await getUserTier(adminClient, userId);
            tier = resolvedTier;
            tierResolutionReason = `resolved:${resolvedTier}`;
          } catch (tierErr) {
            tierResolutionReason = `tier_lookup_error:${(tierErr as Error).message}`;
          }
        } else {
          tierResolutionReason = 'no_user_in_claims';
        }
      } catch (e) {
        tierResolutionReason = `unexpected_error:${(e as Error).message}`;
      }
    }

    // Per canonical spec 2026-06-20: RVCE is available to ALL authenticated
    // tiers — Free gets 20 obs, Plus 40, Pro 100. We only short-circuit when
    // we genuinely could not authenticate the user (SKIPPED_AUTH) — never for
    // a confirmed free user. Any tier resolution failure that still gives us
    // a user_id falls through and runs RVCE with the free budget.
    if (!userId) {
      console.log(`[rvce] skipping for missing user, reason=${tierResolutionReason}`);
      return jsonResp({
        analysis_id: 'unknown',
        rvce_version: RVCE_VERSION,
        global_confidence_score: 0,
        reference_classes: [],
        metrics_validation: {},
        flags: [],
        evidence_samples: [],
        latency_ms: Date.now() - start,
        status: 'SKIPPED_AUTH',
        search_health: {
          total_metrics_searched: 0, web_search_fired_count: 0, web_search_fired_ratio: 0,
          total_observations_collected: 0, total_source_urls: 0,
          fallback_queries_used: 0, metrics_with_zero_observations: 0,
          observation_limit: 0, tier_used: tier, search_provider: 'skipped',
        },
        search_diagnostics: [],
        skip_reason: tierResolutionReason,
      });
    }
    console.log(`[rvce] running for tier=${tier}, reason=${tierResolutionReason}`);

    const obsLimit = OBS_LIMITS[tier] ?? 40;

    // ── Parse body ──
    const payload = await req.json();
    const { analysis_id, business_profile, core_metrics } = payload;

    if (!business_profile || !core_metrics) {
      return jsonResp({ error: 'Missing business_profile or core_metrics' }, 400);
    }

    const { industry, location_city, business_model } = business_profile;
    const location_country = business_profile.location_country || 'US';

    const profile = { industry, city: location_city, business_model, country: location_country };

    const referenceClasses = [
      { id: `rc-${slug(industry)}-${slug(location_city)}`,    description: `${location_city} ${industry}`,     sample_size: 0 },
      { id: `rc-${slug(industry)}-${slug(location_country)}`, description: `${location_country} ${industry}`,  sample_size: 0 },
      ...(business_model ? [{ id: `rc-${slug(business_model)}`, description: `${business_model} model`, sample_size: 0 }] : []),
    ];

    const metricsToProcess = METRICS_TO_VALIDATE.filter(
      m => core_metrics[m] !== undefined && core_metrics[m] !== null && core_metrics[m] !== 0,
    );

    const metricsValidation: Record<string, any> = {};
    const evidenceSamples: any[] = [];
    const searchDiagnostics: SearchDiagnostics[] = [];

    // Process in batches of 3 (parallel per batch, sequential between batches)
    for (const batch of chunk(metricsToProcess, 3)) {
      const results = await Promise.allSettled(
        batch.map(m => validateMetric(m, core_metrics[m], profile, adminClient, {
          analysis_id: UUID_RE.test(String(analysis_id)) ? analysis_id : null,
          user_id: userId,
        })),
      );

      results.forEach((res, i) => {
        const metric = batch[i];
        if (res.status === 'fulfilled') {
          metricsValidation[metric] = res.value.validation;
          evidenceSamples.push(...res.value.evidence);
          searchDiagnostics.push(res.value.diagnostics);
        } else {
          metricsValidation[metric] = {
            original_value: core_metrics[metric],
            external_median: null, p25: null, p75: null,
            status: 'NO_DATA', discrepancy_score: 0,
            notes: `Validation failed: ${res.reason}`,
            observation_count: 0, web_search_fired: false,
          };
          searchDiagnostics.push({
            metric, queries_sent: [], web_search_fired: false,
            web_search_tool_fired: false, tool_use_count: 0, tool_result_count: 0,
            raw_results_found: 0, results_found: 0, parsed_observations: 0, fallback_used: false,
            source_urls: [], error: String(res.reason),
            normalization_counts: {}, search_outcome: 'failed', provider_attempts: [],
          });
        }
      });
    }

    // ── Confidence score ──
    const entries = Object.values(metricsValidation) as any[];
    let confidence = 85;
    confidence -= entries.filter(e => e.status === 'OUTLIER').length * 12;
    confidence -= entries.filter(e => e.status === 'WARN').length * 5;
    confidence -= entries.filter(e => e.status === 'NO_DATA').length * 3;

    const searchFiredCount = searchDiagnostics.filter(d => d.web_search_fired).length;
    const searchRatio = metricsToProcess.length > 0 ? searchFiredCount / metricsToProcess.length : 0;
    if (searchRatio >= 0.8) confidence += 5;
    if (searchRatio < 0.3)  confidence -= 10;
    confidence = Math.max(0, Math.min(100, confidence)) / 100;

    const flags = Object.entries(metricsValidation)
      .filter(([, v]) => (v as any).status === 'OUTLIER')
      .map(([metric, v]) => ({
        severity: 'high' as const,
        metric,
        // P0 (2026-08-25 RVCE audit): this used to recompute its OWN sigma
        // text from `discrepancy_score` (already rounded to 2dp) and glue it
        // in front of `notes`, which independently formats sigma from the
        // raw (unrounded) discrepancy at 1dp -- double-rounding the same
        // underlying number two different ways in the same message. A real
        // production warning showed "15.2σ" and "15.1σ" for the same value
        // as a result. `notes` already states the sigma/direction/median
        // for an OUTLIER (see validateMetric above) -- reuse it verbatim
        // instead of re-deriving a second, inconsistent figure.
        message: `${metric.replace(/_/g, ' ')}: ${(v as any).notes}`,
        impacted_sections: ['Financial Analysis', 'Scenario Analysis'],
      }));

    const totalObs = searchDiagnostics.reduce((s, d) => s + d.parsed_observations, 0);
    const validatedMetricCount = Object.values(metricsValidation).filter((v: any) => v.status !== 'NO_DATA').length;

    // Run-level search outcome from the per-metric ones: the run is degraded if
    // any metric's search was not a clean success, failed if none answered.
    const metricOutcomes = searchDiagnostics.map(d => d.search_outcome);
    const searchOutcome: ProviderOutcome | 'not_run' =
      metricOutcomes.length === 0 ? 'not_run'
      : metricOutcomes.every(o => o === 'success') ? 'success'
      : metricOutcomes.every(o => o === 'failed') ? 'failed'
      : 'degraded';

    const searchHealth = {
      total_metrics_searched:     metricsToProcess.length,
      web_search_fired_count:     searchFiredCount,
      web_search_fired_ratio:     parseFloat(searchRatio.toFixed(2)),
      total_observations_collected: totalObs,
      total_source_urls:          [...new Set(searchDiagnostics.flatMap(d => d.source_urls))].length,
      fallback_queries_used:      searchDiagnostics.filter(d => d.fallback_used).length,
      metrics_with_zero_observations: searchDiagnostics.filter(d => d.parsed_observations === 0).length,
      observation_limit:          obsLimit,
      tier_used:                  tier,
      search_provider:            TAVILY_API_KEY ? 'tavily+ddg' : 'duckduckgo',
      search_outcome:             searchOutcome,
      degraded:                   searchOutcome === 'degraded' || searchOutcome === 'failed',
      provider_outcomes:          providerOutcomeCounts(searchDiagnostics.flatMap(d => d.provider_attempts)),
    };

    const payload_out = {
      analysis_id,
      rvce_version: RVCE_VERSION,
      global_confidence_score: parseFloat(confidence.toFixed(3)),
      reference_classes: referenceClasses,
      metrics_validation: metricsValidation,
      flags,
      evidence_samples: evidenceSamples.slice(0, obsLimit),
      latency_ms: Date.now() - start,
      status: validatedMetricCount > 0 ? 'COMPLETED' : 'PARTIAL',
      search_health: searchHealth,
      search_diagnostics: searchDiagnostics,
    };

    persistObservations(adminClient, payload_out).catch((e) =>
      console.error(`[rvce] persistObservations failed (non-fatal): ${(e as Error).message}`),
    );
    return jsonResp(payload_out);

  } catch (err) {
    return jsonResp({
      analysis_id: 'unknown',
      rvce_version: RVCE_VERSION,
      global_confidence_score: 0,
      reference_classes: [],
      metrics_validation: {},
      flags: [],
      evidence_samples: [],
      latency_ms: Date.now() - start,
      status: 'PARTIAL',
      search_health: {
        total_metrics_searched: 0, web_search_fired_count: 0, web_search_fired_ratio: 0,
        total_observations_collected: 0, total_source_urls: 0,
        fallback_queries_used: 0, metrics_with_zero_observations: 0,
        observation_limit: 0, tier_used: 'unknown', search_provider: 'unknown',
      },
      search_diagnostics: [],
      error: (err as Error).message,
    });
  }
});

function slug(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Persists RVCE's results into rvce_observations — one row per real
 * evidence sample, plus one honest "no evidence found" row per validated
 * metric that had zero (matching the methodology page's own design
 * promise: report unavailable plainly rather than silently omitting).
 *
 * Replaces the previous logValidation(), which POSTed to
 * `rvce_validation_log` — a table that was never created, so every call
 * failed with a 404 and was silently swallowed by a bare `catch {}` since
 * this code was written. rvce_observations (the reviewed accuracy-schema
 * table) already existed with the right structure; nothing wrote to it.
 * Root cause of "0 rows in rvce_observations": two different persistence
 * targets, neither one working. Non-blocking by design — RVCE must never
 * fail an analysis over a logging problem — but errors are now logged,
 * not swallowed.
 */
interface RvceEvidenceSample {
  metric: string;
  source: string;
  url?: string;
  summary: string;
  value: number;
  provider?: SearchProviderId | null;
}

interface RvcePersistPayload {
  analysis_id: string;
  metrics_validation: Record<string, { status: string; discrepancy_score: number }>;
  evidence_samples: RvceEvidenceSample[];
  search_diagnostics?: Array<{ metric: string; provider_attempts: ProviderAttempt[] }>;
}

async function persistObservations(
  adminClient: ReturnType<typeof createClient> | null,
  payload: RvcePersistPayload,
): Promise<void> {
  if (!adminClient) return;

  const correlationId = crypto.randomUUID();
  const analysisId = UUID_RE.test(payload.analysis_id) ? payload.analysis_id : null;
  const rows: Record<string, unknown>[] = [];

  const evidenceByMetric = new Map<string, RvceEvidenceSample[]>();
  for (const sample of payload.evidence_samples ?? []) {
    const list = evidenceByMetric.get(sample.metric) ?? [];
    list.push(sample);
    evidenceByMetric.set(sample.metric, list);
  }
  const attemptsByMetric = new Map(
    (payload.search_diagnostics ?? []).map(d => [d.metric, d.provider_attempts ?? []] as const),
  );

  for (const [metric, validation] of Object.entries(payload.metrics_validation ?? {})) {
    const samples = evidenceByMetric.get(metric) ?? [];
    const v = validation as { status: string; discrepancy_score: number };
    // Same OK/WARN/OUTLIER -> score mapping used for comparability elsewhere
    // in this system; NO_DATA gets the lowest score since no evidence backs it.
    const qualityScore = v.status === 'OK' ? 0.9 : v.status === 'WARN' ? 0.6 : v.status === 'OUTLIER' ? 0.3 : 0.1;

    if (samples.length === 0) {
      rows.push({
        analysis_id: analysisId,
        correlation_id: correlationId,
        metric_code: metric,
        raw_value: null,
        normalized_value: null,
        unit: 'unknown',
        source_url: null,
        source_title: null,
        publisher: null,
        extraction_method: 'rvce_web_search',
        source_quality: qualityScore,
        comparability_score: qualityScore,
        accepted: false,
        // A provider failure is recorded as one, never as "no evidence found".
        rejection_reason: noEvidenceRejectionReason(attemptsByMetric.get(metric) ?? []),
      });
      continue;
    }

    for (const sample of samples) {
      const hasRealUrl = typeof sample.url === 'string' && sample.url.length > 0;
      rows.push({
        analysis_id: analysisId,
        correlation_id: correlationId,
        metric_code: metric,
        raw_value: sample.value,
        normalized_value: sample.value,
        unit: 'unknown',
        source_url: hasRealUrl ? sample.url : null,
        source_title: sample.summary ?? null,
        publisher: sample.source ?? null,
        extraction_method: !hasRealUrl ? 'internal_benchmark_master'
          : sample.provider ? `rvce_web_search:${sample.provider}` : 'rvce_web_search',
        source_quality: qualityScore,
        comparability_score: qualityScore,
        accepted: v.status !== 'OUTLIER',
        rejection_reason: v.status === 'OUTLIER' ? 'outlier_vs_reference' : null,
      });
    }
  }

  if (rows.length === 0) return;

  const { error } = await adminClient.from('rvce_observations').insert(rows);
  if (error) throw new Error(error.message);
}
