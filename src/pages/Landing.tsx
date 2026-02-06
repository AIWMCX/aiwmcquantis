import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, FileText, TrendingUp, Target, Zap, ArrowRight, Building2, Moon, Sun, Menu } from 'lucide-react';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { MobileHero } from '@/components/landing/MobileHero';
import { MobileNav } from '@/components/layout/MobileNav';
import { PricingSection } from '@/components/landing/PricingSection';
import { UrgencyBanner } from '@/components/landing/UrgencyBanner';
import { TrustLogos } from '@/components/landing/TrustLogos';
import { Testimonials } from '@/components/landing/Testimonials';
import { useAuth } from '@/hooks/useAuth';
import { StructuredData } from '@/components/seo/StructuredData';
import { trackCtaClick, trackEvent } from '@/lib/analytics';
import { PopupManager } from '@/components/marketing/PopupManager';
import { Footer } from '@/components/layout/Footer';
import { useLazySection } from '@/hooks/useLazySection';
import { StickyMobileCTA } from '@/components/landing/StickyMobileCTA';

// Lazy load below-fold components for faster LCP
const DemoPreview = lazy(() => import('@/components/landing/DemoPreview').then(m => ({ default: m.DemoPreview })));
const ClientTestimonials = lazy(() => import('@/components/landing/ClientTestimonials').then(m => ({ default: m.ClientTestimonials })));
const FAQSection = lazy(() => import('@/components/landing/FAQSection').then(m => ({ default: m.FAQSection })));

// Section skeleton for lazy-loaded components
const SectionSkeleton = ({ height = 400 }: { height?: number }) => (
  <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-16">
    <Skeleton className={`w-full rounded-2xl`} style={{ height }} />
  </div>
);

export default function Landing() {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || !localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Progressive hydration for below-fold sections
  const demoSection = useLazySection({ rootMargin: '300px' });
  const testimonialsSection = useLazySection({ rootMargin: '200px' });
  const faqSection = useLazySection({ rootMargin: '200px' });
  
  // Refs for sticky CTA observer
  const heroRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const features = [{
    icon: BarChart3,
    title: 'Financial Projections',
    description: 'Get accurate ROI, payback period, and revenue forecasts based on real market data.'
  }, {
    icon: FileText,
    title: 'Complete Business Plan',
    description: 'Receive a step-by-step launch roadmap with specific milestones and actions.'
  }, {
    icon: TrendingUp,
    title: 'Marketing Strategy',
    description: 'Discover optimal customer acquisition channels with CAC/LTV calculations.'
  }, {
    icon: Target,
    title: 'Market Analysis',
    description: 'Understand your competition, market size, and growth opportunities.'
  }, {
    icon: Zap,
    title: 'AI-Powered Insights',
    description: 'Leverage advanced AI to uncover hidden opportunities and risks.'
  }, {
    icon: Building2,
    title: 'Location Intelligence',
    description: 'Analysis tailored to your specific geographic market and demographics.'
  }];

  // Stats for social proof
  const stats = [{
    value: '1,000+',
    label: 'Industry Benchmarks'
  }, {
    value: '12',
    label: 'Financial Variables'
  }, {
    value: '<2 min',
    label: 'Analysis Time'
  }, {
    value: '3',
    label: 'Scenario Types'
  }];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Structured Data for SEO */}
      <StructuredData />
      
      {/* Urgency Banner */}
      <UrgencyBanner />
      
      {/* Navigation - Mobile optimized with hamburger menu */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Mobile hamburger menu - CSS-based visibility for immediate render */}
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
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#demo-preview" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Demo</a>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={() => setDarkMode(!darkMode)} 
                className="p-2.5 rounded-lg hover:bg-accent transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center" 
                aria-label="Toggle theme"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              {user ? (
                <>
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                    <span className="text-sm text-foreground truncate max-w-[120px]">
                      {user.email}
                    </span>
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
        {/* Hero Section - Mobile Optimized (Critical - loads immediately) */}
        <div ref={heroRef} id="mobile-hero" data-hero-form>
          <MobileHero />
        </div>
        {/* Trust Logos - Social proof */}
        <TrustLogos />

        {/* Testimonials - Social proof */}
        <Testimonials />

        {/* Demo Preview - Complementary visual demo */}
        <div ref={demoSection.ref} id="demo-preview">
          {demoSection.isVisible ? (
            <Suspense fallback={<SectionSkeleton height={400} />}>
              <DemoPreview />
            </Suspense>
          ) : (
            <SectionSkeleton height={400} />
          )}
        </div>

      {/* Client Testimonials - Progressive hydration */}
      <div ref={testimonialsSection.ref}>
        {testimonialsSection.isVisible ? (
          <Suspense fallback={<SectionSkeleton height={300} />}>
            <ClientTestimonials />
          </Suspense>
        ) : (
          <SectionSkeleton height={300} />
        )}
      </div>

      {/* Features Section (Critical - loads immediately) */}
      <section id="features" className="py-16 md:py-24 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Validate Your Idea
            </h2>
            <p className="text-base md:text-lg text-muted-foreground">
              Our AI analyzes your business concept and delivers actionable insights 
              that would take consultants weeks to produce.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {features.map(feature => (
              <div key={feature.title} className="group p-4 md:p-8 rounded-2xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg min-h-[140px] md:min-h-0">
                <div className="p-2.5 md:p-4 rounded-xl bg-primary/10 w-fit mb-3 md:mb-6 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-5 h-5 md:w-8 md:h-8 text-primary" />
                </div>
                <h3 className="text-sm md:text-xl font-semibold text-foreground mb-1 md:mb-3">{feature.title}</h3>
                <p className="text-xs md:text-base text-muted-foreground leading-relaxed line-clamp-3 md:line-clamp-none">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Pricing Section - Optimized for conversion */}
      <div ref={pricingRef}>
        <PricingSection />
      </div>
      {/* FAQ Section - Progressive hydration */}
      <div ref={faqSection.ref}>
        {faqSection.isVisible ? (
          <Suspense fallback={<SectionSkeleton height={400} />}>
            <FAQSection />
          </Suspense>
        ) : (
          <SectionSkeleton height={400} />
        )}
      </div>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-primary p-8 md:p-16 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
            <div className="relative">
              <h2 className="text-2xl md:text-4xl font-bold text-primary-foreground mb-4">
                Ready to Validate Your Business Idea?
              </h2>
              <p className="text-base md:text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-6 md:mb-8">
                Join entrepreneurs using AI-powered analysis. 
                Start free, no credit card required.
              </p>
              <Link to="/app" onClick={() => trackCtaClick('start_free_analysis', 'bottom_cta')}>
                <Button size="lg" variant="secondary" className="gap-2 text-base md:text-lg px-6 md:px-8 py-6 min-h-[56px]">
                  Start Your Free Analysis
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      </main>

      {/* Footer with Email Capture */}
      <Footer />

      {/* Smart Mobile Sticky CTA */}
      <StickyMobileCTA 
        heroFormRef={heroRef as React.RefObject<HTMLElement>} 
        pricingRef={pricingRef as React.RefObject<HTMLElement>} 
      />

      {/* Bottom padding for mobile sticky CTA */}
      <div className="h-24 md:hidden" />
      {/* Popup Manager - Handles all email capture popups */}
      <PopupManager />
    </div>
  );
}
