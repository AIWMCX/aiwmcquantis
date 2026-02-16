import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Gift,
  Copy,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Share2,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReferral } from '@/hooks/useReferral';
import { SocialShareButtons } from './SocialShareButtons';
import { trackEvent } from '@/lib/analytics';

interface ReferralDashboardProps {
  className?: string;
}

export const ReferralDashboard = React.memo(function ReferralDashboard({
  className,
}: ReferralDashboardProps) {
  const {
    stats,
    conversions,
    rewards,
    isLoading,
    isGenerating,
    generateCode,
    copyReferralLink,
  } = useReferral();

  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const success = await copyReferralLink();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateCode = async () => {
    await generateCode();
    trackEvent('referral_dashboard_code_generated');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
      case 'qualified':
        return <Badge variant="default" className="gap-1 bg-primary"><CheckCircle2 className="w-3 h-3" /> Qualified</Badge>;
      case 'rewarded':
        return <Badge variant="default" className="gap-1 bg-success"><DollarSign className="w-3 h-3" /> Rewarded</Badge>;
      case 'applied':
        return <Badge variant="default" className="gap-1 bg-success"><CheckCircle2 className="w-3 h-3" /> Applied</Badge>;
      case 'expired':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading && !stats) {
    return (
      <Card className={className}>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // No code yet - show generation prompt
  if (!stats?.code) {
    return (
      <Card className={cn('bg-gradient-to-br from-primary/5 to-background', className)}>
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Gift className="w-8 h-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">
              Start Earning Rewards
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Get your unique referral link and earn 20% off for every friend who subscribes to Plus.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-left max-w-sm mx-auto">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-primary">
                1
              </div>
              <span className="text-sm text-muted-foreground">Share your unique link with friends</span>
            </div>
            <div className="flex items-center gap-3 text-left max-w-sm mx-auto">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-primary">
                2
              </div>
              <span className="text-sm text-muted-foreground">They sign up and subscribe to Plus</span>
            </div>
            <div className="flex items-center gap-3 text-left max-w-sm mx-auto">
              <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-success">
                3
              </div>
              <span className="text-sm text-muted-foreground">You both get 20% off your next month!</span>
            </div>
          </div>

          <Button
            onClick={handleGenerateCode}
            disabled={isGenerating}
            size="lg"
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Gift className="w-4 h-4" />
                Get My Referral Link
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Has code - show dashboard
  return (
    <div className={cn('space-y-6', className)}>
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.total_clicks}</p>
            <p className="text-xs text-muted-foreground">Link Clicks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.total_conversions}</p>
            <p className="text-xs text-muted-foreground">Sign Ups</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="w-5 h-5 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">${stats.total_rewards_earned.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Gift className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.pending_rewards}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Share Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Your Referral Link
          </CardTitle>
          <CardDescription>
            Share this link to invite friends. You'll both get rewards when they subscribe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={stats.share_url || ''}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="gap-2 flex-shrink-0"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Share on social:</span>
            <SocialShareButtons
              shareUrl={stats.share_url || ''}
              title="Check out AIWMC Quantis"
              description="Get AI-powered business analysis in 2 minutes. I use it for financial projections and market insights."
              size="sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Activity Tabs */}
      <Tabs defaultValue="referrals" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
        </TabsList>

        <TabsContent value="referrals" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {conversions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No referrals yet. Share your link to get started!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {conversions.map((conversion) => (
                    <div key={conversion.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Referral Click
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(conversion.clicked_at).toLocaleDateString()}
                        </p>
                      </div>
                      {getStatusBadge(conversion.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {rewards.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No rewards yet. Keep sharing to earn!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {rewards.map((reward) => (
                    <div key={reward.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {reward.reward_type === 'discount_percent'
                            ? `${reward.reward_value}% Discount`
                            : reward.reward_type === 'free_month'
                            ? 'Free Month'
                            : `$${reward.reward_value} Credit`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(reward.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {getStatusBadge(reward.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});
