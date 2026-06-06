import React from 'react';
import { Button } from '@/components/ui/button';
import { Twitter, Linkedin, Mail, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';

interface SocialShareButtonsProps {
  shareUrl: string;
  title?: string;
  description?: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  showLabels?: boolean;
}

export const SocialShareButtons = React.memo(function SocialShareButtons({
  shareUrl,
  title = 'AIWMC Quantis - AI Business Analysis',
  description = 'Get complete business analysis in 2 minutes with AI-powered financial projections and market insights.',
  className,
  size = 'default',
  showLabels = false,
}: SocialShareButtonsProps) {
  const handleTwitterShare = () => {
    const text = `${title} - ${description}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer,width=550,height=420'
    );
    trackEvent('social_share_twitter', { url: shareUrl });
  };

  const handleLinkedInShare = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer,width=550,height=420'
    );
    trackEvent('social_share_linkedin', { url: shareUrl });
  };

  const handleEmailShare = () => {
    const subject = title;
    const body = `${description}\n\nCheck it out: ${shareUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    trackEvent('social_share_email', { url: shareUrl });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
      trackEvent('social_share_copy', { url: shareUrl });
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const buttonSize = size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10';
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  const buttons = [
    {
      name: 'Twitter',
      icon: Twitter,
      onClick: handleTwitterShare,
      hoverClass: 'hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] hover:border-[#1DA1F2]',
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      onClick: handleLinkedInShare,
      hoverClass: 'hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] hover:border-[#0A66C2]',
    },
    {
      name: 'Email',
      icon: Mail,
      onClick: handleEmailShare,
      hoverClass: 'hover:bg-primary/10 hover:text-primary hover:border-primary',
    },
    {
      name: 'Copy Link',
      icon: Link2,
      onClick: handleCopyLink,
      hoverClass: 'hover:bg-muted hover:text-foreground',
    },
  ];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {buttons.map((button) => (
        <Button
          key={button.name}
          variant="outline"
          size="icon"
          onClick={button.onClick}
          className={cn(
            buttonSize,
            'transition-all duration-200',
            button.hoverClass
          )}
          aria-label={button.name}
        >
          <button.icon className={iconSize} />
        </Button>
      ))}
      
      {showLabels && (
        <span className="text-xs text-muted-foreground ml-2">
          Share to earn rewards
        </span>
      )}
    </div>
  );
});
