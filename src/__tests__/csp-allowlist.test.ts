import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// #135: the CSP allows only hosts the site still loads from.
describe('Content-Security-Policy allowlist', () => {
  const csp = readFileSync('vercel.json', 'utf8');

  it.each(['createcdn.com', 'cdn.jsdelivr.net', 'posthog.com'])('no longer allows %s', (host) => {
    expect(csp).not.toContain(host);
  });

  it('still allows the hosts index.html loads', () => {
    for (const host of ['www.googletagmanager.com', 'www.clarity.ms', 'assets.apollo.io', 'api.fontshare.com']) {
      expect(csp).toContain(host);
    }
  });
});
