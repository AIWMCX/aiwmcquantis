/**
 * Coherence Check — Narrative vs. Numbers
 * Detects mismatches between founder's business description and financial inputs.
 */

export interface CoherenceFlag {
  type: string;
  message: string;
  suggestion: string;
}

export interface CoherenceResult {
  passed: boolean;
  flags: CoherenceFlag[];
}

// Industry median references for coherence thresholds
const INDUSTRY_ARPU_P50: Record<string, number> = {
  fitness_boutique: 110, yoga_studio: 95, gym: 50, personal_training: 200,
  coffee_shop: 6, restaurant: 25, fast_food: 10, bakery: 12,
  saas: 49, ecommerce: 45, consulting: 150, tutoring: 60,
  salon: 55, spa: 85, cleaning: 150, landscaping: 200,
  default: 50,
};

const PREMIUM_KEYWORDS = ['luxury', 'premium', 'exclusive', 'high-end', 'boutique', 'curated', 'bespoke', 'artisan', 'upscale', 'elite'];
const VOLUME_KEYWORDS = ['hundreds', 'thousands', 'mass', 'mainstream', 'popular', 'affordable', 'budget', 'discount', 'high-volume'];

export function checkNarrativeCoherence(
  description: string,
  inputs: { arpu?: number; cac?: number; churnRate?: number; expectedCustomers?: number },
  industryType: string
): CoherenceResult {
  const flags: CoherenceFlag[] = [];
  const desc = (description || '').toLowerCase();
  const medianArpu = INDUSTRY_ARPU_P50[industryType] || INDUSTRY_ARPU_P50.default;

  // Check: premium language + low ARPU
  const hasPremium = PREMIUM_KEYWORDS.some(k => desc.includes(k));
  if (hasPremium && inputs.arpu && inputs.arpu < medianArpu) {
    flags.push({
      type: 'PRICING_MISMATCH',
      message: `Your description suggests premium positioning, but ARPU $${inputs.arpu} is below industry median $${medianArpu}. Premium positioning typically supports higher pricing.`,
      suggestion: `Consider revising ARPU to $${Math.round(medianArpu * 1.5)}+ or repositioning for a volume model.`,
    });
  }

  // Check: volume language + high CAC
  const hasVolume = VOLUME_KEYWORDS.some(k => desc.includes(k));
  if (hasVolume && inputs.cac && inputs.cac > 200) {
    flags.push({
      type: 'VOLUME_CAC_MISMATCH',
      message: `Volume/mass-market language detected, but CAC $${inputs.cac} is high for a volume model. High-volume businesses typically use low-cost acquisition channels.`,
      suggestion: 'Shift toward organic, referral, or content-based acquisition to reduce CAC below $100.',
    });
  }

  // Check: zero churn assumption
  if (inputs.churnRate !== undefined && inputs.churnRate === 0) {
    flags.push({
      type: 'ZERO_CHURN',
      message: 'Zero churn assumption is unrealistic for any subscription or recurring revenue model. Even best-in-class businesses experience 1-2% monthly churn.',
      suggestion: 'Set churn to at least 2-3% monthly for realistic projections.',
    });
  }

  // Check: premium + very high customer volume
  if (hasPremium && inputs.expectedCustomers && inputs.expectedCustomers > 500) {
    flags.push({
      type: 'PREMIUM_VOLUME_CONFLICT',
      message: `Premium positioning with ${inputs.expectedCustomers} monthly customers is unusual. Luxury/premium models typically serve fewer customers at higher prices.`,
      suggestion: 'Either reduce customer count and increase ARPU, or reposition as mid-market.',
    });
  }

  return {
    passed: flags.length === 0,
    flags,
  };
}
