import React, { lazy, Suspense, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Moon, Sun, Menu } from 'lucide-react';
import { MobileHero } from '@/components/landing/MobileHero';
import { BeforeAfterComparison } from '@/components/landing/BeforeAfterComparison';
import { ROICalculator } from '@/components/landing/ROICalculator';
import { MobileNav } from '@/components/layout/MobileNav';
import { UrgencyBanner } from '@/components/landing/UrgencyBanner';
import { ResultsTicker } from '@/components/landing/ResultsTicker';
import { useAuth } from '@/hooks/useAuth';
import { StructuredData } from '@/components/seo/StructuredData';
import { trackCtaClick } from '@/lib/analytics';
import { PopupManager } from '@/components/marketing/PopupManager';
import { Footer } from '@/components/layout/Footer';
import { useLazySection } from '@/hooks/useLazySection';
import { StickyMobileCTA } from '@/components/landing/StickyMobileCTA';
import { WhoItsFor } from '@/components/landing/WhoItsFor';
import { RiskGalleryTeaser } from '@/components/landing/RiskGalleryTeaser';
import { LeadCaptureInline } from '@/components/landing/LeadCaptureInline';
import { useTheme } from 'next-themes';
import aiwmcLogoText from '@/assets/aiwmc-quantis-logo-text.png';

// Lazy-load below-fold sections to reduce initial JS and speed up FCP
const TrustLogos = lazy(() => import('@/components/landing/TrustLogos').then(m => ({ default: m.TrustLogos })));
const DemoPreview = lazy(() => import('@/components/landing/DemoPreview').then(m => ({ default: m.DemoPreview })));
const HowItWorksSection = lazy(() => import('@/components/landing/HowItWorksSection').then(m => ({ default: m.HowItWorksSection })));
const Testimonials = lazy(() => import('@/components/landing/Testimonials').then(m => ({ default: m.Testimonials })));
const PricingSection = lazy(() => import('@/components/landing/PricingSection').then(m => ({ default: m.PricingSection })));
const FAQSection = lazy(() => import('@/components/landing/FAQSection').then(m => ({ default: m.FAQSection })));

const SectionSkeleton = ({ height = 400 }: { height?: number }) => (
  <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-16">
    <Skeleton className="w-full rounded-2xl" style={{ height }} />
  </div>
);

export default function Landing() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const faqSection = useLazySection({ rootMargin: '200px' });
  const belowFoldSection = useLazySection({ rootMargin: '300px' });
  const heroRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StructuredData 
        includeFAQ
        faqItems={[
          { question: 'What is Quantis?', answer: 'Quantis is an AI-powered business validation platform that runs a financial pre-mortem on any startup idea in 90 seconds. It stress-tests 12 financial variables using 1,000+ industry benchmarks and 50+ city-level cost indices.' },
          { question: 'Is Quantis free to use?', answer: 'Yes. The free plan includes 3 full analyses per month with revenue projections, risk flags, and action plans. No credit card required.' },
          { question: 'How accurate are the financial projections?', answer: 'Quantis uses a deterministic financial engine calibrated against 1,000+ industry benchmarks from public datasets (BLS, Census, IBISWorld). Every projection includes a confidence score and assumption transparency so you know exactly what drives each number.' },
          { question: 'What does a "financial pre-mortem" mean?', answer: 'A pre-mortem identifies how your business could fail before you launch. Quantis stress-tests revenue assumptions, cost structures, and unit economics to surface fatal flaws — like a rent-to-revenue ratio that guarantees losses.' },
          { question: 'How is Quantis different from ChatGPT or a spreadsheet?', answer: 'ChatGPT gives qualitative opinions. Spreadsheets require you to know the right formulas. Quantis combines a deterministic math engine with AI-generated insights — giving you both precise numbers and strategic context, validated by dual-AI consensus.' },
          { question: 'What industries does Quantis support?', answer: 'Quantis covers 100+ industry types including SaaS, restaurants, e-commerce, consulting, fitness studios, food trucks, real estate, and more. Each industry has calibrated benchmarks for margins, CAC, LTV, churn, and fixed costs.' },
          { question: 'Can I export my analysis as a PDF?', answer: 'Yes. Plus plan users ($17/mo) can export branded PDF reports, generate business plan documents, pitch decks, and NDAs through the Document Studio.' },
          { question: 'Does Quantis adjust for my city or location?', answer: 'Yes. Quantis includes location intelligence for 50+ global cities, adjusting rent, salary, utilities, and cost-of-living multipliers to give you location-specific projections.' },
          { question: 'What is the Plus plan?', answer: 'Plus costs $17/month and includes unlimited analyses, PDF export, Document Studio (business plans, pitch decks, NDAs), custom branding, Monte Carlo simulation, and priority support.' },
          { question: 'Is my data secure?', answer: 'Yes. All data is encrypted in transit and at rest. We use Supabase with Row-Level Security, and personal data is never shared with third parties. See our Privacy Policy for details.' }
        ]}
      />
      
      {/* 1. UrgencyBanner */}
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
              <img src={aiwmcLogoText} alt="AIWMC Quantis" width={136} height={40} className="h-8 sm:h-10 w-auto object-contain dark:invert" />
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
                      <span className="hidden sm:inline">Get Started</span>
                      <span className="sm:hidden">Start Analysis</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main id="main-content" role="main">
        {/* 2. Hero */}
        <div ref={heroRef} id="mobile-hero" data-hero-form>
          <MobileHero />
        </div>

        {/* Before/After Value Comparison */}
        <BeforeAfterComparison />

        {/* 3. Trust Signals — immediately after hero */}
        <div ref={belowFoldSection.ref}>
          {belowFoldSection.isVisible ? (
            <Suspense fallback={<SectionSkeleton height={200} />}>
              <TrustLogos />

              {/* 4. Demo Preview — instant value */}
              <DemoPreview />

              {/* 5. Results Ticker */}
              <ResultsTicker />

              {/* 6. ROI Calculator */}
              <ROICalculator />

              {/* 7. How It Works (condensed) */}
              <HowItWorksSection />

              {/* 8. Use Cases */}
              <Testimonials />

              {/* Who It's For */}
              <WhoItsFor />

              {/* Risk Gallery Teaser */}
              <RiskGalleryTeaser />
            </Suspense>
          ) : (
            <SectionSkeleton height={800} />
          )}
        </div>

        {/* 8. Lead Capture */}
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

        {/* 9. Pricing */}
        <div ref={pricingRef}>
          <Suspense fallback={<SectionSkeleton height={400} />}>
            <PricingSection />
          </Suspense>
        </div>

        {/* 10. FAQ */}
        <div ref={faqSection.ref}>
          {faqSection.isVisible ? (
            <Suspense fallback={<SectionSkeleton height={400} />}>
              <FAQSection />
            </Suspense>
          ) : (
            <SectionSkeleton height={400} />
          )}
        </div>

        {/* 11. Bottom CTA */}
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
                    Run Free Pre-Mortem
                    <ArrowRight className="w-5 h-5" />
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
