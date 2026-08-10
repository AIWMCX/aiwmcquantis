/**
 * Quantis Evidence Service — freshness.ts regression suite (PR E2.1).
 */
import { describe, it, expect } from 'vitest';
import { classifyFreshness, rollUpFreshness } from '../../../supabase/functions/_shared/evidence/freshness';

const NOW = new Date('2026-08-10T00:00:00Z');

describe('classifyFreshness', () => {
  it('returns UNKNOWN when publishedAt is absent', () => {
    expect(classifyFreshness(undefined, NOW)).toBe('UNKNOWN');
  });

  it('returns UNKNOWN for an unparseable date string', () => {
    expect(classifyFreshness('not-a-date', NOW)).toBe('UNKNOWN');
  });

  it('returns CURRENT for a date within the last 180 days', () => {
    expect(classifyFreshness('2026-07-01T00:00:00Z', NOW)).toBe('CURRENT');
  });

  it('returns AGING for a date between 180 and 730 days old', () => {
    expect(classifyFreshness('2025-06-01T00:00:00Z', NOW)).toBe('AGING');
  });

  it('returns HISTORICAL for a date older than 730 days', () => {
    expect(classifyFreshness('2020-01-01T00:00:00Z', NOW)).toBe('HISTORICAL');
  });

  it('returns UNKNOWN for a date in the future rather than confidently CURRENT', () => {
    expect(classifyFreshness('2027-01-01T00:00:00Z', NOW)).toBe('UNKNOWN');
  });

  it('boundary: exactly 180 days old is still CURRENT', () => {
    const exactly180 = new Date(NOW.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString();
    expect(classifyFreshness(exactly180, NOW)).toBe('CURRENT');
  });
});

describe('rollUpFreshness', () => {
  it('returns UNKNOWN when every input is UNKNOWN', () => {
    expect(rollUpFreshness(['UNKNOWN', 'UNKNOWN'])).toBe('UNKNOWN');
  });

  it('returns UNKNOWN for an empty array', () => {
    expect(rollUpFreshness([])).toBe('UNKNOWN');
  });

  it('excludes UNKNOWN entries rather than letting them drag the result to UNKNOWN', () => {
    expect(rollUpFreshness(['CURRENT', 'UNKNOWN'])).toBe('CURRENT');
  });

  it('rolls up to the STALEST known value among mixed sources', () => {
    expect(rollUpFreshness(['CURRENT', 'AGING'])).toBe('AGING');
    expect(rollUpFreshness(['CURRENT', 'HISTORICAL'])).toBe('HISTORICAL');
    expect(rollUpFreshness(['AGING', 'HISTORICAL'])).toBe('HISTORICAL');
  });

  it('returns CURRENT when every source is CURRENT', () => {
    expect(rollUpFreshness(['CURRENT', 'CURRENT'])).toBe('CURRENT');
  });
});
