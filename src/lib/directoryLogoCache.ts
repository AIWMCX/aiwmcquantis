import { useEffect, useRef, useState } from 'react';

/**
 * Directory logo loader with provider fallback chain, retry/backoff,
 * localStorage caching, prefetching, and a guaranteed SVG fallback.
 * Designed for the "As featured in" marquee — logos are ALWAYS visible.
 */

const STORAGE_KEY = 'q.dirlogo.v1';
const TTL_OK_MS = 7 * 24 * 60 * 60 * 1000;
const TTL_FAIL_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_MS = 60_000;
const PREFETCH_TIMEOUT_MS = 6000;

type Provider = (domain: string) => string;

const PROVIDERS: Provider[] = [
  (d) => `https://logo.clearbit.com/${d}?size=128`,
  (d) => `https://icons.duckduckgo.com/ip3/${d}.ico`,
  (d) => `https://www.google.com/s2/favicons?domain=${d}&sz=64`,
  (d) => `https://www.google.com/s2/favicons?domain=${d}&sz=128`,
];

type CacheEntry = { url: string; providerIndex: number; ts: number };
type CacheShape = Record<string, CacheEntry>;

const providerCooldown = new Map<number, number>();
const inflight = new Map<string, Promise<string>>();

// Deterministic palette for the SVG fallback so brands stay recognisable.
const PALETTE = [
  ['#8FFF2A', '#0F2010'],
  ['#4F46E5', '#EEF2FF'],
  ['#F59E0B', '#1F1300'],
  ['#EC4899', '#1A0010'],
  ['#10B981', '#062018'],
  ['#06B6D4', '#001417'],
  ['#F97316', '#1A0A00'],
  ['#A855F7', '#150022'],
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Always-visible SVG data-URI fallback (initial-letter brand tile). */
export function buildFallbackLogo(name: string, domain: string): string {
  const letter = (name.trim().charAt(0) || domain.charAt(0) || '?').toUpperCase();
  const [bg, fg] = PALETTE[hashStr(domain) % PALETTE.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${bg}"/><text x="50%" y="50%" dy=".06em" text-anchor="middle" dominant-baseline="middle" font-family="Inter,system-ui,Arial,sans-serif" font-weight="700" font-size="34" fill="${fg}">${letter}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function readCache(): CacheShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CacheShape) : {};
  } catch {
    return {};
  }
}

function writeCache(next: CacheShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function getCached(domain: string): CacheEntry | null {
  const cache = readCache();
  const entry = cache[domain];
  if (!entry) return null;
  const ttl = entry.providerIndex >= 0 ? TTL_OK_MS : TTL_FAIL_MS;
  if (Date.now() - entry.ts > ttl) return null;
  return entry;
}

function setCached(domain: string, entry: CacheEntry) {
  const cache = readCache();
  cache[domain] = entry;
  writeCache(cache);
}

function isProviderHot(idx: number) {
  const until = providerCooldown.get(idx);
  if (!until) return true;
  if (Date.now() > until) {
    providerCooldown.delete(idx);
    return true;
  }
  return false;
}

function coolProvider(idx: number) {
  providerCooldown.set(idx, Date.now() + COOLDOWN_MS);
}

/** Try a single provider URL via Image() preload. */
function probe(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    const img = new Image();
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      img.onload = null;
      img.onerror = null;
      resolve(ok);
    };
    const timer = window.setTimeout(() => finish(false), PREFETCH_TIMEOUT_MS);
    img.onload = () => {
      window.clearTimeout(timer);
      // Some providers return 1×1 pixels for missing favicons — treat as failure.
      if (img.naturalWidth < 8 || img.naturalHeight < 8) finish(false);
      else finish(true);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish(false);
    };
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    img.src = url;
  });
}

/**
 * Prefetch a single domain's logo. Resolves to the working URL,
 * or to the SVG fallback if every provider fails. Memoised in-flight.
 */
export function prefetchDirectoryLogo(name: string, domain: string): Promise<string> {
  const cached = getCached(domain);
  if (cached && cached.providerIndex >= 0) return Promise.resolve(cached.url);

  const key = domain;
  const existing = inflight.get(key);
  if (existing) return existing;

  const task = (async () => {
    for (let i = 0; i < PROVIDERS.length; i++) {
      if (!isProviderHot(i)) continue;
      const url = PROVIDERS[i](domain);
      const ok = await probe(url);
      if (ok) {
        setCached(domain, { url, providerIndex: i, ts: Date.now() });
        return url;
      }
      coolProvider(i);
    }
    const fallback = buildFallbackLogo(name, domain);
    setCached(domain, { url: fallback, providerIndex: -1, ts: Date.now() });
    return fallback;
  })();

  inflight.set(key, task);
  task.finally(() => inflight.delete(key));
  return task;
}

/** Prefetch many logos in parallel — call before the marquee mounts. */
export function prefetchDirectoryLogos(items: Array<{ name: string; domain: string }>) {
  return Promise.all(items.map((it) => prefetchDirectoryLogo(it.name, it.domain)));
}

export type LogoStatus = 'loading' | 'loaded';

/**
 * Hook returning a guaranteed-visible logo URL.
 * - Synchronous cache hit → instant render.
 * - Otherwise kicks off prefetch and shows skeleton until ready.
 * - Always resolves to a real image (provider URL OR SVG fallback).
 */
export function useDirectoryLogo(
  name: string,
  domain: string,
): { src: string; status: LogoStatus; onLoad: () => void; onError: () => void } {
  const cached = typeof window !== 'undefined' ? getCached(domain) : null;
  const initial = cached?.url ?? null;

  const [src, setSrc] = useState<string>(initial ?? buildFallbackLogo(name, domain));
  const [status, setStatus] = useState<LogoStatus>(initial ? 'loaded' : 'loading');
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    if (initial) return; // already cached
    prefetchDirectoryLogo(name, domain).then((url) => {
      if (cancelledRef.current) return;
      setSrc(url);
      setStatus('loaded');
    });
    return () => {
      cancelledRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain]);

  const onLoad = () => setStatus('loaded');
  const onError = () => {
    // Network glitch on a cached URL — degrade to fallback so the tile is never empty.
    const fb = buildFallbackLogo(name, domain);
    setSrc(fb);
    setStatus('loaded');
  };

  return { src, status, onLoad, onError };
}

/** Backwards-compat single-arg call site. */
export function useDirectoryLogoByDomain(domain: string) {
  return useDirectoryLogo(domain, domain);
}
