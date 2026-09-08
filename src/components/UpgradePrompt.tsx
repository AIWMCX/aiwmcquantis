import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Zap, Loader2, Shield, Lock, TrendingUp } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { FreeVsProMatrix } from '@/components/FreeVsProMatrix';
import { TIERS } from '@/config/tiers';

const PLUS_PRICE_MONTHLY = TIERS.plus.priceMonthly;

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingAnalyses: number;
  onUpgrade?: (plan: 'plus') => void;
}

export function UpgradePrompt({ 
  open, 
  onOpenChange, 
  remainingAnalyses
}: UpgradePromptProps) {
  const { user } = useAuth();
  const { createCheckout } = useSubscription();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleUpgrade = () => {
    if (user) {
      onOpenChange(false);
      setIsLoading(true);
      setTimeout(() => {
        createCheckout('plus').catch(() => setIsLoading(false));
      }, 100);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Zap className="w-5 h-5 text-primary" />
            Unlock Full Analysis Power
          </DialogTitle>
          <DialogDescription>
            {remainingAnalyses === 0 
              ? "You've completed all five complimentary Decision Runs this month. Your full reports remain available; Plus lets you continue with unlimited runs now."
              : `You have ${remainingAnalyses} free ${remainingAnalyses === 1 ? 'analysis' : 'analyses'} remaining. Free shows score + top 3 risks. Plus unlocks everything.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Brutal honesty message */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground italic leading-relaxed">
              "If Quantis doesn't surface at least one important correction to your plan in the first 14 days, you shouldn't keep it. That's the bar."
            </p>
          </div>

          {/* Plus Plan Card */}
          <div className="relative p-4 rounded-lg border-2 border-primary bg-primary/5">
            <div className="absolute -top-2 left-4 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded">
              Founder Plan
            </div>
            <div className="flex items-start justify-between pt-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="font-semibold">Plus</span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-success/10 text-success rounded-full">
                    14-day free trial
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground">
                  ${PLUS_PRICE_MONTHLY}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  $0.56/day · replaces 3–5 hrs of CFO analysis
                </p>
              </div>
              <Button 
                onClick={handleUpgrade} 
                disabled={isLoading}
                className="shrink-0 min-w-[110px]"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Start Free Trial'
                )}
              </Button>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                Unlimited scenarios per business
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                Export investor-ready packs
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                Monte Carlo simulations & advanced modeling
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                Custom branding & priority model reviews
              </li>
            </ul>
          </div>

          {/* Free vs Pro Matrix */}
          <FreeVsProMatrix compact />

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="w-3.5 h-3.5" />
              AES-256
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5" />
              No data sold
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5" />
              GDPR rights supported
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
