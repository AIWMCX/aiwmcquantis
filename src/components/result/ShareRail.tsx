import React, { useState } from 'react';
import { Share2, Copy, Check, Save, Link2, MessageCircle, Twitter, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';

interface ShareRailProps {
  /** Canonical URL to share. Defaults to current location.href. */
  url?: string;
  /** Headline / verdict used as share title + tweet text. */
  title: string;
  /** Whether to show the "Save free" CTA (anonymous only). */
  showSave?: boolean;
  /** Called when user clicks Save. */
  onSave?: () => void;
  /** Called when user wants to create a permanent share link (signed-in). */
  onCreateShareLink?: () => void | Promise<void>;
  isCreatingShareLink?: boolean;
  /** Identifier for analytics segmentation (e.g. analysis id). */
  analysisId?: string;
  /** Auth state for analytics segmentation. */
  isAuthenticated?: boolean;
  className?: string;
}

const SOURCE = 'share_rail';

function hasNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  // Legacy fallback
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function ShareRail({
  url,
  title,
  showSave,
  onSave,
  onCreateShareLink,
  isCreatingShareLink,
  analysisId,
  isAuthenticated,
  className,
}: ShareRailProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '');

  const baseEventProps = {
    source: SOURCE,
    analysis_id: analysisId,
    auth_state: isAuthenticated ? 'authenticated' : 'anonymous',
  } as const;

  // An anonymous report lives only in this browser (local cache, no saved
  // row), so its URL shows "Analysis not found" to anyone it is sent to.
  // Instead of handing out a dead link, ask them to save it first; saving
  // unlocks "Create share link", which does open for others.
  const gateAnonymous = (channel: string): boolean => {
    if (isAuthenticated) return false;
    trackEvent('share_gated', { ...baseEventProps, channel });
    toast.info('Save this report free to share it', {
      description: 'Right now it only exists in this browser. After saving you can create a link anyone can open.',
      action: onSave ? { label: 'Save free', onClick: () => onSave() } : undefined,
    });
    return true;
  };

  const handleNativeShare = async () => {
    if (gateAnonymous('native')) return;
    trackEvent('share_click', { ...baseEventProps, channel: 'native' });
    try {
      await navigator.share({ title: 'Quantis verdict', text: title, url: shareUrl });
      trackEvent('share_completed', { ...baseEventProps, channel: 'native' });
    } catch (err) {
      // User cancelled or unsupported. Don't toast on AbortError.
      const name = (err as { name?: string } | null)?.name;
      if (name && name !== 'AbortError') {
        toast.error('Could not open share sheet');
      }
    }
  };

  const handleCopy = async () => {
    if (gateAnonymous('copy')) return;
    trackEvent('copy_link', { ...baseEventProps });
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success('Link copied');
      trackEvent('copy_link_completed', { ...baseEventProps });
    } else {
      toast.error('Could not copy link');
    }
  };

  const handleSave = () => {
    trackEvent('save_click', { ...baseEventProps });
    onSave?.();
  };

  const handleCreateShareLink = async () => {
    trackEvent('share_click', { ...baseEventProps, channel: 'permalink' });
    await onCreateShareLink?.();
    trackEvent('share_completed', { ...baseEventProps, channel: 'permalink' });
  };

  const openIntent = (channel: 'twitter' | 'linkedin' | 'whatsapp') => {
    if (gateAnonymous(channel)) return;
    trackEvent('share_click', { ...baseEventProps, channel });
    const enc = encodeURIComponent;
    let intent = '';
    if (channel === 'twitter') {
      intent = `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(shareUrl)}`;
    } else if (channel === 'linkedin') {
      intent = `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`;
    } else {
      intent = `https://wa.me/?text=${enc(`${title} ${shareUrl}`)}`;
    }
    window.open(intent, '_blank', 'noopener,noreferrer');
  };

  // Mobile-friendly: if native share is available, surface it as the primary
  // share button. Otherwise show a dropdown with channel intents.
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={handleCopy}
        aria-label="Copy link"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy link'}</span>
      </Button>

      {hasNativeShare() ? (
        <Button variant="outline" size="sm" className="gap-2" onClick={handleNativeShare}>
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {isAuthenticated && onCreateShareLink && (
              <>
                <DropdownMenuItem onClick={handleCreateShareLink} disabled={isCreatingShareLink}>
                  <Link2 className="w-4 h-4 mr-2" />
                  Create share link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => openIntent('twitter')}>
              <Twitter className="w-4 h-4 mr-2" />
              Share on X
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openIntent('linkedin')}>
              <Linkedin className="w-4 h-4 mr-2" />
              Share on LinkedIn
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openIntent('whatsapp')}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Share on WhatsApp
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              Copy link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {showSave && (
        <Button size="sm" className="gap-2" onClick={handleSave}>
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">Save free</span>
          <span className="sm:hidden">Save</span>
        </Button>
      )}
    </div>
  );
}
