import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHUNK_RELOAD_KEY,
  RELOAD_WINDOW_MS,
  __resetChunkReloadForTests,
  claimChunkReload,
  installChunkReloadListener,
  isChunkLoadError,
  isChunkReloadPending,
  reloadForStaleChunk,
} from '@/lib/chunk-reload';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
}

const T0 = 1_761_500_000_000;

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://www.aiwmcquantis.com/assets/Autoposter-abc123.js',
    'Importing a module script failed.',
    'error loading dynamically imported module: https://x/assets/tabs-1.js',
    'Unable to preload CSS for /assets/card-9.css',
  ])('matches browser message %s', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it('matches by name (ChunkLoadError)', () => {
    const err = new Error('Loading chunk 7 failed');
    err.name = 'ChunkLoadError';
    expect(isChunkLoadError(err)).toBe(true);
  });

  it('ignores ordinary errors and non-errors', () => {
    expect(isChunkLoadError(new Error("Cannot read properties of undefined (reading 'map')"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false);
  });
});

describe('claimChunkReload', () => {
  it('allows the first reload and records the time', () => {
    const s = memoryStorage();
    expect(claimChunkReload(s, T0)).toBe(true);
    expect(s.data.get(CHUNK_RELOAD_KEY)).toBe(String(T0));
  });

  it('blocks a second reload inside the window (no loop)', () => {
    const s = memoryStorage();
    expect(claimChunkReload(s, T0)).toBe(true);
    expect(claimChunkReload(s, T0 + 2_000)).toBe(false);
    expect(claimChunkReload(s, T0 + RELOAD_WINDOW_MS - 1)).toBe(false);
  });

  it('allows a reload again once the window has passed (next deploy)', () => {
    const s = memoryStorage({ [CHUNK_RELOAD_KEY]: String(T0) });
    expect(claimChunkReload(s, T0 + RELOAD_WINDOW_MS)).toBe(true);
    expect(s.data.get(CHUNK_RELOAD_KEY)).toBe(String(T0 + RELOAD_WINDOW_MS));
  });

  it('treats a legacy or garbage value as no previous reload', () => {
    expect(claimChunkReload(memoryStorage({ [CHUNK_RELOAD_KEY]: 'yes' }), T0)).toBe(true);
    expect(claimChunkReload(memoryStorage({ [CHUNK_RELOAD_KEY]: '' }), T0)).toBe(true);
  });

  it('refuses when storage is missing or throws', () => {
    expect(claimChunkReload(null, T0)).toBe(false);
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {},
    };
    expect(claimChunkReload(throwing, T0)).toBe(false);
  });
});

describe('reloadForStaleChunk', () => {
  beforeEach(() => __resetChunkReloadForTests());

  it('reloads once, and a second failure within 30s shows the error page', () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    expect(reloadForStaleChunk({ storage, now: () => T0, reload })).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(isChunkReloadPending()).toBe(true);

    // Next page load (fresh module state), still failing 3s later.
    __resetChunkReloadForTests();
    const reload2 = vi.fn();
    expect(reloadForStaleChunk({ storage, now: () => T0 + 3_000, reload: reload2 })).toBe(false);
    expect(reload2).not.toHaveBeenCalled();
  });

  it('does not reload twice in the same page (preloadError + ErrorBoundary)', () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    expect(reloadForStaleChunk({ storage, now: () => T0, reload })).toBe(true);
    expect(reloadForStaleChunk({ storage, now: () => T0 + 10, reload })).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('installChunkReloadListener', () => {
  beforeEach(() => {
    __resetChunkReloadForTests();
    sessionStorage.clear();
  });

  it('reloads on vite:preloadError without swallowing the event', () => {
    const reload = vi.fn();
    const target = new EventTarget() as unknown as Window;
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload } as Location);

    installChunkReloadListener(target);
    const event = new Event('vite:preloadError', { cancelable: true });
    target.dispatchEvent(event);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
    expect(sessionStorage.getItem(CHUNK_RELOAD_KEY)).not.toBeNull();
    vi.restoreAllMocks();
  });
});
