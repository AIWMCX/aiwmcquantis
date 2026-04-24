import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

import { corsHeadersFor } from '../_shared/cors.ts';
interface LifecycleEmailRequest {
  user_id?: string;
  email?: string;
  template_key: string;
  dynamic_data?: Record<string, unknown>;
}

// Email templates
const EMAIL_TEMPLATES: Record<string, { subject: string; html: (data: Record<string, unknown>) => string }> = {
  onboarding_step_1: {
    subject: "Your first analysis is just 2 minutes away",
    html: (data) => `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px;">Hi ${data.first_name || 'there'}! 👋</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          We noticed you haven't run your first business analysis yet. Let's change that!
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          In just <strong>2 minutes</strong>, you can:
        </p>
        <ul style="color: #4a4a4a; font-size: 16px; line-height: 1.8;">
          <li>Get financial projections for any business idea</li>
          <li>See estimated startup costs and payback period</li>
          <li>Receive a detailed market analysis</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.app_url || 'https://aiwmcquantis.com'}/app" 
             style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Start Your Free Analysis
          </a>
        </div>
        <p style="color: #888; font-size: 14px;">
          You have ${data.remaining_analyses || 3} free analyses remaining this month.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #888; font-size: 12px;">
          AIWMC Quantis - AI Business Intelligence Platform
        </p>
      </div>
    `,
  },
  onboarding_step_2: {
    subject: "3 things you're missing without your analysis",
    html: (data) => `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px;">Don't miss out, ${data.first_name || 'friend'}!</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Every day without data is a day of guessing. Here's what you're missing:
        </p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #1a1a1a; margin: 0 0 12px 0;"><strong>1. Financial Clarity</strong></p>
          <p style="color: #4a4a4a; margin: 0 0 16px 0; font-size: 14px;">Know exactly how much to invest and when you'll break even.</p>
          
          <p style="color: #1a1a1a; margin: 0 0 12px 0;"><strong>2. Market Insights</strong></p>
          <p style="color: #4a4a4a; margin: 0 0 16px 0; font-size: 14px;">Understand your competition and market opportunity.</p>
          
          <p style="color: #1a1a1a; margin: 0 0 12px 0;"><strong>3. Investor-Ready Reports</strong></p>
          <p style="color: #4a4a4a; margin: 0; font-size: 14px;">Export professional PDFs for presentations.</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.app_url || 'https://aiwmcquantis.com'}/app" 
             style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Get Your Analysis Now
          </a>
        </div>
      </div>
    `,
  },
  post_analysis_step_1: {
    subject: "Your analysis is ready to export!",
    html: (data) => `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px;">Congratulations! 🎉</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          You've completed your first business analysis. That puts you ahead of most aspiring entrepreneurs!
        </p>
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 20px; border-radius: 8px; margin: 20px 0; color: white;">
          <p style="margin: 0; font-size: 18px; font-weight: 600;">Did you know?</p>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
            You can export your analysis as a professional PDF to share with investors, partners, or your team.
          </p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.app_url || 'https://aiwmcquantis.com'}/app" 
             style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            View & Export Your Analysis
          </a>
        </div>
      </div>
    `,
  },
  reengagement_step_1: {
    subject: "We noticed you haven't been back...",
    html: (data) => `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px;">Hi ${data.first_name || 'there'},</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          It's been a week since your last visit to AIWMC Quantis, and we wanted to check in.
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Your <strong>${data.remaining_analyses || 3} free analyses</strong> are still waiting for you.
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          In case you missed it, here's what you can do:
        </p>
        <ul style="color: #4a4a4a; font-size: 16px; line-height: 1.8;">
          <li>Analyze any business idea in under 2 minutes</li>
          <li>Get detailed financial projections</li>
          <li>Export bank-ready PDF reports</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.app_url || 'https://aiwmcquantis.com'}/app" 
             style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Start Your Free Analysis
          </a>
        </div>
        <p style="color: #888; font-size: 14px;">
          If you have any questions or feedback, just reply to this email.
        </p>
      </div>
    `,
  },
  achievement: {
    subject: "You've earned a new badge! 🏆",
    html: (data) => `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px;">Congratulations, ${data.first_name || 'champion'}! 🎉</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          You've earned the <strong>${data.badge_name}</strong> badge!
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; padding: 20px 40px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 12px;">
            <span style="font-size: 48px;">🏆</span>
            <p style="color: white; font-size: 18px; font-weight: 600; margin: 10px 0 0 0;">${data.badge_name}</p>
          </div>
        </div>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; text-align: center;">
          ${data.badge_description || 'Keep up the great work!'}
        </p>
        ${data.next_milestone ? `
          <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="color: #888; margin: 0; font-size: 14px;">Next milestone:</p>
            <p style="color: #1a1a1a; margin: 8px 0 0 0; font-weight: 600;">${data.next_milestone}</p>
          </div>
        ` : ''}
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.app_url || 'https://aiwmcquantis.com'}/app" 
             style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            View Your Progress
          </a>
        </div>
      </div>
    `,
  },

  // ── DOWNGRADE / WIN-BACK SEQUENCE ──
  cancellation_confirmed: {
    subject: "Your Plus subscription will end soon — last chance",
    html: (data) => `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px;">We're sorry to see you go, ${data.first_name || 'there'}</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Your Plus subscription has been canceled. You'll keep full access until <strong>${data.period_end_human || 'the end of your current billing period'}</strong>, then your account will revert to Free.
        </p>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: 600;">Your data is safe.</p>
          <p style="color: #92400e; margin: 6px 0 0 0; font-size: 14px;">Every analysis you've run stays read-only on your account, forever. You can come back anytime.</p>
        </div>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          What you'll lose at ${data.period_end_human || 'period end'}:
        </p>
        <ul style="color: #4a4a4a; font-size: 15px; line-height: 1.8;">
          <li>95,500-scenario Monte Carlo simulation</li>
          <li>36-month P&L projections with variance bands</li>
          <li>Pre-Mortem Stress Test + Invoice & Capacity Check</li>
          <li>Document Studio (12 branded templates)</li>
          <li>Watermark-free PDF exports + unlimited downloads</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.app_url || 'https://aiwmcquantis.com'}/plus-settings"
             style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Reactivate before ${data.period_end_human || 'period end'}
          </a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center; margin-top: 30px;">
          Or reply to this email — we'd love to hear what we could improve.
        </p>
      </div>
    `,
  },

  winback_discount: {
    subject: "30% off Plus — come back to Quantis",
    html: (data) => `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px;">${data.first_name || 'Hey'}, your data's still here</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          It's been a week since your Plus subscription ended. Every analysis you ran is still on your account — but you've been locked out of Monte Carlo, P&L projections, and the Document Studio.
        </p>
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); padding: 28px; border-radius: 12px; margin: 24px 0; text-align: center;">
          <p style="color: white; font-size: 14px; margin: 0; opacity: 0.9; letter-spacing: 1px;">EXCLUSIVE WIN-BACK OFFER</p>
          <p style="color: white; font-size: 36px; font-weight: 700; margin: 8px 0;">30% OFF</p>
          <p style="color: white; font-size: 16px; margin: 0; opacity: 0.95;">First 3 months of Plus</p>
          <p style="color: white; font-size: 13px; margin: 12px 0 0 0; opacity: 0.8;">Code: <strong style="background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 4px; letter-spacing: 1.5px;">COMEBACK30</strong></p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.app_url || 'https://aiwmcquantis.com'}/pricing?promo=COMEBACK30"
             style="background: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Reactivate at $11.90/mo
          </a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center;">
          Offer expires in 7 days. No further reminders after this — your data stays read-only regardless.
        </p>
      </div>
    `,
  },
};

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = corsHeadersFor(req);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { user_id, email, template_key, dynamic_data = {} }: LifecycleEmailRequest = await req.json();

    // Validate template exists
    const template = EMAIL_TEMPLATES[template_key];
    if (!template) {
      throw new Error(`Unknown template: ${template_key}`);
    }

    // Get user email if only user_id provided
    let recipientEmail = email;
    let userData: Record<string, unknown> = {};

    if (user_id && !recipientEmail) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id);
      if (authError) throw authError;
      recipientEmail = authUser.user?.email;

      // Get profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user_id)
        .single();

      userData = {
        first_name: profile?.full_name?.split(" ")[0] || "there",
      };

      // Get remaining analyses for free users
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan_id")
        .eq("user_id", user_id)
        .single();

      if (subscription?.plan_id === "free") {
        const monthYear = new Date().toISOString().slice(0, 7);
        const { data: usage } = await supabase
          .from("usage_tracking")
          .select("analyses_count")
          .eq("user_id", user_id)
          .eq("month_year", monthYear)
          .single();

        userData.remaining_analyses = Math.max(0, 3 - (usage?.analyses_count || 0));
      }
    }

    if (!recipientEmail) {
      throw new Error("No recipient email provided or found");
    }

    // Merge dynamic data
    const templateData = {
      ...userData,
      ...dynamic_data,
      app_url: Deno.env.get("APP_URL") || "https://aiwmcquantis.com",
    };

    // Send email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "AIWMC Quantis <noreply@aiwmcquantis.com>",
        to: [recipientEmail],
        subject: template.subject,
        html: template.html(templateData),
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const result = await emailResponse.json();
    console.log(`Lifecycle email sent: ${template_key} to ${recipientEmail}`);

    // Log every send to email_send_log for global 48h cooldown tracking
    if (user_id) {
      await supabase.from("email_send_log").insert({
        user_id,
        email: recipientEmail,
        template_key,
        resend_id: result.id || null,
      });
    }

    // Log the email send to sequence log (with ON CONFLICT DO NOTHING to prevent duplicates)
    if (user_id && template_key.includes("_step_")) {
      const [sequence, stepStr] = template_key.split("_step_");
      const step = parseInt(stepStr, 10);

      // Use raw SQL upsert approach: insert and ignore if unique constraint fires
      const { error: logError } = await supabase.from("email_sequence_log").insert({
        user_id,
        sequence_name: sequence,
        step_number: step,
      });
      // Ignore duplicate constraint errors (user already received this step)
      if (logError && !logError.message?.includes("unique") && !logError.message?.includes("duplicate")) {
        console.warn("Failed to log email sequence:", logError.message);
      }
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-lifecycle-email:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
