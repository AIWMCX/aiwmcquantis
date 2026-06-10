/**
 * RVCE — Rapid Validation & Competitive Evidence
 * v0.3.0-deepseek
 *
 * Architecture:
 *   1. Search  → DuckDuckGo Lite HTML scrape (no API key) + Tavily fallback if TAVILY_API_KEY set
 *   2. Extract → DeepSeek deepseek-v4-flash (JSON mode, temp=0.1) to pull numeric observations
 *   3. Gate    → Tier-aware: free=20 obs, plus=40 obs, pro=60 obs; plus/pro required for RVCE
 *
 * Why DeepSeek: directive from product spec. No ANTHROPIC_API_KEY required.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getUserTier } from '../_shared/entitlements.ts';

const DEEPSEEK_API_KEY  = Deno.env.get('DEEPSEEK_API_KEY') ?? '';
const TAVILY_API_KEY    = Deno.env.get('TAVILY_API_KEY') ?? '';
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const DEEPSEEK_URL      = 'https://api.deepseek.com/v1/chat/completions';
const RVCE_VERSION      = 'rvce-0.3.0-deepseek';

// Tier → max total observations collected across all metrics
const OBS_LIMITS: Record<string, number> = {
  free:  20,
  plus:  40,
  pro:   60,
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
}

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
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
}

// ── Web Search ──────────────────────────────────────────────────────────────

async function tavilySearch(query: string): Promise<SearchResult[]> {
  try {
    const resp = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: false,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.results || []).slice(0, 5).map((r: any) => ({
      title: r.title || '',
      snippet: r.content || r.snippet || '',
      url: r.url || '',
    }));
  } catch {
    return [];
  }
}

async function duckDuckGoSearch(query: string): Promise<SearchResult[]> {
  try {
    const encoded = encodeURIComponent(query);
    const resp = await fetch(`https://lite.duckduckgo.com/lite/?q=${encoded}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Quantis-RVCE/0.3)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(9000),
    });
    if (!resp.ok) return [];
    const html = await resp.text();

    const results: SearchResult[] = [];

    // DDG Lite structure: result links in <a class="result-link">, snippets in .result-snippet
    const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/;
    const snippetRegex = /<td[^>]+class="result-snippet"[^>]*>([\s\S]*?)<\/td>/;

    const rows = html.match(rowRegex) || [];
    for (const row of rows) {
      const linkMatch = linkRegex.exec(row);
      const snippetMatch = snippetRegex.exec(row);
      if (linkMatch && snippetMatch) {
        const url = linkMatch[1];
        const title = linkMatch[2].replace(/<[^>]+>/g, '').trim();
        const snippet = snippetMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (url && title && !url.startsWith('//duckduckgo')) {
          results.push({ title, snippet, url });
        }
      }
      if (results.length >= 5) break;
    }

    // Fallback: grab any links + text if structured parse fails
    if (results.length === 0) {
      const fallbackLinks = [...html.matchAll(/href="(https?:\/\/[^"]+)"[^>]*>([^<]{5,60})<\/a>/g)];
      for (const m of fallbackLinks.slice(0, 5)) {
        results.push({ url: m[1], title: m[2].trim(), snippet: '' });
      }
    }

    return results;
  } catch {
    return [];
  }
}

async function webSearch(query: string): Promise<SearchResult[]> {
  if (TAVILY_API_KEY) {
    const results = await tavilySearch(query);
    if (results.length > 0) return results;
  }
  return duckDuckGoSearch(query);
}

// ── DeepSeek Observation Extraction ────────────────────────────────────────

async function extractObservations(
  metric: string,
  searchResults: SearchResult[],
  profile: { industry: string; city: string; business_model: string },
): Promise<Observation[]> {
  if (searchResults.length === 0) return [];
  if (!DEEPSEEK_API_KEY) return extractNumericFallback(metric, searchResults);

  const isPercentage = metric.includes('pct');
  const isRatio      = metric.includes('ratio');
  const isMonths     = metric.includes('months');
  const unit = isPercentage ? '%' : isRatio ? 'x' : isMonths ? 'months' : 'USD';
  const monthlyNote = (!isPercentage && !isRatio && !isMonths && metric.includes('monthly'))
    ? ' Convert annual figures to monthly (÷12).' : '';

  const searchText = searchResults
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`)
    .join('\n\n');

  const userPrompt =
`Extract every numeric ${metric.replace(/_/g, ' ')} benchmark from these web results.
Context: ${profile.industry} business, ${profile.city}, model=${profile.business_model}.
Unit: ${unit}.${monthlyNote}

${searchText}

Return ONLY valid JSON:
{"observations":[{"value":12000,"source":"site name or brief description","url":"https://..."}]}
Rules:
- Only real numbers from the text — no fabrication
- Max 8 observations
- For % metrics use the raw number (62 not 0.62)
- If nothing found: {"observations":[]}`;

  try {
    const resp = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a financial benchmark extractor. Extract numeric values only from provided text. Return only valid JSON.',
          },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 600,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!resp.ok) return extractNumericFallback(metric, searchResults);

    const data = await resp.json();
    const content: string = data.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);

    return ((parsed.observations ?? []) as any[])
      .filter((o) => typeof o.value === 'number' && isFinite(o.value) && o.value > 0)
      .map((o) => ({
        value: o.value as number,
        source: (o.source as string) || 'web search',
        url:    (o.url    as string) || '',
        confidence: 0.78,
      }));
  } catch {
    return extractNumericFallback(metric, searchResults);
  }
}

function extractNumericFallback(metric: string, searchResults: SearchResult[]): Observation[] {
  const observations: Observation[] = [];
  const isPercentage = metric.includes('pct') || metric.includes('margin') || metric.includes('rate');
  const numberRegex = /(?:\$\s*)?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(\s?%|\s?percent|\s?x|\s?months?)?/gi;

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
      observations.push({
        value,
        source: result.title || 'web search numeric extraction',
        url: result.url || '',
        confidence: 0.52,
      });
      if (observations.length >= 4) return observations;
    }
  }

  return observations;
}

// ── Per-metric validation ───────────────────────────────────────────────────

async function validateMetric(
  metric: string,
  originalValue: number,
  profile: { industry: string; city: string; business_model: string; country: string },
  adminClient?: any,
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
  };

  let observations: Observation[] = [];

  // Primary queries
  for (const q of templates.primary.map(fill)) {
    diag.queries_sent.push(q);
    try {
      const results = await webSearch(q);
      if (results.length > 0) {
        diag.web_search_fired = true;
        (diag as any).web_search_tool_fired = true;
        (diag as any).tool_use_count += 1;
        (diag as any).tool_result_count += results.length;
        (diag as any).raw_results_found += results.length;
        diag.results_found += results.length;
        diag.source_urls.push(...results.map(r => r.url).filter(Boolean));
        const extracted = await extractObservations(metric, results, profile);
        observations.push(...extracted);
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
        const results = await webSearch(q);
        if (results.length > 0) {
          diag.web_search_fired = true;
          (diag as any).web_search_tool_fired = true;
          (diag as any).tool_use_count += 1;
          (diag as any).tool_result_count += results.length;
          (diag as any).raw_results_found += results.length;
          diag.results_found += results.length;
          diag.source_urls.push(...results.map(r => r.url).filter(Boolean));
          const extracted = await extractObservations(metric, results, profile);
          observations.push(...extracted);
        }
      } catch { /* best-effort */ }
      if (observations.length >= 4) break;
    }
  }

  // Deduplicate & clean
  observations = dedupe(observations);
  diag.source_urls = [...new Set(diag.source_urls)];
  diag.parsed_observations = observations.length;

  if (observations.length < 2) {
    const benchmarkFallback = await internalBenchmarkFallback(metric, originalValue, profile, adminClient);
    if (benchmarkFallback) {
      diag.parsed_observations = benchmarkFallback.validation.observation_count;
      return { ...benchmarkFallback, diagnostics: diag };
    }

    return {
      validation: {
        original_value: originalValue,
        external_median: null,
        p25: null, p75: null,
        status: 'NO_DATA',
        discrepancy_score: 0,
        notes: diag.web_search_fired
          ? 'Web search ran but found insufficient numeric data for this metric.'
          : 'No web results found. External validation unavailable.',
        observation_count: observations.length,
        web_search_fired: diag.web_search_fired,
        sources_used: diag.source_urls.length,
      },
      evidence: [],
      diagnostics: diag,
    };
  }

  const values = observations.map(o => o.value).sort((a, b) => a - b);
  const n   = values.length;
  const med = n % 2 === 0 ? (values[n / 2 - 1] + values[n / 2]) / 2 : values[Math.floor(n / 2)];
  const p25 = values[Math.max(0, Math.floor(n * 0.25))];
  const p75 = values[Math.min(n - 1, Math.floor(n * 0.75))];
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const std  = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, n - 1));
  const effStd = std > 0 ? std : Math.max(1e-6, Math.abs(med) * 0.1);
  const discrepancy = (originalValue - med) / effStd;

  const status =
    Math.abs(discrepancy) < 1.0 ? 'OK' :
    Math.abs(discrepancy) < 2.0 ? 'WARN' : 'OUTLIER';

  const validation: any = {
    original_value: originalValue,
    external_median: parseFloat(med.toFixed(2)),
    p25: parseFloat(p25.toFixed(2)),
    p75: parseFloat(p75.toFixed(2)),
    status,
    discrepancy_score: parseFloat(discrepancy.toFixed(2)),
    notes: status === 'OUTLIER'
      ? `Value is ${Math.abs(discrepancy).toFixed(1)}σ ${discrepancy > 0 ? 'above' : 'below'} the external median ($${med.toLocaleString()}) from ${n} sources.`
      : status === 'WARN'
      ? `Value sits at the boundary of the typical range ($${p25.toLocaleString()}–$${p75.toLocaleString()}) from ${n} sources.`
      : `Value aligns with external benchmarks (median $${med.toLocaleString()}) from ${n} sources.`,
    observation_count: observations.length,
    web_search_fired: diag.web_search_fired,
    sources_used: diag.source_urls.length,
  };

  if (status === 'OUTLIER') validation.recommended_value = parseFloat(med.toFixed(2));

  const evidence = observations.slice(0, 5).map(o => ({
    metric,
    source: o.source,
    url: o.url,
    summary: `$${o.value.toLocaleString()} — ${o.source}`,
    value: o.value,
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
    const scaledP25 = p25 * unitScale;
    const scaledP50 = p50 * unitScale;
    const scaledP75 = p75 * unitScale;
    const band = Math.max(1e-6, Math.abs(scaledP75 - scaledP25) / 1.35 || Math.abs(scaledP50) * 0.1);
    const discrepancy = (originalValue - scaledP50) / band;
    const status = Math.abs(discrepancy) < 1.0 ? 'OK' : Math.abs(discrepancy) < 2.0 ? 'WARN' : 'OUTLIER';

    return {
      validation: {
        original_value: originalValue,
        external_median: parseFloat(scaledP50.toFixed(2)),
        p25: parseFloat(scaledP25.toFixed(2)),
        p75: parseFloat(scaledP75.toFixed(2)),
        status,
        discrepancy_score: parseFloat(discrepancy.toFixed(2)),
        notes: `Calibrated against internal benchmark master (${data.normalized_sector}, ${data.match_level}, sample ${data.sample_size?.toLocaleString?.() ?? data.sample_size}).`,
        observation_count: 3,
        web_search_fired: false,
        sources_used: 1,
      },
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
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  const start = Date.now();

  try {
    // ── Tier resolution ──
    const authHeader = req.headers.get('Authorization') ?? '';
    let tier: 'free' | 'plus' | 'pro' = 'plus'; // default permissive if no auth
    let userId: string | null = null;
    let adminClient: any = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;

    if (authHeader.startsWith('Bearer ') && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const userClient  = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: claims } = await userClient.auth.getUser();
        if (claims?.user?.id) {
          userId = claims.user.id;
          const { tier: resolvedTier } = await getUserTier(adminClient, userId);
          tier = resolvedTier;
        }
      } catch { /* fail open — external validation is non-blocking */ }
    }

    // RVCE requires Plus or Pro
    if (tier === 'free') {
      return jsonResp({
        error: 'FEATURE_LOCKED',
        message: 'External validation (RVCE) requires a Plus or Pro subscription.',
        feature: 'rvce',
        currentTier: 'free',
      }, 403);
    }

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
        batch.map(m => validateMetric(m, core_metrics[m], profile, adminClient)),
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
        message: `${metric.replace(/_/g, ' ')} is ${Math.abs((v as any).discrepancy_score).toFixed(1)}σ ${(v as any).discrepancy_score > 0 ? 'above' : 'below'} external benchmarks. ${(v as any).notes}`,
        impacted_sections: ['Financial Analysis', 'Scenario Analysis'],
      }));

    const totalObs = searchDiagnostics.reduce((s, d) => s + d.parsed_observations, 0);
    const validatedMetricCount = Object.values(metricsValidation).filter((v: any) => v.status !== 'NO_DATA').length;

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

    logValidation(payload_out).catch(() => {});
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

async function logValidation(payload: any) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rvce_validation_log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        analysis_id:     payload.analysis_id || crypto.randomUUID(),
        rvce_version:    payload.rvce_version,
        global_confidence: payload.global_confidence_score,
        metrics_count:   Object.keys(payload.metrics_validation || {}).length,
        outlier_count:   payload.flags?.length || 0,
        warn_count:      Object.values(payload.metrics_validation || {}).filter((v: any) => v.status === 'WARN').length,
        no_data_count:   Object.values(payload.metrics_validation || {}).filter((v: any) => v.status === 'NO_DATA').length,
        total_observations: Object.values(payload.metrics_validation || {}).reduce((s: number, v: any) => s + (v.observation_count || 0), 0),
        reference_classes: payload.reference_classes,
        metrics_validation: payload.metrics_validation,
        flags:           payload.flags,
        evidence_samples: payload.evidence_samples,
        latency_ms:      payload.latency_ms,
      }),
    });
  } catch { /* best-effort */ }
}
