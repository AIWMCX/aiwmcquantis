import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sentry } from '@/lib/sentry';
import { isChunkLoadError, isChunkReloadPending, reloadForStaleChunk } from '@/lib/chunk-reload';

import { logger } from '@/lib/logger';
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Post-deploy stale chunk: reload once (guarded in chunk-reload.ts so a
    // second failure within 30s shows this error page instead of looping).
    if (isChunkLoadError(error) && reloadForStaleChunk()) {
      return;
    }

    // Report to Sentry in production
    if (import.meta.env.PROD) {
      Sentry.captureException(error, {
        extra: {
          componentStack: errorInfo.componentStack,
        },
      });
    } else {
      logger.error('ErrorBoundary caught an error', error, { metadata: { componentStack: errorInfo.componentStack } });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    // A stale-chunk reload is already under way: don't flash the error page.
    if (this.state.hasError && isChunkReloadPending()) return null;
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-destructive/10">
                <AlertTriangle className="w-12 h-12 text-destructive" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Something went wrong
              </h1>
              <p className="text-muted-foreground">
                We're sorry, but something unexpected happened. Please try refreshing the page or go back to the home page.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="text-left p-4 rounded-lg bg-muted border border-border overflow-auto max-h-40">
                <p className="text-sm font-mono text-destructive break-words">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={this.handleReload} className="gap-2 w-full sm:w-auto">
                <RefreshCw className="w-4 h-4" />
                Refresh Page
              </Button>
              <Button variant="outline" onClick={this.handleGoHome} className="gap-2 w-full sm:w-auto">
                <Home className="w-4 h-4" />
                Go to Home
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              If this problem persists, please contact support at support@aiwmcquantis.com
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
