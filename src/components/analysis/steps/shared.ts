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
  { id: 'coffee_shop', icon: Coffee, label: 'Coffee Shop' },
  { id: 'saas',        icon: Monitor, label: 'SaaS' },
  { id: 'ecommerce',   icon: ShoppingCart, label: 'Ecommerce' },
  { id: 'restaurant',  icon: Utensils, label: 'Restaurant' },
  { id: 'fitness',     icon: Dumbbell, label: 'Fitness' },
  { id: 'consulting',  icon: ConsultingIcon, label: 'Consulting' },
  { id: 'retail',      icon: Store, label: 'Retail' },
  { id: 'real_estate', icon: Building2, label: 'Real Estate' },
];

export const DEPTH_OPTIONS = [
  { id: 'quick', label: 'Quick', time: '30s', desc: 'Core projections' },
  { id: 'full',  label: 'Full',  time: '90s', desc: 'P&L + Stress Map' },
  { id: 'deep',  label: 'Deep',  time: '3min', desc: 'All engines' },
];

/* ─── FORMAT HELPERS ─── */
export function fmtK(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `$${n}`;
}

export function fmtPct(n: number): string {
  return `${n.toFixed(0)}%`;
}
