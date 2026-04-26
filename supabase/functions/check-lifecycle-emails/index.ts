import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';

/**
 * Lifecycle Email Cron Function
 * Runs every hour via pg_cron to check which users qualify for lifecycle emails.
 * 
 * Sequences:
 * - onboarding_step_1: 48h after signup, no analyses
 * - onboarding_step_2: 96h after signup, no analyses
 * - post_analysis_step_1: 24h after first analysis
 * - reengagement_step_1: 7+ days inactive
 */
serve(async (req: Request): Promise<Response> => {
  const reqId = getRequestId(req);
  const log = createLogger('check-lifecycle-emails', reqId);

  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Security: Only allow CRON_SECRET header authentication.
    // Never compare raw service role key in authorization headers.
    const cronSecretHeader = req.headers.get("x-cron-secret");
    const expectedCronSecret = Deno.env.get("CRON_SECRET");

    if (!expectedCronSecret || expectedCronSecret.length < 10 || cronSecretHeader !== expectedCronSecret) {
      log.error("[check-lifecycle-emails] Unauthorized: missing or invalid CRON_SECRET");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey
    );

    const functionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-lifecycle-email`;

    let emailsSent = 0;
    const errors: string[] = [];

    // Helper: check if email already sent for this sequence+step
    async function alreadySent(userId: string, sequenceName: string, stepNumber: number): Promise<boolean> {
      const { data } = await supabase
        .from("email_sequence_log")
        .select("id")
        .eq("user_id", userId)
        .eq("sequence_name", sequenceName)
        .eq("step_number", stepNumber)
        .limit(1);
      return (data && data.length > 0) || false;
    }

    // Helper: check 48-hour global cooldown per user (anti-spam protection)
    async function isOnCooldown(userId: string): Promise<boolean> {
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("email_send_log")
        .select("id")
        .eq("user_id", userId)
        .gte("sent_at", cutoff)
        .limit(1);
      return (data && data.length > 0) || false;
    }

    // Helper: send lifecycle email via the existing edge function
    async function sendEmail(userId: string, templateKey: string): Promise<boolean> {
      try {
        const resp = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ user_id: userId, template_key: templateKey }),
        });
        if (resp.ok) {
          emailsSent++;
          return true;
        }
        const errText = await resp.text();
        errors.push(`Failed ${templateKey} for ${userId}: ${errText}`);
        return false;
      } catch (e) {
        errors.push(`Error ${templateKey} for ${userId}: ${e instanceof Error ? e.message : String(e)}`);
        return false;
      }
    }

    // ===== SEQUENCE 1: Onboarding Step 1 (48h after signup, no analyses) =====
    {
      const { data: users } = await supabase
        .from("profiles")
        .select("id, created_at")
        .lt("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .gt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (users) {
        for (const user of users) {
          // Skip if on 48h global cooldown (anti-spam)
          if (await isOnCooldown(user.id)) continue;

          // Check if they have any analyses
          const { count } = await supabase
            .from("analyses")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);

          if ((count || 0) === 0 && !(await alreadySent(user.id, "onboarding", 1))) {
            await sendEmail(user.id, "onboarding_step_1");
          }
        }
      }
    }

    // ===== SEQUENCE 2: Onboarding Step 2 (96h after signup, no analyses) =====
    {
      const { data: users } = await supabase
        .from("profiles")
        .select("id, created_at")
        .lt("created_at", new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString())
        .gt("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

      if (users) {
        for (const user of users) {
          if (await isOnCooldown(user.id)) continue;

          const { count } = await supabase
            .from("analyses")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id);

          if ((count || 0) === 0 && !(await alreadySent(user.id, "onboarding", 2))) {
            await sendEmail(user.id, "onboarding_step_2");
          }
        }
      }
    }

    // ===== SEQUENCE 3: Post-Analysis Step 1 (24h after first analysis) =====
    {
      const { data: recentAnalyses } = await supabase
        .from("analyses")
        .select("user_id, created_at")
        .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .gt("created_at", new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: true });

      if (recentAnalyses) {
        // Group by user, pick earliest (first analysis)
        const firstAnalysisByUser = new Map<string, string>();
        for (const a of recentAnalyses) {
          if (!firstAnalysisByUser.has(a.user_id)) {
            firstAnalysisByUser.set(a.user_id, a.created_at);
          }
        }

        for (const [userId] of firstAnalysisByUser) {
          if (await isOnCooldown(userId)) continue;

          // Only send if this is truly their first analysis ever
          const { count } = await supabase
            .from("analyses")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);

          if ((count || 0) <= 2 && !(await alreadySent(userId, "post_analysis", 1))) {
            await sendEmail(userId, "post_analysis_step_1");
          }
        }
      }
    }

    // ===== SEQUENCE 4: Re-engagement Step 1 (7+ days inactive) =====
    {
      const { data: inactiveUsers } = await supabase
        .from("user_engagement")
        .select("user_id, last_active_date")
        .lt("last_active_date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .gt("last_active_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

      if (inactiveUsers) {
        for (const user of inactiveUsers) {
          if (await isOnCooldown(user.user_id)) continue;

          if (!(await alreadySent(user.user_id, "reengagement", 1))) {
            await sendEmail(user.user_id, "reengagement_step_1");
          }
        }
      }
    }

    // ===== SEQUENCE 5: Weekly Pulse (every Monday — users with at least 1 analysis) =====
    // Only send on Mondays to create a predictable weekly habit
    {
      const today = new Date();
      const isMonday = today.getUTCDay() === 1;

      if (isMonday) {
        // Find all users who have run at least 1 analysis and are NOT on cooldown
        const { data: activeUsers } = await supabase
          .from("user_engagement")
          .select("user_id, total_analyses")
          .gt("total_analyses", 0)
          // Engagement records updated in last 90 days (recently active enough to care)
          .gt("updated_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

        if (activeUsers) {
          // Get current week number for deduplication
          const weekStart = new Date();
          weekStart.setUTCHours(0, 0, 0, 0);
          weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() + 1);
          const weekKey = weekStart.toISOString().split("T")[0]; // e.g. "2026-02-17"

          for (const user of activeUsers) {
            if (await isOnCooldown(user.user_id)) continue;

            // Check if we already sent this week's pulse
            const { data: existingPulse } = await supabase
              .from("email_send_log")
              .select("id")
              .eq("user_id", user.user_id)
              .eq("template_key", "weekly_pulse")
              .gte("sent_at", weekKey)
              .limit(1);

            if (!existingPulse || existingPulse.length === 0) {
              await sendEmail(user.user_id, "weekly_pulse");
            }
          }
        }
      }
    }

    log.info(`Lifecycle email check complete: ${emailsSent} emails sent, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        emails_sent: emailsSent,
        errors: errors.length > 0 ? errors : undefined,
        checked_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error("Error in check-lifecycle-emails:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
