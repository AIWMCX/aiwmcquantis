import { captureError, captureMessage, addBreadcrumb } from './sentry';

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
  private isDev = import.meta.env.DEV;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
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

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
    
    if (!this.isDev) {
      captureMessage(`[WARN] ${message}`, 'warning');
    }
  }

  error(message: string, error?: Error, context?: LogContext) {
    const errorMetadata = error ? { errorMessage: error.message, errorName: error.name } : {};
    this.log('error', message, { 
      ...context, 
      metadata: { ...context?.metadata, ...errorMetadata } as Record<string, unknown>
    });

    if (error && !this.isDev) {
      captureError(error, context as Record<string, unknown>);
    }
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

  error(message: string, error?: Error, context?: LogContext) {
    this.parent.error(message, error, this.mergeContext(context));
  }
}

export const logger = new Logger();
export type { LogContext, LogEntry, LogLevel };
