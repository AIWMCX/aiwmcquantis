/**
 * Golden vectors for financial kernel v1, in the row shape of
 * public.golden_test_vectors (migration 20260802054648) so they can be promoted
 * into that table once two reviewers sign off (promotion_status stays
 * 'candidate' until then; run-accuracy-harness only runs silver/gold).
 *
 * Value vectors: the five archetypes of src/__tests__/golden-cases.test.ts, with
 * the P&L lines the live engine resolves for them. Expected values come from an
 * independent plain-float re-derivation of the documented formulas (not from the
 * kernel). For payback, ROI and NPV that derivation agrees with the live engine's
 * captured values in golden-cases.test.ts (11/139/481 962 for SaaS, and so on).
 *
 * Status vectors pin the typed states that replace the live engine's placeholder numbers.
 */
import type { KernelInputV1, MetricStatus } from './kernel.ts';

type MetricKey =
  | 'grossProfit' | 'grossMarginRatio' | 'netProfit' | 'netMarginRatio'
  | 'contributionMarginRatio' | 'breakEvenRevenue' | 'revenueForTargetProfit'
  | 'operatingBreakEvenMonth' | 'investmentPaybackMonth' | 'investmentPaybackMonthsFractional'
  | 'roiYear1Percent' | 'npv' | 'customerLifetimeMonths' | 'ltv' | 'ltvCacRatio' | 'cacPaybackMonths';

export interface KernelGoldenVector {
  vector_code: string;
  archetype: string;
  promotion_status: 'candidate' | 'silver' | 'gold' | 'retired';
  input_data: KernelInputV1;
  expected_ranges: Partial<Record<MetricKey, { target: string; abs_tolerance: string }>>;
  expected_statuses: Partial<Record<MetricKey, MetricStatus>>;
  oracle_method: string;
  oracle_version: string;
  reviewer_finance: string | null;
  reviewer_engineering: string | null;
  evidence_urls: string[];
}

const ORACLE = 'independent_float_rederivation';
const ORACLE_VERSION = '2026-11-05';
const M = '0.01';
const R = '0.0001';

function valueVector(
  code: string,
  archetype: string,
  input: KernelInputV1,
  e: [string, string, string, string, string, string, string, string, string, string, string, string, string, string, string],
): KernelGoldenVector {
  const [net, gm, nm, cm, ber, rev45, bem, pay, payf, roi, npv, life, ltv, ltvCac, cacPay] = e;
  return {
    vector_code: code,
    archetype,
    promotion_status: 'candidate',
    input_data: input,
    expected_ranges: {
      netProfit: { target: net, abs_tolerance: M },
      grossMarginRatio: { target: gm, abs_tolerance: R },
      netMarginRatio: { target: nm, abs_tolerance: R },
      contributionMarginRatio: { target: cm, abs_tolerance: R },
      breakEvenRevenue: { target: ber, abs_tolerance: M },
      revenueForTargetProfit: { target: rev45, abs_tolerance: M },
      operatingBreakEvenMonth: { target: bem, abs_tolerance: '0' },
      investmentPaybackMonth: { target: pay, abs_tolerance: '0' },
      investmentPaybackMonthsFractional: { target: payf, abs_tolerance: M },
      roiYear1Percent: { target: roi, abs_tolerance: M },
      npv: { target: npv, abs_tolerance: M },
      customerLifetimeMonths: { target: life, abs_tolerance: '0' },
      ltv: { target: ltv, abs_tolerance: M },
      ltvCacRatio: { target: ltvCac, abs_tolerance: R },
      cacPaybackMonths: { target: cacPay, abs_tolerance: M },
    },
    expected_statuses: {},
    oracle_method: ORACLE,
    oracle_version: ORACLE_VERSION,
    reviewer_finance: null,
    reviewer_engineering: null,
    evidence_urls: [],
  };
}

const base = (o: Partial<KernelInputV1>): KernelInputV1 => ({
  monthlyRevenue: '50000', monthlyCogs: '10000', monthlyVariableOpex: '3736', monthlyFixedCosts: '16000',
  startupInvestment: '150000', unitPrice: '450', ordersPerCustomerPerMonth: '1', unitGrossMarginRatio: '0.8',
  monthlyChurnRate: '0.0416666667', cac: '800', targetMonthlyProfit: '45000',
  ...o,
});

function statusVector(code: string, input: KernelInputV1, statuses: KernelGoldenVector['expected_statuses']): KernelGoldenVector {
  return {
    vector_code: code, archetype: 'edge_case', promotion_status: 'candidate', input_data: input,
    expected_ranges: {}, expected_statuses: statuses, oracle_method: 'contract_rule', oracle_version: ORACLE_VERSION,
    reviewer_finance: null, reviewer_engineering: null, evidence_urls: [],
  };
}

export const GOLDEN_VECTORS_V1: readonly KernelGoldenVector[] = [
  valueVector('KGV1-SAAS-B2B', 'saas_b2b', base({}),
    ['20264.00', '0.8000', '0.4053', '0.7253', '22060.45', '84105.45', '3', '11', '10.16', '138.52', '481962.39', '24.0', '8640.00', '10.8000', '2.22']),
  valueVector('KGV1-PRO-SERVICES', 'professional_services', base({
    monthlyCogs: '7500', monthlyVariableOpex: '2160', monthlyFixedCosts: '22500', startupInvestment: '80000',
    unitPrice: '4000', unitGrossMarginRatio: '0.85', monthlyChurnRate: '0.0833333333', cac: '2000',
  }), ['17840.00', '0.8500', '0.3568', '0.8068', '27887.95', '83663.86', '3', '9', '8.27', '224.13', '476366.42', '12.0', '40800.00', '20.4000', '0.59']),
  valueVector('KGV1-RESTAURANT', 'restaurant', base({
    monthlyRevenue: '60000', monthlyCogs: '19200', monthlyVariableOpex: '652', monthlyFixedCosts: '26000', startupInvestment: '220000',
    unitPrice: '32', ordersPerCustomerPerMonth: '4', unitGrossMarginRatio: '0.68', monthlyChurnRate: '0.0555555556', cac: '25',
  }), ['14148.00', '0.6800', '0.2358', '0.6691', '38856.23', '106107.40', '4', '15', '14.77', '59.04', '221226.01', '18.0', '1566.72', '62.6688', '0.29']),
  valueVector('KGV1-RETAIL-ECOM', 'retail_ecommerce', base({
    monthlyCogs: '22500', monthlyVariableOpex: '600', monthlyFixedCosts: '15500', startupInvestment: '100000',
    unitPrice: '65', ordersPerCustomerPerMonth: '3', unitGrossMarginRatio: '0.55', monthlyChurnRate: '0.0666666667', cac: '35',
  }), ['11400.00', '0.5500', '0.2280', '0.5380', '28810.41', '112453.53', '4', '12', '11.84', '103.65', '255525.63', '15.0', '1608.75', '45.9643', '0.33']),
  valueVector('KGV1-MARKETPLACE', 'marketplace', base({
    monthlyRevenue: '45000', monthlyCogs: '4500', monthlyVariableOpex: '875', monthlyFixedCosts: '28100', startupInvestment: '180000',
    unitPrice: '90', ordersPerCustomerPerMonth: '2', unitGrossMarginRatio: '0.9', monthlyChurnRate: '0.05', cac: '70',
  }), ['11525.00', '0.9000', '0.2561', '0.8806', '31911.67', '83015.77', '4', '15', '14.81', '60.08', '179423.93', '20.0', '3240.00', '46.2857', '0.43']),

  statusVector('KGV1-EDGE-UNPROFITABLE', base({ monthlyFixedCosts: '400000' }), {
    netProfit: 'VALUE', investmentPaybackMonth: 'NOT_APPLICABLE', investmentPaybackMonthsFractional: 'NOT_APPLICABLE',
    operatingBreakEvenMonth: 'NOT_ACHIEVED_WITHIN_HORIZON', roiYear1Percent: 'VALUE', npv: 'VALUE',
  }),
  statusVector('KGV1-EDGE-ZERO-REVENUE', base({ monthlyRevenue: '0', monthlyCogs: '0', monthlyVariableOpex: '0' }), {
    grossMarginRatio: 'NOT_MEANINGFUL', netMarginRatio: 'NOT_MEANINGFUL', breakEvenRevenue: 'NOT_MEANINGFUL',
    investmentPaybackMonth: 'NOT_APPLICABLE',
  }),
  statusVector('KGV1-EDGE-NO-INVESTMENT', base({ startupInvestment: '0' }), {
    investmentPaybackMonth: 'VALUE', roiYear1Percent: 'NOT_APPLICABLE', npv: 'VALUE',
  }),
  statusVector('KGV1-EDGE-CHURN-AND-CAC-UNKNOWN', base({ monthlyChurnRate: null, cac: null }), {
    customerLifetimeMonths: 'INSUFFICIENT_INPUTS', ltv: 'INSUFFICIENT_INPUTS', ltvCacRatio: 'INSUFFICIENT_INPUTS', cacPaybackMonths: 'INSUFFICIENT_INPUTS',
  }),
  statusVector('KGV1-EDGE-NEGATIVE-CONTRIBUTION', base({ monthlyCogs: '40000', monthlyVariableOpex: '12000' }), {
    contributionMarginRatio: 'VALUE', breakEvenRevenue: 'NOT_ACHIEVABLE', revenueForTargetProfit: 'NOT_ACHIEVABLE',
  }),
  statusVector('KGV1-EDGE-ZERO-CAC', base({ cac: '0' }), { ltvCacRatio: 'NOT_MEANINGFUL', cacPaybackMonths: 'VALUE' }),
  statusVector('KGV1-EDGE-PAYBACK-BEYOND-HORIZON', base({ startupInvestment: '50000000' }), {
    investmentPaybackMonth: 'NOT_ACHIEVED_WITHIN_HORIZON', investmentPaybackMonthsFractional: 'NOT_ACHIEVED_WITHIN_HORIZON',
  }),
  statusVector('KGV1-EDGE-NEGATIVE-INVESTMENT', base({ startupInvestment: '-1' }), {
    investmentPaybackMonth: 'INVALID_INPUTS', roiYear1Percent: 'INVALID_INPUTS', npv: 'INVALID_INPUTS',
  }),
];
