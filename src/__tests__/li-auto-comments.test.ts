import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  mapTraxyPost,
  normalizePostUrl,
  normalizeProfileUrl,
  pickCommentSignals,
  type CommentCandidate,
} from '../../supabase/functions/_shared/li-auto-comments';
import * as page from '@/lib/li-growth/prospects';

const FEED = readFileSync('supabase/functions/_shared/traxy-feed.ts', 'utf8');
const FN = readFileSync('supabase/functions/li-growth-draft/index.ts', 'utf8');
const SQL = readFileSync('supabase/migrations/20261111120000_li_auto_comments_traxy.sql', 'utf8');

describe('auto comments: URL rules match the admin page', () => {
  const inputs = [
    'https://www.linkedin.com/in/jane-doe/',
    'http://linkedin.com/in/Jane-Doe?utm_source=share',
    ' https://ca.linkedin.com/in/jane-doe/details/experience ',
    'https://www.linkedin.com/in/ACoAABCDEFGHIJK',
    'https://www.linkedin.com/company/acme',
    'https://linkedin.com.evil.example/in/jane',
    'javascript:alert(1)',
  ];
  it('normalizeProfileUrl gives the same result as src/lib/li-growth/prospects', () => {
    for (const raw of inputs) expect(normalizeProfileUrl(raw), raw).toBe(page.normalizeProfileUrl(raw));
  });
  it('normalizePostUrl gives the same result as src/lib/li-growth/prospects', () => {
    for (const raw of [
      'https://linkedin.com/posts/jane-doe_cash-activity-123?utm=x',
      'https://www.linkedin.com/feed/update/urn:li:activity:123/',
      'https://example.com/posts/1',
    ]) expect(normalizePostUrl(raw), raw).toBe(page.normalizePostUrl(raw));
  });
});

describe('mapTraxyPost', () => {
  it('maps a documented content-feed record', () => {
    const p = mapTraxyPost({
      postUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:7300/',
      contentText: 'Most owners hire from their best month.',
      publishedAt: '2026-11-10T14:00:00Z',
      author: { name: 'Jane Doe', linkedinUrl: 'https://www.linkedin.com/in/Jane-Doe/', headline: 'Fractional CFO at Acme' },
    });
    expect(p).toEqual({
      postUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:7300/',
      text: 'Most owners hire from their best month.',
      authorName: 'Jane Doe',
      authorUrl: 'https://www.linkedin.com/in/jane-doe',
      authorHeadline: 'Fractional CFO at Acme',
      publishedAt: '2026-11-10T14:00:00Z',
    });
  });
  it('drops records without a LinkedIn post URL, text or author profile', () => {
    expect(mapTraxyPost({ postUrl: 'https://example.com/x', contentText: 'hi', author: { linkedinUrl: 'https://www.linkedin.com/in/a' } })).toBeNull();
    expect(mapTraxyPost({ postUrl: 'https://www.linkedin.com/posts/a_1', contentText: '', author: { linkedinUrl: 'https://www.linkedin.com/in/a' } })).toBeNull();
    expect(mapTraxyPost({ postUrl: 'https://www.linkedin.com/posts/a_1', contentText: 'hi' })).toBeNull();
    expect(mapTraxyPost(null)).toBeNull();
  });
  it('caps the excerpt at the li_engagement_signals limit (1200)', () => {
    const p = mapTraxyPost({ postUrl: 'https://www.linkedin.com/posts/a_1', contentText: 'x'.repeat(5000), authorUrl: 'https://www.linkedin.com/in/a' });
    expect(p?.text.length).toBe(1200);
  });
});

describe('pickCommentSignals', () => {
  const now = new Date('2026-11-12T12:00:00Z');
  const base: CommentCandidate = { signalId: 's', prospectId: 'p', fit: 60, observedAt: '2026-11-11T12:00:00Z', lastCommentAt: null, hasDraftForSignal: false, suppressed: false };
  const opts = { max: 5, fitThreshold: 50, cooldownDays: 7, now, maxAgeDays: 5 };

  it('one draft per author, highest fit first, then freshest', () => {
    const out = pickCommentSignals([
      { ...base, signalId: 'a1', prospectId: 'A', fit: 60, observedAt: '2026-11-10T12:00:00Z' },
      { ...base, signalId: 'a2', prospectId: 'A', fit: 60, observedAt: '2026-11-11T12:00:00Z' },
      { ...base, signalId: 'b1', prospectId: 'B', fit: 80 },
    ], opts);
    expect(out).toEqual(['b1', 'a2']);
  });
  it('skips low fit, suppressed, stale, already drafted, and authors in cooldown', () => {
    const out = pickCommentSignals([
      { ...base, signalId: 'low', prospectId: 'L', fit: 40 },
      { ...base, signalId: 'sup', prospectId: 'S', suppressed: true },
      { ...base, signalId: 'old', prospectId: 'O', observedAt: '2026-11-01T12:00:00Z' },
      { ...base, signalId: 'dup', prospectId: 'D', hasDraftForSignal: true },
      { ...base, signalId: 'cool', prospectId: 'C', lastCommentAt: '2026-11-09T12:00:00Z' },
      { ...base, signalId: 'ok', prospectId: 'K', lastCommentAt: '2026-11-01T12:00:00Z' },
    ], opts);
    expect(out).toEqual(['ok']);
  });
  it('never returns more than max', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ ...base, signalId: `s${i}`, prospectId: `p${i}` }));
    expect(pickCommentSignals(many, opts)).toHaveLength(5);
  });
});

describe('auto comments: compliance and wiring', () => {
  it('the TRAXY module talks only to api.traxy.ai and never to LinkedIn', () => {
    expect(FEED).toContain("export const TRAXY_API = 'https://api.traxy.ai/api/v1';");
    expect(FEED.match(/fetch\(/g)?.length).toBe(1);
    expect(FEED).toContain('fetch(`${TRAXY_API}/customer/content-feed?');
    expect(FEED).not.toMatch(/linkedin\.com/i);
  });
  it('the function only creates drafts: cron may run auto_daily and nothing else', () => {
    expect(FN).toContain("if (String(body.action ?? '') !== 'auto_daily') return json(req, { error: 'cron may only run auto_daily' }, 400);");
    expect(FN).toContain("status: 'draft'");
    expect(FN).not.toMatch(/status:\s*'(approved|sent)'\s*,\s*final_text: null/);
  });
  it('cron reads the shared secret from Vault, never a literal', () => {
    expect(SQL.match(/vault\.decrypted_secrets where name = 'quantis_shared_cron_secret'/g)?.length).toBe(2);
    expect(SQL).toContain("'40 11 * * 1-5'");
    expect(SQL).toContain("'10 12 * * 1-5'");
  });
});
