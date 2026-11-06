import { describe, expect, it } from 'vitest';
import {
  PUBLISHED_EMAIL_METHOD,
  appendEmailEvidence,
  candidatePaths,
  channelEmail,
  checkSameSiteUrl,
  classifyEmail,
  emailDomain,
  extractEmails,
  hasProtectedEmails,
  hostProblem,
  isEmailShape,
  isPublicIp,
  latestEmailEvidence,
  normalizeWebsite,
  publishedSiteEmails,
  robotsAllows,
  sameSite,
  siteDomain,
  withEmailChannel,
  type PublishedEmailEvidence,
} from '../../supabase/functions/_shared/commercial/published-email.ts';
// The outreach sender's own parser: what it reads out of contact_channel is the recipient.
import { extractAddresses } from '../../supabase/functions/_shared/mail/routing.ts';

/** Cloudflare's data-cfemail encoding (key byte, then each char XOR key), to prove we never decode it. */
function cfEncode(email: string, key = 0x5a): string {
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return hex(key) + Array.from(email).map((c) => hex(c.charCodeAt(0) ^ key)).join('');
}

const CF_PAGE = `
  <p>Write to <a href="/cdn-cgi/l/email-protection#${cfEncode('jane@acme.com')}"><span class="__cf_email__" data-cfemail="${cfEncode('jane@acme.com')}">[email&#160;protected]</span></a></p>
  <p><a href="/cdn-cgi/l/email-protection" class="__cf_email__" data-cfemail="${cfEncode('info@acme.com')}">[email&#160;protected]</a></p>
  <script data-cfasync="false" src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script>`;

const PAGES = [
  `<a href="mailto:Jane.Doe@Acme.com?subject=Hi">Email Jane</a><p>Office: INFO@acme.com · info@acme.com</p>`,
  `<img srcset="logo@2x.png 2x, hero@3x.webp 3x"><p>icon@2x.png sprite@3x.jpg team@acme.com font@2x.woff2</p>`,
  CF_PAGE,
  `<script>var e = "sales@acme.com"</script><style>.x{content:"css@acme.com"}</style><input placeholder="you@acme.com"><div data-email="ops@acme.com"></div>`,
  `<p>jane<wbr>doe@acme.com</p><p>&#106;ane@acme.com</p><p>info@acme.co&#109;</p><p>info&#64;acme.com</p><p>bob<span>@</span>acme.com</p>`,
  `<table><tr><td>Email</td><td>info@acme.com</td></tr></table><p>Email:&nbsp;billing@acme.com.</p>`,
  `<footer>Partner: Jane Doe. Visit acme.com or call (303) 555-0100.</footer>`,
  `<p>Questions? ask@acme.com, hello@gmail.com, owner@acme-agency.io, x@mail.acme.com</p>`,
];

describe('normalizeWebsite', () => {
  it('keeps only the http(s) origin of a public domain', () => {
    expect(normalizeWebsite('acme.com')).toEqual({ ok: true, origin: 'https://acme.com', host: 'acme.com' });
    expect(normalizeWebsite('https://www.Acme.com/contact?x=1#top')).toEqual({ ok: true, origin: 'https://www.acme.com', host: 'www.acme.com' });
    expect(normalizeWebsite('http://acme.com/')).toEqual({ ok: true, origin: 'http://acme.com', host: 'acme.com' });
    expect(normalizeWebsite('https://acme.com:443/about')).toMatchObject({ ok: true, origin: 'https://acme.com' });
  });

  it('rejects other schemes, credentials, ports and junk', () => {
    for (const bad of ['', 'acme .com', 'ftp://acme.com', 'javascript:alert(1)', 'mailto:jane@acme.com', 'file:///etc/passwd',
      'https://user:pw@acme.com', 'https://acme.com:8443', 'acme.com:8080', 'http://acme.com:443']) {
      expect(normalizeWebsite(bad).ok, bad).toBe(false);
    }
  });

  it('rejects IP literals in every spelling', () => {
    for (const ip of ['http://127.0.0.1', 'http://10.0.0.5/admin', 'http://169.254.169.254/latest/meta-data', 'http://[::1]/',
      'http://2130706433', 'http://0x7f.1', '8.8.8.8']) {
      const r = normalizeWebsite(ip);
      expect(r.ok, ip).toBe(false);
      if (!r.ok) expect(r.reason, ip).toMatch(/IP addresses/);
    }
  });

  it('rejects localhost, .local, .internal and other non-public names', () => {
    for (const host of ['localhost', 'http://localhost:3000', 'app.localhost', 'printer.local', 'db.internal', 'metadata.google.internal',
      'router.lan', 'intranet', 'foo.test', 'example.com', 'kubernetes.default.svc', 'a_b.com', '-acme.com']) {
      expect(normalizeWebsite(host).ok, host).toBe(false);
    }
  });

  it('never accepts LinkedIn or a social network as the firm\'s website', () => {
    for (const url of ['https://www.linkedin.com/in/jane-doe', 'linkedin.com', 'https://lnkd.in/abc', 'facebook.com/acme', 'https://x.com/acme']) {
      const r = normalizeWebsite(url);
      expect(r.ok, url).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/LinkedIn/);
    }
  });
});

describe('siteDomain / sameSite', () => {
  it('treats www and subdomains as the same site, nothing else', () => {
    expect(siteDomain('www.acme.com')).toBe('acme.com');
    expect(siteDomain('blog.acme.com')).toBe('blog.acme.com');
    expect(sameSite('acme.com', 'www.acme.com')).toBe(true);
    expect(sameSite('mail.acme.com', 'acme.com')).toBe(true);
    expect(sameSite('gmail.com', 'acme.com')).toBe(false);
    expect(sameSite('notacme.com', 'acme.com')).toBe(false);
    expect(sameSite('acme.com.evil.io', 'acme.com')).toBe(false);
    expect(sameSite('acme.com', 'blog.acme.com')).toBe(false); // a parent domain does not count
  });
});

describe('checkSameSiteUrl (pages and every redirect hop)', () => {
  it('allows relative and same-site redirects, drops the fragment', () => {
    const r = checkSameSiteUrl('/contact-us#form', 'acme.com', 'https://acme.com/contact');
    expect(r.ok && r.url.href).toBe('https://acme.com/contact-us');
    expect(checkSameSiteUrl('https://www.acme.com/about', 'acme.com').ok).toBe(true);
    expect(checkSameSiteUrl('http://acme.com/team', 'www.acme.com').ok).toBe(true);
  });

  it('refuses off-site, IP, port and non-http redirects', () => {
    for (const href of ['https://evil.com/', 'https://acme.com.evil.io/', 'http://127.0.0.1/', 'http://169.254.169.254/', 'https://acme.com:8080/',
      'ftp://acme.com/', 'https://u:p@acme.com/', 'https://www.linkedin.com/company/acme', 'http://localhost/']) {
      expect(checkSameSiteUrl(href, 'acme.com').ok, href).toBe(false);
    }
  });
});

describe('isPublicIp (checked on resolved addresses)', () => {
  it('accepts global unicast', () => {
    for (const ip of ['8.8.8.8', '104.16.1.1', '172.32.0.1', '2606:4700::6810:84e5', '2001:4860:4860::8888']) expect(isPublicIp(ip), ip).toBe(true);
  });

  it('rejects private, loopback, link-local, metadata and special ranges', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0',
      '224.0.0.1', '255.255.255.255', '192.0.2.1', '::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1',
      '2001:db8::1', '2002:a00:1::1', 'not-an-ip']) {
      expect(isPublicIp(ip), ip).toBe(false);
    }
  });

  it('hostProblem allows a public name (DNS is checked separately)', () => {
    expect(hostProblem('www.acme.com')).toBeNull();
    expect(hostProblem('xn--caf-dma.com')).toBeNull();
  });
});

describe('robotsAllows (RFC 9309, User-agent *)', () => {
  it('no file or an empty Disallow allows everything', () => {
    expect(robotsAllows('', '/contact')).toBe(true);
    expect(robotsAllows('User-agent: *\nDisallow:', '/contact')).toBe(true);
  });

  it('Disallow: / blocks every candidate page', () => {
    for (const path of candidatePaths) expect(robotsAllows('User-agent: *\nDisallow: /', path), path).toBe(false);
  });

  it('only groups for us or for * apply', () => {
    expect(robotsAllows('User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nAllow: /', '/contact')).toBe(true);
    expect(robotsAllows('User-agent: bingbot\nUser-agent: *\nDisallow: /about', '/about')).toBe(false);
    expect(robotsAllows('User-agent: *\nAllow: /\n\nUser-agent: AIWMC\nDisallow: /', '/')).toBe(false);
  });

  it('longest match wins, Allow wins a tie, * and $ work, comments and CRLF are ignored', () => {
    const rules = 'User-agent: *\nDisallow: /contact\nAllow: /contact-us';
    expect(robotsAllows(rules, '/contact')).toBe(false);
    expect(robotsAllows(rules, '/contact-us')).toBe(true);
    expect(robotsAllows(rules, '/about')).toBe(true);
    expect(robotsAllows('User-agent: *\nDisallow: /team\nAllow: /team', '/team')).toBe(true);
    expect(robotsAllows('User-agent: *\nDisallow: /*.php$', '/index.php')).toBe(false);
    expect(robotsAllows('User-agent: *\nDisallow: /*.php$', '/index.php?x=1')).toBe(true);
    expect(robotsAllows('User-agent: *\nDisallow: /*/private', '/team/private')).toBe(false);
    expect(robotsAllows('﻿User-agent: * # everyone\r\nDisallow: /team # not this\r\n', '/team')).toBe(false);
  });
});

describe('extractEmails', () => {
  it('reads mailto links and visible text, lower-cased and de-duplicated', () => {
    expect(extractEmails(PAGES[0])).toEqual(['jane.doe@acme.com', 'info@acme.com']);
    expect(extractEmails(PAGES[5])).toEqual(['info@acme.com', 'billing@acme.com']);
  });

  it('drops asset false positives like name@2x.png', () => {
    expect(extractEmails(PAGES[1])).toEqual(['team@acme.com']);
  });

  it('skips Cloudflare-protected addresses and never decodes them', () => {
    expect(extractEmails(CF_PAGE)).toEqual([]);
    expect(hasProtectedEmails(CF_PAGE)).toBe(true);
    expect(hasProtectedEmails(PAGES[0])).toBe(false);
  });

  it('ignores scripts, styles and attribute values', () => {
    expect(extractEmails(PAGES[3])).toEqual([]);
  });

  it('drops an address split by markup or entities instead of returning a fragment', () => {
    const found = extractEmails(PAGES[4]);
    for (const fragment of ['doe@acme.com', 'ane@acme.com', 'info@acme.co', 'info@acme.com', 'bob@acme.com']) expect(found).not.toContain(fragment);
    expect(found).toEqual([]);
  });

  it('never constructs an address from a name and a domain', () => {
    expect(extractEmails(PAGES[6])).toEqual([]);
  });

  it('never produces an address that is not literally in the HTML', () => {
    for (const html of PAGES) {
      for (const email of extractEmails(html)) expect(html.toLowerCase(), email).toContain(email);
    }
  });

  it('keeps only the site\'s own domain (off-domain addresses dropped)', () => {
    expect(extractEmails(PAGES[7])).toEqual(['ask@acme.com', 'hello@gmail.com', 'owner@acme-agency.io', 'x@mail.acme.com']);
    expect(publishedSiteEmails(PAGES[7], 'www.acme.com')).toEqual(['ask@acme.com', 'x@mail.acme.com']);
    expect(publishedSiteEmails(PAGES[7], 'other.com')).toEqual([]);
    expect(emailDomain('x@mail.acme.com')).toBe('mail.acme.com');
  });

  it('isEmailShape accepts exactly one plain address', () => {
    expect(isEmailShape('jane@acme.com')).toBe(true);
    expect(isEmailShape('jane@acme')).toBe(false);
    expect(isEmailShape('jane@acme.com bob@acme.com')).toBe(false);
    expect(isEmailShape('.jane@acme.com')).toBe(false);
  });
});

describe('classifyEmail', () => {
  it('personal when the local part is the person\'s name', () => {
    for (const local of ['jane', 'jane.doe', 'jdoe', 'janed', 'doe', 'jane_doe', 'doej', 'jane+news']) {
      expect(classifyEmail(local, 'Jane Doe'), local).toBe('personal');
    }
    expect(classifyEmail('jane.doe', 'Jane A. Doe, CPA')).toBe('personal');
    expect(classifyEmail('zoe.bronte', 'Zoë Brontë')).toBe('personal');
    expect(classifyEmail('mark', 'Mark Lee')).toBe('personal');
  });

  it('role for shared inboxes, checked before names', () => {
    for (const local of ['info', 'hello', 'office', 'sales-team', 'office.denver', 'contact']) expect(classifyEmail(local, 'Jane Doe'), local).toBe('role');
    expect(classifyEmail('marketing', 'Mark Lee')).toBe('role');
  });

  it('other for anyone else', () => {
    expect(classifyEmail('bob', 'Jane Doe')).toBe('other');
    expect(classifyEmail('jane', null)).toBe('other');
  });
});

describe('storage on the prospect', () => {
  const LI = 'linkedin:https://www.linkedin.com/in/jane-doe';

  it('puts the address in contact_channel where the sender reads it, keeping the LinkedIn URL', () => {
    const r = withEmailChannel(LI, 'jane@acme.com');
    expect(r).toEqual({ ok: true, channel: `email:jane@acme.com ${LI}` });
    if (!r.ok) return;
    expect(r.channel).toContain('https://www.linkedin.com/in/jane-doe');
    expect(extractAddresses(r.channel)[0]).toBe('jane@acme.com');
    expect(channelEmail(r.channel)).toBe('jane@acme.com');
    expect(channelEmail(LI)).toBeNull();
  });

  it('is idempotent for the same address and refuses to overwrite a different one', () => {
    expect(withEmailChannel(null, 'jane@acme.com')).toEqual({ ok: true, channel: 'email:jane@acme.com' });
    expect(withEmailChannel(`email:jane@acme.com ${LI}`, 'jane@acme.com')).toEqual({ ok: true, channel: `email:jane@acme.com ${LI}` });
    expect(withEmailChannel(`email:old@acme.com ${LI}`, 'jane@acme.com')).toEqual({ ok: false, existing: 'old@acme.com' });
  });

  it('appends one evidence entry per address and finds it again', () => {
    const entry: PublishedEmailEvidence = {
      email: 'jane@acme.com', email_source_url: 'https://acme.com/contact', email_kind: 'personal', found_at: '2026-11-05T00:00:00.000Z', method: PUBLISHED_EMAIL_METHOD,
    };
    const once = appendEmailEvidence(['Posted about cash flow'], entry);
    expect(once).toEqual(['Posted about cash flow', entry]);
    const twice = appendEmailEvidence(once, { ...entry, found_at: '2026-11-06T00:00:00.000Z' });
    expect(twice).toHaveLength(2);
    expect(appendEmailEvidence(null, entry)).toEqual([entry]);
    expect(latestEmailEvidence(twice, 'jane@acme.com')?.found_at).toBe('2026-11-06T00:00:00.000Z');
    expect(latestEmailEvidence(twice, 'bob@acme.com')).toBeNull();
    expect(entry.method).toBe('published_on_own_site');
  });
});
