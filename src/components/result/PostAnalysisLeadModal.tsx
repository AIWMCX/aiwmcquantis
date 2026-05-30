import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { CheckCircle2, Loader2, Mail, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLeadCapture } from '@/hooks/useLeadCapture';
import { trackEvent } from '@/lib/analytics';
import type { Verdict } from '@/lib/verdict';

/**
 * PostAnalysisLeadModal
 *
 * Single-field email capture shown to anonymous users after they've seen
 * their analysis verdict for 12s, or when they exit-intent the page.
 *
 * Why a separate component (not the existing PopupManager):
 * - Trigger is page-local (verdict visible), not global scroll/time.
 * - Copy + offer are tailored to the verdict tone.
 * - Tracks its own `post_analysis_modal_*` funnel events for the
 *   conversion-by-source dashboard.
 *
 * Funnel events emitted:
 *   post_analysis_modal_view
 *   post_analysis_modal_submit_attempt
 *   post_analysis_modal_submit_success
 *   post_analysis_modal_submit_invalid
 *   post_analysis_modal_dismiss
 */

const EmailSchema = z
  .string()
  .trim()
  .min(1, { message: 'Email is required.' })
  .max(255, { message: 'Email is too long.' })
  .email({ message: 'Enter a valid email.' });

interface PostAnalysisLeadModalProps {
  analysisId: string;
  verdict: Verdict;
  /** Required so the modal only appears for anonymous users. */
  isAuthenticated: boolean;
  /** Delay (ms) after verdict mount before auto-opening. Default 12s. */
  autoOpenDelayMs?: number;
}

const STORAGE_KEY_LAST_SEEN = 'quantis_post_analysis_modal_last_seen';
const SHOW_AGAIN_AFTER_MS = 72 * 60 * 60 * 1000; // 3 days

function recentlyDismissed(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY_LAST_SEEN);
    if (!v) return false;
    return Date.now() - Number(v) < SHOW_AGAIN_AFTER_MS;
  } catch {
    return false;
  }
}

function markDismissedNow(): void {
  try {
    localStorage.setItem(STORAGE_KEY_LAST_SEEN, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function PostAnalysisLeadModal({
  analysisId,
  verdict,
  isAuthenticated,
  autoOpenDelayMs = 12_000,
}: PostAnalysisLeadModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const submitInFlight = useRef(false);
  const viewFired = useRef(false);
  const openTriggerRef = useRef<'auto' | 'exit_intent' | null>(null);

  const { captureLead, isSubmitting, isSuccess } = useLeadCapture({
    source: 'post_analysis_modal',
    offer: 'free_analysis',
  });

  // 1. Auto-open after delay (anonymous only, respects 3-day suppression)
  useEffect(() => {
    if (isAuthenticated) return;
    if (recentlyDismissed()) return;
    const t = setTimeout(() => {
      openTriggerRef.current = 'auto';
      setOpen(true);
    }, autoOpenDelayMs);
    return () => clearTimeout(t);
  }, [isAuthenticated, autoOpenDelayMs]);

  // 2. Exit-intent trigger (desktop only — mouseleave to top of viewport)
  useEffect(() => {
    if (isAuthenticated) return;
    if (recentlyDismissed()) return;
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !open) {
        openTriggerRef.current = 'exit_intent';
        setOpen(true);
      }
    };
    document.addEventListener('mouseleave', onMouseLeave);
    return () => document.removeEventListener('mouseleave', onMouseLeave);
  }, [isAuthenticated, open]);

  // 3. Fire view event once per render lifecycle
  useEffect(() => {
    if (open && !viewFired.current) {
      viewFired.current = true;
      trackEvent('post_analysis_modal_view', {
        analysis_id: analysisId,
        verdict_tone: verdict.tone,
        trigger: openTriggerRef.current ?? 'manual',
      });
    }
  }, [open, analysisId, verdict.tone]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && open && !isSuccess) {
        markDismissedNow();
        trackEvent('post_analysis_modal_dismiss', {
          analysis_id: analysisId,
          had_email: email.trim().length > 0,
          trigger: openTriggerRef.current ?? 'manual',
        });
      }
      setOpen(next);
    },
    [open, isSuccess, analysisId, email],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitInFlight.current || isSubmitting) return;

      const parsed = EmailSchema.safeParse(email);
      if (!parsed.success) {
        setValidationError(parsed.error.issues[0]?.message ?? 'Invalid email');
        trackEvent('post_analysis_modal_submit_invalid', {
          analysis_id: analysisId,
          reason: parsed.error.issues[0]?.code ?? 'parse_error',
        });
        return;
      }
      setValidationError(null);

      submitInFlight.current = true;
      const domain = parsed.data.split('@')[1] ?? null;
      trackEvent('post_analysis_modal_submit_attempt', {
        analysis_id: analysisId,
        email_domain: domain,
      });

      try {
        const result = await captureLead(parsed.data, {
          analysis_id: analysisId,
          verdict_tone: verdict.tone,
          trigger: openTriggerRef.current ?? 'manual',
        });
        if (result.success) {
          trackEvent('post_analysis_modal_submit_success', {
            analysis_id: analysisId,
            email_domain: domain,
          });
          // Stash for /auth flow so we can auto-claim and skip re-typing email
          try {
            localStorage.setItem('quantis_claim_analysis_id', analysisId);
            localStorage.setItem('quantis_prefill_email', parsed.data);
          } catch {
            /* ignore */
          }
        }
      } finally {
        submitInFlight.current = false;
      }
    },
    [email, isSubmitting, captureLead, analysisId, verdict.tone],
  );

  // Render nothing for authenticated users — they already have an account.
  if (isAuthenticated) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {isSuccess ? (
          <div className="py-2 text-center space-y-3">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" aria-hidden="true" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-center">Saved. Check your inbox.</DialogTitle>
              <DialogDescription className="text-center">
                We sent you a link to keep this analysis, edit assumptions, and run unlimited stress-tests — free.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center">
              <Button onClick={() => setOpen(false)} className="min-h-[44px]">
                Got it
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div
                className="inline-flex w-fit items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2"
                style={{
                  background: `${verdict.toneColor}1A`,
                  color: verdict.toneColor,
                  border: `1px solid ${verdict.toneColor}40`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: verdict.toneColor }} />
                Your verdict: {verdict.toneLabel}
              </div>
              <DialogTitle className="text-xl leading-tight">
                Don't lose this analysis.
              </DialogTitle>
              <DialogDescription className="pt-1">
                This page disappears when you close the tab. Drop your email — we'll send a private link so you can
                come back, edit your assumptions, and run unlimited stress-tests. Free.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="post-analysis-email" className="sr-only">
                  Email address
                </Label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="post-analysis-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    disabled={isSubmitting}
                    aria-invalid={validationError ? 'true' : 'false'}
                    aria-describedby={validationError ? 'post-analysis-email-error' : 'post-analysis-email-help'}
                    className="h-12 pl-9 text-base"
                    maxLength={255}
                    required
                  />
                </div>
                {validationError ? (
                  <p
                    id="post-analysis-email-error"
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    {validationError}
                  </p>
                ) : (
                  <p id="post-analysis-email-help" className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <Lock className="w-3 h-3" aria-hidden="true" />
                    No spam. We'll only email you about this analysis.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="w-full h-12 text-base font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Sending link…
                  </>
                ) : (
                  <>Save my analysis — free</>
                )}
              </Button>

              <p className="text-[11px] text-center text-muted-foreground">
                By continuing you agree to receive a transactional email with your saved link.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
