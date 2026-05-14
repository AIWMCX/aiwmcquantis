/**
 * Microsoft Clarity — session replay + heatmaps
 * ==============================================
 * Loads only when VITE_CLARITY_PROJECT_ID is set (build-time env var).
 * Deferred until idle so it never inflates LCP / FID.
 *
 * To enable:
 *   1. Sign up at https://clarity.microsoft.com (free, no card)
 *   2. Create a project for aiwmcquantis.com
 *   3. Add VITE_CLARITY_PROJECT_ID=<your-id> to your environment
 *   4. Redeploy — sessions start recording within minutes
 *
 * Bot/spam sessions are skipped via the same shouldTrack() check used by GA4.
 */
import { logger } from '@/lib/logger';

declare global {
  interface Window {
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

let initialized = false;

function loadClarityScript(projectId: string): void {
  if (initialized) return;
  initialized = true;

  try {
    // Inline init queue (matches Clarity's official snippet)
    (function (c: typeof window, l: Document, a: 'clarity', r: string, i: string) {
      const cAny = c as unknown as Record<string, unknown> & {
        clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
      };
      cAny[a] = (cAny[a] || function (...args: unknown[]) {
        ((cAny[a] as { q?: unknown[] }).q =
          ((cAny[a] as { q?: unknown[] }).q || [])).push(args);
      }) as typeof window.clarity;
      const t = l.createElement(r) as HTMLScriptElement;
      t.async = true;
      t.src = `https://www.clarity.ms/tag/${i}`;
      const y = l.getElementsByTagName(r)[0];
      y?.parentNode?.insertBefore(t, y);
    })(window, document, 'clarity', 'script', projectId);

    if (import.meta.env.DEV) {
      logger.info(`Clarity loaded: project ${projectId}`);
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      logger.warn('Clarity load failed (non-fatal):', err);
    }
  }
}

/**
 * Initialize Clarity if the project ID is configured.
 * Loads after window 'load' event during idle time.
 */
export function initClarity(): void {
  const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined;
  if (!projectId || projectId === 'CLARITY_ID' || projectId.length < 6) {
    if (import.meta.env.DEV) {
      logger.info('Clarity disabled (VITE_CLARITY_PROJECT_ID not set)');
    }
    return;
  }

  // Skip server-side / non-browser
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Defer until after load + idle so we don't inflate LCP / FID
  const schedule = () => {
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
        .requestIdleCallback(() => loadClarityScript(projectId), { timeout: 5000 });
    } else {
      setTimeout(() => loadClarityScript(projectId), 3000);
    }
  };

  if (document.readyState === 'complete') {
    schedule();
  } else {
    window.addEventListener('load', schedule, { once: true });
  }
}

/**
 * Tag the current Clarity session with a custom identifier (e.g. user_id, plan).
 * No-op if Clarity isn't loaded.
 */
export function clarityIdentify(userId: string, sessionMeta?: Record<string, string>): void {
  try {
    if (typeof window === 'undefined' || !window.clarity) return;
    window.clarity('identify', userId);
    if (sessionMeta) {
      Object.entries(sessionMeta).forEach(([k, v]) => {
        window.clarity?.('set', k, v);
      });
    }
  } catch {
    /* non-fatal */
  }
}

/**
 * Tag a custom event in the Clarity timeline (visible in session recordings).
 */
export function clarityEvent(name: string): void {
  try {
    if (typeof window === 'undefined' || !window.clarity) return;
    window.clarity('event', name);
  } catch {
    /* non-fatal */
  }
}
