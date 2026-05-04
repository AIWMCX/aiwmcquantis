/**
 * Lightweight event bus to surface backend-issued `upgrade_nudge` payloads
 * (from analyze-plus / analyze-pro / api-analyze responses) as both:
 *   - a toast (transient, attention)
 *   - a persistent inline banner in AppLayout (until dismissed)
 *
 * Backend contract: { headline, body, cta, target_tier? }
 */

export interface UpgradeNudgePayload {
  headline: string;
  body: string;
  cta: string;
  target_tier?: 'PLUS' | 'PRO';
  source?: string;
}

const EVT = 'aiwmc:upgrade-nudge';
const STORAGE_KEY = 'aiwmc.upgrade_nudge.active';
const DISMISS_KEY = 'aiwmc.upgrade_nudge.dismissed';

export function emitUpgradeNudge(payload: UpgradeNudgePayload | null | undefined) {
  if (!payload || !payload.headline || !payload.body) return;
  const dismissedKey = `${payload.headline}::${payload.body}`;
  try {
    if (sessionStorage.getItem(DISMISS_KEY) === dismissedKey) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* sessionStorage not available */
  }
  window.dispatchEvent(new CustomEvent<UpgradeNudgePayload>(EVT, { detail: payload }));
}

export function getActiveUpgradeNudge(): UpgradeNudgePayload | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UpgradeNudgePayload;
    const dismissedKey = `${parsed.headline}::${parsed.body}`;
    if (sessionStorage.getItem(DISMISS_KEY) === dismissedKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function dismissUpgradeNudge(payload: UpgradeNudgePayload) {
  try {
    sessionStorage.setItem(DISMISS_KEY, `${payload.headline}::${payload.body}`);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
  window.dispatchEvent(new CustomEvent(EVT, { detail: null }));
}

export function subscribeUpgradeNudge(
  cb: (payload: UpgradeNudgePayload | null) => void,
): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<UpgradeNudgePayload | null>).detail;
    cb(detail ?? null);
  };
  window.addEventListener(EVT, handler);
  return () => window.removeEventListener(EVT, handler);
}
