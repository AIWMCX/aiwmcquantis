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

export const FollowupDraftOutput = z.object({
  draft: z.string().min(1),
  reasoning: z.string().min(1),
  next_action: z.string().min(1),
});
export type FollowupDraftOutput = z.infer<typeof FollowupDraftOutput>;

export const FOLLOWUP_MAX_WORDS = 110;

/**
 * Cold sequence after the first touch. Each step changes the angle rather
 * than "bumping" the same ask -- the pattern shared by the open-source
 * AI-SDR sequencers (avcap/ai-sdr multi-step sequences) and standard B2B
 * outbound practice. Days are offsets from the first touch.
 */
export const SEQUENCE_STEPS: Record<number, { day: number; brief: string }> = {
  2: { day: 3, brief: 'Short bump (40-70 words). Do not repeat the first email. Add ONE new concrete angle: a specific assumption type (e.g. customer volume, rent, utilization) that usually decides whether a decision like theirs works. Same yes/no CTA.' },
  3: { day: 7, brief: 'Value step (50-90 words). Offer something they can use without a call: e.g. to run one anonymized client case or one real decision through Quantis and send back which assumptions control cash and payback. Mention the Free tier (5 Decision Runs/month, no card) only here, factually.' },
  4: { day: 14, brief: 'Polite close-the-loop (30-60 words). Assume timing is wrong, no guilt, no urgency. Leave the door open with one line on what Quantis is for. No further ask beyond "reply any time".' },
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
