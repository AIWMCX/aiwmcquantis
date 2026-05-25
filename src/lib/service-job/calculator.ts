/**
 * Service Job Quoting — main calculation pipeline.
 *
 * Pure async function. Inputs are explicit (no DB / no globals).
 * Financial baseline + price derivation use QuantisMath. Per-iteration MC math
 * runs in raw numbers for throughput, then percentile outputs are rounded.
 *
 * Pipeline:
 *   1. Resolve scope → labor hours + material lines
 *   2. Deterministic baseline cost & price
 *   3. Apply labor-context multipliers (emergency/after_hours/weekend)
 *   4. Monte Carlo (10,000 iterations) — triangular labor, normal materials,
 *      Bernoulli revisit event
 *   5. Derive price bands (aggressive / balanced / defensive)
 *   6. Pre-mortem risk flags
 */

import { QuantisMath as QM } from '@/lib/quantis-math';
import type {
  ServiceJobInput,
  ServiceJobAssembly,
  QuoteResult,
  MonteCarloOutput,
} from './types';
import {
  laborContextMultiplier,
  overheadAmount,
  priceFromCost,
  marginAt,
  derivePriceBands,
  pct,
} from './pricing';
import { runMC, triangular, normal, bernoulli } from './monte-carlo';
import { generatePreMortemRisks } from './pre-mortem';

export const MC_ITERATIONS_DEFAULT = 10_000;
export const REVISIT_LABOR_HOURS = 2;
export const MATERIAL_PRICE_SIGMA_PCT = 0.12; // sigma = 12% of unit cost mean
/**
 * Performance budget for `calculateQuote`. 10,000 iterations × ~10 assemblies
 * should comfortably finish under this on commodity hardware. Exceeding it
 * emits a `console.warn` (non-throwing) for observability.
 */
export const PERF_BUDGET_MS = 250;

/**
 * Revisit-probability lookup. Linear interp between anchor points:
 *   df=1.0 → 0.05, df=1.5 → 0.15, df=2.0 → 0.30, df=3.0 → 0.50 (clamped)
 */
export function revisitProbability(df: number): number {
  if (!Number.isFinite(df) || df <= 1.0) return 0.05;
  if (df <= 1.5) return 0.05 + ((df - 1.0) / 0.5) * (0.15 - 0.05);
  if (df <= 2.0) return 0.15 + ((df - 1.5) / 0.5) * (0.30 - 0.15);
  if (df <= 3.0) return 0.30 + ((df - 2.0) / 1.0) * (0.50 - 0.30);
  return 0.5;
}

export class ServiceJobCalculationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ServiceJobCalculationError';
  }
}

interface ResolvedScope {
  scopeIndex: number;
  assembly: ServiceJobAssembly;
  quantity: number;
  difficulty: number;
  // Effective labor hours per quantity unit
  laborP25: number;
  laborP50: number;
  laborP75: number;
  // Aggregated material lines for this scope item (qty already × quantity)
  materials: { quantity: number; unit_cost: number }[];
}

function resolveScope(
  input: ServiceJobInput,
  assemblies: ServiceJobAssembly[],
): ResolvedScope[] {
  const byId = new Map(assemblies.map((a) => [a.id, a]));
  const resolved: ResolvedScope[] = [];
  for (let i = 0; i < input.scope_items.length; i++) {
    const s = input.scope_items[i];
    const asm = byId.get(s.assembly_id);
    if (!asm) {
      throw new ServiceJobCalculationError(
        `Assembly not found for scope item ${i} (id=${s.assembly_id})`,
        'ASSEMBLY_NOT_FOUND',
      );
    }
    const df = s.difficulty_factor > 0 ? s.difficulty_factor : 1;
    const qty = s.quantity > 0 ? s.quantity : 0;
    resolved.push({
      scopeIndex: i,
      assembly: asm,
      quantity: qty,
      difficulty: df,
      laborP25: asm.labor_hours_p25 * df,
      laborP50: asm.labor_hours_p50 * df,
      laborP75: asm.labor_hours_p75 * df,
      materials: (asm.materials ?? []).map((m) => ({
        quantity: m.quantity_per_unit * qty,
        unit_cost: m.unit_cost,
      })),
    });
  }
  return resolved;
}

export async function calculateQuote(
  input: ServiceJobInput,
  assemblies: ServiceJobAssembly[],
  options: { iterations?: number; seed?: number } = {},
): Promise<QuoteResult> {
  const _perfStart = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (!input || !Array.isArray(input.scope_items) || input.scope_items.length === 0) {
    throw new ServiceJobCalculationError(
      'Quote requires at least one scope item.',
      'EMPTY_SCOPE',
    );
  }

  const resolved = resolveScope(input, assemblies);
  const pricing = input.pricing_profile;
  if (!pricing || !(pricing.hourly_rate_journeyman > 0)) {
    throw new ServiceJobCalculationError(
      'Pricing profile is missing a valid hourly rate.',
      'INVALID_PRICING',
    );
  }

  const laborMult = laborContextMultiplier(input.modifiers);
  const waste = pricing.waste_factor_default; // already decimal in spec
  const markup = pct(pricing.material_markup_pct);
  const permitFee =
    typeof input.modifiers.permit_fee === 'number' ? input.modifiers.permit_fee : 0;

  // ----- Step 2 + 3: Deterministic baseline (uses QuantisMath) -----
  let baselineLaborHours = 0;
  for (const r of resolved) {
    // qty × labor_hours_p50 × difficulty (difficulty already folded into laborP50)
    baselineLaborHours = QM.toNumber(
      QM.add(baselineLaborHours, QM.multiply(r.quantity, r.laborP50)),
      6,
    );
  }
  const effectiveLaborHours = QM.toNumber(
    QM.multiply(baselineLaborHours, laborMult),
    6,
  );
  const laborCost = QM.toNumber(
    QM.multiply(effectiveLaborHours, pricing.hourly_rate_journeyman),
    2,
  );

  let materialsRaw = 0;
  for (const r of resolved) {
    for (const m of r.materials) {
      const lineMean = QM.toNumber(
        QM.multiply(QM.multiply(m.quantity, m.unit_cost), 1 + waste),
        6,
      );
      materialsRaw = QM.toNumber(QM.add(materialsRaw, lineMean), 6);
    }
  }
  const materialsCost = QM.toNumber(QM.multiply(materialsRaw, 1 + markup), 2);

  const subsAndFees = QM.toNumber(QM.from(permitFee), 2);
  const subtotal = QM.toNumber(
    QM.add(QM.add(laborCost, materialsCost), subsAndFees),
    2,
  );
  const overhead = overheadAmount(subtotal, pricing.overhead_pct);
  const baselineCost = QM.toNumber(QM.add(subtotal, overhead), 2);
  const baselinePrice = priceFromCost(baselineCost, pricing.target_margin_pct);

  // ----- Step 4: Monte Carlo -----
  const iterations = options.iterations ?? MC_ITERATIONS_DEFAULT;
  const hourly = pricing.hourly_rate_journeyman;
  const overheadPctDec = pct(pricing.overhead_pct);
  const wasteFactor = 1 + waste;
  const markupFactor = 1 + markup;
  const targetMargin = pct(pricing.target_margin_pct);

  // Per-iteration scope realized labor cost — kept for variance attribution.
  const scopeLaborCostSamples: number[][] = resolved.map(() => new Array(iterations));

  // Wrap sampler to record per-scope labor cost per iteration for variance ranking.
  let iterCounter = 0;
  const samplerWithAttribution = (rand: () => number): number => {
    let totalLaborHours = 0;
    let totalMaterials = 0;
    const perItemLaborCost: number[] = new Array(resolved.length);

    for (let k = 0; k < resolved.length; k++) {
      const r = resolved[k];
      const sampledPerUnit = triangular(rand, r.laborP25, r.laborP50, r.laborP75);
      let itemHours = sampledPerUnit * r.quantity;
      const p = revisitProbability(r.difficulty);
      if (bernoulli(rand, p) === 1) itemHours += REVISIT_LABOR_HOURS;
      const itemLaborCost = itemHours * laborMult * hourly;
      perItemLaborCost[k] = itemLaborCost;
      totalLaborHours += itemHours;

      for (const m of r.materials) {
        const sigma = Math.max(0, m.unit_cost * MATERIAL_PRICE_SIGMA_PCT);
        let unit = normal(rand, m.unit_cost, sigma);
        if (unit < 0) unit = 0;
        totalMaterials += unit * m.quantity * wasteFactor;
      }
    }

    const labor = totalLaborHours * laborMult * hourly;
    const mats = totalMaterials * markupFactor;
    const sub = labor + mats + subsAndFees;
    const realized = sub * (1 + overheadPctDec);

    for (let k = 0; k < resolved.length; k++) {
      scopeLaborCostSamples[k][iterCounter] = perItemLaborCost[k];
    }
    iterCounter++;
    return realized;
  };

  const mc = runMC(samplerWithAttribution, iterations, { seed: options.seed });

  // Yield once after the MC loop to keep parity with existing engine ergonomics.
  await Promise.resolve();

  const costPercentile = (p: number) => mc.percentile(p);
  const cost_p10 = round2(costPercentile(10));
  const cost_p50 = round2(costPercentile(50));
  const cost_p90 = round2(costPercentile(90));
  const cost_p95 = round2(costPercentile(95));
  const lossProbAtBaseline = round4(1 - mc.probabilityBelow(baselinePrice));
  const marginThresholdCost = baselinePrice * (1 - targetMargin);
  const probMarginBelowTarget = round4(1 - mc.probabilityBelow(marginThresholdCost));

  const margin_p10 = round2(marginAt(baselinePrice, costPercentile(90)) * 100);
  const margin_p50 = round2(marginAt(baselinePrice, costPercentile(50)) * 100);
  const margin_p90 = round2(marginAt(baselinePrice, costPercentile(10)) * 100);

  const monteCarlo: MonteCarloOutput = {
    iterations: mc.iterations,
    cost_p10,
    cost_p50,
    cost_p90,
    cost_p95,
    margin_p10,
    margin_p50,
    margin_p90,
    loss_probability: lossProbAtBaseline,
    prob_margin_below_target: probMarginBelowTarget,
  };

  // ----- Step 5: Price bands -----
  const priceBands = derivePriceBands(
    baselineCost,
    pricing,
    costPercentile,
    (price) => round4(mc.probabilityBelow(price)),
  );

  // ----- Step 6: Pre-mortem -----
  const varianceByScopeIndex = scopeLaborCostSamples.map((arr) => sampleVariance(arr));
  const risks = generatePreMortemRisks({
    input,
    assemblies,
    varianceByScopeIndex,
  });

  const _perfEnd = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const duration_ms = _perfEnd - _perfStart;
  // Performance budget: 10k iterations × 10-assembly job should finish under
  // PERF_BUDGET_MS on standard hardware. Warn on regression but never throw.
  if (duration_ms > PERF_BUDGET_MS && typeof console !== 'undefined') {
    console.warn(
      `[service-job] calculateQuote exceeded perf budget: ${duration_ms.toFixed(0)}ms ` +
      `> ${PERF_BUDGET_MS}ms (iterations=${options.iterations ?? MC_ITERATIONS_DEFAULT}, ` +
      `scope_items=${input.scope_items.length})`,
    );
  }

  return {
    baseline_cost: baselineCost,
    baseline_price: baselinePrice,
    price_bands: priceBands,
    monte_carlo: monteCarlo,
    risks,
    computed_at: new Date().toISOString(),
    /** Wall-clock duration of this calculation, in milliseconds. */
    duration_ms,
  } as QuoteResult & { duration_ms: number };
}

// ---------- helpers ----------

function round2(v: number): number {
  return QM.toNumber(QM.from(v), 2);
}
function round4(v: number): number {
  return QM.toNumber(QM.from(v), 4);
}

function sampleVariance(arr: number[]): number {
  if (arr.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  const mean = sum / arr.length;
  let sq = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - mean;
    sq += d * d;
  }
  return sq / (arr.length - 1);
}
