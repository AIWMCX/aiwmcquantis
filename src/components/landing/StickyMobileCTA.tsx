import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Lock, Loader2, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { trackCtaClick, trackEvent } from '@/lib/analytics';

interface StickyMobileCTAProps {
  isLoading?: boolean;
  heroFormRef?: React.RefObject<HTMLElement>;
  pricingRef?: React.RefObject<HTMLElement>;
}

type CTAState = 'compact' | 'full' | 'loading' | 'hidden';

export const StickyMobileCTA = React.memo(function StickyMobileCTA({
  isLoading = false,
  heroFormRef,
  pricingRef,
}: StickyMobileCTAProps) {
  const [ctaState, setCtaState] = useState<CTAState>('compact');
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const hasTrackedVisibility = useRef(false);

  // Handle loading state
  useEffect(() => {
    if (isLoading) {
      setCtaState('loading');
    } else if (ctaState === 'loading') {
      setCtaState('full');
    }
  }, [isLoading, ctaState]);

  // Track CTA visibility
  const trackVisibility = useCallback((state: CTAState) => {
    if (!hasTrackedVisibility.current && state === 'full') {
      trackEvent('sticky_cta_visible', { state });
      hasTrackedVisibility.current = true;
    }
  }, []);

  // IntersectionObserver for hero and pricing sections
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px',
    };

    let heroVisible = true;
    let pricingVisible = false;

    const updateState = () => {
      if (isLoading) {
        setCtaState('loading');
      } else if (pricingVisible) {
        setCtaState('hidden');
        setIsVisible(false);
      } else if (heroVisible) {
        setCtaState('compact');
        setIsVisible(true);
      } else {
        setCtaState('full');
        setIsVisible(true);
        trackVisibility('full');
      }
    };

    const heroObserver = new IntersectionObserver((entries) => {
      heroVisible = entries[0]?.isIntersecting ?? false;
      updateState();
    }, observerOptions);

    const pricingObserver = new IntersectionObserver((entries) => {
      pricingVisible = entries[0]?.isIntersecting ?? false;
      updateState();
    }, observerOptions);

    // Observe hero section
    if (heroFormRef?.current) {
      heroObserver.observe(heroFormRef.current);
    } else {
      // Fallback: find hero by ID
      const heroElement = document.querySelector('#mobile-hero') || document.querySelector('[data-hero-form]');
      if (heroElement) {
        heroObserver.observe(heroElement);
      }
    }

    // Observe pricing section
    if (pricingRef?.current) {
      pricingObserver.observe(pricingRef.current);
    } else {
      // Fallback: find pricing by ID
      const pricingElement = document.getElementById('pricing');
      if (pricingElement) {
        pricingObserver.observe(pricingElement);
      }
    }

    return () => {
      heroObserver.disconnect();
      pricingObserver.disconnect();
    };
  }, [heroFormRef, pricingRef, isLoading, trackVisibility]);

  // Hide on scroll down, show on scroll up (optional enhancement)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY > lastScrollY.current && currentScrollY > 100;
      
      // Only hide when in compact mode and scrolling down
      if (ctaState === 'compact' && scrollingDown) {
        setIsVisible(false);
      } else if (!scrollingDown) {
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [ctaState]);

  const handleCTAClick = () => {
    trackCtaClick('see_my_numbers', 'mobile_sticky_smart');
    trackEvent('mobile_smart_cta_clicked', { state: ctaState });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    trackEvent('mobile_cta_scroll_top');
  };

  // Don't render on desktop
  if (typeof window !== 'undefined' && window.innerWidth >= 768) {
    return null;
  }

  if (ctaState === 'hidden') {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden',
        'bg-background/95 backdrop-blur-xl border-t border-border',
        'transform transition-transform duration-300 ease-out',
        'safe-area-pb',
        isVisible ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      {/* Loading State */}
      {ctaState === 'loading' && (
        <div className="p-4">
          <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Analyzing your idea...</p>
              <p className="text-xs text-muted-foreground">Usually takes 15-30 seconds</p>
            </div>
          </div>
        </div>
      )}

      {/* Compact State - Trust badges only */}
      {ctaState === 'compact' && (
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" />
              <span>Bank-level security</span>
              <span className="text-muted-foreground/50">•</span>
              <span>2 min analysis</span>
            </div>
            <button
              onClick={scrollToTop}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Scroll to top"
            >
              <ArrowUp className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Full State - CTA button */}
      {ctaState === 'full' && (
        <div className="p-3">
          <Link to="/app" className="block" onClick={handleCTAClick}>
            <Button
              size="lg"
              className={cn(
                'w-full gap-2 py-6 text-base font-semibold',
                'shadow-2xl min-h-[56px]',
                'bg-primary hover:bg-primary/90',
                'animate-pulse-subtle'
              )}
            >
              <Sparkles className="w-5 h-5" />
              Validate My Idea — Free
            </Button>
          </Link>
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>Bank-level security</span>
            <span className="text-muted-foreground/50">•</span>
            <span>No credit card</span>
          </div>
        </div>
      )}
    </div>
  );
});
