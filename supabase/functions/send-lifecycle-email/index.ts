import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';

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

  // ─────────────────────────────────────────────────────────────
  //  CONVERSION SEQUENCE — Fear → Purchase (7 emails over 14 days)
  //  Triggered after first free analysis. Keyed `verdict_step_N`.
  //  Plain-text feel, brutal-honesty brand voice, single-column 600px.
  // ─────────────────────────────────────────────────────────────
  verdict_step_1: {
    subject: "Your verdict is ready (and 2 numbers you need to see)",
    html: (data) => verdictWrap(`
      <p style="${pStyle}">Hey ${esc(data.first_name) || "there"},</p>
      <p style="${pStyle}">Your stress-test is done. Here's the headline:</p>
      <p style="${pStyle}"><strong>Verdict: ${esc(data.verdict) || "see report"}</strong>${data.verdict_reason ? ` — ${esc(data.verdict_reason)}` : ""}</p>
      <p style="${pStyle}">Two numbers to sit with for 60 seconds:</p>
      <ul style="${ulStyle}">
        <li><strong>LTV:CAC = ${esc(data.ltv_cac) || "—"}</strong>${data.ltv_cac_note ? ` (${esc(data.ltv_cac_note)})` : ""}</li>
        <li><strong>Runway to break-even: ${esc(data.payback_months) || "—"} months</strong> at your current assumptions</li>
      </ul>
      ${ctaButton(data.report_url, "Open your full report")}
      <p style="${pStyle}">The report shows where the model breaks first — and which 3 assumptions are doing all the heavy lifting. Read the "Critical Path" section first. That's the one most founders skip and regret.</p>
      <p style="${pStyle}">— Bogdan<br/><span style="color:#888;font-size:13px;">Founder, AIWMC Quantis</span></p>
      <p style="color:#888;font-size:13px;margin-top:24px;"><em>P.S. Your report stays live for 30 days. Bookmark it.</em></p>
    `),
  },

  verdict_step_2: {
    subject: "The #1 reason your idea will fail (it's not what you think)",
    html: (data) => verdictWrap(`
      <p style="${pStyle}">${esc(data.first_name) || "Hey"},</p>
      <p style="${pStyle}">Yesterday you ran your idea through Quantis. Today, the hard question:</p>
      <p style="${pStyle}"><strong>Did you actually re-open the report?</strong></p>
      <p style="${pStyle}">Most founders don't. Not because they don't care — because the report told them something they didn't want to hear, and the brain protects itself.</p>
      <p style="${pStyle}">Here's the data from 4,200 analyses we've run:</p>
      <ul style="${ulStyle}">
        <li>71% of "killed" verdicts came from founders <strong>2 weeks from signing a lease, hiring, or quitting their job</strong></li>
        <li>The #1 fatal flaw isn't market size. It's <strong>CAC drift</strong> — the gap between what founders assume customer acquisition will cost, and what it actually costs after month 3</li>
        <li>Your report flagged <strong>${esc(data.primary_risk) || "your assumptions"}</strong> as your highest-fragility node</li>
      </ul>
      ${ctaButton(data.report_url, "Re-open your report")}
      <p style="${pStyle}">If you can't justify your CAC number out loud to another human, you don't have a business. You have a hope.</p>
      <p style="${pStyle}">— Bogdan</p>
    `),
  },

  verdict_step_3: {
    subject: "What a $25,000 consultant would charge you for this",
    html: (data) => verdictWrap(`
      <p style="${pStyle}">${esc(data.first_name) || "Hey"},</p>
      <p style="${pStyle}">Quick story.</p>
      <p style="${pStyle}">Last month a founder named David ran his SaaS idea through Quantis. Verdict: <strong>Pivot.</strong> His pricing was 40% under market and his CAC assumption was a fantasy.</p>
      <p style="${pStyle}">He spent $0 with us, took the report to a Y Combinator partner, and got told the exact same thing — but the partner's words were: <em>"Whoever ran this analysis saved you about $200k."</em></p>
      <p style="${pStyle}">Here's what Quantis actually does under the hood that a consultant charges $1,500–$25,000 for:</p>
      <ol style="${ulStyle}">
        <li><strong>Deterministic financial engine</strong> — every number sourced, every formula auditable (decimal.js, not LLM math)</li>
        <li><strong>Monte Carlo with 10,000 simulations</strong> across 7 scenarios</li>
        <li><strong>95,500 industry benchmarks</strong> from SBA, BLS, IBISWorld, Census</li>
        <li><strong>Cross-validation by two independent LLMs</strong> with explainability traces</li>
        <li><strong>Assumption fragility scoring</strong> — finds the 3 inputs that decide your fate</li>
      </ol>
      <p style="${pStyle}">Your free analysis used <strong>all five.</strong> That's not a teaser. That's the real engine.</p>
      ${ctaButton(data.pricing_url, "See what's behind the paywall")}
      <p style="${pStyle}">— Bogdan</p>
    `),
  },

  verdict_step_4: {
    subject: "\"But AI is wrong about money\" — yes, and here's why we're not",
    html: (data) => verdictWrap(`
      <p style="${pStyle}">${esc(data.first_name) || "Hey"},</p>
      <p style="${pStyle}">Honest founder objection I get every week:</p>
      <blockquote style="border-left:3px solid #8FFF2A;padding-left:16px;margin:16px 0;color:#4a4a4a;font-style:italic;">"I asked ChatGPT the same questions. Why pay you?"</blockquote>
      <p style="${pStyle}">Fair. Here's the answer in one sentence:</p>
      <p style="${pStyle}"><strong>ChatGPT generates plausible numbers. Quantis computes provable ones.</strong></p>
      <p style="${pStyle}">Concretely:</p>
      <ul style="${ulStyle}">
        <li>ChatGPT will tell you SaaS gross margin is "around 70-80%." Quantis pulls your specific NAICS code's 2024 actual — sourced and timestamped.</li>
        <li>ChatGPT cannot run Monte Carlo. It cannot reconcile a P&L. It will quietly invent CAC numbers. We've tested it 1,000 times.</li>
        <li>When two LLMs disagree inside Quantis, we <strong>show you the disagreement</strong> instead of hiding it.</li>
      </ul>
      <p style="${pStyle}">This is why the Plus plan exists. The free analysis is real, but capped. Plus unlocks:</p>
      <ul style="${ulStyle}">
        <li>Unlimited re-runs as you adjust assumptions</li>
        <li>The full 36-month Monte Carlo (you saw 12)</li>
        <li>White-label PDF for investors/co-founders</li>
        <li>Live assumption editor (drag sliders, see verdict change in real-time)</li>
        <li>Docs Studio (pitch-deck math, financial model, one-pager)</li>
      </ul>
      ${ctaButton(data.pricing_url, "Upgrade to Plus — cancel anytime")}
      <p style="${pStyle}">14-days money-back. No questions, no forms, no guilt.</p>
      <p style="${pStyle}">— Bogdan</p>
    `),
  },

  verdict_step_5: {
    subject: "3 founders. 3 verdicts. 3 outcomes (1 painful)",
    html: (data) => verdictWrap(`
      <p style="${pStyle}">${esc(data.first_name) || "Hey"},</p>
      <p style="${pStyle}">Three recent Quantis users. Names changed, numbers real:</p>
      <p style="${pStyle}"><strong>Maria — D2C skincare, Lisbon.</strong><br/>Verdict: <strong>Kill.</strong> CAC was 4.2x LTV. She killed the brand, kept the $32k she would've burned on inventory, and pivoted to B2B private label. Now $8k MRR.</p>
      <p style="${pStyle}"><strong>Jakub — vertical SaaS for dentists, Warsaw.</strong><br/>Verdict: <strong>Proceed.</strong> Quantis flagged his pricing was <strong>42% under market.</strong> He raised prices on day one. ARPU went from $89 to $149 with zero churn.</p>
      <p style="${pStyle}"><strong>Anonymous founder — restaurant, Austin.</strong><br/>Verdict: <strong>Pivot.</strong> Ignored it. Signed the lease anyway. Closed 14 months later. Emailed me last week: <em>"The report was right. I wasn't ready to hear it."</em></p>
      <p style="${pStyle}">Which one are you going to be?</p>
      ${ctaButton(data.report_url, "Re-open your report")}
      ${ctaButton(data.pricing_url, "Unlock the tools to change the verdict", true)}
      <p style="${pStyle}">— Bogdan</p>
    `),
  },

  verdict_step_6: {
    subject: "$17, 14-days back, and one founder math problem",
    html: (data) => verdictWrap(`
      <p style="${pStyle}">${esc(data.first_name) || "Hey"},</p>
      <p style="${pStyle}">Founder math, brutally honest:</p>
      <ul style="${ulStyle}">
        <li><strong>Plus:</strong> $17/month</li>
        <li><strong>Average bad assumption a founder discovers in Plus:</strong> ~$2,500–$40,000 of avoided spend</li>
        <li><strong>Worst case if Plus is useless to you:</strong> you get every cent back inside 14-days. No call. No survey. One click in settings.</li>
      </ul>
      <p style="${pStyle}">The only way this is a bad deal is if you never log back in.</p>
      <p style="${pStyle}">So here's the deal I'll make with you: upgrade today, and if 14-days from now you can honestly tell me Plus didn't surface at least one thing you would've gotten wrong — reply to this email with the word <strong>"refund"</strong> and I'll process it personally within an hour.</p>
      ${ctaButton(data.pricing_url, "Upgrade to Plus")}
      <p style="${pStyle}">— Bogdan<br/><span style="color:#888;font-size:13px;"><em>Real human. Real inbox. Real refund button.</em></span></p>
    `),
  },

  verdict_step_7: {
    subject: "Last email from me (unless you want more)",
    html: (data) => verdictWrap(`
      <p style="${pStyle}">${esc(data.first_name) || "Hey"},</p>
      <p style="${pStyle}">This is the last automated email I'll send you. No "limited time," no fake countdown, no "we're closing the doors." That's not how I run this company.</p>
      <p style="${pStyle}">Here's where you actually stand:</p>
      <ul style="${ulStyle}">
        <li>You ran one free analysis 14 days ago. Verdict: <strong>${esc(data.verdict) || "see report"}</strong>.</li>
        <li>You haven't upgraded.</li>
      </ul>
      <p style="${pStyle}">Three honest possibilities:</p>
      <p style="${pStyle}"><strong>1. The free analysis was enough.</strong> Great. Genuinely. Go build (or don't, if it said Kill). I'm rooting for you either way.</p>
      <p style="${pStyle}"><strong>2. You're stuck on price.</strong> It's $17. Skip one lunch. <a href="${esc(data.pricing_url) || "https://aiwmcquantis.com/pricing"}" style="color:#1e40af;">Upgrade here.</a></p>
      <p style="${pStyle}"><strong>3. You don't trust the engine yet.</strong> Fair. <a href="${esc(data.methodology_url) || "https://aiwmcquantis.com/methodology"}" style="color:#1e40af;">Read the methodology</a> — every formula, every data source, every assumption is public.</p>
      <p style="${pStyle}">If you want to talk to me directly, just reply. I read every email.</p>
      <p style="${pStyle}">Good luck out there, ${esc(data.first_name) || "founder"}. 90% of businesses fail. The ones that don't are the ones that stress-tested the assumptions before the market did.</p>
      <p style="${pStyle}">— Bogdan<br/><span style="color:#888;font-size:13px;">Founder, AIWMC Quantis<br/>aiwmcquantis.com</span></p>
    `),
  },
};

// ── Shared inline styles for the conversion sequence ──
const pStyle = "color:#1a1a1a;font-size:15px;line-height:1.65;margin:0 0 16px 0;";
const ulStyle = "color:#1a1a1a;font-size:15px;line-height:1.8;margin:0 0 20px 0;padding-left:22px;";

function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function ctaButton(href: unknown, label: string, secondary = false): string {
  const url = esc(href) || "https://aiwmcquantis.com/app";
  const bg = secondary ? "#1a1a1a" : "#1e40af";
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="background:${bg};color:#ffffff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:600;display:inline-block;font-size:15px;">${esc(label)}</a>
  </div>`;
}

function verdictWrap(body: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;color:#1a1a1a;">
    ${body}
    <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px;"/>
    <p style="color:#888;font-size:12px;line-height:1.5;margin:0;">AIWMC™ Quantis · aiwmcquantis.com<br/>You're getting this because you ran a free stress-test. Don't want these? <a href="{{unsubscribe_url}}" style="color:#888;">Unsubscribe</a>.</p>
  </div>`;
}


serve(async (req: Request): Promise<Response> => {
  const reqId = getRequestId(req);
  const log = createLogger('send-lifecycle-email', reqId);

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

      // For conversion-sequence (verdict_step_*) — pull the user's most recent analysis
      if (template_key.startsWith("verdict_step_")) {
        const { data: latest } = await supabase
          .from("analyses")
          .select("id, result, payback_months, idea_summary, idea")
          .eq("user_id", user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latest) {
          const r = (latest.result ?? {}) as Record<string, unknown>;
          const verdict = (r.verdict ?? r.recommendation ?? "see report") as string;
          const ltvCac = (r.ltv_cac_ratio ?? r.ltv_cac ?? null) as number | null;
          const primaryRisk =
            (Array.isArray(r.risks) && (r.risks as unknown[])[0]) ||
            (Array.isArray(r.critical_path) && (r.critical_path as unknown[])[0]) ||
            "your CAC assumption";

          userData.verdict = verdict;
          userData.ltv_cac = ltvCac !== null ? Number(ltvCac).toFixed(1) : null;
          userData.payback_months = latest.payback_months ?? null;
          userData.primary_risk = typeof primaryRisk === "string" ? primaryRisk : "your CAC assumption";
          userData.report_url = `https://aiwmcquantis.com/results/${latest.id}`;
          userData.pricing_url = "https://aiwmcquantis.com/pricing";
          userData.methodology_url = "https://aiwmcquantis.com/methodology";
        }
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
        from: "Bogdan from AIWMC Quantis <hello@aiwmcquantis.com>",
        reply_to: "hello@aiwmcquantis.com",
        to: [recipientEmail],
        subject: template.subject,
        html: template.html(templateData),
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      log.error("Resend error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const result = await emailResponse.json();
    log.info(`Lifecycle email sent: ${template_key} to ${recipientEmail}`);

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
        log.warn("Failed to log email sequence:", logError.message);
      }
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error("Error in send-lifecycle-email:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
