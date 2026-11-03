import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  isMarketingTemplate,
  listUnsubscribeHeaders,
  marketingSendDecision,
  MARKETING_POSTAL_ADDRESS_MISSING,
  postalAddressHold,
  postalAddressHtml,
} from '../../supabase/functions/_shared/email-compliance.ts';
import { OPT_OUT_LINE, withOptOutLine, withPostalAddress } from '../../supabase/functions/_shared/mail/compliance-footer.ts';
import { buildMessage } from '../../supabase/functions/_shared/mail/mime-build.ts';
import { isOptOut } from '../../supabase/functions/_shared/mail/routing.ts';

const read = (p: string) => readFileSync(p, 'utf8');

describe('marketing vs transactional templates', () => {
  it('engagement confirmations and account notices are transactional', () => {
    for (const k of ['cancellation_confirmed', 'founder_decision_review_intake', 'consultant_founding_pilot_intake', 'payment_failed_downgraded']) {
      expect(isMarketingTemplate(k), k).toBe(false);
    }
  });
  it('nurture, onboarding, win-back and unknown templates are marketing (fail-safe)', () => {
    for (const k of ['nurture_day_2', 'onboarding_step_1', 'winback_discount', 'weekly_pulse', 'some_new_template']) {
      expect(isMarketingTemplate(k), k).toBe(true);
    }
  });
});

describe('List-Unsubscribe headers (RFC 2369 / RFC 8058)', () => {
  it('wraps the URL and declares one-click', () => {
    expect(listUnsubscribeHeaders('https://x.supabase.co/functions/v1/confirm-email-subscription?action=unsubscribe&hash=ab')).toEqual({
      'List-Unsubscribe': '<https://x.supabase.co/functions/v1/confirm-email-subscription?action=unsubscribe&hash=ab>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
  });
});

describe('marketingSendDecision', () => {
  it('any opt-out blocks', () => {
    expect(marketingSendDecision({ suppressed: true, metadataOptIn: true }).allowed).toBe(false);
    expect(marketingSendDecision({ suppressed: false, profileOptIn: false, metadataOptIn: true }).allowed).toBe(false);
    expect(marketingSendDecision({ suppressed: false, profileOptIn: true, metadataOptIn: false }).allowed).toBe(false);
  });
  it('an explicit yes at signup allows', () => {
    expect(marketingSendDecision({ suppressed: false, profileOptIn: true, metadataOptIn: true }).allowed).toBe(true);
  });
  it('no recorded choice (pre-checkbox account or a confirmed lead) follows the profile flag', () => {
    expect(marketingSendDecision({ suppressed: false, profileOptIn: true }).allowed).toBe(true);
    expect(marketingSendDecision({ suppressed: false }).allowed).toBe(true);
    expect(marketingSendDecision({ suppressed: false, profileOptIn: false }).allowed).toBe(false);
  });
});

describe('postal address on commercial email', () => {
  it('holds marketing mail with no address, never transactional', () => {
    expect(postalAddressHold('nurture_day_2', null)).toBe(MARKETING_POSTAL_ADDRESS_MISSING);
    expect(postalAddressHold('nurture_day_2', '   ')).toBe(MARKETING_POSTAL_ADDRESS_MISSING);
    expect(postalAddressHold('nurture_day_2', '1234 Example St, Denver, CO 80202')).toBeNull();
    expect(postalAddressHold('founder_decision_review_intake', null)).toBeNull();
  });
  it('renders one escaped line with the legal entity', () => {
    expect(postalAddressHtml('1 Main St\nDenver, CO <80202>')).toBe('AIWMC LLC &middot; 1 Main St, Denver, CO &lt;80202&gt;');
  });
});

describe('outreach opt-out line', () => {
  it('is appended when a hand-edited draft lost it', () => {
    const out = withOptOutLine('Hi Ana,\n\nQuick question about your pricing.\n\nBogdan');
    expect(out.endsWith(OPT_OUT_LINE)).toBe(true);
  });
  it('is not doubled on a composed email, and matches the line composeOutboundEmail appends', () => {
    // first-touch.ts imports npm:zod (Deno-only), so compare its source instead of importing it.
    expect(read('supabase/functions/_shared/commercial/stages/first-touch.ts')).toContain(OPT_OUT_LINE);
    const composed = `Hi Ana,\n\nQuick question about your pricing.\n\nBogdan Jeltov\nAIWMC LLC\n\n${OPT_OUT_LINE}`;
    expect(withOptOutLine(composed)).toBe(composed);
  });
  it('keeps an existing unsubscribe instruction', () => {
    const d = 'Hello.\n\nReply "stop" and I will not email again.';
    expect(withOptOutLine(d)).toBe(d);
  });
  it('the line the footer promises is the line routing treats as an opt-out', () => {
    expect(OPT_OUT_LINE).toMatch(/reply "no"/);
    expect(isOptOut('no')).toBe(true);
    expect(isOptOut('', 'unsubscribe')).toBe(true); // what the mailto List-Unsubscribe produces
  });
  it('opt-out line comes before the postal address', () => {
    const t = withPostalAddress(withOptOutLine('Body'), '1234 Example St, Denver, CO 80202');
    expect(t.indexOf(OPT_OUT_LINE)).toBeLessThan(t.indexOf('1234 Example St'));
  });
});

describe('buildMessage List-Unsubscribe', () => {
  const base = { from: 'hello@aiwmcquantis.com', to: 'a@b.com', subject: 'Hi', text: 'x', messageId: '<1@aiwmcquantis.com>' };
  it('adds the header only when given', () => {
    expect(buildMessage({ ...base, listUnsubscribe: '<mailto:hello@aiwmcquantis.com?subject=unsubscribe>' }))
      .toContain('\r\nList-Unsubscribe: <mailto:hello@aiwmcquantis.com?subject=unsubscribe>\r\n');
    expect(buildMessage(base)).not.toContain('List-Unsubscribe');
  });
  it('refuses header injection', () => {
    expect(buildMessage({ ...base, listUnsubscribe: '<mailto:a@b.com>\r\nBcc: x@y.com' })).not.toContain('Bcc:');
  });
});

describe('wiring (static)', () => {
  it('outreach sends carry the opt-out line and List-Unsubscribe; support replies do not', () => {
    const p = read('supabase/functions/business-mail/pipeline.ts');
    expect(p).toMatch(/withPostalAddress\(withOptOutLine\(f\.draft\)/);
    expect(p.match(/listUnsubscribe/g)?.length).toBe(2); // declared once, passed once (outreach only)
  });
  it('newsletter unsubscribe no longer writes a status the CHECK constraint rejects', () => {
    const s = read('supabase/functions/newsletter-unsubscribe/index.ts');
    expect(s).not.toMatch(/status:\s*["']unsubscribed["']/);
    expect(s).toContain('applyUnsubscribe');
  });
  it('unsubscribe opts out the account by verified id, and a hash link cannot resubscribe', () => {
    const s = read('supabase/functions/confirm-email-subscription/index.ts');
    expect(s).not.toContain("admin.from('leads').select('metadata->>user_id')");
    expect(s).not.toContain('resubscribe_lead');
    expect(s).toContain("req.method === 'POST'");
    const u = read('supabase/functions/_shared/email-unsubscribe.ts');
    expect(u).toContain("from('email_suppressions').upsert");
    expect(u).toMatch(/emailHash\(email\)\) === hash/);
  });
  it('weekly insights only go to confirmed double opt-in leads, with a postal address', () => {
    const s = read('supabase/functions/send-weekly-insights/index.ts');
    expect(s).toContain('.not("confirmed_at", "is", null)');
    expect(s).toContain('loadPostalAddress');
    expect(s).toContain('isSuppressed');
  });
  it('lifecycle marketing sends check consent, add one-click headers and a postal address', () => {
    const s = read('supabase/functions/send-lifecycle-email/index.ts');
    expect(s).toContain('marketingSendDecision');
    expect(s).toContain('listUnsubscribeHeaders(unsubscribeUrl)');
    expect(s).toContain('postalAddressHold');
  });
  it('the welcome email is not sendable to an arbitrary address by an anonymous caller', () => {
    const s = read('supabase/functions/send-welcome-email/index.ts');
    expect(s).toMatch(/if \(!isServiceCaller && !skipLimit\)/);
    const popup = read('src/components/marketing/ExitIntentPopup.tsx');
    expect(popup).toContain("mode: 'confirmation'");
  });
});
