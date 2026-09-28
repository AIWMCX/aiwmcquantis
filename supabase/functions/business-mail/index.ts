// AIWMC Quantis — business mail (support@ / legal@ ticketing, hello@ /
// market@ acquisition, paced outreach sender).
// ---------------------------------------------------------------------------
// Two callers:
//   * pg_cron every 5 minutes (x-cron-secret) → action "tick": sync the
//     IONOS mailboxes (IMAP) into tickets / the prospect pipeline, then at
//     most one paced outreach send (SMTP).
//   * /admin/inbox and /admin/commercial (admin Bearer token) → status,
//     settings, ticket replies/notes/status, queue/cancel sends.
// Until BUSINESS_MAILBOX_PASSWORDS is set, every path reports
// configured:false and does nothing.
// ---------------------------------------------------------------------------
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { maybeHealthResponse } from '../_shared/health.ts';
import { checkDomainDns } from '../_shared/mail/dns-health.ts';
import { canSendNow } from '../_shared/mail/send-policy.ts';
import { extractAddresses, normalizeEmail } from '../_shared/mail/routing.ts';
import { checkMailbox, mailboxCredentialsFromEnv, mailServerFromEnv } from '../_shared/mail/mailbox-account.ts';
import {
  DOMAIN,
  loadMailboxes,
  loadSettings,
  outreachCounters,
  replyToTicket,
  sendTick,
  syncMailboxes,
  type MailContext,
  type Svc,
} from './pipeline.ts';

const FUNCTION_NAME = 'business-mail';
const FUNCTION_VERSION = '1.1.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const SETTINGS_FIELDS = new Set([
  'outreach_enabled', 'outreach_from', 'daily_cap', 'warmup_start', 'warmup_base', 'warmup_step', 'min_gap_minutes',
  'send_timezone', 'send_start_hour', 'send_end_hour', 'send_weekdays', 'dkim_selector', 'support_auto_ack',
]);

Deno.serve(async (req) => {
  const health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (health) return health;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const j = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const svc = createClient(SUPABASE_URL, SERVICE_KEY) as Svc;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');

    // ── Auth: cron secret (tick only) or an admin user ────────────────────
    const cronSecret = Deno.env.get('CRON_SECRET');
    const isCron = !!cronSecret && req.headers.get('x-cron-secret') === cronSecret;
    let userId: string | null = null;
    if (!isCron) {
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
      if (!token) return j({ error: 'Unauthorized' }, 401);
      const { data: userRes } = await svc.auth.getUser(token);
      if (!userRes?.user) return j({ error: 'Unauthorized' }, 401);
      const { data: roles } = await svc.from('user_roles').select('role').eq('user_id', userRes.user.id).eq('role', 'admin');
      if (!roles || roles.length === 0) return j({ error: 'Admin only' }, 403);
      userId = userRes.user.id;
    } else if (action !== 'tick') {
      return j({ error: 'cron may only call tick' }, 403);
    }

    const ctx: MailContext = { svc, server: mailServerFromEnv(), creds: mailboxCredentialsFromEnv() };
    const configured = ctx.creds.size > 0;

    switch (action) {
      case 'tick':
      case 'sync_now':
      case 'send_tick': {
        if (!configured) return j({ success: true, configured: false, detail: 'BUSINESS_MAILBOX_PASSWORDS not set' });
        const [settings, mailboxes] = await Promise.all([loadSettings(svc), loadMailboxes(svc)]);
        const sync = action === 'send_tick' ? null : await syncMailboxes(ctx, settings, mailboxes);
        const send = action === 'sync_now' ? null : await sendTick(ctx, settings, mailboxes);
        return j({ success: true, configured: true, sync, send: send && { ...send, dns: send.dns?.ready ?? false } });
      }

      case 'status': {
        const settings = await loadSettings(svc);
        const [mailboxes, syncState, counters] = await Promise.all([
          loadMailboxes(svc),
          svc.from('mail_sync_state').select('*'),
          outreachCounters(svc, settings),
        ]);
        let dns = null;
        try { dns = await checkDomainDns(DOMAIN, settings.dkim_selector); } catch (e) { dns = { ready: false, error: (e as Error).message }; }
        // Live login check for every mailbox that has a password.
        const connections = await Promise.all(
          mailboxes.map(async (m) => {
            const cred = ctx.creds.get(m.address);
            if (!cred) return { address: m.address, connected: false, error: 'no password in BUSINESS_MAILBOX_PASSWORDS' };
            const r = await checkMailbox(ctx.server, cred);
            return r.ok ? { address: m.address, connected: true, sent_folder: r.sent_folder } : { address: m.address, connected: false, error: r.error };
          }),
        );
        const decision = canSendNow(settings, { now: new Date(), sentToday: counters.sentToday, lastSentAt: counters.lastSentAt, dnsReady: !!(dns as { ready?: boolean }).ready });
        const openCounts = await svc.from('support_tickets').select('queue, status').in('status', ['open', 'pending']);
        return j({
          success: true,
          configured,
          server: { imap: `${ctx.server.imapHost}:${ctx.server.imapPort}`, smtp: `${ctx.server.smtpHost}:${ctx.server.smtpPort}` },
          connections,
          dns,
          settings,
          mailboxes,
          sync_state: syncState.data ?? [],
          outreach: { ...counters, decision },
          tickets_open: (openCounts.data ?? []).reduce((acc: Record<string, number>, t: { queue: string; status: string }) => {
            const k = `${t.queue}_${t.status}`;
            acc[k] = (acc[k] ?? 0) + 1;
            return acc;
          }, {}),
        });
      }

      case 'update_settings': {
        const patch: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(body.patch ?? {})) if (SETTINGS_FIELDS.has(k)) patch[k] = v;
        if (typeof patch.outreach_from === 'string') {
          const addr = normalizeEmail(patch.outreach_from as string);
          if (!addr.endsWith(`@${DOMAIN}`)) return j({ error: `outreach_from must be an @${DOMAIN} address` }, 400);
          patch.outreach_from = addr;
        }
        if (patch.outreach_enabled === true) {
          // Turning sending on: require passing DNS, and start the warm-up
          // ramp on first enable so volume grows gradually.
          const s = await loadSettings(svc);
          const dns = await checkDomainDns(DOMAIN, (patch.dkim_selector as string) ?? s.dkim_selector).catch(() => null);
          if (!dns?.ready) return j({ error: 'DNS not ready: point MX to IONOS first so replies reach the mailboxes (see Mailbox & sending)', dns }, 409);
          if (!configured) return j({ error: 'Business mailboxes are not connected (BUSINESS_MAILBOX_PASSWORDS missing)' }, 409);
          if (!s.warmup_start && patch.warmup_start === undefined) patch.warmup_start = new Date().toISOString().slice(0, 10);
        }
        patch.updated_at = new Date().toISOString();
        patch.updated_by = userId;
        const { data, error } = await svc.from('mail_settings').update(patch).eq('id', true).select().single();
        if (error) return j({ error: error.message }, 400);
        return j({ success: true, settings: data });
      }

      case 'update_mailbox': {
        const address = normalizeEmail(String(body.address ?? ''));
        const patch: Record<string, unknown> = {};
        for (const k of ['active', 'can_send', 'display_name']) if (body[k] !== undefined) patch[k] = body[k];
        const { data, error } = await svc.from('business_mailboxes').update(patch).eq('address', address).select().single();
        if (error) return j({ error: error.message }, 400);
        return j({ success: true, mailbox: data });
      }

      // ── Outreach queue (approved messages only) ───────────────────────
      case 'request_send': {
        const ids: string[] = (Array.isArray(body.followup_ids) ? body.followup_ids : [body.followup_id]).map(String).filter(Boolean);
        if (ids.length === 0) return j({ error: 'followup_ids required' }, 400);
        const { data: rows } = await svc.from('commercial_followups').select('id, status, prospect_id').in('id', ids);
        const results: Array<{ id: string; queued: boolean; reason?: string }> = [];
        for (const r of (rows ?? []) as Array<{ id: string; status: string; prospect_id: string }>) {
          if (r.status !== 'approved') { results.push({ id: r.id, queued: false, reason: `status is ${r.status}` }); continue; }
          const { data: p } = await svc.from('commercial_prospects').select('contact_channel, suppression_status').eq('id', r.prospect_id).single();
          const pp = p as { contact_channel: string | null; suppression_status: string };
          const to = extractAddresses(pp?.contact_channel)[0];
          if (!to) { results.push({ id: r.id, queued: false, reason: 'prospect has no email address' }); continue; }
          if (pp.suppression_status !== 'active') { results.push({ id: r.id, queued: false, reason: `prospect ${pp.suppression_status}` }); continue; }
          const { data: sup } = await svc.from('email_suppressions').select('reason').eq('email', to).maybeSingle();
          if (sup) { results.push({ id: r.id, queued: false, reason: `address suppressed (${(sup as { reason: string }).reason})` }); continue; }
          const { error } = await svc.from('commercial_followups')
            .update({ send_requested_at: new Date().toISOString(), send_requested_by: userId, send_last_error: null, send_attempts: 0 })
            .eq('id', r.id).eq('status', 'approved');
          results.push(error ? { id: r.id, queued: false, reason: error.message } : { id: r.id, queued: true });
        }
        return j({ success: true, results });
      }

      case 'cancel_send': {
        const id = String(body.followup_id ?? '');
        const { error } = await svc.from('commercial_followups').update({ send_requested_at: null, send_last_error: 'cancelled by admin' }).eq('id', id).eq('status', 'approved');
        if (error) return j({ error: error.message }, 400);
        return j({ success: true });
      }

      case 'suppress_email': {
        const email = normalizeEmail(String(body.email ?? ''));
        const reason = String(body.reason ?? 'do_not_contact');
        if (!email || !['unsubscribed', 'hard_bounced', 'do_not_contact', 'complaint'].includes(reason)) return j({ error: 'email and a valid reason required' }, 400);
        const { error } = await svc.from('email_suppressions').upsert({ email, reason, source: `admin ${userId}` }, { onConflict: 'email' });
        if (error) return j({ error: error.message }, 400);
        return j({ success: true });
      }

      // ── Tickets ────────────────────────────────────────────────────────
      case 'ticket_reply': {
        if (!configured) return j({ error: 'Business mailboxes are not connected (BUSINESS_MAILBOX_PASSWORDS missing)' }, 409);
        const ticketId = String(body.ticket_id ?? '');
        const text = String(body.body ?? '').trim();
        const statusAfter = ['pending', 'resolved', 'open'].includes(body.status_after) ? body.status_after : 'pending';
        if (!ticketId || text.length < 2) return j({ error: 'ticket_id and body required' }, 400);
        const mailboxes = await loadMailboxes(svc);
        const res = await replyToTicket(ctx, mailboxes, ticketId, text, userId!, statusAfter);
        return j({ success: true, ...res });
      }

      case 'ticket_update': {
        const ticketId = String(body.ticket_id ?? '');
        const { data: t } = await svc.from('support_tickets').select('status, priority, assignee_user_id').eq('id', ticketId).single();
        if (!t) return j({ error: 'ticket not found' }, 404);
        const before = t as { status: string; priority: string; assignee_user_id: string | null };
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        const events: Array<{ kind: string; body: string }> = [];
        if (body.status && body.status !== before.status) {
          if (!['open', 'pending', 'resolved', 'closed'].includes(body.status)) return j({ error: 'bad status' }, 400);
          patch.status = body.status;
          events.push({ kind: 'status', body: `${before.status} → ${body.status}` });
        }
        if (body.priority && body.priority !== before.priority) {
          if (!['low', 'normal', 'high', 'urgent'].includes(body.priority)) return j({ error: 'bad priority' }, 400);
          patch.priority = body.priority;
          events.push({ kind: 'priority', body: `${before.priority} → ${body.priority}` });
        }
        if (body.assign_to_me === true) {
          patch.assignee_user_id = userId;
          events.push({ kind: 'assign', body: 'assigned' });
        }
        const { error } = await svc.from('support_tickets').update(patch).eq('id', ticketId);
        if (error) return j({ error: error.message }, 400);
        if (events.length) await svc.from('support_ticket_events').insert(events.map((e) => ({ ...e, ticket_id: ticketId, actor_user_id: userId })));
        return j({ success: true });
      }

      case 'ticket_note': {
        const ticketId = String(body.ticket_id ?? '');
        const text = String(body.body ?? '').trim();
        if (!ticketId || !text) return j({ error: 'ticket_id and body required' }, 400);
        const { error } = await svc.from('support_ticket_events').insert({ ticket_id: ticketId, kind: 'note', body: text.slice(0, 5000), actor_user_id: userId });
        if (error) return j({ error: error.message }, 400);
        await svc.from('support_tickets').update({ updated_at: new Date().toISOString() }).eq('id', ticketId);
        return j({ success: true });
      }

      default:
        return j({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return j({ error: message }, 500);
  }
});
