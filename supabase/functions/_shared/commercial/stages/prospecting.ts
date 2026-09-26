/**
 * Commercial Ops workflow -- Prospecting stage (spec section 5).
 *
 * Determines who appears relevant and why, with an explainable fit record.
 * Never sends outreach itself -- suggested_message is a DRAFT the human
 * reviews (spec: "Do not automatically send outreach. Human approval is
 * mandatory").
 */
import { z } from 'npm:zod@3.23.8';
import { runCommercialAgent, type CommercialAgentRunResult } from '../agent-runtime.ts';
import type { CommercialFoundation } from '../contracts.ts';

export const ProspectAssessmentOutput = z.object({
  segment: z.string().min(1),
  observed_signals: z.array(z.string()),
  likely_relevant_problem: z.string().min(1),
  supporting_evidence: z.array(z.string()),
  unknowns: z.array(z.string()),
  suggested_message: z.string().min(1),
  suggested_next_step: z.string().min(1),
});
export type ProspectAssessmentOutput = z.infer<typeof ProspectAssessmentOutput>;

function buildSystemPrompt(foundation: CommercialFoundation): string {
  return [
    `You assess whether a prospect is a plausible fit for ${foundation.product_name}.`,
    'Base likely_relevant_problem and supporting_evidence only on what is actually observable about the prospect, plus the canonical foundation below -- do not invent facts about the prospect\'s business.',
    'suggested_message is a DRAFT for human review, never sent automatically.',
    'Respond with ONLY a single valid JSON object matching the required schema. No markdown, no commentary, no code fences.',
    '',
    '=== CANONICAL FOUNDATION (version ' + foundation.version + ') ===',
    `Target segments: ${foundation.target_segments.join(', ')}`,
    `Excluded segments: ${foundation.excluded_segments.join(', ')}`,
    `Customer problems: ${foundation.customer_problems.join(' | ')}`,
  ].join('\n');
}

export interface AssessProspectArgs {
  foundation: CommercialFoundation;
  companyName: string;
  observedSignals: string[];
  adminUserId?: string | null;
  requestId?: string | null;
}

export async function assessProspect(
  args: AssessProspectArgs,
): Promise<CommercialAgentRunResult<ProspectAssessmentOutput>> {
  const userPrompt = [
    `Company: ${args.companyName}`,
    `Observed signals: ${args.observedSignals.join(' | ') || '(none provided)'}`,
    'Assess fit as a JSON object with exactly these fields: segment, observed_signals (array), likely_relevant_problem, supporting_evidence (array), unknowns (array), suggested_message, suggested_next_step.',
  ].join('\n');

  return runCommercialAgent({
    stage: 'prospecting',
    foundationVersion: args.foundation.version,
    systemPrompt: buildSystemPrompt(args.foundation),
    userPrompt,
    schema: ProspectAssessmentOutput,
    adminUserId: args.adminUserId,
    requestId: args.requestId,
    inputContext: { company_name: args.companyName, observed_signals: args.observedSignals },
  });
}
