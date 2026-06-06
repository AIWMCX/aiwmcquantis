import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';

interface ChurnCheckResult {
  users_checked: number;
  churn_risks_updated: number;
  notifications_created: number;
  emails_queued: number;
}

serve(async (req: Request): Promise<Response> => {
  const reqId = getRequestId(req);
  const log = createLogger('check-churn-signals', reqId);

  const corsHeaders = corsHeadersFor(req);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify cron secret for scheduled calls
    const cronSecret = Deno.env.get("CRON_SECRET");
    const providedSecret = req.headers.get("x-cron-secret");
    
    // Allow service role calls or valid cron secret
    const authHeader = req.headers.get("authorization") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const isServiceRole = serviceKey.length > 10 && authHeader.includes(serviceKey);
    const isCronSecret = cronSecret && cronSecret.length > 5 && providedSecret === cronSecret;
    // Allow anon key only when no CRON_SECRET is set (pg_cron backward compat)
    const isAnonWithNoCronSecret = anonKey.length > 10 && authHeader.includes(anonKey) && (!cronSecret || cronSecret.length === 0);
    
    if (!isServiceRole && !isCronSecret && !isAnonWithNoCronSecret) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const result: ChurnCheckResult = {
      users_checked: 0,
      churn_risks_updated: 0,
      notifications_created: 0,
      emails_queued: 0,
    };

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Get all users with their engagement data
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        created_at,
        user_engagement (
          current_streak,
          total_analyses,
          total_exports,
          activity_score,
          engagement_tier,
          last_active_date,
          churn_risk_score
        )
      `);

    if (usersError) throw usersError;

    for (const user of users || []) {
      result.users_checked++;

      const engagement = user.user_engagement?.[0];
      const lastActive = engagement?.last_active_date 
        ? new Date(engagement.last_active_date) 
        : new Date(user.created_at);
      
      const daysSinceActive = Math.floor(
        (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate churn risk score (0-100)
      let risk = 0;

      // Days since last activity (0-40 points)
      risk += Math.min(40, daysSinceActive * 2);

      // No analyses completed (20 points)
      if (!engagement || engagement.total_analyses === 0) {
        risk += 20;
      }

      // Never exported PDF (10 points)
      if (!engagement || engagement.total_exports === 0) {
        risk += 10;
      }

      // Low activity score (0-20 points)
      const activityScore = engagement?.activity_score || 0;
      risk += Math.max(0, 20 - (activityScore / 5));

      // Additional factor: new user with no engagement after 3 days (10 points)
      const daysSinceSignup = Math.floor(
        (today.getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceSignup > 3 && (!engagement || engagement.total_analyses === 0)) {
        risk += 10;
      }

      risk = Math.min(100, Math.round(risk));

      // Determine engagement tier
      let newTier: string;
      if (risk <= 30) {
        newTier = engagement?.total_analyses >= 10 ? "power" : "active";
      } else if (risk <= 50) {
        newTier = "active";
      } else if (risk <= 70) {
        newTier = "dormant";
      } else {
        newTier = "churned";
      }

      // Update engagement record
      const previousRisk = engagement?.churn_risk_score || 0;
      const previousTier = engagement?.engagement_tier || "new";

      if (risk !== previousRisk || newTier !== previousTier) {
        await supabase
          .from("user_engagement")
          .upsert({
            user_id: user.id,
            churn_risk_score: risk,
            engagement_tier: newTier,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id",
          });

        result.churn_risks_updated++;
      }

      // Create interventions based on risk level
      // At Risk (31-50): Show feature highlight in-app
      if (risk > 30 && risk <= 50 && previousRisk <= 30) {
        await supabase.from("user_notifications").insert({
          user_id: user.id,
          notification_type: "feature",
          title: "Have you tried PDF export?",
          message: "Export your analyses as professional PDF reports to share with investors or your team.",
          action_url: "/app",
          action_label: "Try it now",
          icon: "file-text",
        });
        result.notifications_created++;
      }

      // Check for re-engagement email triggers
      const { data: emailLogs } = await supabase
        .from("email_sequence_log")
        .select("step_number")
        .eq("user_id", user.id)
        .eq("sequence_name", "reengagement");

      const sentSteps = new Set((emailLogs || []).map(l => l.step_number));

      // Day 7: First re-engagement email
      if (daysSinceActive >= 7 && !sentSteps.has(1)) {
        await supabase.functions.invoke("send-lifecycle-email", {
          body: {
            user_id: user.id,
            template_key: "reengagement_step_1",
          },
        });
        result.emails_queued++;
      }

      // High Risk (51-70): Personal touch
      if (risk > 50 && risk <= 70 && previousRisk <= 50) {
        await supabase.from("user_notifications").insert({
          user_id: user.id,
          notification_type: "system",
          title: "We miss you!",
          message: "It's been a while since your last analysis. We've added new features you might like.",
          action_url: "/app",
          action_label: "See what's new",
          icon: "heart",
        });
        result.notifications_created++;
      }

      // Churning (71-100): Create admin alert
      if (risk > 70 && previousRisk <= 70) {
        log.info(`CHURN ALERT: User ${user.id} (${user.full_name}) has entered churning state. Risk: ${risk}`);
        
        // Could trigger admin webhook here
        await supabase.from("user_notifications").insert({
          user_id: user.id,
          notification_type: "tip",
          title: "Need help getting started?",
          message: "We're here to help! Reply to any of our emails and we'll personally assist you.",
          action_url: "/app",
          action_label: "Start analysis",
          icon: "help-circle",
        });
        result.notifications_created++;
      }
    }

    log.info("Churn check complete:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error("Error in check-churn-signals:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
