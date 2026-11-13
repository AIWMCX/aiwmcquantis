import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { assertEmailSendAllowed } from '../_shared/email-guard.ts';
import { maybeHealthResponse } from '../_shared/health.ts';
import { parseResultEmailRequest, renderResultEmail } from '../_shared/result-email.ts';

const FUNCTION_NAME = 'email-my-result';
const FUNCTION_VERSION = '1.0.0';
/** The business inbox the founder reads (replies are the point). */
const REPLY_TO = 'market@aiwmcquantis.com';
const FOUNDER_ALERT_TO = 'AIWMCSRM@gmail.com';

/**
 * Email a visitor the result they just saw [F3, M5].
 * POST { email, surface, title?, rows: [{label, value}], path }
 * Rate-limited per recipient and per IP (email-guard). Content is validated
 * and escaped in _shared/result-email.ts; nothing free-form is mailed.
 */
Deno.serve(async (req) => {
  const health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (health) return health;
  const log = createLogger(FUNCTION_NAME, getRequestId(req));
  const cors = corsHeadersFor(req);
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'POST only' });

  let body: unknown;
  try { body = await req.json(); } catch { return json(400, { error: 'Invalid JSON' }); }
  const parsed = parseResultEmailRequest(body);
  if (!parsed.ok) return json(400, { error: parsed.error });
  const r = parsed.value;

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const guard = await assertEmailSendAllowed(admin, { req, recipient: r.email, templateKey: `result:${r.surface}` }, cors);
  if (!guard.ok) {
    log.info('Result email rate-limited', { surface: r.surface });
    return guard.response;
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    log.error('RESEND_API_KEY not configured');
    return json(500, { error: 'Email service not configured' });
  }

  const mail = renderResultEmail(r);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'AIWMC Quantis <hello@aiwmcquantis.com>',
      to: [r.email],
      reply_to: REPLY_TO,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    }),
  });
  if (!res.ok) {
    log.error('Resend error', { status: res.status, body: (await res.text()).slice(0, 300) });
    return json(502, { error: 'Could not send the email. Try again in a minute.' });
  }
  const sent = await res.json().catch(() => ({}));
  await guard.recordSend(sent?.id ?? null);

  // Keep the contact (encrypted at rest by capture_lead). Not a newsletter
  // subscription: status stays pending_confirmation, no marketing is sent.
  let leadId: string | null = null;
  try {
    const { data, error } = await admin.rpc('capture_lead', {
      p_email: r.email,
      p_source: 'email_my_result',
      p_offer: r.surface,
      p_metadata: { surface: r.surface, title: r.title ?? null, rows: r.rows, path: r.path, consent: 'transactional_result_only' },
    });
    if (error && !/already captured/i.test(error.message)) log.error('capture_lead failed', { message: error.message });
    leadId = (data as string | null) ?? null;
  } catch (e) {
    log.error('capture_lead threw', { message: e instanceof Error ? e.message : String(e) });
  }

  // Speed to lead: tell the founder now, with what the visitor looked at.
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'AIWMC Quantis <hello@aiwmcquantis.com>',
        to: [FOUNDER_ALERT_TO],
        subject: `Result emailed (${r.surface}): reply within the hour`,
        text: `${r.email} asked for their ${r.surface} result.\n\n${r.rows.map((x) => `${x.label}: ${x.value}`).join('\n')}\n\nPath: ${r.path}\nLead: ${leadId ?? 'n/a'}\n\nThey were told replies reach the founder (reply-to ${REPLY_TO}).`,
      }),
    });
  } catch (e) {
    log.error('Founder alert failed', { message: e instanceof Error ? e.message : String(e) });
  }

  log.info('Result emailed', { surface: r.surface });
  return json(200, { success: true });
});
