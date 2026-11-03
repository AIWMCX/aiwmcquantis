/**
 * Commercial Ops workflow -- First-touch (cold outreach) stage.
 *
 * Since 2026-11-03 (low_ask_v1, docs/execution/2026-10-30-cold-outreach-zero-
 * replies-diagnosis.md section 5): the email body is a fixed, founder-approved
 * template (outreach-copy.ts). The model writes ONE opening sentence, and only
 * when a recorded signal supports it; everything else is code.
 *
 * What is enforced as code, not prompt:
 *   - no observed signals -> no LLM call at all (insufficient_evidence)
 *   - every personalization signal the model says it used must be one of
 *     the signals the human actually recorded (no invented research)
 *   - confidence "low" or an empty opener -> the neutral opener (role and
 *     firm only), never an invented one (diagnosis F8)
 *   - lintOpener()/lintFirstTouch(): blocked jargon and heavy asks, no em
 *     dashes, exactly one link (the hiring demo with UTM tags), 50-90 words
 *   - scanOutbound(): prohibited claims, fake urgency, invented social
 *     proof, prices not in the foundation
 *   - signature and opt-out line are appended by code, never generated;
 *     the sender adds the postal address
 *
 * Output is always a DRAFT; the human approval firewall
 * (approve_commercial_followup) is the only path to READY TO SEND.
 */
import { z } from 'npm:zod@3.23.8';
import type { R3Reconciler } from '../../r3-validator.ts';
import { runCommercialAgent, type CommercialAgentRunResult } from '../agent-runtime.ts';
import { foundationGroundingBlock, type CommercialFoundation } from '../contracts.ts';
import { scanOutbound } from '../claim-guard.ts';
import {
  firstTouchSubject,
  lintFirstTouch,
  lintOpener,
  neutralOpener,
  OPENER_MAX_WORDS,
  renderFirstTouchBody,
  type OutreachAudience,
} from '../outreach-copy.ts';

export const FirstTouchOutput = z.object({
  opener: z.string(),
  signals_used: z.array(z.string()),
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

/** The model's opener is used only when it is not low-confidence and not empty. */
export function usesPersonalOpener(data: Pick<FirstTouchOutput, 'opener' | 'confidence'>): boolean {
  return data.confidence !== 'low' && data.opener.trim().length > 0;
}

export interface FirstTouchCopyArgs {
  audience: OutreachAudience;
  link: string;
  contactRole: string | null;
  companyName: string;
}

/** The finished subject + body for one prospect (before greeting and footer). */
export function composeFirstTouch(
  data: Pick<FirstTouchOutput, 'opener' | 'confidence'>,
  args: FirstTouchCopyArgs,
): { subject: string; body: string; personalized: boolean } {
  const personalized = usesPersonalOpener(data);
  const opener = personalized ? data.opener.trim() : neutralOpener(args.contactRole, args.companyName);
  return {
    subject: firstTouchSubject(args.audience),
    body: renderFirstTouchBody({ audience: args.audience, opener, link: args.link }),
    personalized,
  };
}

export function reconcileFirstTouch(
  foundation: CommercialFoundation,
  recordedSignals: string[],
  copy: FirstTouchCopyArgs,
): R3Reconciler<FirstTouchOutput> {
  return (data) => {
    for (const s of data.signals_used) {
      if (!isSignalGrounded(s, recordedSignals)) return `signal not in recorded evidence: "${s.slice(0, 80)}"`;
    }
    if (!usesPersonalOpener(data)) return null; // code uses the neutral opener
    if (data.signals_used.length === 0) return 'a personalized opener must name the recorded signal it uses (signals_used)';
    const opener = lintOpener(data.opener);
    if (opener.length) return `opener: ${opener.join('; ')}`;
    const { subject, body } = composeFirstTouch(data, copy);
    const lint = lintFirstTouch(body, copy.link);
    if (lint.length) return `first touch: ${lint.join('; ')}`;
    const scan = scanOutbound(`${subject}\n${body}`, foundation);
    if (!scan.ok) return `claim guard: ${scan.violations.join('; ')}`;
    return null;
  };
}

function buildSystemPrompt(foundation: CommercialFoundation, copy: FirstTouchCopyArgs): string {
  const fixed = renderFirstTouchBody({ audience: copy.audience, opener: '<YOUR SENTENCE>', link: copy.link });
  return [
    'You write the FIRST SENTENCE of a short cold email from a founder to one prospect. Code writes the rest; the founder reviews every email before it is sent.',
    '',
    'The email that follows your sentence is fixed:',
    '---',
    fixed,
    '---',
    '',
    'YOUR SENTENCE:',
    `- One plain sentence, at most ${OPENER_MAX_WORDS} words, that refers to ONE specific recorded signal about this prospect (from the list you are given), as a simple observation. It must read naturally before the question that follows.`,
    '- Never invent research, posts, news, clients, numbers or events. Do not flatter. Do not pitch or describe the product. No question, no link, no em dashes or en dashes.',
    '- Plain words only. Never use: deterministic, narration, pre-mortem, baseline, explicit assumptions, Decision Run, advisor-grade.',
    '- No greeting ("Hi ..."), no "hope this finds you", no "I\'ll skip the pitch", no "I came across your profile".',
    '- If the only facts are a job title or a company name, or the signals are too thin to say something specific and true, return opener "" and confidence "low". Code then uses a neutral opener built from the role and firm. When in doubt, this is the right answer.',
    '- signals_used: copy the exact recorded signal text you relied on ([] when opener is "").',
    '',
    'Respond with ONLY a single valid JSON object with exactly these fields: opener, signals_used (array), segment_angle, confidence ("high"|"medium"|"low"), missing_evidence (array). No markdown, no code fences.',
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
  audience: OutreachAudience;
  link: string;
  adminUserId?: string | null;
  requestId?: string | null;
  prospectId?: string | null;
}

export async function draftFirstTouch(
  args: DraftFirstTouchArgs,
): Promise<CommercialAgentRunResult<FirstTouchOutput>> {
  const copy: FirstTouchCopyArgs = { audience: args.audience, link: args.link, contactRole: args.contactRole, companyName: args.companyName };
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
    systemPrompt: buildSystemPrompt(args.foundation, copy),
    userPrompt,
    schema: FirstTouchOutput,
    reconcile: reconcileFirstTouch(args.foundation, args.observedSignals, copy),
    adminUserId: args.adminUserId,
    requestId: args.requestId,
    inputContext: {
      prospect_id: args.prospectId ?? null,
      company_name: args.companyName,
      segment: args.segment,
      observed_signals: args.observedSignals,
      audience: args.audience,
      link: args.link,
    },
  });
}

/**
 * The model sometimes signs off anyway ("Bogdan Jeltov\nAIWMC Quantis"), and
 * the appended signature then printed the name twice. Drop trailing lines
 * that only repeat a word of the sender identity or a closing ("Best,").
 */
export function stripModelSignOff(text: string, senderIdentity: string): string {
  // Brand/title words count too: with a name-only identity ("Bogdan Jeltov")
  // the model's "AIWMC Quantis" line stopped the strip and the name doubled.
  const words = new Set([...senderIdentity.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 1), 'aiwmc', 'quantis', 'founder', 'llc']);
  const closing = /^(best|thanks|thank you|regards|best regards|kind regards|cheers|sincerely)[,.!]?$/i;
  const isSignOff = (line: string) => {
    const l = line.trim();
    if (!l) return true;
    if (closing.test(l)) return true;
    // The model sometimes copies the whole footer (opt-out line, postal
    // line), which code appends anyway, so it printed twice.
    if (/if this isn.t relevant|reply ["“]?no["”]?|unsubscribe|won.t (follow up|contact you)/i.test(l)) return true;
    if (/^aiwmc llc\b/i.test(l)) return true;
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
