import React from 'react';
import { PageSEO } from '@/components/seo/PageSEO';
import { StructuredData } from '@/components/seo/StructuredData';
import { RmgHeader } from '@/components/landing/RmgHeader';
import { Footer } from '@/components/layout/Footer';
import { InView, SectionLabel, SplitButton } from '@/components/sadewa/primitives';
import { trackCtaClick } from '@/lib/analytics';
import { TIERS } from '@/config/tiers';
import { ENGAGEMENT_OFFERS } from '@/config/engagement-offers';
import { FREE_ANALYSES_PER_MONTH, LEGAL_ENTITY_NAME } from '@/config/canonical-facts';

const PILOT = ENGAGEMENT_OFFERS.find((o) => o.code === 'consultant_founding_pilot')!;
const SCHEMA_SERVICES = [PILOT.code];

/**
 * /consultants — one advisor workflow, in the Sadewa layer.
 *
 * Audience: an independent advisor helping an owner decide whether a hire or
 * expansion is financially workable, who has to explain the assumptions and
 * the downside before the client commits.
 *
 * Copy rules (2026-10-14):
 * - One illustrative case, used everywhere: the fictional $120K growth decision
 *   behind /demo/founder-decision-review.
 * - Prices and quotas come from TIERS / canonical-facts only.
 * - No hours-saved claims, no Monte Carlo claims, no "every number traceable"
 *   claims, no testimonials, no guarantees.
 */

const WORKED_DEMO = '/demo/founder-decision-review';
const CLIENT_CASE = '/decision-review';

const STEPS: Array<{ label: string; title: string; body: string }> = [
  {
    label: 'Client decision',
    title: 'Write down the decision in one line.',
    body: 'Example: should the business put another $120K into growth this year? A single, fundable question keeps the conversation from sprawling.',
  },
  {
    label: 'Assumptions',
    title: 'Put every input where the client can see it.',
    body: 'Revenue, margin, fixed costs, ramp time and starting cash are listed as inputs, each labeled as the client’s figure or a modeled default you can replace.',
  },
  {
    label: 'Downside comparison',
    title: 'Show what happens when the plan runs slow.',
    body: 'Base and downside cases sit side by side, so the client sees how cash, break-even and payback move when the key assumption misses.',
  },
  {
    label: 'Reviewed memo',
    title: 'Hand over a memo you have checked.',
    body: 'Export the result as a PDF. You review it and add your judgment before it reaches the client.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Does this replace my own model or advice?',
    a: 'No. It structures the inputs and runs the cash, break-even and payback math so the assumptions are on the table. The interpretation and the recommendation stay yours.',
  },
  {
    q: 'Will the same inputs give the same numbers?',
    a: 'Yes. The financial figures come from a deterministic calculation. The written narrative does not originate financial numbers.',
  },
  {
    q: 'Where do the default figures come from?',
    a: 'Defaults come from a modeled benchmark grid, not observed companies. Each one is labeled so you can replace it with the client’s real figure — and you should, wherever you have it.',
  },
  {
    q: 'Can the export carry my firm’s branding?',
    a: `On ${TIERS.pro.label}, PDF exports can use your logo and company name and remove Quantis branding.`,
  },
];

export default function Consultants() {
  return (
    <div className="sdw min-h-screen">
      <PageSEO
        title="Quantis for Business Advisors — Make the Assumptions Visible"
        description="For independent advisors helping an owner decide on a hire or expansion: list the assumptions, compare the downside, and hand over a reviewed memo before the client commits."
        canonical="/consultants"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: 'AIWMC Quantis — Advisor Decision Workflow',
          serviceType: 'Business decision and downside analysis',
          provider: { '@type': 'Organization', name: LEGAL_ENTITY_NAME, url: 'https://www.aiwmcquantis.com' },
          areaServed: 'US',
          audience: { '@type': 'BusinessAudience', audienceType: 'Independent business advisors, fractional CFOs' },
          offers: {
            '@type': 'Offer',
            price: TIERS.pro.priceMonthly,
            priceCurrency: 'USD',
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: TIERS.pro.priceMonthly,
              priceCurrency: 'USD',
              billingIncrement: 1,
              unitCode: 'MON',
            },
          },
        }}
      />
      <StructuredData
        includeBreadcrumbs
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'For Advisors', url: '/consultants' },
        ]}
        services={SCHEMA_SERVICES}
      />

      <RmgHeader />

      <main id="main-content">
        {/* Hero */}
        <section aria-labelledby="advisors-heading" className="relative overflow-hidden">
          <div className="sdw-container pt-10 md:pt-16 pb-16 md:pb-24">
            <SectionLabel>For independent business advisors</SectionLabel>
            {/* Above the fold: renders immediately, no reveal. */}
            <h1
              id="advisors-heading"
              className="sdw-display mt-6 max-w-[15ch]"
              style={{ fontSize: 'clamp(2.5rem, 5.8vw, 5.5rem)' }}
            >
              Before your client commits, make the financial assumptions visible.
            </h1>
            <div>
              <p className="sdw-lead mt-8 max-w-[600px]" style={{ color: 'var(--sdw-ink-2)' }}>
                When an owner asks whether a hire or an expansion is workable, show them the inputs, the
                downside and the cash it needs — in one memo you have reviewed.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <SplitButton to={WORKED_DEMO} onClick={() => trackCtaClick('advisors_worked_decision', 'advisors_hero')}>
                  See a worked decision
                </SplitButton>
                <SplitButton variant="secondary" to={CLIENT_CASE} onClick={() => trackCtaClick('advisors_client_case', 'advisors_hero')}>
                  Discuss a client case
                </SplitButton>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section aria-labelledby="workflow-heading" className="sdw-white sdw-section">
          <div className="sdw-container">
            <SectionLabel id="workflow-heading">The workflow</SectionLabel>
            <h2 className="sdw-h2 mt-6 max-w-[22ch]">Four steps from a client question to a memo you can stand behind.</h2>
            <ol className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {STEPS.map((s, i) => (
                <InView as="li" key={s.label} delay={i * 80} className="sdw-card p-6 flex flex-col gap-3">
                  <span className="sdw-label text-[12px]" style={{ color: 'var(--sdw-accent)' }}>
                    {String(i + 1).padStart(2, '0')} / {s.label}
                  </span>
                  <h3 className="text-[19px] font-bold leading-snug" style={{ color: 'var(--sdw-ink)' }}>{s.title}</h3>
                  <p className="text-[15px] leading-relaxed" style={{ color: 'var(--sdw-muted)' }}>{s.body}</p>
                </InView>
              ))}
            </ol>
          </div>
        </section>

        {/* Worked case */}
        <section aria-labelledby="case-heading" className="sdw-dark sdw-section">
          <div className="sdw-container grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
            <InView>
              <SectionLabel id="case-heading">One illustrative case</SectionLabel>
              <h2 className="sdw-h2 mt-6">Should this company put another $120K into growth?</h2>
              <p className="sdw-lead mt-6 max-w-[520px]" style={{ color: 'var(--sdw-ink-2)' }}>
                A fixed, fictional example running on the same engine as every Decision Run. Move one
                assumption and watch cash, break-even and payback recompute.
              </p>
              <div className="mt-8">
                <SplitButton variant="accent" to={WORKED_DEMO} onClick={() => trackCtaClick('advisors_worked_decision', 'advisors_case')}>
                  Open the worked decision
                </SplitButton>
              </div>
            </InView>
            <InView delay={120} aria-hidden="true">
              <div className="sdw-card p-6 md:p-8">
                <p className="sdw-label text-[12px]" style={{ color: 'var(--sdw-muted)' }}>/What the client sees</p>
                <ul className="mt-5 divide-y" style={{ borderColor: 'var(--sdw-line)' }}>
                  {['The decision, in one line', 'Every input, labeled by source', 'Base vs downside, side by side', 'Cash needed before payback', 'Your review notes'].map((row) => (
                    <li key={row} className="py-3 text-[15px]" style={{ color: 'var(--sdw-ink-2)', borderColor: 'var(--sdw-line)' }}>
                      {row}
                    </li>
                  ))}
                </ul>
              </div>
            </InView>
          </div>
        </section>

        {/* Plans — values from TIERS, never animated */}
        <section aria-labelledby="plans-heading" className="sdw-section">
          <div className="sdw-container">
            <SectionLabel id="plans-heading">Plans</SectionLabel>
            <h2 className="sdw-h2 mt-6">Start free. Upgrade when the work is regular.</h2>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="sdw-card p-6">
                <p className="sdw-label text-[12px]">/{TIERS.free.label}</p>
                <p className="sdw-num mt-3 text-[40px] font-bold" style={{ color: 'var(--sdw-ink)' }}>$0</p>
                <p className="mt-2 text-[15px]" style={{ color: 'var(--sdw-muted)' }}>{FREE_ANALYSES_PER_MONTH} Decision Runs a month.</p>
              </div>
              <div className="sdw-card p-6">
                <p className="sdw-label text-[12px]">/{TIERS.plus.label}</p>
                <p className="sdw-num mt-3 text-[40px] font-bold" style={{ color: 'var(--sdw-ink)' }}>
                  ${TIERS.plus.priceMonthly}<span className="text-[16px] font-normal" style={{ color: 'var(--sdw-muted)' }}> / mo</span>
                </p>
                <p className="mt-2 text-[15px]" style={{ color: 'var(--sdw-muted)' }}>
                  or ${TIERS.plus.priceAnnualMonthlyEquivalent}/mo billed annually · 14-day trial
                </p>
              </div>
              <div className="sdw-card p-6" style={{ boxShadow: '0 0 0 2px var(--sdw-accent) inset' }}>
                <p className="sdw-label text-[12px]" style={{ color: 'var(--sdw-accent)' }}>/{TIERS.pro.label} · suits advisors</p>
                <p className="sdw-num mt-3 text-[40px] font-bold" style={{ color: 'var(--sdw-ink)' }}>
                  ${TIERS.pro.priceMonthly}<span className="text-[16px] font-normal" style={{ color: 'var(--sdw-muted)' }}> / mo</span>
                </p>
                <p className="mt-2 text-[15px]" style={{ color: 'var(--sdw-muted)' }}>
                  or ${TIERS.pro.priceAnnualMonthlyEquivalent}/mo billed annually · 14-day trial · branded PDF exports
                </p>
              </div>
            </div>
            {/* The paid pilot built for this audience: until 2026-10-25 this page never mentioned it. */}
            <div className="sdw-card p-6 mt-4">
              <p className="sdw-label text-[12px]">/{PILOT.name} · {PILOT.cases}</p>
              <p className="sdw-num mt-3 text-[32px] font-bold" style={{ color: 'var(--sdw-ink)' }}>
                ${PILOT.price}<span className="text-[16px] font-normal" style={{ color: 'var(--sdw-muted)' }}> one-time</span>
              </p>
              <p className="mt-2 text-[15px]" style={{ color: 'var(--sdw-muted)' }}>
                Bring two client cases. Each gets three scenarios, reconciled economics, a source and uncertainty register, and a memo you can hand to the client after one review and one revision.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <SplitButton variant="primary" size="sm" to="/decision-review" onClick={() => trackCtaClick('consultants_pilot', 'consultants_plans')}>See the pilot</SplitButton>
                <SplitButton variant="secondary" size="sm" to="/demo/consultant-founding-pilot">Try the capacity demo</SplitButton>
              </div>
            </div>
            <div className="mt-8">
              <SplitButton variant="secondary" size="sm" to="/pricing">Full pricing comparison</SplitButton>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="advisor-faq-heading" className="sdw-white sdw-section">
          <div className="sdw-container max-w-[860px]">
            <SectionLabel id="advisor-faq-heading">Questions advisors ask</SectionLabel>
            <div className="mt-8 divide-y" style={{ borderTop: '1px solid var(--sdw-line)', borderBottom: '1px solid var(--sdw-line)' }}>
              {FAQ_ITEMS.map(({ q, a }) => (
                <details key={q} className="group py-5" style={{ borderColor: 'var(--sdw-line)' }}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[18px] font-bold" style={{ color: 'var(--sdw-ink)' }}>
                    {q}
                    <span aria-hidden="true" className="text-[22px] transition-transform group-open:rotate-45" style={{ color: 'var(--sdw-muted)' }}>+</span>
                  </summary>
                  <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--sdw-muted)' }}>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section aria-labelledby="advisors-cta-heading" className="sdw-dark sdw-stars relative overflow-hidden">
          <div className="sdw-container py-20 md:py-28">
            <InView>
              <h2 id="advisors-cta-heading" className="sdw-h2 max-w-[20ch]" style={{ fontSize: 'clamp(2.4rem, 5vw, 4.25rem)' }}>
                Have a client decision on your desk?
              </h2>
              <p className="mt-6 sdw-lead max-w-[520px]" style={{ color: 'var(--sdw-ink-2)' }}>
                Walk through the worked example first, or bring the real case and we will look at it together.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <SplitButton variant="accent" to={WORKED_DEMO} onClick={() => trackCtaClick('advisors_worked_decision', 'advisors_final')}>
                  See a worked decision
                </SplitButton>
                <SplitButton variant="ghost-dark" to={CLIENT_CASE} onClick={() => trackCtaClick('advisors_client_case', 'advisors_final')}>
                  Discuss a client case
                </SplitButton>
              </div>
            </InView>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
