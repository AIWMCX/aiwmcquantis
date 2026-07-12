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
import { applySubIndustryModifiers, getSubIndustryChurnRate, type SubIndustryResult } from "./sub-industry-detection.ts";
import type { LocationMultiplierResult } from "./location-intelligence.ts";
import { QMath } from "./quantis-math-server.ts";
import { createLogger } from "../_shared/logger.ts";
import { calculateInvestmentPayback, type MonthsMetricResult } from "./payback-contract.ts";
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
  paybackMonths: number;
  paybackResult: MonthsMetricResult | null;
  roiYear1Percent: number;
  breakEvenRevenue: number;
  revenueFor45kProfit: number;
  npv3Years?: number;
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
  log.info(`Location adjustments: salary=${locationMultipliers.salary}x, rent=${locationMultipliers.rent}x, utility=${locationMultipliers.utility}x, marketing=${locationMultipliers.marketing}x`);
  if (locationMultipliers.matched) {
    log.info(`Matched city: ${locationMultipliers.matchedCity} (${locationMultipliers.region})`);
  }

  // ===== ENHANCED: Apply sub-industry modifiers to benchmarks =====
  let effectiveBenchmarks = { ...benchmarks };
  // Bug found via Handbook §19 five-analysis audit (2026-07-12): `|| 0.08`
  // treats an explicit churn rate of exactly 0 as falsy and silently
  // overrides it with the 8% default. `??` only falls back on null/undefined.
  let effectiveChurnRate = userProvidedChurnRate ?? 0.08; // Default 8% monthly

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
    log.info(`Effective churn rate: ${(effectiveChurnRate * 100).toFixed(1)}%/month`);

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
  if (avgCheck < benchmarks.average_check_min || avgCheck > benchmarks.average_check_max) {
    const corrected = Math.round((benchmarks.average_check_min + benchmarks.average_check_max) / 2);
    if (avgCheck < benchmarks.average_check_min) {
      corrections.push({
        field: 'average_check',
        original: avgCheck,
        corrected,
        reason: `Average check $${avgCheck} is below market minimum $${benchmarks.average_check_min} for ${benchmarks.name}`
      });
    } else {
      corrections.push({
        field: 'average_check',
        original: avgCheck,
        corrected,
        reason: `Average check $${avgCheck} exceeds market maximum $${benchmarks.average_check_max} for ${benchmarks.name}`
      });
    }
    avgCheck = corrected;
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

  let cac = rawCac;
  if (cac < hardCacFloor) {
    corrections.push({
      field: 'cac',
      original: cac,
      corrected: isB2BEnterprise ? Math.max(effectiveBenchmarks.cac_typical, 2000) : effectiveBenchmarks.cac_typical,
      reason: isB2BEnterprise
        ? `CAC $${cac} is unrealistically low for B2B/enterprise sales. Enterprise customer acquisition typically costs $2,000-$50,000+ due to sales cycles, demos, and relationship-building. Adjusted to $${Math.max(effectiveBenchmarks.cac_typical, 2000)}.`
        : `CAC $${cac} is unrealistically low. Minimum is $${effectiveBenchmarks.cac_min} for ${subIndustry?.subIndustryName || benchmarks.name}.`
    });
    cac = isB2BEnterprise ? Math.max(effectiveBenchmarks.cac_typical, 2000) : effectiveBenchmarks.cac_typical;
  } else if (cac > effectiveBenchmarks.cac_max) {
    corrections.push({
      field: 'cac',
      original: cac,
      corrected: effectiveBenchmarks.cac_max,
      reason: `CAC $${cac} is too high for ${subIndustry?.subIndustryName || benchmarks.name}. Adjusted to maximum $${effectiveBenchmarks.cac_max}`
    });
    cac = effectiveBenchmarks.cac_max;
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
  const effectiveLifetime = effectiveBenchmarks.client_lifetime_months;
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
    notes: `$${avgCheck} × ${Math.round(grossMarginFraction * 100)}% × ${benchmarks.orders_per_client} × ${effectiveLifetime} = $${calculatedLtv} (margin-adjusted)`
  });

  let ltv = calculatedLtv;

  if (Math.abs(rawLtv - calculatedLtv) > calculatedLtv * 0.5) {
    corrections.push({
      field: 'ltv',
      original: rawLtv,
      corrected: calculatedLtv,
      reason: `LTV recalculated: $${avgCheck} × ${benchmarks.orders_per_client} orders × ${effectiveLifetime} months = $${calculatedLtv}`
    });
  }

  // 1.4 Validate LTV:CAC ratio
  let ltvCacRatio = QMath.ltvCacRatio(ltv, cac);

  audit.push({
    formula: 'LTV:CAC = LTV / CAC',
    inputs: { LTV: ltv, CAC: cac },
    result: ltvCacRatio,
    isValid: ltvCacRatio >= benchmarks.ltv_cac_min && ltvCacRatio <= benchmarks.ltv_cac_max,
    notes: `$${ltv} / $${cac} = ${ltvCacRatio}x (healthy: ${benchmarks.ltv_cac_min}-${benchmarks.ltv_cac_max}x)`
  });

  if (ltvCacRatio > benchmarks.ltv_cac_max) {
    const targetLtv = cac * benchmarks.ltv_cac_max;
    corrections.push({
      field: 'ltv_cac_ratio',
      original: ltvCacRatio,
      corrected: benchmarks.ltv_cac_max,
      reason: `LTV:CAC ${ltvCacRatio}x is unrealistically high (max ${benchmarks.ltv_cac_max}x). LTV adjusted to $${targetLtv}`
    });
    ltv = targetLtv;
    ltvCacRatio = benchmarks.ltv_cac_max;
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
  const salaries = adjustedSalaries;
  const rent = adjustedRent;
  const utilities = adjustedUtilities;
  const other = adjustedOther;
  const fixedCosts = salaries + rent + utilities + other;

  // 2.3 Marketing cost - Use dynamic churn rate from sub-industry detection
  const revenuePerClient = avgCheck * benchmarks.orders_per_client;

  // Use user-provided customers if available
  const clientsActive = userProvidedCustomers && userProvidedCustomers > 0
    ? userProvidedCustomers
    : Math.ceil(mrr / revenuePerClient);

  // ENHANCED: Use sub-industry specific churn rate instead of hardcoded 25%
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
    notes: `${clientsActive} clients × ${monthlyChurnPercent.toFixed(1)}% churn = ${newClientsNeeded} new clients × $${cac} = $${marketing}${userProvidedCustomers ? ' (user-provided customer count)' : ''}`
  });

  // 2.4 Total expenses - CRITICAL: Use user-provided costs if available
  let totalExpenses: number;
  let expenseSource: 'user' | 'calculated' = 'calculated';

  if (userProvidedCosts && userProvidedCosts > 0) {
    // User provided their own monthly costs - use them directly
    totalExpenses = userProvidedCosts;
    expenseSource = 'user';

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

  if (netMarginPercent > maxAllowedMargin && mrr > 0) {
    const clampedMargin = maxAllowedMargin;
    const targetExpenses = Math.round(mrr * (1 - clampedMargin / 100));
    corrections.push({
      field: 'net_margin',
      original: netMarginPercent,
      corrected: clampedMargin,
      reason: `Net margin ${netMarginPercent}% exceeds maximum realistic threshold of ${maxAllowedMargin}% for ${benchmarks.name}. Expenses adjusted upward to enforce realistic model.`
    });
    finalTotalExpenses = targetExpenses;
    finalNetProfit = mrr - targetExpenses;
    finalNetMarginPercent = clampedMargin;
    log.warn(`⚠️ Margin ceiling enforced: ${netMarginPercent}% → ${clampedMargin}% (max for ${benchmarks.name} = ${benchmarks.net_margin_max}%)`);
  }

  audit.push({
    formula: 'Net_Margin = (Profit / Revenue) × 100%',
    inputs: { 'Profit': finalNetProfit, 'Revenue': mrr },
    result: finalNetMarginPercent,
    isValid: finalNetMarginPercent >= benchmarks.net_margin_min && finalNetMarginPercent <= maxAllowedMargin,
    notes: `($${finalNetProfit} / $${mrr}) × 100 = ${finalNetMarginPercent}% (healthy: ${benchmarks.net_margin_min}-${benchmarks.net_margin_max}%)`
  });

  const grossProfit = mrr - cogs;
  const grossMarginPercent = mrr > 0 ? Math.round((grossProfit / mrr) * 100) : 0;

  // ===== STEP 4: Calculate investment metrics =====

  const startupInvestment = rawInvestment;

  // RAMP-UP AWARE PAYBACK: Uses 6-month ramp schedule (30%→100% of revenue)
  // instead of assuming full Month 1 profit. This fixes the "1 month payback" template artifact.
  let paybackMonths = 0;
  let paybackResult: MonthsMetricResult | null = null;
  if (startupInvestment > 0) {
    if (finalNetProfit > 0) {
      // Simulate ramp-up cash flow to find true payback month
      const RAMP = [0.30, 0.45, 0.60, 0.75, 0.90, 1.00];
      const fixedCostPortion = finalTotalExpenses * 0.6;
      const variableCostPortion = finalTotalExpenses * 0.4;
      let cumulative = 0;
      let foundPayback = false;
      const monthlyFcf: number[] = [];

      for (let m = 1; m <= 60; m++) {
        let monthRevenue: number;
        let monthCosts: number;

        if (m <= RAMP.length) {
          monthRevenue = mrr * RAMP[m - 1];
          monthCosts = fixedCostPortion + variableCostPortion * RAMP[m - 1];
        } else {
          const growth = Math.pow(1.05, m - RAMP.length);
          monthRevenue = mrr * growth;
          monthCosts = finalTotalExpenses * Math.pow(1.025, m - RAMP.length);
        }

        const fcf = monthRevenue - monthCosts;
        monthlyFcf.push(fcf);
        cumulative += fcf;
        if (cumulative >= startupInvestment) {
          paybackMonths = m;
          foundPayback = true;
          break;
        }
      }

      if (!foundPayback) paybackMonths = 999;

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
          log.warn(
            `⚠️ Payback engine drift: ramp loop=${legacyMonths ?? "NOT_ACHIEVED"}, typed calculator=${typedMonths ?? paybackResult.reasonCode}`,
          );
        }
      } catch (paybackContractErr) {
        log.warn(`Payback contract cross-check failed (non-fatal): ${String(paybackContractErr)}`);
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
      ? 'Business is unprofitable - payback impossible'
      : `With 6-month ramp-up: payback at month ${paybackMonths} (steady-state would be ${Math.ceil(startupInvestment / finalNetProfit)} months)`
  });

  // ROI also uses ramp-adjusted Year 1 profit (not 12 × steady-state)
  let roiYear1Percent = 0;
  if (startupInvestment > 0) {
    // Calculate actual Year 1 profit with ramp
    const RAMP = [0.30, 0.45, 0.60, 0.75, 0.90, 1.00];
    const fixedP = finalTotalExpenses * 0.6;
    const varP = finalTotalExpenses * 0.4;
    let year1Profit = 0;
    for (let m = 1; m <= 12; m++) {
      if (m <= RAMP.length) {
        year1Profit += mrr * RAMP[m - 1] - (fixedP + varP * RAMP[m - 1]);
      } else {
        const g = Math.pow(1.05, m - RAMP.length);
        year1Profit += mrr * g - finalTotalExpenses * Math.pow(1.025, m - RAMP.length);
      }
    }
    roiYear1Percent = Math.round((year1Profit / startupInvestment) * 100);
  }

  audit.push({
    formula: 'ROI = (Profit × 12 / Investment) × 100%',
    inputs: { 'Profit/mo': finalNetProfit, 'Investment': startupInvestment },
    result: roiYear1Percent,
    isValid: roiYear1Percent > 0,
    notes: `($${finalNetProfit} × 12 / $${startupInvestment}) × 100 = ${roiYear1Percent}%`
  });

  // BUG FIX (Phase 2): True DCF NPV — not cumulative profit.
  // NPV = –Investment + Σ(month 1→36) [ NetProfit / (1 + monthly_rate)^month ]
  // Using 10% annual WACC (standard small business cost of capital).
  const ANNUAL_WACC = 0.10;
  const monthlyDiscountRate = Math.pow(1 + ANNUAL_WACC, 1 / 12) - 1;
  let npvAccum = -startupInvestment;
  for (let m = 1; m <= 36; m++) {
    npvAccum += finalNetProfit / Math.pow(1 + monthlyDiscountRate, m);
  }
  const npv3Years = Math.round(npvAccum);

  audit.push({
    formula: 'NPV_3yr = -Investment + Σ(month 1→36) [NetProfit / (1 + Monthly_Rate)^month]',
    inputs: { 'Monthly Profit': finalNetProfit, 'Investment': startupInvestment, 'Annual WACC %': ANNUAL_WACC * 100, 'Monthly Rate %': Math.round(monthlyDiscountRate * 10000) / 100 },
    result: npv3Years,
    isValid: npv3Years > 0,
    notes: `DCF at 10% WACC: -$${startupInvestment} + 36mo discounted cash flows = $${npv3Years.toLocaleString()}`
  });

  // BUG FIX: Guard against division-by-zero when mrr=0 in break-even formula.
  const effectiveMrrForBreakeven = Math.max(mrr, benchmarks.average_check_min || 100);
  const variableCostRatio = (benchmarks.cogs_percent / 100) + (marketing / effectiveMrrForBreakeven);
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
      marketing,
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
    paybackMonths,
    paybackResult,
    roiYear1Percent,
    npv3Years,
    breakEvenRevenue,
    revenueFor45kProfit,
    isProfitable: finalNetProfit > 0,
    corrections,
    audit,
    industryDetected: benchmarks.name
  };
}
