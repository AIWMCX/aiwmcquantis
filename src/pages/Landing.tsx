import React, { lazy, Suspense, useRef, useEffect, useState } from 'react';
import { useBotDetection } from '@/hooks/useBotDetection';
import { QuantisOutputs } from '@/components/landing/QuantisOutputs';
import { StructuredData } from '@/components/seo/StructuredData';
import { PageSEO } from '@/components/seo/PageSEO';
import { recordFunnelEvent } from '@/lib/analytics';
import { PopupManager } from '@/components/marketing/PopupManager';
import { Footer } from '@/components/layout/Footer';
import { BENCHMARK_COUNT_DISPLAY, BENCHMARK_SOURCES_DISPLAY } from '@/config/canonical-facts';
import { useLazySection } from '@/hooks/useLazySection';
import { StickyMobileCTA } from '@/components/landing/StickyMobileCTA';
import { ReportFirstHero } from '@/components/landing/ReportFirstHero';
import { ProductFilm } from '@/components/landing/ProductFilm';
import { IntroFilm } from '@/components/landing/IntroFilm';
import { shouldShowIntroFilm } from '@/lib/intro-film';
import { LeadCaptureInline } from '@/components/landing/LeadCaptureInline';
import { WhoItsFor } from '@/components/landing/WhoItsFor';
import { RmgHeader } from '@/components/landing/RmgHeader';
import { SdwHero } from '@/components/landing/sadewa/SdwHero';
import { PainPoints } from '@/components/landing/sadewa/PainPoints';
import { Comparison } from '@/components/landing/sadewa/Comparison';
import { FinalCTA } from '@/components/landing/sadewa/FinalCTA';
import { TIERS } from '@/config/tiers';

// Testimonials removed (2026-07-06): replaced by TrustStrip until real linkable founder profiles are verified.
import { TrustStrip } from '@/components/landing/TrustStrip';
import { SectionHeader } from '@/components/ui/glass-card';
const HowItWorksSection = lazy(() => import('@/components/landing/HowItWorksSection').then(m => ({ default: m.HowItWorksSection })));
const OpenTheHood = lazy(() => import('@/components/landing/OpenTheHood').then(m => ({ default: m.OpenTheHood })));
const FounderStory = lazy(() => import('@/components/landing/FounderStory').then(m => ({ default: m.FounderStory })));
const PricingSection = lazy(() => import('@/components/landing/PricingSection').then(m => ({ default: m.PricingSection })));
const FAQSection = lazy(() => import('@/components/landing/FAQSection').then(m => ({ default: m.FAQSection })));

const SectionSkeleton = ({ height = 400 }: { height?: number }) => (
  <div className="sdw-container py-16">
    <div className="w-full animate-pulse" style={{ height, background: 'var(--sdw-card)' }} />
  </div>
);

export default function Landing() {
  useBotDetection();
  const belowFoldSection = useLazySection({ rootMargin: '300px' });
  const faqSection = useLazySection({ rootMargin: '200px' });
  const heroRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  // First visit: the product film opens above every layer, then reveals the homepage.
  const [introOpen, setIntroOpen] = useState(shouldShowIntroFilm);

  // SOW §6.1 funnel event: home_view fires once per session on landing
  useEffect(() => {
    recordFunnelEvent('home_view');
  }, []);

  return (
    <div className="sdw min-h-screen">
      <PageSEO
        title="AIWMC Quantis — Test a Business Decision Before You Fund It"
        description="Test a business decision before committing capital: explicit assumptions, deterministic cash, break-even and payback math, downside scenarios. Free to start."
        canonical="/"
      />
      <StructuredData
        includeFAQ
        faqItems={[
          { question: 'What is Quantis?', answer: `Quantis is an AI-powered business idea validator and startup viability calculator that runs a financial pre-mortem on any business idea. It stress-tests 12 financial variables against a ${BENCHMARK_COUNT_DISPLAY}-cell modeled coverage grid (modeled cells, not observed companies) and shows which assumptions control cash, break-even and payback.` },
          { question: 'Is Quantis free to use?', answer: `Yes. The Free plan includes ${TIERS.free.limits.analysesPerMonth} complete Decision Runs per month, each with the full analysis, failure pre-mortem and scenario comparison. No credit card required. Plus ($${TIERS.plus.priceMonthly}/mo) removes the monthly limit; Plus and Pro checkouts include a 14-day trial.` },
          { question: 'How accurate are the financial projections?', answer: `Quantis runs deterministic calculations on your inputs, with benchmark defaults from a ${BENCHMARK_COUNT_DISPLAY}-cell modeled coverage grid informed by ${BENCHMARK_SOURCES_DISPLAY}. It does not predict or guarantee outcomes; each assumption is labeled so you can see and replace what drives each number.` },
          { question: 'What does a "financial pre-mortem" mean?', answer: 'A pre-mortem identifies how your business could fail before you launch. Our financial stress test tool stress-tests revenue assumptions, cost structures, and unit economics to surface fatal flaws — like a rent-to-revenue ratio that guarantees losses.' },
          { question: 'How is Quantis different from ChatGPT or a spreadsheet?', answer: 'ChatGPT gives qualitative opinions. Spreadsheets require you to know the right formulas. Quantis combines a deterministic math engine with an AI narrator layer — giving you both precise, reproducible numbers and strategic context, cross-checked by a multi-model consensus pass.' },
        ]}
      />

      <RmgHeader />

      <main id="main-content" role="main">
        {/* 1. Hero — single <h1>, live product-film showreel, 3D object, split CTAs */}
        <SdwHero onWatchFilm={() => setIntroOpen(true)} />

        {/* 2. Pain points — floating warning pills */}
        <PainPoints />

        {/* 3. Product film — 25s decision film in the cosmic dark band */}
        <ProductFilm />

        {/* 4. Sample report + the real input form */}
        <div ref={heroRef} id="single-input-hero" data-hero-form>
          <ReportFirstHero />
        </div>

        {/* 5. What Quantis does */}
        <QuantisOutputs />

        {/* 6–11: Lazy loaded sections */}
        <div ref={belowFoldSection.ref} style={{ minHeight: belowFoldSection.isVisible ? undefined : '600px' }}>
          {belowFoldSection.isVisible ? (
            <Suspense fallback={<SectionSkeleton height={600} />}>
              <HowItWorksSection />
              <Comparison />
              <WhoItsFor />
              <TrustStrip />
              <OpenTheHood />
              <FounderStory />
            </Suspense>
          ) : (
            <SectionSkeleton height={600} />
          )}
        </div>

        {/* 12. Lead capture */}
        <section aria-labelledby="starter-kit-heading" className="sdw-white sdw-section">
          <div className="sdw-container grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16 items-end">
            <SectionHeader
              align="left"
              eyebrow="Not ready to analyze yet?"
              title="Download the Founder Validation Starter Kit"
              subtitle="Business Model Canvas, Financial Projection Template, 20 AI Prompts, and a Risk Checklist — free."
              className="sdw-stack-header"
            />
            <div className="w-full max-w-md lg:justify-self-end">
              <LeadCaptureInline />
            </div>
          </div>
        </section>

        {/* 13. Pricing */}
        <div ref={pricingRef}>
          <Suspense fallback={<SectionSkeleton height={400} />}>
            <PricingSection />
          </Suspense>
        </div>

        {/* 14. FAQ */}
        <div ref={faqSection.ref} className="sdw-white">
          {faqSection.isVisible ? (
            <Suspense fallback={<SectionSkeleton height={400} />}>
              <FAQSection />
            </Suspense>
          ) : (
            <SectionSkeleton height={400} />
          )}
        </div>

        {/* 15. Closing CTA */}
        <FinalCTA />
      </main>

      <Footer />

      <StickyMobileCTA
        heroFormRef={heroRef as React.RefObject<HTMLElement>}
        pricingRef={pricingRef as React.RefObject<HTMLElement>}
      />

      <div className="h-24 md:hidden" />
      {/* Marketing popups wait until the intro film has been closed. */}
      {!introOpen && <PopupManager />}
      {introOpen && <IntroFilm onDone={() => setIntroOpen(false)} />}
    </div>
  );
}
