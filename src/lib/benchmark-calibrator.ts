/**
 * Benchmark Calibrator — Auto-Calibration + GIGO Prevention
 * 
 * Provides percentile-based industry benchmarks for 10 industries × 12 parameters.
 * Used to auto-fill missing params (p50 median) and validate user inputs against
 * realistic ranges with graduated warning levels.
 */

import { QuantisMath as QMath } from './quantis-math';

// ─── Interfaces ──────────────────────────────────────────────

export interface IndustryBenchmark {
  industryType: string;
  parameter: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  unit: string;
  source: string;
  lastUpdated: string;
}

export type WarningLevel = 'none' | 'mild' | 'strong' | 'critical';

export interface BenchmarkValidation {
  isValid: boolean;
  warningLevel: WarningLevel;
  message: string;
  benchmarkRange: { p25: number; p75: number };
  percentile: number;
}

export interface AutofillResult {
  filledParams: Record<string, number>;
  autofilledFields: string[];
  confidence: number;
}

// ─── Parameter → Field Key Mapping ────────────────────────────

const PARAM_TO_FIELD: Record<string, string> = {
  gross_margin: 'gross_margin',
  cac: 'cac',
  ltv: 'ltv',
  conversion_rate: 'conversion_rate',
  churn_rate: 'churn_rate',
  avg_ticket_size: 'average_price',
  rent_pct_revenue: 'rent_pct_revenue',
  payroll_pct_revenue: 'payroll_pct_revenue',
  break_even_months: 'break_even_months',
  monthly_growth_rate: 'monthly_growth_rate',
  refund_rate: 'refund_rate',
  support_cost_per_user: 'support_cost_per_user',
};

// ─── Benchmark Database (10 industries × 12 parameters) ──────

export const BENCHMARK_DATABASE: IndustryBenchmark[] = [
  // ── Coffee Shop ──
  { industryType: 'coffee_shop', parameter: 'gross_margin', p10: 55, p25: 60, p50: 67, p75: 72, p90: 78, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'coffee_shop', parameter: 'cac', p10: 3, p25: 5, p50: 10, p75: 18, p90: 30, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'coffee_shop', parameter: 'ltv', p10: 120, p25: 200, p50: 350, p75: 520, p90: 750, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'coffee_shop', parameter: 'conversion_rate', p10: 8, p25: 15, p50: 25, p75: 35, p90: 45, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'coffee_shop', parameter: 'churn_rate', p10: 2, p25: 4, p50: 7, p75: 12, p90: 18, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'coffee_shop', parameter: 'avg_ticket_size', p10: 3.5, p25: 4.5, p50: 6, p75: 8, p90: 12, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'coffee_shop', parameter: 'rent_pct_revenue', p10: 6, p25: 8, p50: 12, p75: 18, p90: 25, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'coffee_shop', parameter: 'payroll_pct_revenue', p10: 20, p25: 25, p50: 32, p75: 38, p90: 45, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'coffee_shop', parameter: 'break_even_months', p10: 6, p25: 10, p50: 16, p75: 24, p90: 36, unit: 'months', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'coffee_shop', parameter: 'monthly_growth_rate', p10: 0.5, p25: 1.5, p50: 3, p75: 5, p90: 8, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'coffee_shop', parameter: 'refund_rate', p10: 0.2, p25: 0.5, p50: 1, p75: 2, p90: 3.5, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'coffee_shop', parameter: 'support_cost_per_user', p10: 0.2, p25: 0.5, p50: 1, p75: 2, p90: 3, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },

  // ── SaaS B2B ──
  { industryType: 'saas_b2b', parameter: 'gross_margin', p10: 65, p25: 72, p50: 78, p75: 84, p90: 90, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2b', parameter: 'cac', p10: 150, p25: 300, p50: 500, p75: 900, p90: 1500, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2b', parameter: 'ltv', p10: 2000, p25: 5000, p50: 12000, p75: 25000, p90: 50000, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2b', parameter: 'conversion_rate', p10: 1, p25: 2, p50: 3.5, p75: 5.5, p90: 8, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2b', parameter: 'churn_rate', p10: 1, p25: 2, p50: 3.5, p75: 5, p90: 8, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2b', parameter: 'avg_ticket_size', p10: 29, p25: 79, p50: 199, p75: 499, p90: 999, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2b', parameter: 'rent_pct_revenue', p10: 1, p25: 2, p50: 4, p75: 7, p90: 12, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2b', parameter: 'payroll_pct_revenue', p10: 30, p25: 40, p50: 50, p75: 60, p90: 70, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2b', parameter: 'break_even_months', p10: 12, p25: 18, p50: 24, p75: 36, p90: 48, unit: 'months', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2b', parameter: 'monthly_growth_rate', p10: 2, p25: 5, p50: 8, p75: 15, p90: 25, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2b', parameter: 'refund_rate', p10: 1, p25: 2, p50: 4, p75: 7, p90: 12, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2b', parameter: 'support_cost_per_user', p10: 2, p25: 5, p50: 10, p75: 20, p90: 35, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },

  // ── SaaS B2C ──
  { industryType: 'saas_b2c', parameter: 'gross_margin', p10: 60, p25: 68, p50: 75, p75: 82, p90: 88, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2c', parameter: 'cac', p10: 5, p25: 15, p50: 35, p75: 75, p90: 150, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2c', parameter: 'ltv', p10: 50, p25: 120, p50: 280, p75: 600, p90: 1200, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2c', parameter: 'conversion_rate', p10: 2, p25: 3.5, p50: 5.5, p75: 8, p90: 12, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2c', parameter: 'churn_rate', p10: 3, p25: 5, p50: 7, p75: 10, p90: 15, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2c', parameter: 'avg_ticket_size', p10: 5, p25: 9.99, p50: 14.99, p75: 29.99, p90: 49.99, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2c', parameter: 'rent_pct_revenue', p10: 0.5, p25: 1, p50: 3, p75: 5, p90: 8, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2c', parameter: 'payroll_pct_revenue', p10: 25, p25: 35, p50: 45, p75: 55, p90: 65, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2c', parameter: 'break_even_months', p10: 8, p25: 14, p50: 20, p75: 30, p90: 42, unit: 'months', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2c', parameter: 'monthly_growth_rate', p10: 3, p25: 6, p50: 10, p75: 18, p90: 30, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2c', parameter: 'refund_rate', p10: 2, p25: 4, p50: 6, p75: 10, p90: 15, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'saas_b2c', parameter: 'support_cost_per_user', p10: 0.5, p25: 1, p50: 2, p75: 4, p90: 8, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },

  // ── E-commerce ──
  { industryType: 'ecommerce', parameter: 'gross_margin', p10: 20, p25: 30, p50: 42, p75: 55, p90: 68, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'ecommerce', parameter: 'cac', p10: 8, p25: 15, p50: 30, p75: 55, p90: 100, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'ecommerce', parameter: 'ltv', p10: 80, p25: 150, p50: 300, p75: 550, p90: 1000, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'ecommerce', parameter: 'conversion_rate', p10: 0.8, p25: 1.5, p50: 2.5, p75: 4, p90: 6, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'ecommerce', parameter: 'churn_rate', p10: 5, p25: 8, p50: 15, p75: 25, p90: 40, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'ecommerce', parameter: 'avg_ticket_size', p10: 20, p25: 35, p50: 65, p75: 120, p90: 200, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'ecommerce', parameter: 'rent_pct_revenue', p10: 0.5, p25: 1, p50: 2, p75: 5, p90: 8, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'ecommerce', parameter: 'payroll_pct_revenue', p10: 8, p25: 12, p50: 18, p75: 25, p90: 35, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'ecommerce', parameter: 'break_even_months', p10: 4, p25: 8, p50: 14, p75: 22, p90: 36, unit: 'months', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'ecommerce', parameter: 'monthly_growth_rate', p10: 2, p25: 5, p50: 8, p75: 15, p90: 25, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'ecommerce', parameter: 'refund_rate', p10: 2, p25: 4, p50: 8, p75: 14, p90: 22, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'ecommerce', parameter: 'support_cost_per_user', p10: 1, p25: 2, p50: 4, p75: 7, p90: 12, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },

  // ── Restaurant ──
  { industryType: 'restaurant', parameter: 'gross_margin', p10: 50, p25: 58, p50: 65, p75: 72, p90: 78, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'restaurant', parameter: 'cac', p10: 5, p25: 8, p50: 15, p75: 25, p90: 40, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'restaurant', parameter: 'ltv', p10: 200, p25: 400, p50: 800, p75: 1500, p90: 2500, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'restaurant', parameter: 'conversion_rate', p10: 5, p25: 10, p50: 18, p75: 28, p90: 40, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'restaurant', parameter: 'churn_rate', p10: 3, p25: 5, p50: 8, p75: 14, p90: 22, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'restaurant', parameter: 'avg_ticket_size', p10: 12, p25: 18, p50: 28, p75: 45, p90: 75, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'restaurant', parameter: 'rent_pct_revenue', p10: 5, p25: 7, p50: 10, p75: 15, p90: 22, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'restaurant', parameter: 'payroll_pct_revenue', p10: 22, p25: 28, p50: 33, p75: 40, p90: 48, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'restaurant', parameter: 'break_even_months', p10: 8, p25: 14, p50: 22, p75: 32, p90: 48, unit: 'months', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'restaurant', parameter: 'monthly_growth_rate', p10: 0.5, p25: 1.5, p50: 3, p75: 5, p90: 8, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'restaurant', parameter: 'refund_rate', p10: 0.5, p25: 1, p50: 2, p75: 3.5, p90: 5, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'restaurant', parameter: 'support_cost_per_user', p10: 0.5, p25: 1, p50: 2, p75: 3, p90: 5, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },

  // ── Service Business ──
  { industryType: 'service_business', parameter: 'gross_margin', p10: 40, p25: 50, p50: 60, p75: 72, p90: 82, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'service_business', parameter: 'cac', p10: 20, p25: 40, p50: 80, p75: 150, p90: 300, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'service_business', parameter: 'ltv', p10: 500, p25: 1000, p50: 2500, p75: 5000, p90: 10000, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'service_business', parameter: 'conversion_rate', p10: 3, p25: 5, p50: 10, p75: 18, p90: 28, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'service_business', parameter: 'churn_rate', p10: 2, p25: 3, p50: 5, p75: 8, p90: 12, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'service_business', parameter: 'avg_ticket_size', p10: 50, p25: 100, p50: 200, p75: 400, p90: 800, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'service_business', parameter: 'rent_pct_revenue', p10: 2, p25: 4, p50: 7, p75: 12, p90: 18, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'service_business', parameter: 'payroll_pct_revenue', p10: 30, p25: 38, p50: 48, p75: 58, p90: 68, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'service_business', parameter: 'break_even_months', p10: 3, p25: 6, p50: 12, p75: 18, p90: 28, unit: 'months', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'service_business', parameter: 'monthly_growth_rate', p10: 1, p25: 3, p50: 5, p75: 10, p90: 18, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'service_business', parameter: 'refund_rate', p10: 0.5, p25: 1, p50: 2.5, p75: 5, p90: 8, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'service_business', parameter: 'support_cost_per_user', p10: 3, p25: 5, p50: 10, p75: 18, p90: 30, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },

  // ── Retail ──
  { industryType: 'retail', parameter: 'gross_margin', p10: 22, p25: 30, p50: 40, p75: 50, p90: 60, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'retail', parameter: 'cac', p10: 5, p25: 10, p50: 20, p75: 35, p90: 60, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'retail', parameter: 'ltv', p10: 100, p25: 200, p50: 450, p75: 800, p90: 1500, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'retail', parameter: 'conversion_rate', p10: 10, p25: 18, p50: 28, p75: 40, p90: 55, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'retail', parameter: 'churn_rate', p10: 5, p25: 10, p50: 18, p75: 28, p90: 40, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'retail', parameter: 'avg_ticket_size', p10: 15, p25: 25, p50: 45, p75: 80, p90: 150, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'retail', parameter: 'rent_pct_revenue', p10: 5, p25: 8, p50: 12, p75: 18, p90: 25, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'retail', parameter: 'payroll_pct_revenue', p10: 10, p25: 15, p50: 22, p75: 30, p90: 38, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'retail', parameter: 'break_even_months', p10: 6, p25: 10, p50: 18, p75: 28, p90: 42, unit: 'months', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'retail', parameter: 'monthly_growth_rate', p10: 0.5, p25: 1.5, p50: 3, p75: 6, p90: 10, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'retail', parameter: 'refund_rate', p10: 2, p25: 4, p50: 7, p75: 12, p90: 18, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'retail', parameter: 'support_cost_per_user', p10: 0.5, p25: 1, p50: 2, p75: 4, p90: 7, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },

  // ── Consulting ──
  { industryType: 'consulting', parameter: 'gross_margin', p10: 55, p25: 65, p50: 75, p75: 82, p90: 90, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'consulting', parameter: 'cac', p10: 50, p25: 100, p50: 250, p75: 500, p90: 1000, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'consulting', parameter: 'ltv', p10: 2000, p25: 5000, p50: 15000, p75: 35000, p90: 80000, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'consulting', parameter: 'conversion_rate', p10: 5, p25: 10, p50: 18, p75: 28, p90: 40, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'consulting', parameter: 'churn_rate', p10: 1, p25: 2, p50: 4, p75: 7, p90: 12, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'consulting', parameter: 'avg_ticket_size', p10: 500, p25: 1000, p50: 2500, p75: 5000, p90: 15000, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'consulting', parameter: 'rent_pct_revenue', p10: 1, p25: 2, p50: 4, p75: 8, p90: 14, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'consulting', parameter: 'payroll_pct_revenue', p10: 35, p25: 42, p50: 52, p75: 62, p90: 72, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'consulting', parameter: 'break_even_months', p10: 1, p25: 3, p50: 6, p75: 12, p90: 18, unit: 'months', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'consulting', parameter: 'monthly_growth_rate', p10: 1, p25: 3, p50: 6, p75: 12, p90: 20, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'consulting', parameter: 'refund_rate', p10: 0.5, p25: 1, p50: 2, p75: 4, p90: 6, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'consulting', parameter: 'support_cost_per_user', p10: 5, p25: 10, p50: 20, p75: 40, p90: 70, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },

  // ── Marketplace ──
  { industryType: 'marketplace', parameter: 'gross_margin', p10: 50, p25: 60, p50: 70, p75: 80, p90: 88, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'marketplace', parameter: 'cac', p10: 10, p25: 25, p50: 50, p75: 100, p90: 200, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'marketplace', parameter: 'ltv', p10: 100, p25: 250, p50: 600, p75: 1500, p90: 3000, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'marketplace', parameter: 'conversion_rate', p10: 1, p25: 2, p50: 4, p75: 7, p90: 12, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'marketplace', parameter: 'churn_rate', p10: 3, p25: 5, p50: 8, p75: 14, p90: 22, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'marketplace', parameter: 'avg_ticket_size', p10: 15, p25: 30, p50: 60, p75: 120, p90: 250, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'marketplace', parameter: 'rent_pct_revenue', p10: 0.5, p25: 1, p50: 2, p75: 4, p90: 8, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'marketplace', parameter: 'payroll_pct_revenue', p10: 20, p25: 30, p50: 40, p75: 52, p90: 62, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'marketplace', parameter: 'break_even_months', p10: 12, p25: 20, p50: 30, p75: 42, p90: 60, unit: 'months', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'marketplace', parameter: 'monthly_growth_rate', p10: 3, p25: 6, p50: 12, p75: 22, p90: 35, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'marketplace', parameter: 'refund_rate', p10: 1, p25: 3, p50: 5, p75: 9, p90: 15, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'marketplace', parameter: 'support_cost_per_user', p10: 1, p25: 3, p50: 6, p75: 12, p90: 20, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },

  // ── Mobile App ──
  { industryType: 'mobile_app', parameter: 'gross_margin', p10: 65, p25: 75, p50: 82, p75: 88, p90: 93, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'mobile_app', parameter: 'cac', p10: 1, p25: 2.5, p50: 5, p75: 12, p90: 30, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'mobile_app', parameter: 'ltv', p10: 5, p25: 15, p50: 40, p75: 100, p90: 250, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'mobile_app', parameter: 'conversion_rate', p10: 0.5, p25: 1, p50: 2, p75: 4, p90: 7, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'mobile_app', parameter: 'churn_rate', p10: 5, p25: 8, p50: 15, p75: 25, p90: 40, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'mobile_app', parameter: 'avg_ticket_size', p10: 0.99, p25: 2.99, p50: 6.99, p75: 14.99, p90: 29.99, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'mobile_app', parameter: 'rent_pct_revenue', p10: 0.2, p25: 0.5, p50: 1, p75: 3, p90: 5, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'mobile_app', parameter: 'payroll_pct_revenue', p10: 30, p25: 40, p50: 55, p75: 65, p90: 75, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'mobile_app', parameter: 'break_even_months', p10: 10, p25: 18, p50: 28, p75: 42, p90: 60, unit: 'months', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'mobile_app', parameter: 'monthly_growth_rate', p10: 5, p25: 10, p50: 18, p75: 30, p90: 50, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'mobile_app', parameter: 'refund_rate', p10: 3, p25: 5, p50: 10, p75: 18, p90: 30, unit: '%', source: 'kerry_dataset', lastUpdated: '2025-12' },
  { industryType: 'mobile_app', parameter: 'support_cost_per_user', p10: 0.2, p25: 0.5, p50: 1, p75: 2, p90: 5, unit: '$', source: 'kerry_dataset', lastUpdated: '2025-12' },
];

// ─── Supported Industries ─────────────────────────────────────

export const SUPPORTED_INDUSTRIES = [
  'coffee_shop', 'saas_b2b', 'saas_b2c', 'ecommerce', 'restaurant',
  'service_business', 'retail', 'consulting', 'marketplace', 'mobile_app',
] as const;

export type SupportedIndustry = typeof SUPPORTED_INDUSTRIES[number];

// ─── Lookup Helpers ───────────────────────────────────────────

export function getBenchmark(industryType: string, parameter: string): IndustryBenchmark | undefined {
  return BENCHMARK_DATABASE.find(
    b => b.industryType === industryType && b.parameter === parameter
  );
}

export function getBenchmarksForIndustry(industryType: string): IndustryBenchmark[] {
  return BENCHMARK_DATABASE.filter(b => b.industryType === industryType);
}

// ─── Percentile Estimation ────────────────────────────────────

/**
 * Estimates where a value falls in the percentile distribution
 * using linear interpolation between known percentile points.
 */
export function estimatePercentile(value: number, benchmark: IndustryBenchmark): number {
  const points = [
    { pct: 10, val: benchmark.p10 },
    { pct: 25, val: benchmark.p25 },
    { pct: 50, val: benchmark.p50 },
    { pct: 75, val: benchmark.p75 },
    { pct: 90, val: benchmark.p90 },
  ];

  if (value <= points[0].val) {
    // Below p10 — extrapolate down
    const ratio = points[0].val > 0 ? value / points[0].val : 0;
    return QMath.round(ratio * 10, 1);
  }
  if (value >= points[points.length - 1].val) {
    // Above p90 — extrapolate up
    const range = points[points.length - 1].val - points[points.length - 2].val;
    if (range <= 0) return 99;
    const excess = value - points[points.length - 1].val;
    return QMath.round(Math.min(90 + (excess / range) * 10, 99), 1);
  }

  // Interpolate between known points
  for (let i = 0; i < points.length - 1; i++) {
    if (value >= points[i].val && value <= points[i + 1].val) {
      const range = points[i + 1].val - points[i].val;
      if (range === 0) return points[i].pct;
      const fraction = (value - points[i].val) / range;
      return QMath.round(points[i].pct + fraction * (points[i + 1].pct - points[i].pct), 1);
    }
  }

  return 50; // fallback
}

// ─── Validation ───────────────────────────────────────────────

/**
 * Validates a user-provided parameter value against industry benchmarks.
 * Returns warning level and contextual message.
 */
export function validateParamAgainstBenchmarks(
  param: string,
  value: number,
  industryType: string
): BenchmarkValidation {
  const benchmark = getBenchmark(industryType, param);

  if (!benchmark) {
    return {
      isValid: true,
      warningLevel: 'none',
      message: '',
      benchmarkRange: { p25: 0, p75: 0 },
      percentile: 50,
    };
  }

  const percentile = estimatePercentile(value, benchmark);
  const { p10, p25, p75, p90 } = benchmark;
  const unit = benchmark.unit === '$' ? '$' : benchmark.unit;

  // Within p25–p75: normal range
  if (value >= p25 && value <= p75) {
    return {
      isValid: true,
      warningLevel: 'none',
      message: '',
      benchmarkRange: { p25, p75 },
      percentile,
    };
  }

  // p10–p25 or p75–p90: mild
  if ((value >= p10 && value < p25) || (value > p75 && value <= p90)) {
    const direction = value < p25 ? 'below' : 'above';
    return {
      isValid: true,
      warningLevel: 'mild',
      message: `Slightly ${direction} industry typical range (${formatVal(p25, unit)}–${formatVal(p75, unit)})`,
      benchmarkRange: { p25, p75 },
      percentile,
    };
  }

  // Beyond p10/p90 but within 2× range: strong
  const lowerBound = QMath.divide(p10, 2);
  const upperBound = QMath.multiply(p90, 2);
  if (value >= lowerBound && value <= upperBound) {
    const direction = value < p10 ? 'below' : 'above';
    const ratio = value < p10
      ? QMath.round(QMath.divide(p10, Math.max(value, 0.01)), 1)
      : QMath.round(QMath.divide(value, Math.max(p90, 0.01)), 1);
    return {
      isValid: false,
      warningLevel: 'strong',
      message: `This is ${ratio}× ${direction} the typical range (${formatVal(p25, unit)}–${formatVal(p75, unit)}) for your industry`,
      benchmarkRange: { p25, p75 },
      percentile,
    };
  }

  // Beyond 2× of p10/p90: critical
  const direction = value < lowerBound ? 'below' : 'above';
  return {
    isValid: false,
    warningLevel: 'critical',
    message: `This value is far ${direction} the normal range — are you sure? Industry typical: ${formatVal(p25, unit)}–${formatVal(p75, unit)}`,
    benchmarkRange: { p25, p75 },
    percentile,
  };
}

function formatVal(v: number, unit: string): string {
  if (unit === '$') return `$${v.toLocaleString()}`;
  if (unit === '%') return `${v}%`;
  return `${v} ${unit}`;
}

// ─── Autofill ─────────────────────────────────────────────────

/** Parameter keys that map to OptionalFinancialInputs fields */
const AUTOFILL_MAP: Record<string, string> = {
  avg_ticket_size: 'average_price',
  cac: 'cac',
  churn_rate: 'churn_rate',
};

/**
 * Auto-fills missing financial parameters with p50 (median) benchmark values.
 * Returns the filled params, which fields were auto-filled, and a confidence score.
 */
export function autofillMissingParams(
  partialParams: Record<string, number | undefined>,
  industryType: string
): AutofillResult {
  const benchmarks = getBenchmarksForIndustry(industryType);
  if (benchmarks.length === 0) {
    return {
      filledParams: partialParams as Record<string, number>,
      autofilledFields: [],
      confidence: 30,
    };
  }

  const filled: Record<string, number> = { ...partialParams } as Record<string, number>;
  const autofilledFields: string[] = [];

  for (const benchmark of benchmarks) {
    const fieldKey = AUTOFILL_MAP[benchmark.parameter] || benchmark.parameter;
    const currentVal = partialParams[fieldKey];

    if (currentVal === undefined || currentVal === null || currentVal === 0) {
      filled[fieldKey] = benchmark.p50;
      autofilledFields.push(fieldKey);
    }
  }

  // Confidence: higher when more fields were already provided by user
  const totalFields = benchmarks.length;
  const userProvidedCount = totalFields - autofilledFields.length;
  const confidence = QMath.round(
    QMath.add(40, QMath.multiply(QMath.divide(userProvidedCount, totalFields), 50)),
    0
  );

  return {
    filledParams: filled,
    autofilledFields,
    confidence,
  };
}
