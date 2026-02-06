import React, { useState, useCallback } from 'react';
import { 
  FileText, 
  Share2, 
  Copy, 
  Check, 
  Linkedin, 
  Twitter, 
  Link2, 
  Plus,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';

interface ResultsActionBarProps {
  analysisId?: string;
  shareToken?: string;
  businessIdea?: string;
  onExportPDF?: () => void;
  onNewAnalysis?: () => void;
  isExporting?: boolean;
  className?: string;
}

export const ResultsActionBar = React.memo(function ResultsActionBar({
  analysisId,
  shareToken,
  businessIdea,
  onExportPDF,
  onNewAnalysis,
  isExporting = false,
  className,
}: ResultsActionBarProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl = shareToken 
    ? `${window.location.origin}/share/${shareToken}`
    : window.location.href;

  const shareText = businessIdea
    ? `Check out my business analysis for "${businessIdea}" - created with AIWMC Quantis™`
    : 'Check out my AI-powered business analysis - created with AIWMC Quantis™';

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success('Link copied to clipboard!');
      trackEvent('results_action', { action: 'copy_link', analysis_id: analysisId });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy link');
    }
  }, [shareUrl, analysisId]);

  const handleShareLinkedIn = useCallback(() => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=400');
    trackEvent('results_action', { action: 'share_linkedin', analysis_id: analysisId });
  }, [shareUrl, analysisId]);

  const handleShareTwitter = useCallback(() => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    trackEvent('results_action', { action: 'share_twitter', analysis_id: analysisId });
  }, [shareText, shareUrl, analysisId]);

  const handleExportPDF = useCallback(() => {
    trackEvent('results_action', { action: 'export_pdf', analysis_id: analysisId });
    onExportPDF?.();
  }, [onExportPDF, analysisId]);

  const handleNewAnalysis = useCallback(() => {
    trackEvent('results_action', { action: 'new_analysis', analysis_id: analysisId });
    onNewAnalysis?.();
  }, [onNewAnalysis, analysisId]);

  return (
    <div className={cn('flex flex-wrap items-center gap-2 sm:gap-3', className)}>
      {/* Primary CTA: New Analysis */}
      {onNewAnalysis && (
        <Button
          onClick={handleNewAnalysis}
          className="gap-2 font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Analyze Another Idea</span>
          <span className="sm:hidden">New Analysis</span>
        </Button>
      )}

      {/* Export PDF */}
      {onExportPDF && (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={handleExportPDF}
                disabled={isExporting}
                className="gap-2"
              >
                {isExporting ? (
                  <Download className="w-4 h-4 animate-bounce" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {isExporting ? 'Generating...' : 'Export PDF'}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Download bank-ready PDF report</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Share Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer">
            {copiedLink ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            {copiedLink ? 'Copied!' : 'Copy Link'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleShareLinkedIn} className="gap-2 cursor-pointer">
            <Linkedin className="w-4 h-4 text-[#0077b5]" />
            Share on LinkedIn
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShareTwitter} className="gap-2 cursor-pointer">
            <Twitter className="w-4 h-4 text-[#1da1f2]" />
            Share on X
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Copy link button (mobile shortcut) */}
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyLink}
              className="sm:hidden"
            >
              {copiedLink ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{copiedLink ? 'Copied!' : 'Copy report link'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
});
