import React, { useState } from 'react';
import { 
  Twitter, Linkedin, MessageCircle, Copy, Mail, 
  Download, CheckCircle2, X, Trophy, ArrowRight, DollarSign, Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';

interface ShareSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  ideaScore: number;
  ideaName: string;
  shareUrl?: string;
  onExportPDF?: () => void;
  profit?: number;
  margin?: number;
  paybackMonths?: number;
}

export function ShareSuccessModal({
  isOpen,
  onClose,
  ideaScore,
  ideaName,
  shareUrl,
  onExportPDF,
  profit = 0,
  margin = 0,
  paybackMonths,
}: ShareSuccessModalProps) {
  const [copied, setCopied] = useState(false);
  const [captionCopied, setCaptionCopied] = useState(false);

  if (!isOpen) return null;

  // Build short idea label (first 3 words max)
  const ideaLabel = ideaName.split(' ').slice(0, 4).join(' ');

  // Curiosity-driven share text
  const shareText = `Quantis gave my "${ideaLabel}" idea a ${ideaScore}/10. Here's why: $${profit.toLocaleString()}/mo profit, ${margin.toFixed(1)}% net margin${paybackMonths ? `, ${paybackMonths}mo payback` : ''}. See the full breakdown:`;

  // Pre-formatted image caption for Instagram/LinkedIn posts
  const imageCaption = `📊 Just validated my business idea with AIWMC Quantis

Score: ${ideaScore}/10 ${ideaScore >= 8 ? '🏆' : ideaScore >= 5 ? '⚡' : '⚠️'}
Monthly Profit: $${profit.toLocaleString()}
Net Margin: ${margin.toFixed(1)}%${paybackMonths ? `\nPayback Period: ${paybackMonths} months` : ''}

Most validators just say "good idea" or "bad idea."
Quantis shows you HOW to make it profitable 📈

Free analysis → aiwmcquantis.com
${shareUrl ? `\nMy full report: ${shareUrl}` : ''}`;

  const encodedText = encodeURIComponent(shareText);
  const encodedUrl = encodeURIComponent(shareUrl || 'https://aiwmcquantis.com');

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl || 'https://aiwmcquantis.com');
    setCopied(true);
    toast.success('Link copied!');
    trackEvent('share_link_copied', { score: ideaScore });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(imageCaption);
    setCaptionCopied(true);
    toast.success('Caption copied!', {
      description: 'Paste it as your Instagram or LinkedIn post caption.',
    });
    trackEvent('share_caption_copied', { score: ideaScore });
    setTimeout(() => setCaptionCopied(false), 2000);
  };

  const handleSocialShare = (platform: string, url: string) => {
    trackEvent('share_social', { platform, score: ideaScore });
    window.open(url, '_blank', 'width=600,height=400');
  };

  const scoreColor = ideaScore >= 8
    ? 'text-emerald-500'
    : ideaScore >= 5
    ? 'text-amber-500'
    : 'text-destructive';

  const scoreLabel = ideaScore >= 8 ? 'Strong Opportunity' : ideaScore >= 5 ? 'Needs Work' : 'High Risk';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Analysis Complete!</h3>
          <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            You just saved ~$1,500 in consultant fees
          </p>
        </div>

        {/* Score Card */}
        <div className="p-4 rounded-xl bg-muted/50 border border-border mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Idea Score</p>
              <p className={cn('text-3xl font-black', scoreColor)}>
                {ideaScore}/10
              </p>
              <Badge variant="outline" className="text-xs mt-1">{scoreLabel}</Badge>
            </div>
            <div className="text-right space-y-1">
              <div>
                <p className="text-xs text-muted-foreground">Monthly Profit</p>
                <p className={cn('text-sm font-bold', profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                  ${profit.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Margin</p>
                <p className="text-sm font-bold text-foreground">{margin.toFixed(1)}%</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 truncate">{ideaName}</p>
        </div>

        {/* Share Buttons */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Share your results:</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => handleSocialShare('twitter',
                `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
              )}
            >
              <Twitter className="w-4 h-4" />
              Twitter/X
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => handleSocialShare('linkedin',
                `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
              )}
            >
              <Linkedin className="w-4 h-4" />
              LinkedIn
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => handleSocialShare('whatsapp',
                `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl || 'https://aiwmcquantis.com'}`)}`
              )}
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleCopyLink}
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>

          {/* Image Caption Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-dashed"
            onClick={handleCopyCaption}
          >
            {captionCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Image className="w-4 h-4" />}
            {captionCopied ? 'Caption Copied!' : 'Copy Instagram / LinkedIn Caption'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Pre-formatted with your metrics — ready to paste as a post
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          {onExportPDF && (
            <Button variant="outline" className="flex-1 gap-2" onClick={onExportPDF}>
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          )}
          <Button className="flex-1 gap-2" onClick={onClose}>
            <CheckCircle2 className="w-4 h-4" />
            View Full Results
          </Button>
        </div>
      </div>
    </div>
  );
}
