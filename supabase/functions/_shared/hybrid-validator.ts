/**
 * Hybrid Validator Agent
 * ----------------------
 * Forensic Issue #3: Industry misclassification, LTV:CAC contradictions,
 * margin/unit-econ inconsistencies in paid analyses.
 *
 * Strategy: Run cheap deterministic rules FIRST. Only call the LLM
 * second-pass validator when rules fire a warning. Average cost: ~$0.002.
 *
 * Returns either { ok: true } (pass) or { ok: false, warnings, llmReview? }.
 */

import {
  callClaude,
  estimateCostUsd,
  isAnthropicConfigured,
  stripFinancialFields,
} from './anthropic.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

export interface ValidatorInput {
  idea: string;
  location: string;
  industry_detected: string;
  score?: number | null;
  verdict?: string | null;
  ltv?: number | null;
  cac?: number | null;
  ltv_cac_ratio?: number | null;
  gross_margin?: number | null;
  net_margin?: number | null;
  monthly_revenue?: number | null;
  monthly_profit?: number | null;
  payback_months?: number | null;
  top_risks?: string[];
  benchmark_match_quality?: string;
}

export interface ValidatorWarning {
  rule: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  field?: string;
  value?: number | string | null;
}

export interface ValidatorResult {
  ok: boolean;
  warnings: ValidatorWarning[];
  llm_review?: {
    triggered: boolean;
    verdict?: 'pass' | 'fail';
    summary?: string;
    cost_usd?: number;
    latency_ms?: number;
    model?: string;
    provider?: 'anthropic' | 'lovable_gateway';
    fallback_reason?: string;
  };
  ran_llm: boolean;
  total_latency_ms: number;
}

/* ============================================================
 *  LAYER 1 — DETERMINISTIC RULES
 *  These run on every paid analysis. Free / instant.
 * ============================================================ */

function runDeterministicRules(input: ValidatorInput): ValidatorWarning[] {
  const w: ValidatorWarning[] = [];

  // R1: LTV:CAC ratio sanity (Anti-BS: must be in [0.3, 20])
  const ratio = input.ltv_cac_ratio ?? (input.ltv && input.cac ? input.ltv / input.cac : null);
  if (ratio !== null && ratio !== undefined) {
    if (ratio > 20) {
      w.push({
        rule: 'ltv_cac_unrealistic_high',
        severity: 'high',
        message: `LTV:CAC ratio of ${ratio.toFixed(1)} exceeds 20x ceiling (Anti-BS rule). Real businesses rarely exceed 5–7x.`,
        field: 'ltv_cac_ratio',
        value: ratio,
      });
    } else if (ratio < 0.3 && ratio > 0) {
      w.push({
        rule: 'ltv_cac_unrealistic_low',
        severity: 'medium',
        message: `LTV:CAC ratio of ${ratio.toFixed(2)} below 0.3 — business is severely cash-burning.`,
        field: 'ltv_cac_ratio',
        value: ratio,
      });
    }
  }

  // R2: Margin ceiling (Anti-BS: gross margin > 95% is suspicious for non-software)
  const gm = input.gross_margin;
  if (gm !== null && gm !== undefined) {
    const isSoftware = /saas|software|api|platform|app/i.test(input.industry_detected || '');
    if (gm > 95 && !isSoftware) {
      w.push({
        rule: 'gross_margin_ceiling_violated',
        severity: 'high',
        message: `Gross margin of ${gm.toFixed(0)}% exceeds 95% ceiling for non-software industry "${input.industry_detected}".`,
        field: 'gross_margin',
        value: gm,
      });
    }
    if (gm > 80 && /coffee|restaurant|food|retail|cafe|bakery|truck/i.test(input.industry_detected || '')) {
      w.push({
        rule: 'gross_margin_industry_mismatch',
        severity: 'high',
        message: `${gm.toFixed(0)}% gross margin contradicts F&B/retail benchmarks (typical 55–75%).`,
        field: 'gross_margin',
        value: gm,
      });
    }
  }

  // R3: Net margin > gross margin (impossible)
  if (input.net_margin !== null && input.net_margin !== undefined &&
      input.gross_margin !== null && input.gross_margin !== undefined) {
    if (input.net_margin > input.gross_margin) {
      w.push({
        rule: 'net_exceeds_gross',
        severity: 'high',
        message: `Net margin (${input.net_margin}%) exceeds gross margin (${input.gross_margin}%) — impossible.`,
        field: 'net_margin',
      });
    }
  }

  // R4: Payback months sanity
  if (input.payback_months !== null && input.payback_months !== undefined) {
    if (input.payback_months > 60) {
      w.push({
        rule: 'payback_unrealistic',
        severity: 'medium',
        message: `Payback of ${input.payback_months} months exceeds 5 years — verdict should reflect non-viability.`,
        field: 'payback_months',
        value: input.payback_months,
      });
    }
  }

  // R5: Verdict / score coherence
  if (input.score !== null && input.score !== undefined && input.verdict) {
    const verdictLower = input.verdict.toLowerCase();
    if (input.score >= 70 && /not\s*viable|fail|kill/i.test(verdictLower)) {
      w.push({
        rule: 'verdict_score_mismatch',
        severity: 'medium',
        message: `Score ${input.score} is high but verdict is "${input.verdict}" — narrative contradicts numbers.`,
      });
    }
    if (input.score < 30 && /viable|strong|excellent/i.test(verdictLower)) {
      w.push({
        rule: 'verdict_score_mismatch',
        severity: 'high',
        message: `Score ${input.score} is low but verdict is "${input.verdict}" — narrative contradicts numbers.`,
      });
    }
  }

  // R6: Industry detection confidence
  if (!input.industry_detected || input.industry_detected === 'unknown' || input.industry_detected === 'general') {
    w.push({
      rule: 'industry_unclassified',
      severity: 'medium',
      message: `Industry could not be classified from "${input.idea.slice(0, 60)}…" — benchmarks may be generic.`,
      field: 'industry_detected',
    });
  }

  // R7: Benchmark match quality
  if (input.benchmark_match_quality === 'none' || input.benchmark_match_quality === 'low') {
    w.push({
      rule: 'benchmark_match_weak',
      severity: 'low',
      message: `Benchmark match quality is "${input.benchmark_match_quality}" — confidence reduced.`,
    });
  }

  // R8: Risk count
  if (!input.top_risks || input.top_risks.length < 3) {
    w.push({
      rule: 'insufficient_risks',
      severity: 'low',
      message: `Only ${input.top_risks?.length ?? 0} risks identified — minimum 3 expected for a complete analysis.`,
    });
  }

  return w;
}

/* ============================================================
 *  LAYER 2 — LLM SECOND-PASS (Triggered conditionally)
 *  Only fires when deterministic rules produce >=1 medium/high warning.
 *  Uses cheap fast model to keep cost ~$0.002 per triggered call.
 * ============================================================ */

async function runLLMReview(
  input: ValidatorInput,
  warnings: ValidatorWarning[]
): Promise<ValidatorResult['llm_review']> {
  if (!LOVABLE_API_KEY) {
    return { triggered: false };
  }

  const start = Date.now();

  const systemPrompt = `You are a financial analysis validator. Given a business analysis and a list of automated warnings, decide whether the analysis is internally coherent and safe to deliver to a paying user.

Reply ONLY with strict JSON: { "verdict": "pass" | "fail", "summary": "<one sentence, max 140 chars>" }

PASS if: warnings are minor (low severity only) OR the numbers + verdict + industry classification are mutually consistent.
FAIL if: there is a true contradiction between numbers, verdict, or industry that would mislead the user.`;

  const userPrompt = `Idea: ${input.idea.slice(0, 300)}
Location: ${input.location}
Industry detected: ${input.industry_detected}
Score: ${input.score} | Verdict: ${input.verdict}
LTV: ${input.ltv} | CAC: ${input.cac} | LTV:CAC: ${input.ltv_cac_ratio}
Gross margin: ${input.gross_margin}% | Net margin: ${input.net_margin}%
Monthly revenue: ${input.monthly_revenue} | Monthly profit: ${input.monthly_profit}
Payback: ${input.payback_months} months
Top risks: ${(input.top_risks || []).slice(0, 3).join(' | ')}

Automated warnings (${warnings.length}):
${warnings.map((w) => `- [${w.severity}] ${w.rule}: ${w.message}`).join('\n')}

Decide.`;

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1,
        max_completion_tokens: 200,
      }),
    });

    const latency = Date.now() - start;

    if (!res.ok) {
      return {
        triggered: true,
        verdict: 'pass', // fail-open on API error — don't block delivery
        summary: `LLM validator unavailable (${res.status}); deterministic rules used as authority.`,
        latency_ms: latency,
      };
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() ?? '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

    return {
      triggered: true,
      verdict: parsed.verdict === 'fail' ? 'fail' : 'pass',
      summary: String(parsed.summary || '').slice(0, 200),
      cost_usd: 0.002,
      latency_ms: latency,
    };
  } catch (err) {
    console.error('[hybrid-validator] LLM review failed:', err);
    return {
      triggered: true,
      verdict: 'pass', // fail-open
      summary: 'LLM validator errored; deterministic rules used as authority.',
      latency_ms: Date.now() - start,
    };
  }
}

/* ============================================================
 *  PUBLIC API
 * ============================================================ */

export async function validateAnalysis(input: ValidatorInput): Promise<ValidatorResult> {
  const start = Date.now();
  const warnings = runDeterministicRules(input);

  // Trigger LLM only when at least one medium/high warning fires
  const shouldEscalate = warnings.some((w) => w.severity !== 'low');

  let llmReview: ValidatorResult['llm_review'] | undefined;
  let ran = false;
  if (shouldEscalate) {
    llmReview = await runLLMReview(input, warnings);
    ran = true;
  }

  const ok = !warnings.some((w) => w.severity === 'high') &&
             (!llmReview || llmReview.verdict !== 'fail');

  return {
    ok,
    warnings,
    llm_review: llmReview,
    ran_llm: ran,
    total_latency_ms: Date.now() - start,
  };
}
