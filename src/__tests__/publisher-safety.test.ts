import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { denverWallTimeToUtcIso } from '@/lib/denver-time';
import { ambiguousFromThrow, isAmbiguousHttpStatus, statusFor } from '../../supabase/functions/publish-due-posts/outcome';

describe('denverWallTimeToUtcIso — correct DST offset per date', () => {
  it('Oct 19 2026 08:00 MT is MDT (-06:00) -> 14:00Z (old code gave 15:00Z)', () => {
    expect(denverWallTimeToUtcIso('2026-10-19', '08:00:00')).toBe('2026-10-19T14:00:00.000Z');
  });
  it('Oct 31 2026 (last MDT day) 09:00 -> 15:00Z', () => {
    expect(denverWallTimeToUtcIso('2026-10-31', '09:00')).toBe('2026-10-31T15:00:00.000Z');
  });
  it('Nov 2 2026 (after DST ends Nov 1) 09:00 is MST (-07:00) -> 16:00Z', () => {
    expect(denverWallTimeToUtcIso('2026-11-02', '09:00')).toBe('2026-11-02T16:00:00.000Z');
  });
  it('January is MST', () => {
    expect(denverWallTimeToUtcIso('2027-01-15', '08:00:00')).toBe('2027-01-15T15:00:00.000Z');
  });
  it('after DST starts (Mar 14 2027) is MDT again', () => {
    expect(denverWallTimeToUtcIso('2027-03-15', '08:00:00')).toBe('2027-03-15T14:00:00.000Z');
  });
});

describe('publish outcome — never call an uncertain publish "failed"', () => {
  it('success and missing credentials keep their statuses', () => {
    expect(statusFor({ ok: true, platform_post_id: 'urn:li:share:1' })).toBe('published');
    expect(statusFor({ ok: false, needs_credentials: true })).toBe('needs_credentials');
  });
  it('a definite rejection (4xx) is failed', () => {
    expect(isAmbiguousHttpStatus(401)).toBe(false);
    expect(isAmbiguousHttpStatus(422)).toBe(false);
    expect(statusFor({ ok: false, error: 'LinkedIn 422' })).toBe('failed');
  });
  it('a server error (5xx) is unknown — LinkedIn may have created the post', () => {
    expect(isAmbiguousHttpStatus(500)).toBe(true);
    expect(isAmbiguousHttpStatus(504)).toBe(true);
  });
  it('a timeout / dropped connection is unknown, with a reconcile-first message', () => {
    const r = ambiguousFromThrow('LinkedIn', new DOMException('The signal has been aborted', 'TimeoutError'));
    expect(statusFor(r)).toBe('unknown');
    expect(r.error).toMatch(/may be live/);
  });
});

describe('publisher wiring', () => {
  const src = readFileSync('supabase/functions/publish-due-posts/index.ts', 'utf8');
  it('LinkedIn request has a timeout and classifies throws as ambiguous', () => {
    expect(src).toContain('signal: AbortSignal.timeout(PUBLISH_TIMEOUT_MS)');
    expect(src).toContain("return ambiguousFromThrow('LinkedIn', e);");
  });
  it('status comes from statusFor (no hard-coded failed on uncertain outcomes)', () => {
    expect(src).toContain('const newStatus = statusFor(res);');
    expect(src).not.toContain("res.needs_credentials ? 'needs_credentials' : 'failed'");
  });
  it('scheduler uses the Denver DST helper, not a fixed -07:00 offset', () => {
    const hook = readFileSync('src/hooks/useAutoposter.ts', 'utf8');
    expect(hook).toContain('denverWallTimeToUtcIso(input.post.post_date, time)');
    expect(hook).not.toContain('-07:00`');
  });
});
