/**
 * Quantis Evidence Service — SSRF / content-size / MIME guards (PR E1/E3,
 * master prompt section 37: "HTML retrieval is hostile input. Never
 * execute retrieved scripts.").
 *
 * NOT wired into any live code path yet. This module exists so that
 * whenever the Evidence Service eventually needs to fetch a URL directly
 * (rather than going through a provider API), it has no choice but to go
 * through `safeFetch`, which:
 *
 *   1. Rejects non-http(s) schemes.
 *   2. Rejects private/loopback/link-local/metadata-endpoint hosts, both
 *      by literal IP and by well-known internal hostnames -- the classic
 *      SSRF target list, including the cloud-metadata IP
 *      (169.254.169.254) that has been the root cause of a large fraction
 *      of real-world SSRF-to-credential-theft incidents.
 *   3. Re-validates the target of every redirect before following it
 *      (redirect-based SSRF bypass is the most common way a naive
 *      URL-only check gets defeated).
 *   3b. Resolves every hostname (initial URL AND every redirect target) to
 *      its actual A/AAAA records and checks EVERY resolved IP against the
 *      same private/link-local/metadata denylist -- catches a domain name
 *      that simply resolves to an internal address, which a literal-string
 *      check alone cannot see. See `validateOutboundUrlWithDns`'s own
 *      doc comment for the honest, explicitly-stated limitation this does
 *      NOT close (true DNS-rebinding race condition against fetch()'s own
 *      internal re-resolution at connect time).
 *   4. Enforces a hard redirect-count limit.
 *   5. Enforces a hard timeout.
 *   6. Enforces a MIME allowlist on the response Content-Type.
 *   7. Enforces a hard byte cap on the response body, checked against
 *      both the Content-Length header (fast-path) and the actual bytes
 *      read (defends against a server that lies about or omits
 *      Content-Length).
 *
 * This is deliberately conservative. A retrieval target this rejects can
 * be added to an explicit allowlist later with a reviewed reason -- it
 * must never be loosened by weakening the default check.
 */

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_MAX_CONTENT_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_PREFIXES = [
  'text/html',
  'text/plain',
  'application/json',
  'application/xml',
  'text/xml',
];

/** Well-known internal/metadata hostnames blocked regardless of DNS/IP resolution details. */
const BLOCKED_HOSTNAME_SUFFIXES = ['.local', '.internal', '.localdomain'];
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
]);

export interface HostSafetyResult {
  safe: boolean;
  reason?: string;
}

function isIPv4(host: string): boolean {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
}

function ipv4Octets(host: string): number[] {
  return host.split('.').map((n) => Number(n));
}

/**
 * Checks a hostname/IP literal against the standard private/loopback/
 * link-local/reserved ranges. Deliberately does NOT perform DNS
 * resolution (that would require an async network call inside a
 * "should I even attempt to fetch" check, and DNS answers can change
 * between check-time and fetch-time -- true SSRF-proof handling requires
 * validating the IP actually connected to, which callers with a runtime
 * that exposes that -- e.g. a custom Deno.connect -- should layer on top
 * of this. This function covers the literal-IP and known-hostname case,
 * which is the large majority of naive SSRF attempts against providers
 * that return raw URLs.)
 */
export function isPrivateOrDangerousHost(hostname: string): HostSafetyResult {
  const host = hostname.toLowerCase().trim();

  if (BLOCKED_HOSTNAMES.has(host)) {
    return { safe: false, reason: `Blocked hostname: ${host}` };
  }
  for (const suffix of BLOCKED_HOSTNAME_SUFFIXES) {
    if (host.endsWith(suffix)) {
      return { safe: false, reason: `Blocked hostname suffix: ${suffix}` };
    }
  }

  if (host === '0.0.0.0' || host === '::' || host === '::1') {
    return { safe: false, reason: 'Loopback / unspecified address' };
  }

  if (isIPv4(host)) {
    const [a, b] = ipv4Octets(host);
    if (a === 127) return { safe: false, reason: 'Loopback IPv4 range (127.0.0.0/8)' };
    if (a === 10) return { safe: false, reason: 'Private IPv4 range (10.0.0.0/8)' };
    if (a === 172 && b >= 16 && b <= 31) return { safe: false, reason: 'Private IPv4 range (172.16.0.0/12)' };
    if (a === 192 && b === 168) return { safe: false, reason: 'Private IPv4 range (192.168.0.0/16)' };
    if (a === 169 && b === 254) {
      return { safe: false, reason: 'Link-local IPv4 range (169.254.0.0/16) -- includes cloud metadata endpoints' };
    }
    if (a === 100 && b >= 64 && b <= 127) return { safe: false, reason: 'Carrier-grade NAT range (100.64.0.0/10)' };
  }

  // IPv6 private/link-local ranges (unique local fc00::/7, link-local fe80::/10).
  if (host.includes(':')) {
    const normalized = host.replace(/^\[|\]$/g, '');
    if (/^f[cd][0-9a-f]{2}:/i.test(normalized)) {
      return { safe: false, reason: 'Unique-local IPv6 range (fc00::/7)' };
    }
    if (/^fe[89ab][0-9a-f]:/i.test(normalized)) {
      return { safe: false, reason: 'Link-local IPv6 range (fe80::/10)' };
    }
  }

  return { safe: true };
}

export interface UrlValidationResult {
  ok: boolean;
  reason?: string;
}

/** Static (no DNS) check: scheme + literal-IP/known-hostname denylist only. */
export function validateOutboundUrl(rawUrl: string): UrlValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'UNPARSEABLE_URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: `UNSUPPORTED_SCHEME: ${parsed.protocol}` };
  }

  const hostCheck = isPrivateOrDangerousHost(parsed.hostname);
  if (!hostCheck.safe) {
    return { ok: false, reason: hostCheck.reason };
  }

  return { ok: true };
}

// ============================================================
// DNS-resolution-aware validation (defends against a domain name that
// resolves to a private/link-local/metadata IP, which validateOutboundUrl
// above cannot catch since it only inspects the literal hostname string).
// ============================================================

export type DnsResolver = (hostname: string) => Promise<string[]>;

function isLiteralIp(hostname: string): boolean {
  return isIPv4(hostname) || hostname.includes(':');
}

/**
 * Resolves a hostname to every A/AAAA record it has. Runtime-detects Deno
 * vs. Node so this one function works both in the edge runtime and under
 * Vitest. Returns an empty array (never throws) if resolution fails for
 * both record types -- the caller treats "could not resolve" as unsafe
 * (fail closed), matching this module's overall conservative posture.
 */
export const defaultDnsResolver: DnsResolver = async (hostname) => {
  const results: string[] = [];

  // Deno edge runtime.
  const denoGlobal = (globalThis as { Deno?: { resolveDns?: (h: string, t: string) => Promise<string[]> } }).Deno;
  if (denoGlobal?.resolveDns) {
    await Promise.allSettled([
      denoGlobal.resolveDns(hostname, 'A').then((ips) => results.push(...ips)),
      denoGlobal.resolveDns(hostname, 'AAAA').then((ips) => results.push(...ips)),
    ]);
    return results;
  }

  // Node / Vitest.
  try {
    const dns = await import('node:dns/promises');
    await Promise.allSettled([
      dns.resolve4(hostname).then((ips) => results.push(...ips)),
      dns.resolve6(hostname).then((ips) => results.push(...ips)),
    ]);
  } catch {
    // node:dns/promises unavailable in this runtime -- fall through with
    // whatever (possibly empty) results were gathered.
  }
  return results;
};

/**
 * DNS-resolution-aware validation. Rejects a hostname if ANY resolved IP
 * (not just the literal string, which `validateOutboundUrl` already
 * checks) falls in a private/loopback/link-local/reserved range --
 * catches the case where an attacker-controlled or compromised DNS name
 * (e.g. a shortlink service, or a domain the attacker fully controls)
 * points at an internal address rather than passing a raw IP directly.
 *
 * HONEST LIMITATION (do not remove this comment when refactoring): this
 * is a resolve-then-check pattern, not IP-pinned transport. A classic DNS
 * rebinding attack changes the DNS answer BETWEEN this check and the
 * moment the underlying `fetch()` implementation performs its own,
 * separate DNS resolution to actually connect -- there is a real,
 * unavoidable time-of-check-to-time-of-use gap here that this function
 * does not close. Full protection requires pinning the exact IP address
 * at the socket/transport layer (e.g. a custom low-level connect that
 * bypasses fetch()'s internal resolution and separately verifies the TLS
 * certificate/Host header match the intended hostname), which is a
 * larger, platform-specific undertaking deliberately out of scope for
 * this pass. This function still meaningfully raises the bar against the
 * overwhelming majority of real-world SSRF attempts (a domain that simply
 * *is* configured to resolve to an internal address, checked at request
 * time, with a short-lived window rather than an attacker needing to
 * race a rebind against every single request) -- it should be treated as
 * defense-in-depth, not a complete guarantee.
 */
export async function validateOutboundUrlWithDns(
  rawUrl: string,
  resolver: DnsResolver = defaultDnsResolver,
): Promise<UrlValidationResult> {
  const staticCheck = validateOutboundUrl(rawUrl);
  if (!staticCheck.ok) return staticCheck;

  const parsed = new URL(rawUrl);
  if (isLiteralIp(parsed.hostname)) {
    // Already fully covered by the static check above -- no DNS lookup needed.
    return { ok: true };
  }

  let resolvedIps: string[];
  try {
    resolvedIps = await resolver(parsed.hostname);
  } catch {
    return { ok: false, reason: `DNS_RESOLUTION_FAILED: could not resolve ${parsed.hostname}` };
  }

  if (resolvedIps.length === 0) {
    return { ok: false, reason: `DNS_RESOLUTION_EMPTY: ${parsed.hostname} resolved to no addresses` };
  }

  for (const ip of resolvedIps) {
    const ipCheck = isPrivateOrDangerousHost(ip);
    if (!ipCheck.safe) {
      return {
        ok: false,
        reason: `${parsed.hostname} resolves to a disallowed address ${ip}: ${ipCheck.reason}`,
      };
    }
  }

  return { ok: true };
}

export class SsrfGuardViolationError extends Error {
  constructor(url: string, reason: string) {
    super(`Refused to fetch "${url}": ${reason}`);
    this.name = 'SsrfGuardViolationError';
  }
}

export class ContentPolicyViolationError extends Error {
  constructor(reason: string) {
    super(`Response rejected by content policy: ${reason}`);
    this.name = 'ContentPolicyViolationError';
  }
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  maxContentBytes?: number;
  allowedMimePrefixes?: string[];
  /** Injectable for testing; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Injectable for testing; defaults to real DNS resolution (Deno or Node, auto-detected). */
  dnsResolver?: DnsResolver;
}

/**
 * The single sanctioned way to fetch an arbitrary, provider-returned URL.
 * Throws `SsrfGuardViolationError` before ever issuing a request to an
 * unsafe target, and `ContentPolicyViolationError` if the response
 * violates the MIME/size policy. Returns the body text on success.
 */
export async function safeFetch(
  url: string,
  options: SafeFetchOptions = {},
): Promise<{ text: string; finalUrl: string; contentType: string | null }> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
  const maxContentBytes = options.maxContentBytes ?? DEFAULT_MAX_CONTENT_BYTES;
  const allowedMimePrefixes = options.allowedMimePrefixes ?? ALLOWED_MIME_PREFIXES;
  const doFetch = options.fetchImpl ?? fetch;
  const resolver = options.dnsResolver ?? defaultDnsResolver;

  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    // DNS-aware check on every hop, including redirect targets -- a
    // redirect to a domain that resolves to an internal address is just
    // as dangerous as a redirect to a literal private IP.
    const check = await validateOutboundUrlWithDns(currentUrl, resolver);
    if (!check.ok) {
      throw new SsrfGuardViolationError(currentUrl, check.reason ?? 'unknown');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await doFetch(currentUrl, {
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    // `redirect: 'manual'` yields an opaqueredirect response in browser
    // fetch implementations, but Deno's fetch (and undici/Node's fetch,
    // which vitest's environment uses) surfaces a normal 3xx response we
    // can inspect -- handle both by checking status range and a Location
    // header when present.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new SsrfGuardViolationError(currentUrl, `Redirect status ${response.status} with no Location header`);
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue; // Loop re-validates the new URL before following it.
    }

    const contentType = response.headers.get('content-type');
    const mimeOk = contentType
      ? allowedMimePrefixes.some((prefix) => contentType.toLowerCase().startsWith(prefix))
      : false;
    if (!mimeOk) {
      throw new ContentPolicyViolationError(`Disallowed or missing content-type: ${contentType ?? '(none)'}`);
    }

    const contentLengthHeader = response.headers.get('content-length');
    if (contentLengthHeader && Number(contentLengthHeader) > maxContentBytes) {
      throw new ContentPolicyViolationError(
        `Content-Length ${contentLengthHeader} exceeds the ${maxContentBytes}-byte cap`,
      );
    }

    const text = await response.text();
    // Defends against a server omitting/lying about Content-Length.
    const actualBytes = new TextEncoder().encode(text).length;
    if (actualBytes > maxContentBytes) {
      throw new ContentPolicyViolationError(
        `Response body (${actualBytes} bytes) exceeds the ${maxContentBytes}-byte cap after the fact`,
      );
    }

    return { text, finalUrl: currentUrl, contentType };
  }

  throw new SsrfGuardViolationError(url, `Exceeded max redirect count (${maxRedirects})`);
}
