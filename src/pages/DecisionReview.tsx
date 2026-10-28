import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Clock3, FileCheck2, Mail, PlayCircle, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';
import { StructuredData } from '@/components/seo/StructuredData';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';
import { supabase } from '@/integrations/supabase/client';
import { recordFunnelEvent, trackEvent } from '@/lib/analytics';
import { ENGAGEMENT_OFFERS, type EngagementOfferCode } from '@/config/engagement-offers';

type OfferCode = EngagementOfferCode;

const OFFER_ICON: Record<OfferCode, typeof FileCheck2> = {
  founder_decision_review: FileCheck2,
  consultant_founding_pilot: Users,
};

const OFFERS = ENGAGEMENT_OFFERS.map((offer) => ({ ...offer, icon: OFFER_ICON[offer.code] }));
const SCHEMA_SERVICES = ENGAGEMENT_OFFERS.map((offer) => offer.code);

/** Mirrors the fields of EngagementIntake.tsx (register #92); guarded by decision-review-intake-preview.test.ts. */
const INTAKE_PREVIEW = {
  required: [
    'Your business or company name',
    'The decision that must be made',
    'A contact email (pre-filled from your Stripe receipt)',
    'For the $499 pilot only: your primary client type',
  ],
  optional: [
    'Industry and website',
    'Decision deadline',
    'Current situation and financial context (revenue, costs, cash)',
    'Known constraints and assumptions you are already making',
    'What has already been tried, and the outcome you want',
    'Specific questions you want reviewed',
  ],
} as const;

export default function DecisionReview() {
  const [loading, setLoading] = useState<OfferCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Funnel sink as well as GA4, so /admin/funnel sees paid-offer views.
    recordFunnelEvent('paid_review_view', { surface: 'decision_review_page' });
  }, []);

  async function startCheckout(offerCode: OfferCode) {
    setLoading(offerCode);
    setError(null);
    recordFunnelEvent('paid_checkout_start', { offer_code: offerCode, surface: 'decision_review_page' });
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('engagement-checkout', {
        body: { offer_code: offerCode },
      });
      if (invokeError || !data?.url || typeof data.url !== 'string') throw invokeError ?? new Error('No checkout URL');
      window.location.assign(data.url);
    } catch {
      setError('Checkout is temporarily unavailable. Please email support@aiwmcquantis.com and we will reserve the same offer manually.');
      setLoading(null);
    }
  }

  return (
    <PublicPageShell active="pricing" backTo={{ href: '/', label: 'Back to home' }} maxWidth="lg">
      <PageSEO
        title="Founder Decision Review & Consultant Pilot — AIWMC Quantis"
        description={`Founder-assisted decision reviews with reconciled scenarios, a decision memo, and live review. $${ENGAGEMENT_OFFERS[0].price} for one founder decision or $${ENGAGEMENT_OFFERS[1].price} for two consultant client cases.`}
        canonical="/decision-review"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'AIWMC Quantis Founder-Assisted Decision Reviews',
          provider: { '@type': 'Organization', name: 'AIWMC LLC', url: 'https://www.aiwmcquantis.com' },
          offers: OFFERS.map((offer) => ({
            '@type': 'Offer', name: offer.name, price: offer.price, priceCurrency: 'USD', availability: 'https://schema.org/InStock',
          })),
        }}
      />
      <StructuredData includeBreadcrumbs breadcrumbs={[{ name: 'Home', url: '/' }, { name: 'Decision Review', url: '/decision-review' }]} services={SCHEMA_SERVICES} />

      <section className="aiwmc-section-wash py-12 md:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-4">Founder-assisted · fixed scope · paid upfront</p>
        <SectionHeader
          title="Bring one real decision. Leave with the assumptions that control it."
          subtitle="Quantis structures the model; a founder reviews the inputs, reconciles the economics, and walks you through what changes the decision."
        />
        <div className="mt-7 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" />48-hour target after complete intake</span>
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />Decision support with explicit limitations</span>
        </div>
      </section>

      <section aria-label="Paid review options" className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-8">
        {OFFERS.map((offer) => {
          const Icon = offer.icon;
          return (
            <GlassCard key={offer.code} glow={offer.code === 'consultant_founding_pilot' ? 'brand' : 'cyan'} className="p-7 md:p-8 flex flex-col">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <Icon className="h-6 w-6 text-primary mb-4" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">{offer.audience}</p>
                  <h2 className="text-2xl font-bold mt-1">{offer.name}</h2>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-4xl font-bold">${offer.price}</p>
                  <p className="text-xs text-muted-foreground">one-time · USD</p>
                </div>
              </div>
              <p className="mt-5 inline-flex w-fit rounded-full border border-border px-3 py-1 text-xs font-semibold">{offer.cases}</p>
              <ul className="mt-6 space-y-3 flex-1">
                {offer.included.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {offer.code === 'founder_decision_review' && (
                <Link to="/demo/founder-decision-review" className="mt-6">
                  <Button variant="outline" size="lg" className="w-full gap-2">
                    <PlayCircle className="h-4 w-4" />
                    See the interactive demo first
                  </Button>
                </Link>
              )}
              {offer.code === 'founder_decision_review' && (
                <Link to="/demo/sample-decision-memo" className="mt-3">
                  <Button variant="outline" size="lg" className="w-full gap-2">
                    <FileCheck2 className="h-4 w-4" />
                    Read a sample Decision Memo
                  </Button>
                </Link>
              )}
              {offer.code === 'founder_decision_review' && (
                <Link to="/demo/hiring-decision" className="mt-3">
                  <Button variant="outline" size="lg" className="w-full gap-2">
                    <PlayCircle className="h-4 w-4" />
                    Explore the hiring example
                  </Button>
                </Link>
              )}
              {offer.code === 'consultant_founding_pilot' && (
                <Link to="/demo/consultant-founding-pilot" className="mt-6">
                  <Button variant="outline" size="lg" className="w-full gap-2">
                    <PlayCircle className="h-4 w-4" />
                    See the interactive demo first
                  </Button>
                </Link>
              )}
              <Button
                size="lg"
                className="w-full mt-3 gap-2 py-6"
                disabled={loading !== null}
                onClick={() => startCheckout(offer.code)}
              >
                {loading === offer.code ? 'Opening secure checkout…' : `Reserve for $${offer.price}`}
                {loading !== offer.code && <ArrowRight className="h-4 w-4" />}
              </Button>
              <a
                href={`mailto:support@aiwmcquantis.com?subject=${encodeURIComponent(`Question before booking: ${offer.name}`)}`}
                onClick={() => trackEvent('paid_review_question_click', { offer_code: offer.code })}
                className="mt-3 inline-flex items-center justify-center gap-2 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Ask a question before you pay
              </a>
            </GlassCard>
          );
        })}
      </section>

      {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}

      <section className="py-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          ['1. Pay securely', 'Stripe confirms the payment. No card data reaches Quantis.'],
          ['2. Complete intake', 'You return to a session-bound intake for the exact offer purchased.'],
          ['3. Review the decision', 'We deliver the memo and walk through the fragile assumptions with you.'],
        ].map(([title, copy]) => (
          <GlassCard key={title} className="p-5">
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground mt-2">{copy}</p>
          </GlassCard>
        ))}
      </section>

      <section aria-labelledby="intake-preview" className="pb-12">
        <h2 id="intake-preview" className="text-xl font-semibold">What we'll ask you</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          You answer after paying. Only the first column is required; the rest is optional and makes the memo sharper.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <GlassCard className="p-5">
            <h3 className="font-semibold">Required</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
              {INTAKE_PREVIEW.required.map((q) => <li key={q}>{q}</li>)}
            </ul>
          </GlassCard>
          <GlassCard className="p-5">
            <h3 className="font-semibold">Optional</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
              {INTAKE_PREVIEW.optional.map((q) => <li key={q}>{q}</li>)}
            </ul>
          </GlassCard>
        </div>
        <p className="text-xs text-muted-foreground mt-3">No bank logins or uploads: share documents as a Google Drive or Dropbox link if you want to.</p>
      </section>

      <section className="pb-16 text-sm text-muted-foreground space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Scope and cancellation</h2>
        <p>Quantis provides structured decision support based on supplied information, modeled assumptions, and identified sources. It is not accounting, tax, legal, investment, lending, audit, or assurance work and does not guarantee an outcome.</p>
        <p>You may cancel for a full refund before intake or substantive work begins. If AIWMC LLC determines during intake that the decision cannot be responsibly analyzed within scope, you receive a full refund. After substantive work begins, the engagement is non-refundable except when AIWMC LLC cannot deliver the agreed scope or applicable law requires otherwise.</p>
        <p>By purchasing and completing intake, you accept the <Link className="underline" to="/terms">Terms</Link>, <Link className="underline" to="/privacy">Privacy Policy</Link>, and <Link className="underline" to="/refund-policy">Refund Policy</Link>.</p>
      </section>
    </PublicPageShell>
  );
}
