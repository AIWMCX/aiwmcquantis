import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';

/**
 * Send Lead Magnet Edge Function
 * 
 * Sends professional emails with resource links based on offer type.
 * Supports: founder_starter_kit, free_analysis, business_guide, 
 * validation_questions, projection_template, newsletter, early_access
 */

interface LeadMagnetRequest {
  email: string;
  name: string;
  offer: string;
  leadId?: string;
}

const APP_URL = 'https://aiwmcquantis.com';
const KIT_DOWNLOAD_URL = `${APP_URL}/downloads/Founder_Validation_Starter_Kit.docx`;

// Email content by offer type
const LEAD_MAGNET_EMAILS: Record<string, { 
  subject: string; 
  heading: string; 
  body: string; 
  cta: string; 
  ctaUrl: string;
  downloadUrl?: string;
  downloadLabel?: string;
}> = {
  founder_starter_kit: {
    subject: 'Your Founder Validation Starter Kit is Ready',
    heading: 'Your Starter Kit is Ready',
    body: `Thank you for downloading the Founder Validation Starter Kit.

This kit includes everything you need to validate your business idea before investing time and money:

Business Model Canvas Template — map your idea structure in one page
Financial Projection Structure — pre-built formulas for 5-year revenue models
20 AI Prompts for Validation — the exact questions to stress-test your idea
Risk Checklist — red flags that investors look for

Click the button below to download your kit, then try our AI-powered analysis to get instant financial projections for your specific idea.`,
    cta: 'Start Free AI Analysis',
    ctaUrl: `${APP_URL}/app`,
    downloadUrl: KIT_DOWNLOAD_URL,
    downloadLabel: 'Download Starter Kit (.docx)',
  },
  free_analysis: {
    subject: 'Your Free AI Business Analysis is Ready',
    heading: 'Your Analysis Awaits',
    body: `Thank you for requesting a free AI business analysis.

Get instant insights into your business idea with our AI-powered analysis engine. In under 2 minutes, you'll receive:

Financial projections with ROI and payback period
Market analysis and competitive landscape
Risk assessment and mitigation strategies
Step-by-step launch roadmap`,
    cta: 'Start Your Free Analysis',
    ctaUrl: `${APP_URL}/app`,
  },
  business_guide: {
    subject: 'Your Business Analysis Guide is Here',
    heading: 'Your Guide is Ready',
    body: `Thank you for downloading the Business Analysis Guide.

This comprehensive guide covers:

Complete framework for evaluating any business idea
Real-world case studies from successful entrepreneurs
Evaluation frameworks used by top VCs
Financial modeling templates`,
    cta: 'Try AI-Powered Analysis',
    ctaUrl: `${APP_URL}/app`,
  },
  validation_questions: {
    subject: '10 Questions to Validate Your Business Idea',
    heading: 'Your Validation Checklist',
    body: `Here are the 10 essential questions every entrepreneur should answer before launching:

1. What specific problem does your idea solve?
2. Who exactly is your target customer?
3. How do they currently solve this problem?
4. What makes your solution 10x better?
5. How will customers find you?
6. What is your pricing strategy?
7. What are your startup costs?
8. When will you break even?
9. What are the biggest risks?
10. What is your unfair advantage?

Use AIWMC Quantis to get AI-powered answers to all these questions in under 2 minutes.`,
    cta: 'Get AI-Powered Answers',
    ctaUrl: `${APP_URL}/app`,
  },
  projection_template: {
    subject: 'Your Financial Projection Template',
    heading: 'Your Template is Ready',
    body: `Thank you for downloading the Financial Projection Template.

This bank-ready template includes:

Pre-built formulas for all key metrics
5-year projection model
Break-even analysis
Cash flow forecasting
Investor-ready formatting

Want to see projections tailored to YOUR specific idea? Try AIWMC Quantis for instant, AI-powered financial analysis.`,
    cta: 'Generate Custom Projections',
    ctaUrl: `${APP_URL}/app`,
  },
  newsletter: {
    subject: 'Welcome to AIWMC Quantis Insights',
    heading: 'Welcome to the Community',
    body: `You are now part of a growing community of entrepreneurs who receive weekly business insights.

What to expect:

Weekly business tips from industry experts
Market trend analysis and opportunities
Exclusive feature previews before public release
Success stories from fellow entrepreneurs

While you wait for our next newsletter, why not try our AI-powered business analysis?`,
    cta: 'Analyze Your Idea',
    ctaUrl: `${APP_URL}/app`,
  },
  early_access: {
    subject: "You're on the Early Access List",
    heading: 'Welcome to Early Access',
    body: `You are now on the early access list for AIWMC Quantis new features.

As an early access member, you will get:

First look at new AI capabilities
Priority access to beta features
Direct feedback channel to our team
Exclusive beta testing opportunities

We will notify you as soon as new features are ready for testing. In the meantime, have you tried our current AI analysis?`,
    cta: 'Try Current Features',
    ctaUrl: `${APP_URL}/app`,
  },
};

function generateEmailHtml(name: string, content: typeof LEAD_MAGNET_EMAILS[string]): string {
  const downloadSection = content.downloadUrl ? `
              <!-- Download Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
                <tr>
                  <td style="background-color: #059669; border-radius: 8px;">
                    <a href="${content.downloadUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none;">
                      ${content.downloadLabel || 'Download File'}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 24px 0; color: #9ca3af; font-size: 13px;">
                If the button above doesn't work, copy and paste this link into your browser:<br/>
                <a href="${content.downloadUrl}" style="color: #3b82f6; word-break: break-all;">${content.downloadUrl}</a>
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  ` : '';

  // Format body: convert lines starting with bullet-like text into styled list
  const formattedBody = content.body
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '<br/>';
      // Lines that look like list items (start with number+dot or contain em-dash)
      if (/^\d+\./.test(trimmed)) {
        return `<p style="margin: 4px 0; padding-left: 8px; color: #374151; font-size: 15px; line-height: 1.6;">${trimmed}</p>`;
      }
      if (trimmed.includes(' — ')) {
        const [title, desc] = trimmed.split(' — ');
        return `<p style="margin: 6px 0; padding-left: 8px; color: #374151; font-size: 15px; line-height: 1.6;"><strong style="color: #1f2937;">${title}</strong> — ${desc}</p>`;
      }
      return `<p style="margin: 8px 0; color: #374151; font-size: 15px; line-height: 1.7;">${trimmed}</p>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">AIWMC Quantis</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">AI-Powered Business Analysis</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 22px; font-weight: 700;">${content.heading}</h2>
              <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 16px;">Hi ${name},</p>
              
              <div style="color: #374151; font-size: 15px; line-height: 1.7;">
                ${formattedBody}
              </div>

              ${downloadSection}
              
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
                <tr>
                  <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 8px;">
                    <a href="${content.ctaUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none;">
                      ${content.cta}
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #9ca3af; font-size: 14px;">
                Questions? Just reply to this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">
                &copy; ${new Date().getFullYear()} AIWMC Quantis. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                You received this because you signed up at aiwmcquantis.com
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const reqId = getRequestId(req);
  const log = createLogger('send-lead-magnet', reqId);

  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, offer, leadId }: LeadMagnetRequest = await req.json();

    if (!email || !name || !offer) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, name, offer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailContent = LEAD_MAGNET_EMAILS[offer];
    if (!emailContent) {
      return new Response(
        JSON.stringify({ error: `Unknown offer type: ${offer}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const htmlContent = generateEmailHtml(name, emailContent);

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      log.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'AIWMC Quantis <hello@aiwmcquantis.com>',
        to: [email],
        subject: emailContent.subject,
        html: htmlContent,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      log.error('Resend API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendData = await resendResponse.json();
    log.info(`Lead magnet email sent for offer "${offer}" to ${email}:`, resendData);

    // Also send admin notification
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'AIWMC Quantis <hello@aiwmcquantis.com>',
          to: ['AIWMCSRM@gmail.com'],
          subject: `New Lead: ${offer} download`,
          html: `<p><strong>New lead captured</strong></p>
            <p>Email: ${email}</p>
            <p>Name: ${name}</p>
            <p>Offer: ${offer}</p>
            <p>Lead ID: ${leadId || 'N/A'}</p>
            <p>Time: ${new Date().toISOString()}</p>`,
        }),
      });
    } catch (adminErr) {
      log.error('Admin notification failed:', adminErr);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: resendData.id,
        offer,
        leadId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    log.error('Error in send-lead-magnet:', error);
    return new Response(
      JSON.stringify({ error: (error instanceof Error ? error.message : String(error)) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
