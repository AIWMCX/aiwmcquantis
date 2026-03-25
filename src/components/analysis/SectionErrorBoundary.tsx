import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  section: string;
  onBack?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[SectionErrorBoundary:${this.props.section}]`, error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 flex flex-col items-center text-center">
          <AlertCircle className="w-10 h-10 text-destructive mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">
            Something went wrong loading {this.props.section}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            This section encountered an unexpected error. Your other data is safe.
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={this.handleRetry} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </Button>
            {this.props.onBack && (
              <Button size="sm" variant="outline" onClick={this.props.onBack} className="gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to form
              </Button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
