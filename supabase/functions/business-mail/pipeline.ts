// Business-mail pipeline: mailbox sync, routing into tickets / acquisition,
// and the paced outreach sender. HTTP concerns live in index.ts.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  bouncedRecipient,
  classifyInbound,
  companyFromEmail,
  extractAddresses,
  htmlToText,
  normalizeEmail,
  normalizeSubject,
  parseHeaders,
  resolveMailbox,
  ticketNumberFromSubject,
  withTicketTag,
  type Classification,
  type InboundMessage,
  type Mailbox,
} from '../_shared/mail/routing.ts';
import { canSendNow, localDayStartUtc, type MailSettings, type PolicyDecision } from '../_shared/mail/send-policy.ts';
import { checkDomainDns, type DnsHealth } from '../_shared/mail/dns-health.ts';
import { accountForAddress, type ZohoAccount, type ZohoListedMessage, ZohoMailClient } from '../_shared/mail/zoho-mail.ts';

// deno-lint-ignore no-explicit-any
export type Svc = SupabaseClient<any, 'public', any>;

export const DOMAIN = 'aiwmcquantis.com';
const INITIAL_LOOKBACK_MS = 14 * 86_400_000;
const OVERLAP_MS = 10 * 60_000;
const MAX_PER_FOLDER = 150;
const BODY_LIMIT = 20_000;

export interface FullSettings extends MailSettings {
  outreach_from: string;
  dkim_selector: string;
  support_auto_ack: boolean;
}

export interface MailboxRow extends Mailbox {
  display_name: string;
  can_send: boolean;
}

export async function loadSettings(svc: Svc): Promise<FullSettings> {
  const { data, error } = await svc.from('mail_settings').select('*').eq('id', true).single();
  if (error || !data) throw new Error(`mail_settings missing: ${error?.message ?? 'no row'}`);
  return data as FullSettings;
}

export async function loadMailboxes(svc: Svc): Promise<MailboxRow[]> {
  const { data, error } = await svc.from('business_mailboxes').select('*');
  if (error) throw new Error(`business_mailboxes: ${error.message}`);
  return (data ?? []) as MailboxRow[];
}

// ── Prospect helpers ────────────────────────────────────────────────────

interface ProspectLite {
  id: string;
  stage: string;
  segment: string | null;
  campaign_id: string | null;
  batch_id: string | null;
  contact_channel: string | null;
  suppression_status: string;
}

async function prospectsByEmail(svc: Svc, email: string): Promise<ProspectLite[]> {
  if (!email) return [];
  const { data } = await svc
    .from('commercial_prospects')
    .select('id, stage, segment, campaign_id, batch_id, contact_channel, suppression_status')
    .ilike('contact_channel', `%${email.replace(/[%_]/g, (c) => `\\${c}`)}%`);
  return ((data ?? []) as ProspectLite[]).filter((p) => extractAddresses(p.contact_channel).includes(email));
}

async function moveStage(svc: Svc, p: ProspectLite, to: string, reason: string): Promise<void> {
  if (p.stage === to || ['won', 'lost', 'not_fit'].includes(p.stage)) return;
  await svc.from('commercial_prospect_stage_history').insert({ prospect_id: p.id, from_stage: p.stage, to_stage: to, reason, changed_by: null });
  await svc.from('commercial_prospects').update({ stage: to, updated_at: new Date().toISOString() }).eq('id', p.id);
}

async function suppressEmail(svc: Svc, email: string, reason: 'unsubscribed' | 'hard_bounced', source: string, mailMessageId: string | null) {
  if (!email) return;
  await svc.from('email_suppressions').upsert({ email, reason, source, mail_message_id: mailMessageId }, { onConflict: 'email', ignoreDuplicates: true });
}

async function applyOptOutOrBounce(svc: Svc, p: ProspectLite, kind: 'unsubscribe' | 'bounce', source: string) {
  await svc.from('commercial_prospects')
    .update({ suppression_status: kind === 'bounce' ? 'hard_bounced' : 'unsubscribed', updated_at: new Date().toISOString() })
    .eq('id', p.id);
  await svc.from('commercial_outcomes').insert({
    prospect_id: p.id,
    campaign_id: p.campaign_id,
    segment: p.segment,
    reply_class: kind,
    meeting_booked: false,
    lost_reason: `auto-detected from ${source}`,
  });
  // Any queued message for this prospect must not go out.
  await svc.from('commercial_followups')
    .update({ send_requested_at: null, send_last_error: `held: prospect ${kind === 'bounce' ? 'bounced' : 'opted out'}` })
    .eq('prospect_id', p.id)
    .eq('status', 'approved');
  await moveStage(svc, { ...p }, 'lost', `${kind} detected at ${source}`);
}

async function prospectsWithSends(svc: Svc, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data } = await svc.from('commercial_followups').select('prospect_id').in('prospect_id', ids).eq('status', 'sent');
  return new Set(((data ?? []) as Array<{ prospect_id: string }>).map((r) => r.prospect_id));
}

// ── Tickets ─────────────────────────────────────────────────────────────

interface TicketRow {
  id: string;
  ticket_number: number;
  queue: 'support' | 'legal';
  mailbox_address: string;
  status: string;
  subject: string;
  requester_email: string;
  provider_thread_id: string | null;
  acked_at: string | null;
}

async function findTicket(svc: Svc, m: { subject: string; threadId: string | null; inReplyTo: string | null; references: string; from: string }): Promise<TicketRow | null> {
  const num = ticketNumberFromSubject(m.subject);
  if (num) {
    const { data } = await svc.from('support_tickets').select('*').eq('ticket_number', num).maybeSingle();
    if (data) return data as TicketRow;
  }
  if (m.threadId) {
    const { data } = await svc.from('support_tickets').select('*').eq('provider_thread_id', m.threadId).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (data) return data as TicketRow;
  }
  const refIds = Array.from(new Set(`${m.inReplyTo ?? ''} ${m.references}`.match(/<[^>]+>/g) ?? []));
  if (refIds.length) {
    const { data } = await svc.from('mail_messages').select('ticket_id').in('internet_message_id', refIds).not('ticket_id', 'is', null).limit(1).maybeSingle();
    const tid = (data as { ticket_id?: string } | null)?.ticket_id;
    if (tid) {
      const { data: t } = await svc.from('support_tickets').select('*').eq('id', tid).maybeSingle();
      if (t) return t as TicketRow;
    }
  }
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: recent } = await svc.from('support_tickets').select('*').eq('requester_email', m.from).gte('updated_at', since).order('updated_at', { ascending: false }).limit(10);
  const want = normalizeSubject(m.subject);
  return ((recent ?? []) as TicketRow[]).find((t) => normalizeSubject(t.subject) === want) ?? null;
}

function priorityFor(queue: 'support' | 'legal', subject: string, body: string): 'normal' | 'high' | 'urgent' {
  if (/\burgent\b|asap|immediately/i.test(subject)) return 'urgent';
  if (queue === 'legal') return 'high';
  if (/(refund|charge ?back|cancel|can'?t (log ?in|access)|locked out|data (deletion|breach)|gdpr|ccpa)/i.test(`${subject} ${body.slice(0, 500)}`)) return 'high';
  return 'normal';
}

// ── Sync ────────────────────────────────────────────────────────────────

export interface SyncSummary {
  accounts: number;
  imported: number;
  tickets_created: number;
  tickets_updated: number;
  prospect_replies: number;
  opt_outs: number;
  bounces: number;
  inbound_leads: number;
  manual_sends_evidenced: number;
  errors: string[];
}

function emptySummary(): SyncSummary {
  return { accounts: 0, imported: 0, tickets_created: 0, tickets_updated: 0, prospect_replies: 0, opt_outs: 0, bounces: 0, inbound_leads: 0, manual_sends_evidenced: 0, errors: [] };
}

export async function syncMailboxes(svc: Svc, zoho: ZohoMailClient, settings: FullSettings, mailboxes: MailboxRow[]): Promise<SyncSummary> {
  const summary = emptySummary();
  const accounts = await zoho.accounts();
  summary.accounts = accounts.length;
  const ourAddresses = new Set(mailboxes.map((m) => m.address));

  for (const account of accounts) {
    let folders;
    try {
      folders = await zoho.folders(account.accountId);
    } catch (e) {
      summary.errors.push(`folders ${account.primaryEmail}: ${(e as Error).message}`);
      continue;
    }
    const inbox = folders.find((f) => /^inbox$/i.test(f.folderType) || /^inbox$/i.test(f.folderName));
    const sent = folders.find((f) => /^sent$/i.test(f.folderType) || /^sent$/i.test(f.folderName));
    for (const [kind, folder] of [['inbox', inbox], ['sent', sent]] as const) {
      if (!folder) continue;
      const started = new Date().toISOString();
      try {
        const n = await syncFolder(svc, zoho, account, folder.folderId, kind, settings, mailboxes, ourAddresses, summary);
        await svc.from('mail_sync_state').upsert({
          account_id: account.accountId, folder: kind, last_run_at: started, last_ok_at: started, last_error: null,
          ...(n.cursor ? { last_received_at: n.cursor } : {}),
        }, { onConflict: 'account_id,folder' });
      } catch (e) {
        const msg = (e as Error).message;
        summary.errors.push(`${kind} ${account.primaryEmail}: ${msg}`);
        await svc.from('mail_sync_state').upsert({ account_id: account.accountId, folder: kind, last_run_at: started, last_error: msg.slice(0, 500) }, { onConflict: 'account_id,folder' });
      }
    }
  }
  return summary;
}

async function syncFolder(
  svc: Svc,
  zoho: ZohoMailClient,
  account: ZohoAccount,
  folderId: string,
  kind: 'inbox' | 'sent',
  settings: FullSettings,
  mailboxes: MailboxRow[],
  ourAddresses: Set<string>,
  summary: SyncSummary,
): Promise<{ imported: number; cursor: string | null }> {
  const { data: state } = await svc.from('mail_sync_state').select('last_received_at').eq('account_id', account.accountId).eq('folder', kind).maybeSingle();
  const cursorMs = (state as { last_received_at?: string } | null)?.last_received_at
    ? Date.parse((state as { last_received_at: string }).last_received_at) - OVERLAP_MS
    : Date.now() - INITIAL_LOOKBACK_MS;

  const fresh: ZohoListedMessage[] = [];
  for (let start = 1; fresh.length < MAX_PER_FOLDER; start += 50) {
    const page = await zoho.listMessages(account.accountId, folderId, start, 50);
    const newer = page.filter((m) => m.receivedTime > cursorMs);
    fresh.push(...newer);
    if (page.length < 50 || newer.length < page.length) break;
  }
  if (fresh.length === 0) return { imported: 0, cursor: null };

  const ids = fresh.map((m) => m.messageId);
  const { data: existing } = await svc.from('mail_messages').select('provider_message_id').eq('provider_account_id', account.accountId).in('provider_message_id', ids);
  const seen = new Set(((existing ?? []) as Array<{ provider_message_id: string }>).map((r) => r.provider_message_id));

  let imported = 0;
  let newest = 0;
  for (const m of fresh.sort((a, b) => a.receivedTime - b.receivedTime)) {
    newest = Math.max(newest, m.receivedTime);
    if (seen.has(m.messageId)) continue;
    const stored = kind === 'inbox'
      ? await processInbound(svc, zoho, account, m, settings, mailboxes, ourAddresses, summary)
      : await processSent(svc, zoho, account, m, ourAddresses, summary);
    if (stored) imported++;
  }
  summary.imported += imported;
  return { imported, cursor: newest ? new Date(newest).toISOString() : null };
}

async function readMessage(zoho: ZohoMailClient, account: ZohoAccount, m: ZohoListedMessage) {
  let headers: Record<string, string> = {};
  try {
    headers = parseHeaders(await zoho.headers(account.accountId, m.folderId, m.messageId));
  } catch { /* headers are an enhancement; routing falls back to To/Cc */ }
  let body = m.summary;
  try {
    body = htmlToText(await zoho.content(account.accountId, m.folderId, m.messageId)) || m.summary;
  } catch { /* keep summary */ }
  return { headers, body: body.slice(0, BODY_LIMIT) };
}

async function insertMessage(svc: Svc, row: Record<string, unknown>): Promise<string | null> {
  const { data, error } = await svc.from('mail_messages').insert(row).select('id').single();
  if (error) {
    if (/duplicate key/i.test(error.message)) return null;
    throw new Error(`mail_messages insert: ${error.message}`);
  }
  return (data as { id: string }).id;
}

async function processInbound(
  svc: Svc,
  zoho: ZohoMailClient,
  account: ZohoAccount,
  m: ZohoListedMessage,
  settings: FullSettings,
  mailboxes: MailboxRow[],
  ourAddresses: Set<string>,
  summary: SyncSummary,
): Promise<boolean> {
  const from = normalizeEmail(m.fromAddress);
  if (!from || ourAddresses.has(from)) return false; // our own copies / internal loops

  const to = extractAddresses(m.toAddress);
  const cc = extractAddresses(m.ccAddress);
  // Cheap pre-check before fetching the body: is this business mail at all?
  const listedMailbox = resolveMailbox({ to, cc, headers: {} }, mailboxes);
  const looksLikeBounce = /^(mailer-daemon|postmaster|mail-daemon)@/i.test(from);
  const fromProspects = listedMailbox || looksLikeBounce ? [] : await prospectsByEmail(svc, from);
  if (!listedMailbox && !looksLikeBounce && fromProspects.length === 0) return false; // personal mail: never stored

  const { headers, body } = await readMessage(zoho, account, m);
  const msg: InboundMessage = { from, fromName: m.sender, to, cc, subject: m.subject, bodyText: body, headers };
  const mailbox = resolveMailbox(msg, mailboxes) ?? listedMailbox;
  const cls: Classification = classifyInbound(msg);

  const base = {
    provider: 'zoho',
    provider_account_id: account.accountId,
    provider_message_id: m.messageId,
    provider_folder_id: m.folderId,
    provider_thread_id: m.threadId,
    internet_message_id: headers['message-id'] ?? null,
    in_reply_to: headers['in-reply-to'] ?? null,
    direction: 'inbound',
    mailbox_address: mailbox?.address ?? null,
    from_address: from,
    from_name: m.sender,
    to_addresses: to,
    cc_addresses: cc,
    subject: m.subject,
    body_text: body,
    message_at: new Date(m.receivedTime || Date.now()).toISOString(),
    classification: cls,
  };

  // ── Bounces: always acquisition-side evidence, whatever mailbox got them.
  if (cls === 'bounce') {
    const rcpt = bouncedRecipient(msg, DOMAIN);
    const matches = rcpt ? await prospectsByEmail(svc, rcpt) : [];
    if (!mailbox && matches.length === 0) return false;
    const id = await insertMessage(svc, { ...base, route: matches.length ? 'acquisition' : 'system', bounced_recipient: rcpt, prospect_id: matches[0]?.id ?? null, match_status: matches.length === 1 ? 'matched' : matches.length > 1 ? 'ambiguous' : 'none' });
    if (id && rcpt && matches.length) {
      await suppressEmail(svc, rcpt, 'hard_bounced', `bounce ${m.messageId}`, id);
      for (const p of matches) await applyOptOutOrBounce(svc, p, 'bounce', mailbox?.address ?? account.primaryEmail);
      summary.bounces++;
    }
    return !!id;
  }

  // ── Ticketing mailboxes (support@, legal@, privacy@, security@).
  if (mailbox?.pipeline === 'ticketing') {
    if (cls === 'system' || cls === 'auto_reply') {
      return !!(await insertMessage(svc, { ...base, route: 'system' }));
    }
    const queue = mailbox.queue === 'legal' ? 'legal' : 'support';
    let ticket = await findTicket(svc, { subject: m.subject, threadId: m.threadId, inReplyTo: base.in_reply_to, references: headers['references'] ?? '', from });
    const now = new Date().toISOString();
    let created = false;
    if (!ticket) {
      const { data, error } = await svc.from('support_tickets').insert({
        queue,
        mailbox_address: mailbox.address,
        subject: m.subject || '(no subject)',
        requester_email: from,
        requester_name: m.sender,
        provider_thread_id: m.threadId,
        priority: priorityFor(queue, m.subject, body),
        last_inbound_at: base.message_at,
      }).select('*').single();
      if (error) throw new Error(`support_tickets insert: ${error.message}`);
      ticket = data as TicketRow;
      created = true;
      summary.tickets_created++;
    } else {
      await svc.from('support_tickets').update({
        status: ['resolved', 'closed', 'pending'].includes(ticket.status) ? 'open' : ticket.status,
        last_inbound_at: base.message_at,
        updated_at: now,
        provider_thread_id: ticket.provider_thread_id ?? m.threadId,
      }).eq('id', ticket.id);
      summary.tickets_updated++;
    }
    const id = await insertMessage(svc, { ...base, route: 'ticket', ticket_id: ticket.id, match_status: 'matched' });
    if (created && id && settings.support_auto_ack && queue === 'support' && cls === 'human') {
      await sendTicketAck(svc, zoho, account, ticket, m, mailboxes).catch(() => undefined);
    }
    return !!id;
  }

  // ── Acquisition (hello@, marketing@) or a reply straight from a prospect.
  const prospects = fromProspects.length ? fromProspects : await prospectsByEmail(svc, from);
  if (prospects.length > 0) {
    const withSends = await prospectsWithSends(svc, prospects.map((p) => p.id));
    const contacted = prospects.filter((p) => withSends.has(p.id));
    const target = contacted.length === 1 ? contacted[0] : contacted.length === 0 && prospects.length === 1 ? prospects[0] : null;
    const id = await insertMessage(svc, {
      ...base,
      route: cls === 'system' ? 'system' : 'acquisition',
      prospect_id: target?.id ?? null,
      match_status: target ? 'matched' : 'ambiguous',
    });
    if (!id || !target) return !!id;
    const where = mailbox?.address ?? account.primaryEmail;
    if (cls === 'unsubscribe') {
      await suppressEmail(svc, from, 'unsubscribed', `reply ${m.messageId}`, id);
      await applyOptOutOrBounce(svc, target, 'unsubscribe', where);
      summary.opt_outs++;
    } else if (cls === 'human') {
      // A reply stops the sequence: nothing queued for this prospect goes out.
      await svc.from('commercial_followups')
        .update({ send_requested_at: null, send_last_error: 'held: prospect replied' })
        .eq('prospect_id', target.id)
        .eq('status', 'approved');
      if (['discovered', 'contacted'].includes(target.stage)) {
        await moveStage(svc, target, 'replied', `reply received at ${where} — classify it in Commercial Ops`);
      }
      summary.prospect_replies++;
    }
    return true;
  }

  if (!mailbox) return false;
  if (cls !== 'human') {
    return !!(await insertMessage(svc, { ...base, route: 'system' }));
  }

  // Unknown human sender to hello@/marketing@ → inbound lead.
  const { data: prospect, error } = await svc.from('commercial_prospects').insert({
    company_name: companyFromEmail(from, m.sender),
    contact_name: m.sender,
    contact_channel: from,
    segment: 'inbound',
    stage: 'replied',
    observed_signals: [`Inbound email to ${mailbox.address}: "${(m.subject || '(no subject)').slice(0, 140)}"`],
  }).select('id').single();
  if (error) throw new Error(`inbound prospect insert: ${error.message}`);
  const pid = (prospect as { id: string }).id;
  await svc.from('commercial_prospect_stage_history').insert({ prospect_id: pid, from_stage: null, to_stage: 'replied', reason: `inbound email to ${mailbox.address}`, changed_by: null });
  summary.inbound_leads++;
  return !!(await insertMessage(svc, { ...base, route: 'acquisition', prospect_id: pid, match_status: 'new_inbound' }));
}

async function processSent(
  svc: Svc,
  zoho: ZohoMailClient,
  account: ZohoAccount,
  m: ZohoListedMessage,
  ourAddresses: Set<string>,
  summary: SyncSummary,
): Promise<boolean> {
  const from = normalizeEmail(m.fromAddress);
  if (!ourAddresses.has(from)) return false; // founder's personal sent mail is never stored
  const to = extractAddresses(m.toAddress);
  const cc = extractAddresses(m.ccAddress);

  const { headers, body } = await readMessage(zoho, account, m);
  const internetId = headers['message-id'] ?? null;
  if (internetId) {
    const { data: dup } = await svc.from('mail_messages').select('id').eq('internet_message_id', internetId).limit(1).maybeSingle();
    if (dup) return false; // sent through Quantis, already recorded
  }
  const base = {
    provider: 'zoho',
    provider_account_id: account.accountId,
    provider_message_id: m.messageId,
    provider_folder_id: m.folderId,
    provider_thread_id: m.threadId,
    internet_message_id: internetId,
    in_reply_to: headers['in-reply-to'] ?? null,
    direction: 'outbound',
    mailbox_address: from,
    from_address: from,
    to_addresses: to,
    cc_addresses: cc,
    subject: m.subject,
    body_text: body,
    message_at: new Date(m.receivedTime || Date.now()).toISOString(),
    classification: 'outbound',
  };

  // A ticket reply written directly in Zoho Mail.
  const ticket = await findTicket(svc, { subject: m.subject, threadId: m.threadId, inReplyTo: base.in_reply_to, references: headers['references'] ?? '', from: to[0] ?? '' });
  if (ticket && to.includes(ticket.requester_email)) {
    const id = await insertMessage(svc, { ...base, route: 'ticket', ticket_id: ticket.id, match_status: 'matched' });
    if (id) {
      await svc.from('support_tickets').update({
        last_outbound_at: base.message_at,
        status: ticket.status === 'open' ? 'pending' : ticket.status,
        updated_at: new Date().toISOString(),
      }).eq('id', ticket.id);
    }
    return !!id;
  }

  // Outreach sent by hand from Zoho: match an approved followup → evidence.
  for (const rcpt of to) {
    const prospects = await prospectsByEmail(svc, rcpt);
    if (prospects.length === 0) continue;
    const { data: approved } = await svc.from('commercial_followups')
      .select('id, subject, prospect_id')
      .in('prospect_id', prospects.map((p) => p.id))
      .eq('status', 'approved');
    const want = normalizeSubject(m.subject);
    const hit = ((approved ?? []) as Array<{ id: string; subject: string | null; prospect_id: string }>)
      .find((f) => normalizeSubject(f.subject) === want);
    const id = await insertMessage(svc, { ...base, route: 'outreach', prospect_id: hit?.prospect_id ?? prospects[0].id, followup_id: hit?.id ?? null, match_status: hit || prospects.length === 1 ? 'matched' : 'ambiguous' });
    if (id && hit) {
      const { error } = await svc.rpc('record_commercial_followup_provider_send', {
        _followup_id: hit.id,
        _sent_via: 'zoho_sent_folder',
        _sent_from: from,
        _sent_to: rcpt,
        _provider_message_id: m.messageId,
        _internet_message_id: internetId,
        _sent_at: base.message_at,
      });
      if (!error) summary.manual_sends_evidenced++;
    }
    return !!id;
  }
  return false;
}

// ── Ticket replies ─────────────────────────────────────────────────────

function replyFromFor(ticket: TicketRow, mailboxes: MailboxRow[]): string {
  const own = mailboxes.find((mb) => mb.address === ticket.mailbox_address && mb.can_send);
  if (own) return own.address;
  const fallback = mailboxes.find((mb) => mb.pipeline === 'ticketing' && mb.queue === ticket.queue && mb.can_send);
  return fallback?.address ?? `support@${DOMAIN}`;
}

async function sendTicketAck(svc: Svc, zoho: ZohoMailClient, account: ZohoAccount, ticket: TicketRow, original: ZohoListedMessage, mailboxes: MailboxRow[]) {
  const from = replyFromFor(ticket, mailboxes);
  const text = `Hi,\n\nThanks for writing to AIWMC Quantis. We received your message and opened ticket #${ticket.ticket_number}. A person reads every ticket; we usually reply within one business day.\n\nReply to this email to add anything to the same ticket.\n\nAIWMC Quantis Support`;
  const subject = withTicketTag(ticket.subject, ticket.ticket_number);
  const res = await zoho.reply(account.accountId, original.messageId, { from, to: ticket.requester_email, subject, text });
  await insertMessage(svc, {
    provider: 'zoho', provider_account_id: account.accountId, provider_message_id: res.messageId, internet_message_id: res.mailId,
    direction: 'outbound', mailbox_address: from, from_address: from, to_addresses: [ticket.requester_email], subject, body_text: text,
    message_at: new Date().toISOString(), route: 'ticket', classification: 'outbound', ticket_id: ticket.id, match_status: 'matched',
  });
  await svc.from('support_tickets').update({ acked_at: new Date().toISOString() }).eq('id', ticket.id);
  await svc.from('support_ticket_events').insert({ ticket_id: ticket.id, kind: 'ack', body: 'automatic acknowledgement sent' });
}

export async function replyToTicket(
  svc: Svc,
  zoho: ZohoMailClient,
  mailboxes: MailboxRow[],
  ticketId: string,
  text: string,
  userId: string,
  statusAfter: 'pending' | 'resolved' | 'open' = 'pending',
) {
  const { data: t, error } = await svc.from('support_tickets').select('*').eq('id', ticketId).single();
  if (error || !t) throw new Error('ticket not found');
  const ticket = t as TicketRow;
  const from = replyFromFor(ticket, mailboxes);
  const accounts = await zoho.accounts();
  const account = accountForAddress(accounts, from);
  if (!account) throw new Error(`no Zoho account can send as ${from} — add it as an alias/From address in Zoho Mail`);

  const { data: lastIn } = await svc.from('mail_messages')
    .select('provider_message_id, provider_account_id')
    .eq('ticket_id', ticket.id).eq('direction', 'inbound')
    .order('message_at', { ascending: false }).limit(1).maybeSingle();
  const subject = withTicketTag(ticket.subject, ticket.ticket_number);
  const signature = ticket.queue === 'legal' ? 'AIWMC Quantis Legal' : 'AIWMC Quantis Support';
  const body = `${text.trim()}\n\n${signature}\nTicket #${ticket.ticket_number}`;
  const payload = { from, to: ticket.requester_email, subject, text: body };
  const li = lastIn as { provider_message_id?: string; provider_account_id?: string } | null;

  let res;
  if (li?.provider_message_id && li.provider_account_id === account.accountId) {
    try {
      res = await zoho.reply(account.accountId, li.provider_message_id, payload);
    } catch {
      res = await zoho.send(account.accountId, payload);
    }
  } else {
    res = await zoho.send(account.accountId, payload);
  }
  const now = new Date().toISOString();
  await insertMessage(svc, {
    provider: 'zoho', provider_account_id: account.accountId, provider_message_id: res.messageId, internet_message_id: res.mailId,
    direction: 'outbound', mailbox_address: from, from_address: from, to_addresses: [ticket.requester_email], subject, body_text: body,
    message_at: now, route: 'ticket', classification: 'outbound', ticket_id: ticket.id, match_status: 'matched', sent_by_user_id: userId,
  });
  await svc.from('support_tickets').update({ status: statusAfter, last_outbound_at: now, updated_at: now }).eq('id', ticket.id);
  if (statusAfter !== ticket.status) {
    await svc.from('support_ticket_events').insert({ ticket_id: ticket.id, kind: 'status', body: `${ticket.status} → ${statusAfter}`, actor_user_id: userId });
  }
  return { message_id: res.messageId, from };
}

// ── Paced outreach sender ───────────────────────────────────────────────

export interface SendTickResult {
  decision: PolicyDecision;
  dns: DnsHealth | null;
  sent: null | { followup_id: string; to: string; from: string; provider_message_id: string | null };
  held: Array<{ followup_id: string; reason: string }>;
  queued: number;
  sent_today: number;
}

export async function outreachCounters(svc: Svc, settings: FullSettings, now = new Date()) {
  const dayStart = localDayStartUtc(now, settings.send_timezone).toISOString();
  const [{ count: sentToday }, { data: last }, { count: queued }] = await Promise.all([
    svc.from('commercial_followups').select('id', { count: 'exact', head: true }).eq('sent_via', 'zoho_api').gte('sent_at', dayStart),
    svc.from('commercial_followups').select('sent_at').eq('sent_via', 'zoho_api').order('sent_at', { ascending: false }).limit(1).maybeSingle(),
    svc.from('commercial_followups').select('id', { count: 'exact', head: true }).eq('status', 'approved').not('send_requested_at', 'is', null),
  ]);
  return {
    sentToday: sentToday ?? 0,
    lastSentAt: (last as { sent_at?: string } | null)?.sent_at ? new Date((last as { sent_at: string }).sent_at) : null,
    queued: queued ?? 0,
    dayStart,
  };
}

interface QueuedFollowup {
  id: string;
  prospect_id: string;
  kind: 'first_touch' | 'followup';
  sequence_step: number | null;
  subject: string | null;
  draft: string;
  campaign_id: string | null;
  send_attempts: number;
  send_requested_by: string | null;
}

async function hold(svc: Svc, f: QueuedFollowup, reason: string, held: SendTickResult['held']) {
  await svc.from('commercial_followups').update({ send_requested_at: null, send_last_error: `held: ${reason}` }).eq('id', f.id);
  held.push({ followup_id: f.id, reason });
}

/** Deterministic pre-send gate, re-run immediately before every send. */
async function preSendGate(svc: Svc, f: QueuedFollowup): Promise<{ ok: true; to: string; prospect: ProspectLite } | { ok: false; reason: string }> {
  const { data: p } = await svc.from('commercial_prospects')
    .select('id, stage, segment, campaign_id, batch_id, contact_channel, suppression_status')
    .eq('id', f.prospect_id).maybeSingle();
  if (!p) return { ok: false, reason: 'prospect missing' };
  const prospect = p as ProspectLite;
  const to = extractAddresses(prospect.contact_channel)[0];
  if (!to) return { ok: false, reason: 'no email address on the prospect' };
  if (prospect.suppression_status !== 'active') return { ok: false, reason: `prospect ${prospect.suppression_status}` };
  const { data: sup } = await svc.from('email_suppressions').select('reason').eq('email', to).maybeSingle();
  if (sup) return { ok: false, reason: `address suppressed (${(sup as { reason: string }).reason})` };

  const { count: replies } = await svc.from('mail_messages').select('id', { count: 'exact', head: true })
    .eq('prospect_id', prospect.id).eq('direction', 'inbound').in('classification', ['human', 'unsubscribe']);
  if ((replies ?? 0) > 0) return { ok: false, reason: 'prospect replied — sequence stopped' };

  if (f.kind === 'first_touch') {
    if (prospect.stage !== 'discovered') return { ok: false, reason: `first touch but prospect is already ${prospect.stage}` };
    // Same address on another prospect contacted in the last 30 days (duplicate rows).
    const others = (await prospectsByEmail(svc, to)).filter((o) => o.id !== prospect.id).map((o) => o.id);
    if (others.length) {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { count } = await svc.from('commercial_followups').select('id', { count: 'exact', head: true }).in('prospect_id', others).eq('status', 'sent').gte('sent_at', since);
      if ((count ?? 0) > 0) return { ok: false, reason: 'address already contacted via another prospect record in the last 30 days' };
    }
  } else {
    if (prospect.stage !== 'contacted') return { ok: false, reason: `follow-up but prospect is ${prospect.stage}` };
    const { count: step } = await svc.from('commercial_followups').select('id', { count: 'exact', head: true })
      .eq('prospect_id', prospect.id).eq('status', 'sent').eq('sequence_step', f.sequence_step ?? -1);
    if ((step ?? 0) > 0) return { ok: false, reason: `step ${f.sequence_step} already sent` };
  }
  return { ok: true, to, prospect };
}

export async function sendTick(svc: Svc, zoho: ZohoMailClient | null, settings: FullSettings, opts: { dryRun?: boolean } = {}): Promise<SendTickResult> {
  const counters = await outreachCounters(svc, settings);
  let dns: DnsHealth | null = null;
  try {
    dns = await checkDomainDns(DOMAIN, settings.dkim_selector);
  } catch { /* treated as not ready */ }
  const decision = canSendNow(settings, { now: new Date(), sentToday: counters.sentToday, lastSentAt: counters.lastSentAt, dnsReady: !!dns?.ready });
  const result: SendTickResult = { decision, dns, sent: null, held: [], queued: counters.queued, sent_today: counters.sentToday };
  if (!decision.ok || !zoho || opts.dryRun || counters.queued === 0) return result;

  const accounts = await zoho.accounts();
  const account = accountForAddress(accounts, settings.outreach_from);
  if (!account) {
    result.held.push({ followup_id: '-', reason: `no Zoho account can send as ${settings.outreach_from}` });
    return result;
  }

  const { data: queue } = await svc.from('commercial_followups')
    .select('id, prospect_id, kind, sequence_step, subject, draft, campaign_id, send_attempts, send_requested_by')
    .eq('status', 'approved').not('send_requested_at', 'is', null)
    .order('send_requested_at', { ascending: true }).limit(10);

  for (const f of (queue ?? []) as QueuedFollowup[]) {
    if (f.campaign_id) {
      const { data: c } = await svc.from('commercial_campaigns').select('daily_limit').eq('id', f.campaign_id).maybeSingle();
      const limit = (c as { daily_limit?: number | null } | null)?.daily_limit;
      if (limit) {
        const { count } = await svc.from('commercial_followups').select('id', { count: 'exact', head: true })
          .eq('campaign_id', f.campaign_id).eq('sent_via', 'zoho_api').gte('sent_at', counters.dayStart);
        if ((count ?? 0) >= limit) continue; // stays queued for tomorrow
      }
    }
    const gate = await preSendGate(svc, f);
    if (!gate.ok) {
      await hold(svc, f, gate.reason, result.held);
      continue;
    }

    // Steps 2+ go in the first touch's thread.
    let subject = f.subject ?? '';
    let replyTo: string | null = null;
    if (f.kind === 'followup') {
      const { data: first } = await svc.from('commercial_followups')
        .select('subject, provider_message_id, sent_from')
        .eq('prospect_id', f.prospect_id).eq('kind', 'first_touch').eq('status', 'sent')
        .order('sent_at', { ascending: true }).limit(1).maybeSingle();
      const ft = first as { subject?: string | null; provider_message_id?: string | null; sent_from?: string | null } | null;
      const base = (ft?.subject ?? subject).replace(/^(re:\s*)+/i, '');
      subject = base ? `Re: ${base}` : subject;
      if (ft?.provider_message_id && ft.sent_from === settings.outreach_from) replyTo = ft.provider_message_id;
    }
    if (!subject) subject = 'Quick question';

    const payload = { from: settings.outreach_from, to: gate.to, subject, text: f.draft };
    try {
      let res;
      if (replyTo) {
        try { res = await zoho.reply(account.accountId, replyTo, payload); } catch { res = await zoho.send(account.accountId, payload); }
      } else {
        res = await zoho.send(account.accountId, payload);
      }
      const { error } = await svc.rpc('record_commercial_followup_provider_send', {
        _followup_id: f.id,
        _sent_via: 'zoho_api',
        _sent_from: settings.outreach_from,
        _sent_to: gate.to,
        _provider_message_id: res.messageId,
        _internet_message_id: res.mailId,
      });
      if (error) throw new Error(`sent but not recorded: ${error.message}`);
      await insertMessage(svc, {
        provider: 'zoho', provider_account_id: account.accountId, provider_message_id: res.messageId, internet_message_id: res.mailId,
        direction: 'outbound', mailbox_address: settings.outreach_from, from_address: settings.outreach_from, to_addresses: [gate.to],
        subject, body_text: f.draft, message_at: new Date().toISOString(), route: 'outreach', classification: 'outbound',
        prospect_id: f.prospect_id, followup_id: f.id, match_status: 'matched', sent_by_user_id: f.send_requested_by,
      });
      result.sent = { followup_id: f.id, to: gate.to, from: settings.outreach_from, provider_message_id: res.messageId };
    } catch (e) {
      const attempts = f.send_attempts + 1;
      await svc.from('commercial_followups').update({
        send_attempts: attempts,
        send_last_error: (e as Error).message.slice(0, 500),
        ...(attempts >= 3 ? { send_requested_at: null } : {}),
      }).eq('id', f.id);
      result.held.push({ followup_id: f.id, reason: (e as Error).message });
    }
    break; // one message per tick: pacing comes from the 5-minute schedule + min gap
  }
  return result;
}
