import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PartyPopper, Share2, Download, ArrowRight, Crown, Twitter, Linkedin, Link2 } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { celebrationBurst } from '@/lib/confetti';
import { toast } from 'sonner';

interface FirstAnalysisCelebrationProps {
  open: boolean;
  onClose: () => void;
  onShare?: () => void;
  onExport?: () => void;
  analysisCount?: number;
  remainingFreeAnalyses?: number;
}

export const FirstAnalysisCelebration = React.memo(function FirstAnalysisCelebration({
  open,
  onClose,
  onShare,
  onExport,
  analysisCount = 1,
  remainingFreeAnalyses = 2,
}: FirstAnalysisCelebrationProps) {
  useEffect(() => {
    if (open) {
      // Fire confetti!
      celebrationBurst();
      trackEvent('first_analysis_celebration_shown');
    }
  }, [open]);

  const handleTwitterShare = () => {
    const text = "Just got my first AI business analysis in under 2 minutes with @AIWMC_official's Quantis — Financial projections, market analysis, and a complete business plan, all automated. #StartupTools #AI";
    const url = 'https://aiwmcquantis.com';
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer'
    );
    trackEvent('first_analysis_twitter_share');
  };

  const handleLinkedInShare = () => {
    const url = 'https://aiwmcquantis.com';
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer'
    );
    trackEvent('first_analysis_linkedin_share');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText('https://aiwmcquantis.com');
      toast.success('Link copied to clipboard!');
      trackEvent('first_analysis_link_copied');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  // Progress towards 5-analysis badge
  const progressTo5 = Math.min((analysisCount / 5) * 100, 100);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4 animate-bounce">
            <PartyPopper className="w-8 h-8 text-success" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            Your First Analysis is Complete!
          </DialogTitle>
          <DialogDescription className="text-base">
            You just saved hours of research and calculations. Here's what you can do next:
          </DialogDescription>
        </DialogHeader>

        {/* Social Share Section */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-3 my-4">
          <p className="text-sm font-medium text-foreground">Share your success</p>
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleTwitterShare}
              className="hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] hover:border-[#1DA1F2]"
            >
              <Twitter className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleLinkedInShare}
              className="hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] hover:border-[#0A66C2]"
            >
              <Linkedin className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyLink}
            >
              <Link2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {onShare && (
            <Button
              variant="outline"
              onClick={() => {
                onShare();
                trackEvent('first_analysis_share_clicked');
              }}
              className="w-full gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share with your team
            </Button>
          )}
          
          {onExport && (
            <Button
              variant="outline"
              onClick={() => {
                onExport();
                trackEvent('first_analysis_export_clicked');
              }}
              className="w-full gap-2"
            >
              <Download className="w-4 h-4" />
              Export as PDF
            </Button>
          )}
        </div>

        {/* Upgrade Teaser */}
        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 mt-4">
          <div className="flex items-center gap-2 justify-center mb-2">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Unlock Unlimited Analyses</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Upgrade to Plus for unlimited analyses, AI document intelligence, and more.
          </p>
        </div>

        {/* Progress to Badge */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress to "Power Analyst" badge</span>
            <span>{analysisCount}/5 analyses</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progressTo5}%` }}
            />
          </div>
        </div>

        <Button onClick={onClose} className="w-full gap-2 mt-4">
          Continue Exploring
          <ArrowRight className="w-4 h-4" />
        </Button>

        <p className="text-xs text-muted-foreground mt-2">
          {remainingFreeAnalyses > 0 
            ? `Tip: You have ${remainingFreeAnalyses} more free ${remainingFreeAnalyses === 1 ? 'analysis' : 'analyses'} this month`
            : "You've used all your free analyses this month. Upgrade to continue!"
          }
        </p>
      </DialogContent>
    </Dialog>
  );
});