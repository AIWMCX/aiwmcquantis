/**
 * Genesis Protocol P1 — R3 Validator regression suite.
 *
 * Locks behavior of the Schema → Reconcile → Reject pipeline so the bedrock
 * never regresses silently. Mirrors `_shared/r3-validator.ts` (edge).
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { r3Validate, defaultFinancialReconciler, type R3Result } from '@/lib/r3-validator';

const NarratorSchema = z.object({
  headline: z.string().min(1).max(160),
  body: z.string().min(1).max(2000),
  confidence: z.number().min(0).max(1),
});

const MetricsSchema = z.object({
  gross_margin_pct: z.number(),
  net_margin_pct: z.number(),
  ltv_cac: z.number(),
});

function assertFail<T>(r: R3Result<T>): Extract<R3Result<T>, { ok: false }> {
  if (r.ok) throw new Error('expected R3 failure but got success');
  return r as Extract<R3Result<T>, { ok: false }>;
}

describe('R3 Validator — Schema · Reconcile · Reject', () => {
  it('accepts clean JSON matching the schema', () => {
    const raw = JSON.stringify({
      headline: 'Solid unit economics',
      body: 'Margins above benchmark; CAC payback under 6 months.',
      confidence: 0.78,
    });
    const result = r3Validate(raw, NarratorSchema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.repaired).toBe(false);
      expect(result.data.confidence).toBeCloseTo(0.78);
    }
  });

  it('repairs JSON wrapped in markdown code fences', () => {
    const raw =
      '```json\n' +
      JSON.stringify({ headline: 'ok', body: 'body', confidence: 0.5 }) +
      '\n```';
    const result = r3Validate(raw, NarratorSchema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.repaired).toBe(true);
  });

  it('repairs leading prose before the first {', () => {
    const raw =
      'Here is your JSON: ' +
      JSON.stringify({ headline: 'h', body: 'b', confidence: 0.9 });
    const result = r3Validate(raw, NarratorSchema);
    expect(result.ok).toBe(true);
  });

  it('rejects empty body with reason="empty"', () => {
    const fail = assertFail(r3Validate('', NarratorSchema));
    expect(fail.reason).toBe('empty');
  });

  it('rejects unparseable garbage with reason="schema" after repair attempt', () => {
    const fail = assertFail(r3Validate('not json at all <<<', NarratorSchema));
    expect(fail.reason).toBe('schema');
    expect(fail.repair_attempted).toBe(true);
  });

  it('rejects schema mismatches (out of range confidence)', () => {
    const raw = JSON.stringify({ headline: 'h', body: 'b', confidence: 5 });
    const fail = assertFail(r3Validate(raw, NarratorSchema));
    expect(fail.reason).toBe('schema');
  });

  it('reconciler catches out-of-range percent', () => {
    const raw = JSON.stringify({
      gross_margin_pct: 150,
      net_margin_pct: 10,
      ltv_cac: 3,
    });
    const fail = assertFail(
      r3Validate(
        raw,
        MetricsSchema,
        defaultFinancialReconciler({
          percentFields: ['gross_margin_pct', 'net_margin_pct'],
          ltvCacField: 'ltv_cac',
        })
      )
    );
    expect(fail.reason).toBe('reconcile');
  });

  it('reconciler catches implausible LTV:CAC (anti-BS)', () => {
    const raw = JSON.stringify({
      gross_margin_pct: 60,
      net_margin_pct: 20,
      ltv_cac: 47,
    });
    const fail = assertFail(
      r3Validate(
        raw,
        MetricsSchema,
        defaultFinancialReconciler({
          percentFields: ['gross_margin_pct', 'net_margin_pct'],
          ltvCacField: 'ltv_cac',
        })
      )
    );
    expect(fail.reason).toBe('reconcile');
    expect(fail.detail).toMatch(/LTV:CAC/);
  });

  it('reconciler accepts sane values', () => {
    const raw = JSON.stringify({
      gross_margin_pct: 65,
      net_margin_pct: 18,
      ltv_cac: 3.4,
    });
    const result = r3Validate(
      raw,
      MetricsSchema,
      defaultFinancialReconciler({
        percentFields: ['gross_margin_pct', 'net_margin_pct'],
        ltvCacField: 'ltv_cac',
      })
    );
    expect(result.ok).toBe(true);
  });

  it('raw_preview is always <= 240 chars', () => {
    const raw = 'x'.repeat(10000);
    const fail = assertFail(r3Validate(raw, NarratorSchema));
    expect(fail.raw_preview.length).toBeLessThanOrEqual(240);
  });
});
