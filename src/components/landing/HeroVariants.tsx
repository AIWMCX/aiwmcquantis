import React from 'react';
import { useExperiment, HERO_HEADLINES, trackExperimentConversion } from '@/lib/abTesting';
import { trackEvent } from '@/lib/analytics';

// Hero headline variants for A/B testing
export interface HeroContent {
  title: string;
  subtitle: string;
  ctaText: string;
}

// Extended CTA variants beyond the existing headlines
export const HERO_CTA_VARIANTS: Record<string, HeroContent> = {
  control: {
    title: 'Know If Your Business Will Make Money',
    subtitle: 'AI-powered analysis that turns your idea into a complete financial roadmap in 2 minutes.',
    ctaText: 'See My Preview Numbers',
  },
  numbers_first: {
    title: 'ROI, Payback, Revenue — Calculated in 2 Minutes',
    subtitle: 'Stop guessing. Get precise financial projections backed by 1,000+ industry benchmarks.',
    ctaText: 'Get My Free Analysis',
  },
  action_focused: {
    title: 'Turn Your Business Idea Into a Funded Plan',
    subtitle: 'Bank-ready financial projections, market analysis, and launch roadmap — all AI-generated.',
    ctaText: 'Start Free → 2 Min',
  },
};

/**
 * Hook to get the current hero variant
 * Returns the headline content and tracks exposure
 */
export function useHeroVariant(): HeroContent {
  const variant = useExperiment('hero_headline');
  
  // Map to extended content
  const content = HERO_CTA_VARIANTS[variant] || HERO_CTA_VARIANTS.control;
  
  return content;
}

/**
 * Track when user clicks the hero CTA
 */
export function trackHeroCTAClick(ctaLocation: string): void {
  trackExperimentConversion('hero_headline', 'hero_cta_click', 1);
  trackEvent('hero_cta_clicked', { location: ctaLocation });
}

/**
 * Track form start from hero
 */
export function trackHeroFormStart(): void {
  trackExperimentConversion('hero_headline', 'form_start', 1);
  trackEvent('hero_form_started');
}

/**
 * Track form completion from hero
 */
export function trackHeroFormComplete(): void {
  trackExperimentConversion('hero_headline', 'form_complete', 1);
  trackEvent('hero_form_completed');
}

// Type for hero headline experiment
export type HeroHeadlineVariant = 'control' | 'numbers_first' | 'action_focused';

interface HeroVariantDisplayProps {
  variant: HeroHeadlineVariant;
  className?: string;
}

/**
 * Component that renders the appropriate hero content based on variant
 * Can be used for debugging or server-side rendering
 */
export const HeroVariantDisplay = React.memo(function HeroVariantDisplay({
  variant,
  className,
}: HeroVariantDisplayProps) {
  const content = HERO_CTA_VARIANTS[variant] || HERO_CTA_VARIANTS.control;
  
  return (
    <div className={className}>
      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
        {content.title}
      </h1>
      <p className="mt-4 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl">
        {content.subtitle}
      </p>
    </div>
  );
});
