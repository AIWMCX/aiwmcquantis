import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';
import { StructuredData } from '@/components/seo/StructuredData';
import { Footer } from '@/components/layout/Footer';
import { PricingSection } from '@/components/landing/PricingSection';

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSEO
        title="Quantis Pricing — Free Plan & Plus at $17/mo"
        description="Start free forever with 3 analyses/month. Upgrade to Plus at $17/mo for unlimited analyses, PDF export, Document Studio, and custom branding."
        canonical="/pricing"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'AIWMC Quantis Pricing',
          description: 'Simple pricing for serious founders. Free plan with 3 analyses per month, Plus plan at $17/month for unlimited access.',
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
            <Link to="/" className="text-lg sm:text-xl font-bold text-foreground">AIWMC Quantis</Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Home</Link>
              <Link to="/how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
              <Link to="/use-cases" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Use Cases</Link>
              <Link to="/examples" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Examples</Link>
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
        <section className="text-center py-12 md:py-16 container max-w-4xl mx-auto px-4 sm:px-6">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Simple Pricing for Serious Founders
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Business analysis that costs less than a single consultant hour. Start free, upgrade when you're ready.
          </p>
        </section>

        {/* Reuse existing PricingSection component */}
        <PricingSection />

        {/* Bottom CTA */}
        <section className="py-12 md:py-16">
          <div className="container max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Start Free, Upgrade When Ready
            </h2>
            <p className="text-muted-foreground mb-6">
              No credit card required. Run your first analysis in 60 seconds.
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
