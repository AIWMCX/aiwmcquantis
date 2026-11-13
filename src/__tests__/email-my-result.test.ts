import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  LIMITS,
  parseResultEmailRequest,
  renderResultEmail,
  resultEmailLink,
} from '../../supabase/functions/_shared/result-email';

// "Email me this result" [F3, M5]: the old post-analysis newsletter box
// captured 1 email ever. These tests lock down what the endpoint may mail.
const ok = {
  email: 'owner@example.com',
  surface: 'hire_afford',
  title: 'Hiring at $62,000 a year',
  rows: [{ label: 'Lowest bank balance', value: '-$3,737 in month 6' }],
  path: '/demo/hiring-decision?own=1&c=54&fee=1000',
};

describe('email-my-result: request validation', () => {
  it('accepts a normal request', () => {
    const r = parseResultEmailRequest(ok);
    expect(r.ok).toBe(true);
  });

  it.each([
    ['bad email', { ...ok, email: 'not-an-email' }],
    ['unknown surface', { ...ok, surface: 'newsletter' }],
    ['no rows', { ...ok, rows: [] }],
    ['too many rows', { ...ok, rows: Array.from({ length: LIMITS.rows + 1 }, () => ok.rows[0]) }],
    ['empty value', { ...ok, rows: [{ label: 'x', value: '  ' }] }],
    ['external link', { ...ok, path: 'https://evil.example/x' }],
    ['protocol-relative link', { ...ok, path: '//evil.example/x' }],
    ['javascript link', { ...ok, path: 'javascript:alert(1)' }],
  ])('rejects %s', (_name, body) => {
    expect(parseResultEmailRequest(body).ok).toBe(false);
  });

  it('strips markup and caps lengths, so the endpoint cannot carry arbitrary content', () => {
    const r = parseResultEmailRequest({
      ...ok,
      title: '<a href="https://evil.example">click</a>' + 'x'.repeat(300),
      rows: [{ label: '<img src=x onerror=alert(1)>Label', value: 'v'.repeat(200) }],
    });
    if (!r.ok) throw new Error(r.error);
    expect(r.value.title).not.toContain('<');
    expect(r.value.title!.length).toBeLessThanOrEqual(LIMITS.title);
    expect(r.value.rows[0].label).not.toContain('<');
    expect(r.value.rows[0].value.length).toBeLessThanOrEqual(LIMITS.value);
  });
});

describe('email-my-result: rendered email', () => {
  const r = parseResultEmailRequest(ok);
  if (!r.ok) throw new Error('fixture');
  const mail = renderResultEmail(r.value);

  it('links only to our own site, with tracking', () => {
    expect(resultEmailLink('/app')).toBe('https://www.aiwmcquantis.com/app?utm_source=result_email&utm_medium=email&utm_campaign=email_my_result');
    const hrefs = [...mail.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBe(1);
    expect(hrefs[0].startsWith('https://www.aiwmcquantis.com/demo/hiring-decision?own=1&amp;')).toBe(true);
  });

  it('carries the rows, an invitation to reply, and honest disclaimers; no em dashes', () => {
    expect(mail.text).toContain('Lowest bank balance: -$3,737 in month 6');
    expect(mail.text).toContain('reply to this email');
    expect(mail.text).toContain('not checked facts');
    expect(mail.text).toContain('We will not add you to a mailing list');
    expect(mail.html + mail.text).not.toContain('—');
  });

  it('ships: deployed, public, and its funnel event is allowed', () => {
    expect(readFileSync('.github/workflows/production-deploy.yml', 'utf8')).toMatch(/^\s+email-my-result\s*$/m);
    expect(readFileSync('supabase/config.toml', 'utf8')).toMatch(/\[functions\.email-my-result\]\s+verify_jwt = false/);
    expect(readFileSync('supabase/migrations/20261113130000_funnel_event_result_emailed.sql', 'utf8')).toContain("'result_emailed'");
  });
});
