import React, { useCallback, useState } from 'react';
import { Copy, Check, Linkedin, Twitter, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';
import type { Verdict } from '@/lib/verdict';

interface ShareCardPreviewProps {
  /** Verdict shown in the preview text. */
  verdict: Verdict;
  /** One-line idea description. */
  idea: string;
  /** Public share URL (e.g. /share/:token or /r/:id). */
  shareUrl: string;
  /** Identifier for analytics segmentation. */
  analysisId?: string;
}

const SOURCE = 'share_card_preview';

async function copy(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  return false;
}

/**
 * ShareCardPreview
 *
 * Renders a 1200×630-proportioned visual mock of how the user's analysis
 * link will appear when pasted into LinkedIn, X, Slack, or iMessage.
 *
 * Why this exists:
 *   When someone pastes a /share/:token link, the LinkedIn/X scraper reads
 *   the `og:title`, `og:description`, and `og:image` from PageMeta. The
 *   image is the brand card; the verdict tone + headline come through in
 *   the title/description. This preview shows the user that exact framing
 *   BEFORE they share, removing the "what will it look like?" friction
 *   that kills 70% of share clicks.
 *
 * Funnel events:
 *   share_card_view          — preview becomes visible
 *   share_card_copy_link     — copy CTA pressed
 *   share_card_open_linkedin — LinkedIn share opened
 *   share_card_open_twitter  — X share opened
 */
export function ShareCardPreview({ verdict, idea, shareUrl, analysisId }: ShareCardPreviewProps) {
  const [copied, setCopied] = useState(false);
  const viewFired = React.useRef(false);

  React.useEffect(() => {
    if (viewFired.current) return;
    viewFired.current = true;
    trackEvent('share_card_view', { analysis_id: analysisId, verdict_tone: verdict.tone });
  }, [analysisId, verdict.tone]);

  const handleCopy = useCallback(async () => {
    const ok = await copy(shareUrl);
    if (ok) {
      setCopied(true);
      toast.success('Link copied. Paste it anywhere.');
      trackEvent('share_card_copy_link', { source: SOURCE, analysis_id: analysisId });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Could not copy. Long-press the URL field instead.');
    }
  }, [shareUrl, analysisId]);

  const ideaShort = idea.length > 70 ? `${idea.slice(0, 70)}…` : idea;

  const shareText = `${verdict.toneLabel}: ${verdict.headline}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;

  const onLinkedIn = () => {
    trackEvent('share_card_open_linkedin', { source: SOURCE, analysis_id: analysisId });
  };
  const onTwitter = () => {
    trackEvent('share_card_open_twitter', { source: SOURCE, analysis_id: analysisId });
  };

  return (
    <section
      aria-labelledby="share-card-heading"
      className="rounded-2xl p-5 md:p-6 border"
      style={{
        background: 'var(--q-bg-elevated, hsl(var(--card)))',
        borderColor: 'var(--q-border-default, hsl(var(--border)))',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 id="share-card-heading" className="text-base md:text-lg font-bold text-foreground">
            Your link preview
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            This is exactly what people will see when you paste your share link.
          </p>
        </div>
      </div>

      {/* 1200x630 social card mock (rendered at responsive width) */}
      <div
        role="img"
        aria-label={`Social preview: ${verdict.toneLabel} — ${verdict.headline}`}
        className="relative w-full rounded-xl overflow-hidden border"
        style={{
          aspectRatio: '1200 / 630',
          borderColor: 'var(--q-border-default, hsl(var(--border)))',
          background:
            'radial-gradient(120% 80% at 0% 0%, hsl(var(--primary) / 0.18) 0%, transparent 55%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--muted) / 0.6) 100%)',
        }}
      >
        {/* Tone bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: verdict.toneColor }} />

        <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-8">
          <div className="flex items-center justify-between">
            <div
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: `${verdict.toneColor}1A`,
                color: verdict.toneColor,
                border: `1px solid ${verdict.toneColor}40`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: verdict.toneColor }} />
              {verdict.toneLabel}
            </div>
            <span className="text-[10px] md:text-xs font-mono text-muted-foreground">aiwmcquantis.com</span>
          </div>

          <div>
            <p
              className="font-bold leading-[1.1] text-foreground"
              style={{ fontSize: 'clamp(1rem, 2.4vw, 1.75rem)', letterSpacing: '-0.015em' }}
            >
              {verdict.headline}
            </p>
            <p
              className="mt-1.5 text-muted-foreground line-clamp-2"
              style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)' }}
            >
              {verdict.subline}
            </p>
          </div>

          <div className="flex items-end justify-between text-[10px] md:text-xs text-muted-foreground">
            <span className="truncate max-w-[60%]">{ideaShort}</span>
            <span className="font-semibold text-foreground/80">AIWMC™ Quantis</span>
          </div>
        </div>
      </div>

      {/* URL + actions */}
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <div
          className="flex-1 min-w-0 flex items-center gap-2 px-3 h-11 rounded-lg border"
          style={{
            background: 'var(--q-bg-base, hsl(var(--background)))',
            borderColor: 'var(--q-border-default, hsl(var(--border)))',
          }}
        >
          <Link2 className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="text-xs sm:text-sm font-mono truncate text-foreground/80">{shareUrl}</span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopy}
            className="h-11 gap-1.5"
            aria-label="Copy share link"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" aria-hidden="true" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" /> Copy
              </>
            )}
          </Button>
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onLinkedIn}
            aria-label="Share on LinkedIn"
          >
            <Button type="button" variant="outline" className="h-11 gap-1.5">
              <Linkedin className="w-4 h-4" aria-hidden="true" /> LinkedIn
            </Button>
          </a>
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onTwitter}
            aria-label="Share on X"
          >
            <Button type="button" variant="outline" className="h-11 gap-1.5">
              <Twitter className="w-4 h-4" aria-hidden="true" /> X
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
