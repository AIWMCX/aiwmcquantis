import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  canCancel,
  canRecordUrl,
  canReschedule,
  linkedinUrlFromUrn,
  normalizeStatus,
  publishedUrlFor,
  statusView,
  toDenverParts,
  validatePublishedUrl,
} from '@/lib/autoposter-status';

describe('status view', () => {
  it('shows "unknown" as a warning that tells the founder to check the platform', () => {
    const v = statusView('unknown');
    expect(v.label).toBe('Status unknown');
    expect(v.tone).toBe('warning');
    expect(v.hint).toMatch(/may be live/);
  });
  it('falls back to draft for an unrecognised status rather than crashing', () => {
    expect(normalizeStatus('weird')).toBe('draft');
    expect(normalizeStatus(null)).toBe('draft');
  });
});

describe('allowed actions — nothing that could create a duplicate', () => {
  it('cancel only a scheduled row the publisher has not claimed', () => {
    expect(canCancel('scheduled')).toBe(true);
    for (const s of ['publishing', 'published', 'unknown', 'draft', 'failed']) expect(canCancel(s)).toBe(false);
  });
  it('never reschedule unknown, publishing or published', () => {
    for (const s of ['unknown', 'publishing', 'published']) expect(canReschedule(s)).toBe(false);
    for (const s of ['draft', 'scheduled', 'failed', 'needs_credentials']) expect(canReschedule(s)).toBe(true);
  });
  it('a URL can be recorded for anything except a row mid-publish', () => {
    expect(canRecordUrl('publishing')).toBe(false);
    expect(canRecordUrl('unknown')).toBe(true);
    expect(canRecordUrl('draft')).toBe(true);
  });
});

describe('published URL validation', () => {
  it('accepts the platform\'s own https links', () => {
    expect(validatePublishedUrl('linkedin', 'https://www.linkedin.com/feed/update/urn:li:share:7380000000000000000/')).toBeNull();
    expect(validatePublishedUrl('facebook', 'https://www.facebook.com/aiwmc/posts/123')).toBeNull();
    expect(validatePublishedUrl('instagram', 'https://www.instagram.com/p/ABC123/')).toBeNull();
  });
  it('rejects non-https, other hosts, look-alike hosts and junk', () => {
    expect(validatePublishedUrl('linkedin', 'http://www.linkedin.com/feed/update/x')).toMatch(/https/);
    expect(validatePublishedUrl('linkedin', 'javascript:alert(1)')).not.toBeNull();
    expect(validatePublishedUrl('linkedin', 'https://www.facebook.com/x')).toMatch(/not a linkedin/);
    expect(validatePublishedUrl('linkedin', 'https://linkedin.com.evil.example/x')).toMatch(/not a linkedin/);
    expect(validatePublishedUrl('instagram', 'not a url')).toMatch(/full link/);
  });
});

describe('live URL', () => {
  it('derives LinkedIn\'s public URL from the URN the publisher stores', () => {
    expect(linkedinUrlFromUrn('urn:li:share:7380000000000000000')).toBe('https://www.linkedin.com/feed/update/urn:li:share:7380000000000000000/');
    expect(linkedinUrlFromUrn('garbage')).toBeNull();
  });
  it('prefers a recorded URL; never invents one for other platforms', () => {
    expect(publishedUrlFor({ platform: 'linkedin', published_url: 'https://www.linkedin.com/x', platform_post_id: 'urn:li:share:1' })).toBe('https://www.linkedin.com/x');
    expect(publishedUrlFor({ platform: 'facebook', platform_post_id: '123_456' })).toBeNull();
  });
});

describe('Denver display', () => {
  it('shows the scheduled Monday post at 10:00 Denver (MDT)', () => {
    expect(toDenverParts('2026-10-19T16:00:00Z')).toEqual({ date: '2026-10-19', time: '10:00' });
  });
  it('uses MST after Nov 1', () => {
    expect(toDenverParts('2026-11-02T16:00:00Z')).toEqual({ date: '2026-11-02', time: '09:00' });
  });
});

describe('editor wiring', () => {
  const editor = readFileSync('src/components/autoposter/PostEditorSheet.tsx', 'utf8');
  it('"Approve & schedule" only re-queues rows that cannot already be live', () => {
    expect(editor).toContain('canReschedule(p.status)');
    expect(editor).not.toContain('approve.mutateAsync({ post, platforms })');
  });
  it('cancel and reschedule writes are guarded by the current status', () => {
    const hook = readFileSync('src/hooks/useAutoposter.ts', 'utf8');
    expect(hook).toMatch(/update\(\{ status: 'draft', scheduled_at: null \}\)\s*\.eq\('id', input\.row\.id\)\s*\.eq\('status', 'scheduled'\)/);
    expect(hook).toContain(".in('status', ['draft', 'scheduled', 'failed', 'needs_credentials'])");
    expect(hook).toContain(".neq('status', 'publishing')");
  });
});
