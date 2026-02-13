import React, { lazy, Suspense, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Moon, Sun, Menu } from 'lucide-react';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { MobileHero } from '@/components/landing/MobileHero';
import { MobileNav } from '@/components/layout/MobileNav';
import { PricingSection } from '@/components/landing/PricingSection';
import { UrgencyBanner } from '@/components/landing/UrgencyBanner';
import { TrustLogos } from '@/components/landing/TrustLogos';
import { Testimonials } from '@/components/landing/Testimonials';
import { ResultsTicker } from '@/components/landing/ResultsTicker';
import { DemoPreview } from '@/components/landing/DemoPreview';
import { useAuth } from '@/hooks/useAuth';
import { StructuredData } from '@/components/seo/StructuredData';
import { trackCtaClick } from '@/lib/analytics';
import { PopupManager } from '@/components/marketing/PopupManager';
import { Footer } from '@/components/layout/Footer';
import { useLazySection } from '@/hooks/useLazySection';
import { StickyMobileCTA } from '@/components/landing/StickyMobileCTA';
import { LeadCaptureInline } from '@/components/landing/LeadCaptureInline';
import { useTheme } from 'next-themes';

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
  const heroRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <StructuredData />
      
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
              <span className="text-lg sm:text-xl font-bold text-foreground">AIWMC Quantis<sup className="text-xs align-super">™</sup></span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <Link to="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
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
                      <span className="sm:hidden">Start</span>
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

        {/* 3. Results Ticker */}
        <ResultsTicker />

        {/* 4. Trust Signals */}
        <TrustLogos />

        {/* 5. Demo Preview */}
        <DemoPreview />

        {/* 6. How It Works (condensed) */}
        <HowItWorksSection />

        {/* 7. Use Cases */}
        <Testimonials />

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
          <PricingSection />
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
                  Your Idea Deserves Real Numbers
                </h2>
                <p className="text-base md:text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-6 md:mb-8">
                  Revenue projections, risk flags, and a clear action plan —
                  free, no credit card, results in under 3 minutes.
                </p>
                <Link to="/app" onClick={() => trackCtaClick('start_free_analysis', 'bottom_cta')}>
                  <Button size="lg" variant="secondary" className="gap-2 text-base md:text-lg px-6 md:px-8 py-6 min-h-[56px] hover:scale-[1.02] transition-transform">
                    See My Numbers — Free
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
