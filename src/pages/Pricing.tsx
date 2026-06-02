import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';
import { StructuredData } from '@/components/seo/StructuredData';
import { Footer } from '@/components/layout/Footer';
import { PricingSection } from '@/components/landing/PricingSection';
import { recordFunnelEvent } from '@/lib/analytics';

export default function Pricing() {
  // SOW §6.1 funnel event: pricing_view fires once per /pricing visit
  useEffect(() => {
    recordFunnelEvent('pricing_view', { surface: 'standalone_page' });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSEO
        title="Quantis Pricing — Free Analysis & Plus at $17/mo"
          description="Run 5 free analyses to see viability scores and critical risks. Plus at $17/mo unlocks the full Monte Carlo report, P&L, action plan, and PDF export."
        canonical="/pricing"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'AIWMC™ Quantis Pricing',
          description: 'Simple pricing for serious founders. 5 free analyses with score and risks. Plus at $17/month unlocks the full report, Monte Carlo, and unlimited runs.',
          url: 'https://aiwmcquantis.com/pricing',
        }}
      />
      <StructuredData
        includeBreadcrumbs
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Pricing', url: '/pricing' },
        ]}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-lg sm:text-xl font-bold text-foreground">AIWMC™ Quantis</Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Home</Link>
              <Link to="/how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
              <Link to="/use-cases" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Use Cases</Link>
              <Link to="/examples" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Examples</Link>
              <Link to="/methodology" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Methodology</Link>
              <Link to="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
            </div>
            <Link to="/app">
              <Button size="sm" className="gap-2 min-h-[48px] px-5 text-sm font-semibold">
                Start Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-2">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>

        {/* Hero */}
        <section className="text-center py-8 md:py-12 container max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3">
            Simple Pricing for Serious Founders
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Business analysis that costs less than a single consultant hour. Start free, upgrade when you're ready.
          </p>
        </section>

        {/* vs $3,000 Consultant Anchor — first thing the visitor sees */}
        <section className="container max-w-5xl mx-auto px-4 sm:px-6 mb-2">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="p-6 md:p-7 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Boutique Consultant
                </p>
                <p className="text-3xl md:text-4xl font-bold text-foreground line-through decoration-destructive/70 decoration-[3px]">
                  $3,000
                </p>
                <p className="text-xs text-muted-foreground mt-2">3-day engagement, 1 report, no live updates</p>
              </div>
              <div className="p-6 md:p-7 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  CFO Hourly
                </p>
                <p className="text-3xl md:text-4xl font-bold text-foreground line-through decoration-destructive/70 decoration-[3px]">
                  $250 / hr
                </p>
                <p className="text-xs text-muted-foreground mt-2">10-15 hours per scenario, you brief them</p>
              </div>
              <div className="p-6 md:p-7 text-center bg-primary/5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-2">
                  Quantis Plus — Annual
                </p>
                <p className="text-3xl md:text-4xl font-bold text-foreground">
                  $14<span className="text-base font-medium text-muted-foreground"> / mo</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">Unlimited analyses · 60-second turnaround</p>
              </div>
            </div>
            <div className="px-6 py-3 text-center text-xs md:text-sm text-muted-foreground bg-muted/40 border-t border-border">
              <span className="font-semibold text-foreground">Same depth.</span> 1/200th the price.
              <span className="hidden md:inline"> · </span>
              <span className="block md:inline mt-1 md:mt-0">
                <span className="font-semibold text-foreground">7-day money-back guarantee</span> — no questions asked.
              </span>
            </div>
          </div>
        </section>

        {/* Pricing tiers */}
        <PricingSection />

        {/* Bottom CTA */}
        <section className="py-12 md:py-16">
          <div className="container max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Start Free, Upgrade When Ready
            </h2>
            <p className="text-muted-foreground mb-6">
              No credit card required. Run 5 free analyses in minutes.
            </p>
            <Link to="/app">
              <Button size="lg" className="gap-2 py-6 px-8">
                See My Numbers — Free <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
