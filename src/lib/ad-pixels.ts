/**
 * Meta Pixel + TikTok Pixel for paid-social measurement.
 *
 * - IDs come from Vercel env (VITE_META_PIXEL_ID, VITE_TIKTOK_PIXEL_ID). Unset = nothing loads.
 * - Loads only on the production host, after window `load` + idle (same pattern as GA4 in index.html),
 *   never for bot sessions or internal QA sessions (utm_medium=internal / utm_source=qa_test) or /admin.
 * - Page views on load and on SPA navigation; funnel events are mapped to each platform's standard events
 *   in recordFunnelEvent() (src/lib/analytics.ts), so ads can optimise toward real tool runs and checkouts.
 */
import { currentTouches } from './attribution';

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
type Ttq = { load: (id: string) => void; page: () => void; track: (e: string, p?: Record<string, unknown>) => void; [k: string]: unknown };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
    ttq?: Ttq;
    TiktokAnalyticsObject?: string;
  }
}

const META_ID = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim() || '';
const TIKTOK_ID = (import.meta.env.VITE_TIKTOK_PIXEL_ID as string | undefined)?.trim() || '';

/** Funnel event -> [Meta standard event, TikTok standard event]. Events not listed are not sent to ad platforms. */
export const PIXEL_EVENT_MAP: Record<string, [string, string]> = {
  hiring_own_run: ['ViewContent', 'ViewContent'],
  price_change_run: ['ViewContent', 'ViewContent'],
  second_location_run: ['ViewContent', 'ViewContent'],
  analysis_complete: ['ViewContent', 'ViewContent'],
  free_signup_complete: ['CompleteRegistration', 'CompleteRegistration'],
  paid_review_view: ['ViewContent', 'ViewContent'],
  paid_checkout_start: ['InitiateCheckout', 'InitiateCheckout'],
  paid_checkout_complete: ['Purchase', 'CompletePayment'],
};

export function isAdTrackingAllowed(loc: { hostname: string; pathname: string } = window.location): boolean {
  const h = loc.hostname;
  if (!(h === 'www.aiwmcquantis.com' || h === 'aiwmcquantis.com')) return false;
  if (loc.pathname.startsWith('/admin')) return false;
  const { session } = currentTouches();
  if (session?.utm_medium === 'internal' || session?.utm_source === 'qa_test') return false;
  return true;
}

let started = false;

function loadMeta(id: string): void {
  if (window.fbq) return;
  const n: Fbq = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args); else (n.queue as unknown[]).push(args);
  } as Fbq;
  n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
  window.fbq = n; window._fbq = n;
  const s = document.createElement('script'); s.async = true; s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  n('init', id);
  n('track', 'PageView');
}

function loadTikTok(id: string): void {
  if (window.ttq) return;
  window.TiktokAnalyticsObject = 'ttq';
  const q: unknown[] = [];
  const ttq = { _q: q } as unknown as Ttq;
  for (const m of ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie']) {
    ttq[m] = (...args: unknown[]) => { q.push([m, ...args]); };
  }
  ttq.load = (pid: string) => {
    const s = document.createElement('script'); s.async = true;
    s.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(pid)}&lib=ttq`;
    document.head.appendChild(s);
  };
  window.ttq = ttq;
  ttq.load(id);
  ttq.page();
}

/** Call once from main.tsx. */
export function initAdPixels(): void {
  if (started || typeof window === 'undefined' || (!META_ID && !TIKTOK_ID)) return;
  if (!isAdTrackingAllowed()) return;
  started = true;
  const go = () => {
    if (META_ID) loadMeta(META_ID);
    if (TIKTOK_ID) loadTikTok(TIKTOK_ID);
    // SPA navigation: a page view per route change
    const fire = () => { window.fbq?.('track', 'PageView'); window.ttq?.page(); };
    const push = history.pushState.bind(history);
    history.pushState = (...a: Parameters<History['pushState']>) => { push(...a); setTimeout(fire, 0); };
    window.addEventListener('popstate', fire);
  };
  const idle = (cb: () => void) => ('requestIdleCallback' in window ? (window as unknown as { requestIdleCallback: (f: () => void) => void }).requestIdleCallback(cb) : setTimeout(cb, 1));
  if (document.readyState === 'complete') idle(go); else window.addEventListener('load', () => idle(go), { once: true });
}

/** Mirror a funnel event to the ad pixels (only mapped events; no personal data is sent). */
export function trackAdEvent(eventName: string, metadata: Record<string, unknown> = {}): void {
  const m = PIXEL_EVENT_MAP[eventName];
  if (!m || !started) return;
  const value = typeof metadata.value === 'number' ? metadata.value : undefined;
  const params = value !== undefined ? { value, currency: 'USD' } : {};
  try { window.fbq?.('track', m[0], { ...params, content_name: eventName }); } catch { /* never break the page for ads */ }
  try { window.ttq?.track(m[1], { ...params, content_name: eventName }); } catch { /* never break the page for ads */ }
}
