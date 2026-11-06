/**
 * One vocabulary for claim status and assumption origin (Phase 1, item 3).
 * The drift tests read the literal unions out of the Quantis source files, so a
 * value added to any old vocabulary fails here until it is mapped.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ANALYTICA_ASSUMPTION_ORIGIN,
  ASSUMPTION_ORIGINS,
  CLAIM_STATUSES,
  COMMERCIAL_CLAIM_STATUS,
  DECISION_REVIEW_EVIDENCE_STRENGTH,
  DECISION_REVIEW_PROVENANCE,
  isAssumptionOrigin,
  isClaimStatus,
  LEGACY_UPPER_CLAIM_STATUS,
  mapCommercialFact,
  mapVocabulary,
  ONTOLOGY_ASSERTION_METHOD,
  ONTOLOGY_ASSUMPTION_ORIGIN,
  ONTOLOGY_CLAIM_STATUS,
  QUANTIS_ASSUMPTION_NODE_SOURCE,
  QUANTIS_ASSUMPTION_ORIGIN,
  QUANTIS_INPUT_ORIGIN,
  QUANTIS_TRUTH_LABEL_SOURCE,
  QUANTIS_VALUE_SOURCE,
  SYSTEM_A_CLAIM_STATUS,
  SYSTEM_A_NUMERIC_STATUS,
  type Mapped,
} from '../../supabase/functions/_shared/contracts/vocabulary.ts';
import type { AssumptionOriginClass } from '../../supabase/functions/_shared/assumption-origin.ts';
import type { InputOrigin } from '../../supabase/functions/analyze-business/engine-inputs.ts';

const repo = resolve(__dirname, '../..');
const src = (p: string) => readFileSync(resolve(repo, p), 'utf8');

/** String literals of a union, read from source text after `anchor` up to `end`. */
function literalsAfter(file: string, anchor: string | RegExp, end = ';'): string[] {
  const text = src(file);
  const hit = typeof anchor === 'string'
    ? { index: text.indexOf(anchor), length: anchor.length }
    : (() => { const r = anchor.exec(text); return { index: r ? r.index : -1, length: r ? r[0].length : 0 }; })();
  expect(hit.index, `${anchor} in ${file}`).toBeGreaterThanOrEqual(0);
  const tail = text.slice(hit.index + hit.length);
  return [...tail.slice(0, tail.indexOf(end)).matchAll(/['"]([A-Za-z_]+)['"]/g)].map((x) => x[1]);
}

// Compile-time: the maps are keyed by exactly the source unions.
const _origin: Record<AssumptionOriginClass, unknown> = QUANTIS_ASSUMPTION_ORIGIN;
const _input: Record<InputOrigin, unknown> = QUANTIS_INPUT_ORIGIN;
void _origin; void _input;

describe('target vocabularies', () => {
  it('claim status has the seven agreed values', () => {
    expect([...CLAIM_STATUSES]).toEqual(['supported', 'partially_supported', 'contested', 'single_source', 'stale', 'inferred', 'unsupported']);
  });
  it('assumption origin has the five agreed values', () => {
    expect([...ASSUMPTION_ORIGINS]).toEqual(['customer_input', 'source_estimate', 'benchmark', 'analyst_assumption', 'derived_calculation']);
  });
});

describe('every mapping lands on a target value', () => {
  const claimMaps = { LEGACY_UPPER_CLAIM_STATUS, SYSTEM_A_CLAIM_STATUS, ONTOLOGY_CLAIM_STATUS, DECISION_REVIEW_EVIDENCE_STRENGTH, COMMERCIAL_CLAIM_STATUS };
  const originMaps = {
    QUANTIS_ASSUMPTION_ORIGIN, DECISION_REVIEW_PROVENANCE, QUANTIS_INPUT_ORIGIN, QUANTIS_TRUTH_LABEL_SOURCE, QUANTIS_ASSUMPTION_NODE_SOURCE,
    QUANTIS_VALUE_SOURCE, ANALYTICA_ASSUMPTION_ORIGIN, ONTOLOGY_ASSUMPTION_ORIGIN, ONTOLOGY_ASSERTION_METHOD, SYSTEM_A_NUMERIC_STATUS,
  };
  const check = (maps: Record<string, Record<string, Mapped<string, string> | null>>, valid: (v: unknown) => boolean) => {
    for (const [name, table] of Object.entries(maps)) {
      for (const [k, m] of Object.entries(table)) {
        if (m == null) continue;
        expect(valid(m.value), `${name}.${k}`).toBe(true);
        if (m.qualifier) expect(m.lossy, `${name}.${k} qualifier implies lossy`).toBe(true);
      }
    }
  };
  it('claim maps', () => check(claimMaps, isClaimStatus));
  it('origin maps', () => check(originMaps, isAssumptionOrigin));

  it('the 7-value legacy status maps 1:1 and covers every target value', () => {
    const targets = Object.values(LEGACY_UPPER_CLAIM_STATUS).map((m) => m!.value);
    expect(new Set(targets)).toEqual(new Set(CLAIM_STATUSES));
    expect(Object.values(LEGACY_UPPER_CLAIM_STATUS).every((m) => !m!.lossy)).toBe(true);
  });
  it('Analytica origins map 1:1 onto all five targets', () => {
    expect(new Set(Object.values(ANALYTICA_ASSUMPTION_ORIGIN).map((m) => m!.value))).toEqual(new Set(ASSUMPTION_ORIGINS));
  });
});

describe('decisions that need to stay visible', () => {
  it('Quantis DERIVED is an AI estimate, not a calculation', () => {
    expect(QUANTIS_ASSUMPTION_ORIGIN.DERIVED).toEqual({ value: 'analyst_assumption', lossy: true, qualifier: 'ai_extracted' });
    expect(QUANTIS_ASSUMPTION_ORIGIN.SYSTEM_ASSUMPTION).toEqual({ value: 'derived_calculation', lossy: true, qualifier: 'benchmark_derived' });
    expect(QUANTIS_ASSUMPTION_ORIGIN.PLACEHOLDER?.qualifier).toBe('placeholder_default');
  });
  it('unknown values map to null, never to a guess', () => {
    expect(DECISION_REVIEW_PROVENANCE.UNKNOWN).toBeNull();
    expect(DECISION_REVIEW_EVIDENCE_STRENGTH.unknown).toBeNull();
    expect(QUANTIS_ASSUMPTION_NODE_SOURCE.unknown).toBeNull();
    expect(COMMERCIAL_CLAIM_STATUS.ASSUMPTION).toBeNull();
  });
  it('"insufficient" and commercial FACT are lossy', () => {
    expect(ONTOLOGY_CLAIM_STATUS.insufficient).toMatchObject({ value: 'unsupported', lossy: true });
    expect(COMMERCIAL_CLAIM_STATUS.FACT).toMatchObject({ value: 'single_source', lossy: true });
    expect(mapCommercialFact(3)).toEqual({ value: 'supported', lossy: false });
    expect(mapCommercialFact(1)).toEqual({ value: 'single_source', lossy: false });
  });
  it('mapVocabulary throws on drift', () => {
    expect(() => mapVocabulary(SYSTEM_A_CLAIM_STATUS, 'PARTIALLY_SUPPORTED', 'System A claim status')).toThrow(/Unknown System A claim status/);
    expect(mapVocabulary(SYSTEM_A_CLAIM_STATUS, 'SUPPORTED', 'x')?.value).toBe('supported');
  });
});

describe('drift: maps cover the literal values in the Quantis source', () => {
  const keys = (t: object) => new Set(Object.keys(t));

  it('_shared/assumption-origin.ts AssumptionOriginClass', () => {
    expect(new Set(literalsAfter('supabase/functions/_shared/assumption-origin.ts', 'export type AssumptionOriginClass ='))).toEqual(keys(QUANTIS_ASSUMPTION_ORIGIN));
  });
  it('analyze-business/engine-inputs.ts InputOrigin', () => {
    expect(new Set(literalsAfter('supabase/functions/analyze-business/engine-inputs.ts', 'export type InputOrigin ='))).toEqual(keys(QUANTIS_INPUT_ORIGIN));
  });
  it('decision-review provenance and evidence strength', () => {
    const f = 'supabase/functions/_shared/decision-review/contracts.ts';
    expect(new Set(literalsAfter(f, 'provenance:'))).toEqual(keys(DECISION_REVIEW_PROVENANCE));
    expect(new Set(literalsAfter(f, 'evidenceStrength:'))).toEqual(keys(DECISION_REVIEW_EVIDENCE_STRENGTH));
    const strength = new Set(literalsAfter(f, 'strength:'));
    for (const v of strength) expect(keys(DECISION_REVIEW_EVIDENCE_STRENGTH).has(v), v).toBe(true);
  });
  it('commercial ClaimStatus', () => {
    expect(new Set(literalsAfter('supabase/functions/_shared/commercial/contracts.ts', 'export const ClaimStatus = z.enum(', ')'))).toEqual(keys(COMMERCIAL_CLAIM_STATUS));
  });
  it('TruthLabel.source', () => {
    expect(new Set(literalsAfter('supabase/functions/_shared/ai-safety-guardrails.ts', /export interface TruthLabel[\s\S]*?source:/))).toEqual(keys(QUANTIS_TRUTH_LABEL_SOURCE));
  });
  it('AssumptionNode.source', () => {
    expect(new Set(literalsAfter('supabase/functions/analyze-business/assumption-graph.ts', /Coarse bucket kept for older readers[\s\S]*?source:/))).toEqual(keys(QUANTIS_ASSUMPTION_NODE_SOURCE));
  });
});
