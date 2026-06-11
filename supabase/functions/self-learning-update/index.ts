/**
 * Self-Learning Update
 * Runs on a schedule (or via workflow_dispatch) to:
 *   1. Aggregate real analysis data from completed analyses
 *   2. Compute updated benchmark priors per industry/business_model/city
 *   3. Upsert into `self_learned_priors` table (created by migration below)
 *   4. Log a summary to `self_learning_runs`
 *
 * This improves RVCE accuracy over time as real data accumulates.
 * Uses DeepSeek for any LLM-assisted aggregation steps.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL           = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const DEEPSEEK_API_KEY       = Deno.env.get('DEEPSEEK_API_KEY') ?? '';
const DEEPSEEK_URL           = 'https://api.deepseek.com/v1/chat/completions';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Metrics we track as priors
const TRACKED_METRICS = [
  'revenue_monthly', 'gross_margin_pct', 'opex_marketing_monthly',
  'opex_rent_monthly', 'opex_payroll_monthly', 'ltv', 'cac',
  'ltv_cac_ratio', 'cac_payback_months', 'startup_investment_total',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  // Cron-only endpoint: require x-cron-secret header
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (!expectedSecret || !cronSecret || cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const start = Date.now();
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);


  try {
    // Fetch recent completed analyses (last 90 days, max 500)
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: analyses, error: fetchError } = await supabase
      .from('analyses')
      .select('id, industry, location_city, business_model, financial_inputs, result')
      .gte('created_at', cutoff)
      .not('result', 'is', null)
      .limit(500);

    if (fetchError) throw new Error(`Failed to fetch analyses: ${fetchError.message}`);
    if (!analyses || analyses.length === 0) {
      return jsonResp({ status: 'SKIPPED', reason: 'No recent analyses found', latency_ms: Date.now() - start });
    }

    // Group by industry + business_model
    const groups: Record<string, typeof analyses> = {};
    for (const a of analyses) {
      const key = `${(a.industry || 'unknown').toLowerCase()}::${(a.business_model || 'unknown').toLowerCase()}`;
      groups[key] = groups[key] ?? [];
      groups[key].push(a);
    }

    const upserts: any[] = [];
    let processedGroups = 0;

    for (const [groupKey, groupAnalyses] of Object.entries(groups)) {
      if (groupAnalyses.length < 3) continue; // Need ≥3 data points for a meaningful prior

      const [industry, business_model] = groupKey.split('::');

      const metricPriors: Record<string, { median: number; p25: number; p75: number; sample_size: number }> = {};

      for (const metric of TRACKED_METRICS) {
        const values: number[] = [];
        for (const a of groupAnalyses) {
          // Try financial_inputs first, then result fields
          const fin = a.financial_inputs as Record<string, any> ?? {};
          const res = (a.result as Record<string, any>) ?? {};

          const metricMap: Record<string, string[]> = {
            revenue_monthly:          ['monthly_revenue', 'revenue'],
            gross_margin_pct:         ['gross_margin', 'gross_margin_pct'],
            opex_marketing_monthly:   ['marketing_cost', 'opex_marketing'],
            opex_rent_monthly:        ['rent_cost', 'opex_rent'],
            opex_payroll_monthly:     ['payroll_cost', 'opex_payroll'],
            ltv:                      ['ltv', 'customer_ltv'],
            cac:                      ['cac', 'customer_acquisition_cost'],
            ltv_cac_ratio:            ['ltv_cac_ratio'],
            cac_payback_months:       ['cac_payback', 'cac_payback_months'],
            startup_investment_total: ['startup_investment', 'initial_investment'],
          };

          for (const fieldName of (metricMap[metric] ?? [metric])) {
            const val = fin[fieldName] ?? res[fieldName];
            if (typeof val === 'number' && isFinite(val) && val > 0) {
              values.push(val);
              break;
            }
          }
        }

        if (values.length < 3) continue;

        const sorted = values.slice().sort((a, b) => a - b);
        const n      = sorted.length;
        const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
        const p25    = sorted[Math.max(0, Math.floor(n * 0.25))];
        const p75    = sorted[Math.min(n - 1, Math.floor(n * 0.75))];

        metricPriors[metric] = {
          median:      parseFloat(median.toFixed(2)),
          p25:         parseFloat(p25.toFixed(2)),
          p75:         parseFloat(p75.toFixed(2)),
          sample_size: n,
        };
      }

      if (Object.keys(metricPriors).length === 0) continue;

      // Use DeepSeek to compute a quality score for the priors (optional — skip if no key)
      let priorQualityScore = 0.7; // default
      if (DEEPSEEK_API_KEY && Object.keys(metricPriors).length >= 3) {
        try {
          const prompt = `Rate the quality of these business benchmark priors on a scale 0-1.
Industry: ${industry}, Model: ${business_model}, Sample size: ${groupAnalyses.length}
Priors: ${JSON.stringify(metricPriors)}
Return ONLY a JSON: {"quality_score": 0.85, "notes": "brief reason"}`;
          const resp = await fetch(DEEPSEEK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
            body: JSON.stringify({
              model: 'deepseek-v4-flash',
              // V4 defaults to thinking mode — disable so content carries the JSON.
              thinking: { type: 'disabled' },
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 100,
              temperature: 0.1,
              response_format: { type: 'json_object' },
            }),
            signal: AbortSignal.timeout(10000),
          });
          if (resp.ok) {
            const d = await resp.json();
            const content = JSON.parse(d.choices?.[0]?.message?.content ?? '{}');
            if (typeof content.quality_score === 'number') {
              priorQualityScore = Math.max(0, Math.min(1, content.quality_score));
            }
          }
        } catch { /* best-effort */ }
      }

      upserts.push({
        industry,
        business_model,
        metric_priors:       metricPriors,
        sample_size:         groupAnalyses.length,
        quality_score:       priorQualityScore,
        last_updated_at:     new Date().toISOString(),
        data_window_days:    90,
      });
      processedGroups++;
    }

    // Upsert priors into DB
    let upsertedCount = 0;
    if (upserts.length > 0) {
      const { error: upsertError } = await supabase
        .from('self_learned_priors')
        .upsert(upserts, { onConflict: 'industry,business_model' });
      if (upsertError) {
        console.error('[self-learning] upsert error:', upsertError.message);
      } else {
        upsertedCount = upserts.length;
      }
    }

    // Log run summary
    const summary = {
      run_at:              new Date().toISOString(),
      analyses_processed:  analyses.length,
      groups_found:        Object.keys(groups).length,
      groups_updated:      processedGroups,
      priors_upserted:     upsertedCount,
      latency_ms:          Date.now() - start,
    };

    await supabase.from('self_learning_runs').insert(summary).catch(() => {});

    return jsonResp({ status: 'OK', ...summary });

  } catch (err) {
    console.error('[self-learning] fatal:', err);
    return jsonResp({ status: 'ERROR', error: (err as Error).message, latency_ms: Date.now() - start }, 500);
  }
});

function jsonResp(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
