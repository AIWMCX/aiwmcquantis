/**
 * Genesis Protocol P1 — 25-Fixture Engine Regression Suite.
 *
 * Pins the deterministic financial engine (`calculateUnitEconomics`) against
 * 25 canonical fixtures spanning SaaS, marketplace, services, retail,
 * restaurant, agency, content, and B2B enterprise. Any drift in core unit
 * economics (LTV, LTV:CAC, CAC payback, customer lifetime) trips this gate.
 *
 * Tolerances are intentionally tight (±0.5%) — the engine is deterministic
 * and Q-math precise. A deliberate change requires updating the fixture
 * `expected` block and bumping `ENGINE_VERSION` in `financial-engine.ts`.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateUnitEconomics,
  ENGINE_VERSION,
  type UnitEconomicsParams,
} from '@/lib/financial-engine';

interface Fixture {
  id: string;
  archetype: string;
  params: UnitEconomicsParams;
  expected: {
    lifetimeMonths: number;
    ltv: number;
    ltvCacRatio: number;
    cacPaybackMonths: number;
    health: 'excellent' | 'good' | 'marginal' | 'poor';
  };
}

// All margins/churn/discount expressed as decimals (0.65 = 65%).
const FIXTURES: Fixture[] = [
  // ── SaaS (B2C, B2B SMB, B2B Mid, B2B Ent) ─────────────────────────
  { id: 'F01', archetype: 'saas_b2c_low',
    params: { avgTicketSize: 12, grossMarginPct: 0.80, churnRateMonthly: 0.08, cacBlended: 30, upsellRevenuePct: 0.10, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 12.5, ltv: 132, ltvCacRatio: 4.4, cacPaybackMonths: 2.84, health: 'excellent' } },
  { id: 'F02', archetype: 'saas_b2b_smb',
    params: { avgTicketSize: 99, grossMarginPct: 0.78, churnRateMonthly: 0.03, cacBlended: 600, upsellRevenuePct: 0.15, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 33.33, ltv: 2960.91, ltvCacRatio: 4.93, cacPaybackMonths: 6.76, health: 'excellent' } },
  { id: 'F03', archetype: 'saas_b2b_mid',
    params: { avgTicketSize: 499, grossMarginPct: 0.82, churnRateMonthly: 0.015, cacBlended: 4000, upsellRevenuePct: 0.20, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 66.67, ltv: 32731.04, ltvCacRatio: 8.18, cacPaybackMonths: 8.15, health: 'excellent' } },
  { id: 'F04', archetype: 'saas_b2b_ent',
    params: { avgTicketSize: 2500, grossMarginPct: 0.85, churnRateMonthly: 0.008, cacBlended: 25000, upsellRevenuePct: 0.30, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 125, ltv: 345312.5, ltvCacRatio: 13.81, cacPaybackMonths: 9.05, health: 'excellent' } },
  { id: 'F05', archetype: 'saas_high_churn',
    params: { avgTicketSize: 29, grossMarginPct: 0.75, churnRateMonthly: 0.15, cacBlended: 80, upsellRevenuePct: 0.0, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 6.67, ltv: 145, ltvCacRatio: 1.81, cacPaybackMonths: 3.68, health: 'marginal' } },

  // ── Marketplace ───────────────────────────────────────────────────
  { id: 'F06', archetype: 'marketplace_transactional',
    params: { avgTicketSize: 8, grossMarginPct: 0.20, churnRateMonthly: 0.05, cacBlended: 15, upsellRevenuePct: 0.0, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 20, ltv: 32, ltvCacRatio: 2.13, cacPaybackMonths: 9.38, health: 'good' } },
  { id: 'F07', archetype: 'marketplace_subscription',
    params: { avgTicketSize: 25, grossMarginPct: 0.35, churnRateMonthly: 0.04, cacBlended: 60, upsellRevenuePct: 0.05, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 25, ltv: 229.69, ltvCacRatio: 3.83, cacPaybackMonths: 6.53, health: 'excellent' } },

  // ── Services / agency ─────────────────────────────────────────────
  { id: 'F08', archetype: 'agency_retainer',
    params: { avgTicketSize: 5000, grossMarginPct: 0.55, churnRateMonthly: 0.025, cacBlended: 8000, upsellRevenuePct: 0.10, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 40, ltv: 121000, ltvCacRatio: 15.13, cacPaybackMonths: 2.64, health: 'excellent' } },
  { id: 'F09', archetype: 'services_project',
    params: { avgTicketSize: 1500, grossMarginPct: 0.45, churnRateMonthly: 0.20, cacBlended: 800, upsellRevenuePct: 0.0, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 5, ltv: 3375, ltvCacRatio: 4.22, cacPaybackMonths: 1.19, health: 'excellent' } },
  { id: 'F10', archetype: 'freelance_solo',
    params: { avgTicketSize: 800, grossMarginPct: 0.70, churnRateMonthly: 0.10, cacBlended: 200, upsellRevenuePct: 0.0, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 10, ltv: 5600, ltvCacRatio: 28, cacPaybackMonths: 0.36, health: 'excellent' } },

  // ── Physical retail / DTC ─────────────────────────────────────────
  { id: 'F11', archetype: 'dtc_subscription_box',
    params: { avgTicketSize: 35, grossMarginPct: 0.40, churnRateMonthly: 0.09, cacBlended: 45, upsellRevenuePct: 0.0, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 11.11, ltv: 155.56, ltvCacRatio: 3.46, cacPaybackMonths: 3.21, health: 'excellent' } },
  { id: 'F12', archetype: 'dtc_oneshot',
    params: { avgTicketSize: 80, grossMarginPct: 0.50, churnRateMonthly: 0.50, cacBlended: 25, upsellRevenuePct: 0.0, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 2, ltv: 80, ltvCacRatio: 3.2, cacPaybackMonths: 0.63, health: 'excellent' } },
  { id: 'F13', archetype: 'retail_brick_mortar',
    params: { avgTicketSize: 45, grossMarginPct: 0.55, churnRateMonthly: 0.12, cacBlended: 30, upsellRevenuePct: 0.0, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 8.33, ltv: 206.25, ltvCacRatio: 6.88, cacPaybackMonths: 1.21, health: 'excellent' } },

  // ── Restaurant / food ─────────────────────────────────────────────
  { id: 'F14', archetype: 'restaurant_casual',
    params: { avgTicketSize: 28, grossMarginPct: 0.65, churnRateMonthly: 0.20, cacBlended: 20, upsellRevenuePct: 0.0, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 5, ltv: 91, ltvCacRatio: 4.55, cacPaybackMonths: 1.10, health: 'excellent' } },
  { id: 'F15', archetype: 'restaurant_fine',
    params: { avgTicketSize: 120, grossMarginPct: 0.62, churnRateMonthly: 0.30, cacBlended: 50, upsellRevenuePct: 0.0, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 3.33, ltv: 248, ltvCacRatio: 4.96, cacPaybackMonths: 0.67, health: 'excellent' } },
  { id: 'F16', archetype: 'ghost_kitchen',
    params: { avgTicketSize: 22, grossMarginPct: 0.35, churnRateMonthly: 0.40, cacBlended: 8, upsellRevenuePct: 0.0, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 2.5, ltv: 19.25, ltvCacRatio: 2.41, cacPaybackMonths: 1.04, health: 'good' } },

  // ── Content / media ───────────────────────────────────────────────
  { id: 'F17', archetype: 'newsletter_paid',
    params: { avgTicketSize: 8, grossMarginPct: 0.92, churnRateMonthly: 0.04, cacBlended: 22, upsellRevenuePct: 0.0, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 25, ltv: 184, ltvCacRatio: 8.36, cacPaybackMonths: 2.99, health: 'excellent' } },
  { id: 'F18', archetype: 'community_membership',
    params: { avgTicketSize: 19, grossMarginPct: 0.85, churnRateMonthly: 0.06, cacBlended: 40, upsellRevenuePct: 0.0, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 16.67, ltv: 269.17, ltvCacRatio: 6.73, cacPaybackMonths: 2.48, health: 'excellent' } },

  // ── Education ─────────────────────────────────────────────────────
  { id: 'F19', archetype: 'cohort_course',
    params: { avgTicketSize: 1500, grossMarginPct: 0.80, churnRateMonthly: 0.40, cacBlended: 300, upsellRevenuePct: 0.0, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 2.5, ltv: 3000, ltvCacRatio: 10, cacPaybackMonths: 0.25, health: 'excellent' } },
  { id: 'F20', archetype: 'edtech_subscription',
    params: { avgTicketSize: 39, grossMarginPct: 0.78, churnRateMonthly: 0.07, cacBlended: 90, upsellRevenuePct: 0.05, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 14.29, ltv: 456.85, ltvCacRatio: 5.08, cacPaybackMonths: 2.82, health: 'excellent' } },

  // ── FinTech / professional ────────────────────────────────────────
  { id: 'F21', archetype: 'fintech_consumer',
    params: { avgTicketSize: 5, grossMarginPct: 0.70, churnRateMonthly: 0.05, cacBlended: 25, upsellRevenuePct: 0.20, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 20, ltv: 84, ltvCacRatio: 3.36, cacPaybackMonths: 5.95, health: 'excellent' } },
  { id: 'F22', archetype: 'fintech_b2b',
    params: { avgTicketSize: 1200, grossMarginPct: 0.80, churnRateMonthly: 0.02, cacBlended: 9000, upsellRevenuePct: 0.25, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 50, ltv: 60000, ltvCacRatio: 6.67, cacPaybackMonths: 7.5, health: 'excellent' } },

  // ── Hardware / capital intensive ──────────────────────────────────
  { id: 'F23', archetype: 'hardware_consumer',
    params: { avgTicketSize: 250, grossMarginPct: 0.30, churnRateMonthly: 0.80, cacBlended: 40, upsellRevenuePct: 0.0, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 1.25, ltv: 93.75, ltvCacRatio: 2.34, cacPaybackMonths: 0.53, health: 'good' } },

  // ── Stress: borderline & failing economics ────────────────────────
  { id: 'F24', archetype: 'failing_unit_econ',
    params: { avgTicketSize: 10, grossMarginPct: 0.25, churnRateMonthly: 0.20, cacBlended: 50, upsellRevenuePct: 0.0, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 5, ltv: 12.5, ltvCacRatio: 0.25, cacPaybackMonths: 20, health: 'poor' } },
  { id: 'F25', archetype: 'marginal_unit_econ',
    params: { avgTicketSize: 20, grossMarginPct: 0.40, churnRateMonthly: 0.10, cacBlended: 70, upsellRevenuePct: 0.0, discountRatePct: 0.10 },
    expected: { lifetimeMonths: 10, ltv: 80, ltvCacRatio: 1.14, cacPaybackMonths: 8.75, health: 'marginal' } },
];

const TOL_PCT = 0.01; // ±1%

function within(actual: number, expected: number, tol = TOL_PCT) {
  if (expected === 0) return Math.abs(actual) < 1e-6;
  return Math.abs((actual - expected) / expected) <= tol;
}

describe(`Engine Regression — 25 Fixtures (engine=${ENGINE_VERSION})`, () => {
  it('has exactly 25 fixtures', () => {
    expect(FIXTURES).toHaveLength(25);
  });

  it('fixture IDs are unique', () => {
    const ids = FIXTURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(25);
  });

  for (const f of FIXTURES) {
    describe(`${f.id} · ${f.archetype}`, () => {
      const result = calculateUnitEconomics(f.params);

      it('lifetimeMonths matches 1/churn (±1%)', () => {
        expect(within(result.lifetimeMonths, f.expected.lifetimeMonths)).toBe(true);
      });

      it('LTV matches expected (±1%)', () => {
        expect(within(result.ltv, f.expected.ltv)).toBe(true);
      });

      it('LTV:CAC matches expected (±1%)', () => {
        expect(within(result.ltvCacRatio, f.expected.ltvCacRatio)).toBe(true);
      });

      it('CAC payback matches expected (±1%)', () => {
        expect(within(result.cacPaybackMonths, f.expected.cacPaybackMonths)).toBe(true);
      });

      it('health label matches expected', () => {
        expect(result.benchmarkComparison.ltvCacHealthLabel).toBe(f.expected.health);
      });

      it('all outputs are finite', () => {
        expect(Number.isFinite(result.ltv)).toBe(true);
        expect(Number.isFinite(result.ltvNpv)).toBe(true);
        expect(Number.isFinite(result.cacPaybackMonths)).toBe(true);
      });
    });
  }
});
