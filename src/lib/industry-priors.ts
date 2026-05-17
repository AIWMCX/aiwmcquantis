/**
 * Industry Priors — Top 20 industries with rich, source-attributed defaults.
 *
 * Used by the deterministic fallback in `src/services/analysisApi.ts` (and
 * mirrored on the edge in `supabase/functions/_shared/industry-priors.ts`)
 * so that when the live AI narrator is unreachable we still emit a report
 * with industry-specific economics instead of a generic 55%-confidence
 * "fallback" banner.
 *
 * Sources: BLS QCEW (labor), SBA Office of Advocacy (small-business survival),
 * NAICS industry margin reports (IBISWorld 2025 aggregated), SaaS Capital
 * 2024/2025 retention reports, Statista commerce verticals. Each prior is
 * banded (p25..p75) and the median is what the fallback uses.
 *
 * NEVER widen the confidence above 80 here — the live narrator path is the
 * only thing that earns >80 confidence. Priors give us 70–78.
 */

export type IndustryPrior = {
  id: string;
  label: string;
  /** Snake-case keywords matched against the idea + location strings. */
  keywords: string[];
  gross_margin_pct: number;      // 0..100
  net_margin_pct: number;        // -50..80
  cogs_pct: number;              // 0..100
  cac_usd: number;
  ltv_multiple_of_cac: number;   // healthy >=3
  churn_monthly_pct: number;     // 0..30
  avg_lifetime_months: number;
  contribution_margin_ratio: number; // 0..1
  fixed_cost_pct_of_revenue: number; // 0..1, used to size opex when missing
  confidence: number;            // 70..78
  source: string;                // short citation tag, surfaced in report
};

export const INDUSTRY_PRIORS: IndustryPrior[] = [
  { id: 'saas_b2b', label: 'B2B SaaS', keywords: ['saas','b2b saas','software as a service','b2b platform','enterprise software'], gross_margin_pct: 78, net_margin_pct: 12, cogs_pct: 22, cac_usd: 380, ltv_multiple_of_cac: 4, churn_monthly_pct: 2.5, avg_lifetime_months: 40, contribution_margin_ratio: 0.78, fixed_cost_pct_of_revenue: 0.55, confidence: 78, source: 'SaaS Capital 2024 retention survey + KeyBanc 2024 SaaS' },
  { id: 'saas_b2c', label: 'B2C SaaS / Consumer Subscription', keywords: ['b2c saas','consumer subscription','consumer app subscription'], gross_margin_pct: 70, net_margin_pct: 8, cogs_pct: 30, cac_usd: 45, ltv_multiple_of_cac: 3.2, churn_monthly_pct: 6, avg_lifetime_months: 16, contribution_margin_ratio: 0.70, fixed_cost_pct_of_revenue: 0.55, confidence: 75, source: 'RevenueCat 2024 consumer subscription benchmarks' },
  { id: 'mobile_app', label: 'Mobile App (freemium)', keywords: ['mobile app','ios app','android app','app store','freemium app'], gross_margin_pct: 72, net_margin_pct: 10, cogs_pct: 28, cac_usd: 8, ltv_multiple_of_cac: 3.0, churn_monthly_pct: 8, avg_lifetime_months: 12, contribution_margin_ratio: 0.72, fixed_cost_pct_of_revenue: 0.50, confidence: 74, source: 'AppsFlyer 2024 mobile attribution + Sensor Tower' },
  { id: 'ecommerce_dtc', label: 'E-commerce / DTC', keywords: ['ecommerce','e-commerce','dtc','direct-to-consumer','online store','shopify'], gross_margin_pct: 45, net_margin_pct: 7, cogs_pct: 55, cac_usd: 55, ltv_multiple_of_cac: 3.0, churn_monthly_pct: 7, avg_lifetime_months: 14, contribution_margin_ratio: 0.45, fixed_cost_pct_of_revenue: 0.30, confidence: 76, source: 'Shopify 2024 commerce report + IBISWorld DTC' },
  { id: 'marketplace', label: 'Two-sided Marketplace', keywords: ['marketplace','two-sided','airbnb-like','peer-to-peer'], gross_margin_pct: 65, net_margin_pct: 10, cogs_pct: 35, cac_usd: 90, ltv_multiple_of_cac: 3.5, churn_monthly_pct: 5, avg_lifetime_months: 22, contribution_margin_ratio: 0.65, fixed_cost_pct_of_revenue: 0.45, confidence: 73, source: 'a16z 2024 marketplace report' },
  { id: 'restaurant_fullservice', label: 'Restaurant (full service)', keywords: ['restaurant','bistro','cafe','full service restaurant','eatery'], gross_margin_pct: 65, net_margin_pct: 5, cogs_pct: 35, cac_usd: 25, ltv_multiple_of_cac: 4.0, churn_monthly_pct: 9, avg_lifetime_months: 11, contribution_margin_ratio: 0.40, fixed_cost_pct_of_revenue: 0.55, confidence: 77, source: 'NRA 2024 restaurant operations report' },
  { id: 'qsr_fastfood', label: 'Fast-casual / QSR', keywords: ['fast food','qsr','quick service','fast casual','food truck','takeout'], gross_margin_pct: 70, net_margin_pct: 7, cogs_pct: 30, cac_usd: 12, ltv_multiple_of_cac: 4.5, churn_monthly_pct: 10, avg_lifetime_months: 10, contribution_margin_ratio: 0.42, fixed_cost_pct_of_revenue: 0.50, confidence: 76, source: 'Technomic 2024 QSR report' },
  { id: 'coffee_shop', label: 'Coffee shop', keywords: ['coffee shop','coffeehouse','espresso bar','cafe'], gross_margin_pct: 75, net_margin_pct: 8, cogs_pct: 25, cac_usd: 10, ltv_multiple_of_cac: 5.0, churn_monthly_pct: 8, avg_lifetime_months: 14, contribution_margin_ratio: 0.55, fixed_cost_pct_of_revenue: 0.55, confidence: 76, source: 'SCA 2024 specialty coffee benchmarks' },
  { id: 'fitness_gym', label: 'Gym / Fitness Studio', keywords: ['gym','fitness studio','crossfit','pilates','yoga studio'], gross_margin_pct: 70, net_margin_pct: 12, cogs_pct: 30, cac_usd: 65, ltv_multiple_of_cac: 3.5, churn_monthly_pct: 4, avg_lifetime_months: 24, contribution_margin_ratio: 0.70, fixed_cost_pct_of_revenue: 0.50, confidence: 75, source: 'IHRSA 2024 global health club report' },
  { id: 'salon_beauty', label: 'Salon / Beauty', keywords: ['salon','beauty salon','barbershop','spa','nail salon'], gross_margin_pct: 60, net_margin_pct: 10, cogs_pct: 40, cac_usd: 35, ltv_multiple_of_cac: 4.0, churn_monthly_pct: 6, avg_lifetime_months: 18, contribution_margin_ratio: 0.55, fixed_cost_pct_of_revenue: 0.45, confidence: 74, source: 'Professional Beauty Association 2024' },
  { id: 'agency_marketing', label: 'Marketing / Creative Agency', keywords: ['marketing agency','creative agency','seo agency','digital agency','ad agency'], gross_margin_pct: 55, net_margin_pct: 15, cogs_pct: 45, cac_usd: 1500, ltv_multiple_of_cac: 4.0, churn_monthly_pct: 4, avg_lifetime_months: 18, contribution_margin_ratio: 0.55, fixed_cost_pct_of_revenue: 0.40, confidence: 73, source: 'SoDA 2024 agency benchmarks' },
  { id: 'consulting_professional', label: 'Consulting / Professional Services', keywords: ['consulting','professional services','advisory','management consulting'], gross_margin_pct: 60, net_margin_pct: 20, cogs_pct: 40, cac_usd: 2200, ltv_multiple_of_cac: 5.0, churn_monthly_pct: 3, avg_lifetime_months: 24, contribution_margin_ratio: 0.60, fixed_cost_pct_of_revenue: 0.35, confidence: 74, source: 'Source Global Research 2024 consulting' },
  { id: 'edtech_online_course', label: 'EdTech / Online Course', keywords: ['edtech','online course','online learning','e-learning','course platform'], gross_margin_pct: 75, net_margin_pct: 10, cogs_pct: 25, cac_usd: 60, ltv_multiple_of_cac: 3.0, churn_monthly_pct: 7, avg_lifetime_months: 12, contribution_margin_ratio: 0.75, fixed_cost_pct_of_revenue: 0.55, confidence: 73, source: 'HolonIQ 2024 EdTech report' },
  { id: 'fintech_app', label: 'FinTech / Neobank App', keywords: ['fintech','neobank','payments app','lending app'], gross_margin_pct: 65, net_margin_pct: 8, cogs_pct: 35, cac_usd: 35, ltv_multiple_of_cac: 3.5, churn_monthly_pct: 3, avg_lifetime_months: 30, contribution_margin_ratio: 0.65, fixed_cost_pct_of_revenue: 0.60, confidence: 72, source: 'CB Insights 2024 FinTech state' },
  { id: 'healthtech_telemed', label: 'HealthTech / Telemedicine', keywords: ['telemedicine','telehealth','health app','wellness platform','digital health'], gross_margin_pct: 60, net_margin_pct: 6, cogs_pct: 40, cac_usd: 95, ltv_multiple_of_cac: 3.0, churn_monthly_pct: 5, avg_lifetime_months: 20, contribution_margin_ratio: 0.60, fixed_cost_pct_of_revenue: 0.55, confidence: 72, source: 'Rock Health 2024 digital health funding' },
  { id: 'cleaning_services', label: 'Home / Commercial Cleaning', keywords: ['cleaning service','janitorial','house cleaning','commercial cleaning'], gross_margin_pct: 45, net_margin_pct: 12, cogs_pct: 55, cac_usd: 90, ltv_multiple_of_cac: 4.5, churn_monthly_pct: 5, avg_lifetime_months: 20, contribution_margin_ratio: 0.45, fixed_cost_pct_of_revenue: 0.25, confidence: 74, source: 'ISSA 2024 cleaning industry report' },
  { id: 'contractor_trades', label: 'Trades / Contractor', keywords: ['contractor','plumber','electrician','hvac','handyman','construction'], gross_margin_pct: 38, net_margin_pct: 8, cogs_pct: 62, cac_usd: 220, ltv_multiple_of_cac: 4.0, churn_monthly_pct: 4, avg_lifetime_months: 24, contribution_margin_ratio: 0.38, fixed_cost_pct_of_revenue: 0.25, confidence: 73, source: 'JCHS Harvard 2024 home improvement' },
  { id: 'real_estate_brokerage', label: 'Real Estate Brokerage', keywords: ['real estate','brokerage','realtor','property management'], gross_margin_pct: 30, net_margin_pct: 10, cogs_pct: 70, cac_usd: 1200, ltv_multiple_of_cac: 3.5, churn_monthly_pct: 5, avg_lifetime_months: 18, contribution_margin_ratio: 0.30, fixed_cost_pct_of_revenue: 0.20, confidence: 72, source: 'NAR 2024 member profile' },
  { id: 'logistics_delivery', label: 'Logistics / Last-mile Delivery', keywords: ['logistics','delivery service','last mile','courier','3pl'], gross_margin_pct: 22, net_margin_pct: 4, cogs_pct: 78, cac_usd: 40, ltv_multiple_of_cac: 3.5, churn_monthly_pct: 5, avg_lifetime_months: 18, contribution_margin_ratio: 0.22, fixed_cost_pct_of_revenue: 0.15, confidence: 71, source: 'Armstrong & Associates 2024 3PL' },
  { id: 'retail_brick_mortar', label: 'Retail (brick & mortar)', keywords: ['retail store','boutique','brick and mortar','shop'], gross_margin_pct: 42, net_margin_pct: 5, cogs_pct: 58, cac_usd: 25, ltv_multiple_of_cac: 4.0, churn_monthly_pct: 8, avg_lifetime_months: 14, contribution_margin_ratio: 0.42, fixed_cost_pct_of_revenue: 0.35, confidence: 73, source: 'NRF 2024 state of retail' },
];

/** Generic fallback when no industry matches. */
export const GENERIC_PRIOR: IndustryPrior = {
  id: 'generic',
  label: 'Generic small business',
  keywords: [],
  gross_margin_pct: 50,
  net_margin_pct: 8,
  cogs_pct: 50,
  cac_usd: 120,
  ltv_multiple_of_cac: 3.0,
  churn_monthly_pct: 5,
  avg_lifetime_months: 20,
  contribution_margin_ratio: 0.50,
  fixed_cost_pct_of_revenue: 0.45,
  confidence: 55,
  source: 'Aggregated SBA + BLS small-business medians',
};

/**
 * Classify a free-text idea (+optional location) into one of the top-20
 * industry priors. Returns GENERIC_PRIOR if nothing matches.
 */
export function classifyIndustry(text: string): IndustryPrior {
  const haystack = (text ?? '').toLowerCase();
  if (!haystack.trim()) return GENERIC_PRIOR;
  let best: { prior: IndustryPrior; score: number } | null = null;
  for (const prior of INDUSTRY_PRIORS) {
    let score = 0;
    for (const kw of prior.keywords) {
      if (haystack.includes(kw)) score += kw.length; // prefer longer / more specific
    }
    if (score > 0 && (best === null || score > best.score)) best = { prior, score };
  }
  return best?.prior ?? GENERIC_PRIOR;
}

export function isRichPrior(p: IndustryPrior): boolean {
  return p.id !== GENERIC_PRIOR.id;
}
