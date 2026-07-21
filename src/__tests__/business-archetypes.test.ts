/**
 * Business Archetypes — Domain 5 audit (Q41/Q44/Q45/Q165/Q179)
 *
 * Covers: registry integrity (every archetype has non-empty detection
 * phrases and a real engineFitNote), detection precision (each archetype's
 * own examples classify correctly, and clearly-unrelated text stays
 * unclassified), and the 'poor' vs 'good' engineFit split matching the
 * audit's actual findings.
 */
import { describe, it, expect } from 'vitest';
import {
  ARCHETYPE_LIST,
  BUSINESS_ARCHETYPES,
  detectArchetype,
  type ArchetypeId,
} from '../config/business-archetypes';

describe('BUSINESS_ARCHETYPES registry integrity', () => {
  it('has exactly 6 archetypes, each with a non-empty detection phrase list', () => {
    expect(ARCHETYPE_LIST).toHaveLength(6);
    for (const archetype of ARCHETYPE_LIST) {
      expect(archetype.detectionPhrases.length).toBeGreaterThan(0);
      expect(archetype.engineFitNote.length).toBeGreaterThan(10);
      expect(archetype.examples.length).toBeGreaterThan(0);
    }
  });

  it('keys the record by each archetype\'s own id (no copy-paste mismatch)', () => {
    for (const [key, archetype] of Object.entries(BUSINESS_ARCHETYPES)) {
      expect(archetype.id).toBe(key as ArchetypeId);
    }
  });

  it('marks exactly the two steady-revenue archetypes as good fit, the rest poor', () => {
    const goodFit = ARCHETYPE_LIST.filter((a) => a.engineFit === 'good').map((a) => a.id);
    const poorFit = ARCHETYPE_LIST.filter((a) => a.engineFit === 'poor').map((a) => a.id);
    expect(goodFit.sort()).toEqual(['subscription_recurring', 'transactional_retail'].sort());
    expect(poorFit.sort()).toEqual(
      [
        'capacity_constrained_service',
        'contingency_fee',
        'project_based_services',
        'transaction_percentage',
      ].sort(),
    );
  });

  it('has no detection phrase duplicated across two different archetypes', () => {
    const seen = new Map<string, ArchetypeId>();
    for (const archetype of ARCHETYPE_LIST) {
      for (const phrase of archetype.detectionPhrases) {
        const owner = seen.get(phrase);
        expect(owner, `phrase "${phrase}" claimed by both ${owner} and ${archetype.id}`).toBeUndefined();
        seen.set(phrase, archetype.id);
      }
    }
  });
});

describe('detectArchetype — precision-first classification', () => {
  it('classifies a subscription SaaS idea correctly', () => {
    const result = detectArchetype('A B2B SaaS tool for scheduling, $49/mo subscription per seat');
    expect(result?.id).toBe('subscription_recurring');
  });

  it('classifies a contingency-fee idea correctly (the audit\'s original finding)', () => {
    const result = detectArchetype(
      'A B2B SaaS platform that recovers duplicate vendor payments and takes a 25% contingency fee on recovered funds',
    );
    expect(result?.id).toBe('contingency_fee');
  });

  it('classifies a project-based construction business correctly', () => {
    const result = detectArchetype('A general contractor billing per project for commercial construction jobs');
    expect(result?.id).toBe('project_based_services');
  });

  it('classifies a marketplace take-rate business correctly', () => {
    const result = detectArchetype('A two-sided marketplace taking a percentage of each transaction between buyers and sellers');
    expect(result?.id).toBe('transaction_percentage');
  });

  it('classifies a capacity-constrained studio correctly', () => {
    const result = detectArchetype('A boutique yoga studio with 12 seats available per class');
    expect(result?.id).toBe('capacity_constrained_service');
  });

  it('classifies a retail coffee shop correctly', () => {
    const result = detectArchetype('A specialty coffee shop with an average transaction average of $6');
    expect(result?.id).toBe('transactional_retail');
  });

  it('returns null for an ambiguous idea rather than guessing (precision over recall)', () => {
    const result = detectArchetype('A new way to help small businesses grow faster');
    expect(result).toBeNull();
  });

  it('returns null for empty or non-string input without throwing', () => {
    expect(detectArchetype('')).toBeNull();
    expect(detectArchetype(undefined as unknown as string)).toBeNull();
    expect(detectArchetype(null as unknown as string)).toBeNull();
  });

  it('is case-insensitive', () => {
    const result = detectArchetype('CONTINGENCY FEE recovery service');
    expect(result?.id).toBe('contingency_fee');
  });
});
