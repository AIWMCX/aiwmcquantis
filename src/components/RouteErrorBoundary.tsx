import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Stethoscope, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sentry } from '@/lib/sentry';
import { logger } from '@/lib/logger';
import { captureLastError, recoverAndReload } from '@/lib/appRecovery';

interface Props {
  children: ReactNode;
  /** Used in telemetry + the diagnostics deep link. */
  routeName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack?: string;
  isRecovering: boolean;
}

/**
 * Route-level error boundary for /app.
 *
 * Differs from the global ErrorBoundary:
 *  - Persists the captured error to sessionStorage so /app/diagnostics can
 *    surface a full stack without guessing.
 *  - "Retry" performs a hard recovery: clears Cache Storage + unregisters the
 *    SW, then reloads with a cache-busting query param. This fixes the most
 *    common post-deploy failure mode (stale lazy-chunk references).
 *  - Provides a direct link to /app/diagnostics for self-service debugging.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, isRecovering: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isRecovering: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const stack = info.componentStack ?? undefined;
    this.setState({ componentStack: stack });
    captureLastError(error, stack);
    logger.error(`[RouteErrorBoundary:${this.props.routeName ?? 'route'}]`, error, {
      metadata: { componentStack: stack },
    });
    if (import.meta.env.PROD) {
      try {
        Sentry.captureException(error, { extra: { componentStack: stack } });
      } catch {
        /* noop */
      }
    }
  }

  private handleRetry = async () => {
    this.setState({ isRecovering: true });
    try {
      await recoverAndReload();
    } catch {
      // Fallback: regular reload if cache clear failed.
      window.location.reload();
    }
  };

  private handleSoftReset = () => {
    this.setState({ hasError: false, error: null, componentStack: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const err = this.state.error;
    const msg = err?.message ?? 'Unknown error';

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center space-y-5">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-destructive/10">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-foreground">
              The dashboard hit an error
            </h1>
            <p className="text-sm text-muted-foreground">
              We saved the details. Click <strong>Retry</strong> to clear cached app
              bundles and reload — this fixes most issues after a deploy.
            </p>
          </div>

          <div className="text-left rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="text-xs font-mono text-destructive break-words">{msg}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <Button
              onClick={this.handleRetry}
              disabled={this.state.isRecovering}
              className="gap-2 w-full sm:w-auto"
            >
              <RefreshCw
                className={`w-4 h-4 ${this.state.isRecovering ? 'animate-spin' : ''}`}
              />
              {this.state.isRecovering ? 'Clearing cache…' : 'Retry (clear cache)'}
            </Button>
            <Button
              variant="outline"
              onClick={this.handleSoftReset}
              className="gap-2 w-full sm:w-auto"
            >
              Try again without reload
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
            <a
              href="/app/diagnostics"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              Open diagnostics
            </a>
            <span className="hidden sm:inline text-muted-foreground/40">·</span>
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              <Home className="w-3.5 h-3.5" />
              Home
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default RouteErrorBoundary;
