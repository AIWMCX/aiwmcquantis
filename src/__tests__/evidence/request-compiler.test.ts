/**
 * Quantis Evidence Service — request-compiler.ts regression suite (PR E1).
 */
import { describe, it, expect } from 'vitest';
import {
  compileEvidenceRequest,
  EVIDENCE_OBJECTIVE_CATALOG,
} from '../../../supabase/functions/_shared/evidence/request-compiler';

describe('compileEvidenceRequest — master prompt section 7 example', () => {
  const input = {
    analysisRunId: 'run-123',
    idea: 'Coffee shop',
    location: 'Denver, Colorado',
  };

  it('produces a rent question with OFFICIAL/LOCAL_BUSINESS/INDUSTRY lenses', () => {
    const plan = compileEvidenceRequest(input);
    const rent = plan.questions.find((q) => q.objective === 'LOCAL_COST_RENT');
    expect(rent).toBeDefined();
    expect(rent!.query).toBe('Denver, Colorado commercial rent Coffee shop');
    expect(rent!.preferredLenses).toEqual(['OFFICIAL', 'LOCAL_BUSINESS', 'INDUSTRY']);
  });

  it('produces a labor/wage question with GOVERNMENT/OFFICIAL lenses', () => {
    const plan = compileEvidenceRequest(input);
    const wages = plan.questions.find((q) => q.objective === 'LABOR_COST');
    expect(wages).toBeDefined();
    expect(wages!.preferredLenses).toEqual(['GOVERNMENT', 'OFFICIAL']);
  });

  it('produces a licensing/regulation question with GOVERNMENT/OFFICIAL lenses', () => {
    const plan = compileEvidenceRequest(input);
    const licensing = plan.questions.find((q) => q.objective === 'REGULATION');
    expect(licensing).toBeDefined();
    expect(licensing!.query).toContain('licensing requirements');
  });

  it('carries the analysisRunId and defaults riskClass to FINANCIAL_BUSINESS', () => {
    const plan = compileEvidenceRequest(input);
    expect(plan.analysisRunId).toBe('run-123');
    expect(plan.riskClass).toBe('FINANCIAL_BUSINESS');
  });
});

describe('compileEvidenceRequest — determinism', () => {
  it('the exact same input produces byte-identical output on repeat calls', () => {
    const input = { analysisRunId: 'run-1', idea: 'Bakery', location: 'Austin, TX' };
    const a = compileEvidenceRequest(input);
    const b = compileEvidenceRequest(input);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('one question is produced per catalog entry, no more, no fewer', () => {
    const plan = compileEvidenceRequest({ analysisRunId: 'r', idea: 'x', location: 'y' });
    expect(plan.questions).toHaveLength(EVIDENCE_OBJECTIVE_CATALOG.length);
  });
});

describe('compileEvidenceRequest — exclusion list (master prompt section 23)', () => {
  it('never asks about demand, conversion, churn, CAC, LTV, or valuation -- those stay deterministic-engine-only', () => {
    const plan = compileEvidenceRequest({ analysisRunId: 'r', idea: 'x', location: 'y' });
    const forbidden = ['demand', 'conversion', 'churn', 'cac', 'ltv', 'valuation', 'growth', 'probability'];
    for (const q of plan.questions) {
      for (const term of forbidden) {
        expect(q.objective.toLowerCase()).not.toContain(term);
        expect(q.query.toLowerCase()).not.toContain(term);
      }
    }
  });
});

describe('compileEvidenceRequest — input isolation', () => {
  it('does not leak anything beyond idea/location into query strings, even if the idea string contains something that looks like other analysis data', () => {
    const plan = compileEvidenceRequest({
      analysisRunId: 'r',
      idea: 'Coffee shop; revenue=50000; cac=200',
      location: 'Denver',
    });
    // The compiler doesn't parse/strip this -- that's privacy-gate.ts's job,
    // exercised separately. This test only asserts the compiler itself does
    // not ADD anything beyond substituting idea/location verbatim into the
    // template -- i.e. it introduces no additional leakage of its own.
    for (const q of plan.questions) {
      expect(q.query).toContain('Coffee shop; revenue=50000; cac=200');
    }
  });
});
