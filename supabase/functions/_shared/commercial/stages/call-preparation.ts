/**
 * Commercial Ops workflow -- Call Preparation stage (spec section 6).
 *
 * A concise call brief from actual available information. The objective is
 * decision clarity, not manipulation of the prospect.
 */
import { z } from 'npm:zod@3.23.8';
import { runCommercialAgent, type CommercialAgentRunResult } from '../agent-runtime.ts';
import type { CommercialFoundation } from '../contracts.ts';

export const CallBriefOutput = z.object({
  what_we_know: z.array(z.string()),
  what_we_dont_know: z.array(z.string()),
  why_fit: z.string().min(1),
  questions_to_ask: z.array(z.string()).min(1),
  financial_assumptions_to_test: z.array(z.string()),
  demonstration_path: z.string().nullable(),
  possible_objections: z.array(z.string()),
  desired_next_step: z.string().min(1),
});
export type CallBriefOutput = z.infer<typeof CallBriefOutput>;

function buildSystemPrompt(foundation: CommercialFoundation): string {
  return [
    `You prepare a concise sales call brief for ${foundation.product_name}. The objective is decision clarity for both sides, not manipulation of the prospect.`,
    'questions_to_ask should help diagnose: current situation, decision being considered, current process, financial consequence, uncertainty, constraints, decision authority, timeline, and what would constitute useful evidence.',
    'Respond with ONLY a single valid JSON object matching the required schema. No markdown, no commentary, no code fences.',
    '',
    '=== CANONICAL FOUNDATION (version ' + foundation.version + ') ===',
    `Product: ${foundation.product_name} -- ${foundation.product_description}`,
    `Differentiators: ${foundation.differentiators.join(' | ')}`,
  ].join('\n');
}

export interface PrepareCallBriefArgs {
  foundation: CommercialFoundation;
  prospectSummary: string;
  offerSummary?: string | null;
  adminUserId?: string | null;
  requestId?: string | null;
}

export async function prepareCallBrief(
  args: PrepareCallBriefArgs,
): Promise<CommercialAgentRunResult<CallBriefOutput>> {
  const userPrompt = [
    `Prospect summary: ${args.prospectSummary}`,
    args.offerSummary ? `Relevant offer: ${args.offerSummary}` : '',
    'Prepare a call brief as a JSON object with exactly these fields: what_we_know (array), what_we_dont_know (array), why_fit, questions_to_ask (array, at least one), financial_assumptions_to_test (array), demonstration_path (string or null), possible_objections (array), desired_next_step.',
  ]
    .filter(Boolean)
    .join('\n');

  return runCommercialAgent({
    stage: 'call_preparation',
    foundationVersion: args.foundation.version,
    systemPrompt: buildSystemPrompt(args.foundation),
    userPrompt,
    schema: CallBriefOutput,
    adminUserId: args.adminUserId,
    requestId: args.requestId,
    inputContext: { prospect_summary: args.prospectSummary, offer_summary: args.offerSummary ?? null },
  });
}
