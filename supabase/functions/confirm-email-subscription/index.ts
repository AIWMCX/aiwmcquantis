import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { maybeHealthResponse } from '../_shared/health.ts';

const FUNCTION_NAME = 'confirm-email-subscription';
const FUNCTION_VERSION = '1.0.0';
const APP_URL = 'https://aiwmcquantis.com';

serve(async (req: Request): Promise<Response> => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;

  const reqId = getRequestId(req);
  const log = createLogger('confirm-email-subscription', reqId);
  const corsHeaders = corsHeadersFor(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── CONFIRM EMAIL ──
    if (action === 'confirm') {
      const token = url.searchParams.get('token');
      if (!token) {
        return redirect(`${APP_URL}/email-confirmed?status=invalid`);
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(token)) {
        return redirect(`${APP_URL}/email-confirmed?status=invalid`);
      }

      const { data, error } = await admin.rpc('confirm_lead_email', { p_token: token });

      if (error || !data || data.length === 0) {
        log.warn(`Confirmation failed for token ${token.slice(0, 8)}...: ${error?.message || 'not found or already confirmed'}`);
        return redirect(`${APP_URL}/email-confirmed?status=already`);
      }

      const leadId = data[0].lead_id;
      log.info(`Lead ${leadId} confirmed via token`);

      // Now send the actual welcome email
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const functionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-welcome-email`;

      // Get decrypted email for sending welcome
      const { data: decryptedEmail } = await admin.rpc('get_lead_email', { p_lead_id: leadId });

      if (decryptedEmail) {
        const emailName = decryptedEmail.split('@')[0].replace(/[._-]/g, ' ') || 'Friend';
        const capitalizedName = emailName.split(' ').map((w: string) =>
          w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        ).join(' ');

        try {
          await fetch(functionUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ email: decryptedEmail, name: capitalizedName }),
          });
        } catch (e) {
          log.error(`Failed to send welcome email after confirmation: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      return redirect(`${APP_URL}/email-confirmed?status=success`);
    }

    // ── UNSUBSCRIBE ──
    if (action === 'unsubscribe') {
      const hash = url.searchParams.get('hash');
      if (!hash || hash.length !== 64) {
        return redirect(`${APP_URL}/email-preferences?status=invalid`);
      }

      const { data: result } = await admin.rpc('unsubscribe_lead', { p_email_hash: hash });

      // Also unsubscribe authenticated user if they exist with this email hash
      await admin
        .from('profiles')
        .update({ email_marketing_opt_in: false })
        .eq('id',
          admin.from('leads').select('metadata->>user_id').eq('email_hash', hash).single()
        );

      log.info(`Unsubscribed hash ${hash.slice(0, 8)}...`);
      return redirect(`${APP_URL}/email-preferences?status=unsubscribed`);
    }

    // ── RESUBSCRIBE ──
    if (action === 'resubscribe') {
      const hash = url.searchParams.get('hash');
      if (!hash || hash.length !== 64) {
        return redirect(`${APP_URL}/email-preferences?status=invalid`);
      }

      await admin.rpc('resubscribe_lead', { p_email_hash: hash });
      log.info(`Resubscribed hash ${hash.slice(0, 8)}...`);
      return redirect(`${APP_URL}/email-preferences?status=resubscribed`);
    }

    // ── EMAIL OPEN TRACKING (1x1 pixel) ──
    if (action === 'open') {
      const eid = url.searchParams.get('eid');
      if (eid) {
        admin.from('email_engagement').insert({
          email_send_log_id: eid,
          event_type: 'open',
        }).then(() => {});
      }
      const pixel = new Uint8Array([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
        0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
        0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
        0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
        0x01, 0x00, 0x3b,
      ]);
      return new Response(pixel, {
        status: 200,
        headers: {
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    // ── EMAIL CLICK TRACKING (redirect) ──
    if (action === 'click') {
      const eid = url.searchParams.get('eid');
      const dest = url.searchParams.get('url');
      if (eid) {
        admin.from('email_engagement').insert({
          email_send_log_id: eid,
          event_type: 'click',
          metadata: { destination: dest },
        }).then(() => {});
      }
      if (dest && (dest.startsWith('https://aiwmcquantis.com') || dest.startsWith('/'))) {
        return redirect(dest);
      }
      return redirect(APP_URL);
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error("Error in confirm-email-subscription:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function redirect(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: url },
  });
}
