import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';

// Weekly content templates - curated, industry-specific insights
const WEEKLY_CONTENT = [
  {
    ai_spotlight: {
      title: "Agentic AI in Small Business",
      body: "AI agents are transforming customer service. New tools can handle 80% of routine inquiries autonomously, freeing your team for high-value conversations. Consider implementing chatbots for FAQs first—it's the lowest-risk entry point.",
    },
    business_tip: {
      title: "The 2-Minute Rule",
      body: "Before adding any new tool to your stack, ask: 'Can I explain its value in 2 minutes?' If not, it's probably too complex for your team to adopt effectively.",
    },
    platform_update: "New seasonal adjustment algorithms for more accurate financial projections.",
    free_resource: { title: "AI Readiness Checklist", url: "/resources/ai-readiness" },
  },
  {
    ai_spotlight: {
      title: "Predictive Analytics for Inventory",
      body: "Machine learning models can now predict demand with 85% accuracy using just 12 months of sales data. Retailers using these tools report 30% reduction in overstock costs.",
    },
    business_tip: {
      title: "Cash Flow Timing",
      body: "Invoice immediately upon delivery, not end-of-month. Businesses that invoice within 24 hours get paid 2 weeks faster on average.",
    },
    platform_update: "Enhanced industry benchmarks now include 50+ new sectors.",
    free_resource: null,
  },
  {
    ai_spotlight: {
      title: "Document Processing Automation",
      body: "Modern OCR + AI can extract data from invoices and receipts with 99% accuracy. Average time saved: 15 hours/week for businesses processing 100+ documents monthly.",
    },
    business_tip: {
      title: "The 10% Buffer",
      body: "Always pad cost estimates by 10% for unexpected expenses. Clients appreciate honesty, and you'll protect your margins when surprises happen.",
    },
    platform_update: "PDF reports now include competitive analysis section.",
    free_resource: { title: "Financial Projection Template", url: "/resources/projection-template" },
  },
  {
    ai_spotlight: {
      title: "Voice AI for Phone Systems",
      body: "Voice AI assistants can now handle appointment scheduling, order status, and basic support calls. Early adopters report 40% reduction in missed calls.",
    },
    business_tip: {
      title: "Weekly KPI Review",
      body: "Spend 30 minutes every Monday reviewing 3 key metrics: revenue, customer acquisition cost, and cash runway. Consistency beats depth.",
    },
    platform_update: "Location intelligence expanded to 75+ cities worldwide.",
    free_resource: null,
  },
];

function getWeekNumber(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.ceil((diff / oneWeek) + 1);
}

function generateEmailHtml(content: typeof WEEKLY_CONTENT[0], weekNumber: number, year: number, unsubscribeUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AIWMC Quantis Weekly Insights</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">AIWMC Quantis</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Weekly Business Insights • Week ${weekNumber}, ${year}</p>
            </td>
          </tr>
          
          <!-- AI Spotlight -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <span style="background-color: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 12px; text-transform: uppercase;">🤖 AI Spotlight</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <h2 style="margin: 0 0 12px; color: #18181b; font-size: 20px; font-weight: 600;">${content.ai_spotlight.title}</h2>
                    <p style="margin: 0; color: #52525b; font-size: 15px; line-height: 1.6;">${content.ai_spotlight.body}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 0;">
            </td>
          </tr>
          
          <!-- Business Tip -->
          <tr>
            <td style="padding: 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <span style="background-color: #dcfce7; color: #16a34a; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 12px; text-transform: uppercase;">💡 Business Tip</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <h2 style="margin: 0 0 12px; color: #18181b; font-size: 20px; font-weight: 600;">${content.business_tip.title}</h2>
                    <p style="margin: 0; color: #52525b; font-size: 15px; line-height: 1.6;">${content.business_tip.body}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Platform Update -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; border-radius: 8px; padding: 16px;">
                <tr>
                  <td style="padding: 16px;">
                    <span style="color: #3b82f6; font-size: 12px; font-weight: 600; text-transform: uppercase;">🚀 What's New in Quantis</span>
                    <p style="margin: 8px 0 0; color: #52525b; font-size: 14px;">${content.platform_update}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          ${content.free_resource ? `
          <!-- Free Resource -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px;">
                <tr>
                  <td style="padding: 20px;">
                    <span style="color: #92400e; font-size: 12px; font-weight: 600; text-transform: uppercase;">📥 Free Resource</span>
                    <p style="margin: 8px 0 12px; color: #78350f; font-size: 16px; font-weight: 600;">${content.free_resource.title}</p>
                    <a href="https://aiwmcquantis.com${content.free_resource.url}" style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600;">Download Now</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}
          
          <!-- CTA -->
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <a href="https://aiwmcquantis.com/app" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">Analyze Your Business</a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f4f5; padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 8px; color: #71717a; font-size: 13px;">AIWMC Quantis • AI-Powered Business Analysis</p>
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                <a href="${unsubscribeUrl}" style="color: #a1a1aa; text-decoration: underline;">Unsubscribe</a> from weekly insights
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

serve(async (req: Request): Promise<Response> => {
  const reqId = getRequestId(req);
  const log = createLogger('send-weekly-insights', reqId);

  const corsHeaders = corsHeadersFor(req);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify cron secret for scheduled calls
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    
    if (cronSecret !== expectedSecret) {
      log.error("Invalid or missing cron secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const today = new Date();
    const weekNumber = getWeekNumber(today);
    const year = today.getFullYear();
    const todayStr = today.toISOString().split("T")[0];

    log.info(`Starting weekly insights send for Week ${weekNumber}, ${year}`);

    // Get newsletter subscribers who haven't unsubscribed
    const { data: subscribers, error: subscribersError } = await supabase
      .from("leads")
      .select("id, email_encrypted")
      .eq("offer", "newsletter")
      .is("unsubscribed_at", null);

    if (subscribersError) {
      throw new Error(`Failed to fetch subscribers: ${subscribersError.message}`);
    }

    if (!subscribers || subscribers.length === 0) {
      log.info("No active newsletter subscribers found");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscribers" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log.info(`Found ${subscribers.length} active subscribers`);

    // Get content for this week (rotate through available content)
    const contentIndex = (weekNumber - 1) % WEEKLY_CONTENT.length;
    const content = WEEKLY_CONTENT[contentIndex];

    let sentCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    for (const subscriber of subscribers) {
      try {
        // Check if already sent this week
        const { data: existingSend } = await supabase
          .from("newsletter_sends")
          .select("id")
          .eq("lead_id", subscriber.id)
          .eq("year", year)
          .eq("week_number", weekNumber)
          .single();

        if (existingSend) {
          log.info(`Skipping lead ${subscriber.id} - already sent this week`);
          skipCount++;
          continue;
        }

        // Decrypt email using database function
        const { data: emailData, error: decryptError } = await supabase
          .rpc("decrypt_pii", { encrypted_data: subscriber.email_encrypted });

        if (decryptError || !emailData) {
          log.error(`Failed to decrypt email for lead ${subscriber.id}:`, decryptError);
          errors.push(`Decrypt failed for ${subscriber.id}`);
          continue;
        }

        const email = emailData as string;
        
        // Generate unsubscribe URL
        const unsubscribeUrl = `${supabaseUrl}/functions/v1/newsletter-unsubscribe?id=${subscriber.id}`;

        // Generate email HTML
        const emailHtml = generateEmailHtml(content, weekNumber, year, unsubscribeUrl);

        // Send via Resend
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "AIWMC Quantis <insights@aiwmcquantis.com>",
            to: [email],
            subject: `Week ${weekNumber}: ${content.ai_spotlight.title}`,
            html: emailHtml,
            headers: {
              "List-Unsubscribe": `<${unsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }),
        });

        if (!resendResponse.ok) {
          const errorText = await resendResponse.text();
          log.error(`Resend error for ${subscriber.id}:`, errorText);
          errors.push(`Send failed for ${subscriber.id}: ${errorText}`);
          continue;
        }

        const resendResult = await resendResponse.json();
        log.info(`Sent to lead ${subscriber.id}, email ID: ${resendResult.id}`);

        // Log successful send
        const { error: logError } = await supabase
          .from("newsletter_sends")
          .insert({
            lead_id: subscriber.id,
            send_date: todayStr,
            email_id: resendResult.id,
            week_number: weekNumber,
            year: year,
          });

        if (logError) {
          log.error(`Failed to log send for ${subscriber.id}:`, logError);
        }

        sentCount++;

        // Rate limit: small delay between sends
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        log.error(`Error processing subscriber ${subscriber.id}:`, err);
        errors.push(`Error for ${subscriber.id}: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    }

    log.info(`Weekly insights complete: ${sentCount} sent, ${skipCount} skipped, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        week: weekNumber,
        year: year,
        sent: sentCount,
        skipped: skipCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    log.error("Weekly insights error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
