/**
 * Quantis Evidence Service — privacy-gate.ts regression suite (PR E1).
 */
import { describe, it, expect } from 'vitest';
import {
  redactSensitiveContent,
  assertSafeForOutboundQuery,
  PrivacyGateViolationError,
} from '../../../supabase/functions/_shared/evidence/privacy-gate';

describe('redactSensitiveContent', () => {
  it('redacts an email address', () => {
    const r = redactSensitiveContent('Contact founder@aiwmcquantis.com for details.');
    expect(r.clean).toBe(false);
    expect(r.redacted).not.toContain('founder@aiwmcquantis.com');
    expect(r.redacted).toContain('[REDACTED_EMAIL]');
    expect(r.findings.find((f) => f.category === 'EMAIL')?.count).toBe(1);
  });

  it('redacts an OpenAI-style API key', () => {
    const r = redactSensitiveContent('key is sk-abcdefghijklmnopqrstuvwx1234567890');
    expect(r.clean).toBe(false);
    expect(r.redacted).not.toContain('sk-abcdefghijklmnopqrstuvwx1234567890');
    expect(r.findings.some((f) => f.category === 'API_KEY_OR_TOKEN')).toBe(true);
  });

  it('redacts an AWS access key', () => {
    const r = redactSensitiveContent('AKIA1234567890ABCDEF is our key');
    expect(r.redacted).not.toContain('AKIA1234567890ABCDEF');
  });

  it('redacts a bearer/authorization header', () => {
    const r = redactSensitiveContent('Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(r.clean).toBe(false);
    expect(r.findings.some((f) => f.category === 'AUTH_HEADER')).toBe(true);
  });

  it('redacts a password field', () => {
    const r = redactSensitiveContent('password: hunter2trustno1');
    expect(r.redacted).not.toContain('hunter2trustno1');
    expect(r.findings.some((f) => f.category === 'PASSWORD_FIELD')).toBe(true);
  });

  it('redacts a payment card number, spaced or plain', () => {
    const r1 = redactSensitiveContent('card 4111111111111111 on file');
    expect(r1.redacted).not.toContain('4111111111111111');
    const r2 = redactSensitiveContent('card 4111 1111 1111 1111 on file');
    expect(r2.redacted).not.toContain('4111 1111 1111 1111');
  });

  it('redacts an SSN', () => {
    const r = redactSensitiveContent('SSN 123-45-6789 on file');
    expect(r.redacted).not.toContain('123-45-6789');
    expect(r.findings.some((f) => f.category === 'SSN')).toBe(true);
  });

  it('leaves ordinary business-research text untouched and clean', () => {
    const text = 'Denver, Colorado commercial rent Coffee shop';
    const r = redactSensitiveContent(text);
    expect(r.clean).toBe(true);
    expect(r.redacted).toBe(text);
    expect(r.findings).toEqual([]);
  });

  it('handles empty and undefined-ish input without throwing', () => {
    expect(() => redactSensitiveContent('')).not.toThrow();
    expect(redactSensitiveContent('').clean).toBe(true);
  });

  it('redacts multiple distinct findings in one pass', () => {
    const r = redactSensitiveContent('email me at a@b.com, my ssn is 123-45-6789');
    expect(r.findings.length).toBeGreaterThanOrEqual(2);
    expect(r.redacted).not.toContain('a@b.com');
    expect(r.redacted).not.toContain('123-45-6789');
  });
});

describe('assertSafeForOutboundQuery', () => {
  it('throws PrivacyGateViolationError when the text contains sensitive content', () => {
    expect(() => assertSafeForOutboundQuery('my email is a@b.com')).toThrow(PrivacyGateViolationError);
  });

  it('does not throw for clean research-query text', () => {
    expect(() => assertSafeForOutboundQuery('Denver, Colorado commercial rent Coffee shop')).not.toThrow();
  });

  it('the thrown error carries the findings for observability without re-leaking the matched value', () => {
    try {
      assertSafeForOutboundQuery('my email is a@b.com');
      expect.fail('expected a throw');
    } catch (e) {
      expect(e).toBeInstanceOf(PrivacyGateViolationError);
      const err = e as PrivacyGateViolationError;
      expect(err.findings.some((f) => f.category === 'EMAIL')).toBe(true);
      expect(err.message).not.toContain('a@b.com');
    }
  });
});
