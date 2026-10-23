/**
 * Commercial Ops workflow -- First-touch (cold outreach) stage.
 *
 * The "Copywriter" role from open-source AI-SDR designs (avcap/ai-sdr's
 * Prospector -> Enrichment -> Copywriter crew; SalesGPT's Introduction ->
 * Qualification -> Value -> Close stages) compressed into ONE short email,
 * run through the shared runtime -- not a second agent framework.
 *
 * What is enforced as code, not prompt:
 *   - no observed signals -> no LLM call at all (insufficient_evidence)
 *   - every personalization signal the model says it used must be one of
 *     the signals the human actually recorded (no invented research)
 *   - scanOutbound(): prohibited claims, fake urgency, invented social
 *     proof, prices not in the foundation, and a word ceiling
 *   - no links in a first touch (deliverability + trust)
 *   - signature and opt-out line are appended by code, never generated
 *
 * Output is always a DRAFT; the human approval firewall
 * (approve_commercial_followup) is the only path to READY TO SEND.
 */
import { z } from 'npm:zod@3.23.8';
import type { R3Reconciler } from '../../r3-validator.ts';
import { runCommercialAgent, type CommercialAgentRunResult } from '../agent-runtime.ts';
import { foundationGroundingBlock, type CommercialFoundation } from '../contracts.ts';
import { scanOutbound } from '../claim-guard.ts';

export const FIRST_TOUCH_MAX_WORDS = 120;

export const FirstTouchOutput = z.object({
  subject: z.string().min(2).max(70),
  body: z.string().min(20),
  signals_used: z.array(z.string()).min(1),
  segment_angle: z.string().min(1),
  confidence: z.enum(['high', 'medium', 'low']),
  missing_evidence: z.array(z.string()),
});
export type FirstTouchOutput = z.infer<typeof FirstTouchOutput>;

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** A claimed signal counts as grounded if it overlaps a recorded one. */
export function isSignalGrounded(claimed: string, recorded: string[]): boolean {
  const c = norm(claimed);
  if (!c) return false;
  return recorded.some((r) => {
    const n = norm(r);
    return n.length > 0 && (n.includes(c) || c.includes(n));
  });
}

export function reconcileFirstTouch(
  foundation: CommercialFoundation,
  recordedSignals: string[],
): R3Reconciler<FirstTouchOutput> {
  return (data) => {
    for (const s of data.signals_used) {
      if (!isSignalGrounded(s, recordedSignals)) return `signal not in recorded evidence: "${s.slice(0, 80)}"`;
    }
    if (/https?:\/\/|www\./i.test(data.body)) return 'first touch must not contain links';
    const scan = scanOutbound(`${data.subject}\n${data.body}`, foundation, { maxWords: FIRST_TOUCH_MAX_WORDS });
    if (!scan.ok) return `claim guard: ${scan.violations.join('; ')}`;
    return null;
  };
}

function buildSystemPrompt(foundation: CommercialFoundation): string {
  return [
    'You write ONE first-touch cold email from a founder to a single prospect. The founder reviews it and sends it by hand.',
    '',
    'STRUCTURE (plain text, 60-110 words, no greeting fluff, no bullet points):',
    '1. Opener: one sentence that references a SPECIFIC recorded signal about this prospect (from the list you are given). Never invent research, posts, news, clients, or numbers about them.',
    '2. Problem: one or two sentences naming the ONE customer problem from the foundation most likely true for their segment, phrased as an observation or question, not an accusation.',
    '3. What Quantis does: one sentence using ONLY approved claims. Describe the mechanism (assumptions made explicit, deterministic cash/break-even/payback math, downside scenarios), not superlatives.',
    '4. CTA: one low-friction, interest-based question they can answer yes/no. For consultants/fractional CFOs/advisors prefer: offering to run one anonymized client case with them. For founders prefer: testing one real decision they are about to make. No calendar links, no pricing, no trial pitch in a first touch.',
    '',
    'RULES:',
    '- Write like a busy operator writing to a peer: short sentences, concrete, no hype words (revolutionary, game-changing, cutting-edge, unlock, supercharge, AI-powered).',
    '- Do not mention competitors. Do not claim customers, results, adoption, testimonials, or case studies -- Quantis has none to cite.',
    '- Do not include links, signatures, or an unsubscribe line (code appends those).',
    '- subject: 2-6 words, specific to them, no clickbait, no ALL CAPS, no "quick question".',
    '- signals_used: copy the exact recorded signal text(s) you relied on.',
    '- If the signals are too thin to personalize honestly, still write the best honest version, set confidence "low" and list what is missing in missing_evidence.',
    '',
    'Respond with ONLY a single valid JSON object with exactly these fields: subject, body, signals_used (array), segment_angle, confidence ("high"|"medium"|"low"), missing_evidence (array). No markdown, no code fences.',
    '',
    foundationGroundingBlock(foundation),
  ].join('\n');
}

export interface DraftFirstTouchArgs {
  foundation: CommercialFoundation;
  companyName: string;
  contactName: string | null;
  contactRole: string | null;
  segment: string | null;
  observedSignals: string[];
  adminUserId?: string | null;
  requestId?: string | null;
  prospectId?: string | null;
}

export async function draftFirstTouch(
  args: DraftFirstTouchArgs,
): Promise<CommercialAgentRunResult<FirstTouchOutput>> {
  const userPrompt = [
    `Prospect company: ${args.companyName}`,
    `Contact: ${args.contactName ?? '(unknown name)'}${args.contactRole ? `, ${args.contactRole}` : ''}`,
    `Segment: ${args.segment ?? '(unspecified -- infer only from the signals)'}`,
    'Recorded signals (the ONLY facts you know about them):',
    ...args.observedSignals.map((s, i) => `  ${i + 1}. ${s}`),
  ].join('\n');

  return runCommercialAgent({
    stage: 'first_touch',
    foundationVersion: args.foundation.version,
    systemPrompt: buildSystemPrompt(args.foundation),
    userPrompt,
    schema: FirstTouchOutput,
    reconcile: reconcileFirstTouch(args.foundation, args.observedSignals),
    adminUserId: args.adminUserId,
    requestId: args.requestId,
    inputContext: {
      prospect_id: args.prospectId ?? null,
      company_name: args.companyName,
      segment: args.segment,
      observed_signals: args.observedSignals,
    },
  });
}

/**
 * The model sometimes signs off anyway ("Bogdan Jeltov\nAIWMC Quantis"), and
 * the appended signature then printed the name twice. Drop trailing lines
 * that only repeat a word of the sender identity or a closing ("Best,").
 */
export function stripModelSignOff(text: string, senderIdentity: string): string {
  const words = new Set(senderIdentity.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 1));
  const closing = /^(best|thanks|thank you|regards|best regards|kind regards|cheers|sincerely)[,.!]?$/i;
  const isSignOff = (line: string) => {
    const l = line.trim();
    if (!l) return true;
    if (closing.test(l)) return true;
    const toks = l.toLowerCase().split(/[^a-z]+/).filter(Boolean);
    return toks.length > 0 && toks.length <= 6 && toks.every((t) => words.has(t));
  };
  const lines = text.split('\n');
  while (lines.length > 1 && isSignOff(lines[lines.length - 1])) lines.pop();
  return lines.join('\n').trimEnd();
}

/** Deterministic footer: sender identity + a plain opt-out line. */
export function composeOutboundEmail(body: string, contactName: string | null, senderIdentity: string | null): string {
  const first = (contactName ?? '').trim().split(/\s+/)[0];
  const greeting = first ? `Hi ${first},\n\n` : '';
  const signature = senderIdentity?.trim() ? `\n\n${senderIdentity.trim()}` : '';
  let text = body.trim();
  if (first) {
    // The model sometimes opens with the name too ("Carlos — your work…"),
    // which reads as "Hi Carlos, Carlos — …" after the greeting above.
    const esc = first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const stripped = text.replace(new RegExp(`^(?:(?:hi|hello|hey|dear)\\s+)?${esc}\\s*[—–,:!-]\\s*`, 'i'), '');
    if (stripped !== text && stripped.length > 0) text = stripped.charAt(0).toUpperCase() + stripped.slice(1);
  }
  if (signature) text = stripModelSignOff(text, senderIdentity!);
  return `${greeting}${text}${signature}\n\nIf this isn't relevant, just reply "no" and I won't follow up.`;
}
