import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { IndustrySelector } from '@/components/analysis/IndustrySelector';
import { INDUSTRY_OPTIONS } from '@/types/analysis';
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
 */
export function IndustryCorrection({ idea, location, detectedIndustry }: IndustryCorrectionProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const known = INDUSTRY_OPTIONS.some((o) => o.id === detectedIndustry);
  const [choice, setChoice] = useState<string>(known && detectedIndustry ? detectedIndustry : 'auto');
  const label = industryLabel(detectedIndustry);

  const rerun = () => {
    trackEvent('industry_corrected', { from: detectedIndustry ?? 'unknown', to: choice });
    navigate('/app', {
      state: {
        decisionStatement: idea,
        prefillLocation: location && location !== 'Global' ? location : undefined,
        prefillIndustry: choice === 'auto' ? undefined : choice,
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
        <div className="mt-3 max-w-md space-y-3 text-left">
          <IndustrySelector value={choice} onChange={setChoice} />
          <div className="flex gap-2">
            <Button size="sm" onClick={rerun} disabled={choice === 'auto' || choice === detectedIndustry}>
              Re-run with this industry
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
