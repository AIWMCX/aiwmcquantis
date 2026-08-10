/**
 * Quantis Evidence Service — url-normalize.ts regression suite (PR E1/E3).
 */
import { describe, it, expect } from 'vitest';
import {
  canonicalizeUrl,
  sameCanonicalUrl,
} from '../../../supabase/functions/_shared/evidence/url-normalize';

describe('canonicalizeUrl', () => {
  it('lowercases scheme and host', () => {
    const r = canonicalizeUrl('HTTPS://Example.COM/Path');
    expect(r.ok).toBe(true);
    expect(r.canonicalUrl).toBe('https://example.com/Path');
  });

  it('strips a leading www.', () => {
    const r = canonicalizeUrl('https://www.example.com/foo');
    expect(r.canonicalUrl).toBe('https://example.com/foo');
  });

  it('strips default ports but keeps non-default ports', () => {
    expect(canonicalizeUrl('https://example.com:443/foo').canonicalUrl).toBe(
      'https://example.com/foo',
    );
    expect(canonicalizeUrl('http://example.com:80/foo').canonicalUrl).toBe(
      'http://example.com/foo',
    );
    expect(canonicalizeUrl('https://example.com:8443/foo').canonicalUrl).toBe(
      'https://example.com:8443/foo',
    );
  });

  it('strips a trailing slash but preserves bare root as /', () => {
    expect(canonicalizeUrl('https://example.com/foo/').canonicalUrl).toBe(
      'https://example.com/foo',
    );
    expect(canonicalizeUrl('https://example.com').canonicalUrl).toBe('https://example.com/');
    expect(canonicalizeUrl('https://example.com/').canonicalUrl).toBe('https://example.com/');
  });

  it('drops the fragment', () => {
    expect(canonicalizeUrl('https://example.com/foo#section-2').canonicalUrl).toBe(
      'https://example.com/foo',
    );
  });

  it('strips every known tracking parameter', () => {
    const r = canonicalizeUrl(
      'https://example.com/article?utm_source=x&utm_medium=y&utm_campaign=z&fbclid=abc&gclid=def&mc_cid=g&ref=h',
    );
    expect(r.canonicalUrl).toBe('https://example.com/article');
  });

  it('keeps real, content-identifying query parameters and sorts them deterministically', () => {
    const r1 = canonicalizeUrl('https://example.com/search?b=2&a=1&utm_source=x');
    const r2 = canonicalizeUrl('https://example.com/search?utm_source=y&a=1&b=2');
    expect(r1.canonicalUrl).toBe('https://example.com/search?a=1&b=2');
    expect(r1.canonicalUrl).toBe(r2.canonicalUrl);
  });

  it('rejects non-http(s) schemes', () => {
    expect(canonicalizeUrl('ftp://example.com/foo').ok).toBe(false);
    expect(canonicalizeUrl('javascript:alert(1)').ok).toBe(false);
    expect(canonicalizeUrl('data:text/html,hi').ok).toBe(false);
  });

  it('rejects unparseable input without throwing', () => {
    expect(canonicalizeUrl('').ok).toBe(false);
    expect(canonicalizeUrl('not a url at all').ok).toBe(false);
    // @ts-expect-error -- intentionally testing non-string input
    expect(canonicalizeUrl(null).ok).toBe(false);
    // @ts-expect-error -- intentionally testing non-string input
    expect(canonicalizeUrl(undefined).ok).toBe(false);
  });

  it('never throws on adversarial input', () => {
    const adversarial = [
      'https://',
      'http://[::1',
      'https://user:pass@example.com/@evil.com',
      '   ',
      'https://example.com/' + 'a'.repeat(5000),
    ];
    for (const input of adversarial) {
      expect(() => canonicalizeUrl(input)).not.toThrow();
    }
  });

  it('does NOT treat different paths as the same document', () => {
    expect(sameCanonicalUrl('https://example.com/a', 'https://example.com/b')).toBe(false);
  });
});

describe('sameCanonicalUrl', () => {
  it('treats a tracked and untracked link to the same article as identical', () => {
    expect(
      sameCanonicalUrl(
        'https://news.example.com/story/123',
        'https://www.news.example.com/story/123/?utm_source=twitter&utm_medium=social',
      ),
    ).toBe(true);
  });

  it('returns false when either side is unparseable', () => {
    expect(sameCanonicalUrl('not-a-url', 'https://example.com')).toBe(false);
    expect(sameCanonicalUrl('https://example.com', 'not-a-url')).toBe(false);
  });
});
