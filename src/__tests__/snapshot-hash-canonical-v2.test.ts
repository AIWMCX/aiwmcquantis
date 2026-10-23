// R&D finding F01: the snapshot input hash ignored nested financial values.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { canonicalJson, canonicalSha256, CanonicalJsonError } from '../../supabase/functions/_shared/canonical-json';

const a = { idea: 'Synthetic QA', location: 'Denver', financialInputs: { monthly_revenue: 10000, monthly_costs: 7000 } };
const b = { idea: 'Synthetic QA', location: 'Denver', financialInputs: { monthly_revenue: 90000, monthly_costs: 12000 } };

describe('canonical-json-v2', () => {
  it('a nested financial change changes the hash (the exact F01 reproduction)', async () => {
    expect(await canonicalSha256(a)).not.toBe(await canonicalSha256(b));
  });
  it('key order does not change the hash, at any depth', async () => {
    const reordered = { financialInputs: { monthly_costs: 7000, monthly_revenue: 10000 }, location: 'Denver', idea: 'Synthetic QA' };
    expect(await canonicalSha256(reordered)).toBe(await canonicalSha256(a));
  });
  it('array order does change the hash', async () => {
    expect(await canonicalSha256({ cf: [1, 2] })).not.toBe(await canonicalSha256({ cf: [2, 1] }));
  });
  it('null, missing and zero are three different inputs', async () => {
    const h = await Promise.all([{ x: null }, {}, { x: 0 }].map(canonicalSha256));
    expect(new Set(h).size).toBe(3);
  });
  it('never rounds: a sub-cent change counts', async () => {
    expect(await canonicalSha256({ r: 0.1 })).not.toBe(await canonicalSha256({ r: 0.1000001 }));
  });
  it('rejects NaN/Infinity instead of collapsing them to null', () => {
    expect(() => canonicalJson({ r: Number.NaN })).toThrow(CanonicalJsonError);
    expect(() => canonicalJson({ r: [Infinity] })).toThrow(/non-finite number at \$\.r\[0\]/);
    expect(() => canonicalJson({ r: [undefined] })).toThrow(CanonicalJsonError);
  });
  it('produces sorted compact JSON', () => {
    expect(canonicalJson({ b: 1, a: { d: [true, null], c: 's' } })).toBe('{"a":{"c":"s","d":[true,null]},"b":1}');
  });
});

describe('snapshot wiring', () => {
  const src = readFileSync('supabase/functions/_shared/analysis-snapshot.ts', 'utf8');
  it('uses the canonical serializer and records its version', () => {
    expect(src).not.toContain('Object.keys(value as object).sort()');
    expect(src).toContain('canonicalSha256(value)');
    expect(src).toContain('input_hash_version: INPUT_HASH_VERSION');
  });
});
