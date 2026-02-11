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
    title: 'AI Business Validation & Financial Structuring in Under 3 Minutes',
    subtitle: 'Upload your idea. Get structured financial logic, risk signals, projections, and clarity before you build.',
    ctaText: 'Validate My Idea — Free',
  },
  numbers_first: {
    title: 'Financial Logic, Risk Signals & Projections — in 3 Minutes',
    subtitle: 'Stop guessing. Get structured validation backed by 1,000+ industry benchmarks.',
    ctaText: 'Get My Free Validation',
  },
  action_focused: {
    title: 'Validate Before You Build — AI Financial Structuring',
    subtitle: 'Business model clarity, structured projections, and risk red flags — all AI-generated in minutes.',
    ctaText: 'Start Free Validation',
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
