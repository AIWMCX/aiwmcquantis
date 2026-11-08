/**
 * Loaders for the consent-gated third-party trackers that used to load
 * unconditionally from index.html: GA4's gtag.js and the Apollo.io visitor
 * tracker. index.html keeps only the inert gtag stub (dataLayer + consent
 * default 'denied'); nothing is fetched from Google or Apollo until
 * whenTrackingAllowed() fires (src/lib/consent.ts, wired in main.tsx).
 */

// GA4 property "www.aiwmcquantis.com" (559317308), web stream 16156394813.
// index.html's gtag('config', ...) must use the same literal (guarded by
// src/__tests__/ga4-measurement-id.test.ts).
export const GA_MEASUREMENT_ID = 'G-08096HWB3B';
const APOLLO_APP_ID = '69cf1847c8d38900119597e4';

let gaLoaded = false;
let apolloLoaded = false;

function idle(cb: () => void, timeout = 4000): void {
  const w = window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void };
  if (typeof w.requestIdleCallback === 'function') w.requestIdleCallback(cb, { timeout });
  else setTimeout(cb, 1500);
}

function afterLoad(cb: () => void): void {
  if (document.readyState === 'complete') idle(cb);
  else window.addEventListener('load', () => idle(cb), { once: true });
}

export function loadGoogleAnalytics(): void {
  if (gaLoaded || typeof document === 'undefined') return;
  gaLoaded = true;
  afterLoad(() => {
    const s = document.createElement('script');
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    s.async = true;
    document.head.appendChild(s);
  });
}

export function loadApolloTracker(): void {
  if (apolloLoaded || typeof document === 'undefined') return;
  const host = window.location.hostname || '';
  if (host.includes('id-preview--') || host.includes('lovableproject.com') || host.includes('localhost')) return;
  apolloLoaded = true;
  afterLoad(() => {
    try {
      const o = document.createElement('script');
      o.src = `https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache=${Math.random().toString(36).substring(7)}`;
      o.async = true;
      o.defer = true;
      o.onerror = () => { /* Apollo is non-critical */ };
      o.onload = () => {
        try {
          const tf = (window as unknown as { trackingFunctions?: { onLoad?: (o: { appId: string }) => void } }).trackingFunctions;
          tf?.onLoad?.({ appId: APOLLO_APP_ID });
        } catch { /* non-fatal */ }
      };
      document.head.appendChild(o);
    } catch { /* non-fatal */ }
  });
}
