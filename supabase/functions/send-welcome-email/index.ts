import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { assertEmailSendAllowed } from '../_shared/email-guard.ts';

import { maybeHealthResponse } from '../_shared/health.ts';
const FUNCTION_NAME = 'send-welcome-email';
const FUNCTION_VERSION = '1.0.0';

// Resend API client - using fetch directly to avoid npm dependency issues
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const sendEmail = async (options: {
  from: string;
  to: string[];
  replyTo?: string;
  subject: string;
  html: string;
}) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${error}`);
  }
  
  return response.json();
};



interface WelcomeEmailRequest {
  email: string;
  name: string;
  mode?: 'welcome' | 'confirmation';
  leadId?: string;
  unsubscribeUrl?: string;
}

const generateWelcomeEmailHtml = (name: string, email: string, unsubscribeUrl?: string): string => {
  const firstName = name.split(' ')[0] || 'Friend';
  const encodedEmail = encodeURIComponent(email);
  const signupUrl = `https://aiwmcquantis.com/auth?email=${encodedEmail}&tab=signup`;
  const appUrl = `https://aiwmcquantis.com/app?email=${encodedEmail}`;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to AIWMC Quantis</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; color: #1f2937;">
  
  <!-- Preheader Text -->
  <div style="display: none; max-height: 0px; overflow: hidden;">
    We're not perfect, but we're committed to getting better every day. Welcome to AIWMC Quantis!
  </div>
  
  <!-- Email Container -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Content Card -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); max-width: 600px; width: 100%;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 30px 40px; border-bottom: 1px solid #e5e7eb;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size: 28px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.5px;">
                    AIWMC Quantis
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Welcome Message -->
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
                Welcome, ${firstName}! 👋
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                Thank you for your interest in AIWMC Quantis. We're excited to help you analyze your business ideas!
              </p>
            </td>
          </tr>
          
          <!-- Honest Message Section -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #374151;">
                      <strong>We want to be honest with you from the start:</strong>
                    </p>
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4b5563;">
                      We're not saints, and we don't claim to have all the answers. But here's what we promise: every single day, we wake up committed to being better than we were yesterday. Better for you, better for your business ideas, and better at turning complex data into insights that actually matter.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- What You Can Do Section -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">
                What You Can Do Now:
              </h2>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #10b981; font-size: 16px;">✓</span>
                    <span style="margin-left: 12px; font-size: 15px; color: #4b5563;">Analyze any business idea instantly</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #10b981; font-size: 16px;">✓</span>
                    <span style="margin-left: 12px; font-size: 15px; color: #4b5563;">Get detailed financial projections</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #10b981; font-size: 16px;">✓</span>
                    <span style="margin-left: 12px; font-size: 15px; color: #4b5563;">Download professional PDF reports</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #10b981; font-size: 16px;">✓</span>
                    <span style="margin-left: 12px; font-size: 15px; color: #4b5563;">Access market analysis and insights</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding: 0 40px 30px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #1a1a1a;">
                    <a href="${appUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Start Your First Analysis →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- CEO Contact Section -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #fefce8; border-radius: 8px; border: 1px solid #fef08a;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #854d0e;">
                      📧 Have Questions or Feedback?
                    </h3>
                    <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #713f12;">
                      We genuinely want to hear from you. Not a support bot. Not an automated response. Real humans who care.
                    </p>
                    <p style="margin: 0; font-size: 14px; color: #713f12;">
                      Write directly to our CEO: 
                      <a href="mailto:AIWMCSRM@gmail.com" style="color: #1a1a1a; font-weight: 600; text-decoration: underline;">AIWMCSRM@gmail.com</a>
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 13px; color: #a16207; font-style: italic;">
                      Every email is read personally.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">
                      Thank you for giving us a chance. We won't let you down.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                      With gratitude,<br>
                      <strong style="color: #6b7280;">The AIWMC Quantis Team</strong>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                      © ${new Date().getFullYear()} AIWMC Quantis. All Rights Reserved.
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 11px; color: #9ca3af;">
                      <a href="https://aiwmcquantis.com/terms" style="color: #6b7280; text-decoration: underline;">Terms of Service</a>
                      &nbsp;|&nbsp;
                      <a href="https://aiwmcquantis.com/privacy" style="color: #6b7280; text-decoration: underline;">Privacy Policy</a>
                      ${unsubscribeUrl ? `&nbsp;|&nbsp;<a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>` : ''}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `;
};

const generateConfirmationEmailHtml = (name: string, confirmUrl: string, unsubscribeUrl: string): string => {
  const firstName = name.split(' ')[0] || 'Friend';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email - AIWMC Quantis</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; color: #1f2937;">
  <div style="display: none; max-height: 0px; overflow: hidden;">
    Please confirm your email to start receiving insights from AIWMC Quantis.
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); max-width: 600px; width: 100%;">
          <tr>
            <td align="center" style="padding: 40px 40px 30px 40px; border-bottom: 1px solid #e5e7eb;">
              <span style="font-size: 28px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.5px;">AIWMC Quantis</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 40px 20px 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
                Confirm your email, ${firstName}
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4b5563;">
                Thanks for signing up! Please confirm your email address so we can send you business insights, analysis tips, and product updates.
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                This is a one-time confirmation. We will never share your email with third parties.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px 30px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="border-radius: 8px; background-color: #1a1a1a;">
                    <a href="${confirmUrl}" target="_blank" style="display: inline-block; padding: 16px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Yes, Confirm My Email
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #9ca3af;">
                If you didn't sign up for AIWMC Quantis, you can safely ignore this email. The link expires in 7 days.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #9ca3af; text-align: center;">
                &copy; ${new Date().getFullYear()} AIWMC Quantis. All Rights Reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af; text-align: center;">
                <a href="https://aiwmcquantis.com/terms" style="color: #6b7280; text-decoration: underline;">Terms</a>
                &nbsp;|&nbsp;
                <a href="https://aiwmcquantis.com/privacy" style="color: #6b7280; text-decoration: underline;">Privacy</a>
                &nbsp;|&nbsp;
                <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
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
};

const handler = async (req: Request): Promise<Response> => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const reqId = getRequestId(req);
  const log = createLogger('send-welcome-email', reqId);
  const corsHeaders = corsHeadersFor(req);
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, mode, leadId, unsubscribeUrl: passedUnsubUrl }: WelcomeEmailRequest = await req.json();

    // Validate input
    if (!email || !name) {
      return new Response(
        JSON.stringify({ error: "Email and name are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Anti-abuse: 3 sends/hr per recipient, 20/hr per caller IP.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    let skipLimit = false;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } },
        );
        const { data: u } = await userClient.auth.getUser();
        if (u.user?.email && u.user.email.toLowerCase() === email.toLowerCase()) {
          skipLimit = true;
        }
      } catch { /* fall through to rate limit */ }
    }

    const templateKey = mode === 'confirmation' ? 'confirmation_email' : 'welcome_email';
    const guard = await assertEmailSendAllowed(
      admin,
      { req, recipient: email, templateKey, skip: skipLimit },
      corsHeaders,
    );
    if (!guard.ok) {
      log.info(`${templateKey} send rate-limited`);
      return guard.response;
    }

    let emailResponse: Record<string, unknown>;

    if (mode === 'confirmation' && leadId) {
      // Look up the confirmation token from the leads table
      const { data: lead } = await admin
        .from('leads')
        .select('confirmation_token, email_hash')
        .eq('id', leadId)
        .single();

      if (!lead?.confirmation_token) {
        return new Response(
          JSON.stringify({ error: "Lead not found or already confirmed" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const confirmUrl = `${supabaseUrl}/functions/v1/confirm-email-subscription?action=confirm&token=${lead.confirmation_token}`;
      const unsubscribeUrl = `${supabaseUrl}/functions/v1/confirm-email-subscription?action=unsubscribe&hash=${lead.email_hash}`;

      log.info(`Sending confirmation email to: ${email}`);

      emailResponse = await sendEmail({
        from: "AIWMC Quantis <noreply@aiwmcquantis.com>",
        to: [email],
        replyTo: "AIWMCSRM@gmail.com",
        subject: "Confirm your email - AIWMC Quantis",
        html: generateConfirmationEmailHtml(name, confirmUrl, unsubscribeUrl),
      });
    } else {
      log.info(`Sending welcome email to: ${email}`);

      // Compute unsubscribe URL from email hash
      let unsubscribeUrl = passedUnsubUrl;
      if (!unsubscribeUrl) {
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(email.toLowerCase()));
        const emailHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        unsubscribeUrl = `${supabaseUrl}/functions/v1/confirm-email-subscription?action=unsubscribe&hash=${emailHash}`;
      }

      emailResponse = await sendEmail({
        from: "AIWMC Quantis <noreply@aiwmcquantis.com>",
        to: [email],
        replyTo: "AIWMCSRM@gmail.com",
        subject: "Welcome to AIWMC Quantis - Your Free Analysis Awaits!",
        html: generateWelcomeEmailHtml(name, email, unsubscribeUrl),
      });
    }

    await guard.recordSend((emailResponse as { id?: string })?.id ?? null);
    log.info("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.error("Error in send-welcome-email function:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
