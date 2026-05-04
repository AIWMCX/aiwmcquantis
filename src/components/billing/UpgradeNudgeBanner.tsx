import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  type UpgradeNudgePayload,
  getActiveUpgradeNudge,
  subscribeUpgradeNudge,
  dismissUpgradeNudge,
} from '@/lib/upgradeNudgeBus';

/**
 * Renders backend-issued upgrade_nudge payloads as:
 *   - a sonner toast (one-shot, when first emitted)
 *   - a persistent inline banner above main content (until dismissed)
 */
export function UpgradeNudgeBanner() {
  const navigate = useNavigate();
  const [nudge, setNudge] = useState<UpgradeNudgePayload | null>(() =>
    getActiveUpgradeNudge(),
  );

  useEffect(() => {
    const unsub = subscribeUpgradeNudge((payload) => {
      setNudge(payload);
      if (payload) {
        toast(payload.headline, {
          description: payload.body,
          action: {
            label: payload.cta || 'Upgrade',
            onClick: () => navigate('/pricing'),
          },
          duration: 8000,
        });
      }
    });
    return unsub;
  }, [navigate]);

  if (!nudge) return null;

  return (
    <div
      role="region"
      aria-label="Upgrade recommendation"
      className="border-b border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{nudge.headline}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{nudge.body}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => navigate('/pricing')}
            className="h-8 whitespace-nowrap"
          >
            {nudge.cta || 'Upgrade'}
          </Button>
          <button
            onClick={() => dismissUpgradeNudge(nudge)}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
