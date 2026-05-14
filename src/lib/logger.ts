import { captureError, captureMessage, addBreadcrumb } from './sentry';
import { getRequestId } from './correlation';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

/**
 * Structured logger with Sentry integration
 * - Development: Console logging with colors
 * - Production: Sentry breadcrumbs and error capture
 */
class Logger {
  // Read DEV lazily so tests can mock import.meta.env per-call.
  // Capturing at construction time made the prod-path branches untestable.
  private get isDev(): boolean {
    return import.meta.env.DEV;
  }
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    // Stamp every entry with the active correlation ID, if any.
    context = this.withRequestId(context);
    const logEntry: LogEntry = { timestamp, level, message, context };

    // Keep log history for debugging
    this.logHistory.push(logEntry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    if (this.isDev) {
      const colors: Record<LogLevel, string> = {
        debug: 'color: gray',
        info: 'color: #3b82f6',
        warn: 'color: #f59e0b',
        error: 'color: #ef4444',
      };

      console.log(
        `%c[${level.toUpperCase()}] ${message}`,
        colors[level],
        context || ''
      );
    }

    // Send breadcrumb to Sentry in production (except debug)
    if (!this.isDev && level !== 'debug') {
      addBreadcrumb(message, context?.component || 'app', context?.metadata);
    }
  }

  private normalizeContext(input?: unknown): LogContext | undefined {
    if (input === undefined || input === null) return undefined;
    if (typeof input === 'object' && !Array.isArray(input) && !(input instanceof Error)) {
      // Heuristic: looks like a LogContext if it has any of the known keys.
      const obj = input as Record<string, unknown>;
      if ('userId' in obj || 'component' in obj || 'action' in obj || 'metadata' in obj) {
        return obj as LogContext;
      }
      return { metadata: obj as Record<string, unknown> };
    }
    return { metadata: { extra: input } };
  }

  debug(message: string, context?: unknown) {
    this.log('debug', message, this.normalizeContext(context));
  }

  info(message: string, context?: unknown) {
    this.log('info', message, this.normalizeContext(context));
  }

  warn(message: string, context?: unknown) {
    this.log('warn', message, this.normalizeContext(context));

    if (!this.isDev) {
      captureMessage(`[WARN] ${message}`, 'warning');
    }
  }

  error(message: string, errorOrValue?: unknown, context?: LogContext) {
    // Normalize: codemod-migrated calls pass arbitrary values as 2nd arg.
    let error: Error | undefined;
    let extra: unknown;
    if (errorOrValue instanceof Error) {
      error = errorOrValue;
    } else if (errorOrValue !== undefined) {
      extra = errorOrValue;
    }

    const errorMetadata = error
      ? { errorMessage: error.message, errorName: error.name }
      : {};
    const extraMetadata = extra !== undefined ? { extra } : {};
    const logContext = {
      ...context,
      metadata: {
        ...context?.metadata,
        ...errorMetadata,
        ...extraMetadata,
      } as Record<string, unknown>,
    };
    this.log('error', message, logContext);

    const sentryContext = this.withRequestId(context);

    if (error && !this.isDev) {
      captureError(error, sentryContext as Record<string, unknown> | undefined);
    } else if (extra !== undefined && !this.isDev) {
      // Capture as message so non-Error rejections still reach Sentry.
      captureMessage(`[ERROR] ${message}`, 'error');
    }
  }

  private withRequestId(context?: LogContext): LogContext | undefined {
    const requestId = getRequestId();
    if (!requestId) return context;
    return {
      ...context,
      metadata: { ...(context?.metadata ?? {}), request_id: requestId },
    };
  }

  /**
   * Get recent log history for debugging
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Create a child logger with preset context
   */
  child(defaultContext: LogContext): ChildLogger {
    return new ChildLogger(this, defaultContext);
  }
}

/**
 * Child logger with inherited context
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private defaultContext: LogContext
  ) {}

  private mergeContext(context?: LogContext): LogContext {
    return {
      ...this.defaultContext,
      ...context,
      metadata: {
        ...this.defaultContext.metadata,
        ...context?.metadata,
      },
    };
  }

  debug(message: string, context?: LogContext) {
    this.parent.debug(message, this.mergeContext(context));
  }

  info(message: string, context?: LogContext) {
    this.parent.info(message, this.mergeContext(context));
  }

  warn(message: string, context?: LogContext) {
    this.parent.warn(message, this.mergeContext(context));
  }

  error(message: string, errorOrValue?: unknown, context?: LogContext) {
    this.parent.error(message, errorOrValue, this.mergeContext(context));
  }
}

export const logger = new Logger();
export type { LogContext, LogEntry, LogLevel };
