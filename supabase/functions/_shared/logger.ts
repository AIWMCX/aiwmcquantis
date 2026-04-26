/**
 * Shared Edge Logger
 * ------------------
 * Structured logging for Supabase Edge Functions with optional Sentry forwarding.
 *
 * Every log line includes:
 *   - level (debug | info | warn | error)
 *   - function name
 *   - request_id (correlates UI → edge → DB → Sentry)
 *   - timestamp (ISO)
 *   - message + structured metadata
 *
 * Errors and warnings are forwarded to Sentry via the HTTP Store API
 * (no SDK needed in Deno) when SENTRY_DSN is configured.
 *
 * Usage:
 *   const log = createLogger('analyze-business', getRequestId(req));
 *   log.info('starting analysis', { user_id });
 *   log.error('Anthropic call failed', err, { task: 'narrator' });
 */
import { REQUEST_ID_HEADER } from './request-id.ts';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

const SENTRY_DSN = Deno.env.get('SENTRY_DSN') ?? '';
const SENTRY_ENV = Deno.env.get('SENTRY_ENVIRONMENT') ?? 'production';

interface SentryDsnParts {
  protocol: string;
  publicKey: string;
  host: string;
  projectId: string;
}

let cachedDsn: SentryDsnParts | null | undefined;
function parseSentryDsn(): SentryDsnParts | null {
  if (cachedDsn !== undefined) return cachedDsn;
  if (!SENTRY_DSN) return (cachedDsn = null);
  try {
    // Format: https://<publicKey>@<host>/<projectId>
    const m = SENTRY_DSN.match(/^(https?):\/\/([^@]+)@([^/]+)\/(.+)$/);
    if (!m) return (cachedDsn = null);
    return (cachedDsn = {
      protocol: m[1],
      publicKey: m[2],
      host: m[3],
      projectId: m[4],
    });
  } catch {
    return (cachedDsn = null);
  }
}

async function sendToSentry(
  level: LogLevel,
  fn: string,
  reqId: string,
  message: string,
  err: unknown,
  context: LogContext,
): Promise<void> {
  const dsn = parseSentryDsn();
  if (!dsn) return;

  try {
    const url = `${dsn.protocol}://${dsn.host}/api/${dsn.projectId}/store/`;
    const auth =
      `Sentry sentry_version=7,sentry_client=quantis-edge/1.0,sentry_key=${dsn.publicKey}`;

    const errorObj = err instanceof Error ? err : null;
    const payload: Record<string, unknown> = {
      event_id: crypto.randomUUID().replace(/-/g, ''),
      timestamp: new Date().toISOString(),
      platform: 'javascript',
      level: level === 'warn' ? 'warning' : level,
      logger: `edge.${fn}`,
      environment: SENTRY_ENV,
      message: { formatted: message },
      tags: {
        request_id: reqId,
        edge_function: fn,
      },
      extra: { ...context, error_message: errorObj?.message },
    };

    if (errorObj) {
      payload.exception = {
        values: [
          {
            type: errorObj.name || 'Error',
            value: errorObj.message,
            stacktrace: errorObj.stack
              ? { frames: [{ filename: fn, function: errorObj.stack.split('\n')[0] }] }
              : undefined,
          },
        ],
      };
    }

    // Fire-and-forget; never block the request
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': auth,
      },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    // Logging must never throw
  }
}

export interface EdgeLogger {
  debug(msg: string, context?: LogContext): void;
  info(msg: string, context?: LogContext): void;
  warn(msg: string, errOrContext?: unknown, context?: LogContext): void;
  error(msg: string, errOrContext?: unknown, context?: LogContext): void;
  child(extra: LogContext): EdgeLogger;
}

function format(
  level: LogLevel,
  fn: string,
  reqId: string,
  message: string,
  context: LogContext,
): string {
  const base = {
    ts: new Date().toISOString(),
    level,
    fn,
    [REQUEST_ID_HEADER]: reqId,
    msg: message,
    ...context,
  };
  return JSON.stringify(base);
}

function normalize(errOrContext?: unknown, context?: LogContext): {
  err: unknown;
  ctx: LogContext;
} {
  if (errOrContext instanceof Error) {
    return {
      err: errOrContext,
      ctx: { ...(context || {}), error_name: errOrContext.name, error_message: errOrContext.message },
    };
  }
  if (errOrContext && typeof errOrContext === 'object') {
    return { err: null, ctx: { ...(errOrContext as LogContext), ...(context || {}) } };
  }
  if (errOrContext !== undefined) {
    return { err: null, ctx: { extra: errOrContext, ...(context || {}) } };
  }
  return { err: null, ctx: context || {} };
}

export function createLogger(
  fn: string,
  requestId: string,
  baseContext: LogContext = {},
): EdgeLogger {
  const emit = (
    level: LogLevel,
    msg: string,
    err: unknown,
    ctx: LogContext,
  ): void => {
    const merged = { ...baseContext, ...ctx };
    const line = format(level, fn, requestId, msg, merged);
    // Use the matching console method so the platform's own log pipeline
    // still tags severity correctly. These are the only sanctioned console
    // calls in edge functions.
    if (level === 'error') {
      // eslint-disable-next-line no-console
      console.error(line);
    } else if (level === 'warn') {
      // eslint-disable-next-line no-console
      console.warn(line);
    } else {
      // eslint-disable-next-line no-console
      console.log(line);
    }
    if (level === 'warn' || level === 'error') {
      // Fire and forget — never await
      sendToSentry(level, fn, requestId, msg, err, merged);
    }
  };

  return {
    debug(msg, ctx = {}) {
      emit('debug', msg, null, ctx);
    },
    info(msg, ctx = {}) {
      emit('info', msg, null, ctx);
    },
    warn(msg, errOrContext, context) {
      const { err, ctx } = normalize(errOrContext, context);
      emit('warn', msg, err, ctx);
    },
    error(msg, errOrContext, context) {
      const { err, ctx } = normalize(errOrContext, context);
      emit('error', msg, err, ctx);
    },
    child(extra) {
      return createLogger(fn, requestId, { ...baseContext, ...extra });
    },
  };
}
