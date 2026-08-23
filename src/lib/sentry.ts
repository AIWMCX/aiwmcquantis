import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN || !import.meta.env.PROD) {
    if (!import.meta.env.PROD) return;
    // eslint-disable-next-line no-console -- bootstrap before logger transport is ready
    console.warn('Sentry DSN not configured - error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: 'production',
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      enabled: true,
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'Non-Error promise rejection captured',
        // Third-party tracker noise — Apollo, Clarity, GA — never our bug.
        /apollo\.io/i,
        /clarity\.ms/i,
        /googletagmanager/i,
        /Failed to fetch.*assets\.apollo/i,
      ],
    });
  } catch (e) {
    // eslint-disable-next-line no-console -- bootstrap before logger transport is ready
    console.warn('Sentry init failed:', e);
  }
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

export function setUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user);
}

export function clearUser() {
  Sentry.setUser(null);
}

export function addBreadcrumb(message: string, category: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  });
}

export { Sentry };
