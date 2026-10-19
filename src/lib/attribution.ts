/**
 * Visitor attribution, captured client-side and attached to funnel events.
 *
 * - Session touch: what brought THIS visit (sessionStorage), incl. utm_content,
 *   utm_term and ad click ids.
 * - First touch: the visitor's original source (localStorage, 90 days), so a
 *   signup confirmed in a new tab or a return visit keeps its real origin.
 *
 * Pure helpers take the URL/referrer/storage explicitly so they are testable.
 */

export type Touch = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  gclid?: string;
  msclkid?: string;
  fbclid?: string;
  referrer_host?: string;
  landing_path?: string;
  ts?: string;
};

type KV = Pick<Storage, 'getItem' | 'setItem'>;

export const SESSION_TOUCH_KEY = 'aiwmc_session_touch_v1';
export const FIRST_TOUCH_KEY = 'aiwmc_first_touch_v1';
export const FIRST_TOUCH_TTL_DAYS = 90;

const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'msclkid', 'fbclid'] as const;
const OWN_HOST = /(^|\.)aiwmcquantis\.com$/i;

const clip = (v: string | null) => (v ? v.trim().slice(0, 120) || undefined : undefined);

export function referrerHost(referrer: string | null | undefined): string | undefined {
  if (!referrer) return undefined;
  try {
    const h = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
    return h && !OWN_HOST.test(h) ? h : undefined;
  } catch {
    return undefined;
  }
}

/** Touch described by the current URL + referrer, or null if it carries no source signal. */
export function touchFromLocation(search: string, referrer: string | null, path: string, now: Date): Touch | null {
  const p = new URLSearchParams(search);
  const t: Touch = {};
  for (const k of PARAMS) {
    const v = clip(p.get(k));
    if (v) t[k] = v;
  }
  const host = referrerHost(referrer);
  if (host) t.referrer_host = host;
  if (Object.keys(t).length === 0) return null;
  t.landing_path = path.slice(0, 200);
  t.ts = now.toISOString();
  return t;
}

function read(storage: KV | null | undefined, key: string): Touch | null {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as Touch) : null;
  } catch {
    return null;
  }
}

function write(storage: KV | null | undefined, key: string, t: Touch) {
  try {
    storage?.setItem(key, JSON.stringify(t));
  } catch {
    /* private mode / quota */
  }
}

/**
 * Resolve the session and first touch for this page view.
 * A tagged or referred landing replaces the session touch; the first touch is
 * set once and kept until it expires.
 */
export function resolveTouches(
  input: { search: string; referrer: string | null; path: string; now: Date },
  session: KV | null | undefined,
  local: KV | null | undefined,
): { session: Touch | null; first: Touch | null } {
  const here = touchFromLocation(input.search, input.referrer, input.path, input.now);

  let sessionTouch = read(session, SESSION_TOUCH_KEY);
  if (here && (here.utm_source || here.utm_medium || here.gclid || here.msclkid || here.fbclid || !sessionTouch)) {
    sessionTouch = here;
    write(session, SESSION_TOUCH_KEY, here);
  }

  let first = read(local, FIRST_TOUCH_KEY);
  const age = first?.ts ? input.now.getTime() - Date.parse(first.ts) : NaN;
  if (!(age >= 0 && age <= FIRST_TOUCH_TTL_DAYS * 86_400_000)) first = null;
  if (!first && here) {
    first = here;
    write(local, FIRST_TOUCH_KEY, here);
  }
  return { session: sessionTouch, first };
}

/** Browser wrapper. */
export function currentTouches(): { session: Touch | null; first: Touch | null } {
  if (typeof window === 'undefined') return { session: null, first: null };
  let ss: KV | null = null;
  let ls: KV | null = null;
  try { ss = window.sessionStorage; } catch { /* blocked */ }
  try { ls = window.localStorage; } catch { /* blocked */ }
  return resolveTouches(
    { search: window.location.search, referrer: document.referrer || null, path: window.location.pathname, now: new Date() },
    ss,
    ls,
  );
}
