import { describe, expect, it } from 'vitest';
import {
  bouncedRecipient,
  classifyInbound,
  companyFromEmail,
  htmlToText,
  isOptOut,
  normalizeSubject,
  parseHeaders,
  resolveMailbox,
  stripQuoted,
  ticketNumberFromSubject,
  withTicketTag,
  type InboundMessage,
  type Mailbox,
} from '../../supabase/functions/_shared/mail/routing.ts';
import { canSendNow, effectiveDailyCap, localDayStartUtc, localParts, type MailSettings } from '../../supabase/functions/_shared/mail/send-policy.ts';
import { evaluateDns } from '../../supabase/functions/_shared/mail/dns-health.ts';

const MAILBOXES: Mailbox[] = [
  { address: 'support@aiwmcquantis.com', pipeline: 'ticketing', queue: 'support', active: true },
  { address: 'legal@aiwmcquantis.com', pipeline: 'ticketing', queue: 'legal', active: true },
  { address: 'hello@aiwmcquantis.com', pipeline: 'acquisition', queue: 'hello', active: true },
  { address: 'market@aiwmcquantis.com', pipeline: 'acquisition', queue: 'marketing', active: true },
];

function msg(over: Partial<InboundMessage> = {}): InboundMessage {
  return { from: 'jane@acme.com', fromName: 'Jane', to: ['hello@aiwmcquantis.com'], cc: [], subject: 'Re: A worked example', bodyText: 'Sounds interesting, send it over.', headers: {}, ...over };
}

describe('resolveMailbox', () => {
  it('routes by the addressed business mailbox', () => {
    expect(resolveMailbox(msg({ to: ['Support <SUPPORT@aiwmcquantis.com>'] }), MAILBOXES)?.queue).toBe('support');
    expect(resolveMailbox(msg({ to: ['someone@x.com'], cc: ['legal@aiwmcquantis.com'] }), MAILBOXES)?.queue).toBe('legal');
  });
  it('prefers Delivered-To over To (alias delivery)', () => {
    const m = msg({ to: ['hello@aiwmcquantis.com'], headers: { 'delivered-to': 'market@aiwmcquantis.com' } });
    expect(resolveMailbox(m, MAILBOXES)?.queue).toBe('marketing');
  });
  it('returns null for mail not addressed to a business mailbox (personal mail is never stored)', () => {
    expect(resolveMailbox(msg({ to: ['founder@gmail.com'] }), MAILBOXES)).toBeNull();
  });
  it('ignores inactive mailboxes', () => {
    const off = MAILBOXES.map((m) => (m.queue === 'hello' ? { ...m, active: false } : m));
    expect(resolveMailbox(msg(), off)).toBeNull();
  });
});

describe('classifyInbound', () => {
  it('human reply', () => expect(classifyInbound(msg())).toBe('human'));

  it('bounce from mailer-daemon, and the bounced recipient is found', () => {
    const m = msg({
      from: 'MAILER-DAEMON@mx.zoho.com',
      subject: 'Undelivered Mail Returned to Sender',
      bodyText: 'This message was created automatically.\n\nFinal-Recipient: rfc822; caleb@cornerstone-fpa.com\nStatus: 5.1.1',
    });
    expect(classifyInbound(m)).toBe('bounce');
    expect(bouncedRecipient(m)).toBe('caleb@cornerstone-fpa.com');
  });

  it('bounce recipient falls back to the first foreign address in the body', () => {
    const m = msg({ from: 'postmaster@outlook.com', subject: 'Delivery has failed', bodyText: 'Your message to emma@fracthouse.com could not be delivered. Sent from hello@aiwmcquantis.com' });
    expect(bouncedRecipient(m)).toBe('emma@fracthouse.com');
  });

  it('out-of-office is an auto-reply, not a reply (does not stop the sequence)', () => {
    expect(classifyInbound(msg({ subject: 'Automatic reply: A worked example' }))).toBe('auto_reply');
    expect(classifyInbound(msg({ headers: { 'auto-submitted': 'auto-replied' } }))).toBe('auto_reply');
    expect(classifyInbound(msg({ subject: 'Re: hi', bodyText: "I'm currently out of the office until Monday." }))).toBe('auto_reply');
  });

  it('DMARC aggregate reports and list mail are system mail, never tickets', () => {
    expect(classifyInbound(msg({ from: 'noreply-dmarc-support@google.com', subject: 'Report domain: aiwmcquantis.com Submitter: google.com' }))).toBe('system');
    expect(classifyInbound(msg({ headers: { 'list-unsubscribe': '<mailto:x@y.com>' } }))).toBe('system');
    expect(classifyInbound(msg({ from: 'no-reply@stripe.com', subject: 'Your receipt' }))).toBe('system');
  });

  it('opt-out: the footer asks for "no", so a bare no is an opt-out', () => {
    expect(classifyInbound(msg({ bodyText: 'No.\n\nJohn' }))).toBe('unsubscribe');
    expect(classifyInbound(msg({ bodyText: 'Please remove me from your list.' }))).toBe('unsubscribe');
    expect(classifyInbound(msg({ bodyText: 'not interested' }))).toBe('unsubscribe');
  });

  it('does not mistake a positive reply starting with "No" for an opt-out', () => {
    expect(isOptOut('No worries, happy to look at the example.')).toBe(false);
    expect(isOptOut('No problem — send it Tuesday.')).toBe(false);
  });

  it('only reads the new text, not the quoted original (which contains our opt-out line)', () => {
    const body = 'Yes, please send it.\n\nOn Mon, Sep 28, 2026 at 9:02 AM Bogdan <hello@aiwmcquantis.com> wrote:\n> If this isn\'t relevant, just reply "no" and I won\'t follow up.';
    expect(stripQuoted(body)).toBe('Yes, please send it.');
    expect(classifyInbound(msg({ bodyText: body }))).toBe('human');
  });
});

describe('ticket threading helpers', () => {
  it('tags and reads ticket numbers', () => {
    const s = withTicketTag('Cannot export PDF', 42);
    expect(s).toBe('Re: Cannot export PDF [Ticket #42]');
    expect(ticketNumberFromSubject(`RE: ${s}`)).toBe(42);
    expect(withTicketTag(s, 42)).toBe('Re: Cannot export PDF [Ticket #42]');
  });
  it('normalizes subjects across Re:/Fwd: prefixes', () => {
    expect(normalizeSubject('Re: Fwd: RE: Billing question [Ticket #7]')).toBe('billing question');
  });
});

describe('parsing helpers', () => {
  it('parses a raw header block with folded lines', () => {
    const h = parseHeaders('Message-ID: <abc@x.com>\r\nIn-Reply-To: <def@y.com>\r\nSubject: Hello\r\n there\r\nAuto-Submitted: auto-replied');
    expect(h['message-id']).toBe('<abc@x.com>');
    expect(h['in-reply-to']).toBe('<def@y.com>');
    expect(h['subject']).toBe('Hello there');
    expect(h['auto-submitted']).toBe('auto-replied');
  });
  it('accepts an object of headers too', () => {
    expect(parseHeaders({ 'Delivered-To': ['support@aiwmcquantis.com'] })['delivered-to']).toBe('support@aiwmcquantis.com');
  });
  it('converts Zoho HTML content to text', () => {
    expect(htmlToText('<div>Hi&nbsp;there<br/>Line two</div><p>Para &amp; more</p>')).toBe('Hi there\nLine two\nPara & more');
  });
  it('labels inbound companies from the sender domain, not freemail', () => {
    expect(companyFromEmail('tommy@foundercfo.com')).toBe('Foundercfo');
    expect(companyFromEmail('duncan.pettigrew@gmail.com', 'Duncan Pettigrew')).toBe('Duncan Pettigrew');
  });
});

const SETTINGS: MailSettings = {
  outreach_enabled: true,
  daily_cap: 20,
  warmup_start: null,
  warmup_base: 5,
  warmup_step: 2,
  min_gap_minutes: 4,
  send_timezone: 'America/New_York',
  send_start_hour: 9,
  send_end_hour: 17,
  send_weekdays: [1, 2, 3, 4, 5],
};

// Tuesday 2026-09-29 14:00 UTC = 10:00 New York (EDT)
const TUE_10AM_NY = new Date('2026-09-29T14:00:00Z');

describe('send policy', () => {
  it('local time and day start follow the configured timezone', () => {
    expect(localParts(TUE_10AM_NY, 'America/New_York')).toEqual({ date: '2026-09-29', hour: 10, weekday: 2 });
    expect(localDayStartUtc(TUE_10AM_NY, 'America/New_York').toISOString()).toBe('2026-09-29T04:00:00.000Z');
    expect(localDayStartUtc(TUE_10AM_NY, 'Europe/Berlin').toISOString()).toBe('2026-09-28T22:00:00.000Z');
  });

  it('allows a send inside the window with capacity and gap', () => {
    expect(canSendNow(SETTINGS, { now: TUE_10AM_NY, sentToday: 3, lastSentAt: new Date(TUE_10AM_NY.getTime() - 10 * 60_000), dnsReady: true }).ok).toBe(true);
  });

  it('blocks when disabled, DNS not ready, outside hours, weekend, capped or too soon', () => {
    const ctx = { now: TUE_10AM_NY, sentToday: 0, lastSentAt: null, dnsReady: true };
    const reason = (s: MailSettings, c = ctx) => { const d = canSendNow(s, c); return d.ok ? 'ok' : d.reason; };
    expect(reason({ ...SETTINGS, outreach_enabled: false })).toBe('disabled');
    expect(reason(SETTINGS, { ...ctx, dnsReady: false })).toBe('dns_not_ready');
    expect(reason(SETTINGS, { ...ctx, now: new Date('2026-09-29T22:30:00Z') })).toBe('outside_window'); // 18:30 NY
    expect(reason(SETTINGS, { ...ctx, now: new Date('2026-10-03T14:00:00Z') })).toBe('outside_window'); // Saturday
    expect(reason(SETTINGS, { ...ctx, sentToday: 20 })).toBe('daily_cap_reached');
    expect(reason(SETTINGS, { ...ctx, lastSentAt: new Date(TUE_10AM_NY.getTime() - 60_000) })).toBe('min_gap');
  });

  it('ramps the daily cap during warm-up', () => {
    expect(effectiveDailyCap({ ...SETTINGS, warmup_start: '2026-09-29' }, TUE_10AM_NY)).toBe(5);
    expect(effectiveDailyCap({ ...SETTINGS, warmup_start: '2026-09-26' }, TUE_10AM_NY)).toBe(11);
    expect(effectiveDailyCap({ ...SETTINGS, warmup_start: '2026-08-01' }, TUE_10AM_NY)).toBe(20);
  });
});

describe('DNS evaluation (production records observed 2026-09-28)', () => {
  const PROD = {
    mx: ['10 mx.zoho.com.', '20 mx2.zoho.com.', '50 mx3.zoho.com.'],
    spf: 'v=spf1 include:_spf.perfora.net include:_spf.kundenserver.de include:_spf.google.com include:_spf-us.ionos.com include:spf.protection.outlook.com -all',
    dmarc: 'v=DMARC1; p=reject; rua=mailto:support@aiwmcquantis.com; ruf=mailto:legal@aiwmcquantis.com; sp=reject; adkim=r; aspf=r; pct=100',
    dkim: null,
  };

  it('current production DNS is NOT ready: SPF lacks Zoho and there is no Zoho DKIM key', () => {
    const h = evaluateDns(PROD, 'aiwmcquantis.com', 'zmail');
    expect(h.ready).toBe(false);
    expect(h.checks.find((c) => c.id === 'mx')?.ok).toBe(true);
    expect(h.checks.find((c) => c.id === 'spf')?.ok).toBe(false);
    expect(h.checks.find((c) => c.id === 'dkim')?.ok).toBe(false);
    expect(h.checks.find((c) => c.id === 'dmarc')?.ok).toBe(true);
  });

  it('is ready once SPF includes zohomail.com and the DKIM key is published', () => {
    const h = evaluateDns(
      { ...PROD, spf: 'v=spf1 include:zohomail.com include:_spf.google.com ~all', dkim: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC+oZg8MIwiqfYm+w/uXJiSzU4yaHbtBNdX6ln' },
      'aiwmcquantis.com',
      'zmail',
    );
    expect(h.ready).toBe(true);
  });
});

describe('Zoho Mail client (request contract, fake fetch)', async () => {
  const { ZohoMailClient, accountForAddress } = await import('../../supabase/functions/_shared/mail/zoho-mail.ts');
  const cfg = { clientId: 'cid', clientSecret: 'sec', refreshToken: 'rt', accountsHost: 'accounts.zoho.com', apiHost: 'mail.zoho.com' };

  function fakeFetch() {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const impl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
      if (url.startsWith('https://accounts.zoho.com/oauth/v2/token')) return json({ access_token: 'AT', expires_in: 3600 });
      if (url.endsWith('/api/accounts')) {
        return json({ status: { code: 200 }, data: [{ accountId: 111, primaryEmailAddress: 'Bogdan@aiwmcquantis.com', sendMailDetails: [{ fromAddress: 'hello@aiwmcquantis.com' }, { fromAddress: 'support@aiwmcquantis.com' }] }] });
      }
      if (url.includes('/messages/view')) return json({ status: { code: 200 }, data: [{ messageId: 9, folderId: 5, threadId: 77, fromAddress: 'jane@acme.com', toAddress: '&lt;hello@aiwmcquantis.com&gt;', subject: 'Re: hi', summary: 'yes', receivedTime: '1759140000000' }] });
      if (url.endsWith('/api/accounts/111/messages') && init?.method === 'POST') {
        return json({ status: { code: 200 }, data: { messageId: '1726208416259127700', mailId: ' <abc@aiwmcquantis.com>' } });
      }
      if (url.endsWith('/api/accounts/111/messages/42')) return json({ status: { code: 500, description: 'Internal Error' }, data: { moreInfo: 'bad id' } }, 500);
      return json({ status: { code: 404 } }, 404);
    }) as unknown as typeof fetch;
    return { calls, impl };
  }

  it('refreshes the token once, lists accounts with aliases, and sends plaintext from an alias', async () => {
    const f = fakeFetch();
    const z = new ZohoMailClient(cfg, f.impl);
    const accounts = await z.accounts();
    expect(accounts[0]).toEqual({ accountId: '111', primaryEmail: 'bogdan@aiwmcquantis.com', sendAs: ['bogdan@aiwmcquantis.com', 'hello@aiwmcquantis.com', 'support@aiwmcquantis.com'] });
    expect(accountForAddress(accounts, 'HELLO@aiwmcquantis.com')?.accountId).toBe('111');
    expect(accountForAddress(accounts, 'legal@aiwmcquantis.com')).toBeNull();

    const res = await z.send('111', { from: 'hello@aiwmcquantis.com', to: 'jane@acme.com', subject: 'A worked example', text: 'Hi Jane' });
    expect(res).toEqual({ messageId: '1726208416259127700', mailId: '<abc@aiwmcquantis.com>' });
    const sendCall = f.calls.find((c) => c.init?.method === 'POST' && c.url.endsWith('/messages'))!;
    expect(JSON.parse(String(sendCall.init!.body))).toEqual({ fromAddress: 'hello@aiwmcquantis.com', toAddress: 'jane@acme.com', subject: 'A worked example', content: 'Hi Jane', mailFormat: 'plaintext' });
    expect((sendCall.init!.headers as Record<string, string>).Authorization).toBe('Zoho-oauthtoken AT');
    expect(f.calls.filter((c) => c.url.includes('/oauth/v2/token')).length).toBe(1);
  });

  it('parses listed messages and surfaces Zoho errors with their detail', async () => {
    const f = fakeFetch();
    const z = new ZohoMailClient(cfg, f.impl);
    const list = await z.listMessages('111', '5');
    expect(list[0]).toMatchObject({ messageId: '9', folderId: '5', threadId: '77', fromAddress: 'jane@acme.com', receivedTime: 1759140000000 });
    expect(f.calls.at(-1)!.url).toContain('includeto=true');
    await expect(z.reply('111', '42', { from: 'hello@aiwmcquantis.com', to: 'jane@acme.com', subject: 'Re: x', text: 'y' })).rejects.toThrow(/Internal Error \(bad id\)/);
  });
});
