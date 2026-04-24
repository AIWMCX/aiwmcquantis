import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeadersFor } from '../_shared/cors.ts';
// Styled HTML page for unsubscribe confirmation
function getUnsubscribeHtml(success: boolean, message: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe - AIWMC Quantis</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #f4f4f5 0%, #e4e4e7 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      max-width: 480px;
      width: 100%;
      padding: 48px 40px;
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      font-size: 32px;
    }
    .icon.success {
      background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
    }
    .icon.error {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    }
    h1 {
      color: #18181b;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 12px;
    }
    p {
      color: #52525b;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e4e4e7;
      color: #a1a1aa;
      font-size: 13px;
    }
    .logo {
      font-weight: 700;
      color: #3b82f6;
      font-size: 18px;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon ${success ? 'success' : 'error'}">
      ${success ? '✓' : '✕'}
    </div>
    <h1>${success ? 'Unsubscribed Successfully' : 'Something Went Wrong'}</h1>
    <p>${message}</p>
    <a href="https://aiwmcquantis.com" class="button">Visit AIWMC Quantis</a>
    <div class="footer">
      <div class="logo">AIWMC Quantis</div>
      <p>AI-Powered Business Analysis</p>
    </div>
  </div>
</body>
</html>
  `;
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = corsHeadersFor(req);
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const leadId = url.searchParams.get("id");

    if (!leadId) {
      return new Response(
        getUnsubscribeHtml(false, "Invalid unsubscribe link. The link may be expired or malformed."),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } 
        }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(leadId)) {
      return new Response(
        getUnsubscribeHtml(false, "Invalid unsubscribe link format."),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } 
        }
      );
    }

    // Initialize Supabase with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if lead exists
    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("id, unsubscribed_at, offer")
      .eq("id", leadId)
      .single();

    if (fetchError || !lead) {
      console.error("Lead not found:", leadId, fetchError);
      return new Response(
        getUnsubscribeHtml(false, "We couldn't find your subscription. It may have already been removed."),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } 
        }
      );
    }

    // Check if already unsubscribed
    if (lead.unsubscribed_at) {
      return new Response(
        getUnsubscribeHtml(true, "You've already been unsubscribed from our newsletter. You won't receive any more emails from us."),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } 
        }
      );
    }

    // Mark as unsubscribed
    const { error: updateError } = await supabase
      .from("leads")
      .update({ 
        unsubscribed_at: new Date().toISOString(),
        status: "unsubscribed"
      })
      .eq("id", leadId);

    if (updateError) {
      console.error("Failed to unsubscribe:", leadId, updateError);
      return new Response(
        getUnsubscribeHtml(false, "There was an error processing your request. Please try again or contact support."),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } 
        }
      );
    }

    console.log(`Successfully unsubscribed lead: ${leadId}`);

    return new Response(
      getUnsubscribeHtml(true, "You've been successfully unsubscribed from our weekly insights newsletter. We're sorry to see you go, but you're always welcome back!"),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } 
      }
    );

  } catch (error) {
    console.error("Unsubscribe error:", error);
    return new Response(
      getUnsubscribeHtml(false, "An unexpected error occurred. Please try again later."),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } 
      }
    );
  }
});
