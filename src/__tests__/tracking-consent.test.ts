import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  CONSENT_STORAGE_KEY,
  getConsent,
  hasGpcSignal,
  isTrackingAllowed,
  setConsent,
  whenTrackingAllowed,
  __resetConsentForTests,
} from '@/lib/consent';

function memoryStorage(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('tracking consent state', () => {
  beforeEach(() => {
    __resetConsentForTests();
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  });

  it('is undecided (null) with no stored choice and no GPC', () => {
    expect(getConsent(memoryStorage(), {})).toBeNull();
    expect(isTrackingAllowed(memoryStorage(), {})).toBe(false);
  });

  it('treats a Global Privacy Control signal as a rejection', () => {
    expect(hasGpcSignal({ globalPrivacyControl: true })).toBe(true);
    expect(getConsent(memoryStorage(), { globalPrivacyControl: true })).toBe('denied');
  });

  it('an explicit accept overrides GPC', () => {
    const kv = memoryStorage({ [CONSENT_STORAGE_KEY]: JSON.stringify({ choice: 'granted', ts: 'x', source: 'banner' }) });
    expect(getConsent(kv, { globalPrivacyControl: true })).toBe('granted');
  });

  it('ignores a corrupt stored value', () => {
    expect(getConsent(memoryStorage({ [CONSENT_STORAGE_KEY]: '{bad' }), {})).toBeNull();
  });

  it('does not run tracker loaders until the visitor accepts, then runs each once', () => {
    const load = vi.fn();
    whenTrackingAllowed(load);
    expect(load).not.toHaveBeenCalled();
    setConsent('denied');
    expect(load).not.toHaveBeenCalled();
    setConsent('granted');
    expect(load).toHaveBeenCalledTimes(1);
    setConsent('granted');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('runs immediately when consent was granted on an earlier visit', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ choice: 'granted', ts: 'x', source: 'banner' }));
    const load = vi.fn();
    whenTrackingAllowed(load);
    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe('index.html loads no third-party tracker before consent', () => {
  const html = readFileSync('index.html', 'utf8');
  const main = readFileSync('src/main.tsx', 'utf8');

  it('does not fetch gtag.js or the Apollo tracker from the HTML', () => {
    expect(html).not.toContain('googletagmanager.com/gtag/js');
    expect(html).not.toContain('assets.apollo.io');
    expect(html).not.toMatch(/<script[^>]+src="https:\/\/(www\.googletagmanager|connect\.facebook|analytics\.tiktok|www\.clarity)/);
  });

  it('sets Consent Mode default to denied before any gtag config', () => {
    const def = html.indexOf("gtag('consent', 'default'");
    const cfg = html.indexOf("gtag('config'");
    expect(def).toBeGreaterThan(-1);
    expect(cfg).toBeGreaterThan(def);
    expect(html.slice(def, def + 200)).toContain("analytics_storage: 'denied'");
  });

  it('main.tsx starts GA, Apollo, ad pixels and Clarity only inside whenTrackingAllowed', () => {
    const gate = main.indexOf('whenTrackingAllowed(() => {');
    expect(gate).toBeGreaterThan(-1);
    for (const call of ['loadGoogleAnalytics();', 'loadApolloTracker();', 'initAdPixels();', 'initClarity();']) {
      expect(main.indexOf(call)).toBeGreaterThan(gate);
    }
  });
});
