import React, { lazy, Suspense, useRef, useEffect, useState } from 'react';
import { useBotDetection } from '@/hooks/useBotDetection';
import { Link } from 'react-router-dom';
import { StructuredData } from '@/components/seo/StructuredData';
import { PageSEO } from '@/components/seo/PageSEO';
import { recordFunnelEvent } from '@/lib/analytics';
import { Footer } from '@/components/layout/Footer';
import { BENCHMARK_COUNT_DISPLAY, BENCHMARK_SOURCES_DISPLAY } from '@/config/canonical-facts';
import { useLazySection } from '@/hooks/useLazySection';
import { StickyMobileCTA } from '@/components/landing/StickyMobileCTA';
import { ProductFilm } from '@/components/landing/ProductFilm';
import { shouldShowIntroFilm } from '@/lib/intro-film';
import { WhoItsFor } from '@/components/landing/WhoItsFor';
import { RmgHeader } from '@/components/landing/RmgHeader';
import { SdwHero } from '@/components/landing/sadewa/SdwHero';
import { PainPoints } from '@/components/landing/sadewa/PainPoints';
import { FinalCTA } from '@/components/landing/sadewa/FinalCTA';
import { HiringDemoBand } from '@/components/landing/sadewa/HiringDemoBand';
import { TIERS } from '@/config/tiers';

// Testimonials removed (2026-07-06): replaced by TrustStrip until real linkable founder profiles are verified.
import { TrustStrip } from '@/components/landing/TrustStrip';
const FounderStory = lazy(() => import('@/components/landing/FounderStory').then(m => ({ default: m.FounderStory })));
const PricingSection = lazy(() => import('@/components/landing/PricingSection').then(m => ({ default: m.PricingSection })));
const FAQSection = lazy(() => import('@/components/landing/FAQSection').then(m => ({ default: m.FAQSection })));
// Not needed for the first screen, so kept out of the entry bundle (mobile LCP/TBT, 2026-11-08).
// ReportFirstHero still mounts right after the first render and runs an idea the hero sent
// before it loaded (takePendingHeroIdea in src/lib/hero-idea.ts).
const ReportFirstHero = lazy(() => import('@/components/landing/ReportFirstHero').then(m => ({ default: m.ReportFirstHero })));
const PopupManager = lazy(() => import('@/components/marketing/PopupManager').then(m => ({ default: m.PopupManager })));
const IntroFilm = lazy(() => import('@/components/landing/IntroFilm').then(m => ({ default: m.IntroFilm })));

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
  // The product film opens on request (hero buttons) or via a ?intro=1 share link — never over the offer on load.
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
          { question: 'What is Quantis?', answer: `Quantis is an AI-powered business idea validator and startup viability calculator that runs a financial pre-mortem on any business idea. It runs your numbers through a deterministic engine, fills gaps from a ${BENCHMARK_COUNT_DISPLAY}-cell modeled coverage grid (modeled cells, not observed companies) and shows which assumptions control cash, break-even and payback.` },
          { question: 'Is Quantis free to use?', answer: `Yes. The Free plan includes ${TIERS.free.limits.analysesPerMonth} complete Decision Runs per month, each with the full analysis, failure pre-mortem and scenario comparison. No credit card required. Plus ($${TIERS.plus.priceMonthly}/mo) removes the monthly limit; Plus and Pro checkouts include a 14-day trial.` },
          { question: 'How accurate are the financial projections?', answer: `Quantis runs deterministic calculations on your inputs, with benchmark defaults from a ${BENCHMARK_COUNT_DISPLAY}-cell modeled coverage grid informed by ${BENCHMARK_SOURCES_DISPLAY}. It does not predict or guarantee outcomes; each assumption is labeled so you can see and replace what drives each number.` },
          { question: 'What does a "financial pre-mortem" mean?', answer: 'A pre-mortem identifies how your business could fail before you launch. Our financial stress test tool stress-tests revenue assumptions, cost structures, and unit economics to surface fatal flaws — like a rent-to-revenue ratio that leaves no room for profit.' },
          { question: 'How is Quantis different from ChatGPT or a spreadsheet?', answer: 'ChatGPT gives qualitative opinions. Spreadsheets require you to know the right formulas. Quantis combines a deterministic math engine with an AI narrator layer — giving you reproducible numbers and plain-language context. The numbers are calculated before the AI writes anything.' },
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

        {/* 3b. Hiring decision — interactive example + walkthrough */}
        <HiringDemoBand />

        {/* 4. Sample report + the real input form */}
        <div ref={heroRef} id="single-input-hero" data-hero-form>
          <Suspense fallback={<SectionSkeleton height={900} />}>
            <ReportFirstHero />
          </Suspense>
        </div>

        {/* #101 (2026-10-29): "What Quantis does", How it works, the comparison
            table and "Open the hood" each have their own page, so the homepage
            links to them instead of repeating them; 2 of 164 home sessions
            started an analysis with the 15-section version. */}
        <nav aria-label="Go deeper" className="sdw-white">
          <div className="sdw-container py-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="sdw-label text-[12px]">Go deeper</span>
            <Link to="/how-it-works" className="underline underline-offset-4">How it works</Link>
            <Link to="/methodology" className="underline underline-offset-4">Methodology and limits</Link>
            <Link to="/demo/sample-decision-memo" className="underline underline-offset-4">Read a sample Decision Memo</Link>
            <Link to="/pricing#compare-links" className="underline underline-offset-4">Compare with other tools</Link>
          </div>
        </nav>

        {/* 6–11: Lazy loaded sections */}
        <div ref={belowFoldSection.ref} style={{ minHeight: belowFoldSection.isVisible ? undefined : '600px' }}>
          {belowFoldSection.isVisible ? (
            <Suspense fallback={<SectionSkeleton height={600} />}>
              <WhoItsFor />
              <TrustStrip />
              <FounderStory />
            </Suspense>
          ) : (
            <SectionSkeleton height={600} />
          )}
        </div>

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
      <Suspense fallback={null}>
        {!introOpen && <PopupManager />}
        {introOpen && <IntroFilm onDone={() => setIntroOpen(false)} />}
      </Suspense>
    </div>
  );
}
