import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';


import { maybeHealthResponse } from '../_shared/health.ts';
import {
  MONTE_CARLO_ITERATIONS_DISPLAY,
  BENCHMARK_COUNT_DISPLAY,
  BENCHMARK_SECTORS,
  DOC_TEMPLATE_COUNT_DISPLAY,
  FREE_ANALYSES_PER_MONTH,
} from '../_shared/canonical-facts.ts';
const FUNCTION_NAME = 'send-lifecycle-email';
const FUNCTION_VERSION = '1.0.0';

interface LifecycleEmailRequest {
  user_id?: string;
  lead_id?: string;
  email?: string;
  template_key: string;
  dynamic_data?: Record<string, unknown>;
}

const unsubscribeFooter = (data: Record<string, unknown>) => `
  <div style="text-align: center; padding: 20px 40px; border-top: 1px solid #eee; margin-top: 20px;">
    <p style="margin: 0; font-size: 11px; color: #9ca3af;">
      &copy; ${new Date().getFullYear()} AIWMC Quantis. All Rights Reserved.
    </p>
    <p style="margin: 6px 0 0 0; font-size: 11px; color: #9ca3af;">
      <a href="https://www.aiwmcquantis.com/terms" style="color: #6b7280; text-decoration: underline;">Terms</a>
      &nbsp;|&nbsp;
      <a href="https://www.aiwmcquantis.com/privacy" style="color: #6b7280; text-decoration: underline;">Privacy</a>
      &nbsp;|&nbsp;
      <a href="${data.unsubscribe_url || '#'}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
    </p>
  </div>
`;

// Email templates
// Free-plan runs per month come from canonical-facts (FREE_ANALYSES_PER_MONTH),
// kept equal to TIERS.free.limits.analysesPerMonth by lifecycle-email-copy.test.ts.
// The emails used to say "3": the remaining count was computed from a stale limit.
const FREE_RUNS_PER_MONTH = FREE_ANALYSES_PER_MONTH;

const nurtureEmail = (
  data: Record<string, unknown>,
  c: { heading: string; paras: string[]; cta: string; path: string },
) => `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px;">${c.heading}</h1>
        ${c.paras.map((t) => `<p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">${t}</p>`).join('')}
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.aiwmcquantis.com${c.path}"
             style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            ${c.cta}
          </a>
        </div>
        ${unsubscribeFooter(data)}
      </div>
    `;

const EMAIL_TEMPLATES: Record<string, { subject: string; html: (data: Record<string, unknown>) => string }> = {
  onboarding_step_1: {
    subject: "Your first decision run takes a few minutes",
    html: (data) => `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px;">Hi ${data.first_name || 'there'}! 👋</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          We noticed you haven't run your first business analysis yet. Let's change that!
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          In a few minutes, you can:
        </p>
        <ul style="color: #4a4a4a; font-size: 16px; line-height: 1.8;">
          <li>Estimate monthly profit, cash and break-even for your idea</li>
          <li>See estimated startup costs and payback period</li>
          <li>See every assumption labeled, so you can change the ones you know better</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.app_url || 'https://www.aiwmcquantis.com'}/app" 
             style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Start Your Free Analysis
          </a>
        </div>
        <p style="color: #888; font-size: 14px;">
          Your free plan includes ${FREE_RUNS_PER_MONTH} complete runs each month.
        </p>
        ${unsubscribeFooter(data)}
      </div>
    `,
  },
  onboarding_step_2: {
    subject: "What one Quantis run shows you",
    html: (data) => `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px;">Hi ${data.first_name || 'there'},</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Here's what one run gives you:
        </p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="color: #1a1a1a; margin: 0 0 12px 0;"><strong>1. The money side</strong></p>
          <p style="color: #4a4a4a; margin: 0 0 16px 0; font-size: 14px;">Estimated investment, monthly profit and break-even, with the assumptions behind each number.</p>
          
          <p style="color: #1a1a1a; margin: 0 0 12px 0;"><strong>2. Market Insights</strong></p>
          <p style="color: #4a4a4a; margin: 0 0 16px 0; font-size: 14px;">The local market and competition assumptions the estimate relies on.</p>
          
          <p style="color: #1a1a1a; margin: 0 0 12px 0;"><strong>3. A report you can share</strong></p>
          <p style="color: #4a4a4a; margin: 0; font-size: 14px;">Share a link, or export a PDF (watermarked on the free plan).</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.app_url || 'https://www.aiwmcquantis.com'}/app" 
             style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Get Your Analysis Now
          </a>
        </div>
        ${unsubscribeFooter(data)}
      </div>
    `,
  },
  post_analysis_step_1: {
    subject: "Your analysis is ready to export!",
    html: (data) => `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px;">Congratulations! 🎉</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          You've completed your first business analysis.
        </p>
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 20px; border-radius: 8px; margin: 20px 0; color: white;">
          <p style="margin: 0; font-size: 18px; font-weight: 600;">Did you know?</p>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">
            You can export your analysis as a PDF to share with a partner, an advisor or your team. Every assumption is labeled, so they can check the inputs.
          </p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.app_url || 'https://www.aiwmcquantis.com'}/app" 
             style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            View & Export Your Analysis
          </a>
        </div>
        ${unsubscribeFooter(data)}
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
          Your free plan includes <strong>${FREE_RUNS_PER_MONTH} complete runs</strong> each month.
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          In case you missed it, here's what you can do:
        </p>
        <ul style="color: #4a4a4a; font-size: 16px; line-height: 1.8;">
          <li>Describe a business decision in plain words</li>
          <li>Get profit, cash and break-even estimates under three scenarios</li>
          <li>Export the analysis as a PDF</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.app_url || 'https://www.aiwmcquantis.com'}/app" 
             style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Start Your Free Analysis
          </a>
        </div>
        <p style="color: #888; font-size: 14px;">
          If you have any questions or feedback, just reply to this email.
        </p>
        ${unsubscribeFooter(data)}
      </div>
    `,
  },
  // Sent by check-lifecycle-emails' Sequence 5 (every Monday, to users with
  // >=1 analysis) -- that caller logic has existed and run on schedule since
  // it was written, but this template was never added, so every weekly run
  // has thrown "Unknown template: weekly_pulse" and sent zero emails.
  weekly_pulse: {
    subject: "Your weekly Quantis check-in",
    html: (data) => `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px;">Hi ${data.first_name || 'there'},</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          A quick weekly check-in from AIWMC Quantis.
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          If a decision has changed since your last analysis -- new numbers, a new assumption, a new option on the table -- it's worth a fresh run.
        </p>
        ${data.remaining_analyses !== undefined ? `
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          You have <strong>${data.remaining_analyses} free analyses</strong> left this month.
        </p>
        ` : ''}
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.app_url || 'https://www.aiwmcquantis.com'}/app"
             style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Run a Decision
          </a>
        </div>
        <p style="color: #888; font-size: 14px;">
          If you have any questions or feedback, just reply to this email.
        </p>
        ${unsubscribeFooter(data)}
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
          <a href="${data.app_url || 'https://www.aiwmcquantis.com'}/app" 
             style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            View Your Progress
          </a>
        </div>
        ${unsubscribeFooter(data)}
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
          <li>${MONTE_CARLO_ITERATIONS_DISPLAY}-scenario Monte Carlo simulation</li>
          <li>36-month P&L projections with variance bands</li>
          <li>Pre-Mortem Stress Test + Invoice & Capacity Check</li>
          <li>Document Studio (10 branded templates)</li>
          <li>Watermark-free PDF exports + unlimited downloads</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.app_url || 'https://www.aiwmcquantis.com'}/plus-settings"
             style="background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Reactivate before ${data.period_end_human || 'period end'}
          </a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center; margin-top: 30px;">
          Or reply to this email — we'd love to hear what we could improve.
        </p>
        ${unsubscribeFooter(data)}
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
          <a href="${data.app_url || 'https://www.aiwmcquantis.com'}/pricing?promo=COMEBACK30"
             style="background: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
            Reactivate at $11.90/mo
          </a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center;">
          Offer expires in 7 days. No further reminders after this — your data stays read-only regardless.
        </p>
        ${unsubscribeFooter(data)}
      </div>
    `,
  },

  // ── LEAD NURTURE SEQUENCE (Days 2–7 after email confirmation) ──
  // Rewritten 2026-10-30 (buy-blockers #121): the old series claimed 200+
  // industries, "real pricing data", consulting-grade work worth $5k-$15k,
  // free market sizing (paid-only) and a hard-coded $17. Every fact below
  // comes from _shared/canonical-facts.ts or src/config/tiers.ts.
  nurture_day_2: {
    subject: "Where the numbers in a Quantis run come from",
    html: (data) => nurtureEmail(data, {
      heading: `Hi ${data.first_name || 'there'},`,
      paras: [
        `Every Quantis run starts from benchmarks: ${BENCHMARK_COUNT_DISPLAY} industry and location observations across ${BENCHMARK_SECTORS} sectors, from sources such as SEC filings and the World Bank.`,
        `Your own numbers replace the benchmark wherever you have them, and every assumption is labeled with where it came from, so you can see which ones are yours and which are estimates.`,
      ],
      cta: 'Run a decision',
      path: '/app',
    }),
  },
  nurture_day_3: {
    subject: "Do you know your break-even point?",
    html: (data) => nurtureEmail(data, {
      heading: `${data.first_name || 'Hi'}, a quick question`,
      paras: [
        `Do you know how many sales a month it takes before your plan covers its costs? It is the number most plans leave out.`,
        `A Quantis run estimates your startup costs, monthly profit, cash position and break-even, and shows which assumptions move them the most.`,
      ],
      cta: 'Estimate your break-even',
      path: '/app',
    }),
  },
  nurture_day_4: {
    subject: "What the free plan includes",
    html: (data) => nurtureEmail(data, {
      heading: `Hi ${data.first_name || 'there'},`,
      paras: [
        `The free plan includes ${FREE_ANALYSES_PER_MONTH} complete runs a month. Each one gives you a verdict, profit and cash estimates under base, downside and upside scenarios, a pre-mortem of what could break the plan, and a PDF you can share (watermarked on free).`,
        `It is a model built on stated assumptions, not a forecast: the point is to see which assumptions your decision depends on before you commit money.`,
      ],
      cta: 'See plans and limits',
      path: '/pricing',
    }),
  },
  nurture_day_5: {
    subject: "Sharing your numbers with a partner or a bank",
    html: (data) => nurtureEmail(data, {
      heading: `Hi ${data.first_name || 'there'},`,
      paras: [
        `If someone else has to check your plan, a partner, an accountant or a lender, they need to see the assumptions, not just the totals.`,
        `Every Quantis report labels each input with its source, and you can share it as a link or a PDF. Plus adds the Document Studio: ${DOC_TEMPLATE_COUNT_DISPLAY} templates such as a business plan or a loan application.`,
      ],
      cta: 'Create a report',
      path: '/app',
    }),
  },
  nurture_day_6: {
    subject: "A range, not a single number",
    html: (data) => nurtureEmail(data, {
      heading: `Hi ${data.first_name || 'there'},`,
      paras: [
        `A single projection hides how uncertain it is. Each Quantis report runs ${MONTE_CARLO_ITERATIONS_DISPLAY} simulated variations of your key inputs and shows a low, typical and high profit outcome (P10, P50, P90).`,
        `The range only reflects the variation in the assumptions you can see in the report. It is not a prediction of what will happen.`,
      ],
      cta: 'Run a decision',
      path: '/app',
    }),
  },
  nurture_day_7: {
    subject: "Last email in this series",
    html: (data) => nurtureEmail(data, {
      heading: `Hi ${data.first_name || 'there'},`,
      paras: [
        `This is the last email in the welcome series. If you have a decision coming up, a hire, a price change, a second location, a run takes a few minutes and is free.`,
        `We won't send more of these unless you sign up or opt into our weekly insights. Questions? Reply to this email; a person reads it.`,
      ],
      cta: 'Run a decision',
      path: '/app',
    }),
  },

  // Sent automatically by supabase/functions/stripe-webhook on
  // checkout.session.completed for the Founder Decision Review ($349)
  // Payment Link (offer_code=founder_decision_review, 2026-08-30 offer
  // listing spec). This is the confirmed-payment intake ask — checkout
  // itself does not collect the decision/company details, so this email
  // is where that happens.
  founder_decision_review_intake: {
    subject: "You're confirmed — let's schedule your Founder Decision Review",
    html: (data) => `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px;">Thanks for your payment${data.first_name ? `, ${data.first_name}` : ''} — you're confirmed.</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Your <strong>Founder Decision Review</strong> is reserved. Before we schedule the 30-minute intake, reply to this email with three things:
        </p>
        <ol style="color: #4a4a4a; font-size: 16px; line-height: 1.8;">
          <li>Your company/business name</li>
          <li>The specific decision you're evaluating (the one active decision this review should focus on)</li>
          <li>Any deadline you're working against (optional)</li>
        </ol>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Once I have those, I'll send two call times for the intake. The 48-hour delivery target starts once the intake is complete and I have what I need to run the analysis.
        </p>
        <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6; border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;">
          <strong>Refund terms:</strong> if we determine during intake that Quantis can't responsibly analyze your decision within scope, you receive a full refund. You may cancel for a full refund before the intake call or before substantive work begins, whichever comes first.
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Talk soon,<br />Bogdan Jeltov, AIWMC LLC
        </p>
        ${unsubscribeFooter(data)}
      </div>
    `,
  },

  // Sent automatically by supabase/functions/stripe-webhook on
  // checkout.session.completed for the Consultant Founding Pilot ($499)
  // Payment Link (offer_code=consultant_founding_pilot, 2026-08-30 offer
  // listing spec).
  consultant_founding_pilot_intake: {
    subject: "You're confirmed — let's schedule your Consultant Founding Pilot",
    html: (data) => `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a; font-size: 24px;">Thanks for your payment${data.first_name ? `, ${data.first_name}` : ''} — you're confirmed.</h1>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Your <strong>Consultant Founding Pilot</strong> is reserved — two client decision cases within 30 days. Before we schedule pilot setup, reply to this email with three things:
        </p>
        <ol style="color: #4a4a4a; font-size: 16px; line-height: 1.8;">
          <li>Your consulting firm or company name</li>
          <li>Your primary client type</li>
          <li>Your first case, or a decision deadline (optional)</li>
        </ol>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Once I have those, I'll send two setup call times. Each case's delivery clock starts once its intake is complete and I have what I need.
        </p>
        <p style="color: #4a4a4a; font-size: 15px; line-height: 1.6; border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;">
          <strong>Refund terms:</strong> if we determine during pilot setup that Quantis can't responsibly support your intended cases within scope, you receive a full refund. You may cancel for a full refund before pilot setup or before substantive work begins, whichever comes first.
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
          Talk soon,<br />Bogdan Jeltov, AIWMC LLC
        </p>
        ${unsubscribeFooter(data)}
      </div>
    `,
  },
};

serve(async (req: Request): Promise<Response> => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
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

    const { user_id, lead_id, email, template_key, dynamic_data = {} }: LifecycleEmailRequest = await req.json();

    // Validate template exists
    const template = EMAIL_TEMPLATES[template_key];
    if (!template) {
      throw new Error(`Unknown template: ${template_key}`);
    }

    // Get user email if only user_id provided
    let recipientEmail = email;
    let userData: Record<string, unknown> = {};

    if (lead_id && !recipientEmail) {
      const { data: decryptedEmail } = await supabase.rpc('get_lead_email', { p_lead_id: lead_id });
      if (decryptedEmail) {
        recipientEmail = decryptedEmail;
        const emailName = decryptedEmail.split('@')[0].replace(/[._-]/g, ' ') || 'Friend';
        userData.first_name = emailName.split(' ').map((w: string) =>
          w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        ).join(' ');
      }
    }

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

        userData.remaining_analyses = Math.max(0, FREE_RUNS_PER_MONTH - (usage?.analyses_count || 0));
      }
    }

    if (!recipientEmail) {
      throw new Error("No recipient email provided or found");
    }

    // Compute unsubscribe URL from recipient email hash
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(recipientEmail.toLowerCase()));
    const emailHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const unsubscribeUrl = `${supabaseUrl}/functions/v1/confirm-email-subscription?action=unsubscribe&hash=${emailHash}`;

    // Merge dynamic data
    const templateData = {
      ...userData,
      ...dynamic_data,
      app_url: Deno.env.get("APP_URL") || "https://www.aiwmcquantis.com",
      unsubscribe_url: unsubscribeUrl,
    };

    // Send email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Generate a tracking ID for open/click analytics
    const trackingId = crypto.randomUUID();
    const trackingPixel = `<img src="${supabaseUrl}/functions/v1/confirm-email-subscription?action=open&eid=${trackingId}" width="1" height="1" alt="" style="display:none" />`;

    // Inject tracking pixel at the end of the email HTML
    const rawHtml = template.html(templateData);
    const trackedHtml = rawHtml.replace(/<\/div>\s*$/, `${trackingPixel}</div>`);

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
        html: trackedHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      log.error("Resend error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const result = await emailResponse.json();
    log.info(`Lifecycle email sent: ${template_key} to ${recipientEmail}`);

    // Log every send to email_send_log for global cooldown tracking
    if (user_id || lead_id) {
      await supabase.from("email_send_log").insert({
        id: trackingId,
        user_id: user_id || null,
        lead_id: lead_id || null,
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
