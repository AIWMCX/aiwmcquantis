/**
 * STRICT FINANCIAL CALCULATOR — extracted from index.ts (Handbook §19 Wave 4b)
 *
 * calculateStrictFinancials is a pure, synchronous function (no Deno-only
 * imports, no network/Supabase calls) that was previously defined inline in
 * index.ts. Moved to its own module so golden-case tests can import the
 * real, live calculation engine directly under Vitest — index.ts's
 * top-level `https://deno.land/...` / `https://esm.sh/...` imports make the
 * whole file unimportable from Node, but this module has none of those.
 *
 * Behavior is unchanged: same inputs, same outputs, same call sites in
 * index.ts (which now imports this function instead of defining it).
 */
import { year1ModeledProfit as modeledYear1Profit, roiYear1Percent as roiYear1PercentOf, ROI_YEAR1_EXPRESSION } from './roi-year1.ts';
import { applySubIndustryModifiers, getSubIndustryChurnRate, type SubIndustryResult } from "./sub-industry-detection.ts";
import type { LocationMultiplierResult } from "./location-intelligence.ts";
import { QMath } from "./quantis-math-server.ts";
import { createLogger } from "../_shared/logger.ts";
import { calculateInvestmentPayback, type MonthsMetricResult } from "./payback-contract.ts";
import { calculateCvp, type CvpResult } from "./contribution-margin.ts";
import { calculateProfitabilityMargins, type ProfitabilityMarginsResult } from "./profitability-margins.ts";
import { calculateLeverageRatios, type LeverageRatiosResult } from "./leverage-ratios.ts";
import { calculateOperatingBreakEvenMonth, projectOperatingMonth } from "./operating-projection.ts";
import type { IndustryBenchmarks } from "./index.ts";

const log = createLogger('analyze-business', 'financial-calculator');

export interface CalculationAudit {
  formula: string;
  inputs: Record<string, number | string>;
  result: number;
  isValid: boolean;
  notes?: string;
}

export interface StrictFinancialResult {
  mrr: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPercent: number;
  grossProfit: number;
  grossMarginPercent: number;
  expenses: {
    cogs: number;
    salaries: number;
    rent: number;
    utilities: number;
    marketing: number;
    other: number;
  };
  cac: number;
  ltv: number;
  ltvCacRatio: number;
  averageCheck: number;
  ordersMonthly: number;
  clientsActive: number;
  newClientsNeeded: number;
  startupInvestment: number;
  breakEvenMonths: number | null;
  paybackMonths: number;
  paybackResult: MonthsMetricResult | null;
  roiYear1Percent: number;
  breakEvenRevenue: number;
  revenueFor45kProfit: number;
  cvp: CvpResult;
  profitabilityMargins: ProfitabilityMarginsResult;
  leverageRatios: LeverageRatiosResult;
  npv3Years?: number;
  /** Whether totalExpenses came from the user directly or was calculated
   *  from the itemized breakdown. When 'user', the operating items are
   *  scaled so expenses.* sums exactly to totalExpenses (founder decision
   *  2026-09-28: the user's total wins and includes COGS; COGS itself stays
   *  at its benchmark share of revenue). If the user's total is below COGS
   *  alone, operating items are 0 and COGS exceeds the total -- the one
   *  case where the sum can exceed totalExpenses; margins then use the
   *  capped effectiveCogsForMargins. */
  expenseSource: 'user' | 'calculated';
  isProfitable: boolean;
  corrections: Array<{ field: string; original: number; corrected: number; reason: string }>;
  audit: CalculationAudit[];
  industryDetected: string;
}

export function calculateStrictFinancials(
  rawMrr: number,
  rawInvestment: number,
  rawCac: number,
  rawLtv: number,
  rawAvgCheck: number,
  benchmarks: IndustryBenchmarks,
  locationMultipliers: LocationMultiplierResult,
  subIndustry: SubIndustryResult | null,
  userProvidedCosts?: number,
  userProvidedChurnRate?: number,
  userProvidedCustomers?: number
): StrictFinancialResult {
  const corrections: Array<{ field: string; original: number; corrected: number; reason: string }> = [];
  const audit: CalculationAudit[] = [];

  // ===== ENHANCED: Apply granular location multipliers =====
  const adjustedSalaries = Math.round(benchmarks.salaries_fixed * locationMultipliers.salary);
  const adjustedRent = Math.round(benchmarks.rent_fixed * locationMultipliers.rent);
  const adjustedUtilities = Math.round(benchmarks.utilities_fixed * locationMultipliers.utility);
  const adjustedOther = Math.round(benchmarks.other_fixed * locationMultipliers.overall);

  // Log location adjustment details
  log.info('Location multipliers applied');
  if (locationMultipliers.matched) {
    log.info('Location benchmark matched');
  }

  // ===== ENHANCED: Apply sub-industry modifiers to benchmarks =====
  let effectiveBenchmarks = { ...benchmarks };
  // Bug found via Handbook §19 five-analysis audit (2026-07-12): `|| 0.08`
  // treats an explicit churn rate of exactly 0 as falsy and silently
  // overrides it with the 8% default. `??` only falls back on null/undefined.
  // UNITS (iron stress test 2026-10-23): every caller passes the user's churn
  // as a PERCENT (the form field is "% of customers lost per month"; index.ts
  // and run-scenario forward it unchanged; index.ts's other paths divide by
  // 100). This function previously used it as a FRACTION, so "5" meant 500%:
  // 5% churn on 10 clients needed 50 new clients/month, and with no total
  // costs supplied, a +$7,000/mo business became -$17,500/mo. Convert once,
  // here. Internal value stays a fraction (default 8% = 0.08).
  let effectiveChurnRate = typeof userProvidedChurnRate === 'number' && Number.isFinite(userProvidedChurnRate)
    ? Math.min(Math.max(userProvidedChurnRate, 0), 100) / 100
    : 0.08; // Default 8% monthly

  if (subIndustry && subIndustry.confidence > 50) {
    const modified = applySubIndustryModifiers(
      {
        cac_typical: benchmarks.cac_typical,
        cac_min: benchmarks.cac_min,
        cac_max: benchmarks.cac_max,
        client_lifetime_months: benchmarks.client_lifetime_months,
        net_margin_min: benchmarks.net_margin_min,
        net_margin_max: benchmarks.net_margin_max,
      },
      subIndustry.modifiers
    );

    effectiveBenchmarks = {
      ...benchmarks,
      cac_typical: modified.cac_typical,
      cac_min: modified.cac_min,
      cac_max: modified.cac_max,
      client_lifetime_months: modified.client_lifetime_months,
      net_margin_min: modified.net_margin_min,
      net_margin_max: modified.net_margin_max,
    };

    // Use sub-industry churn rate if user didn't provide one. Same `||` bug
    // as above would apply here too: `!0` is true, so an explicit 0 churn
    // rate must be checked with typeof, not falsy-coercion.
    if (typeof userProvidedChurnRate !== 'number') {
      effectiveChurnRate = getSubIndustryChurnRate(subIndustry);
    }

    log.info(`Sub-industry detected: ${subIndustry.subIndustryName} (${subIndustry.businessModel}, ${subIndustry.targetScale})`);
    log.info(`Applied modifiers: CAC=${subIndustry.modifiers.cac_multiplier}x, LTV=${subIndustry.modifiers.ltv_multiplier}x, Churn=${subIndustry.modifiers.churn_multiplier}x`);
    log.info('Effective churn assumption selected');

    audit.push({
      formula: 'Sub-Industry Detection',
      inputs: {
        'Business Model': subIndustry.businessModel,
        'Target Scale': subIndustry.targetScale,
        'CAC Multiplier': subIndustry.modifiers.cac_multiplier,
        'LTV Multiplier': subIndustry.modifiers.ltv_multiplier,
        'Churn Multiplier': subIndustry.modifiers.churn_multiplier,
      },
      result: subIndustry.confidence,
      isValid: true,
      notes: `${subIndustry.subIndustryName}: Keywords matched: ${subIndustry.detectedKeywords.join(', ') || 'none'}`
    });
  }

  // ===== STEP 1: Validate and correct input values =====

  // 1.1 Average Check
  let avgCheck = rawAvgCheck;
  // P0-01 (Stripe/accuracy audit 2026-07-22/25): previously this block
  // REWROTE the user's declared average check to a benchmark-derived value
  // whenever it fell outside the industry range -- a real user fact was
  // silently replaced by a fabricated one, with only a buried `corrections`
  // entry as evidence. Per MP7 "never silently clamp a user value to a
  // benchmark": the flag stays (still lowers reliability score, still
  // visible in ValidationSection), but avgCheck itself is no longer
  // overwritten -- LTV and every downstream figure now derive from what
  // the user actually reported.
  if (avgCheck < benchmarks.average_check_min || avgCheck > benchmarks.average_check_max) {
    const corrected = Math.round((benchmarks.average_check_min + benchmarks.average_check_max) / 2);
    if (avgCheck < benchmarks.average_check_min) {
      corrections.push({
        field: 'average_check',
        original: avgCheck,
        corrected,
        reason: `Check this input: average price $${avgCheck} is below the usual range for ${benchmarks.name} ($${benchmarks.average_check_min}–$${benchmarks.average_check_max}). If it is right, keep it; the analysis uses your figure.`
      });
    } else {
      corrections.push({
        field: 'average_check',
        original: avgCheck,
        corrected,
        reason: `Check this input: average price $${avgCheck} is above the usual range for ${benchmarks.name} ($${benchmarks.average_check_min}–$${benchmarks.average_check_max}). If it is right, keep it; the analysis uses your figure.`
      });
    }
  }

  // 1.2 CAC - Use effectiveBenchmarks for sub-industry adjusted ranges
  // ENHANCED: B2B/enterprise businesses have hard CAC floors because enterprise sales
  // require dedicated account executives, demos, and multi-month cycles.
  const B2B_CAC_FLOOR_KEYWORDS = [
    'b2b', 'enterprise', 'saas', 'agency', 'consulting', 'professional services',
    'migration', 'platform', 'managed services', 'white label', 'white-label',
  ];
  const ideaLower = (benchmarks.name || '').toLowerCase();
  const isB2BEnterprise = B2B_CAC_FLOOR_KEYWORDS.some(kw => ideaLower.includes(kw))
    || (benchmarks.name?.toLowerCase().includes('consulting') ?? false)
    || (benchmarks.name?.toLowerCase().includes('saas') ?? false)
    || (benchmarks.name?.toLowerCase().includes('agency') ?? false);

  // B2B enterprise: minimum CAC of $2,000 (conservative for technical sales)
  const hardCacFloor = isB2BEnterprise ? Math.max(effectiveBenchmarks.cac_min, 2000) : effectiveBenchmarks.cac_min;

  // P0-01: same principle as average_check above -- flag, never overwrite
  // the user-reported CAC. `corrected` in the record still shows what the
  // benchmark implies, for context; it no longer becomes the working value.
  let cac = rawCac;
  if (cac < hardCacFloor) {
    corrections.push({
      field: 'cac',
      original: cac,
      corrected: isB2BEnterprise ? Math.max(effectiveBenchmarks.cac_typical, 2000) : effectiveBenchmarks.cac_typical,
      reason: cac <= 0
        ? `Check this input: a customer acquisition cost of $${cac} means customers arrive for free. If you do spend to win clients (ads, events, your own time), enter that amount; the analysis uses your figure.`
        : isB2BEnterprise
        ? `Check this input: CAC $${cac} is below what B2B sales with demos and longer cycles usually cost (often $2,000+). If referrals or an existing network bring clients in cheaply, keep it; the analysis uses your figure.`
        : `Check this input: CAC $${cac} is below the usual range for ${subIndustry?.subIndustryName || benchmarks.name} (from $${effectiveBenchmarks.cac_min}). If it is right, keep it; the analysis uses your figure.`
    });
  } else if (cac > effectiveBenchmarks.cac_max) {
    corrections.push({
      field: 'cac',
      original: cac,
      corrected: effectiveBenchmarks.cac_max,
      reason: `Check this input: CAC $${cac} is above the usual range for ${subIndustry?.subIndustryName || benchmarks.name} (up to $${effectiveBenchmarks.cac_max}). If it is right, keep it; the analysis uses your figure.`
    });
  }

  // Apply location marketing multiplier to CAC
  const locationAdjustedCac = Math.round(cac * locationMultipliers.marketing);
  if (locationAdjustedCac !== cac) {
    audit.push({
      formula: 'Location-Adjusted CAC',
      inputs: { 'Base CAC': cac, 'Marketing Multiplier': locationMultipliers.marketing },
      result: locationAdjustedCac,
      isValid: true,
      notes: `$${cac} × ${locationMultipliers.marketing}x = $${locationAdjustedCac} (${locationMultipliers.matchedCity || 'regional'} adjustment)`
    });
    cac = locationAdjustedCac;
  }

  // 1.3 LTV - calculate from formula with GROSS MARGIN adjustment and sub-industry adjusted lifetime
  // BUG FIX: LTV must be margin-adjusted. Formula: LTV = Avg_Check × (1-COGS%) × Orders × Lifetime
  // Previously was raw revenue; now correctly represents what the business KEEPS from each customer.
  // D2 (iron audit 2026-10-23): LTV ignored the churn the user typed and
  // always used the industry lifetime, so 2% and 100% monthly churn gave the
  // same LTV. With a user churn rate, expected lifetime = 1 / churn (months),
  // capped at 120 so 0% churn does not mean infinite value. Without one, the
  // industry lifetime stays.
  const LIFETIME_CAP_MONTHS = 120;
  const userChurnFraction = typeof userProvidedChurnRate === 'number' && Number.isFinite(userProvidedChurnRate)
    ? Math.min(Math.max(userProvidedChurnRate, 0), 100) / 100
    : null;
  const lifetimeFromChurn = userChurnFraction === null
    ? null
    : userChurnFraction <= 0 ? LIFETIME_CAP_MONTHS : Math.min(LIFETIME_CAP_MONTHS, 1 / userChurnFraction);
  const effectiveLifetime = lifetimeFromChurn !== null
    ? Math.round(lifetimeFromChurn * 10) / 10
    : effectiveBenchmarks.client_lifetime_months;
  const lifetimeSource = lifetimeFromChurn !== null
    ? `1 ÷ your ${(userChurnFraction! * 100).toFixed(1)}% monthly churn${userChurnFraction! <= 0 || 1 / userChurnFraction! > LIFETIME_CAP_MONTHS ? `, capped at ${LIFETIME_CAP_MONTHS} months` : ''}`
    : 'industry benchmark lifetime';
  const grossMarginFraction = 1 - (benchmarks.cogs_percent / 100);
  const calculatedLtv = QMath.round(
    QMath.sanitize(avgCheck)
      .times(grossMarginFraction)
      .times(benchmarks.orders_per_client)
      .times(effectiveLifetime)
  );

  audit.push({
    formula: 'LTV = Avg_Check × (1 - COGS%) × Orders_per_Month × Client_Lifetime',
    inputs: {
      'Average Check': avgCheck,
      'Gross Margin Fraction': Math.round(grossMarginFraction * 100) / 100,
      'Orders/Month': benchmarks.orders_per_client,
      'Lifetime (months)': effectiveLifetime
    },
    result: calculatedLtv,
    isValid: true,
    notes: `$${avgCheck} × ${Math.round(grossMarginFraction * 100)}% × ${benchmarks.orders_per_client} × ${effectiveLifetime} = $${calculatedLtv} (margin-adjusted; lifetime = ${lifetimeSource})`
  });

  let ltv = calculatedLtv;

  // Only when an LTV was actually supplied; rawLtv is 0 when none was, which
  // used to add a meaningless "recalculated" note to every analysis.
  if (rawLtv > 0 && Math.abs(rawLtv - calculatedLtv) > calculatedLtv * 0.5) {
    corrections.push({
      field: 'ltv',
      original: rawLtv,
      corrected: calculatedLtv,
      reason: `Check this input: the LTV you gave ($${rawLtv}) differs from $${avgCheck} × ${benchmarks.orders_per_client} orders × ${Math.round(grossMarginFraction * 100)}% margin × ${effectiveLifetime} months = $${calculatedLtv}. The analysis uses the calculated value so it matches your price, margin and churn.`
    });
  }

  // 1.4 Validate LTV:CAC ratio
  let ltvCacRatio = QMath.ltvCacRatio(ltv, cac);

  audit.push({
    formula: 'LTV:CAC = LTV / CAC',
    inputs: { LTV: ltv, CAC: cac },
    result: ltvCacRatio,
    isValid: cac > 0 && ltvCacRatio >= benchmarks.ltv_cac_min && ltvCacRatio <= benchmarks.ltv_cac_max,
    // D3: dividing by a $0 CAC is not a ratio; never print "0x (healthy ...)".
    notes: cac > 0
      ? `$${ltv} / $${cac} = ${ltvCacRatio}x (typical range: ${benchmarks.ltv_cac_min}-${benchmarks.ltv_cac_max}x)`
      : `Not meaningful: CAC is $${cac}, so LTV:CAC cannot be computed.`
  });

  // P0-01: previously this rewrote LTV itself to force the ratio down to a
  // benchmark ceiling -- fabricating a lower LTV the calculation never
  // produced. Flag only now; the calculated LTV and ratio stand.
  if (cac > 0 && ltvCacRatio > benchmarks.ltv_cac_max) {
    corrections.push({
      field: 'ltv_cac_ratio',
      original: ltvCacRatio,
      corrected: benchmarks.ltv_cac_max,
      reason: `Check this result: LTV:CAC ${ltvCacRatio}x is above the usual range for this industry (up to ${benchmarks.ltv_cac_max}x). Worth confirming average price, churn and CAC; the analysis keeps your figures.`
    });
  }

  // ===== STEP 2: Calculate expense structure =====

  const mrr = rawMrr;

  // 2.1 COGS (variable cost)
  const cogs = Math.round(mrr * (benchmarks.cogs_percent / 100));

  audit.push({
    formula: 'COGS = Revenue × COGS%',
    inputs: { 'Revenue': mrr, 'COGS%': benchmarks.cogs_percent },
    result: cogs,
    isValid: true,
    notes: `$${mrr} × ${benchmarks.cogs_percent}% = $${cogs}`
  });

  // 2.2 Fixed costs
  let salaries = adjustedSalaries;
  let rent = adjustedRent;
  let utilities = adjustedUtilities;
  let other = adjustedOther;
  let fixedCosts = salaries + rent + utilities + other;

  // 2.3 Marketing cost - Use dynamic churn rate from sub-industry detection
  const revenuePerClient = avgCheck * benchmarks.orders_per_client;

  // Use user-provided customers if available
  const clientsActive = userProvidedCustomers !== undefined
    ? userProvidedCustomers
    : Math.ceil(mrr / revenuePerClient);

  // ENHANCED: Use sub-industry specific churn rate instead of hardcoded 25%
  // D5 (iron audit 2026-10-23): contradictory inputs used to pass silently.
  // Flag them; never change the user's figures.
  if (userProvidedCustomers !== undefined && userProvidedCustomers <= 0 && mrr > 0) {
    corrections.push({
      field: 'expected_customers',
      original: userProvidedCustomers,
      corrected: Math.ceil(mrr / Math.max(revenuePerClient, 1)),
      reason: `Check these inputs: monthly revenue is $${mrr} but customers is ${userProvidedCustomers}. Revenue needs paying customers; at $${avgCheck} each that is about ${Math.ceil(mrr / Math.max(revenuePerClient, 1))}.`,
    });
  } else if (userProvidedCustomers !== undefined && userProvidedCustomers > 0 && mrr > 0 && revenuePerClient > 0) {
    const implied = userProvidedCustomers * revenuePerClient;
    if (implied < mrr * 0.5 || implied > mrr * 2) {
      corrections.push({
        field: 'average_price',
        original: avgCheck,
        corrected: Math.round(mrr / userProvidedCustomers),
        reason: `Check these inputs: ${userProvidedCustomers} customers × $${avgCheck} = $${Math.round(implied)} a month, but monthly revenue is $${mrr}. One of the three is probably off (revenue ÷ customers = $${Math.round(mrr / userProvidedCustomers)} each).`,
      });
    }
  }

  const monthlyChurnPercent = effectiveChurnRate * 100;
  const newClientsNeeded = Math.ceil(clientsActive * effectiveChurnRate);
  const marketing = newClientsNeeded * cac;

  audit.push({
    formula: 'Marketing = New_Clients × CAC',
    inputs: {
      'Active Clients': clientsActive,
      'Monthly Churn Rate': `${monthlyChurnPercent.toFixed(1)}%`,
      'New Clients Needed': newClientsNeeded,
      'CAC': cac
    },
    result: marketing,
    isValid: true,
    notes: `${clientsActive} clients × ${monthlyChurnPercent.toFixed(1)}% churn = ${newClientsNeeded} new clients × $${cac} = $${marketing}${userProvidedCustomers !== undefined ? ' (user-provided customer count)' : ''}`
  });

  // 2.4 Total expenses - CRITICAL: Use user-provided costs if available
  let totalExpenses: number;
  let expenseSource: 'user' | 'calculated' = 'calculated';
  // Reconciled marketing figure used in the returned expense breakdown.
  // Bug found via Handbook §19 five-analysis audit (2026-07-12): when
  // userProvidedCosts overrides totalExpenses, the individual `marketing`
  // sub-component above (computed from newClientsNeeded × cac,
  // independent of any user override) stayed as-is and was returned
  // unchanged in `expenses.marketing`. Every downstream consumer that
  // rebuilds "total expenses" from the breakdown (the scenarios{} block
  // and the Monthly Operating Expenses PDF table both do, deliberately,
  // per the "CRITICAL FIX: Calculate expenses from breakdown" comment a
  // few hundred lines below) then produced a wildly different net profit
  // than calc.netProfit itself — the exact KPI-card-vs-narrative
  // contradiction (-$435,944 vs -$8,965) found in the 2026-07-12 audit's
  // real production report.
  let reconciledMarketing = marketing;

  if (userProvidedCosts !== undefined) {
    // User provided their own monthly costs - use them directly
    totalExpenses = userProvidedCosts;
    expenseSource = 'user';

    // Reconcile the itemized benchmark costs to the user's total (founder
    // decision 2026-09-28, "Option A"): the user's total wins and includes
    // COGS. COGS stays at its benchmark share of revenue (it is a per-sale
    // cost, so gross margin must not move with the user's total); the
    // operating items -- salaries, rent, utilities, other, marketing -- are
    // scaled by one factor so the breakdown sums exactly to the user's
    // figure. Previously only marketing absorbed the difference (clamped at
    // 0), so when the user's total was below COGS + benchmark fixed costs,
    // profit followed the user's total while break-even, CVP and operating
    // leverage kept the unscaled benchmark fixed costs -- a report whose
    // expense table did not sum (e.g. items $12,785 vs total $4,650) and
    // whose break-even was wrong. Reconciling here, once, makes every
    // downstream figure consistent; the display-time rescaling in
    // financial-analysis-shape.ts becomes a no-op.
    const operatingItemized = fixedCosts + marketing;
    const operatingTarget = Math.max(0, userProvidedCosts - cogs);
    if (operatingItemized > 0 && Math.abs(operatingItemized - operatingTarget) >= 1) {
      const scale = operatingTarget / operatingItemized;
      const before = { salaries, rent, utilities, other, marketing };
      salaries = Math.round(salaries * scale);
      rent = Math.round(rent * scale);
      utilities = Math.round(utilities * scale);
      reconciledMarketing = Math.round(marketing * scale);
      // `other` absorbs the rounding residue so the operating items sum exactly.
      other = operatingTarget - salaries - rent - utilities - reconciledMarketing;
      if (other < 0) {
        salaries = Math.max(0, salaries + other);
        other = 0;
      }
      fixedCosts = salaries + rent + utilities + other;
      audit.push({
        formula: 'Operating_Item_i (reconciled) = Operating_Item_i × ((User_Provided_Costs − COGS) / Operating_Itemized_Total)',
        inputs: { 'User Monthly Costs': userProvidedCosts, COGS: cogs, 'Operating items (benchmark)': operatingItemized, 'Scale': Math.round(scale * 10000) / 10000 },
        result: fixedCosts,
        isValid: true,
        notes: `Benchmark operating items ($${operatingItemized.toLocaleString()}: salaries $${before.salaries}, rent $${before.rent}, utilities $${before.utilities}, other $${before.other}, marketing $${before.marketing}) were scaled by ${Math.round(scale * 1000) / 1000} so COGS ($${cogs.toLocaleString()}) plus operating costs sum to your reported $${userProvidedCosts.toLocaleString()}/mo. Fixed costs used for break-even: $${fixedCosts.toLocaleString()}.`
      });
    } else if (operatingItemized <= 0) {
      // No itemized operating basis to scale: the remainder is all fixed cost.
      other = operatingTarget;
      fixedCosts = other;
      reconciledMarketing = 0;
    }

    audit.push({
      formula: 'Total_Expenses = User_Provided_Costs',
      inputs: { 'User Monthly Costs': userProvidedCosts },
      result: totalExpenses,
      isValid: true,
      notes: `Using user-provided monthly costs: $${userProvidedCosts.toLocaleString()}`
    });
  } else {
    // Calculate from industry benchmarks
    totalExpenses = cogs + fixedCosts + marketing;

    audit.push({
      formula: 'Total_Expenses = COGS + Fixed_Costs + Marketing',
      inputs: {
        'COGS': cogs,
        'Salaries': salaries,
        'Rent': rent,
        'Utilities': utilities,
        'Other': other,
        'Marketing': marketing
      },
      result: totalExpenses,
      isValid: true,
      notes: `$${cogs} + $${salaries} + $${rent} + $${utilities} + $${other} + $${marketing} = $${totalExpenses}`
    });
  }

  // ===== STEP 3: Calculate profit metrics =====

  const netProfit = mrr - totalExpenses;
  const isProfitable = netProfit > 0;

  audit.push({
    formula: 'Net_Profit = Revenue - Expenses',
    inputs: { 'Revenue': mrr, 'Expenses': totalExpenses },
    result: netProfit,
    isValid: isProfitable,
    notes: `$${mrr} - $${totalExpenses} = $${netProfit} ${isProfitable ? '✓' : '❌ LOSS'}`
  });

  const netMarginPercent = mrr > 0 ? Math.round((netProfit / mrr) * 100) : 0;

  // ===== MARGIN CEILING GUARD (BUG FIX Phase 5 → Phase 6 tightened) =====
  // Audit finding: +20% buffer allowed 74-83% margins in consulting (max 50%).
  // Now enforced at benchmark max + 5% — still allows outperformance but prevents absurd projections.
  const maxAllowedMargin = benchmarks.net_margin_max + 5;
  let finalNetProfit = netProfit;
  let finalNetMarginPercent = netMarginPercent;
  let finalTotalExpenses = totalExpenses;

  // P0-02 (Stripe/accuracy audit 2026-07-22/25): this block used to REWRITE
  // totalExpenses to a fabricated figure purely to force the margin down to
  // a benchmark ceiling -- a real customer's own reported costs were
  // replaced by a number they never supplied, disclosed only in a
  // secondary validation panel while the primary report/PDF showed the
  // fabricated expense as plain fact. Per MP7 "never silently clamp a user
  // value to a benchmark" / "zero silent replacement of user-declared
  // material values": flag only now. netProfit, totalExpenses, and
  // netMarginPercent all remain exactly what the user's own inputs produce.
  if (netMarginPercent > maxAllowedMargin && mrr > 0) {
    corrections.push({
      field: 'net_margin',
      original: netMarginPercent,
      corrected: maxAllowedMargin,
      reason: `Net margin ${netMarginPercent}% is unusually high -- typical maximum for ${benchmarks.name} is ${benchmarks.net_margin_max}%. Flagged for review; your reported revenue and expenses are shown as calculated, not adjusted.`
    });
    log.info('Net margin ceiling flagged for review');
  }

  audit.push({
    formula: 'Net_Margin = (Profit / Revenue) × 100%',
    inputs: { 'Profit': finalNetProfit, 'Revenue': mrr },
    result: finalNetMarginPercent,
    isValid: finalNetMarginPercent >= benchmarks.net_margin_min && finalNetMarginPercent <= maxAllowedMargin,
    notes: `($${finalNetProfit} / $${mrr}) × 100 = ${finalNetMarginPercent}% (healthy: ${benchmarks.net_margin_min}-${benchmarks.net_margin_max}%)`
  });

  // Gross margin can never legitimately be lower than operating/net margin --
  // gross profit only subtracts COGS, a subset of total expenses, so
  // gross margin >= operating margin is a hard accounting law, not a
  // benchmark judgment call. Found live 2026-09-14 (financial invariant
  // sweep, 5 flagged analyses, all OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT):
  // `cogs` above is a pure industry-benchmark estimate (mrr * cogs_percent),
  // computed independently of userProvidedCosts. When a user's own reported
  // total monthly costs come in below that benchmark-implied COGS alone,
  // grossProfit (mrr - cogs) ends up smaller than netProfit (mrr -
  // totalExpenses), and since operatingMargin is set equal to netMargin
  // (operatingEqualsNetIncome, this engine has no separate opex layer),
  // gross margin comes out lower than operating margin -- an impossibility.
  // Per this file's own "never silently clamp a user value" precedent (the
  // net-margin-ceiling block above), the raw benchmark `cogs` is left
  // untouched everywhere else (expenses.cogs breakdown, marketing
  // reconciliation above) so the assumption stays visible and auditable.
  // Only the two margin OUTPUTS that must stay arithmetically consistent
  // with each other -- grossProfit/grossMarginPercent here, and the `cogs`
  // fed to calculateProfitabilityMargins below -- use this capped value.
  let effectiveCogsForMargins = cogs;
  if (expenseSource === 'user' && cogs > totalExpenses) {
    effectiveCogsForMargins = totalExpenses;
    corrections.push({
      field: 'gross_margin_cogs',
      original: cogs,
      corrected: totalExpenses,
      reason: `The industry-benchmark cost-of-goods assumption ($${cogs.toLocaleString()}) exceeds your own reported total monthly costs ($${totalExpenses.toLocaleString()}) -- which would otherwise make gross margin come out lower than operating margin, an accounting impossibility. Gross margin is capped at your reported total as a ceiling; your reported total costs may not include a COGS component in line with this industry's typical ${benchmarks.cogs_percent}%, or your business genuinely runs leaner than the benchmark.`
    });
  }
  const grossProfit = mrr - effectiveCogsForMargins;
  const grossMarginPercent = mrr > 0 ? Math.round((grossProfit / mrr) * 100) : 0;

  // ===== STEP 4: Calculate investment metrics =====

  const startupInvestment = rawInvestment;
  const breakEvenMonths = calculateOperatingBreakEvenMonth(mrr, finalTotalExpenses);

  // RAMP-UP AWARE PAYBACK: Uses 6-month ramp schedule (30%→100% of revenue)
  // instead of assuming full Month 1 profit. This fixes the "1 month payback" template artifact.
  let paybackMonths = 0;
  let paybackResult: MonthsMetricResult | null = null;
  // Distinguishes the two distinct causes that both land on the same `999`
  // sentinel below: a genuinely unprofitable business (finalNetProfit <= 0,
  // line ~568) vs. a PROFITABLE business whose investment is simply too
  // large relative to its steady-state profit to pay back within the
  // 60-month simulation window (line ~514). The notes text used to treat
  // 999 as always meaning "unprofitable, payback impossible" -- false for
  // the second case, which tells a genuinely profitable, capital-intensive
  // business that it's unprofitable.
  let paybackExceedsHorizon = false;
  if (startupInvestment > 0) {
    if (finalNetProfit > 0) {
      // Simulate ramp-up cash flow to find true payback month
      let cumulative = 0;
      let foundPayback = false;
      const monthlyFcf: number[] = [];

      for (let m = 1; m <= 60; m++) {
        const projection = projectOperatingMonth(mrr, finalTotalExpenses, m);
        const fcf = projection.revenue - projection.expenses;
        monthlyFcf.push(fcf);
        cumulative += fcf;
        if (cumulative >= startupInvestment) {
          paybackMonths = m;
          foundPayback = true;
          break;
        }
      }

      if (!foundPayback) {
        paybackMonths = 999;
        paybackExceedsHorizon = true;
      }

      // Domain 6/18 accuracy audit (2026-07-25, P0-25): this project has three
      // separately-built, fully-tested reconciliation engines (reconciliation-
      // engine.ts, financial/reconcile.ts, lib/r3-validator.ts) with zero live
      // callers -- none actually verify Cash[t]=Cash[t-1]+FCF[t] in production.
      // Adding one narrow, bounded check here rather than wiring one of those
      // three (a larger architectural decision, not a same-session patch):
      // independently re-sum the exact monthlyFcf series the loop above just
      // built and confirm it agrees with the loop's own incrementally-tracked
      // `cumulative` at the point payback was found. This can only ever catch
      // a future maintenance bug (the two are mathematically identical today
      // by construction), but that is exactly what a reconciliation check is
      // for -- flagging drift the moment someone changes this loop without
      // preserving the identity, not correcting anything silently.
      const independentCashSum = monthlyFcf.reduce((sum, v) => sum + v, 0);
      const cashRollForwardHolds = Math.abs(independentCashSum - cumulative) < 0.01;
      audit.push({
        formula: 'Cash roll-forward: Cash[t] = Cash[t-1] + FCF[t]',
        inputs: { 'Cumulative FCF (running sum)': cumulative, 'Cumulative FCF (independent re-sum)': independentCashSum },
        result: independentCashSum,
        isValid: cashRollForwardHolds,
        notes: cashRollForwardHolds
          ? 'Cash roll-forward reconciles exactly across all simulated months.'
          : `Cash roll-forward mismatch: running total ${cumulative} vs. independent re-sum ${independentCashSum} — investigate before trusting payback/runway figures.`,
      });
      if (!cashRollForwardHolds) {
        log.error('Cash roll-forward reconciliation failed');
      }

      // Handbook §19 Wave 2 — cross-validate the ramp loop above against the
      // typed, tested calculator from payback-contract.ts using the exact
      // same monthly FCF series. Detection-only: does not alter paybackMonths
      // (20+ call sites downstream depend on its existing integer/999
      // contract). A material disagreement means the ramp loop and the
      // tested formula have drifted apart and needs investigation.
      try {
        paybackResult = calculateInvestmentPayback(
          String(startupInvestment),
          monthlyFcf.map((v) => String(v)),
        );
        const typedMonths = paybackResult.status === "VALUE" ? Math.ceil(Number(paybackResult.months)) : null;
        const legacyMonths = foundPayback ? paybackMonths : null;
        if (typedMonths !== legacyMonths && Math.abs((typedMonths ?? 999) - (legacyMonths ?? 999)) > 1) {
          log.warn('Investment payback implementations materially disagree');
        }
      } catch {
        log.warn('Investment payback contract cross-check failed (non-fatal)');
      }
    } else {
      paybackMonths = 999;
      paybackResult = {
        status: "NOT_APPLICABLE",
        months: null,
        horizonMonths: 60,
        formulaId: "investment_payback.cumulative_fcf.v1",
        reasonCode: "NEGATIVE_STEADY_STATE_PROFIT",
      };
    }
  }

  audit.push({
    formula: 'Payback = Ramp-Up Cash Flow Model (30%→100% over 6 months)',
    inputs: { 'Investment': startupInvestment, 'Steady-State Profit/mo': finalNetProfit },
    result: paybackMonths,
    isValid: paybackMonths < 36 && paybackMonths > 0,
    notes: paybackMonths === 999
      ? (paybackExceedsHorizon
          ? `Profitable, but payback exceeds the 60-month simulation window at this investment size (steady-state profit $${finalNetProfit}/mo would take ~${Math.ceil(startupInvestment / finalNetProfit)} months at full ramp).`
          : 'Business is unprofitable - payback impossible')
      : `With 6-month ramp-up: payback at month ${paybackMonths} (steady-state would be ${Math.ceil(startupInvestment / finalNetProfit)} months)`
  });

  // ROI also uses ramp-adjusted Year 1 profit (not 12 × steady-state)
  let roiYear1Percent = 0;
  let year1ModeledProfit = 0;
  if (startupInvestment > 0) {
    // Year-1 modeled profit: the single shared ramp-model definition.
    const year1Profit = modeledYear1Profit(mrr, finalTotalExpenses);
    roiYear1Percent = roiYear1PercentOf(mrr, finalTotalExpenses, startupInvestment);
    year1ModeledProfit = Math.round(year1Profit);
  }

  audit.push({
    // R&D F04: the text previously said "Profit × 12", which is not what runs.
    formula: ROI_YEAR1_EXPRESSION,
    inputs: { 'Year-1 modeled profit': year1ModeledProfit, 'Steady-state profit/mo': finalNetProfit, 'Investment': startupInvestment },
    result: roiYear1Percent,
    isValid: roiYear1Percent > 0,
    notes: `Year-1 modeled profit $${year1ModeledProfit.toLocaleString()} ÷ investment $${startupInvestment.toLocaleString()} = ${roiYear1Percent}%. Accounting profit with the ramp and growth assumptions above, not steady-state profit × 12 ($${(finalNetProfit * 12).toLocaleString()}) and not a cash return.`
  });

  // BUG FIX (Phase 2): True DCF NPV — not cumulative profit.
  // NPV = –Investment + Σ(month 1→36) [ NetProfit / (1 + monthly_rate)^month ]
  // 10% annual discount rate is an assumption, not the business's cost of
  // capital; the series is steady-state profit (no ramp/growth), used as a
  // cash proxy. Labelled as such below (R&D F04); unifying the cash series
  // with ROI/payback is a separate change.
  const ANNUAL_WACC = 0.10;
  const monthlyDiscountRate = Math.pow(1 + ANNUAL_WACC, 1 / 12) - 1;
  let npvAccum = -startupInvestment;
  for (let m = 1; m <= 36; m++) {
    npvAccum += finalNetProfit / Math.pow(1 + monthlyDiscountRate, m);
  }
  const npv3Years = Math.round(npvAccum);

  audit.push({
    formula: 'NPV_3yr = -Investment + Σ(month 1→36) [NetProfit / (1 + Monthly_Rate)^month]',
    inputs: { 'Steady-state profit/mo (used as cash flow)': finalNetProfit, 'Investment': startupInvestment, 'Assumed annual discount rate %': ANNUAL_WACC * 100, 'Monthly Rate %': Math.round(monthlyDiscountRate * 10000) / 100 },
    result: npv3Years,
    isValid: npv3Years > 0,
    notes: `-$${startupInvestment.toLocaleString()} + 36 months of steady-state profit $${finalNetProfit.toLocaleString()}/mo discounted at an assumed 10%/yr = $${npv3Years.toLocaleString()}. Uses steady-state profit as a cash proxy with no ramp-up, so it is not on the same basis as the Year-1 ROI or payback, and 10% is an assumption, not your cost of capital.`
  });

  // BUG FIX: Guard against division-by-zero when mrr=0 in break-even formula.
  const effectiveMrrForBreakeven = Math.max(mrr, benchmarks.average_check_min || 100);
  // Actual (reconciled) variable costs when there is revenue, so this legacy
  // figure uses the same cost basis as the CVP contract below; the
  // benchmark COGS% only as the mrr=0 fallback.
  const variableCostRatio = mrr > 0
    ? (cogs + reconciledMarketing) / mrr
    : (benchmarks.cogs_percent / 100) + (reconciledMarketing / effectiveMrrForBreakeven);
  const safeContributionMargin = Math.max(1 - variableCostRatio, 0.01); // prevent zero or negative
  const breakEvenRevenue = Math.round(fixedCosts / safeContributionMargin);

  audit.push({
    formula: 'Break_Even = Fixed_Costs / (1 - Variable_Cost_Ratio)',
    inputs: {
      'Fixed Costs': fixedCosts,
      'Variable Cost %': Math.round(variableCostRatio * 100)
    },
    result: breakEvenRevenue,
    isValid: true,
    notes: `$${fixedCosts} / (1 - ${Math.round(variableCostRatio * 100)}%) = $${breakEvenRevenue}/mo`
  });

  const targetProfit = 45000;
  const revenueFor45kProfit = Math.round((fixedCosts + targetProfit) / safeContributionMargin);

  audit.push({
    formula: 'Revenue_for_$45k = (Fixed_Costs + $45000) / (1 - Variable%)',
    inputs: {
      'Fixed Costs': fixedCosts,
      'Target Profit': targetProfit,
      'Variable Cost %': Math.round(variableCostRatio * 100)
    },
    result: revenueFor45kProfit,
    isValid: true,
    notes: `($${fixedCosts} + $${targetProfit}) / (1 - ${Math.round(variableCostRatio * 100)}%) = $${revenueFor45kProfit}/mo`
  });

  // Handbook §19 Wave 1 — Contribution Margin & CVP (docs/WAVE1_CONTRIBUTION_
  // MARGIN_CVP_FORMULA_CONTRACTS_2026-07-12.md). Computed in parallel with
  // the legacy breakEvenRevenue/revenueFor45kProfit above, not replacing
  // them — 20+ existing call sites depend on those exact numeric fields.
  // The legacy formula also floor-guards contribution margin to a minimum
  // 1% ("prevent zero or negative") rather than reporting an honest
  // NOT_ACHIEVABLE state — exactly the silent-instead-of-typed pattern
  // fixed elsewhere today. Cross-validated below via a drift-detection log
  // rather than silently trusting either one exclusively.
  const cvpUnitsSold = Math.round(mrr / Math.max(avgCheck, 1));
  const cvpResult: CvpResult = calculateCvp({
    revenue: String(mrr),
    fixedCosts: String(fixedCosts),
    variableCosts: String(cogs + reconciledMarketing),
    unitsSold: String(cvpUnitsSold),
    pricePerUnit: String(avgCheck),
    operatingIncome: String(finalNetProfit),
    targetOperatingProfit: String(targetProfit),
  });
  if (cvpResult.breakEven.status === 'VALUE' && cvpResult.breakEven.breakEvenRevenue !== null) {
    const cvpBreakEven = Number(cvpResult.breakEven.breakEvenRevenue);
    if (Math.abs(cvpBreakEven - breakEvenRevenue) > Math.max(1, breakEvenRevenue * 0.05)) {
      log.warn(
        `⚠️ Break-even drift: legacy formula (floor-guarded)=$${breakEvenRevenue}, CVP contract (typed)=$${cvpBreakEven}`,
      );
    }
  } else if (cvpResult.breakEven.status === 'NOT_ACHIEVABLE') {
    log.warn(
      `⚠️ CVP contract reports break-even NOT_ACHIEVABLE (non-positive contribution margin) while the legacy formula silently floor-guarded to a 1% minimum and produced $${breakEvenRevenue}/mo — the legacy figure may be misleadingly optimistic.`,
    );
  }

  // Handbook §19 Wave 2 — Profitability Margins (docs/WAVE2_PROFITABILITY_
  // RATIOS_FORMULA_CONTRACT_2026-07-12.md). operatingIncome/netIncome are
  // both finalNetProfit today — this engine has no separate D&A/interest/
  // tax layer yet, documented explicitly in the contract rather than
  // silently presenting two independently-computed numbers that happen to
  // coincide.
  const profitabilityMarginsResult: ProfitabilityMarginsResult = calculateProfitabilityMargins({
    revenue: String(mrr),
    // effectiveCogsForMargins, not raw cogs -- this module independently
    // recomputes grossMargin from the cogs it's given, so it must see the
    // same capped value used for grossProfit/grossMarginPercent above, or
    // the OPERATING_PROFIT_EXCEEDS_GROSS_PROFIT bug reappears here even
    // after the fix a few lines up.
    cogs: String(effectiveCogsForMargins),
    operatingIncome: String(finalNetProfit),
    netIncome: String(finalNetProfit),
  });

  // Handbook §19 Wave 3 — leverage ratios. Engine collects no debt schedule
  // today; every metric returns INSUFFICIENT_INPUTS with a specific reasonCode.
  // See docs/WAVE3_LEVERAGE_RATIOS_FORMULA_CONTRACT_2026-07-12.md.
  const leverageRatiosResult: LeverageRatiosResult = calculateLeverageRatios();

  // Sanity flag (not a change): a business at this revenue with almost no
  // payroll is almost always a mis-read input. Live 2026-10-25 a misclassified
  // run showed "1% payroll ratio" on $1.15M/month with no warning.
  const payrollShare = payrollShareFlag(mrr, salaries);
  if (payrollShare) corrections.push(payrollShare);

  return {
    mrr,
    totalExpenses: finalTotalExpenses,
    netProfit: finalNetProfit,
    netMarginPercent: finalNetMarginPercent,
    grossProfit,
    grossMarginPercent,
    expenses: {
      cogs,
      salaries,
      rent,
      utilities,
      marketing: reconciledMarketing,
      other
    },
    cac,
    ltv,
    ltvCacRatio,
    averageCheck: avgCheck,
    ordersMonthly: Math.round(mrr / Math.max(avgCheck, 1)),
    clientsActive,
    newClientsNeeded,
    startupInvestment,
    breakEvenMonths,
    paybackMonths,
    paybackResult,
    roiYear1Percent,
    npv3Years,
    breakEvenRevenue,
    revenueFor45kProfit,
    cvp: cvpResult,
    profitabilityMargins: profitabilityMarginsResult,
    leverageRatios: leverageRatiosResult,
    isProfitable: finalNetProfit > 0,
    corrections,
    audit,
    industryDetected: benchmarks.name,
    expenseSource
  };
}

/** Revenue above which near-zero payroll is implausible for any business type. */
export const PAYROLL_SANITY_MIN_REVENUE = 20_000;
/** Payroll below this share of revenue at that size is flagged for review. */
export const PAYROLL_SANITY_MIN_SHARE = 0.03;

/** A flag (original = corrected: nothing is changed) when payroll is implausibly small for the revenue. */
export function payrollShareFlag(
  mrr: number,
  salaries: number,
): { field: string; original: number; corrected: number; reason: string } | null {
  if (!(mrr > PAYROLL_SANITY_MIN_REVENUE) || !Number.isFinite(salaries)) return null;
  const share = salaries / mrr;
  if (share >= PAYROLL_SANITY_MIN_SHARE) return null;
  return {
    field: 'salaries',
    original: salaries,
    corrected: salaries,
    reason: `Check this: payroll is ${(share * 100).toFixed(1)}% of revenue ($${Math.round(salaries).toLocaleString('en-US')} of $${Math.round(mrr).toLocaleString('en-US')} a month). A business at this revenue almost always needs more staff; enter your real payroll. The analysis has not changed it.`,
  };
}
