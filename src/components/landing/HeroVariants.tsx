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
    title: 'Find out what will kill your business — before it costs you everything.',
    subtitle: 'Quantis runs a financial pre-mortem on your business model. See fatal assumptions, stress-test scenarios, and get a clear proceed/pivot/kill verdict. In 90 seconds.',
    ctaText: 'Run Free Pre-Mortem',
  },
  numbers_first: {
    title: '3 fatal assumptions. 36-month stress-test. One clear verdict.',
    subtitle: 'Every number sourced. Every assumption challenged. Know exactly where your model breaks before you invest a dollar.',
    ctaText: 'Run Free Pre-Mortem',
  },
  action_focused: {
    title: 'Should you commit $50k to this idea? Find out in 90 seconds.',
    subtitle: 'Dual AI engines run a forensic pre-mortem on your business model — financial, market, and operational. Get a proceed/pivot/kill verdict.',
    ctaText: 'Run Free Pre-Mortem',
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
      <h1 className="text-display text-[var(--q-text-primary)] leading-tight">
        {content.title}
      </h1>
      <p className="mt-4 text-body text-[var(--q-text-secondary)] max-w-2xl">
        {content.subtitle}
      </p>
    </div>
  );
});
