import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { calculateStrictFinancials } from '../../supabase/functions/analyze-business/financial-calculator';
import { getEnhancedLocationMultiplier } from '../../supabase/functions/analyze-business/location-intelligence';
import { detectSubIndustry } from '../../supabase/functions/analyze-business/sub-industry-detection';
import type { IndustryBenchmarks } from '../../supabase/functions/analyze-business/index';
import {
  buildInputsUsed,
  engineInputCacheKey,
  normalizeForInputKey,
  parseStoredEngineInputs,
  pickEngineInputs,
  withEngineInputs,
} from '../../supabase/functions/analyze-business/engine-inputs';
import { classifyAssumptionOrigins } from '../../supabase/functions/_shared/assumption-origin';

// 2026-11-03, production: "HVAC repair company in Phoenix, AZ, 3 technicians"
// run twice from the homepage gave monthly net $15.1k (profitable month 12)
// and then $32.1k (month 10). The engine is pure; the narrator's revenue /
// price / investment guesses (temperature 0.2) changed between the runs.

const IDEA = 'HVAC repair company in Phoenix, AZ, 3 technicians';
const LOCATION = 'Phoenix, AZ';
const INDEX = 'supabase/functions/analyze-business/index.ts';

// index.ts's hardcoded 'general' benchmark, which both production runs used.
const GENERAL = {
  id: 'general', name: 'General Business', cogs_percent: 35,
  salaries_fixed: 5000, rent_fixed: 1500, utilities_fixed: 300, other_fixed: 1000,
  cac_min: 30, cac_max: 150, cac_typical: 60, average_check_min: 30, average_check_max: 300,
  orders_per_client: 2, client_lifetime_months: 12, ltv_cac_min: 3, ltv_cac_max: 6,
  net_margin_min: 10, net_margin_max: 25, keywords: [],
} as IndustryBenchmarks;

// Two narrator answers for the same idea, differing the way a temperature-0.2 LLM does.
const RUN_1 = {
  financial_json: JSON.stringify({ mrr: 62000, average_check: 420, orders_monthly: 148, startup_investment: 145000, cac: 180, ltv: 5100 }),
  marketing_json: JSON.stringify({ positioning: 'x', cac: 200, ltv: 5000 }),
  business_json: '{}',
};
const RUN_2 = {
  financial_json: { mrr: 98000, average_check: 365, orders_monthly: 268, startup_investment: 110000, cac: 150, ltv: 3900 },
  marketing_json: { positioning: 'y', ltv: 4100 },
  business_json: {},
};
// What generateDeterministicFallbackResult() writes when the narrator fails.
const FALLBACK = {
  financial_json: JSON.stringify({ mrr: 48000, average_check: 165, orders_monthly: 291, startup_investment: 78000, cac: 60, ltv: 3960 }),
  marketing_json: JSON.stringify({ cac: 60, ltv: 3960 }),
};

// transformResponse()'s chain (index.ts), with no typed numbers. Pinned to the
// source below so this replica cannot drift from production.
// deno-lint-ignore no-explicit-any
function engineFrom(raw: any) {
  const parse = (v: unknown) => (typeof v === 'string' ? JSON.parse(v) : v ?? {});
  const fa = parse(raw.financial_json);
  const mp = parse(raw.marketing_json);
  const finite = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  const rawMrr = finite(fa.mrr) ?? 50000;
  const rawInvestment = finite(fa.startup_investment) ?? 100000;
  const rawCac = GENERAL.cac_typical;
  const rawLtv = finite(fa.ltv) || finite(mp.ltv) || 500;
  const rawAvgCheck = finite(fa.average_check) ?? (GENERAL.average_check_min + GENERAL.average_check_max) / 2;
  return calculateStrictFinancials(
    rawMrr, rawInvestment, rawCac, rawLtv, rawAvgCheck,
    { ...GENERAL },
    getEnhancedLocationMultiplier(LOCATION),
    detectSubIndustry(IDEA, GENERAL.id),
  );
}

describe('the engine is deterministic', () => {
  it('identical inputs give identical output, every field', () => {
    expect(engineFrom(RUN_1)).toEqual(engineFrom(RUN_1));
  });

  it('the replica above is the chain index.ts actually runs', () => {
    const src = readFileSync(INDEX, 'utf8');
    expect(src).toMatch(/const rawMrr = userInputs\?\.monthly_revenue \?\? finite\(fa\.mrr\) \?\? 50000;/);
    expect(src).toMatch(/const rawInvestment = userInputs\?\.startup_investment \?\? finite\(fa\.startup_investment\) \?\? 100000;/);
    expect(src).toMatch(/const rawCac = userInputs\?\.cac \?\? benchmarks\.cac_typical;/);
    expect(src).toMatch(/const rawLtv = finite\(fa\.ltv\) \|\| finite\(mp\.ltv\) \|\| 500;/);
    expect(src).toMatch(/const rawAvgCheck = userInputs\?\.average_price \?\? finite\(fa\.average_check\) \?\? \(benchmarks\.average_check_min \+ benchmarks\.average_check_max\) \/ 2;/);
  });
});

describe('same idea, same numbers', () => {
  it('without reuse, two narrator answers give two different reports (the bug)', () => {
    const a = engineFrom(RUN_1);
    const b = engineFrom(RUN_2);
    expect(a.netProfit).not.toBe(b.netProfit);
    expect(a.mrr).not.toBe(b.mrr);
  });

  it('with the stored inputs, run 2 returns exactly run 1\'s engine output', () => {
    const stored = pickEngineInputs(RUN_1);
    // Stored as jsonb and read back.
    const fromDb = parseStoredEngineInputs(JSON.parse(JSON.stringify(stored)));
    expect(fromDb).toEqual(stored);
    const run1 = engineFrom(RUN_1);
    const run2 = engineFrom(withEngineInputs(RUN_2, fromDb!));
    expect(run2).toEqual(run1);
  });

  it('a repeat run whose narrator failed still matches (fallback payload, stored inputs)', () => {
    const stored = pickEngineInputs(RUN_1);
    expect(engineFrom(withEngineInputs(FALLBACK, stored))).toEqual(engineFrom(RUN_1));
  });

  it('absent fields stay absent, so the engine default applies on both runs', () => {
    const run1 = { financial_json: { mrr: 70000 }, marketing_json: {} };
    const stored = pickEngineInputs(run1);
    expect(stored).toEqual({ mrr: 70000, startup_investment: null, average_check: null, ltv: null });
    const reused = withEngineInputs(RUN_2, stored);
    expect(pickEngineInputs(reused)).toEqual(stored);
    expect(engineFrom(reused)).toEqual(engineFrom(run1));
  });

  it('picks LTV the way the engine does: fa.ltv, else mp.ltv, 0 counts as absent', () => {
    expect(pickEngineInputs({ financial_json: { ltv: 0 }, marketing_json: { ltv: 800 } }).ltv).toBe(800);
    expect(pickEngineInputs({ financial_json: '{"ltv": 900}', marketing_json: '{"ltv": 800}' }).ltv).toBe(900);
  });

  it('keeps the narrator text untouched', () => {
    const reused = withEngineInputs({ ...RUN_2, business_json: { executive_summary: 'text' } }, pickEngineInputs(RUN_1));
    expect(reused.business_json).toEqual({ executive_summary: 'text' });
    expect((reused.marketing_json as { positioning: string }).positioning).toBe('y');
  });

  it('rejects a malformed stored row instead of using it', () => {
    expect(parseStoredEngineInputs({ mrr: 'lots', startup_investment: null, average_check: null, ltv: null })).toBeNull();
    expect(parseStoredEngineInputs(null)).toEqual({ mrr: null, startup_investment: null, average_check: null, ltv: null });
  });
});

describe('the cache key', () => {
  const key = (idea: string, location = LOCATION, industryId = 'general', financialInputs: Record<string, unknown> = {}) =>
    engineInputCacheKey({ idea, location, industryId, financialInputs });

  it('ignores case, punctuation and spacing', async () => {
    expect(normalizeForInputKey('  HVAC repair company in Phoenix, AZ,  3 technicians. ')).toBe('hvac repair company in phoenix az 3 technicians');
    expect(await key(IDEA)).toBe(await key('hvac repair company in phoenix az 3 technicians'));
    expect(await key(IDEA, 'Phoenix, AZ')).toBe(await key(IDEA, 'phoenix az'));
  });

  it('changes with the location, the industry and typed numbers', async () => {
    const base = await key(IDEA);
    expect(await key(IDEA, 'Denver, CO')).not.toBe(base);
    expect(await key(IDEA, LOCATION, 'trades')).not.toBe(base);
    expect(await key(IDEA, LOCATION, 'general', { average_price: 350 })).not.toBe(base);
  });

  it('does not depend on the order of typed numbers, and ignores non-numbers', async () => {
    expect(await key(IDEA, LOCATION, 'general', { cac: 100, average_price: 350 }))
      .toBe(await key(IDEA, LOCATION, 'general', { average_price: 350, cac: 100, selected_industry: 'auto' }));
  });

  it('is a SHA-256 hex digest, so no idea text is stored', async () => {
    expect(await key(IDEA)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('index.ts wiring', () => {
  const src = readFileSync(INDEX, 'utf8');

  it('reuses stored inputs before transformResponse, on narrator and fallback paths alike', () => {
    const apply = src.indexOf('rawResult = withEngineInputs(rawResult, cachedEngineInputs.inputs);');
    const transform = src.indexOf('const result = transformResponse(rawResult,');
    const fallback = src.lastIndexOf('usedFallback = true;', transform);
    expect(apply).toBeGreaterThan(fallback);
    expect(transform).toBeGreaterThan(apply);
    expect(src).toMatch(/\.from\('engine_input_cache'\)[\s\S]{0,80}\.select\('inputs, source'\)/);
    expect(src).toMatch(/ignoreDuplicates: true/);
  });

  it('runs the narrator at temperature 0', () => {
    const call = src.slice(src.indexOf('model: "google/gemini-3-flash-preview"'), src.indexOf("task: 'analyze-business'"));
    expect(call).toMatch(/temperature: 0,/);
    expect(call).not.toMatch(/temperature: 0\.2/);
  });

  it('the cache table is service-role only', () => {
    const sql = readFileSync('supabase/migrations/20261103120000_engine_input_cache.sql', 'utf8');
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.engine_input_cache/);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/REVOKE ALL ON public\.engine_input_cache FROM anon, authenticated;/);
    expect(sql).not.toMatch(/CREATE POLICY/);
  });
});

describe('inputs this report used', () => {
  const benchmarks = { cac_typical: 60, cac_min: 30, cac_max: 150, average_check_min: 30, average_check_max: 300 };
  const loc = { confidence: 80 };
  const calc = engineFrom(RUN_1);

  it('labels narrator numbers as AI estimates and the rest by their real source', () => {
    const fa = JSON.parse(RUN_1.financial_json);
    const origins = classifyAssumptionOrigins({ userInputs: {}, fa, mp: {}, benchmarks, locationMultipliers: loc, subIndustry: null });
    const rows = Object.fromEntries(buildInputsUsed(calc, origins).map((r) => [r.key, r]));
    expect(rows.monthly_revenue.origin_label).toBe('AI estimate from your description');
    expect(rows.average_price.origin_label).toBe('AI estimate from your description');
    expect(rows.startup_investment.origin_label).toBe('AI estimate from your description');
    expect(rows.cac.origin_label).toBe('Industry default');
    expect(rows.customers.origin_label).toBe('Calculated from the figures above');
    expect(rows.payroll.origin_label).toBe('Industry default');
    expect(rows.monthly_revenue.value).toBe(calc.mrr);
    expect(rows.customers.value).toBe(calc.clientsActive);
    expect(rows.payroll.value).toBe(calc.expenses.salaries);
  });

  it('a fallback run\'s numbers are industry defaults, not AI extractions', () => {
    const fa = JSON.parse(FALLBACK.financial_json);
    const origins = classifyAssumptionOrigins({ userInputs: {}, fa, mp: {}, benchmarks, locationMultipliers: loc, subIndustry: null, estimateSource: 'industry_default' });
    expect(origins.monthly_revenue.origin).toBe('MODELED_BENCHMARK_PRIOR');
    expect(origins.average_price.origin).toBe('MODELED_BENCHMARK_PRIOR');
    const rows = Object.fromEntries(buildInputsUsed(calc, origins).map((r) => [r.key, r]));
    expect(rows.monthly_revenue.origin_label).toBe('Industry default');
  });

  it('typed numbers say "Your input"', () => {
    const origins = classifyAssumptionOrigins({
      userInputs: { average_price: 350, expected_customers: 120, monthly_costs: 40000 },
      fa: {}, mp: {}, benchmarks, locationMultipliers: loc, subIndustry: null,
    });
    const rows = Object.fromEntries(buildInputsUsed(calc, origins).map((r) => [r.key, r]));
    expect(rows.average_price.origin).toBe('your_input');
    expect(rows.customers.origin).toBe('your_input');
    expect(rows.monthly_costs.origin).toBe('your_input');
    expect(rows.payroll.origin).toBe('calculated');
  });

  it('transformResponse returns them and the register knows a fallback run', () => {
    const src = readFileSync(INDEX, 'utf8');
    expect(src).toMatch(/inputs_used: buildInputsUsed\(calc, assumptionOrigins\),/);
    expect(src).toMatch(/subIndustry,\r?\n\s+estimateSource,\r?\n\s+\}\);/);
    expect(src).toMatch(/let engineInputSource: EngineInputSource = usedFallback \? 'industry_default' : 'narrator';/);
  });
});
