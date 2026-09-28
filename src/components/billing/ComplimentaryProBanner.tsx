/**
 * ComplimentaryProBanner — shown during a free plan month granted by an
 * invite (or an email-keyed grant). There is no card on file, so the action
 * is "Keep Pro" (checkout), never the Stripe portal.
 *
 * Quiet while more than 7 days remain (dismissible per session); from 7 days
 * out it stays visible and escalates in tone.
 */
import { useEffect, useState } from 'react';
import { Gift, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';

const STORAGE_KEY = 'quantis_comp_banner_dismissed_v1';

export function ComplimentaryProBanner() {
  const { isComplimentary, complimentaryEndsAt, complimentaryDaysRemaining, isPro, createCheckout, loading } = useSubscription();
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem(STORAGE_KEY)); } catch { /* ignore */ }
  }, []);

  if (loading || !isComplimentary || !complimentaryEndsAt || complimentaryDaysRemaining === null) return null;
  const days = complimentaryDaysRemaining;
  if (days > 7 && dismissed === complimentaryEndsAt) return null;

  const plan = isPro ? 'Pro' : 'Plus';
  const ends = new Date(complimentaryEndsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const tone =
    days <= 2 ? 'border-red-500/50 bg-red-500/10' : days <= 7 ? 'border-amber-500/50 bg-amber-500/10' : 'border-primary/30 bg-primary/5';
  const label =
    days === 0 ? `Your free ${plan} month ends today` : days === 1 ? `Your free ${plan} month ends tomorrow` : `Free ${plan} month · ${days} days left (until ${ends})`;

  return (
    <div role="status" aria-live="polite" className={`w-full border-b ${tone}`}>
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Gift className="h-4 w-4 flex-shrink-0" aria-hidden />
          <p className="text-sm font-medium">
            {label}
            <span className="ml-2 font-normal opacity-80">No card on file. Afterwards your account and analyses stay, on the free plan.</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button size="sm" className="h-8" onClick={() => createCheckout(isPro ? 'pro' : 'plus').catch(() => undefined)}>
            Keep {plan}
          </Button>
          {days > 7 && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label="Dismiss"
              onClick={() => {
                try { sessionStorage.setItem(STORAGE_KEY, complimentaryEndsAt); } catch { /* ignore */ }
                setDismissed(complimentaryEndsAt);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
