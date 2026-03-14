/**
 * Bottom-Up OpEx Calculator
 * Industry-specific staffing models + BLS wage data to validate user OpEx inputs.
 */

export interface BottomUpOpEx {
  labor: number;
  rent: number;
  utilities: number;
  insurance: number;
  supplies: number;
  marketing: number;
  total: number;
  userInputted: number;
  delta: number;
  deltaPercent: number;
  deltaWarning: boolean;
  laborBreakdown: { role: string; count: number; monthlyCost: number }[];
  source: string;
}

// BLS 2024-2025 median hourly wages by MSA (key cities)
const BLS_WAGES: Record<string, Record<string, number>> = {
  denver:   { food_service: 16.50, fitness_instructor: 22.50, front_desk: 17.00, retail: 16.00, barista: 17.50, cook: 18.00, manager: 25.00, cleaner: 16.50, tutor: 24.00 },
  los_angeles: { food_service: 17.50, fitness_instructor: 25.00, front_desk: 18.00, retail: 17.00, barista: 18.50, cook: 19.00, manager: 27.00, cleaner: 17.50, tutor: 26.00 },
  new_york: { food_service: 18.00, fitness_instructor: 28.00, front_desk: 19.00, retail: 18.00, barista: 19.00, cook: 20.00, manager: 30.00, cleaner: 18.00, tutor: 30.00 },
  chicago:  { food_service: 16.00, fitness_instructor: 21.00, front_desk: 16.50, retail: 15.50, barista: 17.00, cook: 17.50, manager: 24.00, cleaner: 16.00, tutor: 23.00 },
  miami:    { food_service: 15.50, fitness_instructor: 20.00, front_desk: 16.00, retail: 15.00, barista: 16.50, cook: 17.00, manager: 23.00, cleaner: 15.50, tutor: 22.00 },
  austin:   { food_service: 15.50, fitness_instructor: 21.00, front_desk: 16.00, retail: 15.50, barista: 16.50, cook: 17.00, manager: 23.50, cleaner: 15.50, tutor: 23.00 },
  seattle:  { food_service: 18.50, fitness_instructor: 26.00, front_desk: 19.00, retail: 18.00, barista: 19.50, cook: 20.50, manager: 28.00, cleaner: 18.50, tutor: 27.00 },
  default:  { food_service: 15.00, fitness_instructor: 20.00, front_desk: 15.50, retail: 14.50, barista: 16.00, cook: 16.50, manager: 22.00, cleaner: 15.00, tutor: 22.00 },
};

const MONTHLY_HOURS = 160; // 40 hrs/week × 4 weeks

interface StaffingModel {
  roles: (inputs: { customers?: number; revenue?: number }) => { role: string; count: number; wageKey: string }[];
  rentEstimate: number;
  utilitiesEstimate: number;
  insuranceEstimate: number;
  suppliesPctRevenue: number;
  marketingPctRevenue: number;
}

const STAFFING_MODELS: Record<string, StaffingModel> = {
  coffee_shop: {
    roles: ({ customers = 100 }) => [
      { role: 'Barista', count: Math.max(2, Math.ceil(customers / 50)), wageKey: 'barista' },
      { role: 'Manager', count: 1, wageKey: 'manager' },
    ],
    rentEstimate: 3500, utilitiesEstimate: 800, insuranceEstimate: 400, suppliesPctRevenue: 0.35, marketingPctRevenue: 0.05,
  },
  restaurant: {
    roles: ({ customers = 80 }) => [
      { role: 'Cook', count: Math.max(2, Math.ceil(customers / 30)), wageKey: 'cook' },
      { role: 'Server', count: Math.max(2, Math.ceil(customers / 25)), wageKey: 'food_service' },
      { role: 'Manager', count: 1, wageKey: 'manager' },
    ],
    rentEstimate: 5000, utilitiesEstimate: 1200, insuranceEstimate: 600, suppliesPctRevenue: 0.30, marketingPctRevenue: 0.04,
  },
  fitness_boutique: {
    roles: ({ customers = 150 }) => [
      { role: 'Instructor', count: Math.max(2, Math.ceil(customers / 20)), wageKey: 'fitness_instructor' },
      { role: 'Front Desk', count: Math.max(1, Math.ceil(customers / 150)), wageKey: 'front_desk' },
    ],
    rentEstimate: 4000, utilitiesEstimate: 600, insuranceEstimate: 500, suppliesPctRevenue: 0.05, marketingPctRevenue: 0.08,
  },
  retail: {
    roles: ({ customers = 200 }) => [
      { role: 'Sales Associate', count: Math.max(2, Math.ceil(customers / 80)), wageKey: 'retail' },
      { role: 'Manager', count: 1, wageKey: 'manager' },
    ],
    rentEstimate: 4500, utilitiesEstimate: 500, insuranceEstimate: 400, suppliesPctRevenue: 0.02, marketingPctRevenue: 0.06,
  },
  salon: {
    roles: ({ customers = 100 }) => [
      { role: 'Stylist', count: Math.max(2, Math.ceil(customers / 40)), wageKey: 'fitness_instructor' },
      { role: 'Front Desk', count: 1, wageKey: 'front_desk' },
    ],
    rentEstimate: 3000, utilitiesEstimate: 400, insuranceEstimate: 350, suppliesPctRevenue: 0.15, marketingPctRevenue: 0.06,
  },
  spa: {
    roles: ({ customers = 80 }) => [
      { role: 'Therapist', count: Math.max(2, Math.ceil(customers / 25)), wageKey: 'fitness_instructor' },
      { role: 'Front Desk', count: 1, wageKey: 'front_desk' },
    ],
    rentEstimate: 3500, utilitiesEstimate: 500, insuranceEstimate: 500, suppliesPctRevenue: 0.12, marketingPctRevenue: 0.07,
  },
  coworking: {
    roles: () => [
      { role: 'Community Manager', count: 1, wageKey: 'manager' },
      { role: 'Front Desk', count: 1, wageKey: 'front_desk' },
    ],
    rentEstimate: 8000, utilitiesEstimate: 1500, insuranceEstimate: 600, suppliesPctRevenue: 0.03, marketingPctRevenue: 0.08,
  },
  tutoring: {
    roles: ({ customers = 30 }) => [
      { role: 'Tutor', count: Math.max(1, Math.ceil(customers / 10)), wageKey: 'tutor' },
    ],
    rentEstimate: 1500, utilitiesEstimate: 200, insuranceEstimate: 200, suppliesPctRevenue: 0.05, marketingPctRevenue: 0.10,
  },
  cleaning: {
    roles: ({ customers = 40 }) => [
      { role: 'Cleaner', count: Math.max(2, Math.ceil(customers / 15)), wageKey: 'cleaner' },
      { role: 'Manager', count: 1, wageKey: 'manager' },
    ],
    rentEstimate: 1000, utilitiesEstimate: 200, insuranceEstimate: 400, suppliesPctRevenue: 0.10, marketingPctRevenue: 0.08,
  },
  food_truck: {
    roles: () => [
      { role: 'Cook', count: 2, wageKey: 'cook' },
    ],
    rentEstimate: 800, utilitiesEstimate: 300, insuranceEstimate: 500, suppliesPctRevenue: 0.30, marketingPctRevenue: 0.05,
  },
};

function normalizeLocation(location: string): string {
  const lower = location.toLowerCase();
  for (const key of Object.keys(BLS_WAGES)) {
    if (key !== 'default' && lower.includes(key.replace('_', ' '))) return key;
  }
  if (lower.includes('la') || lower.includes('angeles')) return 'los_angeles';
  if (lower.includes('ny') || lower.includes('york')) return 'new_york';
  if (lower.includes('sf') || lower.includes('francisco')) return 'seattle'; // similar wage band
  return 'default';
}

function normalizeIndustry(industry: string): string {
  const lower = industry.toLowerCase().replace(/[_\s-]+/g, '_');
  // Direct match
  if (STAFFING_MODELS[lower]) return lower;
  // Keyword mapping
  if (lower.includes('coffee') || lower.includes('cafe')) return 'coffee_shop';
  if (lower.includes('fitness') || lower.includes('gym') || lower.includes('yoga')) return 'fitness_boutique';
  if (lower.includes('restaurant') || lower.includes('dining')) return 'restaurant';
  if (lower.includes('retail') || lower.includes('shop') || lower.includes('store')) return 'retail';
  if (lower.includes('salon') || lower.includes('barber') || lower.includes('beauty')) return 'salon';
  if (lower.includes('spa') || lower.includes('wellness')) return 'spa';
  if (lower.includes('cowork')) return 'coworking';
  if (lower.includes('tutor') || lower.includes('education')) return 'tutoring';
  if (lower.includes('clean') || lower.includes('janitorial')) return 'cleaning';
  if (lower.includes('food_truck') || lower.includes('food truck')) return 'food_truck';
  return '';
}

/**
 * Estimate OpEx using bottom-up labor model + industry-specific costs
 */
export function estimateOpEx(
  industry: string,
  inputs: { customers?: number; revenue?: number },
  location: string,
  userOpEx: number
): BottomUpOpEx | null {
  const normalizedIndustry = normalizeIndustry(industry);
  if (!normalizedIndustry || !STAFFING_MODELS[normalizedIndustry]) return null;

  const model = STAFFING_MODELS[normalizedIndustry];
  const wages = BLS_WAGES[normalizeLocation(location)] || BLS_WAGES.default;
  const roles = model.roles(inputs);

  const laborBreakdown = roles.map(r => ({
    role: r.role,
    count: r.count,
    monthlyCost: Math.round(r.count * (wages[r.wageKey] || 15) * MONTHLY_HOURS),
  }));

  const labor = laborBreakdown.reduce((sum, r) => sum + r.monthlyCost, 0);
  const revenue = inputs.revenue || 15000;
  const supplies = Math.round(revenue * model.suppliesPctRevenue);
  const marketing = Math.round(revenue * model.marketingPctRevenue);
  const total = labor + model.rentEstimate + model.utilitiesEstimate + model.insuranceEstimate + supplies + marketing;
  const delta = userOpEx - total;
  const deltaPercent = total > 0 ? Math.round((Math.abs(delta) / total) * 100) : 0;

  return {
    labor,
    rent: model.rentEstimate,
    utilities: model.utilitiesEstimate,
    insurance: model.insuranceEstimate,
    supplies,
    marketing,
    total,
    userInputted: userOpEx,
    delta,
    deltaPercent,
    deltaWarning: deltaPercent > 25,
    laborBreakdown,
    source: `BLS OES ${normalizeLocation(location) === 'default' ? 'National' : normalizeLocation(location).replace('_', ' ')} wages · ${new Date().getFullYear()}`,
  };
}
