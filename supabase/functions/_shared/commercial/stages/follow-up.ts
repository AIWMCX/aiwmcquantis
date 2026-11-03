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
import type { R3Reconciler } from '../../r3-validator.ts';
import { foundationGroundingBlock, type CommercialFoundation } from '../contracts.ts';
import { scanOutbound } from '../claim-guard.ts';
import { FOLLOWUP_DAY } from '../../mail/followup-order.ts';

export const FollowupDraftOutput = z.object({
  draft: z.string().min(1),
  reasoning: z.string().min(1),
  next_action: z.string().min(1),
});
export type FollowupDraftOutput = z.infer<typeof FollowupDraftOutput>;

export const FOLLOWUP_MAX_WORDS = 110;

/**
 * Cold sequence after the first touch. Since 2026-11-03 it is ONE step: two
 * touches in total (docs/execution/2026-10-30-cold-outreach-zero-replies-
 * diagnosis.md section 5; founder rule: never a 3rd, 4th or 5th contact).
 * The old steps 3 and 4 are gone, so draft_followup rejects them, and
 * followupOrderCheck() makes the sender hold any that were already drafted.
 * Step 2's copy is fixed (outreach-copy.ts renderFollowupBody), not generated.
 * Days are offsets from the first touch.
 */
export const SEQUENCE_STEPS: Record<number, { day: number }> = {
  2: { day: FOLLOWUP_DAY },
};

export function reconcileFollowup(foundation: CommercialFoundation): R3Reconciler<FollowupDraftOutput> {
  return (data) => {
    const scan = scanOutbound(data.draft, foundation, { maxWords: FOLLOWUP_MAX_WORDS });
    return scan.ok ? null : `claim guard: ${scan.violations.join('; ')}`;
  };
}

function buildSystemPrompt(foundation: CommercialFoundation): string {
  return [
    `You draft a follow-up message for a prospect in the ${foundation.product_name} sales funnel.`,
    'Never rely on fake urgency or fabricated scarcity. This is a DRAFT for human review -- it is never sent automatically.',
    'Plain text, peer-to-peer tone, no hype words, no links, no signature or unsubscribe line (code appends those). Never invent customers, results, or facts about the prospect.',
    'Use ONLY approved claims and ONLY the prices listed below.',
    '',
    foundationGroundingBlock(foundation),
    '',
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
    reconcile: reconcileFollowup(args.foundation),
    adminUserId: args.adminUserId,
    requestId: args.requestId,
    inputContext: { stage_context: args.stageContext, previous_interaction_summary: args.previousInteractionSummary ?? null },
  });
}
