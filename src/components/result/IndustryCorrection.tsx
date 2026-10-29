import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { INDUSTRIES } from '@/components/analysis/steps/shared';
import { trackEvent } from '@/lib/analytics';
import { industryLabel } from '@/lib/industry-label';

interface IndustryCorrectionProps {
  idea: string;
  location: string;
  detectedIndustry?: string | null;
}

/**
 * Buy-blockers #65: a run that guessed the wrong industry ("evaluates B2B
 * SaaS" for a grooming van) had no way to be corrected. Pick the right one and
 * re-run with the same idea and location.
 *
 * The choices are the /app form's own INDUSTRIES, so whatever is picked here
 * shows as the selected chip there. (The first version offered
 * INDUSTRY_OPTIONS; half of those ids have no chip in /app, so the choice was
 * sent but invisible.)
 */
export function IndustryCorrection({ idea, location, detectedIndustry }: IndustryCorrectionProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<string | null>(null);
  const label = industryLabel(detectedIndustry);

  const rerun = () => {
    if (!choice) return;
    trackEvent('industry_corrected', { from: detectedIndustry ?? 'unknown', to: choice });
    navigate('/app', {
      state: {
        decisionStatement: idea,
        prefillLocation: location && location !== 'Global' ? location : undefined,
        prefillIndustry: choice,
      },
    });
  };

  return (
    <div className="mt-2 text-xs text-muted-foreground/80" data-testid="industry-correction">
      {label && (
        <>
          <span className="font-medium">Modeled as:</span> {label}
          {' · '}
        </>
      )}
      {!open ? (
        <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => setOpen(true)}>
          Wrong industry? Change it
        </button>
      ) : (
        <div className="mt-3 max-w-xl space-y-3 text-left">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose the industry to re-run with">
            {INDUSTRIES.filter((ind) => ind.id !== detectedIndustry).map((ind) => {
              const selected = choice === ind.id;
              return (
                <button
                  key={ind.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setChoice(ind.id)}
                  className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    borderColor: selected ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                    color: selected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                    background: selected ? 'hsl(var(--primary) / 0.08)' : 'transparent',
                  }}
                >
                  {ind.label}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={rerun} disabled={!choice}>
              Re-run with this industry
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
