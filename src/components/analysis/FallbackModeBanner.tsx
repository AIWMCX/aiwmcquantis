/**
 * FallbackModeBanner — F1 fix.
 *
 * Surfaces when the analyze-business edge function could not reach the LLM
 * narrator and returned a deterministic-only result. Blocks investor use
 * with brutal-honesty copy per the AIWMC tone memory.
 *
 * Render conditionally:
 *   {meta?.fallbackMode && <FallbackModeBanner reason={meta.fallbackReason} onRetry={refetch} />}
 */
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FallbackModeBannerProps {
  reason?: string | null;
  onRetry?: () => void;
  aiCallsAttempted?: number;
  aiCallsSucceeded?: number;
}

export function FallbackModeBanner({ reason, onRetry, aiCallsAttempted, aiCallsSucceeded }: FallbackModeBannerProps) {
  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border-2 border-destructive bg-destructive/10 p-4 text-destructive"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <p className="font-semibold leading-tight">
            AI narrative unavailable — deterministic engine output only
          </p>
          <p className="mt-1 text-sm text-destructive/90">
            The numbers below are computed from your inputs and the benchmark
            database. The AI risk narrative, action plan, and adversarial
            consensus did not run. <strong>Do not use this analysis for
            investor decisions until you re-run successfully.</strong>
          </p>
          {reason && (
            <p className="mt-2 font-mono text-xs text-destructive/80">
              Reason: {reason}
            </p>
          )}
          {typeof aiCallsAttempted === 'number' && (
            <p className="mt-1 font-mono text-[11px] text-destructive/70">
              AI calls: {aiCallsSucceeded ?? 0}/{aiCallsAttempted} succeeded
            </p>
          )}
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="shrink-0 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
