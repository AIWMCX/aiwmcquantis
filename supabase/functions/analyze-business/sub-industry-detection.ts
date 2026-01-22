/**
 * QUANTIS SUB-INDUSTRY DETECTION SYSTEM
 * 
 * Provides granular industry classification beyond base categories.
 * Detects B2B vs B2C, Enterprise vs SMB, and applies economic modifiers.
 * 
 * This addresses the issue where "SaaS" matches both enterprise software
 * and consumer apps with vastly different unit economics.
 */

// ========== SUB-INDUSTRY TYPES ==========

export type BusinessModel = 'b2b' | 'b2c' | 'b2b2c' | 'marketplace' | 'hybrid';
export type CompanyScale = 'solo' | 'smb' | 'mid_market' | 'enterprise';
export type PricingModel = 'subscription' | 'transaction' | 'freemium' | 'one_time' | 'usage_based';

export interface SubIndustryModifiers {
  cac_multiplier: number;       // Higher for enterprise, lower for consumer
  ltv_multiplier: number;       // Higher for enterprise (longer contracts)
  churn_multiplier: number;     // Lower for enterprise (stickier)
  margin_multiplier: number;    // Varies by pricing power
  sales_cycle_months: number;   // 0 for self-serve, 6+ for enterprise
}

export interface SubIndustryResult {
  baseIndustryId: string;
  subIndustryId: string;
  subIndustryName: string;
  businessModel: BusinessModel;
  targetScale: CompanyScale;
  pricingModel: PricingModel;
  modifiers: SubIndustryModifiers;
  confidence: number;
  detectedKeywords: string[];
}

// ========== SUB-INDUSTRY RULES ==========

interface SubIndustryRule {
  id: string;
  name: string;
  parentIndustries: string[]; // Which base industries this applies to
  keywords: string[];
  businessModel: BusinessModel;
  targetScale: CompanyScale;
  pricingModel: PricingModel;
  modifiers: SubIndustryModifiers;
}

const SUB_INDUSTRY_RULES: SubIndustryRule[] = [
  // ===== B2B ENTERPRISE =====
  {
    id: 'enterprise_saas',
    name: 'Enterprise SaaS',
    parentIndustries: ['saas', 'saas_startup', 'b2b_saas', 'software'],
    keywords: ['enterprise', 'corporate', 'fortune 500', 'large company', 'крупный бизнес', 'корпоративный', 'b2b enterprise', 'annual contract', 'acv'],
    businessModel: 'b2b',
    targetScale: 'enterprise',
    pricingModel: 'subscription',
    modifiers: {
      cac_multiplier: 3.0,     // High CAC due to sales team
      ltv_multiplier: 5.0,     // Long contracts, high ACV
      churn_multiplier: 0.3,   // Very sticky
      margin_multiplier: 1.2,  // Premium pricing
      sales_cycle_months: 6    // Long sales cycle
    }
  },
  {
    id: 'mid_market_saas',
    name: 'Mid-Market SaaS',
    parentIndustries: ['saas', 'saas_startup', 'b2b_saas'],
    keywords: ['mid-market', 'mid market', 'smb+', 'growing companies', 'scale-up', 'средний бизнес'],
    businessModel: 'b2b',
    targetScale: 'mid_market',
    pricingModel: 'subscription',
    modifiers: {
      cac_multiplier: 2.0,
      ltv_multiplier: 3.0,
      churn_multiplier: 0.5,
      margin_multiplier: 1.1,
      sales_cycle_months: 3
    }
  },
  {
    id: 'smb_saas',
    name: 'SMB SaaS',
    parentIndustries: ['saas', 'saas_startup', 'b2b_saas'],
    keywords: ['smb', 'small business', 'малый бизнес', 'starter', 'self-serve', 'самообслуживание'],
    businessModel: 'b2b',
    targetScale: 'smb',
    pricingModel: 'freemium',
    modifiers: {
      cac_multiplier: 0.8,
      ltv_multiplier: 1.5,
      churn_multiplier: 1.2,
      margin_multiplier: 0.9,
      sales_cycle_months: 0.5
    }
  },
  
  // ===== B2C =====
  {
    id: 'consumer_app',
    name: 'Consumer App (B2C)',
    parentIndustries: ['saas', 'saas_startup', 'media', 'app'],
    keywords: ['consumer', 'b2c', 'app', 'mobile app', 'приложение', 'потребитель', 'users', 'пользователи', 'individual', 'personal'],
    businessModel: 'b2c',
    targetScale: 'solo',
    pricingModel: 'freemium',
    modifiers: {
      cac_multiplier: 0.3,     // Low CAC, viral/organic
      ltv_multiplier: 0.2,     // Low LTV per user
      churn_multiplier: 2.0,   // High churn
      margin_multiplier: 0.7,  // Need scale for margins
      sales_cycle_months: 0
    }
  },
  {
    id: 'consumer_subscription',
    name: 'Consumer Subscription',
    parentIndustries: ['saas', 'media', 'fitness', 'education'],
    keywords: ['subscription box', 'streaming', 'membership', 'подписка', 'premium', 'pro plan', 'netflix', 'spotify'],
    businessModel: 'b2c',
    targetScale: 'solo',
    pricingModel: 'subscription',
    modifiers: {
      cac_multiplier: 0.5,
      ltv_multiplier: 0.4,
      churn_multiplier: 1.5,
      margin_multiplier: 0.8,
      sales_cycle_months: 0
    }
  },
  
  // ===== MARKETPLACE =====
  {
    id: 'b2b_marketplace',
    name: 'B2B Marketplace',
    parentIndustries: ['ecommerce', 'marketplace', 'logistics'],
    keywords: ['b2b marketplace', 'wholesale', 'supplier', 'оптом', 'поставщик', 'trade', 'bulk'],
    businessModel: 'marketplace',
    targetScale: 'smb',
    pricingModel: 'transaction',
    modifiers: {
      cac_multiplier: 2.5,
      ltv_multiplier: 4.0,
      churn_multiplier: 0.6,
      margin_multiplier: 0.7, // Lower take rate
      sales_cycle_months: 2
    }
  },
  {
    id: 'consumer_marketplace',
    name: 'Consumer Marketplace',
    parentIndustries: ['ecommerce', 'marketplace'],
    keywords: ['c2c', 'peer-to-peer', 'p2p', 'secondhand', 'resale', 'авито', 'olx', 'ebay'],
    businessModel: 'marketplace',
    targetScale: 'solo',
    pricingModel: 'transaction',
    modifiers: {
      cac_multiplier: 0.4,
      ltv_multiplier: 0.3,
      churn_multiplier: 1.8,
      margin_multiplier: 0.5,
      sales_cycle_months: 0
    }
  },
  
  // ===== PROFESSIONAL SERVICES =====
  {
    id: 'enterprise_consulting',
    name: 'Enterprise Consulting',
    parentIndustries: ['consulting', 'agency', 'professional_services'],
    keywords: ['big 4', 'mckinsey', 'bcg', 'enterprise consulting', 'стратегический консалтинг', 'transformation'],
    businessModel: 'b2b',
    targetScale: 'enterprise',
    pricingModel: 'one_time',
    modifiers: {
      cac_multiplier: 5.0,
      ltv_multiplier: 8.0,
      churn_multiplier: 0.2,
      margin_multiplier: 1.5,
      sales_cycle_months: 6
    }
  },
  {
    id: 'smb_services',
    name: 'SMB Services',
    parentIndustries: ['consulting', 'agency', 'freelance'],
    keywords: ['freelance', 'фрилансер', 'small agency', 'boutique', 'local business', 'малый бизнес услуги'],
    businessModel: 'b2b',
    targetScale: 'smb',
    pricingModel: 'one_time',
    modifiers: {
      cac_multiplier: 0.5,
      ltv_multiplier: 1.0,
      churn_multiplier: 1.0,
      margin_multiplier: 0.9,
      sales_cycle_months: 0.5
    }
  },
  
  // ===== FINTECH SPECIFICS =====
  {
    id: 'b2b_fintech',
    name: 'B2B Fintech',
    parentIndustries: ['fintech', 'financial_services'],
    keywords: ['banking api', 'payment processing', 'b2b payments', 'treasury', 'корпоративные платежи', 'api banking'],
    businessModel: 'b2b',
    targetScale: 'mid_market',
    pricingModel: 'usage_based',
    modifiers: {
      cac_multiplier: 4.0,
      ltv_multiplier: 6.0,
      churn_multiplier: 0.3,
      margin_multiplier: 1.3,
      sales_cycle_months: 4
    }
  },
  {
    id: 'consumer_fintech',
    name: 'Consumer Fintech',
    parentIndustries: ['fintech', 'financial_services'],
    keywords: ['neobank', 'личные финансы', 'personal finance', 'investing app', 'bnpl', 'buy now pay later'],
    businessModel: 'b2c',
    targetScale: 'solo',
    pricingModel: 'freemium',
    modifiers: {
      cac_multiplier: 0.6,
      ltv_multiplier: 0.5,
      churn_multiplier: 1.5,
      margin_multiplier: 0.6,
      sales_cycle_months: 0
    }
  },
  
  // ===== E-COMMERCE SPECIFICS =====
  {
    id: 'luxury_ecommerce',
    name: 'Luxury E-commerce',
    parentIndustries: ['ecommerce', 'ecommerce_retail', 'retail'],
    keywords: ['luxury', 'premium', 'люкс', 'премиум', 'high-end', 'designer', 'бренд'],
    businessModel: 'b2c',
    targetScale: 'solo',
    pricingModel: 'transaction',
    modifiers: {
      cac_multiplier: 2.0,
      ltv_multiplier: 3.0,
      churn_multiplier: 0.7,
      margin_multiplier: 1.8,
      sales_cycle_months: 0
    }
  },
  {
    id: 'dtc_brand',
    name: 'Direct-to-Consumer Brand',
    parentIndustries: ['ecommerce', 'ecommerce_retail'],
    keywords: ['dtc', 'd2c', 'direct to consumer', 'собственный бренд', 'own brand', 'private label'],
    businessModel: 'b2c',
    targetScale: 'solo',
    pricingModel: 'transaction',
    modifiers: {
      cac_multiplier: 1.5,
      ltv_multiplier: 2.0,
      churn_multiplier: 1.0,
      margin_multiplier: 1.4,
      sales_cycle_months: 0
    }
  },
  
  // ===== HEALTHCARE SPECIFICS =====
  {
    id: 'b2b_healthtech',
    name: 'B2B HealthTech',
    parentIndustries: ['healthcare', 'medical', 'healthtech'],
    keywords: ['hospital', 'clinic management', 'ehr', 'emr', 'больница', 'медицинское оборудование', 'healthcare enterprise'],
    businessModel: 'b2b',
    targetScale: 'enterprise',
    pricingModel: 'subscription',
    modifiers: {
      cac_multiplier: 4.0,
      ltv_multiplier: 6.0,
      churn_multiplier: 0.2,
      margin_multiplier: 1.3,
      sales_cycle_months: 9
    }
  },
  {
    id: 'consumer_health',
    name: 'Consumer Health App',
    parentIndustries: ['healthcare', 'fitness', 'wellness'],
    keywords: ['health app', 'wellness app', 'fitness tracker', 'приложение для здоровья', 'mental health', 'медитация'],
    businessModel: 'b2c',
    targetScale: 'solo',
    pricingModel: 'freemium',
    modifiers: {
      cac_multiplier: 0.4,
      ltv_multiplier: 0.3,
      churn_multiplier: 1.8,
      margin_multiplier: 0.7,
      sales_cycle_months: 0
    }
  },
  
  // ===== EDUCATION SPECIFICS =====
  {
    id: 'b2b_edtech',
    name: 'B2B EdTech',
    parentIndustries: ['education', 'edtech', 'online_education'],
    keywords: ['school', 'university', 'corporate training', 'lms', 'образовательная платформа b2b', 'корпоративное обучение'],
    businessModel: 'b2b',
    targetScale: 'mid_market',
    pricingModel: 'subscription',
    modifiers: {
      cac_multiplier: 3.0,
      ltv_multiplier: 4.0,
      churn_multiplier: 0.4,
      margin_multiplier: 1.2,
      sales_cycle_months: 4
    }
  },
  {
    id: 'creator_education',
    name: 'Creator/Course Education',
    parentIndustries: ['education', 'online_education', 'coaching'],
    keywords: ['course creator', 'инфобизнес', 'online course', 'webinar', 'вебинар', 'марафон', 'coach', 'коуч'],
    businessModel: 'b2c',
    targetScale: 'solo',
    pricingModel: 'one_time',
    modifiers: {
      cac_multiplier: 0.8,
      ltv_multiplier: 0.5,
      churn_multiplier: 2.5,  // One-time purchase, no recurring
      margin_multiplier: 1.5, // High margins on digital
      sales_cycle_months: 0
    }
  },
];

// ========== DETECTION LOGIC ==========

/**
 * Detects sub-industry from business description and base industry
 */
export function detectSubIndustry(
  businessIdea: string,
  baseIndustryId: string
): SubIndustryResult {
  const ideaLower = businessIdea.toLowerCase();
  const detectedKeywords: string[] = [];
  
  let bestMatch: SubIndustryRule | null = null;
  let bestScore = 0;
  
  for (const rule of SUB_INDUSTRY_RULES) {
    // Check if this rule applies to the base industry
    if (!rule.parentIndustries.some(p => baseIndustryId.includes(p) || p.includes(baseIndustryId))) {
      continue;
    }
    
    // Score based on keyword matches
    let score = 0;
    const matchedKeywords: string[] = [];
    
    for (const keyword of rule.keywords) {
      if (ideaLower.includes(keyword.toLowerCase())) {
        score += keyword.length * 2; // Weight by keyword length
        matchedKeywords.push(keyword);
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = rule;
      detectedKeywords.length = 0;
      detectedKeywords.push(...matchedKeywords);
    }
  }
  
  // Calculate confidence based on score
  const confidence = Math.min(95, 50 + bestScore * 2);
  
  if (bestMatch && bestScore > 0) {
    return {
      baseIndustryId,
      subIndustryId: bestMatch.id,
      subIndustryName: bestMatch.name,
      businessModel: bestMatch.businessModel,
      targetScale: bestMatch.targetScale,
      pricingModel: bestMatch.pricingModel,
      modifiers: bestMatch.modifiers,
      confidence,
      detectedKeywords
    };
  }
  
  // Default: return neutral modifiers
  return {
    baseIndustryId,
    subIndustryId: baseIndustryId,
    subIndustryName: 'General',
    businessModel: 'hybrid',
    targetScale: 'smb',
    pricingModel: 'subscription',
    modifiers: {
      cac_multiplier: 1.0,
      ltv_multiplier: 1.0,
      churn_multiplier: 1.0,
      margin_multiplier: 1.0,
      sales_cycle_months: 1
    },
    confidence: 50,
    detectedKeywords: []
  };
}

/**
 * Applies sub-industry modifiers to base benchmarks
 */
export function applySubIndustryModifiers(
  baseBenchmarks: {
    cac_typical: number;
    cac_min: number;
    cac_max: number;
    client_lifetime_months: number;
    net_margin_min: number;
    net_margin_max: number;
  },
  modifiers: SubIndustryModifiers
): typeof baseBenchmarks {
  return {
    cac_typical: Math.round(baseBenchmarks.cac_typical * modifiers.cac_multiplier),
    cac_min: Math.round(baseBenchmarks.cac_min * modifiers.cac_multiplier),
    cac_max: Math.round(baseBenchmarks.cac_max * modifiers.cac_multiplier),
    client_lifetime_months: Math.round(
      baseBenchmarks.client_lifetime_months * modifiers.ltv_multiplier / modifiers.churn_multiplier
    ),
    net_margin_min: Math.round(baseBenchmarks.net_margin_min * modifiers.margin_multiplier),
    net_margin_max: Math.round(baseBenchmarks.net_margin_max * modifiers.margin_multiplier),
  };
}

/**
 * Returns churn rate based on sub-industry detection
 */
export function getSubIndustryChurnRate(subIndustry: SubIndustryResult): number {
  // Base monthly churn rates by business model and scale
  const baseChurnRates: Record<BusinessModel, Record<CompanyScale, number>> = {
    b2b: {
      solo: 0.05,
      smb: 0.04,
      mid_market: 0.025,
      enterprise: 0.01
    },
    b2c: {
      solo: 0.08,
      smb: 0.06,
      mid_market: 0.04,
      enterprise: 0.02
    },
    b2b2c: {
      solo: 0.06,
      smb: 0.05,
      mid_market: 0.03,
      enterprise: 0.015
    },
    marketplace: {
      solo: 0.10,
      smb: 0.07,
      mid_market: 0.04,
      enterprise: 0.02
    },
    hybrid: {
      solo: 0.07,
      smb: 0.05,
      mid_market: 0.03,
      enterprise: 0.015
    }
  };
  
  const baseRate = baseChurnRates[subIndustry.businessModel][subIndustry.targetScale];
  return baseRate * subIndustry.modifiers.churn_multiplier;
}

/**
 * Returns expected sales cycle in months
 */
export function getSalesCycle(subIndustry: SubIndustryResult): number {
  return subIndustry.modifiers.sales_cycle_months;
}

/**
 * Returns pricing model recommendation
 */
export function getPricingRecommendation(subIndustry: SubIndustryResult): string {
  const recommendations: Record<PricingModel, string> = {
    subscription: 'Monthly or annual subscription with tiered pricing',
    transaction: 'Per-transaction fee or commission-based pricing',
    freemium: 'Free tier with paid upgrades for premium features',
    one_time: 'One-time purchase with optional upsells',
    usage_based: 'Pay-as-you-go pricing based on usage metrics'
  };
  
  return recommendations[subIndustry.pricingModel];
}
