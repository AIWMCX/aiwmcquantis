// AIWMC Quantis — notify-checkout-intent
// ---------------------------------------------------------------------------
// Cron-driven (pg_cron, every 10 minutes). Emails the founder once per
// external `paid_checkout_start` event: which offer, when, where the visitor
// came from, what they viewed, and whether a payment was recorded since.
// Internal/test sessions are excluded via funnel_events_clean.is_internal.
// Dedupe ledger: checkout_intent_alerts (one row per funnel event).
// ---------------------------------------------------------------------------
import { createClient } from 'npm:@supabase/supabase-js@2';
import { maybeHealthResponse } from '../_shared/health.ts';
import { renderEmail, type IntentSession } from './format.ts';

const FUNCTION_NAME = 'notify-checkout-intent';
const FUNCTION_VERSION = '1.0.0';
const LOOKBACK_HOURS = 48;
const ALERT_TO = Deno.env.get('CHECKOUT_ALERT_EMAIL') || 'jeltovbogdan@gmail.com';
const FROM = 'AIWMC Quantis Alerts <noreply@aiwmcquantis.com>';

const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function channelOf(e: { utm_source: string | null; utm_medium: string | null; referrer: string | null }): string {
  if (e.utm_source) return `${e.utm_source}${e.utm_medium ? ` / ${e.utm_medium}` : ''}`;
  if (e.referrer) { try { return new URL(e.referrer).hostname.replace(/^www\./, ''); } catch { /* fall through */ } }
  return 'Direct / unknown';
}

Deno.serve(async (req) => {
  const health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (health) return health;

  const expected = Deno.env.get('CRON_SECRET');
  if (!expected || req.headers.get('x-cron-secret') !== expected) return json({ error: 'Unauthorized' }, 401);
  const dryRun = new URL(req.url).searchParams.get('dry') === '1';

  const since = new Date(Date.now() - LOOKBACK_HOURS * 3600_000).toISOString();
  const { data: clicks, error } = await supa
    .from('funnel_events_clean')
    .select('id, session_id, user_id, metadata, created_at')
    .eq('event_name', 'paid_checkout_start')
    .eq('is_internal', false)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) return json({ error: error.message }, 500);
  if (!clicks?.length) return json({ ok: true, alerted: 0 });

  const { data: done } = await supa.from('checkout_intent_alerts').select('funnel_event_id').in('funnel_event_id', clicks.map((c) => c.id));
  const seen = new Set((done ?? []).map((d) => d.funnel_event_id));
  const fresh = clicks.filter((c) => !seen.has(c.id) && c.session_id);
  if (!fresh.length) return json({ ok: true, alerted: 0 });

  const bySession = new Map<string, typeof fresh>();
  for (const c of fresh) bySession.set(c.session_id!, [...(bySession.get(c.session_id!) ?? []), c]);

  const sessions: IntentSession[] = [];
  for (const [sessionId, rows] of bySession) {
    const { data: events } = await supa
      .from('funnel_events_clean')
      .select('event_name, path, referrer, utm_source, utm_medium, utm_campaign, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(40);
    const firstEv = events?.[0] ?? { utm_source: null, utm_medium: null, referrer: null, utm_campaign: null, path: null };
    const userId = rows.find((r) => r.user_id)?.user_id ?? null;
    let userEmail: string | null = null;
    if (userId) { const { data } = await supa.auth.admin.getUserById(userId); userEmail = data?.user?.email ?? null; }
    const { data: paid } = await supa.from('paid_engagements').select('offer_code, created_at').gte('created_at', rows[0].created_at).limit(5);
    sessions.push({
      session_id: sessionId,
      clicks: rows.map((r) => {
        const m = (r.metadata ?? {}) as Record<string, unknown>;
        return { created_at: r.created_at, offer: String(m.offer_code ?? m.plan_id ?? 'unknown offer'), surface: (m.surface as string) ?? null };
      }),
      events: (events ?? []).map((e) => ({ event_name: e.event_name, path: e.path, created_at: e.created_at })),
      channel: channelOf(firstEv),
      landing_path: firstEv.path ?? null,
      referrer: firstEv.referrer ?? null,
      utm: firstEv.utm_campaign ?? null,
      user_email: userEmail,
      completed: (paid ?? []).map((p) => `${p.offer_code} at ${new Date(p.created_at).toISOString().slice(11, 16)} UTC`),
    });
  }

  const email = renderEmail(sessions);
  if (dryRun) return json({ ok: true, dry_run: true, to: ALERT_TO, ...email });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [ALERT_TO], subject: email.subject, html: email.html, text: email.text }),
  });
  if (!res.ok) return json({ error: `Resend ${res.status}: ${(await res.text()).slice(0, 200)}` }, 502);
  const sent = await res.json();

  // Record only after a successful send, so a failed send retries next tick.
  await supa.from('checkout_intent_alerts').upsert(
    fresh.map((c) => ({ funnel_event_id: c.id, session_id: c.session_id, offer: String((c.metadata as Record<string, unknown>)?.offer_code ?? (c.metadata as Record<string, unknown>)?.plan_id ?? ''), email_id: sent?.id ?? null })),
    { onConflict: 'funnel_event_id', ignoreDuplicates: true },
  );
  return json({ ok: true, alerted: fresh.length, sessions: sessions.length, email_id: sent?.id ?? null });
});
