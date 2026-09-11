import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, ArrowRight, Mail, CheckCircle2, Lock, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useLeadCapture } from '@/hooks/useLeadCapture';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

interface PostAnalysisAuthPromptProps {
  /** id of the just-completed analysis, so we can return the visitor to it after auth */
  analysisId?: string | null;
  ideaTitle?: string;
  monthlyProfit?: string;
  onDismiss: () => void;
}

/**
 * PostAnalysisAuthPrompt — the value-first conversion moment.
 *
 * Shown to UNAUTHENTICATED visitors immediately after their first free analysis
 * completes. The full result stays visible above this card (decision: "see full
 * result, then gate"); this is the prompt to turn that aha-moment into an account.
 *
 * Primary action: create a free account / sign in. On sign-in, useAuth claims the
 * anonymous analysis (claim_anonymous_analysis) using the quantis_claim_analysis_id
 * that useAnalysis stored — so the visitor keeps this exact result in their history.
 *
 * Secondary action: for visitors not ready to sign up, a lightweight "email me the
 * results" lead-capture (same as the legacy PostAnalysisEmailCapture).
 */
export function PostAnalysisAuthPrompt({
  analysisId,
  ideaTitle,
  monthlyProfit,
  onDismiss,
}: PostAnalysisAuthPromptProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');

  const { captureLead, isSubmitting, isSuccess } = useLeadCapture({
    source: 'scroll_popup',
    offer: 'free_analysis',
  });

  useEffect(() => {
    if (isAuthenticated) return;
    if (sessionStorage.getItem('quantis_post_analysis_dismissed')) return;
    const t = setTimeout(() => {
      setIsVisible(true);
      trackEvent('post_analysis_auth_prompt_shown', { has_analysis_id: !!analysisId });
    }, 400);
    return () => clearTimeout(t);
  }, [isAuthenticated, analysisId]);

  if (isAuthenticated || !isVisible) return null;

  // After auth, send the visitor back to their saved result (claim makes it theirs);
  // fall back to the dashboard if we somehow don't have an id yet.
  const returnUrl = analysisId ? `/r/${analysisId}` : '/app';
  const goToAuth = (mode: 'signup' | 'signin') => {
    trackEvent('post_analysis_auth_click', { mode });
    navigate(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    await captureLead(email, {
      trigger: 'post_analysis',
      idea_title: ideaTitle,
      monthly_profit: monthlyProfit,
    });
  };

  const handleDismiss = () => {
    sessionStorage.setItem('quantis_post_analysis_dismissed', 'true');
    setIsVisible(false);
    onDismiss();
  };

  if (isSuccess) {
    return (
      <div className="mt-6 rounded-xl border-2 border-primary/30 bg-primary/5 p-6 text-center animate-fade-in">
        <CheckCircle2 className="w-8 h-8 text-primary mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">Check your inbox 🎉</h3>
        <p className="text-sm text-muted-foreground">
          We've emailed your analysis summary and a link to reload these results anytime.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'mt-6 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-6 relative animate-fade-in',
        'shadow-lg shadow-primary/5'
      )}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-foreground/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>

      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground mb-1">
            Save this analysis — create your free account
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {monthlyProfit
              ? `Your idea projects ${monthlyProfit}/mo. Create a free account to keep the complete result and receive five Decision Runs each month.`
              : 'Create a free account to keep this complete result and receive five Decision Runs each month.'}
          </p>

          {/* Benefit row */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> This analysis saved to your history
            </span>
            <span className="inline-flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5 text-primary" /> Analysis + pre-mortem + scenarios
            </span>
            <span className="inline-flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-primary" /> Free — no credit card
            </span>
          </div>

          {/* Primary auth CTAs */}
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <Button onClick={() => goToAuth('signup')} className="gap-2 h-11 px-6 whitespace-nowrap">
              Create free account
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => goToAuth('signin')}
              className="h-11 px-6 whitespace-nowrap"
            >
              I already have an account
            </Button>
          </div>

          {/* Secondary: email-only path for visitors not ready to sign up */}
          {!showEmail ? (
            <button
              onClick={() => setShowEmail(true)}
              className="mt-3 text-xs text-muted-foreground/80 underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Not ready? Just email me the results
            </button>
          ) : (
            <form onSubmit={handleEmail} className="mt-3 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  required
                  autoComplete="email"
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                disabled={isSubmitting || !email.includes('@')}
                className="gap-2 h-11 px-6 whitespace-nowrap"
              >
                {isSubmitting ? 'Saving...' : 'Email it'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
