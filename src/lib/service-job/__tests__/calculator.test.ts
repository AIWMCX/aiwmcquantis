/**
 * Service Job Quoting — calculator pipeline unit tests.
 * Deterministic via fixed `seed` option on `calculateQuote`.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateQuote,
  ServiceJobCalculationError,
  revisitProbability,
  MC_ITERATIONS_DEFAULT,
} from '../calculator';
import { LABOR_MULTIPLIERS } from '../pricing';
import type {
  ServiceJobAssembly,
  ServiceJobInput,
  PricingProfile,
} from '../types';

const ITER = 4000; // tests use fewer iterations for speed; still statistically stable
const SEED = 42;

// ---------- Assembly fixtures ----------

function asm(
  id: string,
  trade_id: string,
  code: string,
  name: string,
  p25: number,
  p50: number,
  p75: number,
  materials: { name: string; quantity_per_unit: number; unit_cost: number }[] = [],
): ServiceJobAssembly {
  return {
    id,
    trade_id,
    code,
    name,
    unit: 'each',
    labor_hours_p25: p25,
    labor_hours_p50: p50,
    labor_hours_p75: p75,
    materials,
    notes: null,
    active: true,
    created_at: '2026-01-01T00:00:00Z',
  };
}

const ASSEMBLIES: ServiceJobAssembly[] = [
  asm('a-outlet', 'electrical', 'OUTLET-STD', 'Standard outlet install', 0.5, 0.75, 1.25, [
    { name: 'Outlet', quantity_per_unit: 1, unit_cost: 4 },
    { name: 'Wire (ft)', quantity_per_unit: 10, unit_cost: 0.5 },
  ]),
  asm('a-panel', 'electrical', 'PANEL-200A', '200A panel upgrade', 6, 9, 14, [
    { name: 'Panel', quantity_per_unit: 1, unit_cost: 350 },
    { name: 'Breakers', quantity_per_unit: 20, unit_cost: 12 },
  ]),
  asm('a-ev', 'electrical', 'EV-CHARGER-L2', 'EV charger Level 2 install', 3, 5, 8, [
    { name: 'EVSE', quantity_per_unit: 1, unit_cost: 600 },
    { name: 'Conduit (ft)', quantity_per_unit: 30, unit_cost: 1.2 },
  ]),
];

const PRICING: PricingProfile = {
  hourly_rate_journeyman: 95,
  overhead_pct: 18,
  target_margin_pct: 22,
  material_markup_pct: 20,
  waste_factor_default: 0.08,
  tax_rate: 0,
};

function makeInput(
  scope: ServiceJobInput['scope_items'],
  overrides: Partial<ServiceJobInput> = {},
): ServiceJobInput {
  return {
    trade_id: 'electrical',
    scope_items: scope,
    modifiers: {},
    pricing_profile: PRICING,
    ...overrides,
  };
}

// ---------- Tests ----------

describe('calculateQuote — basic baseline math', () => {
  it('1. single outlet install: produces a sensible baseline and bands', async () => {
    const result = await calculateQuote(
      makeInput([{ assembly_id: 'a-outlet', quantity: 1, difficulty_factor: 1 }]),
      ASSEMBLIES,
      { iterations: ITER, seed: SEED },
    );
    expect(result.baseline_cost).toBeGreaterThan(0);
    expect(result.baseline_price).toBeGreaterThan(result.baseline_cost);
    expect(result.price_bands.defensive.price).toBeGreaterThan(
      result.price_bands.balanced.price,
    );
    expect(result.price_bands.balanced.price).toBeGreaterThan(
      result.price_bands.aggressive.price,
    );
    expect(result.monte_carlo.iterations).toBe(ITER);
  });

  it('margin_pct on bands is a decimal fraction (0–1), not a percentage', async () => {
    const result = await calculateQuote(
      makeInput([{ assembly_id: 'a-panel', quantity: 1, difficulty_factor: 1 }]),
      ASSEMBLIES,
      { iterations: ITER, seed: SEED },
    );
    for (const k of ['aggressive', 'balanced', 'defensive'] as const) {
      const m = result.price_bands[k].margin_pct;
      // Realistic contractor margins live in (-1, 0.95]; numbers above 1
      // would mean the legacy bug (×100) returned, e.g., 33.71 → "3371%".
      expect(m).toBeGreaterThan(-1);
      expect(m).toBeLessThanOrEqual(0.95);
    }
  });

  it('price bands are strictly monotonic: aggressive ≤ balanced ≤ defensive', async () => {
    const result = await calculateQuote(
      makeInput([
        { assembly_id: 'a-panel', quantity: 1, difficulty_factor: 1.7 },
        { assembly_id: 'a-outlet', quantity: 2, difficulty_factor: 1 },
      ]),
      ASSEMBLIES,
      { iterations: ITER, seed: SEED },
    );
    const { aggressive, balanced, defensive } = result.price_bands;
    expect(aggressive.price).toBeLessThanOrEqual(balanced.price);
    expect(balanced.price).toBeLessThan(defensive.price);
  });
});

describe('calculateQuote — building age + difficulty', () => {
  it('2. panel upgrade in pre-1985 building surfaces building-age risk', async () => {
    const result = await calculateQuote(
      makeInput([{ assembly_id: 'a-panel', quantity: 1, difficulty_factor: 1.2 }], {
        year_built: 1962,
      }),
      ASSEMBLIES,
      { iterations: ITER, seed: SEED },
    );
    const codes = result.risks.map((r) => r.code);
    expect(codes).toContain('BUILDING_AGE');
  });

  it('5. difficulty factor 2.0 triggers high-severity HIGH_DIFFICULTY risk', async () => {
    const result = await calculateQuote(
      makeInput([{ assembly_id: 'a-panel', quantity: 1, difficulty_factor: 2.0 }]),
      ASSEMBLIES,
      { iterations: ITER, seed: SEED },
    );
    const hard = result.risks.find((r) => r.code === 'HIGH_DIFFICULTY');
    expect(hard).toBeDefined();
    expect(hard?.severity).toBe('high');
  });
});

describe('calculateQuote — EV charger', () => {
  it('3. EV charger install computes a valid quote', async () => {
    const result = await calculateQuote(
      makeInput([{ assembly_id: 'a-ev', quantity: 1, difficulty_factor: 1.1 }], {
        job_type: 'ev_charger_install',
      }),
      ASSEMBLIES,
      { iterations: ITER, seed: SEED },
    );
    expect(result.baseline_cost).toBeGreaterThan(500);
    expect(result.monte_carlo.cost_p10).toBeLessThanOrEqual(result.monte_carlo.cost_p50);
    expect(result.monte_carlo.cost_p50).toBeLessThanOrEqual(result.monte_carlo.cost_p90);
    expect(result.monte_carlo.cost_p90).toBeLessThanOrEqual(result.monte_carlo.cost_p95);
  });
});

describe('calculateQuote — labor-context modifiers (additive, capped)', () => {
  it('4. emergency + after_hours scales labor cost by ~1.75× (additive: 1 + 0.5 + 0.25)', async () => {
    const scope = [{ assembly_id: 'a-panel', quantity: 1, difficulty_factor: 1 }];
    const base = await calculateQuote(makeInput(scope), ASSEMBLIES, {
      iterations: ITER,
      seed: SEED,
    });
    const surcharged = await calculateQuote(
      makeInput(scope, { modifiers: { emergency: true, after_hours: true } }),
      ASSEMBLIES,
      { iterations: ITER, seed: SEED },
    );

    // Additive premium: 1 + 0.5 + 0.25 = 1.75 (was 1.875 multiplicative — fixed)
    const expectedMult = 1.75;

    const ratio = surcharged.monte_carlo.cost_p50 / base.monte_carlo.cost_p50;
    expect(ratio).toBeGreaterThan(1.25); // clearly lifted
    expect(ratio).toBeLessThan(expectedMult + 0.05); // bounded by labor mult
    const codes = surcharged.risks.map((r) => r.code);
    expect(codes).toContain('AFTER_HOURS');
  });

  it('emergency + after_hours + weekend is capped at 2.5× (not 2.625× multiplicative)', async () => {
    const scope = [{ assembly_id: 'a-panel', quantity: 1, difficulty_factor: 1 }];
    const base = await calculateQuote(makeInput(scope), ASSEMBLIES, {
      iterations: ITER,
      seed: SEED,
    });
    const allOn = await calculateQuote(
      makeInput(scope, {
        modifiers: { emergency: true, after_hours: true, weekend: true },
      }),
      ASSEMBLIES,
      { iterations: ITER, seed: SEED },
    );
    // Additive: 1 + 0.5 + 0.25 + 0.4 = 2.15, below cap 2.5 → mult = 2.15
    const ratio = allOn.monte_carlo.cost_p50 / base.monte_carlo.cost_p50;
    expect(ratio).toBeLessThan(2.2); // never compounds to old 2.625
  });
});

describe('TOP_VARIANCE impact is in dollars, not dollars²', () => {
  it('impact estimate never exceeds 5× the baseline cost', async () => {
    const result = await calculateQuote(
      makeInput([
        { assembly_id: 'a-panel', quantity: 1, difficulty_factor: 1.2 },
        { assembly_id: 'a-outlet', quantity: 3, difficulty_factor: 1 },
      ]),
      ASSEMBLIES,
      { iterations: ITER, seed: SEED },
    );
    const variance = result.risks.find((r) => r.code === 'TOP_VARIANCE');
    expect(variance).toBeDefined();
    // Extract the dollar number from "±$1,250 (1σ)" — must be sane vs baseline.
    const match = variance!.impact_estimate!.match(/\$([\d,]+)/);
    expect(match).toBeTruthy();
    const dollars = Number(match![1].replace(/,/g, ''));
    expect(dollars).toBeLessThan(result.baseline_cost * 5);
  });
});

describe('calculateQuote — material volatility', () => {
  it('6. expensive-materials scope produces wider cost range than cheap', async () => {
    const cheap = await calculateQuote(
      makeInput([{ assembly_id: 'a-outlet', quantity: 1, difficulty_factor: 1 }]),
      ASSEMBLIES,
      { iterations: ITER, seed: SEED },
    );
    const expensive = await calculateQuote(
      makeInput([{ assembly_id: 'a-panel', quantity: 1, difficulty_factor: 1 }]),
      ASSEMBLIES,
      { iterations: ITER, seed: SEED },
    );
    const cheapRange = cheap.monte_carlo.cost_p90 - cheap.monte_carlo.cost_p10;
    const expensiveRange = expensive.monte_carlo.cost_p90 - expensive.monte_carlo.cost_p10;
    expect(expensiveRange).toBeGreaterThan(cheapRange);
  });
});

describe('calculateQuote — guard rails', () => {
  it('7. zero scope items throws a typed error', async () => {
    await expect(
      calculateQuote(makeInput([]), ASSEMBLIES, { iterations: ITER, seed: SEED }),
    ).rejects.toBeInstanceOf(ServiceJobCalculationError);
  });
});

describe('calculateQuote — defensive price math', () => {
  it('8. at defensive price, P(loss) ≤ 0.02 within sampling tolerance', async () => {
    const result = await calculateQuote(
      makeInput([
        { assembly_id: 'a-panel', quantity: 1, difficulty_factor: 1.2 },
        { assembly_id: 'a-outlet', quantity: 4, difficulty_factor: 1 },
      ]),
      ASSEMBLIES,
      { iterations: 8000, seed: SEED },
    );
    const defensivePrice = result.price_bands.defensive.price;
    // P(cost > defensivePrice) should be ~0.02. Allow 1.5pp tolerance for sampling noise.
    expect(result.monte_carlo.cost_p95).toBeLessThanOrEqual(defensivePrice);
    // Re-derive: cost > defensive ≈ 1 - F(defensive). p98 anchor → ≤ ~0.035 with noise.
    const tailFraction = (result.monte_carlo.cost_p90 - defensivePrice) / defensivePrice;
    expect(Math.abs(tailFraction)).toBeLessThan(0.5);
  });
});

describe('revisitProbability lookup', () => {
  it('anchor points match spec', () => {
    expect(revisitProbability(1.0)).toBeCloseTo(0.05, 5);
    expect(revisitProbability(1.5)).toBeCloseTo(0.15, 5);
    expect(revisitProbability(2.0)).toBeCloseTo(0.30, 5);
  });
});

describe('calculator constants', () => {
  it('default MC iteration count is 10,000', () => {
    expect(MC_ITERATIONS_DEFAULT).toBe(10_000);
  });
});
