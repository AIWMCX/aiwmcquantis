import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PIXEL_EVENT_MAP, isAdTrackingAllowed, trackAdEvent } from '@/lib/ad-pixels';
import type { SowFunnelEvent } from '@/lib/analytics';

describe('Meta / TikTok pixels', () => {
  it('only maps real funnel events, to standard events', () => {
    const meta = new Set(['PageView', 'ViewContent', 'CompleteRegistration', 'InitiateCheckout', 'Purchase', 'Lead']);
    const tt = new Set(['ViewContent', 'CompleteRegistration', 'InitiateCheckout', 'CompletePayment', 'SubmitForm']);
    const funnel = readFileSync('src/lib/analytics.ts', 'utf8');
    for (const [ev, [m, t]] of Object.entries(PIXEL_EVENT_MAP)) {
      expect(funnel).toContain(`'${ev}'`);
      expect(meta.has(m)).toBe(true);
      expect(tt.has(t)).toBe(true);
    }
    const typed: SowFunnelEvent = 'paid_checkout_complete';
    expect(PIXEL_EVENT_MAP[typed]).toEqual(['Purchase', 'CompletePayment']);
  });

  it('never runs off production, on /admin, or for internal QA sessions', () => {
    expect(isAdTrackingAllowed({ hostname: 'localhost', pathname: '/' })).toBe(false);
    expect(isAdTrackingAllowed({ hostname: 'aiwmcquantis-git-x.vercel.app', pathname: '/' })).toBe(false);
    expect(isAdTrackingAllowed({ hostname: 'www.aiwmcquantis.com', pathname: '/admin/funnel' })).toBe(false);
  });

  it('is a no-op until the pixels are started (no IDs set)', () => {
    expect(() => trackAdEvent('paid_checkout_start', { value: 349 })).not.toThrow();
    expect(window.fbq).toBeUndefined();
    expect(window.ttq).toBeUndefined();
  });

  it('privacy policy discloses both pixels', () => {
    const p = readFileSync('src/pages/Privacy.tsx', 'utf8');
    expect(p).toContain('Meta Pixel');
    expect(p).toContain('TikTok Pixel');
  });
});
