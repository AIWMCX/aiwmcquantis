/**
 * Dahl canary/rollout gate.
 * ---------------------------------------------------------------------------
 * DAHL_ENABLED alone is a global master switch: flipping it to true would
 * route 100% of production text/reasoning traffic to Dahl instantly, which
 * the integration's own rollout rules explicitly forbid ("Do not switch 100%
 * of production traffic immediately... Enable Dahl only for owner/admin test
 * accounts in Production... Canary a small percentage... Expand gradually").
 *
 * This module is the second gate `aiCall()` checks (see llm-call.ts):
 * DAHL_ENABLED must be true AND isDahlEligible() must return true for a
 * given request before Dahl is attempted. Modes:
 *
 *   DAHL_CANARY_MODE=off         -- (default) never eligible, regardless of
 *                                    DAHL_ENABLED. The safe do-nothing state.
 *   DAHL_CANARY_MODE=admin_only  -- eligible only for user IDs listed in
 *                                    DAHL_CANARY_ADMIN_USER_IDS (comma-
 *                                    separated UUIDs). Requests with no
 *                                    userId are never eligible.
 *   DAHL_CANARY_MODE=percent     -- eligible for a deterministic, STABLE
 *                                    percentage of users (DAHL_CANARY_PERCENT,
 *                                    0-100), keyed by userId (falling back to
 *                                    requestId only when no userId exists --
 *                                    e.g. some server-to-server calls). The
 *                                    same user always lands in the same
 *                                    bucket -- this is a rollout percentage,
 *                                    not a per-call coin flip, so a canaried
 *                                    user's experience stays consistent
 *                                    across requests instead of flapping
 *                                    between providers.
 *
 * Fails closed throughout: any missing/malformed config, or a request with no
 * stable identity to bucket, resolves to NOT eligible -- never to "eligible
 * by default".
 */

export type DahlCanaryMode = 'off' | 'admin_only' | 'percent';

export function canaryMode(): DahlCanaryMode {
  const raw = Deno.env.get('DAHL_CANARY_MODE');
  if (raw === 'admin_only' || raw === 'percent') return raw;
  return 'off';
}

function adminAllowlist(): Set<string> {
  const raw = Deno.env.get('DAHL_CANARY_ADMIN_USER_IDS') ?? '';
  return new Set(
    raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0),
  );
}

/** Rejects (returns 0 = no rollout), rather than clamps, anything outside
 *  the documented 0-100 integer range. Clamping would make a config typo
 *  like DAHL_CANARY_PERCENT=500 fail OPEN (silently become "100% rollout"),
 *  which is backwards for a safety gate -- an invalid value must mean "no
 *  rollout", never "full rollout". */
function canaryPercent(): number {
  const raw = Deno.env.get('DAHL_CANARY_PERCENT');
  if (!raw) return 0;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 100) return 0;
  return n;
}

/** Deterministic 0-99 bucket for a given stable key (SHA-256 of the key,
 *  first 4 bytes as a uint32, mod 100). Same key always yields the same
 *  bucket -- this is what makes a percentage rollout stable per-user rather
 *  than a random coin flip on every request. */
async function stableBucket(key: string): Promise<number> {
  const bytes = new TextEncoder().encode(key);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const n = ((digest[0] << 24) | (digest[1] << 16) | (digest[2] << 8) | digest[3]) >>> 0;
  return n % 100;
}

/**
 * Third gate, independent of canary mode/percent: which Dahl task aliases
 * are actually cleared to serve real traffic right now.
 *
 * 2026-08-27 smoke test (docs/DAHL_CANARY_ROLLOUT.md, run 33119952790):
 * `general` hard-timed-out at 120s and `long_reasoning` took 92s against a
 * 60s production budget -- both a real, measured failure, not a hypothetical
 * one. `fast_reasoning` passed cleanly at 6.4s. Until `general`/
 * `long_reasoning` get their own passing smoke-test evidence, this allowlist
 * keeps them out of the request path entirely, REGARDLESS of what alias any
 * individual caller in llm-call.ts's 13 call sites requests (only one call
 * site -- analyze-business.ts -- passes an explicit alias today; the other
 * 12 fall through to dahlDefaultAlias(), which defaults to 'general' -- the
 * exact alias proven to time out). Fails closed: an alias not in this list
 * is never eligible, never "eligible by default".
 *
 * DAHL_CLEARED_ALIASES lets ops widen this without a code deploy once a
 * given alias earns its own passing evidence (comma-separated, e.g.
 * "fast_reasoning,long_reasoning"). Unset/empty falls back to the
 * fast_reasoning-only default below, not to "everything allowed".
 */
function clearedAliases(): Set<string> {
  const raw = Deno.env.get('DAHL_CLEARED_ALIASES');
  if (!raw || raw.trim().length === 0) return new Set(['fast_reasoning']);
  return new Set(raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0));
}

export function isDahlAliasCleared(alias: string): boolean {
  return clearedAliases().has(alias);
}

export interface DahlEligibilityInput {
  userId?: string | null;
  requestId?: string | null;
}

export async function isDahlEligible(input: DahlEligibilityInput): Promise<boolean> {
  const mode = canaryMode();
  if (mode === 'off') return false;

  if (mode === 'admin_only') {
    if (!input.userId) return false;
    return adminAllowlist().has(input.userId);
  }

  // mode === 'percent'
  const percent = canaryPercent();
  if (percent <= 0) return false;
  // No shortcut for percent >= 100: a request with no stable identity must
  // still fail closed even at a "100% rollout" setting -- there is no user
  // to consistently bucket, so there's nothing to make eligible.
  const key = input.userId ?? input.requestId ?? '';
  if (!key) return false; // no stable identity to bucket -- fail closed, not random
  const bucket = await stableBucket(key);
  return bucket < percent;
}
