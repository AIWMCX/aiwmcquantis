import React, { useEffect, useState } from 'react';
import { useActivation } from '@/hooks/useActivation';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { markTriggerShown, dismissTrigger } from '@/lib/contextualTriggers';
import { Button } from '@/components/ui/button';
import { Sparkles, X } from 'lucide-react';

/**
 * ContextualUpgradeBanner — surfaces the next-best contextual upgrade trigger
 * based on the user's activation event matrix. Auto-hides for Plus members.
 */
export function ContextualUpgradeBanner() {
  const { trigger, isPlus, score } = useActivation();
  const { user } = useAuth();
  const { createCheckout } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [shownId, setShownId] = useState<string | null>(null);

  useEffect(() => {
    if (!trigger || isPlus) {
      setVisible(false);
      return;
    }
    const t = setTimeout(() => {
      setVisible(true);
      markTriggerShown(trigger.id);
      setShownId(trigger.id);
    }, trigger.delayMs);
    return () => clearTimeout(t);
  }, [trigger, isPlus]);

  if (!visible || !trigger || isPlus) return null;

  const handleUpgrade = () => {
    if (user) {
      setIsLoading(true);
      createCheckout('plus').catch(() => setIsLoading(false));
    }
  };

  const handleDismiss = () => {
    if (shownId) dismissTrigger(shownId);
    setVisible(false);
  };

  return (
    <div className="relative rounded-lg border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-card to-card p-4 mb-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <div className="p-2 rounded-md bg-primary/10 shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {trigger.headline}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            {typeof trigger.body === 'function' ? trigger.body(score.event_counts) : trigger.body}
          </p>
          <Button size="sm" onClick={handleUpgrade} disabled={isLoading}>
            {trigger.cta}
          </Button>
        </div>
      </div>
    </div>
  );
}
