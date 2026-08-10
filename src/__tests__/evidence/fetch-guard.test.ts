/**
 * Quantis Evidence Service — fetch-guard.ts regression suite (PR E1/E3).
 *
 * `safeFetch` tests inject both a mocked `fetchImpl` AND a mocked
 * `dnsResolver` -- no real network calls or real DNS lookups are made by
 * this suite. `mockResolver` below stands in for "example.com resolves to
 * an ordinary public IP," so tests exercise the DNS-check code path
 * without depending on live DNS.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  isPrivateOrDangerousHost,
  validateOutboundUrl,
  validateOutboundUrlWithDns,
  safeFetch,
  SsrfGuardViolationError,
  ContentPolicyViolationError,
  type DnsResolver,
} from '../../../supabase/functions/_shared/evidence/fetch-guard';

/** Resolves every hostname to a single, unambiguously-public IP. */
const mockResolver: DnsResolver = async () => ['93.184.216.34'];

describe('isPrivateOrDangerousHost', () => {
  it('blocks loopback', () => {
    expect(isPrivateOrDangerousHost('127.0.0.1').safe).toBe(false);
    expect(isPrivateOrDangerousHost('localhost').safe).toBe(false);
    expect(isPrivateOrDangerousHost('::1').safe).toBe(false);
  });

  it('blocks the cloud-metadata link-local range (169.254.0.0/16), including the exact well-known metadata IP', () => {
    expect(isPrivateOrDangerousHost('169.254.169.254').safe).toBe(false);
    expect(isPrivateOrDangerousHost('169.254.1.1').safe).toBe(false);
  });

  it('blocks RFC1918 private ranges', () => {
    expect(isPrivateOrDangerousHost('10.0.0.5').safe).toBe(false);
    expect(isPrivateOrDangerousHost('172.16.0.5').safe).toBe(false);
    expect(isPrivateOrDangerousHost('172.31.255.255').safe).toBe(false);
    expect(isPrivateOrDangerousHost('192.168.1.1').safe).toBe(false);
  });

  it('does NOT block 172.x outside the 16-31 private sub-range (172.32.x is public)', () => {
    expect(isPrivateOrDangerousHost('172.32.0.1').safe).toBe(true);
    expect(isPrivateOrDangerousHost('172.15.0.1').safe).toBe(true);
  });

  it('blocks well-known internal hostnames and suffixes', () => {
    expect(isPrivateOrDangerousHost('metadata.google.internal').safe).toBe(false);
    expect(isPrivateOrDangerousHost('printer.local').safe).toBe(false);
    expect(isPrivateOrDangerousHost('db.internal').safe).toBe(false);
  });

  it('blocks IPv6 unique-local and link-local ranges', () => {
    expect(isPrivateOrDangerousHost('fc00::1').safe).toBe(false);
    expect(isPrivateOrDangerousHost('fd12:3456::1').safe).toBe(false);
    expect(isPrivateOrDangerousHost('fe80::1').safe).toBe(false);
  });

  it('allows an ordinary public hostname and public IP', () => {
    expect(isPrivateOrDangerousHost('example.com').safe).toBe(true);
    expect(isPrivateOrDangerousHost('8.8.8.8').safe).toBe(true);
  });
});

describe('validateOutboundUrl', () => {
  it('rejects unparseable URLs without throwing', () => {
    expect(validateOutboundUrl('not a url').ok).toBe(false);
  });

  it('rejects non-http(s) schemes', () => {
    expect(validateOutboundUrl('file:///etc/passwd').ok).toBe(false);
    expect(validateOutboundUrl('ftp://example.com').ok).toBe(false);
  });

  it('rejects a URL whose host is a private IP', () => {
    expect(validateOutboundUrl('http://127.0.0.1:8080/admin').ok).toBe(false);
    expect(validateOutboundUrl('http://169.254.169.254/latest/meta-data/').ok).toBe(false);
  });

  it('accepts an ordinary public https URL', () => {
    expect(validateOutboundUrl('https://example.com/article').ok).toBe(true);
  });
});

function fakeResponse(init: {
  status?: number;
  headers?: Record<string, string>;
  body?: string;
}): Response {
  return new Response(init.body ?? '', {
    status: init.status ?? 200,
    headers: init.headers ?? { 'content-type': 'text/html' },
  });
}

describe('validateOutboundUrlWithDns', () => {
  it('passes an ordinary domain that resolves only to public IPs', async () => {
    const result = await validateOutboundUrlWithDns('https://example.com/page', mockResolver);
    expect(result.ok).toBe(true);
  });

  it('rejects a domain that resolves to a private IP, even though the literal hostname string looks fine', async () => {
    const resolvesInternal: DnsResolver = async () => ['10.0.0.5'];
    const result = await validateOutboundUrlWithDns('https://looks-legit.example.com/x', resolvesInternal);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('10.0.0.5');
  });

  it('rejects a domain that resolves to the cloud-metadata address among multiple A records', async () => {
    const resolvesMixed: DnsResolver = async () => ['203.0.113.5', '169.254.169.254'];
    const result = await validateOutboundUrlWithDns('https://mixed.example.com/x', resolvesMixed);
    expect(result.ok).toBe(false);
  });

  it('skips DNS resolution entirely for a literal IP (already covered by the static check)', async () => {
    const resolverThatShouldNeverBeCalled: DnsResolver = vi.fn();
    const result = await validateOutboundUrlWithDns('https://8.8.8.8/x', resolverThatShouldNeverBeCalled);
    expect(result.ok).toBe(true);
    expect(resolverThatShouldNeverBeCalled).not.toHaveBeenCalled();
  });

  it('fails closed when DNS resolution throws', async () => {
    const throwingResolver: DnsResolver = async () => {
      throw new Error('NXDOMAIN');
    };
    const result = await validateOutboundUrlWithDns('https://nonexistent.example.invalid/x', throwingResolver);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('DNS_RESOLUTION_FAILED');
  });

  it('fails closed when DNS resolution returns zero addresses', async () => {
    const emptyResolver: DnsResolver = async () => [];
    const result = await validateOutboundUrlWithDns('https://empty.example.com/x', emptyResolver);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('DNS_RESOLUTION_EMPTY');
  });

  it('still rejects an unparseable URL or bad scheme before ever touching the resolver', async () => {
    const resolverThatShouldNeverBeCalled: DnsResolver = vi.fn();
    expect((await validateOutboundUrlWithDns('not a url', resolverThatShouldNeverBeCalled)).ok).toBe(false);
    expect((await validateOutboundUrlWithDns('ftp://example.com', resolverThatShouldNeverBeCalled)).ok).toBe(false);
    expect(resolverThatShouldNeverBeCalled).not.toHaveBeenCalled();
  });
});

describe('safeFetch', () => {
  it('refuses to call fetchImpl at all for an SSRF target (literal IP, no DNS lookup needed)', async () => {
    const fetchImpl = vi.fn();
    await expect(
      safeFetch('http://169.254.169.254/latest/meta-data/', { fetchImpl }),
    ).rejects.toThrow(SsrfGuardViolationError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refuses to call fetchImpl for a domain that DNS-resolves to a private address', async () => {
    const fetchImpl = vi.fn();
    const resolvesInternal: DnsResolver = async () => ['192.168.1.1'];
    await expect(
      safeFetch('https://rebind.example.com/x', { fetchImpl, dnsResolver: resolvesInternal }),
    ).rejects.toThrow(SsrfGuardViolationError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns the body text on a normal successful fetch', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse({ body: '<html>hello</html>', headers: { 'content-type': 'text/html; charset=utf-8' } }),
    );
    const result = await safeFetch('https://example.com/page', { fetchImpl, dnsResolver: mockResolver });
    expect(result.text).toBe('<html>hello</html>');
    expect(result.finalUrl).toBe('https://example.com/page');
  });

  it('follows a redirect to a safe URL and re-fetches it, re-checking DNS on the redirect target too', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse({ status: 302, headers: { location: 'https://example.com/final' } }))
      .mockResolvedValueOnce(fakeResponse({ body: 'final content' }));
    const result = await safeFetch('https://example.com/start', { fetchImpl, dnsResolver: mockResolver });
    expect(result.text).toBe('final content');
    expect(result.finalUrl).toBe('https://example.com/final');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('BLOCKS a redirect to a private/SSRF target instead of following it (redirect-based SSRF bypass, literal IP)', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse({ status: 302, headers: { location: 'http://169.254.169.254/secret' } }));
    await expect(
      safeFetch('https://example.com/start', { fetchImpl, dnsResolver: mockResolver }),
    ).rejects.toThrow(SsrfGuardViolationError);
  });

  it('BLOCKS a redirect to a domain that DNS-resolves to a private target (the actual DNS-rebinding-style redirect case)', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(fakeResponse({ status: 302, headers: { location: 'https://attacker-controlled.example.com/x' } }));
    const resolverThatFlipsPerHost: DnsResolver = async (hostname) =>
      hostname === 'attacker-controlled.example.com' ? ['169.254.169.254'] : ['93.184.216.34'];
    await expect(
      safeFetch('https://example.com/start', { fetchImpl, dnsResolver: resolverThatFlipsPerHost }),
    ).rejects.toThrow(SsrfGuardViolationError);
  });

  it('throws after exceeding the max redirect count', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse({ status: 302, headers: { location: 'https://example.com/loop' } }),
    );
    await expect(
      safeFetch('https://example.com/start', { fetchImpl, dnsResolver: mockResolver, maxRedirects: 2 }),
    ).rejects.toThrow(SsrfGuardViolationError);
    // 1 initial + maxRedirects(2) follow-up attempts = 3 calls before giving up.
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('rejects a disallowed MIME type', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse({ headers: { 'content-type': 'application/octet-stream' } }),
    );
    await expect(
      safeFetch('https://example.com/binary', { fetchImpl, dnsResolver: mockResolver }),
    ).rejects.toThrow(ContentPolicyViolationError);
  });

  it('rejects a response with no content-type at all', async () => {
    // The real Response constructor auto-defaults content-type to
    // text/plain for a string body, so this uses a minimal fake object
    // exposing only the subset of the Response surface safeFetch touches,
    // to genuinely exercise the "header truly absent" branch.
    const fetchImpl = vi.fn().mockResolvedValue({
      status: 200,
      headers: { get: (_name: string) => null },
      text: async () => 'body',
    });
    await expect(
      safeFetch('https://example.com/x', { fetchImpl, dnsResolver: mockResolver }),
    ).rejects.toThrow(ContentPolicyViolationError);
  });

  it('rejects via the Content-Length fast-path when it exceeds the cap', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse({ headers: { 'content-type': 'text/html', 'content-length': '99999999' } }),
    );
    await expect(
      safeFetch('https://example.com/huge', { fetchImpl, dnsResolver: mockResolver, maxContentBytes: 1000 }),
    ).rejects.toThrow(ContentPolicyViolationError);
  });

  it('rejects an oversized body even when Content-Length is absent or understated (lying server)', async () => {
    const bigBody = 'x'.repeat(2000);
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse({ body: bigBody, headers: { 'content-type': 'text/plain' } }),
    );
    await expect(
      safeFetch('https://example.com/lying', { fetchImpl, dnsResolver: mockResolver, maxContentBytes: 1000 }),
    ).rejects.toThrow(ContentPolicyViolationError);
  });

  it('accepts a custom allowedMimePrefixes list', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse({ headers: { 'content-type': 'application/pdf' }, body: 'pdf-bytes' }),
    );
    const result = await safeFetch('https://example.com/doc.pdf', {
      fetchImpl,
      dnsResolver: mockResolver,
      allowedMimePrefixes: ['application/pdf'],
    });
    expect(result.text).toBe('pdf-bytes');
  });
});
