import { useEffect, useRef, useState } from 'react';

/**
 * Directory logo loader with provider fallback chain, retry/backoff,
 * and localStorage caching. Designed for the "As featured in" marquee.
 */

const STORAGE_KEY = 'q.dirlogo.v1';
const TTL_OK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days for successful logos
const TTL_FAIL_MS = 24 * 60 * 60 * 1000; // 24h for known failures
const COOLDOWN_MS = 60_000; // skip a provider for 60s after rate-limit/failure
const RETRY_DELAYS = [300, 900]; // backoff per provider attempt

type Provider = (domain: string) => string;

const PROVIDERS: Provider[] = [
  (d) => `https://logo.clearbit.com/${d}?size=128`,
  (d) => `https://icons.duckduckgo.com/ip3/${d}.ico`,
  (d) => `https://www.google.com/s2/favicons?domain=${d}&sz=64`,
];

type CacheEntry = { url: string | null; providerIndex: number; ts: number };
type CacheShape = Record<string, CacheEntry>;

// Module-level provider cool-downs (resets per page load)
const providerCooldown = new Map<number, number>();

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
    /* private mode / quota — ignore */
  }
}

function getCached(domain: string): CacheEntry | null {
  const cache = readCache();
  const entry = cache[domain];
  if (!entry) return null;
  const ttl = entry.url ? TTL_OK_MS : TTL_FAIL_MS;
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

export type LogoStatus = 'loading' | 'loaded' | 'failed';

export function useDirectoryLogo(domain: string): {
  src: string | null;
  status: LogoStatus;
  onLoad: () => void;
  onError: () => void;
} {
  // Synchronous cache hit avoids skeleton flash on revisit
  const cached = typeof window !== 'undefined' ? getCached(domain) : null;

  const [src, setSrc] = useState<string | null>(() => {
    if (cached?.url) return cached.url;
    if (cached && cached.url === null) return null;
    // Find first non-cooled provider
    for (let i = 0; i < PROVIDERS.length; i++) {
      if (isProviderHot(i)) return PROVIDERS[i](domain);
    }
    return null;
  });

  const [status, setStatus] = useState<LogoStatus>(() => {
    if (cached?.url) return 'loaded';
    if (cached && cached.url === null) return 'failed';
    return src ? 'loading' : 'failed';
  });

  const providerIdxRef = useRef<number>(cached?.url ? cached.providerIndex : 0);
  const attemptRef = useRef<number>(0);
  const cancelledRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const advance = () => {
    if (cancelledRef.current) return;
    const currentIdx = providerIdxRef.current;
    const attempt = attemptRef.current;

    // Retry same provider with backoff
    if (attempt < RETRY_DELAYS.length) {
      attemptRef.current = attempt + 1;
      const delay = RETRY_DELAYS[attempt];
      timerRef.current = window.setTimeout(() => {
        if (cancelledRef.current) return;
        // Cache-bust to actually retry
        setSrc(`${PROVIDERS[currentIdx](domain)}#r${attempt + 1}`);
      }, delay) as unknown as number;
      return;
    }

    // Cool down this provider, move to next
    coolProvider(currentIdx);
    let next = currentIdx + 1;
    while (next < PROVIDERS.length && !isProviderHot(next)) next++;

    if (next >= PROVIDERS.length) {
      setStatus('failed');
      setSrc(null);
      setCached(domain, { url: null, providerIndex: -1, ts: Date.now() });
      return;
    }

    providerIdxRef.current = next;
    attemptRef.current = 0;
    setSrc(PROVIDERS[next](domain));
  };

  const onLoad = () => {
    if (cancelledRef.current) return;
    setStatus('loaded');
    const cleanUrl = (src || '').split('#')[0];
    if (cleanUrl) {
      setCached(domain, {
        url: cleanUrl,
        providerIndex: providerIdxRef.current,
        ts: Date.now(),
      });
    }
  };

  const onError = () => {
    if (cancelledRef.current) return;
    advance();
  };

  return { src, status, onLoad, onError };
}
