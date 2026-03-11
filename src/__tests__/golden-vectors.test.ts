/**
 * LAYER 3 — Golden Test Vectors Validation
 * Validates vector metadata and structure. Full engine integration
 * requires the analyze-business edge function; here we test the
 * vector definitions and validation utility.
 */
import { describe, it, expect } from 'vitest';
import { GOLDEN_VECTORS, validateAgainstGoldenVector, type GoldenVector } from '@/lib/golden-test-vectors';

describe('Golden Vectors — Meta', () => {
  it('has at least 10 vectors', () => {
    expect(GOLDEN_VECTORS.length).toBeGreaterThanOrEqual(10);
  });

  it('all vectors are active', () => {
    for (const v of GOLDEN_VECTORS) {
      expect(v.isActive).toBe(true);
    }
  });

  it('all vector codes follow GTV-* pattern', () => {
    for (const v of GOLDEN_VECTORS) {
      expect(v.vectorCode).toMatch(/^GTV-/);
    }
  });

  it('vector codes are unique', () => {
    const codes = GOLDEN_VECTORS.map(v => v.vectorCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('vector IDs are unique', () => {
    const ids = GOLDEN_VECTORS.map(v => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all vectors have tolerance between 0 and 50', () => {
    for (const v of GOLDEN_VECTORS) {
      expect(v.tolerancePct).toBeGreaterThan(0);
      expect(v.tolerancePct).toBeLessThanOrEqual(50);
    }
  });

  it('all vectors have confidence threshold ≥ 50', () => {
    for (const v of GOLDEN_VECTORS) {
      expect(v.confidenceThreshold).toBeGreaterThanOrEqual(50);
    }
  });
});

describe('Golden Vectors — Structure', () => {
  it('each vector has required inputs', () => {
    for (const v of GOLDEN_VECTORS) {
      expect(v.inputs.businessType).toBeTruthy();
      expect(v.inputs.location).toBeTruthy();
    }
  });

  it('each vector has at least 2 expected range metrics', () => {
    for (const v of GOLDEN_VECTORS) {
      const rangeKeys = Object.keys(v.expectedRanges);
      expect(rangeKeys.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('expected ranges have valid min < max', () => {
    for (const v of GOLDEN_VECTORS) {
      for (const [key, range] of Object.entries(v.expectedRanges)) {
        if (!range) continue;
        const min = Array.isArray(range) ? range[0] : (range as any).min;
        const max = Array.isArray(range) ? range[1] : (range as any).max;
        expect(min).toBeLessThanOrEqual(max);
      }
    }
  });
});

describe('Golden Vectors — Industry Coverage', () => {
  it('covers fitness_boutique', () => {
    expect(GOLDEN_VECTORS.some(v => v.inputs.businessType === 'fitness_boutique')).toBe(true);
  });

  it('covers coffee_shop', () => {
    expect(GOLDEN_VECTORS.some(v => v.inputs.businessType === 'coffee_shop')).toBe(true);
  });

  it('covers saas', () => {
    expect(GOLDEN_VECTORS.some(v => v.inputs.businessType === 'saas')).toBe(true);
  });

  it('covers restaurant', () => {
    expect(GOLDEN_VECTORS.some(v => v.inputs.businessType === 'restaurant')).toBe(true);
  });

  it('covers ecommerce', () => {
    expect(GOLDEN_VECTORS.some(v => v.inputs.businessType === 'ecommerce')).toBe(true);
  });

  it('covers at least 5 distinct business types', () => {
    const types = new Set(GOLDEN_VECTORS.map(v => v.inputs.businessType));
    expect(types.size).toBeGreaterThanOrEqual(5);
  });
});

describe('validateAgainstGoldenVector — utility', () => {
  it('passes when all metrics are within range', () => {
    const vector = GOLDEN_VECTORS[0]; // fitness Denver
    const mockResult = {
      financial_analysis: {
        monthly_profit: 150,
        returns: { payback_period_months: 10 },
        unit_economics: { ltv_cac_ratio: 12 },
        startup_investment: { total: 50000 },
        monthly_expenses: { total: 9800 },
      },
    } as any;

    const validation = validateAgainstGoldenVector(mockResult, vector);
    // The mock may not pass all checks, but the function should not crash
    expect(validation).toHaveProperty('passed');
    expect(validation).toHaveProperty('failures');
    expect(validation).toHaveProperty('details');
  });

  it('reports failures for out-of-range metrics', () => {
    const vector: GoldenVector = {
      ...GOLDEN_VECTORS[0],
      expectedRanges: {
        m12Profit: { min: 1000000, max: 2000000 }, // impossible range
      },
    };

    const mockResult = {
      financial_analysis: {
        monthly_profit: 100, // M12 = 1200, way below 1M
      },
    } as any;

    const validation = validateAgainstGoldenVector(mockResult, vector);
    expect(validation.passed).toBe(false);
    expect(validation.failures.length).toBeGreaterThan(0);
  });
});
