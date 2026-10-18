import React from 'react';
import { useExperiment, HERO_HEADLINES, trackExperimentConversion } from '@/lib/abTesting';
import { trackEvent } from '@/lib/analytics';
import { BENCHMARK_COUNT_DISPLAY, BENCHMARK_SOURCES_DISPLAY } from '@/config/canonical-facts';

// Hero headline variants for A/B testing
export interface HeroContent {
  title: string;
  subtitle: string;
  ctaText: string;
}

// Extended CTA variants beyond the existing headlines
export const HERO_CTA_VARIANTS: Record<string, HeroContent> = {
  // Audit-approved control (2026-06-22): personalises stakes, time-bounds the promise,
  // bridges directly to outcome. Replaces the old "90% fail" stat headline (no urgency, no bridge).
  control: {
    title: 'Before you invest $50K, understand what it would take to earn it back.',
    subtitle: `Quantis stress-tests your idea against a ${BENCHMARK_COUNT_DISPLAY}-cell modeled benchmark grid informed by ${BENCHMARK_SOURCES_DISPLAY} and returns a profitability verdict and reliability score. No credit card. First analysis free.`,
    ctaText: 'Stress-test my idea — free',
  },
  numbers_first: {
    title: 'Your business idea has 3 fatal assumptions. We’ll find them.',
    subtitle: 'Deterministic engine. 12 financial variables. 1,000 Monte Carlo runs. Full assumption transparency — see exactly where your model breaks before you spend a dollar.',
    ctaText: 'Find my 3 fatal assumptions — free',
  },
  action_focused: {
    title: `Every number in your business plan is a guess. Stress-test them against ${BENCHMARK_COUNT_DISPLAY} modeled benchmarks — free.`,
    subtitle: 'Multi-model consensus on financial, market, and operational risk. Get a profitability verdict and reliability score with a saveable PDF.',
    ctaText: 'Run my free stress-test',
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
