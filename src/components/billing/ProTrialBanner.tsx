/**
 * ProTrialBanner — shown when the user is in a Pro trial.
 *
 * Behavior:
 *  - Renders only when `isPro && isTrialing && trialDaysRemaining !== null`.
 *  - Dismissible per-trial via sessionStorage (resets if trial_ends_at changes).
 *  - "Manage subscription" → Stripe billing portal.
 *  - Hidden once dismissed for the session; reappears next session until trial ends.
 *  - Color escalates: neutral >3 days, amber 1–3, red ≤1.
 */
import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';

const STORAGE_KEY = 'quantis_pro_trial_banner_dismissed_v1';

function readDismissedFor(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeDismissedFor(trialEndsAt: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, trialEndsAt);
  } catch {
    /* ignore */
  }
}

export function ProTrialBanner() {
  const { isPro, isTrialing, trialEndsAt, trialDaysRemaining, openPortal, loading } = useSubscription();
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    setDismissed(readDismissedFor());
  }, []);

  if (loading) return null;
  if (!isPro || !isTrialing || !trialEndsAt || trialDaysRemaining === null) return null;
  if (dismissed === trialEndsAt) return null;

  const days = trialDaysRemaining;
  const tone =
    days <= 1
      ? 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300'
      : days <= 3
        ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : 'border-primary/40 bg-primary/5 text-foreground';

  const label =
    days === 0
      ? 'Your Pro trial ends today'
      : days === 1
        ? 'Your Pro trial ends tomorrow'
        : `${days} days left in your Pro trial`;

  const handleDismiss = () => {
    writeDismissedFor(trialEndsAt);
    setDismissed(trialEndsAt);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full border-b ${tone}`}
    >
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Sparkles className="h-4 w-4 flex-shrink-0" aria-hidden />
          <p className="text-sm font-medium truncate">
            {label}
            <span className="ml-2 font-normal opacity-80">
              Add a payment method to keep API access, white-label PDFs and team seats.
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="default"
            onClick={() => openPortal().catch(() => undefined)}
            className="h-8"
          >
            Manage subscription
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 w-8"
            aria-label="Dismiss trial banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
