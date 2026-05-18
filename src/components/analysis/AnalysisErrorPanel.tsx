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
import { trackError } from '@/lib/analytics';

export interface AnalysisErrorPanelProps {
  error: Error;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  /**
   * Optional attempt counter. When provided, the panel surfaces "Attempt N/max"
   * and applies exponential backoff between retries: min(2^(attempt-1), 30) seconds.
   * Form-input persistence is handled upstream by WizardForm's draft system;
   * we only reassure the user that their inputs are preserved.
   */
  attempt?: number;
  maxAttempts?: number;
}

interface ParsedError {
  code: string;
  status?: number;
  title: string;
  guidance: string;
  Icon: React.ElementType;
  tone: 'destructive' | 'warning' | 'info';
  isTransient: boolean;
  retryAfterSeconds?: number;
  upgradeUrl?: string;
}

function parseError(err: Error): ParsedError {
  const msg = err.message || 'Unknown error';

  // Try to pull a 3-digit HTTP-style status from anywhere in the message.
  const statusMatch = msg.match(/\b([3-5]\d{2})\b/);
  const status = statusMatch ? Number(statusMatch[1]) : undefined;

  // Try to pull a leading CODE: prefix (added by analysisApi.ts on 400s).
  const codeMatch = msg.match(/^([A-Z][A-Z0-9_]{2,})\s*[:|]/);
  const explicitCode = codeMatch?.[1];

  // Extract retry_after=N (seconds) and upgrade_url=… added by analysisApi.
  const retryAfterMatch = msg.match(/retry_after=(\d+)/);
  const retryAfterSeconds = retryAfterMatch ? Number(retryAfterMatch[1]) : undefined;
  const upgradeMatch = msg.match(/upgrade_url=([^\s|]+)/);
  const upgradeUrl = upgradeMatch?.[1];

  if (/RATE_LIMIT/i.test(msg) || status === 429) {
    return {
      code: explicitCode ?? 'RATE_LIMIT_EXCEEDED',
      status: status ?? 429,
      title: "You've hit the analysis rate limit",
      guidance:
        retryAfterSeconds
          ? `Please wait before retrying. The retry button will re-enable automatically.`
          : 'Wait ~60 seconds before retrying, or sign in / upgrade to Plus for higher limits.',
      Icon: Clock,
      tone: 'warning',
      isTransient: true,
      retryAfterSeconds,
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
      upgradeUrl: upgradeUrl ?? '/pricing',
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

  if (/ANALYSIS_UNAVAILABLE/i.test(msg)) {
    return {
      code: 'ANALYSIS_UNAVAILABLE',
      title: 'Analysis engine temporarily unreachable',
      guidance:
        'We could not reach the benchmark engine. Your inputs are preserved — click Retry. If this keeps happening, the engine is warming up and should be back in a minute.',
      Icon: ServerCrash,
      tone: 'warning',
      isTransient: true,
    };
  }

  if (/RESPONSE_SCHEMA_INVALID|REQUEST_SCHEMA_INVALID/i.test(msg)) {
    return {
      code: 'SCHEMA_INVALID',
      title: 'Analysis output failed integrity check',
      guidance:
        'The engine produced a result that did not pass our benchmark integrity checks. Retry usually fixes this — we never show numbers we cannot verify.',
      Icon: ShieldAlert,
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
  attempt,
  maxAttempts = 5,
}: AnalysisErrorPanelProps) {
  const parsed = React.useMemo(() => parseError(error), [error]);
  const { Icon } = parsed;

  // Exponential backoff: 0, 2s, 4s, 8s, 16s (cap 30s). Only applied when
  // an attempt count is provided AND the error class is transient. Server-
  // supplied retry_after wins when present (e.g. RATE_LIMIT_EXCEEDED).
  const backoffSeconds = React.useMemo(() => {
    if (parsed.retryAfterSeconds && parsed.retryAfterSeconds > 0) return parsed.retryAfterSeconds;
    if (!attempt || attempt < 1 || !parsed.isTransient) return 0;
    return Math.min(2 ** (attempt - 1), 30);
  }, [attempt, parsed.isTransient, parsed.retryAfterSeconds]);

  // Live countdown.
  const [secondsLeft, setSecondsLeft] = React.useState<number>(backoffSeconds);
  React.useEffect(() => {
    setSecondsLeft(backoffSeconds);
  }, [backoffSeconds, error]);
  React.useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [secondsLeft]);

  const exhausted = typeof attempt === 'number' && attempt >= maxAttempts;

  // Telemetry — fire once per distinct (code, message) pair.
  const trackedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const key = `${parsed.code}:${error.message?.slice(0, 120) ?? ''}:${attempt ?? ''}`;
    if (trackedRef.current === key) return;
    trackedRef.current = key;
    try {
      trackError(parsed.code, error.message?.slice(0, 240) ?? parsed.title);
    } catch {
      /* analytics must never break UI */
    }
  }, [parsed.code, parsed.title, error.message, attempt]);

  const retryDisabled = secondsLeft > 0 || exhausted;

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
              {parsed.status ? `${parsed.status} · ` : ''}
              {parsed.code}
            </span>
            {typeof attempt === 'number' && attempt > 0 && (
              <span
                className="inline-flex items-center text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded border border-border/50 bg-background/60 text-muted-foreground"
                title="Number of times this submission has been attempted"
              >
                Attempt {attempt}/{maxAttempts}
              </span>
            )}
          </div>

          <p className="mt-1.5 text-sm text-muted-foreground">
            {parsed.guidance}
            {retryDisabled && secondsLeft > 0 && (
              <span className="ml-1 font-mono text-foreground" aria-live="polite">
                ({secondsLeft}s)
              </span>
            )}
          </p>

          {/* Persistent reassurance about input preservation — drives confidence
              to hit Retry instead of bailing. The WizardForm draft system
              already serializes inputs to localStorage on every change. */}
          {parsed.isTransient && (
            <p className="mt-1.5 text-xs text-muted-foreground/80">
              Your idea, location, and financial inputs are saved locally and will be
              restored automatically — retrying will not erase anything you typed.
            </p>
          )}

          {exhausted && (
            <p className="mt-1.5 text-xs text-destructive font-medium">
              Max retries reached. Refresh the page or contact support — the engine
              may be having an outage.
            </p>
          )}

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

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {onRetry && parsed.isTransient && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onRetry}
                disabled={retryDisabled}
                className="gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {exhausted
                  ? 'Retries exhausted'
                  : secondsLeft > 0
                  ? `Retry in ${secondsLeft}s`
                  : 'Retry'}
              </Button>
            )}
            {parsed.upgradeUrl && (
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => {
                  window.location.assign(parsed.upgradeUrl!);
                }}
              >
                Upgrade to Plus
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
