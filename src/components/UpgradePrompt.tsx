import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Sparkles, Zap, Loader2 } from 'lucide-react';
import { usePaymentLinks } from '@/hooks/useStripeCheckout';
import { useAuth } from '@/hooks/useAuth';

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
  const { redirectToPayment, isLoading } = usePaymentLinks();

  const handleUpgrade = () => {
    if (user) {
      // Close dialog first to avoid redirect issues from modal context
      onOpenChange(false);
      // Small delay to let dialog close, then redirect
      setTimeout(() => {
        redirectToPayment('plus', user.id, user.email || undefined);
      }, 100);
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

        <div className="py-4">
          {/* Plus Plan */}
          <div className="relative p-4 rounded-lg border-2 border-primary bg-primary/5">
            <div className="absolute -top-2 left-4 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded">
              Recommended
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
                <p className="text-2xl font-bold">$17<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              </div>
              <Button 
                onClick={handleUpgrade} 
                disabled={isLoading}
                className="shrink-0 min-w-[90px]"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Start Trial'
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
                Document intelligence & PDF export
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Custom branding & priority support
              </li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
