import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Sparkles, Zap, Crown, Loader2 } from 'lucide-react';

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingAnalyses: number;
  onUpgrade: (plan: 'plus' | 'pro') => void;
}

export function UpgradePrompt({ 
  open, 
  onOpenChange, 
  remainingAnalyses, 
  onUpgrade 
}: UpgradePromptProps) {
  const [loadingPlan, setLoadingPlan] = useState<'plus' | 'pro' | null>(null);

  const handleUpgrade = async (plan: 'plus' | 'pro') => {
    setLoadingPlan(plan);
    try {
      await onUpgrade(plan);
    } finally {
      // Only reset if still mounted (dialog might close)
      setTimeout(() => setLoadingPlan(null), 1000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            Upgrade to Continue
          </DialogTitle>
          <DialogDescription>
            {remainingAnalyses === 0 
              ? "You've used all your free analyses this month."
              : `You have ${remainingAnalyses} free ${remainingAnalyses === 1 ? 'analysis' : 'analyses'} remaining this month.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Plus Plan */}
          <div className="p-4 rounded-lg border border-border">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="font-semibold">Plus</span>
                </div>
                <p className="text-2xl font-bold">$17<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => handleUpgrade('plus')} 
                disabled={loadingPlan !== null}
                className="shrink-0 min-w-[90px]"
              >
                {loadingPlan === 'plus' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Upgrade'
                )}
              </Button>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Unlimited analyses
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Advanced financial modeling
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                PDF export & priority support
              </li>
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="relative p-4 rounded-lg border-2 border-primary bg-primary/5">
            <div className="absolute -top-2 left-4 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded">
              Most Popular
            </div>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-warning" />
                  <span className="font-semibold">Pro</span>
                </div>
                <p className="text-2xl font-bold">$29<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              </div>
              <Button 
                onClick={() => handleUpgrade('pro')} 
                disabled={loadingPlan !== null}
                className="shrink-0 min-w-[90px]"
              >
                {loadingPlan === 'pro' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Upgrade'
                )}
              </Button>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Everything in Plus
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Team collaboration & API access
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Custom branding & SLA guarantee
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
