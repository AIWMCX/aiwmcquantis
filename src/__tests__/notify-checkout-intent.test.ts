import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderEmail, offerLabel, type IntentSession } from '../../supabase/functions/notify-checkout-intent/format';

const base: IntentSession = {
  session_id: 's-1',
  clicks: [{ created_at: '2026-10-12T22:47:38Z', offer: 'founder_decision_review', surface: 'decision_review_page' }],
  events: [{ event_name: 'home_view', path: '/', created_at: '2026-10-12T22:40:00Z' }],
  channel: 'linkedin / social', landing_path: '/demo/hiring-decision', referrer: null, utm: 'demo_posts',
  user_email: null, completed: [],
};

describe('checkout intent email', () => {
  it('names the offer with its price and flags missing payment', () => {
    const e = renderEmail([base]);
    expect(e.subject).toBe('Checkout started: A visitor clicked Founder Decision Review ($349)');
    expect(e.html).toContain('No payment recorded yet');
    expect(e.html).toContain('linkedin / social');
    expect(e.html).toContain('Oct 12, 4:47 PM MT');
  });
  it('shows a recorded payment and escapes untrusted values', () => {
    const e = renderEmail([{ ...base, completed: ['founder_decision_review at 22:50 UTC'], landing_path: '/<script>' }]);
    expect(e.html).toContain('Payment recorded');
    expect(e.html).not.toContain('<script>');
  });
  it('labels the consultant pilot and unknown offers', () => {
    expect(offerLabel('consultant_founding_pilot')).toBe('Consultant Founding Pilot ($499)');
    expect(offerLabel('mystery')).toBe('mystery');
  });
});

describe('notify-checkout-intent wiring', () => {
  const src = readFileSync('supabase/functions/notify-checkout-intent/index.ts', 'utf8');
  it('is cron-secret protected, excludes internal sessions, dedupes after sending', () => {
    expect(src).toContain("req.headers.get('x-cron-secret') !== expected");
    expect(src).toContain(".eq('is_internal', false)");
    expect(src.indexOf("api.resend.com")).toBeLessThan(src.indexOf("from('checkout_intent_alerts').upsert"));
  });
  it('is listed for production deploy', () => {
    expect(readFileSync('.github/workflows/production-deploy.yml', 'utf8')).toContain('            notify-checkout-intent');
  });
});
