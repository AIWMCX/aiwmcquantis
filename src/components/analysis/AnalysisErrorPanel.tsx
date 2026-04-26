/**
 * AnalysisErrorPanel — surfaces a detailed, actionable error state when the
 * analyze-business POST fails. Supplements the Sonner toast (already fired by
 * useAnalysis) with a persistent inline panel that shows:
 *   - HTTP-style code parsed from the error message (RATE_LIMIT_EXCEEDED, 5xx, etc.)
 *   - Raw message + retry guidance tailored to the error class
 *   - One-click retry that re-runs the last submission
 */
import React from 'react';
import { AlertTriangle, RefreshCw, Wifi, Clock, ServerCrash, ShieldAlert, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface AnalysisErrorPanelProps {
  error: Error;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

interface ParsedError {
  code: string;
  status?: number;
  title: string;
  guidance: string;
  Icon: React.ElementType;
  tone: 'destructive' | 'warning' | 'info';
  isTransient: boolean;
}

function parseError(err: Error): ParsedError {
  const msg = err.message || 'Unknown error';

  // Try to pull a 3-digit HTTP-style status from anywhere in the message.
  const statusMatch = msg.match(/\b([3-5]\d{2})\b/);
  const status = statusMatch ? Number(statusMatch[1]) : undefined;

  // Try to pull a leading CODE: prefix (added by analysisApi.ts on 400s).
  const codeMatch = msg.match(/^([A-Z][A-Z0-9_]{2,})\s*[:|]/);
  const explicitCode = codeMatch?.[1];

  if (/RATE_LIMIT/i.test(msg) || status === 429) {
    return {
      code: explicitCode ?? 'RATE_LIMIT_EXCEEDED',
      status: status ?? 429,
      title: 'You\'ve hit the analysis rate limit',
      guidance:
        'Wait ~60 seconds before retrying, or sign in / upgrade to Plus for higher limits.',
      Icon: Clock,
      tone: 'warning',
      isTransient: true,
    };
  }

  if (/QUOTA|USAGE_LIMIT|PAYMENT|TIER_GATE/i.test(msg) || status === 402) {
    return {
      code: explicitCode ?? 'QUOTA_EXCEEDED',
      status: status ?? 402,
      title: 'Monthly analysis limit reached',
      guidance:
        'Upgrade to Plus to unlock unlimited full analyses. Free quota resets at the start of next month.',
      Icon: CreditCard,
      tone: 'warning',
      isTransient: false,
    };
  }

  if (/INVALID_BUSINESS_IDEA|VALIDATION/i.test(msg) || status === 400) {
    return {
      code: explicitCode ?? 'VALIDATION_ERROR',
      status: status ?? 400,
      title: 'We couldn\'t parse that input',
      guidance: msg.replace(/^[A-Z_]+:\s*/, '').slice(0, 240) ||
        'Please describe a real business idea (≥10 characters) and a city/region.',
      Icon: ShieldAlert,
      tone: 'destructive',
      isTransient: false,
    };
  }

  if (/network|fetch|Failed to fetch|ECONN|NetworkError/i.test(msg)) {
    return {
      code: 'NETWORK_ERROR',
      title: 'Network connection lost',
      guidance: 'Check your internet connection and click Retry. Your form data is preserved.',
      Icon: Wifi,
      tone: 'warning',
      isTransient: true,
    };
  }

  if (/timeout|abort|ETIMEDOUT/i.test(msg)) {
    return {
      code: 'TIMEOUT',
      title: 'Server took too long to respond',
      guidance:
        'Our analysis engine is under load. Retry in a moment — the request is usually fast on a second attempt.',
      Icon: Clock,
      tone: 'warning',
      isTransient: true,
    };
  }

  if (/\b5\d{2}\b|server|INTERNAL/i.test(msg)) {
    return {
      code: explicitCode ?? 'SERVER_ERROR',
      status: status ?? 500,
      title: 'Our analysis engine hit a snag',
      guidance:
        'This is on us. Retry once — if it keeps failing, our team has been notified automatically.',
      Icon: ServerCrash,
      tone: 'destructive',
      isTransient: true,
    };
  }

  if (/AI|model|provider|JSON|PARSE/i.test(msg)) {
    return {
      code: explicitCode ?? 'AI_PROVIDER_ERROR',
      title: 'AI provider returned an unexpected response',
      guidance: 'Retry usually fixes this — the model occasionally produces malformed output.',
      Icon: ServerCrash,
      tone: 'warning',
      isTransient: true,
    };
  }

  return {
    code: explicitCode ?? 'UNKNOWN_ERROR',
    status,
    title: 'Something went wrong',
    guidance: msg.slice(0, 240) || 'Please retry. If the problem persists, contact support.',
    Icon: AlertTriangle,
    tone: 'destructive',
    isTransient: true,
  };
}

const TONE_STYLES: Record<ParsedError['tone'], string> = {
  destructive:
    'border-destructive/30 bg-destructive/5 text-destructive [&_.tone-icon]:text-destructive',
  warning:
    'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300 [&_.tone-icon]:text-amber-500',
  info:
    'border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-300 [&_.tone-icon]:text-sky-500',
};

export function AnalysisErrorPanel({
  error,
  onRetry,
  onDismiss,
  className,
}: AnalysisErrorPanelProps) {
  const parsed = React.useMemo(() => parseError(error), [error]);
  const { Icon } = parsed;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`rounded-xl border p-4 sm:p-5 ${TONE_STYLES[parsed.tone]} ${className ?? ''}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="tone-icon w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">{parsed.title}</h3>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded border border-border/50 bg-background/60 text-muted-foreground">
              {parsed.status ? `${parsed.status} · ` : ''}{parsed.code}
            </span>
          </div>

          <p className="mt-1.5 text-sm text-muted-foreground">{parsed.guidance}</p>

          {/* Raw message — collapsed by default, useful for support tickets. */}
          {error.message && error.message !== parsed.title && (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
                Technical details
              </summary>
              <pre className="mt-1.5 whitespace-pre-wrap break-words rounded border border-border/50 bg-background/60 p-2 text-[11px] font-mono text-muted-foreground">
                {error.message}
              </pre>
            </details>
          )}

          <div className="mt-3 flex items-center gap-2">
            {onRetry && parsed.isTransient && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </Button>
            )}
            {onDismiss && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="text-muted-foreground"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
