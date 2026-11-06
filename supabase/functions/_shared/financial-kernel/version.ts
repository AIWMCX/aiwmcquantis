/**
 * Kernel and formula versions. Bump KERNEL_VERSION (semver) whenever any formula's
 * output can change; bump the formula's own `vN` when its definition changes.
 * Each entry has the columns of public.metric_formula_registry (migration
 * 20260802054648) so it can be seeded from here; implementation_sha is filled in
 * at seed time from the file hash.
 */
export const KERNEL_NAME = 'aiwmc.financial-kernel';
export const KERNEL_VERSION = '1.0.0';

export const FORMULA_IDS = {
  projection: 'projection.ramp6_growth.v1',
  grossProfit: 'profitability_margins.v1',
  netProfit: 'profitability_margins.v1',
  contributionMarginRatio: 'cvp.contribution_margin_breakeven.v1',
  breakEvenRevenue: 'cvp.contribution_margin_breakeven.v1',
  revenueForTargetProfit: 'cvp.contribution_margin_breakeven.v1',
  operatingBreakEvenMonth: 'operating_break_even.ramp_first_month.v1',
  investmentPaybackMonth: 'investment_payback.ramp_first_month.v1',
  investmentPaybackFractional: 'investment_payback.cumulative_fcf.v1',
  roiYear1: 'roi_year1.ramp_model.v1',
  npv: 'npv.steady_state_monthly.v1',
  customerLifetime: 'customer_lifetime.inverse_churn_cap120.v1',
  ltv: 'ltv.orders_lifetime.v1',
  ltvCacRatio: 'ltv_cac_ratio.v1',
  cacPayback: 'cac_payback.unit_contribution.v1',
} as const;

export interface FormulaRegistryRow {
  formula_id: string;
  metric_code: string;
  version: string;
  definition: string;
  expression: string;
  units: string;
  rounding_policy: string;
  invalid_state_policy: string;
  implementation_path: string;
}

const PATH = 'supabase/functions/_shared/financial-kernel/kernel.ts';

export const FORMULA_REGISTRY_V1: readonly FormulaRegistryRow[] = [
  {
    formula_id: FORMULA_IDS.projection, metric_code: 'operating_projection', version: '1',
    definition: 'Monthly operating projection. Months 1-6 revenue ramps 30/45/60/75/90/100% of steady state; expenses are 60% fixed plus 40% scaled by the ramp. From month 7 revenue grows 5%/mo and expenses 2.5%/mo.',
    expression: 'm<=6: rev=R*ramp[m], exp=0.6E+0.4E*ramp[m]; m>6: rev=R*1.05^(m-6), exp=E*1.025^(m-6)',
    units: 'USD/month', rounding_policy: 'none (internal series)', invalid_state_policy: 'n/a', implementation_path: 'supabase/functions/_shared/financial-kernel/projection.ts',
  },
  {
    formula_id: FORMULA_IDS.netProfit, metric_code: 'net_profit_monthly', version: '1',
    definition: 'Steady-state monthly net profit and margins.',
    expression: 'gross=rev-cogs; net=rev-cogs-variable_opex-fixed; margin=x/rev',
    units: 'USD/month; margins ratio 0-1', rounding_policy: 'money 2 dp, ratio 4 dp, ROUND_HALF_UP', invalid_state_policy: 'margins NOT_MEANINGFUL when rev=0', implementation_path: PATH,
  },
  {
    formula_id: FORMULA_IDS.breakEvenRevenue, metric_code: 'break_even_revenue_monthly', version: '1',
    definition: 'Revenue at which contribution covers fixed costs, with variable costs = COGS + variable opex at the current revenue mix.',
    expression: 'cm_ratio=1-(cogs+variable_opex)/rev; BER=fixed/cm_ratio; rev_target=(fixed+target)/cm_ratio',
    units: 'USD/month', rounding_policy: 'money 2 dp', invalid_state_policy: 'NOT_ACHIEVABLE when cm_ratio<=0; NOT_MEANINGFUL when rev=0 (no floor)', implementation_path: PATH,
  },
  {
    formula_id: FORMULA_IDS.operatingBreakEvenMonth, metric_code: 'operating_break_even_month', version: '1',
    definition: 'First projected month whose revenue is at least its expenses.',
    expression: 'min m in 1..H with rev_m>=exp_m',
    units: 'month index', rounding_policy: 'integer', invalid_state_policy: 'NOT_ACHIEVED_WITHIN_HORIZON', implementation_path: PATH,
  },
  {
    formula_id: FORMULA_IDS.investmentPaybackMonth, metric_code: 'investment_payback_month', version: '1',
    definition: 'First projected month whose cumulative operating profit reaches the startup investment.',
    expression: 'min m in 1..H with sum_{1..m}(rev-exp)>=investment',
    units: 'month index', rounding_policy: 'integer', invalid_state_policy: 'NOT_APPLICABLE when steady profit<=0; NOT_ACHIEVED_WITHIN_HORIZON; 0 when investment=0', implementation_path: PATH,
  },
  {
    formula_id: FORMULA_IDS.investmentPaybackFractional, metric_code: 'investment_payback_months', version: '1',
    definition: 'Same series, fractional month: (m-1) + remaining/fcf_m.',
    expression: '(m-1) + (investment - cum_{m-1})/fcf_m',
    units: 'months', rounding_policy: '2 dp', invalid_state_policy: 'as investment_payback_month', implementation_path: PATH,
  },
  {
    formula_id: FORMULA_IDS.roiYear1, metric_code: 'roi_year1_percent', version: '1',
    definition: 'Year-1 modeled operating profit over startup investment (accounting profit, not a cash return, not net of investment).',
    expression: 'sum_{1..12}(rev_m-exp_m)/investment*100',
    units: 'percent', rounding_policy: '2 dp', invalid_state_policy: 'NOT_APPLICABLE when investment<=0', implementation_path: PATH,
  },
  {
    formula_id: FORMULA_IDS.npv, metric_code: 'npv', version: '1',
    definition: 'NPV of steady-state monthly profit over N months at an assumed annual discount rate (effective annual, compounded monthly).',
    expression: '-investment + sum_{1..N} net/(1+r_m)^m, r_m=(1+r)^(1/12)-1; default r=0.10, N=36',
    units: 'USD', rounding_policy: 'money 2 dp', invalid_state_policy: 'INVALID_INPUTS when r<=-1', implementation_path: PATH,
  },
  {
    formula_id: FORMULA_IDS.customerLifetime, metric_code: 'customer_lifetime_months', version: '1',
    definition: 'Expected customer lifetime from monthly churn, capped at 120 months.',
    expression: 'min(120, round1(1/churn)); churn=0 -> 120',
    units: 'months', rounding_policy: '1 dp', invalid_state_policy: 'INSUFFICIENT_INPUTS when churn missing; INVALID_INPUTS when churn outside [0,1]', implementation_path: PATH,
  },
  {
    formula_id: FORMULA_IDS.ltv, metric_code: 'ltv', version: '1',
    definition: 'Gross-margin lifetime value per customer.',
    expression: 'unit_price*unit_gm*orders_per_month*lifetime',
    units: 'USD', rounding_policy: 'money 2 dp', invalid_state_policy: 'as customer_lifetime_months', implementation_path: PATH,
  },
  {
    formula_id: FORMULA_IDS.ltvCacRatio, metric_code: 'ltv_cac_ratio', version: '1',
    definition: 'LTV over CAC.', expression: 'ltv/cac',
    units: 'ratio', rounding_policy: '4 dp', invalid_state_policy: 'NOT_MEANINGFUL when cac=0; INSUFFICIENT_INPUTS when cac missing', implementation_path: PATH,
  },
  {
    formula_id: FORMULA_IDS.cacPayback, metric_code: 'cac_payback_months', version: '1',
    definition: 'Months of gross-margin contribution per customer needed to recover CAC. Not clamped.',
    expression: 'cac/(unit_price*unit_gm*orders_per_month)',
    units: 'months', rounding_policy: '2 dp', invalid_state_policy: 'NOT_APPLICABLE when unit contribution<=0; INSUFFICIENT_INPUTS when cac missing', implementation_path: PATH,
  },
];
