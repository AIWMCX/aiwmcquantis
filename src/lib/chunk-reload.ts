/**
 * Stale-chunk recovery. After every deploy the previous build's hashed chunk
 * files are gone, so a tab opened before the deploy gets 404s the first time
 * it lazy-loads a route. That is not an app bug: one reload fetches the new
 * index.html and the new chunk hashes.
 *
 * The guard is a timestamp in sessionStorage. A reload is allowed only if the
 * last one was more than RELOAD_WINDOW_MS ago, so a real outage (where the
 * reload fails too) falls through to the normal error page instead of looping.
 */

export const CHUNK_RELOAD_KEY = 'chunk-reload-attempted';
export const RELOAD_WINDOW_MS = 30_000;

const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Unable to preload CSS/i;

export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  return CHUNK_ERROR_RE.test(`${String(name ?? '')} ${String(message ?? '')}`);
}

type GuardStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Returns true (and records `now`) when a reload is allowed. Returns false
 * when one already happened within the window, or when storage is unusable
 * (no guard means no safe way to rule out a loop).
 */
export function claimChunkReload(storage: GuardStorage | null | undefined, now: number): boolean {
  if (!storage) return false;
  try {
    const last = Number(storage.getItem(CHUNK_RELOAD_KEY));
    if (last > 0 && Math.abs(now - last) < RELOAD_WINDOW_MS) return false;
    storage.setItem(CHUNK_RELOAD_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}

let reloadPending = false;

/** True once this page has started a stale-chunk reload. */
export function isChunkReloadPending(): boolean {
  return reloadPending;
}

interface ReloadDeps {
  storage?: GuardStorage | null;
  now?: () => number;
  reload?: () => void;
}

function sessionStorageOrNull(): GuardStorage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/**
 * Reload once for a stale chunk. Returns true if a reload is under way (this
 * call started it, or an earlier one in this page did), false if the caller
 * should show its error UI.
 */
export function reloadForStaleChunk(deps: ReloadDeps = {}): boolean {
  if (reloadPending) return true;
  const storage = deps.storage !== undefined ? deps.storage : sessionStorageOrNull();
  const now = (deps.now ?? Date.now)();
  if (!claimChunkReload(storage, now)) return false;
  reloadPending = true;
  (deps.reload ?? (() => window.location.reload()))();
  return true;
}

/**
 * Vite fires `vite:preloadError` when a lazy chunk or one of its preloaded
 * deps fails to load. We do not preventDefault: if no reload happens, the
 * error still reaches the ErrorBoundary and the normal error page.
 */
export function installChunkReloadListener(target: Window = window): void {
  target.addEventListener('vite:preloadError', () => {
    reloadForStaleChunk();
  });
}

/** Test-only: reset the per-page pending flag. */
export function __resetChunkReloadForTests(): void {
  reloadPending = false;
}
