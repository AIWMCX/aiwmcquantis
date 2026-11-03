/**
 * Cookie / tracking consent (single "optional analytics and advertising" category).
 *
 * Nothing third-party that tracks visitors loads until this says 'granted':
 * Google Analytics 4 (gtag.js + _ga cookies), the Apollo.io visitor tracker,
 * the Meta / TikTok pixels and Microsoft Clarity. The first-party funnel log
 * (random per-tab session id, no cookies, no third party) and Vercel's
 * cookieless Speed Insights are not gated; the Privacy Policy discloses both.
 *
 * - The choice is stored in localStorage under CONSENT_STORAGE_KEY.
 * - A Global Privacy Control signal (navigator.globalPrivacyControl === true)
 *   counts as "reject" unless the visitor later accepts explicitly.
 * - Reject and Accept are equally prominent in the banner (ConsentBanner.tsx).
 */

export type ConsentChoice = 'granted' | 'denied';

export const CONSENT_STORAGE_KEY = 'aiwmc_tracking_consent_v1';
export const CONSENT_OPEN_EVENT = 'aiwmc:open-consent';
export const CONSENT_CHANGE_EVENT = 'aiwmc:consent-change';

interface StoredConsent {
  choice: ConsentChoice;
  ts: string;
  source: 'banner' | 'gpc';
}

type KV = Pick<Storage, 'getItem' | 'setItem'>;

function storage(): KV | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function hasGpcSignal(nav: { globalPrivacyControl?: unknown } | undefined = typeof navigator !== 'undefined' ? (navigator as { globalPrivacyControl?: unknown }) : undefined): boolean {
  return !!nav && nav.globalPrivacyControl === true;
}

export function readStoredConsent(kv: KV | null = storage()): StoredConsent | null {
  try {
    const raw = kv?.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    return parsed && (parsed.choice === 'granted' || parsed.choice === 'denied') ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * The effective choice: an explicit stored choice wins; otherwise a GPC
 * signal means 'denied'; otherwise null (undecided: show the banner, load nothing).
 */
export function getConsent(kv: KV | null = storage(), nav?: { globalPrivacyControl?: unknown }): ConsentChoice | null {
  const stored = readStoredConsent(kv);
  if (stored) return stored.choice;
  if (hasGpcSignal(nav ?? (typeof navigator !== 'undefined' ? (navigator as { globalPrivacyControl?: unknown }) : undefined))) return 'denied';
  return null;
}

export function isTrackingAllowed(kv: KV | null = storage(), nav?: { globalPrivacyControl?: unknown }): boolean {
  return getConsent(kv, nav) === 'granted';
}

const grantedCallbacks: Array<() => void> = [];
let grantedFired = false;

function fireGranted(): void {
  if (grantedFired) return;
  grantedFired = true;
  for (const cb of grantedCallbacks.splice(0)) {
    try { cb(); } catch { /* a tracker failing must never break the page */ }
  }
}

/** Run `cb` once, now if consent is already granted, or when the visitor accepts. */
export function whenTrackingAllowed(cb: () => void): void {
  if (grantedFired || isTrackingAllowed()) {
    grantedFired = true;
    try { cb(); } catch { /* non-fatal */ }
    return;
  }
  grantedCallbacks.push(cb);
}

function deleteAnalyticsCookies(): void {
  if (typeof document === 'undefined') return;
  const host = window.location.hostname;
  const domains = ['', host, `.${host.replace(/^www\./, '')}`];
  for (const c of document.cookie.split(';')) {
    const name = c.split('=')[0]?.trim();
    if (!name || !/^(_ga|_gid|_gat|_fbp|_fbc|_ttp|_clck|_clsk)/.test(name)) continue;
    for (const d of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/${d ? `; domain=${d}` : ''}`;
    }
  }
}

export function setConsent(choice: ConsentChoice, kv: KV | null = storage()): void {
  const previous = getConsent(kv);
  try {
    kv?.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ choice, ts: new Date().toISOString(), source: 'banner' } satisfies StoredConsent));
  } catch { /* storage blocked: the choice still applies to this page view */ }

  if (typeof window !== 'undefined') {
    const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
    const value = choice === 'granted' ? 'granted' : 'denied';
    try {
      gtag?.('consent', 'update', { analytics_storage: value, ad_storage: value, ad_user_data: value, ad_personalization: value });
    } catch { /* non-fatal */ }
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: choice }));
  }

  if (choice === 'granted') {
    fireGranted();
  } else if (previous === 'granted' && typeof window !== 'undefined') {
    // Trackers already loaded in this tab cannot be unloaded: clear their
    // cookies and reload so the page runs without them.
    deleteAnalyticsCookies();
    window.location.reload();
  }
}

/** Re-open the banner (footer "Cookie settings" link, Privacy page). */
export function openConsentSettings(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}

/** Test-only reset of module state. */
export function __resetConsentForTests(): void {
  grantedCallbacks.length = 0;
  grantedFired = false;
}
