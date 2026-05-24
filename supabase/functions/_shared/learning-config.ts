/**
 * Learning Config helper — read-only, used by analysis engines.
 *
 * Pulls the currently active row from public.quantis_learning_config and
 * exposes per-segment priors and prompt hints. Cached in-process for 5min
 * to keep hot-path latency near zero. NEVER throws — engines fall through
 * to default behaviour if the table is empty or unreachable.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TTL_MS = 5 * 60 * 1000;

export interface LearningPriors {
  gross_margin?: { p25: number; p50: number; p75: number; n: number };
  net_margin?: { p25: number; p50: number; p75: number; n: number };
  ltv_cac?: { p25: number; p50: number; p75: number; n: number };
  cac_payback_months?: { p25: number; p50: number; p75: number; n: number };
}

export interface LearningConfig {
  version: number | null;
  priors: Record<string, LearningPriors>;
  promptHints: Record<string, string[]>;
}

interface CacheEntry {
  at: number;
  data: LearningConfig;
}

let cache: CacheEntry | null = null;

export async function getActiveLearningConfig(): Promise<LearningConfig> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const empty: LearningConfig = { version: null, priors: {}, promptHints: {} };
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) return empty;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin
      .from('quantis_learning_config')
      .select('version, priors, prompt_hints')
      .eq('is_active', true)
      .maybeSingle();
    if (error || !data) {
      cache = { at: Date.now(), data: empty };
      return empty;
    }
    const cfg: LearningConfig = {
      version: (data.version as number) ?? null,
      priors: (data.priors as Record<string, LearningPriors>) ?? {},
      promptHints: (data.prompt_hints as Record<string, string[]>) ?? {},
    };
    cache = { at: Date.now(), data: cfg };
    return cfg;
  } catch (err) {
    console.warn('[learning-config] fetch failed:', (err as Error).message);
    return empty;
  }
}

function key(sector: string | null, geo: string | null, model: string | null): string {
  return `${(sector || 'unknown').toLowerCase()}|${(geo || 'unknown').toLowerCase()}|${(model || 'unknown').toLowerCase()}`;
}

/** Match exact, then sector-only fallback. */
export function getPriorsFor(
  cfg: LearningConfig,
  sector: string | null,
  geo: string | null,
  model: string | null,
): LearningPriors | null {
  const exact = cfg.priors[key(sector, geo, model)];
  if (exact) return exact;
  const sectorOnly = cfg.priors[key(sector, null, null)];
  return sectorOnly || null;
}

export function getPromptHints(
  cfg: LearningConfig,
  sector: string | null,
  geo: string | null,
  model: string | null,
): string[] {
  const exact = cfg.promptHints[key(sector, geo, model)] || [];
  const sectorOnly = cfg.promptHints[key(sector, null, null)] || [];
  return [...exact, ...sectorOnly];
}

/** Convenience: invalidate cache (for tests / manual triggers). */
export function clearLearningConfigCache(): void {
  cache = null;
}
