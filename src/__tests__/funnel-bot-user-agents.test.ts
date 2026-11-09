import { describe, expect, it } from 'vitest';
import { isBotUserAgent } from '@/lib/analytics';

// 2026-11-08 production audit: Google PageSpeed (Lighthouse) runs from growth-sync
// and Googlebot renders were counted as "external" funnel sessions (Nov 7: 50
// funnel sessions vs 1 GA4 session). These user agents must never reach the funnel.
describe('isBotUserAgent', () => {
  const bots = [
    // PageSpeed Insights mobile + desktop (Lighthouse)
    'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Chrome-Lighthouse',
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36 (compatible; Google-InspectionTool/1.0;)',
    'Mozilla/5.0 (compatible; GoogleOther)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/138.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 PTST/250101.123456',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 GTmetrix',
  ];
  const people = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0',
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
  ];

  it.each(bots)('treats %s as a bot', (ua) => {
    expect(isBotUserAgent(ua)).toBe(true);
  });

  it.each(people)('treats %s as a person', (ua) => {
    expect(isBotUserAgent(ua)).toBe(false);
  });

  it('treats a missing user agent as a person (no data, no exclusion)', () => {
    expect(isBotUserAgent('')).toBe(false);
    expect(isBotUserAgent(undefined)).toBe(false);
  });
});
