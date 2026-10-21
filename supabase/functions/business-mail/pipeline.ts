// Business-mail pipeline: mailbox sync (IMAP), routing into tickets /
// acquisition, and the paced outreach sender (SMTP). HTTP concerns live in
// index.ts.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  bouncedRecipient,
  classifyInbound,
  companyFromEmail,
  extractAddresses,
  normalizeEmail,
  normalizeSubject,
  resolveMailbox,
  ticketNumberFromSubject,
  withTicketTag,
  type Classification,
  type InboundMessage,
  type Mailbox,
} from '../_shared/mail/routing.ts';
import { canSendNow, localDayStartUtc, type MailSettings, type PolicyDecision } from '../_shared/mail/send-policy.ts';
import { checkDomainDns, type DnsHealth } from '../_shared/mail/dns-health.ts';
import { findSentFolder, imapDate } from '../_shared/mail/imap.ts';
import {
  parseMail,
  sendFromMailbox,
  withImap,
  type MailboxCredential,
  type MailServerConfig,
  type ParsedMail,
} from '../_shared/mail/mailbox-account.ts';

// deno-lint-ignore no-explicit-any
export type Svc = SupabaseClient<any, 'public', any>;

export const DOMAIN = 'aiwmcquantis.com';
const INITIAL_LOOKBACK_DAYS = 14;
const MAX_PER_FOLDER = 100;
const FETCH_CHUNK = 20;
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

export interface MailContext {
  svc: Svc;
  server: MailServerConfig;
  creds: Map<string, MailboxCredential>;
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
  await moveStage(svc, p, 'lost', `${kind} detected at ${source}`);
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
  acked_at: string | null;
}

function refIds(inReplyTo: string | null, references: string): string[] {
  return Array.from(new Set(`${inReplyTo ?? ''} ${references}`.match(/<[^>\s]+>/g) ?? []));
}

async function findTicket(svc: Svc, m: { subject: string; inReplyTo: string | null; references: string; counterpart: string }): Promise<TicketRow | null> {
  const num = ticketNumberFromSubject(m.subject);
  if (num) {
    const { data } = await svc.from('support_tickets').select('*').eq('ticket_number', num).maybeSingle();
    if (data) return data as TicketRow;
  }
  const refs = refIds(m.inReplyTo, m.references);
  if (refs.length) {
    const { data } = await svc.from('mail_messages').select('ticket_id').in('internet_message_id', refs).not('ticket_id', 'is', null).limit(1).maybeSingle();
    const tid = (data as { ticket_id?: string } | null)?.ticket_id;
    if (tid) {
      const { data: t } = await svc.from('support_tickets').select('*').eq('id', tid).maybeSingle();
      if (t) return t as TicketRow;
    }
  }
  if (!m.counterpart) return null;
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: recent } = await svc.from('support_tickets').select('*').eq('requester_email', m.counterpart).gte('updated_at', since).order('updated_at', { ascending: false }).limit(10);
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
  mailboxes: number;
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

interface FetchedMail {
  key: string; // `${uidValidity}:${uid}`
  folder: string;
  receivedAt: Date;
  mail: ParsedMail;
}

export async function syncMailboxes(ctx: MailContext, settings: FullSettings, mailboxes: MailboxRow[]): Promise<SyncSummary> {
  const summary: SyncSummary = { mailboxes: 0, imported: 0, tickets_created: 0, tickets_updated: 0, prospect_replies: 0, opt_outs: 0, bounces: 0, inbound_leads: 0, manual_sends_evidenced: 0, errors: [] };
  const ourAddresses = new Set(mailboxes.map((m) => m.address));

  for (const box of mailboxes.filter((m) => m.active)) {
    const cred = ctx.creds.get(box.address);
    if (!cred) continue;
    summary.mailboxes++;
    const started = new Date().toISOString();
    try {
      await withImap(ctx.server, cred, async (imap) => {
        const sentFolder = findSentFolder(await imap.list());
        for (const [kind, folder] of [['inbox', 'INBOX'], ['sent', sentFolder]] as const) {
          if (!folder) continue;
          const { data: state } = await ctx.svc.from('mail_sync_state').select('uid_validity, last_uid').eq('account_id', box.address).eq('folder', kind).maybeSingle();
          const st = state as { uid_validity: number | null; last_uid: number | null } | null;
          const sel = await imap.select(folder);
          const sameValidity = st?.uid_validity && Number(st.uid_validity) === sel.uidValidity;
          const lastUid = sameValidity ? Number(st?.last_uid ?? 0) : 0;
          let uids = lastUid > 0
            ? (await imap.uidSearch(`UID ${lastUid + 1}:*`)).filter((u) => u > lastUid)
            : await imap.uidSearch(`SINCE ${imapDate(new Date(Date.now() - INITIAL_LOOKBACK_DAYS * 86_400_000))}`);
          uids = uids.slice(-MAX_PER_FOLDER);
          let maxUid = lastUid;
          for (let i = 0; i < uids.length; i += FETCH_CHUNK) {
            const batch = await imap.fetch(uids.slice(i, i + FETCH_CHUNK));
            for (const f of batch) {
              maxUid = Math.max(maxUid, f.uid);
              const mail = await parseMail(f.raw);
              mail.text = mail.text.slice(0, BODY_LIMIT);
              const item: FetchedMail = { key: `${sel.uidValidity}:${f.uid}`, folder, receivedAt: f.internalDate ?? mail.date ?? new Date(), mail };
              const stored = kind === 'inbox'
                ? await processInbound(ctx.svc, box, item, settings, mailboxes, ourAddresses, summary, ctx)
                : await processSent(ctx.svc, box, item, ourAddresses, summary);
              if (stored) summary.imported++;
            }
          }
          await ctx.svc.from('mail_sync_state').upsert({
            account_id: box.address, folder: kind, uid_validity: sel.uidValidity, last_uid: maxUid,
            last_run_at: started, last_ok_at: started, last_error: null,
          }, { onConflict: 'account_id,folder' });
        }
      });
    } catch (e) {
      const msg = (e as Error).message;
      summary.errors.push(`${box.address}: ${msg}`);
      await ctx.svc.from('mail_sync_state').upsert({ account_id: box.address, folder: 'inbox', last_run_at: started, last_error: msg.slice(0, 500) }, { onConflict: 'account_id,folder' });
    }
  }
  return summary;
}

async function insertMessage(svc: Svc, row: Record<string, unknown>): Promise<string | null> {
  const { data, error } = await svc.from('mail_messages').insert(row).select('id').single();
  if (error) {
    if (/duplicate key/i.test(error.message)) return null;
    throw new Error(`mail_messages insert: ${error.message}`);
  }
  return (data as { id: string }).id;
}

function baseRow(box: MailboxRow, item: FetchedMail, direction: 'inbound' | 'outbound') {
  const m = item.mail;
  return {
    provider: 'imap',
    provider_account_id: box.address,
    provider_message_id: item.key,
    provider_folder_id: item.folder,
    internet_message_id: m.messageId,
    in_reply_to: m.inReplyTo,
    direction,
    from_address: m.from || box.address,
    from_name: m.fromName,
    to_addresses: m.to,
    cc_addresses: m.cc,
    subject: m.subject,
    body_text: m.text,
    message_at: item.receivedAt.toISOString(),
  };
}

async function processInbound(
  svc: Svc,
  box: MailboxRow,
  item: FetchedMail,
  settings: FullSettings,
  mailboxes: MailboxRow[],
  ourAddresses: Set<string>,
  summary: SyncSummary,
  ctx: MailContext,
): Promise<boolean> {
  const m = item.mail;
  const from = normalizeEmail(m.from);
  if (!from || ourAddresses.has(from)) return false; // internal copies between our own mailboxes

  const msg: InboundMessage = { from, fromName: m.fromName, to: m.to, cc: m.cc, subject: m.subject, bodyText: m.text, headers: m.headers };
  // The mailbox that received it; an alias in To/Delivered-To can refine it.
  const mailbox = resolveMailbox(msg, mailboxes) ?? box;
  const cls: Classification = classifyInbound(msg);
  const base = { ...baseRow(box, item, 'inbound'), mailbox_address: mailbox.address, classification: cls };

  // ── Bounces: acquisition evidence whatever mailbox received them.
  if (cls === 'bounce') {
    const rcpt = bouncedRecipient(msg, DOMAIN);
    const matches = rcpt ? await prospectsByEmail(svc, rcpt) : [];
    const id = await insertMessage(svc, { ...base, route: matches.length ? 'acquisition' : 'system', bounced_recipient: rcpt, prospect_id: matches[0]?.id ?? null, match_status: matches.length === 1 ? 'matched' : matches.length > 1 ? 'ambiguous' : 'none' });
    if (id && rcpt && matches.length) {
      await suppressEmail(svc, rcpt, 'hard_bounced', `bounce ${box.address} ${item.key}`, id);
      for (const p of matches) await applyOptOutOrBounce(svc, p, 'bounce', mailbox.address);
      summary.bounces++;
    }
    return !!id;
  }

  // ── Ticketing mailboxes (support@, legal@, privacy@, security@).
  if (mailbox.pipeline === 'ticketing') {
    if (cls === 'system' || cls === 'auto_reply') return !!(await insertMessage(svc, { ...base, route: 'system' }));
    const queue = mailbox.queue === 'legal' ? 'legal' : 'support';
    let ticket = await findTicket(svc, { subject: m.subject, inReplyTo: m.inReplyTo, references: m.references, counterpart: from });
    const now = new Date().toISOString();
    let created = false;
    if (!ticket) {
      const { data, error } = await svc.from('support_tickets').insert({
        queue,
        mailbox_address: mailbox.address,
        subject: m.subject || '(no subject)',
        requester_email: from,
        requester_name: m.fromName,
        priority: priorityFor(queue, m.subject, m.text),
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
      }).eq('id', ticket.id);
      summary.tickets_updated++;
    }
    const id = await insertMessage(svc, { ...base, route: 'ticket', ticket_id: ticket.id, match_status: 'matched' });
    if (created && id && settings.support_auto_ack && queue === 'support' && cls === 'human') {
      await sendTicketAck(ctx, ticket, m.messageId, mailboxes).catch(() => undefined);
    }
    return !!id;
  }

  // ── Acquisition mailboxes (hello@, market@).
  const prospects = await prospectsByEmail(svc, from);
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
    if (cls === 'unsubscribe') {
      await suppressEmail(svc, from, 'unsubscribed', `reply ${box.address} ${item.key}`, id);
      await applyOptOutOrBounce(svc, target, 'unsubscribe', mailbox.address);
      summary.opt_outs++;
    } else if (cls === 'human') {
      // A reply stops the sequence: nothing queued for this prospect goes out.
      await svc.from('commercial_followups')
        .update({ send_requested_at: null, send_last_error: 'held: prospect replied' })
        .eq('prospect_id', target.id)
        .eq('status', 'approved');
      if (['discovered', 'contacted'].includes(target.stage)) {
        await moveStage(svc, target, 'replied', `reply received at ${mailbox.address} — classify it in Commercial Ops`);
      }
      summary.prospect_replies++;
    }
    return true;
  }

  if (cls !== 'human') return !!(await insertMessage(svc, { ...base, route: 'system' }));

  // Unknown human sender → inbound lead.
  const { data: prospect, error } = await svc.from('commercial_prospects').insert({
    company_name: companyFromEmail(from, m.fromName),
    contact_name: m.fromName,
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

async function processSent(svc: Svc, box: MailboxRow, item: FetchedMail, ourAddresses: Set<string>, summary: SyncSummary): Promise<boolean> {
  const m = item.mail;
  if (m.messageId) {
    const { data: dup } = await svc.from('mail_messages').select('id').eq('internet_message_id', m.messageId).limit(1).maybeSingle();
    if (dup) return false; // sent through Quantis, already recorded
  }
  const to = m.to.filter((a) => !ourAddresses.has(a));
  if (to.length === 0) return false;
  const base = { ...baseRow(box, item, 'outbound'), mailbox_address: box.address, classification: 'outbound' };

  // A ticket reply written directly in Outlook.
  const ticket = await findTicket(svc, { subject: m.subject, inReplyTo: m.inReplyTo, references: m.references, counterpart: to[0] });
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

  // Outreach sent by hand from Outlook ("Open in mail"): match an approved
  // followup by recipient + subject → provider evidence, marked sent.
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
        _sent_via: 'mailbox_sent_folder',
        _sent_from: box.address,
        _sent_to: rcpt,
        _provider_message_id: item.key,
        _internet_message_id: m.messageId,
        _sent_at: base.message_at,
      });
      if (!error) summary.manual_sends_evidenced++;
    }
    return !!id;
  }
  return false;
}

// ── Sending helpers ─────────────────────────────────────────────────────

function sendingMailbox(ctx: MailContext, mailboxes: MailboxRow[], preferred: string, queue?: 'support' | 'legal'): { box: MailboxRow; cred: MailboxCredential } | null {
  const candidates = [
    mailboxes.find((mb) => mb.address === preferred),
    ...(queue ? mailboxes.filter((mb) => mb.pipeline === 'ticketing' && mb.queue === queue) : []),
  ].filter(Boolean) as MailboxRow[];
  for (const box of candidates) {
    const cred = ctx.creds.get(box.address);
    if (box.can_send && cred) return { box, cred };
  }
  return null;
}

async function sendTicketAck(ctx: MailContext, ticket: TicketRow, inReplyTo: string | null, mailboxes: MailboxRow[]) {
  const sender = sendingMailbox(ctx, mailboxes, ticket.mailbox_address, ticket.queue);
  if (!sender) return;
  const text = `Hi,\n\nThanks for writing to AIWMC Quantis. We received your message and opened ticket #${ticket.ticket_number}. A person reads every ticket; we usually reply within one business day.\n\nReply to this email to add anything to the same ticket.\n\nAIWMC Quantis Support`;
  const subject = withTicketTag(ticket.subject, ticket.ticket_number);
  const res = await sendFromMailbox(ctx.server, sender.cred, { fromName: sender.box.display_name, to: ticket.requester_email, subject, text, inReplyTo, references: inReplyTo ? [inReplyTo] : [] });
  await insertMessage(ctx.svc, {
    provider: 'imap', provider_account_id: sender.box.address, internet_message_id: res.messageId,
    direction: 'outbound', mailbox_address: sender.box.address, from_address: sender.box.address, to_addresses: [ticket.requester_email], subject, body_text: text,
    message_at: new Date().toISOString(), route: 'ticket', classification: 'outbound', ticket_id: ticket.id, match_status: 'matched',
  });
  await ctx.svc.from('support_tickets').update({ acked_at: new Date().toISOString() }).eq('id', ticket.id);
  await ctx.svc.from('support_ticket_events').insert({ ticket_id: ticket.id, kind: 'ack', body: 'automatic acknowledgement sent' });
}

export async function replyToTicket(
  ctx: MailContext,
  mailboxes: MailboxRow[],
  ticketId: string,
  text: string,
  userId: string,
  statusAfter: 'pending' | 'resolved' | 'open' = 'pending',
) {
  const { data: t, error } = await ctx.svc.from('support_tickets').select('*').eq('id', ticketId).single();
  if (error || !t) throw new Error('ticket not found');
  const ticket = t as TicketRow;
  const sender = sendingMailbox(ctx, mailboxes, ticket.mailbox_address, ticket.queue);
  if (!sender) throw new Error(`no connected mailbox can reply for the ${ticket.queue} queue — add its password to BUSINESS_MAILBOX_PASSWORDS`);

  const { data: thread } = await ctx.svc.from('mail_messages')
    .select('internet_message_id')
    .eq('ticket_id', ticket.id)
    .not('internet_message_id', 'is', null)
    .order('message_at', { ascending: true });
  const refs = ((thread ?? []) as Array<{ internet_message_id: string }>).map((r) => r.internet_message_id);
  const subject = withTicketTag(ticket.subject, ticket.ticket_number);
  const signature = ticket.queue === 'legal' ? 'AIWMC Quantis Legal' : 'AIWMC Quantis Support';
  const body = `${text.trim()}\n\n${signature}\nTicket #${ticket.ticket_number}`;
  const res = await sendFromMailbox(ctx.server, sender.cred, {
    fromName: sender.box.display_name,
    to: ticket.requester_email,
    subject,
    text: body,
    inReplyTo: refs[refs.length - 1] ?? null,
    references: refs.slice(-10),
  });
  const now = new Date().toISOString();
  await insertMessage(ctx.svc, {
    provider: 'imap', provider_account_id: sender.box.address, internet_message_id: res.messageId,
    direction: 'outbound', mailbox_address: sender.box.address, from_address: sender.box.address, to_addresses: [ticket.requester_email], subject, body_text: body,
    message_at: now, route: 'ticket', classification: 'outbound', ticket_id: ticket.id, match_status: 'matched', sent_by_user_id: userId,
  });
  await ctx.svc.from('support_tickets').update({ status: statusAfter, last_outbound_at: now, updated_at: now }).eq('id', ticket.id);
  if (statusAfter !== ticket.status) {
    await ctx.svc.from('support_ticket_events').insert({ ticket_id: ticket.id, kind: 'status', body: `${ticket.status} → ${statusAfter}`, actor_user_id: userId });
  }
  return { message_id: res.messageId, from: sender.box.address, filed_in_sent: res.filedInSent };
}

// ── Paced outreach sender ───────────────────────────────────────────────

export interface SendTickResult {
  decision: PolicyDecision;
  dns: DnsHealth | null;
  sent: null | { followup_id: string; to: string; from: string; message_id: string };
  held: Array<{ followup_id: string; reason: string }>;
  queued: number;
  sent_today: number;
}

export async function outreachCounters(svc: Svc, settings: FullSettings, now = new Date()) {
  const dayStart = localDayStartUtc(now, settings.send_timezone).toISOString();
  const [{ count: sentToday }, { data: last }, { count: queued }] = await Promise.all([
    svc.from('commercial_followups').select('id', { count: 'exact', head: true }).eq('sent_via', 'mailbox_smtp').gte('sent_at', dayStart),
    svc.from('commercial_followups').select('sent_at').eq('sent_via', 'mailbox_smtp').order('sent_at', { ascending: false }).limit(1).maybeSingle(),
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
async function preSendGate(svc: Svc, f: QueuedFollowup): Promise<{ ok: true; to: string } | { ok: false; reason: string }> {
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
  return { ok: true, to };
}

/** Display name for outreach: first line of the campaign signature, e.g. "Bogdan Jeltov". */
async function senderName(svc: Svc, campaignId: string | null, fallback: string): Promise<string> {
  if (!campaignId) return fallback;
  const { data } = await svc.from('commercial_campaigns').select('sender_identity').eq('id', campaignId).maybeSingle();
  const first = ((data as { sender_identity?: string | null } | null)?.sender_identity ?? '').split('\n')[0].trim();
  return first && first.length <= 60 ? first : fallback;
}

export async function sendTick(ctx: MailContext, settings: FullSettings, mailboxes: MailboxRow[]): Promise<SendTickResult> {
  const { svc } = ctx;
  const counters = await outreachCounters(svc, settings);
  let dns: DnsHealth | null = null;
  try {
    dns = await checkDomainDns(DOMAIN, settings.dkim_selector);
  } catch { /* treated as not ready */ }
  const decision = canSendNow(settings, { now: new Date(), sentToday: counters.sentToday, lastSentAt: counters.lastSentAt, dnsReady: !!dns?.ready });
  const result: SendTickResult = { decision, dns, sent: null, held: [], queued: counters.queued, sent_today: counters.sentToday };
  if (!decision.ok || counters.queued === 0) return result;

  const sender = sendingMailbox(ctx, mailboxes, settings.outreach_from);
  if (!sender) {
    result.held.push({ followup_id: '-', reason: `${settings.outreach_from} is not connected (password missing) or cannot send` });
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
          .eq('campaign_id', f.campaign_id).eq('sent_via', 'mailbox_smtp').gte('sent_at', counters.dayStart);
        if ((count ?? 0) >= limit) continue; // stays queued for tomorrow
      }
    }
    const gate = await preSendGate(svc, f);
    if (!gate.ok) {
      await hold(svc, f, gate.reason, result.held);
      continue;
    }

    // Steps 2+ reply in the first touch's thread (In-Reply-To/References).
    let subject = f.subject ?? '';
    let parent: string | null = null;
    if (f.kind === 'followup') {
      const { data: first } = await svc.from('commercial_followups')
        .select('subject, internet_message_id')
        .eq('prospect_id', f.prospect_id).eq('kind', 'first_touch').eq('status', 'sent')
        .order('sent_at', { ascending: true }).limit(1).maybeSingle();
      const ft = first as { subject?: string | null; internet_message_id?: string | null } | null;
      const base = (ft?.subject ?? subject).replace(/^(re:\s*)+/i, '');
      subject = base ? `Re: ${base}` : subject;
      parent = ft?.internet_message_id ?? null;
    }
    if (!subject) subject = 'Quick question';

    let smtpAttemptStarted = false;
    try {
      const fromName = await senderName(svc, f.campaign_id, sender.box.display_name);
      // SMTP cannot provide an idempotent send guarantee. If the connection
      // drops after the server accepted DATA, automatic retry could duplicate
      // a real cold email while the CRM still says it is unsent.
      smtpAttemptStarted = true;
      const res = await sendFromMailbox(ctx.server, sender.cred, { fromName, to: gate.to, subject, text: f.draft, inReplyTo: parent, references: parent ? [parent] : [] });
      const { error } = await svc.rpc('record_commercial_followup_provider_send', {
        _followup_id: f.id,
        _sent_via: 'mailbox_smtp',
        _sent_from: sender.box.address,
        _sent_to: gate.to,
        _provider_message_id: res.smtpResponse.slice(0, 300),
        _internet_message_id: res.messageId,
      });
      if (error) throw new Error(`sent but not recorded: ${error.message}`);
      await insertMessage(svc, {
        provider: 'imap', provider_account_id: sender.box.address, internet_message_id: res.messageId,
        direction: 'outbound', mailbox_address: sender.box.address, from_address: sender.box.address, from_name: fromName, to_addresses: [gate.to],
        subject, body_text: f.draft, message_at: new Date().toISOString(), route: 'outreach', classification: 'outbound',
        prospect_id: f.prospect_id, followup_id: f.id, match_status: 'matched', sent_by_user_id: f.send_requested_by,
      });
      result.sent = { followup_id: f.id, to: gate.to, from: sender.box.address, message_id: res.messageId };
    } catch (e) {
      const attempts = f.send_attempts + 1;
      const failure = (e as Error).message.slice(0, 500);
      const heldForReconciliation = smtpAttemptStarted
        ? `held: SMTP delivery outcome must be reconciled before retry (${failure})`
        : failure;
      await svc.from('commercial_followups').update({
        send_attempts: attempts,
        send_last_error: heldForReconciliation,
        ...(smtpAttemptStarted || attempts >= 3 ? { send_requested_at: null } : {}),
      }).eq('id', f.id);
      result.held.push({ followup_id: f.id, reason: heldForReconciliation });
    }
    break; // one message per tick: pacing comes from the 5-minute schedule + min gap
  }
  return result;
}
