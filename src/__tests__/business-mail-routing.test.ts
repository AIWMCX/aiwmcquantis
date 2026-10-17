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
import { ImapClient, findSentFolder, imapDate } from '../../supabase/functions/_shared/mail/imap.ts';
import { SmtpClient } from '../../supabase/functions/_shared/mail/smtp.ts';
import { buildMessage, encodeHeader, quotedPrintable } from '../../supabase/functions/_shared/mail/mime-build.ts';
import type { Transport } from '../../supabase/functions/_shared/mail/transport.ts';

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
  it('treats noreply anywhere in the local part as system mail (LinkedIn verification, 2026-10-15)', () => {
    expect(classifyInbound(msg({ from: 'LinkedIn <messages-noreply@linkedin.com>', subject: 'Confirm your email address' }))).toBe('system');
    expect(classifyInbound(msg({ from: 'security-no-reply@example.com' }))).toBe('system');
    expect(classifyInbound(msg({ from: 'alerts.donotreply@bank.example' }))).toBe('system');
  });
  it('does not treat a person whose name merely contains "reply" as system', () => {
    expect(classifyInbound(msg({ from: 'replyford@acme.com', bodyText: 'Happy to take a look.' }))).toBe('human');
    expect(classifyInbound(msg({ from: 'noreplyson@acme.com', bodyText: 'Sounds good.' }))).toBe('human');
  });

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
  it('converts HTML-only bodies to text', () => {
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
  const check = (h: ReturnType<typeof evaluateDns>, id: string) => h.checks.find((c) => c.id === id)!;

  it('today: SPF already authorizes IONOS, but MX points to Zoho, so replies never reach the IONOS mailboxes → not ready', () => {
    const h = evaluateDns(PROD, 'aiwmcquantis.com', 's1-ionos');
    expect(h.ready).toBe(false);
    expect(check(h, 'mx').ok).toBe(false);
    expect(check(h, 'mx').fix).toContain('mx00.ionos.com');
    expect(check(h, 'spf').ok).toBe(true);
    expect(check(h, 'dmarc').ok).toBe(true);
  });

  it('ready once MX points to IONOS; DKIM is recommended, not blocking', () => {
    const h = evaluateDns({ ...PROD, mx: ['10 mx00.ionos.com.', '10 mx01.ionos.com.'] }, 'aiwmcquantis.com', 's1-ionos');
    expect(h.ready).toBe(true);
    expect(check(h, 'dkim')).toMatchObject({ ok: false, required: false });
  });

  it('a mixed MX (some Zoho, some IONOS) is not ready — mail would split between providers', () => {
    expect(evaluateDns({ ...PROD, mx: ['10 mx00.ionos.com.', '20 mx2.zoho.com.'] }, 'aiwmcquantis.com', 's1-ionos').ready).toBe(false);
  });
});

/** Scripted fake mail server: replies to each client write with the next scripted chunk. */
function fakeServer(greeting: string, replies: Array<string | ((sent: string) => string)>) {
  const enc = new TextEncoder();
  const written: string[] = [];
  const queue: Uint8Array[] = [enc.encode(greeting)];
  let waiting: ((v: Uint8Array | null) => void) | null = null;
  let closed = false;
  const push = (b: Uint8Array) => {
    if (waiting) { const w = waiting; waiting = null; w(b); } else queue.push(b);
  };
  const t: Transport = {
    read: () => (queue.length ? Promise.resolve(queue.shift()!) : closed ? Promise.resolve(null) : new Promise((r) => { waiting = r; })),
    write: async (bytes) => {
      const text = new TextDecoder().decode(bytes);
      written.push(text);
      const next = replies.shift();
      if (next !== undefined) {
        const out = typeof next === 'function' ? next(text) : next;
        if (out) push(enc.encode(out));
      }
    },
    close: () => { closed = true; if (waiting) { const w = waiting; waiting = null; w(null); } },
  };
  return { t, written };
}

describe('IMAP client (scripted server)', () => {
  it('logs in, lists folders, selects, searches and fetches a literal without marking it read', async () => {
    const message = 'From: Carlos <carlos@axispointcap.com>\r\nTo: market@aiwmcquantis.com\r\nSubject: Re: Board judgment\r\n\r\nYes, send it.\r\n';
    const bytes = new TextEncoder().encode(message).length;
    const srv = fakeServer('* OK IMAP ready\r\n', [
      'Q1 OK LOGIN completed\r\n',
      '* LIST (\\HasNoChildren) "/" "INBOX"\r\n* LIST (\\HasNoChildren \\Sent) "/" "Sent Items"\r\nQ2 OK LIST done\r\n',
      '* 3 EXISTS\r\n* OK [UIDVALIDITY 1700000000] ok\r\n* OK [UIDNEXT 58] ok\r\nQ3 OK [READ-WRITE] SELECT\r\n',
      '* SEARCH 55 57\r\nQ4 OK SEARCH\r\n',
      `* 3 FETCH (UID 57 INTERNALDATE "29-Sep-2026 10:15:00 -0400" BODY[]<0> {${bytes}}\r\n${message})\r\nQ5 OK FETCH\r\n`,
    ]);
    const imap = new ImapClient(srv.t, 2000);
    await imap.greet();
    await imap.login('market@aiwmcquantis.com', 'p"w\\d');
    const folders = await imap.list();
    expect(findSentFolder(folders)).toBe('Sent Items');
    expect(await imap.select('INBOX')).toEqual({ uidValidity: 1700000000, uidNext: 58, exists: 3 });
    expect(await imap.uidSearch('UID 55:*')).toEqual([55, 57]);
    const [msg] = await imap.fetch([57]);
    expect(msg.uid).toBe(57);
    expect(msg.internalDate?.toISOString()).toBe('2026-09-29T14:15:00.000Z');
    expect(new TextDecoder().decode(msg.raw)).toBe(message);
    expect(srv.written[0]).toBe('Q1 LOGIN "market@aiwmcquantis.com" "p\\"w\\\\d"\r\n');
    expect(srv.written[4]).toContain('BODY.PEEK[]'); // never sets \\Seen
  });

  it('APPENDs a sent copy using a literal continuation, and surfaces NO responses', async () => {
    const srv = fakeServer('* OK ready\r\n', ['+ Ready for literal\r\n', '', 'Q1 OK APPEND completed\r\n', 'Q2 NO [AUTHENTICATIONFAILED] Invalid credentials\r\n']);
    const imap = new ImapClient(srv.t, 2000);
    await imap.greet();
    await imap.append('Sent Items', new TextEncoder().encode('Subject: x\r\n\r\nbody'));
    expect(srv.written[0]).toBe('Q1 APPEND "Sent Items" (\\Seen) {18}\r\n');
    await expect(imap.login('a@b.com', 'wrong')).rejects.toThrow(/LOGIN failed: NO \[AUTHENTICATIONFAILED\]/);
  });

  it('formats SEARCH dates the IMAP way', () => {
    expect(imapDate(new Date('2026-09-05T12:00:00Z'))).toBe('5-Sep-2026');
  });
});

describe('SMTP client (scripted server)', () => {
  it('EHLO → AUTH PLAIN → MAIL/RCPT → DATA with dot-stuffing → QUIT', async () => {
    const srv = fakeServer('220 smtp.ionos.com ESMTP\r\n', [
      '250-smtp.ionos.com\r\n250-AUTH LOGIN PLAIN\r\n250 8BITMIME\r\n',
      '235 Authentication succeeded\r\n',
      '250 OK\r\n',
      '250 OK\r\n',
      '354 Start mail input\r\n',
      '250 Requested mail action okay, completed: id=1MxAbc\r\n',
      '221 Bye\r\n',
    ]);
    const smtp = new SmtpClient(srv.t, 2000);
    const r = await smtp.send({ host: 'aiwmcquantis.com', user: 'hello@aiwmcquantis.com', password: 'pw', from: 'hello@aiwmcquantis.com', to: ['carlos@axispointcap.com'], raw: 'Subject: hi\n\nline one\n.hidden dot line\n' });
    expect(r.response).toContain('id=1MxAbc');
    expect(srv.written[1]).toBe(`AUTH PLAIN ${btoa('\u0000hello@aiwmcquantis.com\u0000pw')}\r\n`);
    expect(srv.written[3]).toBe('RCPT TO:<carlos@axispointcap.com>\r\n');
    expect(srv.written[5]).toBe('Subject: hi\r\n\r\nline one\r\n..hidden dot line\r\n.\r\n');
  });

  it('reports a rejected recipient with the server text', async () => {
    const srv = fakeServer('220 ok\r\n', ['250 hi\r\n', '235 ok\r\n', '250 ok\r\n', '550 5.1.1 mailbox unavailable\r\n']);
    await expect(new SmtpClient(srv.t, 2000).send({ host: 'x', user: 'u', password: 'p', from: 'a@b.com', to: ['nobody@x.com'], raw: 'x' }))
      .rejects.toThrow(/RCPT TO nobody@x.com rejected: 550 5.1.1/);
  });
});

describe('MIME builder', () => {
  it('builds a threaded plain-text message with our own Message-ID', () => {
    const raw = buildMessage({
      from: 'market@aiwmcquantis.com', fromName: 'Bogdan Jeltov', to: 'carlos@axispointcap.com',
      subject: 'Re: Board judgment at inflection points', text: 'Hi Carlos,\n\nFollowing up once.',
      messageId: '<m2@aiwmcquantis.com>', inReplyTo: '<m1@aiwmcquantis.com>', references: ['<m1@aiwmcquantis.com>'],
      date: new Date('2026-09-29T14:00:00Z'),
    });
    expect(raw).toContain('From: "Bogdan Jeltov" <market@aiwmcquantis.com>\r\n');
    expect(raw).toContain('Message-ID: <m2@aiwmcquantis.com>\r\n');
    expect(raw).toContain('In-Reply-To: <m1@aiwmcquantis.com>\r\nReferences: <m1@aiwmcquantis.com>\r\n');
    expect(raw).toContain('Date: Tue, 29 Sep 2026 14:00:00 +0000');
    expect(raw).toContain('Content-Transfer-Encoding: quoted-printable\r\n\r\nHi Carlos,\r\n\r\nFollowing up once.\r\n');
  });

  it('encodes non-ASCII headers and bodies safely', () => {
    expect(encodeHeader('Café — decision')).toMatch(/^=\?UTF-8\?B\?.+\?=$/);
    expect(quotedPrintable('Café = cost')).toBe('Caf=C3=A9 =3D cost');
    expect(quotedPrintable('trailing space ')).toBe('trailing space=20');
    const long = quotedPrintable('x'.repeat(200));
    expect(long.split('\r\n').every((l) => l.length <= 76)).toBe(true);
    expect(long.replace(/=\r\n/g, '')).toBe('x'.repeat(200));
  });
});
