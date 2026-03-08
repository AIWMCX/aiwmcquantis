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
    title: 'Find Out Exactly Where Your Business Model Breaks — Before You Spend a Dollar',
    subtitle: 'Enter your idea. Get a full financial stress-test with risk map, cash-flow projection, and scenario analysis. Powered by dual AI engines + 1,000+ verified benchmarks.',
    ctaText: 'Run Free Stress-Test',
  },
  numbers_first: {
    title: 'Stress-Test Your Business Model with Dual AI Engines — in 3 Minutes',
    subtitle: 'See which assumptions are fragile. Get risk flags, revenue corridors, and an investor-ready action plan backed by 1,000+ benchmarks.',
    ctaText: 'Get My Free Analysis',
  },
  action_focused: {
    title: 'Revenue Projections, Risk Map & Scenario Stress-Tests — Before You Build',
    subtitle: 'GPT + Gemini dual-verified financial analysis. Click any number to see the formula and benchmark behind it.',
    ctaText: 'Start Free Stress-Test',
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
