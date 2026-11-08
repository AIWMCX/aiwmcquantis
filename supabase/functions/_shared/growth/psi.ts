/**
 * PageSpeed Insights v5 -> ext_metrics_daily rows (report 'psi_url', one row
 * per key page x device per day). Pure except fetchPsi() / runPsi().
 *
 * Docs: https://developers.google.com/speed/docs/insights/rest/v5/pagespeedapi/runpagespeed
 *   GET https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed
 *       ?url=...&strategy=MOBILE|DESKTOP&category=PERFORMANCE&category=SEO&...
 *   Without `category` only Performance runs, so all four are requested.
 *   The optional `key` query parameter is the GOOGLE_API_KEY edge secret;
 *   without it the API still answers at low volume (it can return 429).
 *
 * Two kinds of numbers come back and are stored apart:
 *   * lab:   one Lighthouse run from Google's servers at sync time
 *            (scores, LCP, CLS, TBT). It moves from run to run.
 *   * field: CrUX real-user p75 over the last 28 days, in `loadingExperience`.
 *            Only present when the page (or, with origin_fallback, the whole
 *            site) has enough Chrome traffic. Otherwise field_scope = 'none'
 *            and every field value is null. Never invented.
 * CrUX reports CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile as CLS x 100
 * (5 means 0.05); it is stored divided by 100.
 */
import { dimsKey, numOrNull, strOrNull, type MetricRow, type MetricValue } from './rows.ts';
import { absoluteUrl, type PsiDevice } from './targets.ts';

export const PSI_ENDPOINT = 'https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed';
export const PSI_CATEGORIES = ['PERFORMANCE', 'SEO', 'ACCESSIBILITY', 'BEST_PRACTICES'] as const;
/** A Lighthouse run usually takes 10-30 s; give up on one call after this. */
export const PSI_TIMEOUT_MS = 50_000;

export type CwvCategory = 'good' | 'needs-improvement' | 'poor';
export type FieldScope = 'url' | 'origin' | 'none';

interface CruxMetric {
  percentile?: number;
  category?: string;
}

interface LoadingExperience {
  id?: string;
  metrics?: Record<string, CruxMetric | undefined>;
  overall_category?: string;
  initial_url?: string;
  origin_fallback?: boolean;
}

export interface PsiResponse {
  id?: string;
  loadingExperience?: LoadingExperience;
  originLoadingExperience?: LoadingExperience;
  lighthouseResult?: {
    lighthouseVersion?: string;
    runtimeError?: { code?: string; message?: string };
    categories?: Record<string, { score?: number | null } | undefined>;
    audits?: Record<string, { numericValue?: number } | undefined>;
  };
}

export function psiRequestUrl(url: string, device: PsiDevice, apiKey?: string | null): string {
  const q = new URLSearchParams();
  q.set('url', url);
  q.set('strategy', device.toUpperCase());
  for (const c of PSI_CATEGORIES) q.append('category', c);
  if (apiKey) q.set('key', apiKey);
  return `${PSI_ENDPOINT}?${q.toString()}`;
}

/** CrUX FAST / AVERAGE / SLOW -> the Core Web Vitals words. NONE or missing -> null. */
export function cruxCategory(c: unknown): CwvCategory | null {
  if (c === 'FAST') return 'good';
  if (c === 'AVERAGE') return 'needs-improvement';
  if (c === 'SLOW') return 'poor';
  return null;
}

/** Google's published thresholds, for lab values that come without a category. */
export function cwvCategory(metric: 'lcp' | 'inp' | 'cls', value: number | null): CwvCategory | null {
  if (value === null) return null;
  const [good, poor] = metric === 'lcp' ? [2500, 4000] : metric === 'inp' ? [200, 500] : [0.1, 0.25];
  return value <= good ? 'good' : value <= poor ? 'needs-improvement' : 'poor';
}

const score100 = (v: unknown): number | null => {
  const n = numOrNull(v);
  return n === null ? null : Math.round(n * 100);
};
const roundOrNull = (v: number | null, digits = 0): number | null => {
  if (v === null) return null;
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

const FIELD_KEYS = {
  lcp: 'LARGEST_CONTENTFUL_PAINT_MS',
  inp: 'INTERACTION_TO_NEXT_PAINT',
  cls: 'CUMULATIVE_LAYOUT_SHIFT_SCORE',
} as const;

export function fieldScope(le: LoadingExperience | undefined): FieldScope {
  const m = le?.metrics ?? {};
  const has = Object.values(FIELD_KEYS).some((k) => numOrNull(m[k]?.percentile) !== null);
  if (!has) return 'none';
  return le?.origin_fallback ? 'origin' : 'url';
}

export function mapPsiResponse(
  res: PsiResponse,
  target: { path: string; device: PsiDevice; day: string },
): MetricRow {
  const lh = res.lighthouseResult ?? {};
  const cats = lh.categories ?? {};
  const audits = lh.audits ?? {};
  const le = res.loadingExperience;
  const scope = fieldScope(le);
  const fm = scope === 'none' ? {} : (le?.metrics ?? {});
  const clsP = numOrNull(fm[FIELD_KEYS.cls]?.percentile);

  const metrics: Record<string, MetricValue> = {
    perf_score: score100(cats.performance?.score),
    seo_score: score100(cats.seo?.score),
    accessibility_score: score100(cats.accessibility?.score),
    best_practices_score: score100(cats['best-practices']?.score),
    lab_lcp_ms: roundOrNull(numOrNull(audits['largest-contentful-paint']?.numericValue)),
    lab_cls: roundOrNull(numOrNull(audits['cumulative-layout-shift']?.numericValue), 3),
    lab_tbt_ms: roundOrNull(numOrNull(audits['total-blocking-time']?.numericValue)),
    field_scope: scope,
    field_lcp_p75_ms: numOrNull(fm[FIELD_KEYS.lcp]?.percentile),
    field_lcp_category: cruxCategory(fm[FIELD_KEYS.lcp]?.category),
    field_inp_p75_ms: numOrNull(fm[FIELD_KEYS.inp]?.percentile),
    field_inp_category: cruxCategory(fm[FIELD_KEYS.inp]?.category),
    field_cls_p75: clsP === null ? null : roundOrNull(clsP / 100, 3),
    field_cls_category: cruxCategory(fm[FIELD_KEYS.cls]?.category),
    field_overall_category: scope === 'none' ? null : cruxCategory(le?.overall_category),
    lighthouse_version: strOrNull(lh.lighthouseVersion),
    runtime_error: strOrNull(lh.runtimeError?.code),
  };
  const dims = { path: target.path, device: target.device };
  return { source: 'psi', day: target.day, report: 'psi_url', dims, metrics, dims_key: dimsKey(dims) };
}

/** Remove a secret from text that might echo it (never expected, cheap insurance). */
export function redact(text: string, secret?: string | null): string {
  return secret ? text.split(secret).join('[redacted]') : text;
}

/** Network: one PSI call. Errors name the page and device, never the request URL (it can carry the key). */
export async function fetchPsi(
  path: string,
  device: PsiDevice,
  apiKey: string | null,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = PSI_TIMEOUT_MS,
): Promise<PsiResponse> {
  let res: Response;
  try {
    res = await fetchImpl(psiRequestUrl(absoluteUrl(path), device, apiKey), { signal: AbortSignal.timeout(timeoutMs) });
  } catch (e) {
    const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    throw new Error(redact(`PSI ${path} ${device}: ${msg}`, apiKey));
  }
  const body = (await res.json().catch(() => ({}))) as PsiResponse & { error?: { message?: string; status?: string } };
  if (!res.ok) {
    throw new Error(redact(`PSI ${path} ${device}: HTTP ${res.status} ${body.error?.status ?? ''} ${body.error?.message ?? ''}`.replace(/\s+/g, ' ').trim(), apiKey));
  }
  return body;
}

/** Run `fn` over `items` with at most `limit` in flight; results keep input order. */
export async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return out;
}

export interface PsiRunResult {
  rows: MetricRow[];
  calls: number;
  errors: string[];
  /** Targets not started because the time budget ran out. */
  not_started: string[];
}

/** Every target, `concurrency` at a time; one failed call never stops the rest. */
export async function runPsi(
  targets: ReadonlyArray<{ path: string; device: PsiDevice }>,
  day: string,
  apiKey: string | null,
  opts: { concurrency: number; deadline: number; fetchImpl?: typeof fetch; now?: () => number },
): Promise<PsiRunResult> {
  const now = opts.now ?? Date.now;
  const result: PsiRunResult = { rows: [], calls: 0, errors: [], not_started: [] };
  await mapLimit(targets, opts.concurrency, async (t) => {
    if (now() > opts.deadline) {
      result.not_started.push(`${t.path} ${t.device}`);
      return;
    }
    result.calls++;
    try {
      const res = await fetchPsi(t.path, t.device, apiKey, opts.fetchImpl ?? fetch);
      result.rows.push(mapPsiResponse(res, { ...t, day }));
    } catch (e) {
      result.errors.push(e instanceof Error ? e.message : String(e));
    }
  });
  return result;
}
