import React from 'react';
import { Lock, Zap, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { usePaymentLinks } from '@/hooks/useStripeCheckout';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { UPGRADE_TRIGGERS } from '@/lib/tier-spec';

interface PlusGateProps {
  /** The module being gated */
  module: 'pre-mortem' | 'invoices' | 'docs';
  /** Children render only when user is on Plus (or while subscription is still loading) */
  children: React.ReactNode;
}

/**
 * Map gated modules → canonical UPGRADE_TRIGGERS keys (Master Spec §10).
 * The trigger drives the headline + CTA; module-specific bullets stay local
 * since the spec deliberately keeps the trigger library copy-tight.
 */
const MODULE_TO_TRIGGER: Record<PlusGateProps['module'], keyof typeof UPGRADE_TRIGGERS> = {
  'pre-mortem': 'locked_premortem',
  invoices: 'locked_premortem', // capacity-check fits the same Plus-unlock motion
  docs: 'locked_document_studio',
};

/**
 * Module-local bullets — these intentionally extend the spec UPGRADE_TRIGGER
 * with concrete deliverables for each module. Headline / CTA come from spec.
 */
const MODULE_BULLETS: Record<PlusGateProps['module'], {
  question: string;
  bullets: string[];
}> = {
  'pre-mortem': {
    question: '“Where will this business break if conditions change?”',
    bullets: [
      'Monte Carlo collapse scenarios (P10 / P50 / P90)',
      'Customer concentration & churn shock simulator',
      'Cash runway under 6 stress conditions',
      'Failure-mode ranking with mitigation playbook',
      'Comparison: your numbers vs. industry survival rate',
    ],
  },
  invoices: {
    question: '“Can I actually deliver this profitably?”',
    bullets: [
      'Branded invoice generator (PDF export)',
      'Capacity vs. utilization analysis',
      'Project profitability calculator (margin, hours, opportunity cost)',
      'Cash-flow timing: when does this deal hurt vs. help?',
      'Client concentration risk warnings',
    ],
  },
  docs: {
    question: '“How do I package this for investors / partners / banks?”',
    bullets: [
      '12+ professional templates (BI report, pre-mortem, pitch data, exec memo)',
      'Auto-populated from your analysis — zero re-typing',
      'Branded PDF export with your logo & colors',
      'Editable, versioned, shareable via private link',
      'Replaces $1,500 consultant-built decks',
    ],
  },
};

/**
 * PlusGate — Hard paywall wrapper for premium routes.
 *
 * Usage:
 *   <PlusGate module="pre-mortem"><PreMortemPage /></PlusGate>
 *
 * Free users see a full-page conversion screen (no preview of the underlying UI).
 * Plus users pass through transparently. While subscription is loading we render
 * children (cheap optimistic) — useSubscription has its own 5s timeout fallback.
 */
export function PlusGate({ module, children }: PlusGateProps) {
  const { isPlus, loading } = useSubscription();
  const { user, isAuthenticated } = useAuth();
  const { redirectToPayment, isLoading: payLoading } = usePaymentLinks();
  const navigate = useNavigate();

  // Optimistic render: if subscription is still resolving, show children to avoid
  // a paywall flash for paying users. The subscription hook has a 5s safety timeout.
  if (loading || isPlus) {
    return <>{children}</>;
  }

  const copy = COPY[module];

  const handleUpgrade = () => {
    if (isAuthenticated && user) {
      redirectToPayment('plus_monthly', user.id, user.email || undefined);
    } else {
      navigate(`/auth?redirect=/pricing&intent=plus`);
    }
  };

  return (
    <AppLayout title={copy.eyebrow}>
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-10 bg-[var(--q-bg-base)]">
        <div className="w-full max-w-3xl">
          {/* Back link */}
          <button
            onClick={() => navigate('/app')}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to dashboard
          </button>

          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-background to-primary/10 shadow-[0_0_80px_rgba(59,130,246,0.10)]">
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/60 to-primary" />

            <div className="p-6 sm:p-10 space-y-8">
              {/* Eyebrow */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary/80">
                    {copy.eyebrow}
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight mt-1">
                    {copy.title}
                  </h1>
                </div>
              </div>

              {/* Subtitle */}
              <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
                {copy.subtitle}
              </p>

              {/* The question this module answers */}
              <div className="border-l-2 border-primary/40 pl-4 py-1">
                <p className="text-[10px] uppercase tracking-wider text-primary/70 font-semibold mb-1">
                  This module answers
                </p>
                <p className="text-lg font-semibold text-foreground italic">{copy.question}</p>
              </div>

              {/* What's inside */}
              <div className="space-y-2.5">
                {copy.bullets.map((b) => (
                  <div
                    key={b}
                    className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/60"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <p className="text-sm text-foreground/90">{b}</p>
                  </div>
                ))}
              </div>

              {/* Pricing + CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pt-4 border-t border-border/50">
                <div>
                  <p className="text-3xl font-black text-foreground leading-none">
                    $17<span className="text-base font-medium text-muted-foreground">/mo</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Unlimited analyses · Pre-Mortem · Invoices · Docs · PDF · Cancel anytime
                  </p>
                </div>

                <Button
                  onClick={handleUpgrade}
                  disabled={payLoading}
                  size="lg"
                  className="gap-2 font-semibold shadow-lg shadow-primary/20 w-full sm:w-auto"
                >
                  <Zap className="w-4 h-4" />
                  {payLoading ? 'Loading…' : 'Unlock Plus — Start Free Trial'}
                </Button>
              </div>

              {/* Anchor */}
              <p className="text-[11px] text-muted-foreground/80 text-center">
                vs. $25,000 you risk losing on the wrong assumption · vs. $350/hr for a financial consultant
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
