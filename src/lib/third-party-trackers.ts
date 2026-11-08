/**
 * Loaders for the consent-gated third-party trackers that used to load
 * unconditionally from index.html: GA4's gtag.js and the Apollo.io visitor
 * tracker. index.html keeps only the inert gtag stub (dataLayer + consent
 * default 'denied'); nothing is fetched from Google or Apollo until
 * whenTrackingAllowed() fires (src/lib/consent.ts, wired in main.tsx).
 */

// GA4 streams. index.html's gtag('config', ...) lines must use the same
// literals in the same order (guarded by src/__tests__/ga4-measurement-id.test.ts).
// Owners and IDs: CLAUDE.md "Analytics & search accounts".
// Primary: the original Quantis history property "AIWMC Quantis™" (520326058,
// stream 13318608133), owned by aiwmcsrm@gmail.com, collecting since Jan 2026.
export const GA_MEASUREMENT_ID = 'G-NZE7RGVNEN';
// Secondary: "www.aiwmcquantis.com" (559317308, stream 16156394813), owned by
// jeltovbogdan@gmail.com and linked to Google Ads. Receives the same hits.
export const GA_SECONDARY_MEASUREMENT_ID = 'G-08096HWB3B';
export const GA_MEASUREMENT_IDS = [GA_MEASUREMENT_ID, GA_SECONDARY_MEASUREMENT_ID] as const;
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
