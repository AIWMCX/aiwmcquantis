/**
 * A/B Testing Infrastructure
 * 
 * Lightweight feature flag and experiment system for testing:
 * - Hero headlines
 * - CTA button colors/text
 * - Pricing display variations
 * 
 * Features:
 * - Persistent variant assignment (localStorage)
 * - Analytics integration
 * - Type-safe experiment definitions
 */

import { trackEvent } from './analytics';

// ============================================
// Experiment Definitions
// ============================================

export interface Experiment<T extends string> {
  id: string;
  variants: T[];
  /** Weight distribution (must sum to 1.0) */
  weights?: number[];
  /** Whether to track exposures automatically */
  trackExposure?: boolean;
}

// Define all experiments here
export const EXPERIMENTS = {
  hero_headline: {
    id: 'hero_headline_v1',
    variants: ['control', 'numbers_first', 'action_focused'] as const,
    weights: [0.34, 0.33, 0.33],
    trackExposure: true,
  },
  cta_color: {
    id: 'cta_color_v1',
    variants: ['primary', 'success', 'gradient'] as const,
    weights: [0.34, 0.33, 0.33],
    trackExposure: true,
  },
  pricing_display: {
    id: 'pricing_display_v1',
    variants: ['control', 'value_anchor', 'comparison_table', 'annual_first'] as const,
    weights: [0.25, 0.25, 0.25, 0.25],
    trackExposure: true,
  },
  demo_preview_style: {
    id: 'demo_preview_v1',
    variants: ['animated', 'static', 'interactive'] as const,
    weights: [0.34, 0.33, 0.33],
    trackExposure: true,
  },
} as const;

type ExperimentKey = keyof typeof EXPERIMENTS;
type ExperimentVariant<K extends ExperimentKey> = (typeof EXPERIMENTS)[K]['variants'][number];

// ============================================
// Storage Keys
// ============================================

const STORAGE_KEY_PREFIX = 'ab_experiment_';
const USER_ID_KEY = 'ab_user_id';

/**
 * Get or create a stable user ID for experiment assignment
 */
function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

/**
 * Deterministic hash function for consistent variant assignment
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Select a variant based on weights
 */
function selectVariantByWeight<T extends string>(
  variants: readonly T[],
  weights: number[] | undefined,
  seed: number
): T {
  // Normalize seed to 0-1 range
  const normalizedSeed = (seed % 1000) / 1000;
  
  if (!weights || weights.length !== variants.length) {
    // Equal distribution
    const index = Math.floor(normalizedSeed * variants.length);
    return variants[Math.min(index, variants.length - 1)];
  }
  
  // Weighted distribution
  let cumulative = 0;
  for (let i = 0; i < variants.length; i++) {
    cumulative += weights[i];
    if (normalizedSeed < cumulative) {
      return variants[i];
    }
  }
  
  return variants[variants.length - 1];
}

// ============================================
// Core Functions
// ============================================

/**
 * Get the variant for a specific experiment
 * Assigns and persists variant if not already assigned
 */
export function getVariant<K extends ExperimentKey>(
  experimentKey: K
): ExperimentVariant<K> {
  const experiment = EXPERIMENTS[experimentKey];
  const storageKey = `${STORAGE_KEY_PREFIX}${experiment.id}`;
  
  // Check for existing assignment
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored && (experiment.variants as readonly string[]).includes(stored)) {
      return stored as ExperimentVariant<K>;
    }
  }
  
  // Assign new variant
  const userId = getOrCreateUserId();
  const seed = hashString(`${userId}_${experiment.id}`);
  const weights = experiment.weights ? [...experiment.weights] : undefined;
  const variant = selectVariantByWeight(
    experiment.variants,
    weights,
    seed
  );
  
  // Persist assignment
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey, variant);
  }
  
  // Track exposure if enabled
  if (experiment.trackExposure) {
    trackExperimentExposure(experimentKey, variant as ExperimentVariant<K>);
  }
  
  return variant as ExperimentVariant<K>;
}

/**
 * Track when a user is exposed to an experiment variant
 */
export function trackExperimentExposure<K extends ExperimentKey>(
  experimentKey: K,
  variant: ExperimentVariant<K>
): void {
  const experiment = EXPERIMENTS[experimentKey];
  
  // Only track once per session
  const sessionKey = `ab_exposed_${experiment.id}`;
  if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey)) {
    return;
  }
  
  trackEvent('experiment_exposure', {
    experiment_id: experiment.id,
    variant,
    timestamp: new Date().toISOString(),
  });
  
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(sessionKey, 'true');
  }
}

/**
 * Track a conversion event for an experiment
 */
export function trackExperimentConversion<K extends ExperimentKey>(
  experimentKey: K,
  conversionType: string,
  value?: number
): void {
  const experiment = EXPERIMENTS[experimentKey];
  const storageKey = `${STORAGE_KEY_PREFIX}${experiment.id}`;
  const variant = typeof window !== 'undefined' 
    ? localStorage.getItem(storageKey) 
    : null;
  
  if (!variant) return;
  
  trackEvent('experiment_conversion', {
    experiment_id: experiment.id,
    variant,
    conversion_type: conversionType,
    value: value || 0,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Force a specific variant (for testing/debugging)
 */
export function forceVariant<K extends ExperimentKey>(
  experimentKey: K,
  variant: ExperimentVariant<K>
): void {
  const experiment = EXPERIMENTS[experimentKey];
  const storageKey = `${STORAGE_KEY_PREFIX}${experiment.id}`;
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey, variant);
  }
}

/**
 * Reset all experiment assignments (for testing)
 */
export function resetExperiments(): void {
  if (typeof window === 'undefined') return;
  
  Object.values(EXPERIMENTS).forEach((experiment) => {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${experiment.id}`);
  });
  
  // Clear session exposure tracking
  Object.values(EXPERIMENTS).forEach((experiment) => {
    sessionStorage.removeItem(`ab_exposed_${experiment.id}`);
  });
}

/**
 * Get all current experiment assignments
 */
export function getAllExperimentAssignments(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  
  const assignments: Record<string, string> = {};
  
  Object.entries(EXPERIMENTS).forEach(([key, experiment]) => {
    const storageKey = `${STORAGE_KEY_PREFIX}${experiment.id}`;
    const variant = localStorage.getItem(storageKey);
    if (variant) {
      assignments[key] = variant;
    }
  });
  
  return assignments;
}

// ============================================
// React Hook for A/B Testing
// ============================================

import { useState, useEffect } from 'react';

/**
 * React hook for getting experiment variants
 * 
 * @example
 * const variant = useExperiment('hero_headline');
 * 
 * return (
 *   <h1>{variant === 'numbers_first' ? 'Know Your Numbers' : 'Transform Your Idea'}</h1>
 * );
 */
export function useExperiment<K extends ExperimentKey>(
  experimentKey: K
): ExperimentVariant<K> {
  const [variant, setVariant] = useState<ExperimentVariant<K>>(() => {
    // Get initial variant synchronously for SSR
    return getVariant(experimentKey);
  });
  
  useEffect(() => {
    // Re-get variant on client side to ensure consistency
    const clientVariant = getVariant(experimentKey);
    if (clientVariant !== variant) {
      setVariant(clientVariant);
    }
  }, [experimentKey, variant]);
  
  return variant;
}

// ============================================
// Variant Content Helpers
// ============================================

export const HERO_HEADLINES: Record<(typeof EXPERIMENTS)['hero_headline']['variants'][number], {
  title: string;
  subtitle: string;
}> = {
  control: {
    title: 'Know Your Numbers Before You Invest',
    subtitle: 'AI-powered business analysis that turns your idea into a complete financial roadmap in 2 minutes.',
  },
  numbers_first: {
    title: 'ROI, Payback, Revenue — Calculated in 2 Minutes',
    subtitle: 'Stop guessing. Get precise financial projections backed by 1,000+ industry benchmarks.',
  },
  action_focused: {
    title: 'Turn Your Business Idea Into a Funded Plan',
    subtitle: 'Bank-ready financial projections, market analysis, and launch roadmap — all AI-generated.',
  },
};

export const CTA_STYLES: Record<(typeof EXPERIMENTS)['cta_color']['variants'][number], {
  className: string;
  text: string;
}> = {
  primary: {
    className: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    text: 'Start Free Analysis',
  },
  success: {
    className: 'bg-success hover:bg-success/90 text-white',
    text: 'Get My Free Report',
  },
  gradient: {
    className: 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground',
    text: 'Analyze My Idea Now',
  },
};
