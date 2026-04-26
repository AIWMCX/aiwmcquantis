/**
 * ProJobProgressPanel
 *
 * Live status panel for a Pro-depth analysis running as a background job.
 * Shows: phase (Queued / Running / Completed / Failed), elapsed time, current
 * step, and request_id (for support handoff).
 *
 * Design intent: this replaces the old "AI_PROVIDER_ERROR" toast that used to
 * appear when the synchronous request mis-handled a 202 queued response.
 */
import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { ProJobState } from '@/hooks/useProAnalysisJob';

interface Props {
  state: ProJobState;
  /** Soft target — not a hard cap. Drives the indeterminate progress bar. */
  expectedDurationMs?: number;
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
}

function prettifyStep(step: string | null): string | null {
  if (!step) return null;
  // step values like "monte_carlo", "llm_narrative" → "Monte Carlo", "LLM Narrative"
  return step
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ProJobProgressPanel: React.FC<Props> = ({
  state,
  expectedDurationMs = 60_000,
}) => {
  if (state.phase === 'idle') return null;

  const elapsedLabel = formatElapsed(state.elapsedMs);
  const stepLabel = prettifyStep(state.currentStep);
  const progressPct =
    state.phase === 'completed'
      ? 100
      : Math.min(95, Math.round((state.elapsedMs / expectedDurationMs) * 100));

  const phaseMeta: Record<
    ProJobState['phase'],
    { label: string; icon: React.ReactNode; tone: string; description: string }
  > = {
    idle: { label: 'Idle', icon: null, tone: '', description: '' },
    queued: {
      label: 'Queued',
      icon: <Clock className="w-4 h-4" />,
      tone: 'text-muted-foreground',
      description: 'Your Pro Audit is waiting for a worker. This usually clears in a few seconds.',
    },
    running: {
      label: 'Running',
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      tone: 'text-primary',
      description:
        'Pro Audit in progress — Monte Carlo simulation + scenario stress test + deep AI synthesis. You can stay on this page.',
    },
    completed: {
      label: 'Completed',
      icon: <CheckCircle2 className="w-4 h-4" />,
      tone: 'text-emerald-500',
      description: 'Done. Loading results…',
    },
    failed: {
      label: 'Failed',
      icon: <AlertTriangle className="w-4 h-4" />,
      tone: 'text-destructive',
      description: state.errorMessage ?? 'The Pro Audit hit an error.',
    },
    timed_out: {
      label: 'Timed out',
      icon: <ShieldAlert className="w-4 h-4" />,
      tone: 'text-destructive',
      description:
        'Pro Audit is still running on our side. We auto-started a Full analysis with the same inputs.',
    },
  };

  const meta = phaseMeta[state.phase];

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-muted/40 ${meta.tone}`}>
            {meta.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Pro Audit</h3>
              <Badge variant="outline" className={`text-[10px] ${meta.tone}`}>
                {meta.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Elapsed</p>
          <p className="text-sm font-mono font-semibold text-foreground tabular-nums">
            {elapsedLabel}
          </p>
        </div>
      </div>

      <Progress value={progressPct} className="h-1.5" />

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Current step</p>
          <p className="text-foreground font-medium">
            {stepLabel ?? (state.phase === 'queued' ? 'Awaiting worker' : 'Initializing')}
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Request ID</p>
          <p className="text-foreground font-mono text-[11px] truncate">
            {state.requestId ?? state.jobId?.slice(0, 8) ?? '—'}
          </p>
        </div>
      </div>

      {state.phase === 'failed' && state.failedStep && (
        <div className="text-[11px] text-destructive border-t border-border/40 pt-3">
          Failed at step: <span className="font-mono">{prettifyStep(state.failedStep)}</span>
          {state.errorCode && <> · code <span className="font-mono">{state.errorCode}</span></>}
        </div>
      )}
    </div>
  );
};
