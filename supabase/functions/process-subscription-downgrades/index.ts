/**
 * SCHEDULED: process-subscription-downgrades
 * ===========================================
 * Runs every hour (cron via supabase scheduled functions).
 *
 * Forensic Issue #5 — Soft Downgrade UX:
 *
 *  1. Find subscriptions where:
 *     - status = 'canceled' OR cancel_at_period_end = true
 *     - current_period_end < now()
 *     - plan_id != 'free'
 *     → Flip plan_id to 'free' (data stays read-only forever)
 *
 *  2. Find subscriptions canceled exactly 7 days ago (window: 6.5–7.5 days)
 *     → Send winback_discount email (single fire, dedupe via email_send_log)
 *
 * Idempotent: safe to run repeatedly.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';

Deno.serve(async (req) => {
  const reqId = getRequestId(req);
  const log = createLogger('process-subscription-downgrades', reqId);

  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Cron-secret guard: fail-closed
  const cronSecret = req.headers.get('x-cron-secret');
  const expected = Deno.env.get('CRON_SECRET');
  if (!expected || expected.length < 10 || cronSecret !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const summary = {
    flipped_to_free: 0,
    winback_emails_sent: 0,
    errors: [] as string[],
  };

  try {
    // ========== 1. FLIP EXPIRED PAID PLANS TO FREE ==========
    const nowIso = new Date().toISOString();
    const { data: expired, error: expErr } = await supabase
      .from("subscriptions")
      .select("user_id, plan_id, status, current_period_end, canceled_at")
      .neq("plan_id", "free")
      .lt("current_period_end", nowIso)
      .or("status.eq.canceled,cancel_at_period_end.eq.true");

    if (expErr) {
      summary.errors.push(`fetch expired: ${expErr.message}`);
    } else if (expired && expired.length > 0) {
      log.info(`[downgrade-cron] Flipping ${expired.length} expired subscriptions to free`);
      for (const sub of expired) {
        const { error: updErr } = await supabase
          .from("subscriptions")
          .update({ plan_id: "free", status: "canceled" })
          .eq("user_id", sub.user_id);
        if (updErr) {
          summary.errors.push(`flip ${sub.user_id}: ${updErr.message}`);
        } else {
          summary.flipped_to_free += 1;
        }
      }
    }

    // ========== 2. SEND WIN-BACK EMAILS (7 days post-cancel) ==========
    const sevenAgoStart = new Date(Date.now() - 7.5 * 24 * 60 * 60 * 1000).toISOString();
    const sevenAgoEnd = new Date(Date.now() - 6.5 * 24 * 60 * 60 * 1000).toISOString();

    const { data: winbackCandidates, error: wbErr } = await supabase
      .from("subscriptions")
      .select("user_id, canceled_at")
      .eq("plan_id", "free")
      .eq("status", "canceled")
      .gte("canceled_at", sevenAgoStart)
      .lte("canceled_at", sevenAgoEnd);

    if (wbErr) {
      summary.errors.push(`fetch winback: ${wbErr.message}`);
    } else if (winbackCandidates && winbackCandidates.length > 0) {
      log.info(`[downgrade-cron] ${winbackCandidates.length} winback candidates`);
      for (const sub of winbackCandidates) {
        // Dedupe: skip if already sent
        const { data: existing } = await supabase
          .from("email_send_log")
          .select("id")
          .eq("user_id", sub.user_id)
          .eq("template_key", "winback_discount")
          .maybeSingle();

        if (existing) continue;

        try {
          const { error: invokeErr } = await supabase.functions.invoke("send-lifecycle-email", {
            body: { user_id: sub.user_id, template_key: "winback_discount" },
          });
          if (invokeErr) {
            summary.errors.push(`winback ${sub.user_id}: ${invokeErr.message}`);
          } else {
            summary.winback_emails_sent += 1;
          }
        } catch (e: any) {
          summary.errors.push(`winback exc ${sub.user_id}: ${e?.message ?? e}`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, ...summary, ran_at: nowIso }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    log.error("[downgrade-cron] fatal:", e);
    return new Response(
      JSON.stringify({ success: false, error: e?.message ?? "fatal", ...summary }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
