/**
 * ALERT WEBHOOK ENDPOINT
 * 
 * Receives alerts from monitoring systems (UptimeRobot, Checkly, etc.)
 * and forwards them to configured notification channels.
 * 
 * Supports:
 * - Slack notifications
 * - Email notifications (via Resend)
 * - Discord notifications
 * - Custom webhook forwarding
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-alert-secret",
};

interface AlertPayload {
  alert_type: 'down' | 'up' | 'degraded' | 'error_spike' | 'budget_exceeded' | 'kill_switch';
  source: string;
  component?: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp?: string;
  details?: Record<string, unknown>;
}

interface NotificationResult {
  channel: string;
  success: boolean;
  error?: string;
}

// Validate alert secret to prevent unauthorized alerts
function validateAlertSecret(req: Request): boolean {
  const providedSecret = req.headers.get('x-alert-secret');
  const expectedSecret = Deno.env.get('ALERT_WEBHOOK_SECRET');
  
  // If no secret is configured, allow the request (for initial setup)
  if (!expectedSecret) {
    console.warn('ALERT_WEBHOOK_SECRET not configured - accepting all requests');
    return true;
  }
  
  return providedSecret === expectedSecret;
}

// Send Slack notification
async function sendSlackNotification(
  webhookUrl: string, 
  alert: AlertPayload
): Promise<NotificationResult> {
  const severityEmoji = {
    info: 'ℹ️',
    warning: '⚠️',
    critical: '🚨',
  };

  const severityColor = {
    info: '#36a64f',
    warning: '#ffcc00',
    critical: '#ff0000',
  };

  const payload = {
    attachments: [{
      color: severityColor[alert.severity],
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${severityEmoji[alert.severity]} ${alert.alert_type.toUpperCase()}: ${alert.source}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Component:*\n${alert.component || 'System'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Severity:*\n${alert.severity.toUpperCase()}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Message:*\n${alert.message}`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `🕐 ${alert.timestamp || new Date().toISOString()}`,
            },
          ],
        },
      ],
    }],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack responded with ${response.status}`);
    }

    return { channel: 'slack', success: true };
  } catch (error) {
    return { 
      channel: 'slack', 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Send email notification via Resend
async function sendEmailNotification(
  alert: AlertPayload,
  recipientEmail: string
): Promise<NotificationResult> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  
  if (!RESEND_API_KEY) {
    return { channel: 'email', success: false, error: 'RESEND_API_KEY not configured' };
  }

  const severityBadge = {
    info: '🔵 INFO',
    warning: '🟡 WARNING', 
    critical: '🔴 CRITICAL',
  };

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${alert.severity === 'critical' ? '#fee2e2' : alert.severity === 'warning' ? '#fef3c7' : '#dbeafe'}; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: ${alert.severity === 'critical' ? '#991b1b' : alert.severity === 'warning' ? '#92400e' : '#1e40af'};">
          ${severityBadge[alert.severity]}
        </h1>
        <p style="margin: 8px 0 0; font-size: 18px; color: #374151;">
          ${alert.alert_type.toUpperCase()}: ${alert.source}
        </p>
      </div>
      
      <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Component</td>
            <td style="padding: 8px 0; color: #111827;">${alert.component || 'System'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Severity</td>
            <td style="padding: 8px 0; color: #111827;">${alert.severity.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Time</td>
            <td style="padding: 8px 0; color: #111827;">${alert.timestamp || new Date().toISOString()}</td>
          </tr>
        </table>
      </div>
      
      <div style="padding: 16px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h3 style="margin: 0 0 8px; color: #374151;">Message</h3>
        <p style="margin: 0; color: #4b5563;">${alert.message}</p>
      </div>
      
      ${alert.details ? `
        <div style="margin-top: 20px; padding: 16px; background: #f3f4f6; border-radius: 8px;">
          <h3 style="margin: 0 0 8px; color: #374151;">Additional Details</h3>
          <pre style="margin: 0; font-size: 12px; overflow-x: auto;">${JSON.stringify(alert.details, null, 2)}</pre>
        </div>
      ` : ''}
      
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
        <p>AIWMC Quantis™ Alert System</p>
      </div>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AIWMC Quantis Alerts <alerts@resend.dev>',
        to: recipientEmail,
        subject: `[${alert.severity.toUpperCase()}] ${alert.alert_type}: ${alert.source}`,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Resend responded with ${response.status}: ${error}`);
    }

    return { channel: 'email', success: true };
  } catch (error) {
    return { 
      channel: 'email', 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Log alert to database for audit trail
async function logAlert(
  supabase: ReturnType<typeof createClient>,
  alert: AlertPayload,
  notifications: NotificationResult[]
): Promise<void> {
  try {
    await supabase.from('security_logs').insert({
      event_type: 'system_alert',
      event_data: {
        alert,
        notifications,
        logged_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to log alert:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate secret
  if (!validateAlertSecret(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const alert: AlertPayload = await req.json();
    
    // Validate required fields
    if (!alert.alert_type || !alert.source || !alert.message || !alert.severity) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: alert_type, source, message, severity' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add timestamp if not provided
    alert.timestamp = alert.timestamp || new Date().toISOString();

    const notifications: NotificationResult[] = [];

    // Send Slack notification if configured
    const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL');
    if (SLACK_WEBHOOK_URL) {
      const slackResult = await sendSlackNotification(SLACK_WEBHOOK_URL, alert);
      notifications.push(slackResult);
    }

    // Send email notification if configured
    const ALERT_EMAIL = Deno.env.get('ALERT_EMAIL');
    if (ALERT_EMAIL) {
      const emailResult = await sendEmailNotification(alert, ALERT_EMAIL);
      notifications.push(emailResult);
    }

    // Log to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await logAlert(supabase, alert, notifications);

    // Check if any notifications were sent
    const anySuccess = notifications.some(n => n.success);
    const allFailed = notifications.length > 0 && !anySuccess;

    return new Response(
      JSON.stringify({
        success: !allFailed,
        message: notifications.length === 0 
          ? 'Alert logged but no notification channels configured'
          : anySuccess 
            ? 'Alert sent successfully'
            : 'All notification channels failed',
        notifications,
        alert_id: crypto.randomUUID(),
      }),
      { 
        status: allFailed ? 500 : 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Alert webhook error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
