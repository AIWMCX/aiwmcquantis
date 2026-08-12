import React, { useState } from 'react';
import { CheckCircle2, Loader2, ArrowRight, ShieldCheck, FileText, TrendingDown, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageSEO } from '@/components/seo/PageSEO';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';
import { useLeadCapture } from '@/hooks/useLeadCapture';
import { trackEvent } from '@/lib/analytics';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

/**
 * Quantis Decision Validation Sprint — the $149 founding-price,
 * manually-fulfilled offer (see docs/DECISION_VALIDATION_SPRINT_OFFER_2026-08-11.md).
 *
 * Deliberately NOT a checkout page. Fulfillment is manual (a real person
 * reviews the numbers and delivers the report), so this page's only job
 * is to qualify interest and capture a request -- the founder follows up
 * personally with scope confirmation and a payment link/invoice. No
 * price is charged here, no Stripe integration on this page, and no
 * claim beyond what docs/DECISION_VALIDATION_SPRINT_OFFER_2026-08-11.md's
 * own promise boundary allows (no profit/demand/funding/predictive-
 * accuracy claims -- see that file's "Promise boundary" section).
 */

const DELIVERABLES = [
  '20-minute structured intake',
  'Business-model / archetype fit check',
  'Assumption ledger with origin labels — what you told us vs. what we assumed',
  'Base / downside / upside analysis',
  'Break-even, runway, payback, and key unit economics where the model supports them',
  'Top five decision risks',
  'Human numeric-integrity review before delivery',
  'PDF / shareable report',
  '30-minute explanation and decision call',
  'Seven-day factual/formula correction window',
];

const GOOD_FIT = [
  'A pricing, launch, lease/location, hiring, or continued-funding decision inside the next 30 days',
  'A pre-revenue or early-revenue business — not an enterprise or highly regulated model',
  'You want the assumptions and scenario math structured and checkable, not a spreadsheet rebuild',
];

export default function DecisionValidationSprint() {
  const [email, setEmail] = useState('');
  const [decision, setDecision] = useState('');
  const { captureLead, isSubmitting, isSuccess } = useLeadCapture({
    source: 'sprint_page',
    offer: 'decision_sprint',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent('sprint_request_attempted', { email_domain: email.split('@')[1] });
    const result = await captureLead(email, decision ? { decision_summary: decision.slice(0, 500) } : undefined);
    if (result.success) {
      trackEvent('sprint_request_submitted');
    }
  };

  return (
    <PublicPageShell backTo={{ href: '/', label: 'Back to home' }} maxWidth="md">
      <PageSEO
        title="Decision Validation Sprint — $149 Founding Price — AIWMC Quantis"
        description="A bounded, human-reviewed financial stress test of one real business decision. Assumption ledger, base/downside/upside scenarios, top five risks. $149 founding price, 48-hour target."
        canonical="/decision-validation-sprint"
      />

      <section className="aiwmc-section-wash py-12 md:py-16">
        <SectionHeader
          eyebrow="Founding Offer — First Five Buyers"
          title="Quantis Decision Validation Sprint"
          subtitle="A bounded, human-reviewed stress test of one real decision — not another AI report. $149 one time, 48-hour target for supported cases."
          align="left"
        />
      </section>

      <section className="space-y-8 pb-16">
        {/* What you're buying */}
        <GlassCard glow="indigo" className="p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>What you're buying</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Not "access to AI." A bounded review of one real near-term decision: which assumptions it depends on,
            which are most fragile, what happens in downside/base/upside cases, and what to verify before
            committing money.
          </p>
        </GlassCard>

        {/* Deliverables */}
        <GlassCard glow="violet" className="p-6 md:p-8 space-y-4" revealDelay={60}>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Deliverables</h3>
          </div>
          <ul className="space-y-2">
            {DELIVERABLES.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </GlassCard>

        {/* Good fit */}
        <GlassCard glow="cyan" className="p-6 md:p-8 space-y-4" revealDelay={120}>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>This is a good fit if</h3>
          </div>
          <ul className="space-y-2">
            {GOOD_FIT.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </GlassCard>

        {/* Promise boundary — honest, not a sales-copy afterthought */}
        <GlassCard glow="none" className="p-6 md:p-8" revealDelay={180}>
          <p className="text-xs uppercase tracking-[0.14em] mb-2" style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}>
            What this is — and isn't
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We promise completeness, internal consistency, transparent assumptions, and correction of genuine
            scope/formula errors within seven days. We do not promise profit, demand, funding, investment return,
            or predictive accuracy — nobody honestly can.
          </p>
        </GlassCard>

        {/* Request form */}
        <GlassCard glow="brand" className="p-6 md:p-8 space-y-6" revealDelay={240}>
          <div className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
            <h3 className="text-lg font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Request the sprint</h3>
          </div>

          {isSuccess ? (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mb-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Request received</p>
              <p className="text-sm text-muted-foreground mt-1">
                Expect a reply within one business day to confirm scope and send the payment link.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="sprint-decision" className="text-xs uppercase tracking-[0.1em] text-muted-foreground mb-1.5 block">
                  What decision are you making? (optional, helps us scope faster)
                </label>
                <Textarea
                  id="sprint-decision"
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  placeholder="e.g. Deciding whether to open a second location by Q4, or whether current pricing supports hiring one more person."
                  rows={3}
                  disabled={isSubmitting}
                  style={{
                    background: 'rgba(12,16,32,0.55)',
                    border: '1px solid rgba(148,163,255,0.18)',
                    color: 'hsl(var(--foreground))',
                  }}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="h-12 flex-1"
                  style={{
                    background: 'rgba(12,16,32,0.55)',
                    border: '1px solid rgba(148,163,255,0.18)',
                    color: 'hsl(var(--foreground))',
                  }}
                  disabled={isSubmitting}
                  required
                />
                <Button type="submit" size="lg" className="h-12 px-6 gap-2 shrink-0" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Request the sprint
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This is a request, not a payment — we confirm scope and fit before sending a payment link.
                $149 founding price for the first five buyers.
              </p>
            </form>
          )}
        </GlassCard>
      </section>
    </PublicPageShell>
  );
}
