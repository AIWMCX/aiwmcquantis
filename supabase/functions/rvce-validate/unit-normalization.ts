/**
 * RVCE UNIT-SAFETY LAYER
 * ======================
 * Root cause (confirmed 2026-07-21): a live analysis showed external median
 * rent=$3 and payroll=$46 flagged 70-200σ "Outlier." The web-search/DeepSeek
 * extraction path had no way to know whether a snippet's number was already
 * a monthly USD total or something else entirely ("$3/sq ft", "$46/hour").
 * A first pass (since replaced) added a blunt MIN_PLAUSIBLE_MONTHLY_USD
 * floor -- it stopped the symptom but silently discarded values that may
 * have been valid evidence in a different unit. This module replaces that
 * floor with real classification: every extracted number gets a raw unit,
 * is converted only when the conversion is unambiguous and self-contained,
 * and is quarantined (not guessed, not discarded) when context is missing.
 *
 * Pure functions only -- no Deno-specific APIs -- so this file is imported
 * both by the deployed edge function (Deno) and by the vitest regression
 * suite (src/__tests__/rvce-unit-normalization.test.ts) against the exact
 * same code that runs in production.
 */

export type RawUnit =
  | 'monthly_usd'
  | 'annual_usd'
  | 'weekly_usd'
  | 'daily_usd'
  | 'per_sqft_monthly'
  | 'per_sqft_annual'
  | 'per_hour'
  | 'per_transaction'
  | 'per_customer'
  | 'per_unit'
  | 'percentage'
  | 'ratio_x'
  | 'months'
  | 'total_usd'
  | 'unknown';

export type NormalizationStatus =
  | 'accepted_exact'
  | 'accepted_converted'
  | 'quarantined_missing_context'
  | 'rejected_unit_mismatch'
  | 'rejected_metric_mismatch'
  | 'rejected_non_numeric'
  | 'rejected_out_of_range';

/** Per-raw-unit disposition for one target metric. */
type UnitRule =
  | { kind: 'accept' }
  | { kind: 'convert'; factor: number; rule: string }
  | { kind: 'context'; reason: string }
  | { kind: 'reject'; reason: string };

export interface MetricUnitContract {
  metricId: string;
  canonicalUnit: 'usd' | 'percent' | 'ratio_x' | 'months';
  canonicalPeriod: 'month' | 'one_time' | 'lifetime' | 'n/a';
  /** Values strictly outside [min, max] after conversion are rejected_out_of_range. */
  plausibleMin: number;
  plausibleMax: number;
  rules: Partial<Record<RawUnit, UnitRule>>;
  /** Disposition for a raw unit not listed in `rules` (defensive default). */
  defaultForUnlisted: UnitRule;
}

const MONTHLY_USD_BASE: Partial<Record<RawUnit, UnitRule>> = {
  monthly_usd: { kind: 'accept' },
  total_usd: { kind: 'accept' },
  unknown: { kind: 'accept' }, // absent contrary evidence, the extraction prompt already asked for the target unit
  annual_usd: { kind: 'convert', factor: 1 / 12, rule: 'annual_to_monthly_div12' },
  weekly_usd: { kind: 'convert', factor: 52 / 12, rule: 'weekly_to_monthly_x4_33' },
  daily_usd: { kind: 'convert', factor: 30.44, rule: 'daily_to_monthly_x30_44' },
  per_sqft_monthly: { kind: 'context', reason: 'requires the business\'s square footage to become a monthly total' },
  per_sqft_annual: { kind: 'context', reason: 'requires square footage and an annual-to-monthly conversion' },
  per_hour: { kind: 'context', reason: 'requires weekly/monthly hours to become a monthly total' },
  per_transaction: { kind: 'context', reason: 'requires transaction volume to become a monthly total' },
  per_unit: { kind: 'context', reason: 'requires unit volume to become a monthly total' },
  percentage: { kind: 'reject', reason: 'a percentage cannot be a USD monthly total' },
  ratio_x: { kind: 'reject', reason: 'a ratio cannot be a USD monthly total' },
  months: { kind: 'reject', reason: 'a month count cannot be a USD monthly total' },
};

export const METRIC_UNIT_CONTRACTS: Record<string, MetricUnitContract> = {
  revenue_monthly: {
    metricId: 'revenue_monthly', canonicalUnit: 'usd', canonicalPeriod: 'month',
    plausibleMin: 200, plausibleMax: 50_000_000,
    rules: MONTHLY_USD_BASE,
    defaultForUnlisted: { kind: 'context', reason: 'unrecognized raw unit for a monthly revenue total' },
  },
  opex_marketing_monthly: {
    metricId: 'opex_marketing_monthly', canonicalUnit: 'usd', canonicalPeriod: 'month',
    plausibleMin: 20, plausibleMax: 5_000_000,
    rules: MONTHLY_USD_BASE,
    defaultForUnlisted: { kind: 'context', reason: 'unrecognized raw unit for a monthly marketing spend total' },
  },
  opex_rent_monthly: {
    metricId: 'opex_rent_monthly', canonicalUnit: 'usd', canonicalPeriod: 'month',
    plausibleMin: 100, plausibleMax: 1_000_000,
    rules: MONTHLY_USD_BASE,
    defaultForUnlisted: { kind: 'context', reason: 'unrecognized raw unit for a monthly rent total' },
  },
  opex_payroll_monthly: {
    metricId: 'opex_payroll_monthly', canonicalUnit: 'usd', canonicalPeriod: 'month',
    plausibleMin: 150, plausibleMax: 5_000_000,
    rules: MONTHLY_USD_BASE,
    defaultForUnlisted: { kind: 'context', reason: 'unrecognized raw unit for a monthly payroll total' },
  },
  startup_investment_total: {
    metricId: 'startup_investment_total', canonicalUnit: 'usd', canonicalPeriod: 'one_time',
    plausibleMin: 500, plausibleMax: 10_000_000,
    rules: {
      monthly_usd: { kind: 'accept' }, // a bare "$X to start" figure -- treated as the one-time total
      total_usd: { kind: 'accept' },
      unknown: { kind: 'accept' },
      annual_usd: { kind: 'reject', reason: 'an annual rate is not a one-time startup total' },
      weekly_usd: { kind: 'reject', reason: 'a weekly rate is not a one-time startup total' },
      daily_usd: { kind: 'reject', reason: 'a daily rate is not a one-time startup total' },
      per_sqft_monthly: { kind: 'context', reason: 'requires square footage context' },
      per_sqft_annual: { kind: 'context', reason: 'requires square footage context' },
      per_hour: { kind: 'context', reason: 'requires hours context' },
      per_transaction: { kind: 'context', reason: 'requires transaction volume context' },
      per_unit: { kind: 'context', reason: 'requires unit volume context' },
      percentage: { kind: 'reject', reason: 'a percentage cannot be a one-time USD total' },
      ratio_x: { kind: 'reject', reason: 'a ratio cannot be a one-time USD total' },
      months: { kind: 'reject', reason: 'a month count cannot be a one-time USD total' },
    },
    defaultForUnlisted: { kind: 'context', reason: 'unrecognized raw unit for a one-time startup total' },
  },
  ltv: {
    metricId: 'ltv', canonicalUnit: 'usd', canonicalPeriod: 'lifetime',
    plausibleMin: 10, plausibleMax: 5_000_000,
    rules: {
      monthly_usd: { kind: 'accept' },
      total_usd: { kind: 'accept' },
      per_customer: { kind: 'accept' }, // this IS the correct native shape for LTV
      unknown: { kind: 'accept' },
      annual_usd: { kind: 'reject', reason: 'LTV is a per-customer lifetime value, not an annual rate' },
      weekly_usd: { kind: 'reject', reason: 'LTV is a per-customer lifetime value, not a weekly rate' },
      daily_usd: { kind: 'reject', reason: 'LTV is a per-customer lifetime value, not a daily rate' },
      per_sqft_monthly: { kind: 'reject', reason: 'a per-sq-ft figure is not a per-customer value' },
      per_sqft_annual: { kind: 'reject', reason: 'a per-sq-ft figure is not a per-customer value' },
      per_hour: { kind: 'reject', reason: 'an hourly figure is not a per-customer value' },
      per_transaction: { kind: 'context', reason: 'requires transactions-per-customer context to become LTV' },
      per_unit: { kind: 'context', reason: 'requires units-per-customer context to become LTV' },
      percentage: { kind: 'reject', reason: 'a percentage cannot be a USD LTV' },
      ratio_x: { kind: 'reject', reason: 'a ratio cannot be a USD LTV' },
      months: { kind: 'reject', reason: 'a month count cannot be a USD LTV' },
    },
    defaultForUnlisted: { kind: 'context', reason: 'unrecognized raw unit for LTV' },
  },
  cac: {
    metricId: 'cac', canonicalUnit: 'usd', canonicalPeriod: 'n/a',
    plausibleMin: 5, plausibleMax: 500_000,
    rules: {
      monthly_usd: { kind: 'accept' },
      total_usd: { kind: 'accept' },
      per_customer: { kind: 'accept' }, // this IS the correct native shape for CAC
      unknown: { kind: 'accept' },
      annual_usd: { kind: 'reject', reason: 'CAC is a per-customer cost, not an annual rate' },
      weekly_usd: { kind: 'reject', reason: 'CAC is a per-customer cost, not a weekly rate' },
      daily_usd: { kind: 'reject', reason: 'CAC is a per-customer cost, not a daily rate' },
      per_sqft_monthly: { kind: 'reject', reason: 'a per-sq-ft figure is not a per-customer cost' },
      per_sqft_annual: { kind: 'reject', reason: 'a per-sq-ft figure is not a per-customer cost' },
      per_hour: { kind: 'reject', reason: 'an hourly figure is not a per-customer cost' },
      per_transaction: { kind: 'context', reason: 'requires transactions-per-customer context to become CAC' },
      per_unit: { kind: 'context', reason: 'requires units-per-customer context to become CAC' },
      percentage: { kind: 'reject', reason: 'a percentage cannot be a USD CAC' },
      ratio_x: { kind: 'reject', reason: 'a ratio cannot be a USD CAC' },
      months: { kind: 'reject', reason: 'a month count cannot be a USD CAC' },
    },
    defaultForUnlisted: { kind: 'context', reason: 'unrecognized raw unit for CAC' },
  },
  gross_margin_pct: {
    metricId: 'gross_margin_pct', canonicalUnit: 'percent', canonicalPeriod: 'n/a',
    plausibleMin: -100, plausibleMax: 100,
    rules: {
      percentage: { kind: 'accept' },
      unknown: { kind: 'accept' }, // prompt explicitly requested "Unit: %"
      monthly_usd: { kind: 'reject', reason: 'a USD figure cannot be a margin percentage' },
      annual_usd: { kind: 'reject', reason: 'a USD figure cannot be a margin percentage' },
      weekly_usd: { kind: 'reject', reason: 'a USD figure cannot be a margin percentage' },
      daily_usd: { kind: 'reject', reason: 'a USD figure cannot be a margin percentage' },
      total_usd: { kind: 'reject', reason: 'a USD figure cannot be a margin percentage' },
      ratio_x: { kind: 'reject', reason: 'a ratio (x) is not a percentage without an explicit ×100 basis' },
      months: { kind: 'reject', reason: 'a month count cannot be a margin percentage' },
      per_sqft_monthly: { kind: 'reject', reason: 'not a percentage' },
      per_sqft_annual: { kind: 'reject', reason: 'not a percentage' },
      per_hour: { kind: 'reject', reason: 'not a percentage' },
      per_transaction: { kind: 'reject', reason: 'not a percentage' },
      per_unit: { kind: 'reject', reason: 'not a percentage' },
      per_customer: { kind: 'reject', reason: 'not a percentage' },
    },
    defaultForUnlisted: { kind: 'reject', reason: 'unrecognized raw unit for a percentage metric' },
  },
  ltv_cac_ratio: {
    metricId: 'ltv_cac_ratio', canonicalUnit: 'ratio_x', canonicalPeriod: 'n/a',
    plausibleMin: 0.1, plausibleMax: 100,
    rules: {
      ratio_x: { kind: 'accept' },
      unknown: { kind: 'accept' }, // prompt explicitly requested "Unit: x"
      percentage: { kind: 'reject', reason: 'a percentage is not an LTV:CAC ratio without an explicit basis' },
      monthly_usd: { kind: 'reject', reason: 'a USD figure cannot be a ratio' },
      annual_usd: { kind: 'reject', reason: 'a USD figure cannot be a ratio' },
      weekly_usd: { kind: 'reject', reason: 'a USD figure cannot be a ratio' },
      daily_usd: { kind: 'reject', reason: 'a USD figure cannot be a ratio' },
      total_usd: { kind: 'reject', reason: 'a USD figure cannot be a ratio' },
      months: { kind: 'reject', reason: 'a month count cannot be a ratio' },
      per_sqft_monthly: { kind: 'reject', reason: 'not a ratio' },
      per_sqft_annual: { kind: 'reject', reason: 'not a ratio' },
      per_hour: { kind: 'reject', reason: 'not a ratio' },
      per_transaction: { kind: 'reject', reason: 'not a ratio' },
      per_unit: { kind: 'reject', reason: 'not a ratio' },
      per_customer: { kind: 'reject', reason: 'not a ratio' },
    },
    defaultForUnlisted: { kind: 'reject', reason: 'unrecognized raw unit for a ratio metric' },
  },
  cac_payback_months: {
    metricId: 'cac_payback_months', canonicalUnit: 'months', canonicalPeriod: 'n/a',
    plausibleMin: 0, plausibleMax: 120,
    rules: {
      months: { kind: 'accept' },
      unknown: { kind: 'accept' }, // prompt explicitly requested "Unit: months"
      percentage: { kind: 'reject', reason: 'a percentage is not a month count' },
      monthly_usd: { kind: 'reject', reason: 'a USD figure cannot be a month count' },
      annual_usd: { kind: 'reject', reason: 'a USD figure cannot be a month count' },
      weekly_usd: { kind: 'reject', reason: 'a USD figure cannot be a month count' },
      daily_usd: { kind: 'reject', reason: 'a USD figure cannot be a month count' },
      total_usd: { kind: 'reject', reason: 'a USD figure cannot be a month count' },
      ratio_x: { kind: 'reject', reason: 'a ratio is not a month count' },
      per_sqft_monthly: { kind: 'reject', reason: 'not a month count' },
      per_sqft_annual: { kind: 'reject', reason: 'not a month count' },
      per_hour: { kind: 'reject', reason: 'not a month count' },
      per_transaction: { kind: 'reject', reason: 'not a month count' },
      per_unit: { kind: 'reject', reason: 'not a month count' },
      per_customer: { kind: 'reject', reason: 'not a month count' },
    },
    defaultForUnlisted: { kind: 'reject', reason: 'unrecognized raw unit for a months metric' },
  },
};

export interface NormalizedObservation {
  metric_id: string;
  raw_value: number;
  raw_unit: RawUnit;
  raw_period: string | null;
  raw_currency: string;
  normalized_value: number | null;
  normalized_unit: string;
  normalized_period: string;
  source_url: string;
  source_title: string;
  extraction_method: 'deepseek' | 'regex_fallback';
  normalization_status: NormalizationStatus;
  normalization_rule: string | null;
  rejection_reason: string | null;
}

export function normalizeObservation(
  metricId: string,
  rawValue: number,
  rawUnit: RawUnit,
  source: { url: string; title: string },
  extractionMethod: 'deepseek' | 'regex_fallback',
  rawCurrency = 'USD',
): NormalizedObservation {
  const base = {
    metric_id: metricId,
    raw_value: rawValue,
    raw_unit: rawUnit,
    raw_period: null,
    raw_currency: rawCurrency,
    source_url: source.url,
    source_title: source.title,
    extraction_method: extractionMethod,
  };

  const contract = METRIC_UNIT_CONTRACTS[metricId];
  if (!contract) {
    return {
      ...base,
      normalized_value: null,
      normalized_unit: 'unknown',
      normalized_period: 'n/a',
      normalization_status: 'rejected_metric_mismatch',
      normalization_rule: null,
      rejection_reason: `no unit contract registered for metric "${metricId}"`,
    };
  }

  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return {
      ...base,
      normalized_value: null,
      normalized_unit: contract.canonicalUnit,
      normalized_period: contract.canonicalPeriod,
      normalization_status: 'rejected_non_numeric',
      normalization_rule: null,
      rejection_reason: 'value is not a finite positive number',
    };
  }

  if (rawCurrency !== 'USD') {
    return {
      ...base,
      normalized_value: null,
      normalized_unit: contract.canonicalUnit,
      normalized_period: contract.canonicalPeriod,
      normalization_status: 'quarantined_missing_context',
      normalization_rule: null,
      rejection_reason: `currency "${rawCurrency}" requires an FX rate/date to normalize to USD — not available in this pipeline`,
    };
  }

  const rule = contract.rules[rawUnit] ?? contract.defaultForUnlisted;

  if (rule.kind === 'reject') {
    return {
      ...base,
      normalized_value: null,
      normalized_unit: contract.canonicalUnit,
      normalized_period: contract.canonicalPeriod,
      normalization_status: rawUnit === 'unknown' ? 'rejected_non_numeric' : 'rejected_metric_mismatch',
      normalization_rule: null,
      rejection_reason: rule.reason,
    };
  }

  if (rule.kind === 'context') {
    return {
      ...base,
      normalized_value: null,
      normalized_unit: contract.canonicalUnit,
      normalized_period: contract.canonicalPeriod,
      normalization_status: 'quarantined_missing_context',
      normalization_rule: null,
      rejection_reason: rule.reason,
    };
  }

  const normalizedValue = rule.kind === 'convert' ? rawValue * rule.factor : rawValue;

  if (normalizedValue < contract.plausibleMin || normalizedValue > contract.plausibleMax) {
    return {
      ...base,
      normalized_value: null,
      normalized_unit: contract.canonicalUnit,
      normalized_period: contract.canonicalPeriod,
      normalization_status: 'rejected_out_of_range',
      normalization_rule: rule.kind === 'convert' ? rule.rule : null,
      rejection_reason: `normalized value ${normalizedValue} falls outside the plausible range [${contract.plausibleMin}, ${contract.plausibleMax}] for ${metricId}`,
    };
  }

  return {
    ...base,
    normalized_value: normalizedValue,
    normalized_unit: contract.canonicalUnit,
    normalized_period: contract.canonicalPeriod,
    normalization_status: rule.kind === 'convert' ? 'accepted_converted' : 'accepted_exact',
    normalization_rule: rule.kind === 'convert' ? rule.rule : null,
    rejection_reason: null,
  };
}

/**
 * Classify the raw unit of a matched number from its surrounding text.
 * Used by the regex fallback path, which has no LLM to ask directly.
 * Order matters: more specific patterns (sq ft, per-X) are checked before
 * generic period markers (annual/weekly/daily).
 */
export function classifyRawUnitFromContext(context: string): RawUnit {
  const c = context.toLowerCase();

  if (/%|percent/.test(c)) return 'percentage';
  if (/\bsq\.?\s?ft\.?\b|square\s?foot|square\s?feet|\bpsf\b/.test(c)) {
    return /annual|\/\s?yr|\/\s?year|per\s?year|per\s?annum/.test(c) ? 'per_sqft_annual' : 'per_sqft_monthly';
  }
  if (/per\s?hour|\/\s?hr\b|\/\s?hour\b|hourly/.test(c)) return 'per_hour';
  if (/per\s?transaction|\/\s?transaction/.test(c)) return 'per_transaction';
  if (/per\s?customer|\/\s?customer|per\s?client/.test(c)) return 'per_customer';
  if (/per\s?unit|\/\s?unit/.test(c)) return 'per_unit';
  if (/\bannual(ly)?\b|\/\s?yr\b|\/\s?year\b|per\s?year|per\s?annum/.test(c)) return 'annual_usd';
  if (/\bweekly\b|\/\s?week\b|per\s?week/.test(c)) return 'weekly_usd';
  if (/\bdaily\b|\/\s?day\b|per\s?day/.test(c)) return 'daily_usd';
  if (/\bmonths?\b/.test(c)) return 'months';
  if (/\bx\b|ratio/.test(c)) return 'ratio_x';

  return 'unknown';
}
