import React, { lazy, Suspense, useRef, useEffect } from 'react';
import { useBotDetection } from '@/hooks/useBotDetection';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Moon, Sun, Menu } from 'lucide-react';
import { MobileHero } from '@/components/landing/MobileHero';
import { QuantisOutputs } from '@/components/landing/QuantisOutputs';
import { MobileNav } from '@/components/layout/MobileNav';
import { UrgencyBanner } from '@/components/landing/UrgencyBanner';
import { useAuth } from '@/hooks/useAuth';
import { StructuredData } from '@/components/seo/StructuredData';
import { PageSEO } from '@/components/seo/PageSEO';
import { trackCtaClick, recordFunnelEvent } from '@/lib/analytics';
import { PopupManager } from '@/components/marketing/PopupManager';
import { Footer } from '@/components/layout/Footer';
import { BENCHMARK_COUNT_DISPLAY, BENCHMARK_SOURCES_DISPLAY } from '@/config/canonical-facts';
import { useLazySection } from '@/hooks/useLazySection';
import { StickyMobileCTA } from '@/components/landing/StickyMobileCTA';
import { ReportFirstHero } from '@/components/landing/ReportFirstHero';
import { LeadCaptureInline } from '@/components/landing/LeadCaptureInline';
import { SocialProofBar } from '@/components/landing/SocialProofBar';
import { FeaturedDirectories } from '@/components/landing/FeaturedDirectories';
import { SocialPanel } from '@/components/landing/SocialPanel';
import { ProgressiveEngagementCTA } from '@/components/landing/ProgressiveEngagementCTA';
import { WhoItsFor } from '@/components/landing/WhoItsFor';
import { useTheme } from 'next-themes';
import aiwmcLogoText from '@/assets/aiwmc-quantis-logo-text.png';
import { RmgHeader } from '@/components/landing/RmgHeader';
import { TIERS } from '@/config/tiers';

// Lazy-load below-fold sections
// Testimonials removed (2026-07-06): replaced by TrustStrip until real linkable founder profiles are verified.
import { TrustStrip } from '@/components/landing/TrustStrip';
import { SectionHeader } from '@/components/ui/glass-card';
const HowItWorksSection = lazy(() => import('@/components/landing/HowItWorksSection').then(m => ({ default: m.HowItWorksSection })));
const OpenTheHood = lazy(() => import('@/components/landing/OpenTheHood').then(m => ({ default: m.OpenTheHood })));
const FounderStory = lazy(() => import('@/components/landing/FounderStory').then(m => ({ default: m.FounderStory })));
const PricingSection = lazy(() => import('@/components/landing/PricingSection').then(m => ({ default: m.PricingSection })));
const FAQSection = lazy(() => import('@/components/landing/FAQSection').then(m => ({ default: m.FAQSection })));

const SectionSkeleton = ({ height = 400 }: { height?: number }) => (
  <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-16">
    <div className="w-full rounded-2xl bg-muted/30 animate-pulse" style={{ height }} />
  </div>
);

export default function Landing() {
  const { user } = useAuth();
  useBotDetection();
  const { theme, setTheme } = useTheme();
  const belowFoldSection = useLazySection({ rootMargin: '300px' });
  const faqSection = useLazySection({ rootMargin: '200px' });
  const heroRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  // SOW §6.1 funnel event: home_view fires once per session on landing
  useEffect(() => {
    recordFunnelEvent('home_view');
  }, []);

  return (
    <div className="min-h-screen rmg-surface dark text-[var(--rmg-text)]">
      <PageSEO
        title="AIWMC Quantis — AI Business Idea Validator"
        description={`Stress-test your business idea. AI-powered financial pre-mortem with ${BENCHMARK_COUNT_DISPLAY} benchmark data points. Free to start.`}
        canonical="/"
      />
      <StructuredData 
        includeFAQ
        faqItems={[
          { question: 'What is Quantis?', answer: `Quantis is an AI-powered business idea validator and startup viability calculator that runs a financial pre-mortem on any business idea. It stress-tests 12 financial variables using ${BENCHMARK_COUNT_DISPLAY} benchmark data points and 50+ city-level cost indices — the best free break-even calculator AI for entrepreneurs.` },
          { question: 'Is Quantis free to use?', answer: `Yes — every founder gets 1 free analysis with the headline viability score, top-3 risks, and basic revenue projection. The full report (Monte Carlo, 36-month P&L, unit economics, action plan, Pre-Mortem Stress Test, Invoice & Capacity Check) and unlimited analyses unlock with Plus at $${TIERS.plus.priceMonthly}/mo. No credit card required for the free analysis.` },
          { question: 'How accurate are the financial projections?', answer: `Quantis uses a deterministic financial engine calibrated against ${BENCHMARK_COUNT_DISPLAY} benchmark data points informed by ${BENCHMARK_SOURCES_DISPLAY}. Every projection includes a confidence score and assumption transparency so you know exactly what drives each number.` },
          { question: 'What does a "financial pre-mortem" mean?', answer: 'A pre-mortem identifies how your business could fail before you launch. Our financial stress test tool stress-tests revenue assumptions, cost structures, and unit economics to surface fatal flaws — like a rent-to-revenue ratio that guarantees losses.' },
          { question: 'How is Quantis different from ChatGPT or a spreadsheet?', answer: 'ChatGPT gives qualitative opinions. Spreadsheets require you to know the right formulas. Quantis combines a deterministic math engine with an AI narrator layer — giving you both precise, reproducible numbers and strategic context, cross-checked by a multi-model consensus pass.' },
        ]}
      />
      
      {/* Urgency banner removed — replaced by RMG status indicator in header */}

      
      {/* RMG Header — engraved wordmark, blueprint-grid surface */}
      <RmgHeader />


      <main id="main-content" role="main">
        {/* 0. Report-first hero — show a real PDF, then ask for inputs */}
        <div ref={heroRef} id="single-input-hero" data-hero-form>
          <ReportFirstHero />
        </div>

        {/* 1. Hero — Founder vs Reality (visual / story) */}
        <div id="mobile-hero">
          <MobileHero />
        </div>

        {/* 1.5. Social Proof Bar */}
        <SocialProofBar />

        {/* 1.6. Featured directories — clickable proof-of-presence chips */}
        <FeaturedDirectories />



        {/* 2. What Quantis Actually Does */}
        <QuantisOutputs />

        {/* 2.2. Who it's for — real navigation to /consultants and /use-cases,
            previously orphaned pages with zero internal links pointing to
            them anywhere in the app (2026-08-02 GTM-discoverability fix). */}
        <WhoItsFor />

        {/* 2.5. Progressive Engagement — low-friction example CTA */}
        <ProgressiveEngagementCTA />

        {/* 3–6: Lazy loaded sections */}
        <div ref={belowFoldSection.ref} style={{ minHeight: belowFoldSection.isVisible ? undefined : '600px' }}>
          {belowFoldSection.isVisible ? (
            <Suspense fallback={<SectionSkeleton height={600} />}>
              <TrustStrip />
              <HowItWorksSection />
              <OpenTheHood />
              <FounderStory />
            </Suspense>
          ) : (
            <SectionSkeleton height={600} />
          )}
        </div>

        {/* 7. Lead Capture — glass wrapper for visual continuity (MP2-DESIGN-01) */}
        <section aria-labelledby="starter-kit-heading" className="aiwmc-section-wash py-16 md:py-20">
          <div className="container max-w-3xl mx-auto px-4 sm:px-6">
            <SectionHeader
              eyebrow="Not ready to analyze yet?"
              title="Download the Founder Validation Starter Kit"
              subtitle="Business Model Canvas, Financial Projection Template, 20 AI Prompts, and a Risk Checklist — free."
            />
            <div className="mt-10 max-w-md mx-auto">
              <LeadCaptureInline />
            </div>
          </div>
        </section>

        {/* 8. Pricing */}
        <div ref={pricingRef}>
          <Suspense fallback={<SectionSkeleton height={400} />}>
            <PricingSection />
          </Suspense>
        </div>

        {/* 9. FAQ */}
        <div ref={faqSection.ref}>
          {faqSection.isVisible ? (
            <Suspense fallback={<SectionSkeleton height={400} />}>
              <FAQSection />
            </Suspense>
          ) : (
            <SectionSkeleton height={400} />
          )}
        </div>

        {/* 10. Bottom CTA — DELETED per MP2-DESIGN-01 SoW Screen 8.
                Duplicate of hero CTA + Screen 4 closer; solid-blue block broke
                the dark aesthetic and had contrast issues. Pricing (Section 8
                above) is the real closer, not a third "start free" repeat. */}

        {/* 11. Social Community Panel */}
        <SocialPanel />
      </main>

      <Footer />

      <StickyMobileCTA 
        heroFormRef={heroRef as React.RefObject<HTMLElement>} 
        pricingRef={pricingRef as React.RefObject<HTMLElement>} 
      />

      <div className="h-24 md:hidden" />
      <PopupManager />
    </div>
  );
}
