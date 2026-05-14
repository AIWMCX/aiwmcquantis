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
import { useLazySection } from '@/hooks/useLazySection';
import { StickyMobileCTA } from '@/components/landing/StickyMobileCTA';
import { LeadCaptureInline } from '@/components/landing/LeadCaptureInline';
import { SocialProofBar } from '@/components/landing/SocialProofBar';
import { ProgressiveEngagementCTA } from '@/components/landing/ProgressiveEngagementCTA';
import { useTheme } from 'next-themes';
import aiwmcLogoText from '@/assets/aiwmc-quantis-logo-text.png';

// Lazy-load below-fold sections
const Testimonials = lazy(() => import('@/components/landing/Testimonials').then(m => ({ default: m.Testimonials })));
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
    <div className="min-h-screen bg-background text-foreground">
      <PageSEO
        title="AIWMC Quantis — Audit-grade business validation"
        description="Deterministic financial engine + 95,500 verified benchmarks. Stress-test any business idea before the first dollar is spent. Free to start."
        canonical="/"
      />
      <StructuredData 
        includeFAQ
        faqItems={[
          { question: 'What is Quantis?', answer: 'Quantis is an AI-powered business idea validator and startup viability calculator that runs a financial pre-mortem on any business idea in 90 seconds. It stress-tests 12 financial variables using 95,500 industry benchmarks and 50+ city-level cost indices — the best free break-even calculator AI for entrepreneurs.' },
          { question: 'Is Quantis free to use?', answer: 'Yes — every founder gets 1 free analysis with the headline viability score, top-3 risks, and basic revenue projection. The full report (Monte Carlo, 36-month P&L, unit economics, action plan, Pre-Mortem Stress Test, Invoice & Capacity Check) and unlimited analyses unlock with Plus at $17/mo. No credit card required for the free analysis.' },
          { question: 'How accurate are the financial projections?', answer: 'Quantis uses a deterministic financial engine calibrated against 95,500 industry benchmarks from public datasets (BLS, Census, IBISWorld). Every projection includes a confidence score and assumption transparency so you know exactly what drives each number. Our business plan risk analysis tools are trusted by founders worldwide.' },
          { question: 'What does a "financial pre-mortem" mean?', answer: 'A pre-mortem identifies how your business could fail before you launch. Our financial stress test tool stress-tests revenue assumptions, cost structures, and unit economics to surface fatal flaws — like a rent-to-revenue ratio that guarantees losses.' },
          { question: 'How is Quantis different from ChatGPT or a spreadsheet?', answer: 'ChatGPT gives qualitative opinions. Spreadsheets require you to know the right formulas. Quantis combines a deterministic math engine with AI-generated insights — giving you both precise numbers and strategic context, validated by dual-AI consensus. It\'s the most accurate business idea validator available.' },
        ]}
      />
      
      {/* Urgency Banner */}
      <UrgencyBanner />
      
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="md:hidden">
              <MobileNav>
                <button 
                  className="p-2.5 rounded-lg hover:bg-accent transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center"
                  aria-label="Open navigation menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </MobileNav>
            </div>
            
            <Link to={user ? '/app' : '/'} className="flex items-center gap-2">
              <img src={aiwmcLogoText} alt="​AIWMC™ Quantis" width={136} height={40} className="h-8 sm:h-10 w-auto object-contain dark:invert" />
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
              <Link to="/use-cases" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Use Cases</Link>
              <Link to="/examples" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Examples</Link>
              <Link to="/risk-gallery" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Risk Gallery</Link>
              <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
                className="p-2.5 rounded-lg hover:bg-accent transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center" 
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              {user ? (
                <>
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                    <span className="text-sm text-foreground truncate max-w-[120px]">{user.email}</span>
                  </div>
                  <Link to="/app">
                    <Button size="sm" className="gap-2 min-h-[52px] px-5 text-sm font-semibold">
                      Go to App <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/auth" className="hidden sm:block">
                    <Button variant="ghost" size="sm" className="min-h-[48px]">Sign In</Button>
                  </Link>
                  <Link to="/app">
                    <Button size="sm" className="gap-2 min-h-[52px] px-5 text-sm font-semibold">
                      Start Free Analysis →
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main id="main-content" role="main">
        {/* 1. Hero — Founder vs Reality */}
        <div ref={heroRef} id="mobile-hero" data-hero-form>
          <MobileHero />
        </div>

        {/* 1.5. Social Proof Bar */}
        <SocialProofBar />

        {/* 2. What Quantis Actually Does */}
        <QuantisOutputs />

        {/* 2.5. Progressive Engagement — low-friction example CTA */}
        <ProgressiveEngagementCTA />

        {/* 3–6: Lazy loaded sections */}
        <div ref={belowFoldSection.ref} style={{ minHeight: belowFoldSection.isVisible ? undefined : '600px' }}>
          {belowFoldSection.isVisible ? (
            <Suspense fallback={<SectionSkeleton height={600} />}>
              <Testimonials />
              <HowItWorksSection />
              <OpenTheHood />
              <FounderStory />
            </Suspense>
          ) : (
            <SectionSkeleton height={600} />
          )}
        </div>

        {/* 7. Lead Capture */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Not ready to analyze yet?</p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Download the Founder Validation Starter Kit
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Business Model Canvas, Financial Projection Template, 20 AI Prompts, and a Risk Checklist — free.
            </p>
            <div className="max-w-md mx-auto">
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

        {/* 10. Bottom CTA */}
        <section className="py-16 md:py-24">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-primary p-8 md:p-16 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
              <div className="relative">
                <h2 className="text-2xl md:text-4xl font-bold text-primary-foreground mb-4">
                  Run a Pre-Mortem on Your Business Model — Free
                </h2>
                <p className="text-base md:text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-6 md:mb-8">
                  See fatal assumptions, stress-test scenarios, and get a clear
                  proceed/pivot/kill verdict. Dual AI-verified, no credit card.
                </p>
                <Link to="/app" onClick={() => trackCtaClick('run_pre_mortem', 'bottom_cta')}>
                  <Button size="lg" variant="secondary" className="gap-2 text-base md:text-lg px-6 md:px-8 py-6 min-h-[56px] hover:scale-[1.02] transition-transform">
                    Start Free Analysis →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
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
