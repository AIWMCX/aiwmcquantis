/**
 * Geo-Specific Coefficient Engine
 * 
 * Applies geographic cost-of-living and market adjustments to base (national)
 * benchmarks, producing location-calibrated financial projections.
 * Multipliers are Quantis estimates (rent, salary, demand vs the US average), not
 * licensed local data.
 */

import { QuantisMath } from './quantis-math';

// ─── Types ───

export interface GeoCoefficients {
  geoSlug: string;
  displayName: string;
  rentMultiplier: number;
  salaryMultiplier: number;
  demandMultiplier: number;
  populationDensityTier: 'low' | 'medium' | 'high' | 'metro';
  medianHouseholdIncome: number;
  businessSurvivalRate1yr: number;
  businessSurvivalRate5yr: number;
  sources: string[];
}

export interface GeoCalibrationResult {
  calibrated: Record<string, number>;
  appliedCoefficients: Record<string, number>;
  geoDisplayName: string;
  adjustmentNotes: string[];
}

// ─── Geo Database (16 cities + national baseline) ───

export const GEO_COEFFICIENTS: GeoCoefficients[] = [
  // National baseline — all multipliers = 1.0
  {
    geoSlug: 'us_national',
    displayName: 'US National Average',
    rentMultiplier: 1.0,
    salaryMultiplier: 1.0,
    demandMultiplier: 1.0,
    populationDensityTier: 'medium',
    medianHouseholdIncome: 75149,
    businessSurvivalRate1yr: 0.80,
    businessSurvivalRate5yr: 0.50,
    sources: ['BLS 2024', 'Census ACS 2023', 'SBA Office of Advocacy 2024'],
  },
  {
    geoSlug: 'denver_co',
    displayName: 'Denver, CO',
    rentMultiplier: 1.15,
    salaryMultiplier: 1.08,
    demandMultiplier: 1.10,
    populationDensityTier: 'high',
    medianHouseholdIncome: 72000,
    businessSurvivalRate1yr: 0.79,
    businessSurvivalRate5yr: 0.49,
    sources: ['BLS 2024', 'Quantis rent estimate', 'Census ACS 2023'],
  },
  {
    geoSlug: 'new_york_ny',
    displayName: 'New York, NY',
    rentMultiplier: 2.35,
    salaryMultiplier: 1.32,
    demandMultiplier: 1.25,
    populationDensityTier: 'metro',
    medianHouseholdIncome: 70663,
    businessSurvivalRate1yr: 0.77,
    businessSurvivalRate5yr: 0.45,
    sources: ['BLS 2024', 'Quantis rent estimate', 'Census ACS 2023'],
  },
  {
    geoSlug: 'los_angeles_ca',
    displayName: 'Los Angeles, CA',
    rentMultiplier: 1.85,
    salaryMultiplier: 1.18,
    demandMultiplier: 1.15,
    populationDensityTier: 'metro',
    medianHouseholdIncome: 69778,
    businessSurvivalRate1yr: 0.76,
    businessSurvivalRate5yr: 0.44,
    sources: ['BLS 2024', 'Quantis rent estimate', 'Census ACS 2023'],
  },
  {
    geoSlug: 'chicago_il',
    displayName: 'Chicago, IL',
    rentMultiplier: 1.25,
    salaryMultiplier: 1.10,
    demandMultiplier: 1.05,
    populationDensityTier: 'metro',
    medianHouseholdIncome: 65781,
    businessSurvivalRate1yr: 0.78,
    businessSurvivalRate5yr: 0.47,
    sources: ['BLS 2024', 'Quantis rent estimate', 'Census ACS 2023'],
  },
  {
    geoSlug: 'austin_tx',
    displayName: 'Austin, TX',
    rentMultiplier: 1.20,
    salaryMultiplier: 1.12,
    demandMultiplier: 1.18,
    populationDensityTier: 'high',
    medianHouseholdIncome: 80954,
    businessSurvivalRate1yr: 0.82,
    businessSurvivalRate5yr: 0.52,
    sources: ['BLS 2024', 'Quantis rent estimate', 'Census ACS 2023'],
  },
  {
    geoSlug: 'seattle_wa',
    displayName: 'Seattle, WA',
    rentMultiplier: 1.65,
    salaryMultiplier: 1.25,
    demandMultiplier: 1.12,
    populationDensityTier: 'high',
    medianHouseholdIncome: 105391,
    businessSurvivalRate1yr: 0.81,
    businessSurvivalRate5yr: 0.51,
    sources: ['BLS 2024', 'Quantis rent estimate', 'Census ACS 2023'],
  },
  {
    geoSlug: 'miami_fl',
    displayName: 'Miami, FL',
    rentMultiplier: 1.55,
    salaryMultiplier: 1.02,
    demandMultiplier: 1.08,
    populationDensityTier: 'metro',
    medianHouseholdIncome: 51347,
    businessSurvivalRate1yr: 0.75,
    businessSurvivalRate5yr: 0.42,
    sources: ['BLS 2024', 'Quantis rent estimate', 'Census ACS 2023'],
  },
  {
    geoSlug: 'phoenix_az',
    displayName: 'Phoenix, AZ',
    rentMultiplier: 1.05,
    salaryMultiplier: 0.98,
    demandMultiplier: 1.06,
    populationDensityTier: 'high',
    medianHouseholdIncome: 65051,
    businessSurvivalRate1yr: 0.79,
    businessSurvivalRate5yr: 0.48,
    sources: ['BLS 2024', 'Quantis rent estimate', 'Census ACS 2023'],
  },
  {
    geoSlug: 'boston_ma',
    displayName: 'Boston, MA',
    rentMultiplier: 1.90,
    salaryMultiplier: 1.28,
    demandMultiplier: 1.12,
    populationDensityTier: 'metro',
    medianHouseholdIncome: 81744,
    businessSurvivalRate1yr: 0.82,
    businessSurvivalRate5yr: 0.52,
    sources: ['BLS 2024', 'Quantis rent estimate', 'Census ACS 2023'],
  },
  {
    geoSlug: 'atlanta_ga',
    displayName: 'Atlanta, GA',
    rentMultiplier: 1.10,
    salaryMultiplier: 1.05,
    demandMultiplier: 1.08,
    populationDensityTier: 'high',
    medianHouseholdIncome: 65345,
    businessSurvivalRate1yr: 0.78,
    businessSurvivalRate5yr: 0.47,
    sources: ['BLS 2024', 'Quantis rent estimate', 'Census ACS 2023'],
  },
  {
    geoSlug: 'dallas_tx',
    displayName: 'Dallas, TX',
    rentMultiplier: 1.08,
    salaryMultiplier: 1.05,
    demandMultiplier: 1.10,
    populationDensityTier: 'high',
    medianHouseholdIncome: 60958,
    businessSurvivalRate1yr: 0.80,
    businessSurvivalRate5yr: 0.49,
    sources: ['BLS 2024', 'Quantis rent estimate', 'Census ACS 2023'],
  },
  {
    geoSlug: 'san_francisco_ca',
    displayName: 'San Francisco, CA',
    rentMultiplier: 2.50,
    salaryMultiplier: 1.42,
    demandMultiplier: 1.15,
    populationDensityTier: 'metro',
    medianHouseholdIncome: 119136,
    businessSurvivalRate1yr: 0.78,
    businessSurvivalRate5yr: 0.46,
    sources: ['BLS 2024', 'Quantis rent estimate', 'Census ACS 2023'],
  },
  {
    geoSlug: 'portland_or',
    displayName: 'Portland, OR',
    rentMultiplier: 1.30,
    salaryMultiplier: 1.10,
    demandMultiplier: 1.05,
    populationDensityTier: 'high',
    medianHouseholdIncome: 73097,
    businessSurvivalRate1yr: 0.79,
    businessSurvivalRate5yr: 0.48,
    sources: ['BLS 2024', 'Quantis rent estimate', 'Census ACS 2023'],
  },
  {
    geoSlug: 'nashville_tn',
    displayName: 'Nashville, TN',
    rentMultiplier: 1.12,
    salaryMultiplier: 1.04,
    demandMultiplier: 1.12,
    populationDensityTier: 'high',
    medianHouseholdIncome: 63826,
    businessSurvivalRate1yr: 0.81,
    businessSurvivalRate5yr: 0.50,
    sources: ['BLS 2024', 'Quantis rent estimate', 'Census ACS 2023'],
  },
  {
    geoSlug: 'charlotte_nc',
    displayName: 'Charlotte, NC',
    rentMultiplier: 1.05,
    salaryMultiplier: 1.02,
    demandMultiplier: 1.08,
    populationDensityTier: 'high',
    medianHouseholdIncome: 66399,
    businessSurvivalRate1yr: 0.80,
    businessSurvivalRate5yr: 0.49,
    sources: ['BLS 2024', 'Quantis rent estimate', 'Census ACS 2023'],
  },
];

// ─── Geo Lookup ───

const GEO_MAP = new Map(GEO_COEFFICIENTS.map(g => [g.geoSlug, g]));

export function getGeoCoefficients(geoSlug: string): GeoCoefficients {
  return GEO_MAP.get(geoSlug) || GEO_MAP.get('us_national')!;
}

// ─── Parameter → Coefficient Mapping ───

// Which geo coefficient applies to which benchmark parameter
const PARAM_GEO_EFFECT: Record<string, 'rent' | 'salary' | 'demand' | 'none'> = {
  rent_pct_revenue: 'rent',
  payroll_pct_revenue: 'salary',
  cac: 'demand',
  ltv: 'demand',
  avg_ticket_size: 'demand',
  conversion_rate: 'demand',
  gross_margin: 'none',
  churn_rate: 'none',
  break_even_months: 'none',
  monthly_growth_rate: 'none',
  refund_rate: 'none',
  support_cost_per_user: 'salary',
};

// ─── Core Functions ───

/**
 * Apply geo-specific calibration to base (national) benchmark values.
 * Returns calibrated values with applied coefficients and adjustment notes.
 */
export function applyGeoCalibration(
  baseBenchmarks: Record<string, number>,
  geoSlug: string,
  _industry: string
): GeoCalibrationResult {
  const geo = getGeoCoefficients(geoSlug);
  const calibrated: Record<string, number> = {};
  const appliedCoefficients: Record<string, number> = {};
  const adjustmentNotes: string[] = [];

  for (const [param, value] of Object.entries(baseBenchmarks)) {
    const effect = PARAM_GEO_EFFECT[param] || 'none';
    let multiplier = 1.0;

    switch (effect) {
      case 'rent':
        multiplier = geo.rentMultiplier;
        break;
      case 'salary':
        multiplier = geo.salaryMultiplier;
        break;
      case 'demand':
        multiplier = geo.demandMultiplier;
        break;
      case 'none':
      default:
        multiplier = 1.0;
    }

    calibrated[param] = QuantisMath.roundTo(QuantisMath.multiply(value, multiplier), 2);
    appliedCoefficients[param] = multiplier;

    if (Math.abs(multiplier - 1.0) > 0.02) {
      const direction = multiplier > 1 ? 'higher' : 'lower';
      const pct = Math.round(Math.abs(multiplier - 1.0) * 100);
      adjustmentNotes.push(
        `${param.replace(/_/g, ' ')} adjusted ${pct}% ${direction} for ${geo.displayName}`
      );
    }
  }

  return {
    calibrated,
    appliedCoefficients,
    geoDisplayName: geo.displayName,
    adjustmentNotes,
  };
}

// ─── Free-text Location Detection ───

const CITY_ALIASES: Record<string, string> = {
  // City name variants → geoSlug
  'denver': 'denver_co',
  'new york': 'new_york_ny',
  'new york city': 'new_york_ny',
  'nyc': 'new_york_ny',
  'manhattan': 'new_york_ny',
  'brooklyn': 'new_york_ny',
  'los angeles': 'los_angeles_ca',
  'la': 'los_angeles_ca',
  'chicago': 'chicago_il',
  'austin': 'austin_tx',
  'seattle': 'seattle_wa',
  'miami': 'miami_fl',
  'phoenix': 'phoenix_az',
  'boston': 'boston_ma',
  'atlanta': 'atlanta_ga',
  'dallas': 'dallas_tx',
  'san francisco': 'san_francisco_ca',
  'sf': 'san_francisco_ca',
  'portland': 'portland_or',
  'nashville': 'nashville_tn',
  'charlotte': 'charlotte_nc',
  // State abbreviation combos
  'denver co': 'denver_co',
  'denver colorado': 'denver_co',
  'new york ny': 'new_york_ny',
  'los angeles ca': 'los_angeles_ca',
  'los angeles california': 'los_angeles_ca',
  'chicago il': 'chicago_il',
  'chicago illinois': 'chicago_il',
  'austin tx': 'austin_tx',
  'austin texas': 'austin_tx',
  'seattle wa': 'seattle_wa',
  'seattle washington': 'seattle_wa',
  'miami fl': 'miami_fl',
  'miami florida': 'miami_fl',
  'phoenix az': 'phoenix_az',
  'phoenix arizona': 'phoenix_az',
  'boston ma': 'boston_ma',
  'boston massachusetts': 'boston_ma',
  'atlanta ga': 'atlanta_ga',
  'atlanta georgia': 'atlanta_ga',
  'dallas tx': 'dallas_tx',
  'dallas texas': 'dallas_tx',
  'san francisco ca': 'san_francisco_ca',
  'san francisco california': 'san_francisco_ca',
  'portland or': 'portland_or',
  'portland oregon': 'portland_or',
  'nashville tn': 'nashville_tn',
  'nashville tennessee': 'nashville_tn',
  'charlotte nc': 'charlotte_nc',
  'charlotte north carolina': 'charlotte_nc',
};

/**
 * Detect geoSlug from free-text location input.
 * Maps "Denver, Colorado" or "Denver CO" → "denver_co".
 * Falls back to "us_national" if no match.
 */
export function detectGeoFromInput(location: string): string {
  if (!location) return 'us_national';

  const normalized = location
    .toLowerCase()
    .replace(/[,.\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Try exact match first
  if (CITY_ALIASES[normalized]) return CITY_ALIASES[normalized];

  // Try progressively shorter prefixes
  for (const [alias, slug] of Object.entries(CITY_ALIASES)) {
    if (normalized.includes(alias)) return slug;
  }

  return 'us_national';
}

// ─── Industry-specific geo context ───

const INDUSTRY_GEO_INSIGHTS: Record<string, Record<string, string>> = {
  coffee_shop: {
    new_york_ny: 'extremely competitive market with very high rent costs but strong foot traffic',
    san_francisco_ca: 'premium pricing tolerance but high operating costs and tight labor market',
    austin_tx: 'growing market with moderate costs and strong consumer culture',
  },
  saas_b2b: {
    san_francisco_ca: 'talent-rich ecosystem but highest salary costs in the US',
    new_york_ny: 'strong enterprise customer base with premium pricing opportunities',
    austin_tx: 'emerging tech hub with lower costs and growing talent pool',
  },
  restaurant: {
    new_york_ny: 'extremely high rent and labor costs offset by premium pricing potential',
    miami_fl: 'strong tourism demand but seasonal fluctuations and competitive market',
    nashville_tn: 'growing food scene with moderate costs and strong tourism traffic',
  },
};

/**
 * Generate a 1-2 sentence plain English geo insight for explainability.
 */
export function getGeoInsight(geoSlug: string, industry: string): string {
  const geo = getGeoCoefficients(geoSlug);

  // Check for industry-specific insight
  const specific = INDUSTRY_GEO_INSIGHTS[industry]?.[geoSlug];
  if (specific) {
    return `${geo.displayName} has ${specific}. Median household income is $${geo.medianHouseholdIncome.toLocaleString()}.`;
  }

  // Generate dynamic insight from coefficients
  const parts: string[] = [];

  if (geo.rentMultiplier > 1.3) {
    parts.push(`significantly above-average rent costs (+${Math.round((geo.rentMultiplier - 1) * 100)}%)`);
  } else if (geo.rentMultiplier > 1.1) {
    parts.push(`above-average rent costs (+${Math.round((geo.rentMultiplier - 1) * 100)}%)`);
  } else if (geo.rentMultiplier < 0.95) {
    parts.push(`below-average rent costs (${Math.round((geo.rentMultiplier - 1) * 100)}%)`);
  }

  if (geo.demandMultiplier > 1.1) {
    parts.push(`strong consumer demand (+${Math.round((geo.demandMultiplier - 1) * 100)}%)`);
  }

  if (geo.salaryMultiplier > 1.2) {
    parts.push(`high labor costs (+${Math.round((geo.salaryMultiplier - 1) * 100)}%)`);
  }

  const incomeComparison = Math.round(((geo.medianHouseholdIncome / 75149) - 1) * 100);
  const incomeNote = incomeComparison > 5
    ? `household income ${incomeComparison}% above national median`
    : incomeComparison < -5
    ? `household income ${Math.abs(incomeComparison)}% below national median`
    : 'household income near national median';

  if (parts.length === 0) {
    return `${geo.displayName} has costs close to the national average, with ${incomeNote}.`;
  }

  return `${geo.displayName} has ${parts.join(' and ')}, with ${incomeNote}.`;
}
