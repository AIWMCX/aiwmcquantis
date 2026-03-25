import { Coffee, Monitor, ShoppingCart, Utensils, Dumbbell, BarChart3 as ConsultingIcon, Store, Building2 } from 'lucide-react';

/* ─── INDUSTRY DATA ─── */
export const INDUSTRY_BENCHMARKS: Record<string, Record<string, [number, number]>> = {
  coffee_shop:  { capital: [40000, 120000], price: [4, 8],       customers: [80, 200],   opex: [8000, 18000],  cac: [12, 35],    churn: [3, 8]   },
  saas:         { capital: [15000, 80000],  price: [29, 299],    customers: [20, 150],   opex: [5000, 25000],  cac: [80, 400],   churn: [2, 6]   },
  ecommerce:    { capital: [10000, 60000],  price: [35, 180],    customers: [50, 400],   opex: [3000, 15000],  cac: [15, 80],    churn: [20, 45] },
  restaurant:   { capital: [80000, 300000], price: [18, 55],     customers: [200, 800],  opex: [20000, 60000], cac: [8, 30],     churn: [5, 15]  },
  fitness:      { capital: [30000, 150000], price: [60, 180],    customers: [40, 200],   opex: [6000, 20000],  cac: [45, 180],   churn: [4, 10]  },
  consulting:   { capital: [5000, 30000],   price: [3000, 15000],customers: [3, 20],     opex: [2000, 8000],   cac: [200, 1200], churn: [2, 8]   },
  retail:       { capital: [50000, 200000], price: [25, 120],    customers: [100, 500],  opex: [10000, 35000], cac: [10, 40],    churn: [10, 30] },
  real_estate:  { capital: [20000, 100000], price: [2500, 12000],customers: [2, 15],     opex: [3000, 10000],  cac: [300, 2000], churn: [3, 10]  },
};

export const INDUSTRIES = [
  { id: 'coffee_shop', icon: Coffee, label: 'Coffee Shop', sub: 'Brick & mortar', popular: true },
  { id: 'saas',        icon: Monitor, label: 'SaaS', sub: 'Digital product', popular: true },
  { id: 'ecommerce',   icon: ShoppingCart, label: 'Ecommerce', sub: 'Online retail' },
  { id: 'restaurant',  icon: Utensils, label: 'Restaurant', sub: 'Food & beverage' },
  { id: 'fitness',     icon: Dumbbell, label: 'Fitness', sub: 'Health & wellness' },
  { id: 'consulting',  icon: ConsultingIcon, label: 'Consulting', sub: 'Professional services' },
  { id: 'retail',      icon: Store, label: 'Retail', sub: 'Physical storefront' },
  { id: 'real_estate', icon: Building2, label: 'Real Estate', sub: 'Property mgmt' },
];

export const DEPTH_OPTIONS = [
  { id: 'quick', label: 'Quick', time: '30s', desc: 'Core projections' },
  { id: 'full',  label: 'Full',  time: '90s', desc: 'P&L + Stress Map + Benchmarks', recommended: true },
  { id: 'deep',  label: 'Deep',  time: '3min', desc: 'All engines + Monte Carlo' },
];

/* ─── SMART ADVISOR HINTS ─── */
export const FIELD_HINTS: Record<string, Record<string, string>> = {
  coffee_shop:  { capital: 'Most coffee shops: $40k–$120k', price: 'Typical: $4–$8 per drink', customers: 'Launch target: 80–200/mo', opex: 'Rent + staff: $8k–$18k', cac: 'Local ads: $12–$35', churn: 'Typical: 3–8%' },
  saas:         { capital: 'Typical SaaS: $15k–$80k', price: 'Most SaaS: $29–$299/mo', customers: 'Launch: 20–150 users', opex: 'Team + infra: $5k–$25k', cac: 'Digital ads: $80–$400', churn: 'Best-in-class: 2–6%' },
  ecommerce:    { capital: 'Online store: $10k–$60k', price: 'Average order: $35–$180', customers: 'First month: 50–400', opex: 'Fulfillment: $3k–$15k', cac: 'Social + PPC: $15–$80', churn: 'Typical: 20–45%' },
  restaurant:   { capital: 'Restaurant: $80k–$300k', price: 'Per check: $18–$55', customers: 'Covers/mo: 200–800', opex: 'Full ops: $20k–$60k', cac: 'Local: $8–$30', churn: 'Typical: 5–15%' },
  fitness:      { capital: 'Gym/studio: $30k–$150k', price: 'Membership: $60–$180/mo', customers: 'Launch: 40–200 members', opex: 'Lease + staff: $6k–$20k', cac: 'Typical: $45–$180', churn: 'Industry: 4–10%' },
  consulting:   { capital: 'Low overhead: $5k–$30k', price: 'Project: $3k–$15k', customers: 'Active clients: 3–20', opex: 'Minimal: $2k–$8k', cac: 'Networking: $200–$1.2k', churn: 'Typical: 2–8%' },
  retail:       { capital: 'Storefront: $50k–$200k', price: 'Avg transaction: $25–$120', customers: 'Traffic: 100–500/mo', opex: 'Rent + stock: $10k–$35k', cac: 'Local: $10–$40', churn: 'Typical: 10–30%' },
  real_estate:  { capital: 'Agency: $20k–$100k', price: 'Per deal: $2.5k–$12k', customers: 'Listings: 2–15/mo', opex: 'Office + tools: $3k–$10k', cac: 'Leads: $300–$2k', churn: 'Typical: 3–10%' },
};

/* ─── FORMAT HELPERS ─── */
export function fmtK(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `$${n}`;
}

export function fmtPct(n: number): string {
  return `${n.toFixed(0)}%`;
}
