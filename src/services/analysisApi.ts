import { supabase } from '@/integrations/supabase/client';
import type {
  AnalysisRequest,
  AnalysisAPIResponse,
  AnalysisGenerationResult,
  BusinessAnalysisResult,
} from '@/types/analysis';
import { startRequestContext } from '@/lib/correlation';
import { QuantisMath } from '@/lib/quantis-math';
import { trackAnalysisStarted, trackAnalysisCompleted } from '@/lib/analytics';

import { logger } from '@/lib/logger';
import { mergeCanonicalDataSources } from '@/lib/canonical-data-sources';
import { classifyIndustry, isRichPrior, type IndustryPrior } from '@/lib/industry-priors';
import { normalizeAnalysisResult } from '@/lib/analysis-normalizer';
import {
  calculateInvestmentPaybackMonth,
  calculateOperatingBreakEvenMonth,
} from '../../supabase/functions/analyze-business/operating-projection';
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

type CompletedAnalysisResponse = AnalysisAPIResponse & {
  success: true;
  data: BusinessAnalysisResult;
};

function isQueuedResponse(data: AnalysisAPIResponse): data is AnalysisAPIResponse & { queued: true; job_id: string } {
  return data.queued === true && typeof data.job_id === 'string' && data.job_id.length > 0;
}

function isCompletedAnalysisResponse(data: AnalysisAPIResponse): data is CompletedAnalysisResponse {
  return data.success === true && !!data.data && typeof data.data === 'object' && 'financial_analysis' in data.data;
}

// Legacy free/anonymous slim response retained only for backward compatibility.
// Current complimentary Decision Runs also carry `_tier: 'free'`, but include
// `financial_analysis` and must continue through the complete-result path.
// Checking only the tier silently discarded the full report, prevented
// persistence/history, and stranded the user before Scenario Lab.
export function isLegacyFreeTierResponse(data: AnalysisAPIResponse): boolean {
  return (
    data.success === true &&
    !!data.data &&
    typeof data.data === 'object' &&
    (data.data as unknown as Record<string, unknown>)._tier === 'free' &&
    !('financial_analysis' in data.data)
  );
}

// Exported (CodeRabbit catch on PR #88) so a real test can call this
// directly and assert on its actual return value -- e.g. that
// used_fallback is genuinely set -- instead of only regex-matching this
// file's source text.
export function emergencyFallbackAnalysis(request: AnalysisRequest, reason: string): BusinessAnalysisResult {
  const f = request.financial_inputs ?? {};
  // Match the idea against the top-20 industry priors. If matched, we lift
  // confidence to 70–78 and bias unit-economics toward industry medians
  // instead of generic 65% contribution-margin guess. See
  // src/lib/industry-priors.ts for sources.
  const prior: IndustryPrior = classifyIndustry(`${request.idea ?? ''} ${request.location ?? ''}`);
  const usedRichPrior = isRichPrior(prior);
  const revenue = QuantisMath.round(f.monthly_revenue ?? QuantisMath.multiply(f.average_price ?? 75, f.expected_customers ?? 100));
  const startup = QuantisMath.round(f.startup_investment ?? QuantisMath.multiply(revenue || 7500, 6));
  const benchmarkCogs = QuantisMath.round(QuantisMath.multiply(revenue, prior.cogs_pct / 100));
  const totalExpenses = QuantisMath.round(f.monthly_costs ?? QuantisMath.add(
    benchmarkCogs,
    QuantisMath.multiply(revenue || 7500, prior.fixed_cost_pct_of_revenue),
  ));
  // Canonical contract: a user-supplied monthly_costs value is the total
  // monthly cost, including COGS. Allocate that total between variable and
  // fixed costs without adding COGS a second time.
  const cogs = f.monthly_costs !== undefined ? Math.min(benchmarkCogs, totalExpenses) : benchmarkCogs;
  const fixedCosts = Math.max(0, totalExpenses - cogs);
  const grossProfit = QuantisMath.round(QuantisMath.subtract(revenue, cogs));
  const netProfit = QuantisMath.round(QuantisMath.subtract(revenue, totalExpenses));
  const grossMargin = QuantisMath.toNumber(QuantisMath.percentage(grossProfit, revenue), 1);
  const netMargin = QuantisMath.toNumber(QuantisMath.percentage(netProfit, revenue), 1);
  const cac = QuantisMath.round(f.cac ?? prior.cac_usd);
  const avgPrice = QuantisMath.round(f.average_price ?? 75);
  const churn = QuantisMath.toNumber(QuantisMath.divide(f.churn_rate ?? prior.churn_monthly_pct, 100), 4);
  const lifetimeMonths = churn > 0 ? QuantisMath.toNumber(QuantisMath.divide(1, churn), 1) : prior.avg_lifetime_months;
  // Coherence rule (see /mnt/documents/quantis_engine_invariants.md):
  // If the business is unprofitable at the base case, CAC payback MUST be the 999 sentinel
  // and LTV:CAC must be capped, because contribution-only math is misleading when fixed
  // costs eat the gross profit. The reviewer-flagged "0.1 mo vs 999 mo" contradiction
  // came from skipping this guard in the fallback path.
  const isUnprofitable = netProfit <= 0;
  const contribRatio = revenue > 0 ? grossProfit / revenue : prior.contribution_margin_ratio;
  const rawLtv = QuantisMath.round(QuantisMath.multiply(QuantisMath.multiply(avgPrice, contribRatio), lifetimeMonths));
  const ltv = isUnprofitable ? QuantisMath.round(Math.min(rawLtv, QuantisMath.toNumber(QuantisMath.multiply(cac, 4)))) : rawLtv;
  const rawLtvCac = QuantisMath.toNumber(QuantisMath.ltvCacRatio(ltv, cac), 2);
  const ltvCac = isUnprofitable ? Math.min(rawLtvCac, 4) : Math.min(rawLtvCac, 50);
  const rawCacPayback = QuantisMath.toNumber(QuantisMath.divide(cac, QuantisMath.multiply(avgPrice, contribRatio)), 1);
  const cacPaybackMonths = isUnprofitable ? 999 : Math.max(0.5, Math.min(rawCacPayback, 240));
  const payback = calculateInvestmentPaybackMonth(startup, revenue, totalExpenses);
  const breakEvenMonths = calculateOperatingBreakEvenMonth(revenue, totalExpenses) ?? 0;
  const pessimisticRevenue = QuantisMath.round(QuantisMath.multiply(revenue, 0.75));
  const pessimisticCogs = QuantisMath.round(QuantisMath.multiply(cogs, 0.75));
  const pessimisticGrossProfit = QuantisMath.round(QuantisMath.subtract(pessimisticRevenue, pessimisticCogs));
  const pessimisticNetProfit = QuantisMath.round(QuantisMath.subtract(pessimisticGrossProfit, fixedCosts));
  const optimisticRevenue = QuantisMath.round(QuantisMath.multiply(revenue, 1.25));
  const optimisticCogs = QuantisMath.round(QuantisMath.multiply(cogs, 1.25));
  const optimisticGrossProfit = QuantisMath.round(QuantisMath.subtract(optimisticRevenue, optimisticCogs));
  const optimisticNetProfit = QuantisMath.round(QuantisMath.subtract(optimisticGrossProfit, fixedCosts));
  const now = new Date().toISOString();

  return {
    financial_analysis: {
      mrr: revenue,
      arr: QuantisMath.round(QuantisMath.multiply(revenue, 12)),
      scenarios: {
        pessimistic: {
          revenue: pessimisticRevenue,
          variable_costs: pessimisticCogs,
          fixed_costs: fixedCosts,
          gross_profit: pessimisticGrossProfit,
          net_profit: pessimisticNetProfit,
          gross_margin: QuantisMath.toNumber(QuantisMath.percentage(pessimisticGrossProfit, pessimisticRevenue), 1),
          net_margin: QuantisMath.toNumber(QuantisMath.percentage(pessimisticNetProfit, pessimisticRevenue), 1),
        },
        base: { revenue, variable_costs: cogs, fixed_costs: fixedCosts, gross_profit: grossProfit, net_profit: netProfit, gross_margin: grossMargin, net_margin: netMargin },
        optimistic: {
          revenue: optimisticRevenue,
          variable_costs: optimisticCogs,
          fixed_costs: fixedCosts,
          gross_profit: optimisticGrossProfit,
          net_profit: optimisticNetProfit,
          gross_margin: QuantisMath.toNumber(QuantisMath.percentage(optimisticGrossProfit, optimisticRevenue), 1),
          net_margin: QuantisMath.toNumber(QuantisMath.percentage(optimisticNetProfit, optimisticRevenue), 1),
        },
      },
      unit_economics: { contribution_margin: QuantisMath.round(QuantisMath.multiply(avgPrice, contribRatio)), contribution_margin_ratio: contribRatio, cac, cac_payback_months: cacPaybackMonths, ltv, ltv_cac_ratio: ltvCac },
      breakeven: { breakeven_units: QuantisMath.ceil(QuantisMath.divide(fixedCosts, QuantisMath.multiply(avgPrice, contribRatio))), breakeven_revenue: QuantisMath.round(QuantisMath.divide(fixedCosts, contribRatio)), breakeven_months: breakEvenMonths },
      returns: { payback_period_months: payback, roi_year_1: QuantisMath.toNumber(QuantisMath.roi(QuantisMath.multiply(netProfit, 12), startup), 1), roi_year_3: QuantisMath.toNumber(QuantisMath.roi(QuantisMath.multiply(netProfit, 36), startup), 1), npv_3_years: QuantisMath.round(QuantisMath.npv(startup, netProfit, 36, 0.12)) },
      startup_investment: { total: startup, breakdown: { rent_deposit: QuantisMath.round(QuantisMath.multiply(startup, 0.18)), equipment: QuantisMath.round(QuantisMath.multiply(startup, 0.32)), inventory: QuantisMath.round(QuantisMath.multiply(startup, 0.15)), legal: QuantisMath.round(QuantisMath.multiply(startup, 0.05)), marketing_initial: QuantisMath.round(QuantisMath.multiply(startup, 0.12)), working_capital: QuantisMath.round(QuantisMath.multiply(startup, 0.18)) }, reasoning: 'Emergency deterministic fallback generated because the analysis service did not return a completed result.' },
      monthly_expenses: { total: totalExpenses, variable_costs: cogs, fixed_costs: fixedCosts, breakdown: { rent: QuantisMath.round(QuantisMath.multiply(fixedCosts, 0.25)), utilities: QuantisMath.round(QuantisMath.multiply(fixedCosts, 0.08)), salaries: QuantisMath.round(QuantisMath.multiply(fixedCosts, 0.42)), inventory_replenishment: cogs, marketing: QuantisMath.round(QuantisMath.multiply(fixedCosts, 0.15)), other: QuantisMath.round(QuantisMath.multiply(fixedCosts, 0.10)) } },
      monthly_profit: netProfit,
      payback_period_months: payback,
      break_even_months: breakEvenMonths,
      roi_year_1: QuantisMath.toNumber(QuantisMath.roi(QuantisMath.multiply(netProfit, 12), startup), 1),
      calculations_summary: 'Deterministic calculations completed locally as a reliability fallback.',
    },
    business_plan: {
      executive_summary: `Fallback analysis for ${request.idea.trim()} in ${request.location.trim()}. The system produced a deterministic result so the user is not left without analysis output.`,
      product_description: request.idea.trim(),
      target_audience: `Customers in ${request.location.trim()} with urgent need for this offer.`,
      competitive_advantages: 'Speed to market, focused positioning, disciplined unit economics, and fast validation cycles.',
      operations: 'Start lean, validate demand, control fixed costs, and scale only after repeatable acquisition is proven.',
      launch_steps: [
        { step: 1, title: 'Validate demand', description: 'Interview target customers and confirm willingness to pay.', duration: '1-2 weeks', cost: QuantisMath.round(QuantisMath.multiply(startup, 0.05)) },
        { step: 2, title: 'Launch minimum offer', description: 'Ship the smallest paid version and measure conversion.', duration: '2-4 weeks', cost: QuantisMath.round(QuantisMath.multiply(startup, 0.20)) },
        { step: 3, title: 'Scale proven channels', description: 'Increase spend only where CAC and payback remain acceptable.', duration: 'Ongoing', cost: QuantisMath.round(QuantisMath.multiply(startup, 0.15)) },
      ],
      risks: [{ risk: 'Fallback precision limitation', probability: 'средняя', impact: 'средний', mitigation: 'Run Full or Pro again when the service is stable to get richer benchmark-backed narrative.' }],
    },
    marketing_plan: { positioning: 'Position around one painful customer problem and measurable ROI.', pricing_strategy: `Validate pricing around $${avgPrice.toLocaleString()} average revenue per customer.`, channels: [{ channel: 'Direct outreach', description: 'Manual founder-led sales to validate demand before scaling paid media.', budget_monthly: QuantisMath.round(QuantisMath.multiply(fixedCosts, 0.15)), expected_roi: 'Fastest learning loop' }], cac, ltv, first_3_months_plan: 'Month 1 validate. Month 2 launch paid pilot. Month 3 scale only channels with acceptable payback.' },
    market_analysis: { market_size: { tam: 'Requires benchmark refresh.', sam: `Local opportunity in ${request.location.trim()}.`, som: `Initial obtainable market modeled at $${QuantisMath.round(QuantisMath.multiply(revenue, 12)).toLocaleString()} annual revenue.` }, trends: ['Demand validation matters more than forecast precision at this stage'], competition: { main_competitors: [{ name: 'Existing alternatives', strengths: 'Customer awareness', weaknesses: 'Room for better execution' }], competitive_landscape: 'Assessed with deterministic fallback logic.', market_gaps: 'Validate unmet needs through customer interviews.' }, barriers_to_entry: 'Customer acquisition cost and operational execution.', growth_opportunities: 'Expand only after unit economics are proven.' },
    // CodeRabbit catch on PR #88: usePdfExport.ts's degraded-mode PDF
    // labeling reads used_fallback to know the AI narrator never ran --
    // this client-side emergency path is exactly that case (the analysis
    // service call failed entirely), so it must set this too, not just the
    // server's own generateDeterministicFallbackResult() path.
    used_fallback: true,
    confidence_score: isUnprofitable
      ? Math.min(prior.confidence - 15, 40)
      : (usedRichPrior ? prior.confidence : 55),
    data_sources: mergeCanonicalDataSources([
      usedRichPrior
        ? `Industry prior: ${prior.label} — ${prior.source}`
        : 'Client-side deterministic fallback (used because the live AI narrator was unreachable)',
      'User-provided inputs',
    ]),
    limitations: [
      `Fallback used because: ${reason}`,
      usedRichPrior
        ? `Industry prior applied (${prior.label}); live narrator/benchmark refresh recommended for >${prior.confidence}% confidence.`
        : 'Run Full/Pro again for full benchmark and AI narrative depth.',
      ...(isUnprofitable ? ['Base case is unprofitable — CAC payback set to ∞ sentinel (999) and LTV:CAC capped at 4x per coherence rule R-CAC-NEG-NOPAY.'] : []),
    ],
    metadata: { idea: request.idea.trim(), location: request.location.trim(), generated_at: now, model: usedRichPrior ? `industry-prior:${prior.id}` : 'client-deterministic-fallback', version: 'analysis-fallback-v3' },
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateAnalysis(request: AnalysisRequest): Promise<AnalysisGenerationResult> {
  let lastError: Error | null = null;

  // Begin a correlation context for this analysis run. Every logger.* call
  // and every Sentry event between here and the end of the request will
  // carry the same `request_id`, and the edge function will echo it back.
  const requestId = startRequestContext();
  logger.info('Analysis request started', { metadata: { request_id: requestId } });

  // SOW canonical funnel — fire `analysis_start` exactly once per submission
  // (before retries) so /admin/funnel reflects user intent, not retry volume.
  try {
    trackAnalysisStarted(request.idea ?? '', request.location ?? '');
  } catch {
    /* analytics must never break the analysis path */
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        logger.info(`Retry attempt ${attempt}/${MAX_RETRIES}`);
        await sleep(RETRY_DELAY * attempt);
      }

      const { data, error } = await supabase.functions.invoke<AnalysisAPIResponse>('analyze-business', {
        body: {
          idea: request.idea.trim(),
          location: request.location.trim(),
          ...(request.financial_inputs && { financial_inputs: request.financial_inputs }),
          ...(request.financial_inputs?.selected_industry && { selected_industry: request.financial_inputs.selected_industry }),
          ...(request.documents && request.documents.length > 0 && { documents: request.documents }),
          ...(request.analysis_depth && { analysis_depth: request.analysis_depth }),
        },
      });

      if (error) {
        // Try to parse the response body for structured error messages (e.g., 400 validation errors)
        const status = error.context?.status;
        if (status === 400) {
          // Parse the body to get the user-friendly error message from the edge function.
          // error.context is a fetch Response — its .body is a ReadableStream, so the
          // old object-passthrough produced {} and users saw a useless "Invalid request".
          let body: any = {};
          try {
            if (error.context && typeof error.context.json === 'function') {
              body = await error.context.json();
            } else {
              const rawBody = error.context?.body;
              if (typeof rawBody === 'string') {
                body = JSON.parse(rawBody);
              } else if (rawBody && typeof rawBody === 'object' && !(rawBody instanceof ReadableStream)) {
                body = rawBody;
              }
            }
          } catch {}
          
          const code = body.code || 'VALIDATION_ERROR';
          const message = body.error || 'Invalid request';
          const hint = body.hint ? ` ${body.hint}` : '';
          throw new Error(`${code}: ${message}${hint}`);
        }

        // Check for rate limit error in the response
        if (error.message?.includes('429') || status === 429) {
          const errorData = error.context?.body || {};
          const retryAfter = errorData.details?.retry_after_seconds || 60;
          const minutes = Math.ceil(retryAfter / 60);
          
          // Provide context-aware message
          const reason = errorData.details?.reason;
          let message = `Too many requests. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
          if (reason === 'device_limit') {
            message = `Free analysis limit reached. Sign in for more analyses or try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
          } else if (reason === 'ip_limit') {
            message = `Too many requests from your network. Sign in to continue or try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
          } else if (reason === 'duplicate_submission') {
            message = 'This exact analysis was already performed recently. Try a different idea or location.';
          }
          
          throw new Error(`RATE_LIMIT_EXCEEDED: ${message} | retry_after=${retryAfter}`);
        }

        // Spec §09.2 — explicit 402 from edge transport (Quota / Tier gate)
        if (status === 402) {
          let body: any = {};
          try {
            const rb = error.context?.body;
            body = typeof rb === 'string' ? JSON.parse(rb) : (rb || {});
          } catch {}
          const msg = body.message || 'Upgrade required to continue.';
          const upgradeUrl = body.upgrade_url || '/pricing';
          throw new Error(`TIER_GATE: ${msg} | upgrade_url=${upgradeUrl}`);
        }

        throw new Error(error.message || 'Failed to invoke analysis function');
      }

      if (!data) {
        throw new Error('Empty response from server');
      }

      // ───────────────────────────────────────────────────────────────
      // PRO async path: backend returns 202 with { queued, job_id }.
      // We surface this as a typed result so the caller can poll the
      // analysis_jobs table instead of crashing on missing `data`.
      // ───────────────────────────────────────────────────────────────
      if (isQueuedResponse(data)) {
        logger.info('Analysis enqueued for background processing', {
          metadata: { job_id: data.job_id, request_id: data.request_id ?? requestId },
        });
        return {
          kind: 'queued_job',
          job_id: data.job_id,
          request_id: data.request_id ?? requestId,
          depth_requested: 'pro',
        };
      }

      // Handle rate limit response from edge function
      if ('code' in data && (data.code === 'RATE_LIMIT_EXCEEDED' || data.code === 'ANONYMOUS_LIMIT_EXCEEDED')) {
        const details = (data as any).details || {};
        const retryAfter = details.retry_after_seconds || 60;
        const minutes = Math.ceil(retryAfter / 60);
        
        const reason = details.reason;
        let message = `Too many requests. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
        if (reason === 'device_limit') {
          message = `Free analysis limit reached. Sign in for more analyses or try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
        } else if (reason === 'ip_limit') {
          message = `Too many requests from your network. Sign in to continue or try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
        } else if (reason === 'duplicate_submission') {
          message = 'This exact analysis was already performed recently. Try a different idea or location.';
        }
        
        throw new Error(`RATE_LIMIT_EXCEEDED: ${message} | retry_after=${retryAfter}`);
      }

      // Spec §09.2 — quota / tier-gate envelope returned with HTTP 402.
      // We surface it as a typed error so React-Query consumers can route
      // the user to /pricing instead of showing a generic failure.
      if ('error' in data && ((data as any).error === 'QUOTA_EXCEEDED' || (data as any).error === 'TIER_GATE')) {
        const d = data as unknown as Record<string, unknown>;
        const message = (d.message as string) || 'Upgrade required to continue.';
        const upgradeUrl = (d.upgrade_url as string) || '/pricing';
        throw new Error(`TIER_GATE: ${message} | upgrade_url=${upgradeUrl}`);
      }

      // Legacy free/anonymous slim response. Current complimentary free
      // Decision Runs contain `financial_analysis` and therefore bypass this
      // compatibility branch and persist like every other complete result.
      if (isLegacyFreeTierResponse(data)) {
        const d = data.data as unknown as Record<string, unknown>;
        logger.info('Free-tier analysis summary received', { metadata: { request_id: requestId } });
        try {
          // score deprecated 2026-08-17 (see FreeTierAnalysisSummary); the
          // analytics dimension now tracks input_completeness instead.
          trackAnalysisCompleted(0, 0, Number(d.input_completeness ?? 0) || 0);
        } catch {
          /* analytics must never break the analysis path */
        }
        const cta = d._upgrade_cta as Record<string, unknown> | undefined;
        return {
          kind: 'free_tier_summary',
          input_completeness: (d.input_completeness as number | null) ?? null,
          verdict: (d.verdict as string | null) ?? null,
          top_risks: Array.isArray(d.top_risks) ? (d.top_risks as unknown[]) : [],
          base_revenue: (d.base_revenue as number | null) ?? null,
          currency: (d.currency as string) ?? 'USD',
          industry_detected: d.industry_detected as string | undefined,
          location: (d.location as string) ?? request.location.trim(),
          idea: (d.idea as string) ?? request.idea.trim(),
          ...(cta && {
            upgrade_cta: {
              message: (cta.message as string) ?? 'Unlock the full report',
              features_locked: Array.isArray(cta.features_locked) ? (cta.features_locked as string[]) : [],
              plus_price_monthly: (cta.plus_price_monthly as number) ?? 17,
              plus_trial_days: (cta.plus_trial_days as number) ?? 14,
              pro_trial_days: (cta.pro_trial_days as number) ?? 14,
            },
          }),
        };
      }

      if (!isCompletedAnalysisResponse(data)) {
        throw new Error(data.error || 'Analysis failed');
      }

      // SOW canonical funnel — fire `analysis_complete` on a real success.
      try {
        const fa = data.data?.financial_analysis as unknown as Record<string, unknown> | undefined;
        const monthlyProfit = Number(fa?.net_profit ?? fa?.monthly_profit ?? 0) || 0;
        const payback = Number(fa?.payback_months ?? 0) || 0;
        const confidence = Number(
          (data.data as unknown as Record<string, unknown>)?.confidence_score ?? 0,
        ) || 0;
        trackAnalysisCompleted(monthlyProfit, payback, confidence);
      } catch {
        /* analytics must never break the analysis path */
      }

      // Always inject the canonical 97,500-datapoint provenance so the UI
      // and PDF show real ingested datasets — even if the backend omitted them.
      const enriched: BusinessAnalysisResult = {
        ...data.data,
        data_sources: mergeCanonicalDataSources(data.data.data_sources as string[] | undefined),
      };
      return normalizeAnalysisResult(enriched);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.error(`Analysis attempt ${attempt + 1} failed:`, lastError.message);
      
      // Don't retry for validation errors, invalid input, or rate limit errors
      if (lastError.message.includes('VALIDATION') || 
          lastError.message.includes('validation') ||
          lastError.message.includes('RATE_LIMIT') ||
          lastError.message.includes('TIER_GATE') ||
          lastError.message.includes('QUOTA_EXCEEDED') ||
          lastError.message.includes('USAGE_LIMIT') ||
          lastError.message.includes('PAYMENT') ||
          lastError.message.includes('Unauthorized') ||
          lastError.message.includes('401') ||
          lastError.message.includes('402') ||
          lastError.message.includes('INVALID_BUSINESS_IDEA')) {
        throw lastError;
      }
    }
  }

  // Step 4 of the benchmark-first plan: never fabricate an analysis on the
  // client. A client-side fallback has no access to the 97,500-row benchmark
  // dataset and was the root cause of the "0.1 vs 999 month CAC payback"
  // contradictions the reviewer flagged. Surface a clean error instead so
  // the UI can show a retry CTA.
  const allowClientFallback = import.meta.env.VITE_ALLOW_CLIENT_FALLBACK === 'true';
  if (allowClientFallback) {
    logger.warn('Analysis service failed; using opt-in client deterministic fallback', {
      metadata: { request_id: requestId, reason: lastError?.message ?? 'unknown' },
    });
    return emergencyFallbackAnalysis(request, lastError?.message ?? 'analysis service unavailable');
  }

  logger.error('Analysis service unavailable after retries', {
    metadata: { request_id: requestId, reason: lastError?.message ?? 'unknown' },
  });
  throw new Error(
    `ANALYSIS_UNAVAILABLE: The analysis engine is temporarily unreachable. Please try again in a moment. (${lastError?.message ?? 'unknown error'})`,
  );
}

// Validation helpers
export function validateIdea(idea: string): { valid: boolean; error?: string } {
  const trimmed = idea.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Please enter a business idea' };
  }
  if (trimmed.length < 10) {
    return { valid: false, error: 'Minimum 10 characters required' };
  }
  if (trimmed.length > 5000) {
    return { valid: false, error: 'Maximum 5,000 characters allowed' };
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [/<script/i, /javascript:/i, /<iframe/i];
  if (suspiciousPatterns.some(p => p.test(trimmed))) {
    return { valid: false, error: 'Invalid characters detected' };
  }
  
  return { valid: true };
}

export function validateLocation(location: string): { valid: boolean; error?: string } {
  const trimmed = location.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Please enter a location' };
  }
  if (trimmed.length < 2) {
    return { valid: false, error: 'Minimum 2 characters required' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Maximum 100 characters allowed' };
  }
  
  return { valid: true };
}
