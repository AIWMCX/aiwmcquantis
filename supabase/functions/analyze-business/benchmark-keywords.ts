/**
 * Sector and location detection for the V2 benchmark query.
 *
 * Pure (no Deno or network imports) so Vitest can test it. Split out of
 * benchmark-engine-v2.ts on 2026-10-25 after a live run classified a dog-grooming
 * van, and a hiring decision, as "B2B Consulting" and the benchmark lookup then
 * reported that row as an "exact" match.
 */

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Case-insensitive whole-word / whole-phrase match. A plural "s"/"es" is allowed
 * by default (so "restaurants" matches "restaurant"); pass plural=false for
 * names, where "las" must not count as a plural of "la".
 */
export function containsWord(text: string, keyword: string, plural = true): boolean {
  const suffix = plural ? '(?:s|es)?' : '';
  return new RegExp(`\\b${escapeRegExp(keyword.trim())}${suffix}\\b`, 'i').test(text);
}

// ─── Sector Detection Helper ───

export const SECTOR_KEYWORDS: Record<string, { level1: string; level2: string; model: string }> = {
  saas: { level1: 'SaaS', level2: 'B2B SMB SaaS', model: 'subscription' },
  software: { level1: 'SaaS', level2: 'B2B SMB SaaS', model: 'subscription' },
  app: { level1: 'SaaS', level2: 'B2C Consumer SaaS', model: 'subscription' },
  platform: { level1: 'SaaS', level2: 'B2B SMB SaaS', model: 'subscription' },
  enterprise: { level1: 'SaaS', level2: 'B2B Enterprise SaaS', model: 'subscription' },
  devtools: { level1: 'SaaS', level2: 'DevTools / API-first', model: 'usage_based' },
  api: { level1: 'SaaS', level2: 'DevTools / API-first', model: 'usage_based' },
  proptech: { level1: 'SaaS', level2: 'Vertical SaaS (PropTech)', model: 'subscription' },
  healthtech: { level1: 'SaaS', level2: 'Vertical SaaS (Healthcare)', model: 'subscription' },
  coffee: { level1: 'Food & Beverage', level2: 'Coffee Shop / Café', model: 'transactional' },
  cafe: { level1: 'Food & Beverage', level2: 'Coffee Shop / Café', model: 'transactional' },
  restaurant: {
    level1: 'Food & Beverage',
    level2: 'Casual Dining Restaurant',
    model: 'transactional',
  },
  'fine dining': {
    level1: 'Food & Beverage',
    level2: 'Fine Dining Restaurant',
    model: 'transactional',
  },
  'food truck': {
    level1: 'Food & Beverage',
    level2: 'Food Truck / Ghost Kitchen',
    model: 'transactional',
  },
  'ghost kitchen': {
    level1: 'Food & Beverage',
    level2: 'Food Truck / Ghost Kitchen',
    model: 'transactional',
  },
  bakery: { level1: 'Food & Beverage', level2: 'Coffee Shop / Café', model: 'transactional' },
  beverage: { level1: 'Food & Beverage', level2: 'Beverage CPG / DTC', model: 'hybrid' },
  ecommerce: { level1: 'Retail', level2: 'DTC Ecommerce', model: 'transactional' },
  'e-commerce': { level1: 'Retail', level2: 'DTC Ecommerce', model: 'transactional' },
  'online store': { level1: 'Retail', level2: 'DTC Ecommerce', model: 'transactional' },
  retail: { level1: 'Retail', level2: 'Brick & Mortar Specialty Retail', model: 'transactional' },
  marketplace: { level1: 'Marketplace', level2: 'B2C Service Marketplace', model: 'marketplace' },
  amazon: { level1: 'Retail', level2: 'Marketplace Seller (Amazon/eBay)', model: 'transactional' },
  consulting: {
    level1: 'Services',
    level2: 'B2B Consulting (Strategy/Mgmt)',
    model: 'transactional',
  },
  agency: { level1: 'Services', level2: 'Marketing / Creative Agency', model: 'transactional' },
  'marketing agency': {
    level1: 'Services',
    level2: 'Marketing / Creative Agency',
    model: 'transactional',
  },
  'it services': { level1: 'Services', level2: 'IT Services / MSP', model: 'subscription' },
  msp: { level1: 'Services', level2: 'IT Services / MSP', model: 'subscription' },
  staffing: { level1: 'Services', level2: 'HR / Staffing Agency', model: 'transactional' },
  legal: { level1: 'Services', level2: 'Legal Services (SMB)', model: 'transactional' },
  accounting: { level1: 'Services', level2: 'Accounting / Bookkeeping', model: 'subscription' },
  bookkeeping: { level1: 'Services', level2: 'Accounting / Bookkeeping', model: 'subscription' },
  dental: { level1: 'Healthcare', level2: 'Dental Practice', model: 'transactional' },
  clinic: {
    level1: 'Healthcare',
    level2: 'Primary Care / Family Medicine',
    model: 'transactional',
  },
  doctor: {
    level1: 'Healthcare',
    level2: 'Primary Care / Family Medicine',
    model: 'transactional',
  },
  therapy: { level1: 'Healthcare', level2: 'Mental Health Practice', model: 'transactional' },
  'mental health': {
    level1: 'Healthcare',
    level2: 'Mental Health Practice',
    model: 'transactional',
  },
  telehealth: { level1: 'Healthcare', level2: 'Telehealth Platform', model: 'hybrid' },
  'home health': {
    level1: 'Healthcare',
    level2: 'Home Health / Care Agency',
    model: 'transactional',
  },
  manufacturing: {
    level1: 'Manufacturing',
    level2: 'Light / Custom Manufacturing',
    model: 'transactional',
  },
  'food manufacturing': {
    level1: 'Manufacturing',
    level2: 'Food Manufacturing / Co-packing',
    model: 'transactional',
  },
  electronics: {
    level1: 'Manufacturing',
    level2: 'Electronics / Contract Mfg',
    model: 'transactional',
  },
  contractor: {
    level1: 'Construction',
    level2: 'General Contractor (Residential)',
    model: 'transactional',
  },
  construction: {
    level1: 'Construction',
    level2: 'General Contractor (Residential)',
    model: 'transactional',
  },
  hvac: {
    level1: 'Construction',
    level2: 'Specialty Contractor (HVAC/Elec/Plumb)',
    model: 'transactional',
  },
  plumbing: {
    level1: 'Construction',
    level2: 'Specialty Contractor (HVAC/Elec/Plumb)',
    model: 'transactional',
  },
  electrical: {
    level1: 'Construction',
    level2: 'Specialty Contractor (HVAC/Elec/Plumb)',
    model: 'transactional',
  },
  // 2026-11-03: the trade words isTradesBusiness() recognises reach the same
  // peer rows ("plumber" is not a plural of "plumbing").
  plumber: {
    level1: 'Construction',
    level2: 'Specialty Contractor (HVAC/Elec/Plumb)',
    model: 'transactional',
  },
  electrician: {
    level1: 'Construction',
    level2: 'Specialty Contractor (HVAC/Elec/Plumb)',
    model: 'transactional',
  },
  'heating and cooling': {
    level1: 'Construction',
    level2: 'Specialty Contractor (HVAC/Elec/Plumb)',
    model: 'transactional',
  },
  'heating and air': {
    level1: 'Construction',
    level2: 'Specialty Contractor (HVAC/Elec/Plumb)',
    model: 'transactional',
  },
  'furnace repair': {
    level1: 'Construction',
    level2: 'Specialty Contractor (HVAC/Elec/Plumb)',
    model: 'transactional',
  },
  'air conditioning': {
    level1: 'Construction',
    level2: 'Specialty Contractor (HVAC/Elec/Plumb)',
    model: 'transactional',
  },
  roofing: {
    level1: 'Construction',
    level2: 'General Contractor (Residential)',
    model: 'transactional',
  },
  roofer: {
    level1: 'Construction',
    level2: 'General Contractor (Residential)',
    model: 'transactional',
  },
  handyman: {
    level1: 'Construction',
    level2: 'General Contractor (Residential)',
    model: 'transactional',
  },
  'property management': {
    level1: 'Real Estate',
    level2: 'Property Management',
    model: 'subscription',
  },
  'real estate': {
    level1: 'Real Estate',
    level2: 'Real Estate Agency / Brokerage',
    model: 'transactional',
  },
  course: { level1: 'Education', level2: 'Online Course / EdTech Platform', model: 'hybrid' },
  edtech: { level1: 'Education', level2: 'Online Course / EdTech Platform', model: 'hybrid' },
  tutoring: { level1: 'Education', level2: 'Tutoring / Test Prep (B2C)', model: 'transactional' },
  training: { level1: 'Education', level2: 'Corporate Training / L&D', model: 'subscription' },
  delivery: { level1: 'Logistics', level2: 'Last-Mile Delivery (B2C)', model: 'transactional' },
  freight: { level1: 'Logistics', level2: 'Freight Brokerage', model: 'transactional' },
  logistics: { level1: 'Logistics', level2: 'Last-Mile Delivery (B2C)', model: 'transactional' },
  fintech: { level1: 'Fintech', level2: 'Payments / Payment Processing', model: 'transactional' },
  payments: { level1: 'Fintech', level2: 'Payments / Payment Processing', model: 'transactional' },
  lending: {
    level1: 'Fintech',
    level2: 'SMB Lending / Revenue-Based Finance',
    model: 'transactional',
  },
  newsletter: { level1: 'Media', level2: 'Newsletter / Content Media', model: 'subscription' },
  podcast: {
    level1: 'Media',
    level2: 'Podcast / Video Creator (Ad + Subscription)',
    model: 'hybrid',
  },
  media: { level1: 'Media', level2: 'Newsletter / Content Media', model: 'subscription' },
  salon: { level1: 'Beauty & Wellness', level2: 'Hair Salon / Barbershop', model: 'transactional' },
  barbershop: {
    level1: 'Beauty & Wellness',
    level2: 'Hair Salon / Barbershop',
    model: 'transactional',
  },
  'med spa': {
    level1: 'Beauty & Wellness',
    level2: 'Med Spa / Aesthetics Clinic',
    model: 'transactional',
  },
  aesthetics: {
    level1: 'Beauty & Wellness',
    level2: 'Med Spa / Aesthetics Clinic',
    model: 'transactional',
  },
  gym: { level1: 'Beauty & Wellness', level2: 'Fitness Studio / Gym', model: 'subscription' },
  fitness: { level1: 'Beauty & Wellness', level2: 'Fitness Studio / Gym', model: 'subscription' },
  yoga: { level1: 'Beauty & Wellness', level2: 'Fitness Studio / Gym', model: 'subscription' },
  'personal training': {
    level1: 'Beauty & Wellness',
    level2: 'Personal Training / Coaching',
    model: 'transactional',
  },
  coaching: {
    level1: 'Beauty & Wellness',
    level2: 'Personal Training / Coaching',
    model: 'transactional',
  },
  agritech: {
    level1: 'Agriculture',
    level2: 'AgriTech SaaS / Farm Management',
    model: 'subscription',
  },
  farm: { level1: 'Agriculture', level2: 'AgriTech SaaS / Farm Management', model: 'subscription' },
  'auto repair': {
    level1: 'Transportation',
    level2: 'Auto Repair / Service Center',
    model: 'transactional',
  },
  mechanic: {
    level1: 'Transportation',
    level2: 'Auto Repair / Service Center',
    model: 'transactional',
  },
  nonprofit: { level1: 'Non-profit', level2: '501(c)(3) / Charitable Org', model: 'hybrid' },
  charity: { level1: 'Non-profit', level2: '501(c)(3) / Charitable Org', model: 'hybrid' },
};

// Location keyword → geo mapping
export const GEO_KEYWORDS: Record<string, { region: string; country: string; tier: string }> = {
  'new york': { region: 'US', country: 'US', tier: 'T1' },
  nyc: { region: 'US', country: 'US', tier: 'T1' },
  'los angeles': { region: 'US', country: 'US', tier: 'T1' },
  la: { region: 'US', country: 'US', tier: 'T1' },
  chicago: { region: 'US', country: 'US', tier: 'T1' },
  'san francisco': { region: 'US', country: 'US', tier: 'T1' },
  sf: { region: 'US', country: 'US', tier: 'T1' },
  boston: { region: 'US', country: 'US', tier: 'T1' },
  seattle: { region: 'US', country: 'US', tier: 'T1' },
  miami: { region: 'US', country: 'US', tier: 'T1' },
  denver: { region: 'US', country: 'US', tier: 'T2' },
  austin: { region: 'US', country: 'US', tier: 'T2' },
  dallas: { region: 'US', country: 'US', tier: 'T2' },
  atlanta: { region: 'US', country: 'US', tier: 'T2' },
  phoenix: { region: 'US', country: 'US', tier: 'T2' },
  portland: { region: 'US', country: 'US', tier: 'T2' },
  nashville: { region: 'US', country: 'US', tier: 'T2' },
  charlotte: { region: 'US', country: 'US', tier: 'T2' },
  london: { region: 'EU', country: 'UK', tier: 'T1' },
  berlin: { region: 'EU', country: 'DE', tier: 'T1' },
  paris: { region: 'EU', country: 'FR', tier: 'T1' },
  munich: { region: 'EU', country: 'DE', tier: 'T2' },
  'sao paulo': { region: 'LATAM', country: 'BR', tier: 'T1' },
  'mexico city': { region: 'LATAM', country: 'MX', tier: 'T1' },
  singapore: { region: 'APAC', country: 'SG', tier: 'T1' },
  mumbai: { region: 'APAC', country: 'IN', tier: 'T1' },
  sydney: { region: 'APAC', country: 'AU', tier: 'T1' },
  tokyo: { region: 'APAC', country: 'JP', tier: 'T1' },
  dubai: { region: 'MENA', country: 'AE', tier: 'T1' },
  toronto: { region: 'CA', country: 'CA', tier: 'T1' },
  vancouver: { region: 'CA', country: 'CA', tier: 'T1' },
};

/**
 * Detect sector from business idea text.
 */
export function detectSectorFromIdea(idea: string): {
  level1: string;
  level2: string;
  model: string;
  /** false when no keyword matched and the consulting placeholder was returned. */
  matched: boolean;
} {
  // Try multi-word matches first (longer matches = more specific). Whole
  // words only: raw includes() let "technician" match a tech keyword.
  const sortedKeys = Object.keys(SECTOR_KEYWORDS).sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeys) {
    if (containsWord(idea, keyword)) {
      return { ...SECTOR_KEYWORDS[keyword], matched: true };
    }
  }

  // No keyword matched. The consulting row is only a placeholder query; callers
  // must not present it as a match for this business (see matched: false).
  return { level1: 'Services', level2: 'B2B Consulting (Strategy/Mgmt)', model: 'transactional', matched: false };
}

/**
 * Detect geo from location text.
 */
export function detectGeoFromLocation(location: string): {
  region: string;
  country: string;
  tier: string;
} {
  const lower = location
    .toLowerCase()
    .replace(/[,.\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Whole words only: raw includes() mapped Orlando, Las Vegas and Salt Lake
  // to Los Angeles ("la") and anything with "sf" in it to San Francisco.
  const sortedKeys = Object.keys(GEO_KEYWORDS).sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeys) {
    if (containsWord(lower, keyword, false)) {
      return GEO_KEYWORDS[keyword];
    }
  }

  // Infer region from country codes/names
  if (containsWord(lower, 'usa', false) || lower.includes('united states') || lower.includes('america')) {
    return { region: 'US', country: 'US', tier: 'T2' };
  }
  if (containsWord(lower, 'uk', false) || lower.includes('united kingdom') || lower.includes('england')) {
    return { region: 'EU', country: 'UK', tier: 'T1' };
  }
  if (lower.includes('germany') || lower.includes('deutschland')) {
    return { region: 'EU', country: 'DE', tier: 'T2' };
  }
  if (lower.includes('canada')) {
    return { region: 'CA', country: 'CA', tier: 'T1' };
  }

  // Default: US T3
  return { region: 'US', country: 'US', tier: 'T3' };
}

type SectionWithQuality = { match_quality?: string } | null | undefined;

/**
 * Downgrade a V2 benchmark summary whose sector was the placeholder (no keyword
 * matched): every sector-dependent section and the overall quality become
 * 'sector_fallback', which is never reported as a direct/"exact" match and is
 * not used to overwrite the industry the legacy classifier did detect.
 * Location benchmarks (geo) keep their own quality.
 */
export function markSectorFallback<
  T extends {
    overall_match_quality: string;
    core?: SectionWithQuality;
    unit_econ?: SectionWithQuality;
    risk?: SectionWithQuality;
    invoice?: SectionWithQuality;
  },
>(summary: T): T {
  const down = <S extends SectionWithQuality>(s: S): S =>
    s ? ({ ...s, match_quality: 'sector_fallback' } as S) : s;
  return {
    ...summary,
    core: down(summary.core),
    unit_econ: down(summary.unit_econ),
    risk: down(summary.risk),
    invoice: down(summary.invoice),
    overall_match_quality: 'sector_fallback',
  };
}

/** Highest evidence score without a matched industry benchmark: one below "Investor Grade" (85). */
export const NO_PEER_BENCHMARK_CONFIDENCE_CAP = 84;
