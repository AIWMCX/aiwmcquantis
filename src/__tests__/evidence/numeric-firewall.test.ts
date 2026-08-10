/**
 * Quantis Evidence Service — numeric-firewall.ts regression suite.
 *
 * Master prompt section 31 ("Numeric Fidelity Test") implemented literally
 * against the exact passage and exact rejection cases given in the prompt.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeNumberString,
  extractNumbersFromText,
  classifyObservation,
  assertObservationIntegrity,
  NumericFirewallViolationError,
} from '../../../supabase/functions/_shared/evidence/numeric-firewall';

const WAGE_PASSAGE = 'Median hourly wage was $24.60 in 2025.';

describe('normalizeNumberString', () => {
  it('strips currency symbols, commas, and whitespace', () => {
    expect(normalizeNumberString('$24.60')).toBe('24.60');
    expect(normalizeNumberString('$1,234.56')).toBe('1234.56');
    expect(normalizeNumberString(' 42 ')).toBe('42');
  });
});

describe('extractNumbersFromText', () => {
  it('extracts and normalizes every numeric token from the master prompt passage', () => {
    expect(extractNumbersFromText(WAGE_PASSAGE)).toEqual(['24.60', '2025']);
  });
});

describe('classifyObservation — master prompt section 31, accepted case', () => {
  it('accepts the exact stated value/unit/period as OBSERVED', () => {
    const result = classifyObservation({
      proposedValue: '24.60',
      proposedUnit: 'USD/hour',
      proposedPeriod: '2025',
      passageText: WAGE_PASSAGE,
    });
    expect(result.status).toBe('OBSERVED');
  });

  it('accepts the dollar-signed form of the same value', () => {
    const result = classifyObservation({
      proposedValue: '$24.60',
      proposedUnit: 'USD/hour',
      proposedPeriod: '2025',
      passageText: WAGE_PASSAGE,
    });
    expect(result.status).toBe('OBSERVED');
  });
});

describe('classifyObservation — master prompt section 31, required rejections', () => {
  it('rejects $26 (wrong value entirely)', () => {
    const result = classifyObservation({
      proposedValue: '26',
      proposedUnit: 'USD/hour',
      proposedPeriod: '2025',
      passageText: WAGE_PASSAGE,
    });
    expect(result.status).toBe('ESTIMATE');
  });

  it('rejects $24.06 (digit transposition)', () => {
    const result = classifyObservation({
      proposedValue: '24.06',
      proposedUnit: 'USD/hour',
      proposedPeriod: '2025',
      passageText: WAGE_PASSAGE,
    });
    expect(result.status).toBe('ESTIMATE');
  });

  it('rejects $24.60/month when the source said /hour', () => {
    const result = classifyObservation({
      proposedValue: '24.60',
      proposedUnit: 'USD/month',
      proposedPeriod: '2025',
      passageText: WAGE_PASSAGE,
    });
    expect(result.status).toBe('ESTIMATE');
    expect(result.reason).toMatch(/unit/i);
  });

  it('rejects $24.60 "current-year" when the source said a specific year with no evidence for "current"', () => {
    const result = classifyObservation({
      proposedValue: '24.60',
      proposedUnit: 'USD/hour',
      proposedPeriod: 'current-year',
      passageText: WAGE_PASSAGE,
    });
    expect(result.status).toBe('ESTIMATE');
    expect(result.reason).toMatch(/period/i);
  });
});

describe('classifyObservation — other paths', () => {
  it('marks an explicitly-flagged estimate as ESTIMATE without inspecting the passage', () => {
    const result = classifyObservation({
      proposedValue: '999',
      proposedUnit: 'USD',
      passageText: '',
      explicitlyEstimate: true,
    });
    expect(result.status).toBe('ESTIMATE');
  });

  it('marks a value with transformationIds as TRANSFORMED, not OBSERVED', () => {
    const result = classifyObservation({
      proposedValue: '48',
      proposedUnit: 'USD/hour',
      passageText: 'unrelated text',
      transformationIds: ['double-hourly-wage'],
    });
    expect(result.status).toBe('TRANSFORMED');
  });

  it('rejects a non-numeric proposed value as ESTIMATE rather than throwing', () => {
    const result = classifyObservation({
      proposedValue: 'not-a-number',
      proposedUnit: 'USD',
      passageText: WAGE_PASSAGE,
    });
    expect(result.status).toBe('ESTIMATE');
  });

  it('accepts a unit with no time-period component without a period check', () => {
    const result = classifyObservation({
      proposedValue: '24.60',
      proposedUnit: 'USD',
      passageText: WAGE_PASSAGE,
    });
    expect(result.status).toBe('OBSERVED');
  });

  it('matches unit period via a synonym (e.g. "hourly" instead of "hour")', () => {
    const result = classifyObservation({
      proposedValue: '15',
      proposedUnit: 'USD/hour',
      passageText: 'The hourly rate is $15 in this market.',
    });
    expect(result.status).toBe('OBSERVED');
  });
});

describe('assertObservationIntegrity — the actual enforcement gate', () => {
  it('throws NumericFirewallViolationError when a caller claims OBSERVED for a value the firewall would reject', () => {
    expect(() =>
      assertObservationIntegrity(
        {
          proposedValue: '26',
          proposedUnit: 'USD/hour',
          proposedPeriod: '2025',
          passageText: WAGE_PASSAGE,
        },
        'OBSERVED',
      ),
    ).toThrow(NumericFirewallViolationError);
  });

  it('does not throw when a caller claims ESTIMATE (no gate needed for non-OBSERVED claims)', () => {
    expect(() =>
      assertObservationIntegrity(
        {
          proposedValue: '26',
          proposedUnit: 'USD/hour',
          passageText: WAGE_PASSAGE,
        },
        'ESTIMATE',
      ),
    ).not.toThrow();
  });

  it('does not throw when the OBSERVED claim is actually correct', () => {
    expect(() =>
      assertObservationIntegrity(
        {
          proposedValue: '24.60',
          proposedUnit: 'USD/hour',
          proposedPeriod: '2025',
          passageText: WAGE_PASSAGE,
        },
        'OBSERVED',
      ),
    ).not.toThrow();
  });
});
