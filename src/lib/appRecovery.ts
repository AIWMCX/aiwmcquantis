/**
 * App recovery utilities — used by the /app route-level error boundary, the
 * /app/diagnostics page, and the proactive service-worker update flow.
 *
 * The contract is small and intentionally side-effect-free at import time so
 * this module is safe to load eagerly from main.tsx.
 */

const LAST_ERROR_KEY = 'app:last-error';
const RELOAD_GUARD_KEY = 'app:reload-after-clear';

export interface CapturedError {
  message: string;
  stack?: string;
  componentStack?: string;
  name?: string;
  timestamp: number;
  url: string;
  userAgent: string;
  buildId?: string;
}

/** Best-effort persistent build identifier injected at build time. */
export const BUILD_ID: string =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (typeof __BUILD_ID__ !== 'undefined' ? (__BUILD_ID__ as string) : 'dev');

export function captureLastError(
  error: Error,
  componentStack?: string,
): CapturedError {
  const payload: CapturedError = {
    message: error?.message ?? 'Unknown error',
    stack: error?.stack,
    componentStack,
    name: error?.name,
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    buildId: BUILD_ID,
  };
  try {
    sessionStorage.setItem(LAST_ERROR_KEY, JSON.stringify(payload));
  } catch {
    /* storage unavailable — diagnostics page will show "no error captured" */
  }
  return payload;
}

export function readLastError(): CapturedError | null {
  try {
    const raw = sessionStorage.getItem(LAST_ERROR_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CapturedError;
  } catch {
    return null;
  }
}

export function clearLastError(): void {
  try {
    sessionStorage.removeItem(LAST_ERROR_KEY);
  } catch {
    /* noop */
  }
}

/**
 * Wipe everything that can hold a stale bundle reference:
 *  - all Cache Storage entries (including SW caches)
 *  - the active service worker registration
 * Leaves localStorage intact so user drafts/session survive.
 */
export async function clearAppCaches(): Promise<void> {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* ignore */
  }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* ignore */
  }
}

/**
 * Hard recovery used by the Retry button: clear caches + SW, then reload with
 * a cache-busting query param. The sessionStorage guard prevents a reload
 * loop if the underlying error is not actually cache-related.
 */
export async function recoverAndReload(): Promise<void> {
  await clearAppCaches();
  try {
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    /* noop */
  }
  const url = new URL(window.location.href);
  url.searchParams.set('_cb', String(Date.now()));
  window.location.replace(url.toString());
}

export function consumeReloadGuard(): boolean {
  try {
    const v = sessionStorage.getItem(RELOAD_GUARD_KEY);
    if (v) {
      sessionStorage.removeItem(RELOAD_GUARD_KEY);
      return true;
    }
  } catch {
    /* noop */
  }
  return false;
}
