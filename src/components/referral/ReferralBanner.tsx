import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, X, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { useReferral } from '@/hooks/useReferral';

interface ReferralBannerProps {
  onDismiss?: () => void;
  className?: string;
  variant?: 'default' | 'compact';
}

export const ReferralBanner = React.memo(function ReferralBanner({
  onDismiss,
  className,
  variant = 'default',
}: ReferralBannerProps) {
  const { stats, isLoading, generateCode, copyReferralLink } = useReferral();

  const handleGetLink = async () => {
    if (stats?.code) {
      await copyReferralLink();
    } else {
      const code = await generateCode();
      if (code) {
        trackEvent('referral_banner_code_generated');
      }
    }
  };

  if (variant === 'compact') {
    return (
      <Card className={cn('bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20', className)}>
        <CardContent className="p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              Invite friends & earn rewards
            </span>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleGetLink}
            disabled={isLoading}
            className="gap-1 text-xs"
          >
            {stats?.code ? 'Copy Link' : 'Get Link'}
            <ArrowRight className="w-3 h-3" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20', className)}>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            trackEvent('referral_banner_dismissed');
            onDismiss();
          }}
          className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      )}

      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Gift className="w-6 h-6 text-primary" />
          </div>

          <div className="flex-1 space-y-1">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              Invite Friends, Earn Rewards
              <Sparkles className="w-4 h-4 text-primary" />
            </h3>
            <p className="text-sm text-muted-foreground">
              Share your referral link and get 20% off your next month for each friend who subscribes to Plus.
            </p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={handleGetLink}
              disabled={isLoading}
              className="flex-1 sm:flex-none gap-2"
            >
              {stats?.code ? 'Copy My Link' : 'Get My Link'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {stats?.code && stats.total_conversions > 0 && (
          <div className="mt-4 pt-4 border-t border-primary/10 flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Referrals: </span>
              <span className="font-semibold text-foreground">{stats.total_conversions}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Earned: </span>
              <span className="font-semibold text-success">${stats.total_rewards_earned.toFixed(2)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
