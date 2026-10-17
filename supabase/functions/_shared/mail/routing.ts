/**
 * Business-mail routing and classification — pure functions, no I/O.
 *
 * Decides, for one message in a Quantis-domain mailbox:
 *   - which business mailbox it was addressed to (support@, legal@, hello@,
 *     market@, …) and therefore which pipeline owns it;
 *   - what it is: a human message, an auto-reply, a bounce, an opt-out, or
 *     system mail (DMARC reports, newsletters, no-reply notifications);
 *   - for bounces, which recipient bounced.
 *
 * Deterministic on purpose. Nothing here calls a model: a wrong "opt-out"
 * or "bounce" decision suppresses a real prospect, so every rule is a
 * literal pattern that can be read and tested.
 */

export type Pipeline = 'ticketing' | 'acquisition';
export type Queue = 'support' | 'legal' | 'hello' | 'marketing';
export type Classification = 'human' | 'auto_reply' | 'bounce' | 'unsubscribe' | 'system';

export interface Mailbox {
  address: string;
  pipeline: Pipeline;
  queue: Queue;
  active: boolean;
}

export interface InboundMessage {
  from: string;
  fromName?: string | null;
  to: string[];
  cc: string[];
  subject: string;
  bodyText: string;
  /** Lower-cased header name -> value (first occurrence). */
  headers: Record<string, string>;
}

const EMAIL_RE = /[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Every email address in a header-ish string, lower-cased, de-duplicated. */
export function extractAddresses(value: string | null | undefined): string[] {
  if (!value) return [];
  const found = value.match(EMAIL_RE) ?? [];
  return Array.from(new Set(found.map((a) => normalizeEmail(a)).filter(Boolean)));
}

export function normalizeEmail(value: string | null | undefined): string {
  if (!value) return '';
  const m = value.match(/[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  return m ? m[0].toLowerCase().replace(/\.+$/, '') : '';
}

/**
 * Which business mailbox a message belongs to. Checks, in order: Delivered-To
 * / X-Original-To (set by the receiving server for aliases), then To, then Cc.
 * Returns null when none of the active mailboxes were addressed.
 */
export function resolveMailbox(msg: Pick<InboundMessage, 'to' | 'cc' | 'headers'>, mailboxes: Mailbox[]): Mailbox | null {
  const active = new Map(mailboxes.filter((m) => m.active).map((m) => [m.address.toLowerCase(), m]));
  const candidates = [
    ...extractAddresses(msg.headers['delivered-to']),
    ...extractAddresses(msg.headers['x-original-to']),
    ...msg.to.flatMap((a) => extractAddresses(a)),
    ...msg.cc.flatMap((a) => extractAddresses(a)),
  ];
  for (const c of candidates) {
    const hit = active.get(c);
    if (hit) return hit;
  }
  return null;
}

const BOUNCE_SENDER = /^(mailer-daemon|postmaster|mail-daemon|bounce|bounces)@/i;
const BOUNCE_SUBJECT = /(undeliver|delivery status notification \(failure\)|delivery (has )?failed|mail delivery (failed|failure|subsystem)|returned mail|failure notice|could not be delivered|delivery failure|message not delivered|address not found)/i;
const AUTO_SUBJECT = /^(auto(matic)?[ -]?(reply|response)|out of (the )?office|ooo\b|away from (the )?office|autoreply|auto:)/i;
const AUTO_BODY = /\b(i am|i'm|i will be) (currently )?(out of (the )?office|away|on (annual |parental |maternity |paternity )?leave|travell?ing)\b/i;
const SYSTEM_SENDER = /^(no-?reply|do-?not-?reply|notifications?|noreply-dmarc-support|dmarc|dmarcreport|reports?|alerts?|mailer|news(letter)?)[@+._-]/i;
// "noreply" anywhere in the local part (messages-noreply@linkedin.com,
// security-noreply@…) is never a person.
const NOREPLY_ANYWHERE = /(^|[._+-])(no-?reply|do-?not-?reply)([._+-]|@)/i;
const DMARC_SUBJECT = /^(report domain:|\[?dmarc\]? aggregate report|dmarc report)/i;

/**
 * Opt-out detection. The outreach footer says: reply "no" and I won't follow
 * up — so a bare "no" (optionally with punctuation / a name) is an opt-out,
 * as is any explicit remove / unsubscribe request near the top of the reply.
 */
export function isOptOut(bodyText: string, subject = ''): boolean {
  const top = stripQuoted(bodyText).slice(0, 400).trim().toLowerCase();
  // Judge the first line alone, so "No.\nJohn" is an opt-out but
  // "No worries, happy to look" is not.
  const firstLine = top.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  if (/^(no|nope|no thanks?|no,? thank you|not interested|not relevant)[\s.!,-]*$/.test(firstLine)) return true;
  const phrase = /(unsubscribe|remove me|take me off|stop (emailing|contacting|sending)|do not (contact|email)|don't (contact|email)|opt[ -]?out|please remove)/;
  return phrase.test(top) || /^\s*(unsubscribe|remove)\b/i.test(subject);
}

/** Drop quoted history ("On … wrote:", "> " lines, Outlook separators). */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) break;
    if (/^\s*On .{3,200}wrote:\s*$/i.test(line)) break;
    if (/^-{2,}\s*(original message|forwarded message)/i.test(line)) break;
    if (/^\s*From:\s.+/i.test(line) && out.length > 0) break;
    if (/^_{8,}\s*$/.test(line)) break;
    out.push(line);
  }
  return out.join('\n').trim();
}

export function classifyInbound(msg: InboundMessage): Classification {
  const from = normalizeEmail(msg.from);
  const h = msg.headers;
  const subject = msg.subject ?? '';

  if (BOUNCE_SENDER.test(from) || (BOUNCE_SUBJECT.test(subject) && /daemon|postmaster|mail delivery/i.test(`${from} ${msg.fromName ?? ''}`))) {
    return 'bounce';
  }
  if (/^multipart\/report/i.test(h['content-type'] ?? '') && /delivery-status/i.test(h['content-type'] ?? '')) return 'bounce';

  const autoSubmitted = (h['auto-submitted'] ?? '').toLowerCase();
  if (autoSubmitted === 'auto-replied' || h['x-autoreply'] || h['x-autorespond'] || AUTO_SUBJECT.test(subject.trim()) || AUTO_BODY.test(stripQuoted(msg.bodyText).slice(0, 600))) {
    return 'auto_reply';
  }

  if (DMARC_SUBJECT.test(subject.trim())) return 'system';
  if (autoSubmitted && autoSubmitted !== 'no') return 'system';
  const precedence = (h['precedence'] ?? '').toLowerCase();
  if (['bulk', 'list', 'junk'].includes(precedence) || h['list-id'] || h['list-unsubscribe']) return 'system';
  if (SYSTEM_SENDER.test(from) || NOREPLY_ANYWHERE.test(from)) return 'system';

  if (isOptOut(msg.bodyText, subject)) return 'unsubscribe';
  return 'human';
}

/**
 * The recipient a bounce is about. Looks for the standard DSN fields first
 * (Final-Recipient / Original-Recipient / X-Failed-Recipients), then the
 * first address in the body that is not ours and not the daemon's.
 */
export function bouncedRecipient(msg: InboundMessage, ownDomain = 'aiwmcquantis.com'): string | null {
  const failed = extractAddresses(msg.headers['x-failed-recipients']);
  if (failed.length) return failed[0];
  const dsn = msg.bodyText.match(/(?:final|original)-recipient:\s*(?:rfc822;)?\s*([^\s<>;]+@[^\s<>;]+)/i);
  if (dsn) return normalizeEmail(dsn[1]);
  const skip = (a: string) => a.endsWith(`@${ownDomain}`) || BOUNCE_SENDER.test(a) || a === normalizeEmail(msg.from);
  const candidates = extractAddresses(msg.bodyText).filter((a) => !skip(a));
  return candidates[0] ?? null;
}

/** Subject without Re:/Fwd: prefixes and ticket tags, for thread matching. */
export function normalizeSubject(subject: string | null | undefined): string {
  let s = (subject ?? '').trim();
  for (let i = 0; i < 5; i++) {
    const next = s.replace(/^(re|fw|fwd|aw|sv|wg)\s*(\[\d+\])?\s*:\s*/i, '').replace(/\[ticket #\d+\]\s*/i, '').trim();
    if (next === s) break;
    s = next;
  }
  return s.toLowerCase();
}

/** Ticket number embedded in a subject by our own replies: "[Ticket #123]". */
export function ticketNumberFromSubject(subject: string | null | undefined): number | null {
  const m = (subject ?? '').match(/\[ticket #(\d{1,10})\]/i);
  return m ? Number(m[1]) : null;
}

export function withTicketTag(subject: string, ticketNumber: number): string {
  const base = subject.replace(/\s*\[ticket #\d+\]/i, '').trim() || '(no subject)';
  const re = /^re:/i.test(base) ? base : `Re: ${base}`;
  return `${re} [Ticket #${ticketNumber}]`;
}

/** Minimal HTML -> text for HTML-only mail bodies (e.g. Outlook replies). */
export function htmlToText(html: string): string {
  if (!/<[a-z!/][^>]*>/i.test(html)) return html.trim();
  return html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<blockquote[^>]*>/gi, '\n> ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Parse a raw RFC 822 header block into lower-cased name -> first value,
 * unfolding continuation lines. Accepts an already-parsed object too.
 */
export function parseHeaders(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const val = Array.isArray(v) ? v[0] : v;
      if (val !== undefined && val !== null && out[k.toLowerCase()] === undefined) out[k.toLowerCase()] = String(val);
    }
    return out;
  }
  const text = String(raw).replace(/\r\n/g, '\n').replace(/\n[ \t]+/g, ' ');
  for (const line of text.split('\n')) {
    const i = line.indexOf(':');
    if (i <= 0) continue;
    const name = line.slice(0, i).trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(name)) continue;
    if (out[name] === undefined) out[name] = line.slice(i + 1).trim();
  }
  return out;
}

/** Company label for an inbound sender we have never prospected. */
export function companyFromEmail(email: string, displayName?: string | null): string {
  const domain = email.split('@')[1] ?? '';
  const freemail = /^(gmail|googlemail|yahoo|outlook|hotmail|live|icloud|me|aol|proton|protonmail|gmx|zoho|yandex|mail)\./i;
  if (!domain || freemail.test(domain)) return (displayName ?? '').trim() || email;
  const root = domain.replace(/^(www|mail)\./, '').split('.')[0];
  return root.charAt(0).toUpperCase() + root.slice(1);
}
