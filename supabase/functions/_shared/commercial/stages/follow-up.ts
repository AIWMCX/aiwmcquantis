/**
 * Commercial Ops workflow -- Follow-up stage (spec section 8).
 *
 * Generates a DRAFT only. "Never automatically send messages. User must
 * explicitly approve outbound communication" -- the draft/status/approval
 * lifecycle is enforced downstream by commercial_followups' schema +
 * approve_commercial_followup()/reject_commercial_followup() RPCs, not by
 * this function (which only ever produces a draft string).
 */
import { z } from 'npm:zod@3.23.8';
import { runCommercialAgent, type CommercialAgentRunResult } from '../agent-runtime.ts';
import type { CommercialFoundation } from '../contracts.ts';

export const FollowupDraftOutput = z.object({
  draft: z.string().min(1),
  reasoning: z.string().min(1),
  next_action: z.string().min(1),
});
export type FollowupDraftOutput = z.infer<typeof FollowupDraftOutput>;

function buildSystemPrompt(foundation: CommercialFoundation): string {
  return [
    `You draft a follow-up message for a prospect in the ${foundation.product_name} sales funnel.`,
    'Never rely on fake urgency or fabricated scarcity. This is a DRAFT for human review -- it is never sent automatically.',
    'Respond with ONLY a single valid JSON object matching the required schema. No markdown, no commentary, no code fences.',
  ].join('\n');
}

export interface DraftFollowupArgs {
  foundation: CommercialFoundation;
  stageContext: string;
  previousInteractionSummary?: string | null;
  adminUserId?: string | null;
  requestId?: string | null;
}

export async function draftFollowup(
  args: DraftFollowupArgs,
): Promise<CommercialAgentRunResult<FollowupDraftOutput>> {
  const userPrompt = [
    `Stage context: ${args.stageContext}`,
    args.previousInteractionSummary ? `Previous interaction: ${args.previousInteractionSummary}` : '',
    'Draft a follow-up as a JSON object with exactly these fields: draft, reasoning, next_action.',
  ]
    .filter(Boolean)
    .join('\n');

  return runCommercialAgent({
    stage: 'follow_up',
    foundationVersion: args.foundation.version,
    systemPrompt: buildSystemPrompt(args.foundation),
    userPrompt,
    schema: FollowupDraftOutput,
    adminUserId: args.adminUserId,
    requestId: args.requestId,
    inputContext: { stage_context: args.stageContext, previous_interaction_summary: args.previousInteractionSummary ?? null },
  });
}
