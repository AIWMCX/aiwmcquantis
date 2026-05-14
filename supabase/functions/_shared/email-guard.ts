/**
 * Email-abuse guard for public email-sending edge functions
 * (`send-lead-magnet`, `send-welcome-email`, etc.).
 *
 * Defense-in-depth against the "anyone can email-bomb arbitrary addresses
 * via our Resend identity" abuse pattern flagged in the security scan.
 *
 * Usage (inside an edge function):
 *   const guard = await assertEmailSendAllowed(admin, { req, recipient: email, templateKey });
 *   if (!guard.ok) return guard.response;          // 429 already serialised
 *   // ... call Resend ...
 *   await guard.recordSend(resendId);              // logs to email_send_log
 *
 * Limits (per rolling hour):
 *   - 3 sends to the same recipient address
 *   - 20 sends from the same hashed caller IP
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const PER_RECIPIENT_HOURLY = 3;
const PER_IP_HOURLY = 20;

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getCallerIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') ?? '';
  return (xff.split(',')[0] ?? '').trim() || req.headers.get('cf-connecting-ip') || 'unknown';
}

export type EmailGuardArgs = {
  req: Request;
  recipient: string;
  templateKey: string;
  /** When true, skip rate limiting (e.g., authenticated user emailing themselves). */
  skip?: boolean;
};

export type EmailGuardOk = {
  ok: true;
  ipHash: string;
  recordSend: (resendId: string | null) => Promise<void>;
};

export type EmailGuardBlocked = {
  ok: false;
  response: Response;
};

export async function assertEmailSendAllowed(
  admin: SupabaseClient,
  args: EmailGuardArgs,
  corsHeaders: Record<string, string>,
): Promise<EmailGuardOk | EmailGuardBlocked> {
  const recipient = args.recipient.trim().toLowerCase();
  const ipHash = await sha256(getCallerIp(args.req));

  const recordSend = async (resendId: string | null) => {
    try {
      await admin.from('email_send_log').insert({
        email: recipient,
        template_key: `${args.templateKey}|ip:${ipHash.slice(0, 16)}`,
        resend_id: resendId,
      });
    } catch {
      // Non-fatal: telemetry failure should never block the send response.
    }
  };

  if (args.skip) return { ok: true, ipHash, recordSend };

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [{ count: recipientCount }, { count: ipCount }] = await Promise.all([
    admin
      .from('email_send_log')
      .select('id', { count: 'exact', head: true })
      .eq('email', recipient)
      .gt('sent_at', oneHourAgo),
    admin
      .from('email_send_log')
      .select('id', { count: 'exact', head: true })
      .like('template_key', `%|ip:${ipHash.slice(0, 16)}`)
      .gt('sent_at', oneHourAgo),
  ]);

  if ((recipientCount ?? 0) >= PER_RECIPIENT_HOURLY) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error: 'RATE_LIMITED',
          scope: 'recipient',
          retry_after_seconds: 3600,
          message: 'This address has received the maximum permitted emails this hour.',
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '3600' },
        },
      ),
    };
  }

  if ((ipCount ?? 0) >= PER_IP_HOURLY) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error: 'RATE_LIMITED',
          scope: 'ip',
          retry_after_seconds: 3600,
          message: 'Hourly send limit reached for this client. Try again later.',
        }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '3600' },
        },
      ),
    };
  }

  return { ok: true, ipHash, recordSend };
}
