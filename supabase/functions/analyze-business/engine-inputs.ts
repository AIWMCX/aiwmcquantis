/**
 * Same idea, same numbers (2026-11-03).
 *
 * Evidence: the homepage idea "HVAC repair company in Phoenix, AZ, 3
 * technicians", run twice in production, gave monthly net $15.1k (profitable
 * from month 12) and then $32.1k (month 10). The engine
 * (financial-calculator.ts) is pure; the difference came from its inputs.
 * With no numbers typed, transformResponse() takes monthly revenue, average
 * price and startup investment (and the LTV it checks against) from the
 * narrator's financial_json, an LLM call at temperature 0.2. Each run
 * guessed again.
 *
 * Fix: the first run's engine inputs are stored under a hash of the
 * normalized idea, location, detected industry and any typed numbers. A
 * repeat run puts the stored values back into the narrator payload before
 * transformResponse(), so the engine receives identical inputs and produces
 * identical numbers. The narrator still writes the text; it no longer picks
 * the numbers a second time. CAC already ignores the narrator (2026-10-29).
 *
 * Pure: no Deno or network imports, so Vitest can import it.
 */

/** Bump when the stored fields or their meaning change; old rows are then ignored. */
export const ENGINE_INPUT_CACHE_VERSION = 1;

/** Where the stored numbers came from: the AI narrator, or the deterministic benchmark fallback. */
export type EngineInputSource = 'narrator' | 'industry_default';

/** The narrator-supplied values transformResponse() feeds into the engine. null = absent (engine default applies). */
export interface EngineInputs {
  mrr: number | null;
  startup_investment: number | null;
  average_check: number | null;
  ltv: number | null;
}

const NUMERIC_USER_FIELDS = [
  'average_price',
  'cac',
  'churn_rate',
  'expected_customers',
  'monthly_costs',
  'monthly_revenue',
  'startup_investment',
] as const;

/**
 * Lowercase, Unicode-normalized, punctuation and spacing collapsed, so
 * "HVAC repair company in Phoenix, AZ, 3 technicians" and
 * "hvac repair company in phoenix az  3 technicians" share a key.
 */
export function normalizeForInputKey(text: string | null | undefined): string {
  return String(text ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}$%]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Typed numbers in a fixed key order, so field order never changes the key. */
export function canonicalUserNumbers(inputs: Record<string, unknown> | null | undefined): string {
  if (!inputs) return '';
  return NUMERIC_USER_FIELDS
    .filter((k) => typeof inputs[k] === 'number' && Number.isFinite(inputs[k] as number))
    .map((k) => `${k}=${inputs[k]}`)
    .join('&');
}

export interface EngineInputKeyParts {
  idea: string;
  location: string;
  industryId: string;
  financialInputs?: Record<string, unknown> | null;
}

/** The exact string that is hashed. Exposed for tests. */
export function engineInputKeyMaterial(parts: EngineInputKeyParts): string {
  return [
    `v${ENGINE_INPUT_CACHE_VERSION}`,
    normalizeForInputKey(parts.idea),
    normalizeForInputKey(parts.location),
    String(parts.industryId ?? ''),
    canonicalUserNumbers(parts.financialInputs),
  ].join('|');
}

/** SHA-256 hex of the key material. Only the hash is stored, never the idea text. */
export async function engineInputCacheKey(parts: EngineInputKeyParts): Promise<string> {
  const bytes = new TextEncoder().encode(engineInputKeyMaterial(parts));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// deno-lint-ignore no-explicit-any
type Json = Record<string, any>;

/** Same tolerance as index.ts's safeParseJSON: object as-is, JSON string parsed, anything else {}. */
function asObject(value: unknown): Json {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Json;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    try {
      const parsed = JSON.parse(value.replace(/'/g, '"'));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
}

function finite(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function positive(v: unknown): number | null {
  const n = finite(v);
  return n !== null && n > 0 ? n : null;
}

/**
 * The values transformResponse() would read from this narrator payload, in
 * its own precedence: fa.mrr, fa.startup_investment, fa.average_check, and
 * fa.ltv || mp.ltv (a 0 LTV counts as absent there, so it does here).
 */
export function pickEngineInputs(raw: unknown): EngineInputs {
  const r = asObject(raw);
  const fa = asObject(r.financial_json);
  const mp = asObject(r.marketing_json);
  return {
    mrr: finite(fa.mrr),
    startup_investment: finite(fa.startup_investment),
    average_check: finite(fa.average_check),
    ltv: positive(fa.ltv) ?? positive(mp.ltv),
  };
}

/**
 * A copy of the narrator payload whose engine-input fields are exactly
 * `inputs`: present values are set, absent ones removed (so the engine's own
 * default applies, as it did on the run that stored them). Text fields are
 * untouched.
 */
export function withEngineInputs<T>(raw: T, inputs: EngineInputs): T {
  const r = { ...asObject(raw) };
  const fa: Json = { ...asObject(r.financial_json) };
  const mp: Json = { ...asObject(r.marketing_json) };
  const set = (obj: Json, key: string, value: number | null) => {
    if (value === null) delete obj[key];
    else obj[key] = value;
  };
  set(fa, 'mrr', inputs.mrr);
  set(fa, 'startup_investment', inputs.startup_investment);
  set(fa, 'average_check', inputs.average_check);
  set(fa, 'ltv', inputs.ltv);
  // mp.ltv is only a fallback for fa.ltv; drop it so a fresh narrator value can't leak in.
  delete mp.ltv;
  r.financial_json = fa;
  r.marketing_json = mp;
  return r as T;
}

/** A stored row is usable only if every field is a finite number or null. */
export function parseStoredEngineInputs(value: unknown): EngineInputs | null {
  const v = asObject(value);
  const keys: Array<keyof EngineInputs> = ['mrr', 'startup_investment', 'average_check', 'ltv'];
  const out = {} as EngineInputs;
  for (const k of keys) {
    const x = v[k];
    if (x === null || x === undefined) out[k] = null;
    else if (typeof x === 'number' && Number.isFinite(x)) out[k] = x;
    else return null;
  }
  return out;
}

// ─── "Inputs this report used" ───

export type InputOrigin = 'your_input' | 'ai_estimate' | 'industry_default' | 'calculated' | 'assumption';

export const INPUT_ORIGIN_LABELS: Record<InputOrigin, string> = {
  your_input: 'Your input',
  ai_estimate: 'AI estimate from your description',
  industry_default: 'Industry default',
  calculated: 'Calculated from the figures above',
  assumption: 'Assumption',
};

export interface InputUsedRow {
  key:
    | 'average_price'
    | 'customers'
    | 'monthly_revenue'
    | 'monthly_costs'
    | 'payroll'
    | 'cac'
    | 'startup_investment';
  label: string;
  value: number;
  unit: 'usd' | 'usd_per_month' | 'per_month';
  origin: InputOrigin;
  origin_label: string;
}

/** Origin classes as written by _shared/assumption-origin.ts. */
type OriginClass = 'USER_ACTUAL' | 'DERIVED' | 'MODELED_BENCHMARK_PRIOR' | 'SYSTEM_ASSUMPTION' | 'PLACEHOLDER';

function fromRegister(origin: OriginClass | undefined): InputOrigin {
  switch (origin) {
    case 'USER_ACTUAL': return 'your_input';
    case 'DERIVED': return 'ai_estimate';
    case 'MODELED_BENCHMARK_PRIOR': return 'industry_default';
    case 'SYSTEM_ASSUMPTION': return 'calculated';
    default: return 'assumption';
  }
}

export interface InputsUsedCalc {
  averageCheck: number;
  clientsActive: number;
  mrr: number;
  totalExpenses: number;
  expenses: { salaries: number };
  cac: number;
  startupInvestment: number;
}

/**
 * The key engine inputs, with where each came from. Values are the ones the
 * engine actually used (calc), origins come from the assumption register.
 * Customers are never AI-estimated: without a typed count they are revenue ÷
 * (price × orders per customer). Costs and payroll without a typed total are
 * the industry cost structure for the location.
 */
export function buildInputsUsed(
  calc: InputsUsedCalc,
  origins: Partial<Record<string, { origin: string }>>,
): InputUsedRow[] {
  const o = (key: string) => origins[key]?.origin as OriginClass | undefined;
  const costsTyped = o('monthly_costs') === 'USER_ACTUAL';
  const rows: Array<Omit<InputUsedRow, 'origin_label'>> = [
    { key: 'average_price', label: 'Average price per sale', value: calc.averageCheck, unit: 'usd', origin: fromRegister(o('average_price')) },
    {
      key: 'customers',
      label: 'Customers a month',
      value: calc.clientsActive,
      unit: 'per_month',
      origin: o('expected_customers') === 'USER_ACTUAL' ? 'your_input' : 'calculated',
    },
    { key: 'monthly_revenue', label: 'Monthly revenue', value: calc.mrr, unit: 'usd_per_month', origin: fromRegister(o('monthly_revenue')) },
    {
      key: 'monthly_costs',
      label: 'Monthly costs',
      value: calc.totalExpenses,
      unit: 'usd_per_month',
      origin: costsTyped ? 'your_input' : 'industry_default',
    },
    {
      key: 'payroll',
      label: 'Payroll (team)',
      value: calc.expenses.salaries,
      unit: 'usd_per_month',
      // A typed cost total is split across the benchmark items, so payroll is then derived from it.
      origin: costsTyped ? 'calculated' : 'industry_default',
    },
    { key: 'cac', label: 'Cost to win a customer', value: calc.cac, unit: 'usd', origin: fromRegister(o('cac')) },
    { key: 'startup_investment', label: 'Startup investment', value: calc.startupInvestment, unit: 'usd', origin: fromRegister(o('startup_investment')) },
  ];
  return rows
    .filter((r) => Number.isFinite(r.value))
    .map((r) => ({ ...r, origin_label: INPUT_ORIGIN_LABELS[r.origin] }));
}
