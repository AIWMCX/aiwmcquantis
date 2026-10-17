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
import { FREE_ANALYSES_PER_MONTH } from '@/config/canonical-facts';

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
        description={`Run ${FREE_ANALYSES_PER_MONTH} complete Decision Runs each month: full financial analysis, Monte Carlo, failure pre-mortem, and scenarios. Plus at $${TIERS.plus.priceMonthly}/mo adds unlimited runs and professional workflows. Pro adds team, API, white-label, and 5-year modeling.`}
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
          subtitle="Use the complete decision engine five times every month. Upgrade when continuity, exports, and professional workflows become valuable."
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
              <p className="text-xs text-muted-foreground mt-2">Unlimited analyses</p>
            </div>
          </div>
          <div
            className="px-6 py-3 text-center text-xs md:text-sm text-muted-foreground"
            style={{ background: 'rgba(148,163,255,0.05)', borderTop: '1px solid rgba(148,163,255,0.14)' }}
          >
            <span className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Same depth.</span> 1/200th the price.
            <span className="hidden md:inline"> · </span>
            <span className="block md:inline mt-1 md:mt-0">
              <span className="font-semibold" style={{ color: 'hsl(var(--foreground))' }}>14-day money-back guarantee</span> on Plus and Pro — from your first charge.
            </span>
          </div>
        </GlassCard>
      </section>

      {/* Pricing tiers */}
      <PricingSection />

      {/* Founder-assisted one-time reviews — low-key, not competing with the self-serve tiers above */}
      <section className="py-6 md:py-10">
        <GlassCard className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">Want it done with you, not by you alone?</p>
              <h2 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Founder-assisted decision reviews — from $349, one-time</h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                A founder personally reconciles your numbers and walks you through the assumptions that control the decision. Fixed scope, 48-hour delivery target.
              </p>
            </div>
            <Link to="/decision-review" className="shrink-0">
              <Button variant="outline" size="lg" className="gap-2 whitespace-nowrap">
                See the two options <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </GlassCard>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 md:py-16">
        <GlassCard glow="cyan" className="p-8 md:p-12 text-center">
          <h2 className="text-2xl font-bold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
            Test a real decision, end to end
          </h2>
          <p className="text-muted-foreground mb-6">
            No credit card required. Every free Decision Run includes the full analysis, failure pre-mortem, and scenarios.
          </p>
          <Link to="/app">
            <Button size="lg" className="gap-2 py-6 px-8">
              Start a free Decision Run <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </GlassCard>
      </section>
    </PublicPageShell>
  );
}
