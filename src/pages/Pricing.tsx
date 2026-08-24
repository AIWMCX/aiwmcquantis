import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';
import { StructuredData } from '@/components/seo/StructuredData';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';
import { PricingSection } from '@/components/landing/PricingSection';
import { recordFunnelEvent } from '@/lib/analytics';
import { TIERS } from '@/config/tiers';
import { FREE_ANALYSES_PER_MONTH, PROCESSING_TIME_CLAIM } from '@/config/canonical-facts';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

export default function Pricing() {
  // SOW §6.1 funnel event: pricing_view fires once per /pricing visit
  useEffect(() => {
    recordFunnelEvent('pricing_view', { surface: 'standalone_page' });
  }, []);

  return (
    <PublicPageShell active="pricing" backTo={{ href: '/', label: 'Back to home' }} maxWidth="lg">
      <PageSEO
        title={`Quantis Pricing — Free, Plus $${TIERS.plus.priceMonthly}/mo, Pro $${TIERS.pro.priceMonthly}/mo`}
        description={`Run ${FREE_ANALYSES_PER_MONTH} free analyses/month to see your viability score and top risks. Plus at $${TIERS.plus.priceMonthly}/mo unlocks the full Monte Carlo report, P&L, action plan, and PDF export. Pro at $${TIERS.pro.priceMonthly}/mo adds white-label, API access, TAM/SAM/SOM, and the 5-year model.`}
        canonical="/pricing"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'AIWMC™ Quantis Pricing',
          description: `Simple pricing for serious founders. Free (${FREE_ANALYSES_PER_MONTH}/mo) · Plus $${TIERS.plus.priceMonthly}/mo · Pro $${TIERS.pro.priceMonthly}/mo.`,
          url: 'https://aiwmcquantis.com/pricing',
        }}
      />
      <StructuredData
        includeBreadcrumbs
        breadcrumbs={[{ name: 'Home', url: '/' }, { name: 'Pricing', url: '/pricing' }]}
      />

      {/* Hero */}
      <section aria-labelledby="pricing-hero-heading" className="aiwmc-section-wash py-8 md:py-14">
        <SectionHeader
          title="Simple pricing for serious founders"
          subtitle="Business analysis that costs less than a single consultant hour. Start free, upgrade when you're ready."
        />
      </section>

      {/* vs Consultant Anchor — first thing the visitor sees */}
      <section className="mb-8">
        <GlassCard glow="brand" className="p-0 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: 'rgba(148,163,255,0.14)' }}>
            <div className="p-6 md:p-7 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Boutique Consultant
              </p>
              <p className="text-3xl md:text-4xl font-bold line-through decoration-red-400/70 decoration-[3px]" style={{ color: 'hsl(var(--foreground))' }}>
                $1,500
              </p>
              <p className="text-xs text-muted-foreground mt-2">3-day engagement, 1 report, no live updates</p>
            </div>
            <div className="p-6 md:p-7 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                CFO Hourly
              </p>
              <p className="text-3xl md:text-4xl font-bold line-through decoration-red-400/70 decoration-[3px]" style={{ color: 'hsl(var(--foreground))' }}>
                $350 / hr
              </p>
              <p className="text-xs text-muted-foreground mt-2">10-15 hours per scenario, you brief them</p>
            </div>
            <div className="p-6 md:p-7 text-center" style={{ background: 'rgba(79,70,229,0.08)' }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--aiwmc-grad-cyan)' }}>
                Quantis Plus — Annual
              </p>
              <p className="text-3xl md:text-4xl font-bold" style={{ ...MONO, color: 'hsl(var(--foreground))' }}>
                ${TIERS.plus.priceAnnualMonthlyEquivalent}<span className="text-base font-medium text-muted-foreground"> / mo</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2">Unlimited analyses · {PROCESSING_TIME_CLAIM}</p>
            </div>
          </div>
          <div
            className="px-6 py-3 text-center text-xs md:text-sm text-muted-foreground"
            style={{ background: 'rgba(148,163,255,0.05)', borderTop: '1px solid rgba(148,163,255,0.14)' }}
          >
            <span className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Same depth.</span> 1/200th the price.
            <span className="hidden md:inline"> · </span>
            <span className="block md:inline mt-1 md:mt-0">
              <span className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>14-day money-back guarantee</span> — no questions asked.
            </span>
          </div>
        </GlassCard>
      </section>

      {/* Pricing tiers */}
      <PricingSection />

      {/* Bottom CTA */}
      <section className="py-12 md:py-16">
        <GlassCard glow="cyan" className="p-8 md:p-12 text-center">
          <h2 className="text-2xl font-bold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
            Start free, upgrade when ready
          </h2>
          <p className="text-muted-foreground mb-6">
            No credit card required. Run your first analysis in {PROCESSING_TIME_CLAIM}.
          </p>
          <Link to="/app">
            <Button size="lg" className="gap-2 py-6 px-8">
              See my numbers — free <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </GlassCard>
      </section>
    </PublicPageShell>
  );
}
