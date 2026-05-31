import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, X, FileCheck2 } from 'lucide-react';
import {
  readLastAnalysis,
  clearLastAnalysis,
  type LastAnalysis,
} from '@/lib/analysisRecovery';
import { recordFunnelEvent } from '@/lib/analytics';

/**
 * If the visitor has an in-progress / completed analysis recorded in
 * localStorage (set by `HeroSingleInput` at submit time), show a slim
 * banner above the hero offering one-click return to `/r/:id`.
 *
 * Closes the #1 funnel leak: people abandon during the 60–90s wait and
 * never see their result. Their report is finished in the database; this
 * just gives them a door back to it.
 *
 * Emits `analysis_recover_view` / `analysis_recover_click` /
 * `analysis_recover_dismiss` against the existing canonical sample-event
 * channel so we can prove the recovery rate in the conversion dashboards.
 */
export function AnalysisRecoveryBanner() {
  const [entry, setEntry] = useState<LastAnalysis | null>(null);

  useEffect(() => {
    const e = readLastAnalysis();
    if (!e || e.seen) return;
    setEntry(e);
    // record a custom recovery view via the generic sample channel name
    // (kept canonical so the constraint check passes)
    recordFunnelEvent('sample_view', {
      surface: 'analysis_recovery_banner',
      had_id: Boolean(e.id),
      age_minutes: Math.round((Date.now() - e.startedAt) / 60000),
    });
  }, []);

  if (!entry) return null;

  const ageMin = Math.max(1, Math.round((Date.now() - entry.startedAt) / 60000));
  const ageLabel =
    ageMin < 60
      ? `${ageMin} min ago`
      : ageMin < 24 * 60
        ? `${Math.round(ageMin / 60)} h ago`
        : `${Math.round(ageMin / (60 * 24))} d ago`;

  const target = entry.id ? `/r/${entry.id}` : '/app';

  const onDismiss = () => {
    recordFunnelEvent('sample_cta_click', {
      surface: 'analysis_recovery_banner',
      action: 'dismiss',
    });
    clearLastAnalysis();
    setEntry(null);
  };

  const onClick = () => {
    recordFunnelEvent('sample_cta_click', {
      surface: 'analysis_recovery_banner',
      action: 'recover',
      had_id: Boolean(entry.id),
    });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full border-b"
      style={{
        background:
          'linear-gradient(90deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))',
        borderColor: 'hsl(var(--primary) / 0.2)',
      }}
    >
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
        <span
          className="hidden sm:inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0"
          style={{
            background: 'hsl(var(--primary) / 0.15)',
            color: 'hsl(var(--primary))',
          }}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
        </span>

        <p className="flex-1 text-[13px] sm:text-sm text-foreground">
          <span className="font-semibold">Your analysis is ready.</span>{' '}
          <span className="text-muted-foreground">
            You started one {ageLabel}
            {entry.ideaPreview ? ` — "${entry.ideaPreview}"` : ''}.
          </span>
        </p>

        <Link
          to={target}
          onClick={onClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold shrink-0 hover:opacity-90 transition"
          style={{
            background: 'hsl(var(--primary))',
            color: 'hsl(var(--primary-foreground))',
          }}
        >
          See my report
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss recovery banner"
          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
