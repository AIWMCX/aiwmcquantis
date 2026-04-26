import React from 'react';
import { Lock, Zap, TrendingUp, Activity, FileText, Target, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentLinks } from '@/hooks/useStripeCheckout';
import { useNavigate } from 'react-router-dom';
import { UPGRADE_TRIGGERS } from '@/lib/tier-spec';

interface LockedAnalysisPaywallProps {
  /** What section is being gated — 'levers' (Step 2) or 'action-plan' (Step 3) */
  section: 'levers' | 'action-plan';
}

/**
 * Map gated dashboard sections → canonical Master Spec UPGRADE_TRIGGERS keys.
 *  - levers (Step 2: Monte Carlo / P&L / live assumptions) → free_returning_7d
 *  - action-plan (Step 3: prioritized fix-list, PDF, mitigation) → locked_document_studio
 */
const SECTION_TRIGGER: Record<LockedAnalysisPaywallProps['section'], keyof typeof UPGRADE_TRIGGERS> = {
  levers: 'free_returning_7d',
  'action-plan': 'locked_document_studio',
};

/**
 * LockedAnalysisPaywall — Aggressive monetization gate for free users.
 *
 * Strategy: Free users see Step 1 (score + 3 risks + basic metrics) — ~40% of value.
 * Steps 2 and 3 (Monte Carlo, P&L, levers, action plan) are blurred behind this paywall.
 *
 * The user has already invested time + seen perceived value. This is the high-intent
 * monetization moment — every word here is a conversion lever.
 */
export function LockedAnalysisPaywall({ section }: LockedAnalysisPaywallProps) {
  const { user, isAuthenticated } = useAuth();
  const { redirectToPayment, isLoading } = usePaymentLinks();
  const navigate = useNavigate();

  const handleUpgrade = () => {
    if (isAuthenticated && user) {
      redirectToPayment('plus_monthly', user.id, user.email || undefined);
    } else {
      navigate('/auth?redirect=/pricing&intent=plus');
    }
  };

  // Spec-canonical headline + body + CTA from §10 UPGRADE_TRIGGERS,
  // paired with section-specific gated-feature bullets.
  const trigger = UPGRADE_TRIGGERS[SECTION_TRIGGER[section]];
  const config = section === 'levers'
    ? {
        gatedItems: [
          { icon: TrendingUp, label: '36-Month Revenue Projection', desc: 'Pessimistic / Base / Optimistic scenarios' },
          { icon: Activity, label: 'Live Assumption Editor', desc: 'Stress-test CAC, churn, rent, ticket size' },
          { icon: FileText, label: 'Full P&L + Unit Economics', desc: 'Gross margin, contribution margin, breakeven curve' },
        ],
      }
    : {
        gatedItems: [
          { icon: Target, label: 'Prioritized Action Plan', desc: 'Critical / This Week / This Month — sequenced for execution' },
          { icon: CheckCircle2, label: 'Risk Mitigation Tactics', desc: 'Step-by-step fixes for every red flag, with effort + cost' },
          { icon: FileText, label: 'PDF Export', desc: 'Investor-ready 12-page report with your branding' },
        ],
      };

  return (
    <div className="relative my-6 overflow-hidden rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/8 via-background to-primary/12 shadow-[0_0_60px_rgba(59,130,246,0.08)]">
      {/* Top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-primary via-primary/60 to-primary" />

      <div className="grid lg:grid-cols-[1fr_auto] gap-6 p-6 sm:p-8">
        {/* LEFT: Headline + gated items list */}
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary/80">
                Plus members only
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {trigger.headline}
              </h3>
            </div>
          </div>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
            {trigger.body}
          </p>

          {/* Gated items grid */}
          <ul className="space-y-2.5">
            {config.gatedItems.map((item) => (
              <li
                key={item.label}
                className="flex items-start gap-3 p-3 rounded-lg bg-background/40 border border-border/60 backdrop-blur-sm"
              >
                <item.icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <Lock className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-1" />
              </li>
            ))}
          </ul>

          {/* Pain-anchored value line */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-foreground/90 leading-relaxed">
              <span className="font-semibold">$17/mo</span> = $0.56/day. One Plus analysis surfaces the fatal assumption that would have cost you $25,000+ on the wrong idea.
            </p>
          </div>
        </div>

        {/* RIGHT: CTA stack */}
        <div className="flex flex-col items-stretch lg:items-end justify-center gap-3 lg:min-w-[220px]">
          <div className="text-right">
            <p className="text-3xl font-black text-foreground leading-none">
              $17<span className="text-base font-medium text-muted-foreground">/mo</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">14-day free trial · cancel anytime</p>
          </div>

          <Button
            onClick={handleUpgrade}
            disabled={isLoading}
            size="lg"
            className="gap-2 font-semibold shadow-lg shadow-primary/20 w-full lg:w-auto"
          >
            <Zap className="w-4 h-4" />
            {isLoading ? 'Loading…' : trigger.cta}
          </Button>

          <p className="text-[10px] text-muted-foreground/80 text-center lg:text-right max-w-[220px]">
            vs. $350/hr for a financial consultant<br />
            vs. $89/mo for generic AI tools
          </p>
        </div>
      </div>

      {/* Faint trust strip */}
      <div className="border-t border-border/50 bg-background/30 px-6 py-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[10px] text-muted-foreground/80">
        <span>✓ 95,500 benchmarks</span>
        <span>✓ Monte Carlo simulations</span>
        <span>✓ PDF export</span>
        <span>✓ Unlimited analyses</span>
      </div>
    </div>
  );
}
