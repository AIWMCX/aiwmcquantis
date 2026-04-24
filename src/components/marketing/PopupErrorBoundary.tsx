import React, { Component, ReactNode } from 'react';

import { logger } from '@/lib/logger';
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Lightweight error boundary specifically for marketing popups.
 * Silently catches errors to prevent crashing the main page.
 * Logs errors for debugging but renders nothing on failure.
 */
export class PopupErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log but don't crash - popups are non-critical
    logger.error('[PopupErrorBoundary] Popup failed to render:', error.message);
    logger.debug('[PopupErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      // Render nothing - don't show broken UI for non-critical popups
      return this.props.fallback ?? null;
    }

    return this.props.children;
  }
}
