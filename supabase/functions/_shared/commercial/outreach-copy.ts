/**
 * Cold outreach copy, "low ask" template (2026-11-03). Pure: no I/O, no LLM,
 * no npm imports, so vitest (src/__tests__) and Deno load the same file.
 *
 * Spec: docs/execution/2026-10-30-cold-outreach-zero-replies-diagnosis.md,
 * section 5 (replacement copy) and F8 (personalize from evidence or not at
 * all). 305 sends of the old copy got 0 human replies. The main cause was the
 * ask: a stranger was asked to "reply with one client decision", which a
 * fractional CFO under client confidentiality cannot say yes to.
 *
 * What changed, and is enforced here as code:
 *   - The ask is a link to the free hiring demo (no sign-up, no client data)
 *     and a soft "worth a look, or not your workflow?". Exactly one link.
 *   - One plain question about their workflow. No product jargon.
 *   - The body is 50-90 words. No em or en dashes. No in-body legal
 *     disclaimer: the footer carries the opt-out line and postal address.
 *   - The model may write only the opening sentence, and only from a
 *     recorded signal. Otherwise the opener is role and firm only.
 *   - The follow-up offers a sample memo and asks for a one-word reply.
 *
 * Every product statement below is a verified capability of the hiring demo
 * (src/pages/HiringDecisionDemo.tsx): cash dip, payback month, and which
 * assumption the decision depends on most. It is a public page: free, no
 * sign-up, no client data. No speed, accuracy or outcome claims.
 */

export const OUTREACH_TEMPLATE = 'low_ask_v1';

export const DEMO_URL = 'https://www.aiwmcquantis.com/demo/hiring-decision';

export const FIRST_TOUCH_MIN_WORDS = 50;
export const FIRST_TOUCH_MAX_WORDS = 90;
export const OPENER_MAX_WORDS = 25;
export const FOLLOWUP_STEP_MAX_WORDS = 60;

export type OutreachAudience = 'advisor' | 'owner';

const ADVISOR = /\b(cfos?|fp&a|fp and a|consult\w*|advis\w*|accountan\w*|accounting|bookkeep\w*|cpas?|controllers?|fractional|finance partners?|financial planners?)\b/i;

/** Advisors get the "when a client asks" question; everyone else the owner version. */
export function audienceFor(segment: string | null | undefined, role: string | null | undefined): OutreachAudience {
  return ADVISOR.test(`${segment ?? ''} ${role ?? ''}`) ? 'advisor' : 'owner';
}

/** utm_campaign value: the campaign name as a slug, or "first_touch". */
export function utmCampaignSlug(campaignName: string | null | undefined): string {
  const slug = (campaignName ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return slug || 'first_touch';
}

export function demoLink(campaignName: string | null | undefined): string {
  return `${DEMO_URL}?utm_source=email&utm_medium=outreach&utm_campaign=${utmCampaignSlug(campaignName)}`;
}

const clean = (s: string | null | undefined) => (s ?? '').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
const URLISH = /https?:\/\/|www\.|\.(com|io|co|net|org)\b/i;

/** Acronyms that lead-data title-casing breaks ("Cfo Forward", "The Cpg Cfo"). */
const FIRM_ACRONYMS = ['CFO', 'CPA', 'CPAs', 'LLC', 'LLP', 'PLLC', 'PC', 'CPG', 'FP&A', 'M&A', 'USA'];

/** Firm name as a person would write it: known acronyms restored, otherwise unchanged. */
export function firmName(company: string | null | undefined): string {
  let c = clean(company);
  for (const a of FIRM_ACRONYMS) {
    const esc = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    c = c.replace(new RegExp(`(^|[\\s(])${esc}(?=$|[\\s,.)®™])`, 'gi'), (_m, pre: string) => `${pre}${a}`);
  }
  return c;
}

/**
 * F8: when the model found nothing specific to say, the opener names only the
 * firm the CRM recorded. The job title is never used: CRM titles read as data
 * ("A question for you as Chief financial officer at Cu Books", 2026-11-03).
 * Odd firm values fall back to less.
 */
export function neutralOpener(_role: string | null | undefined, company: string | null | undefined): string {
  const c = firmName(company);
  const companyOk = c.length > 0 && c.length <= 60 && !/[|;•@]/.test(c) && !URLISH.test(c);
  if (companyOk) return `A question for you at ${c}.`;
  return 'Quick one.';
}

export function firstTouchSubject(audience: OutreachAudience): string {
  return audience === 'advisor' ? 'downside case for a client hire' : 'downside case for your next hire';
}

export function renderFirstTouchBody(args: { audience: OutreachAudience; opener: string; link: string }): string {
  const question = args.audience === 'advisor'
    ? 'When a client asks "can we afford this hire?", how long does the downside case take you today?'
    : 'When you weigh a new hire, how long does working out the downside case take you today?';
  const data = args.audience === 'advisor' ? 'client' : 'company';
  return [
    `${args.opener.trim()} ${question}`,
    `I built a free demo that shows the cash dip, the payback month, and which assumption a hire depends on most. No sign-up and no ${data} data needed: ${args.link}`,
    'Worth a look, or not your workflow?',
  ].join('\n\n');
}

/** Step 2, the last touch: something useful, and a one-word reply. No link. */
export function renderFollowupBody(): string {
  return [
    "One more note, then I'll stop. If it's useful, I can send you a finished sample memo for a hiring decision (a made-up firm, not a real client), so you can see the output without trying the tool.",
    'Want it? A one-word reply is enough.',
  ].join('\n\n');
}

/**
 * Phrases that may not appear in cold outreach. Each one is in the 0/305
 * evidence (docs/execution/2026-10-30-cold-outreach-zero-replies-diagnosis.md)
 * or in the drafts of 2026-11-03.
 */
export const OUTREACH_BLOCKED: Array<{ re: RegExp; label: string }> = [
  // Product jargon a stranger does not use
  { re: /\bdeterministic\b/i, label: 'jargon: "deterministic"' },
  { re: /\bnarrat(e|es|ed|ing|ion)\b/i, label: 'jargon: "narration"' },
  { re: /\bpre-?mortems?\b/i, label: 'jargon: "pre-mortem"' },
  { re: /\bbaselines?\b/i, label: 'jargon: "baseline"' },
  { re: /\bassumptions?\b[^.?!\n]{0,24}\bexplicit\b|\bexplicit\b[^.?!\n]{0,24}\bassumptions?\b/i, label: 'jargon: "explicit assumptions"' },
  { re: /\bdecision (runs?|packets?)\b/i, label: 'jargon: "Decision Run"' },
  { re: /\badvisor[- ]grade\b/i, label: 'jargon: "advisor-grade"' },
  // The heavy ask a stranger cannot say yes to (diagnosis reason 1)
  { re: /\breply with (one|a|your)\b[^.?!\n]{0,40}\b(decision|case)\b/i, label: 'heavy ask: asks for a client decision' },
  { re: /\banonymi[sz]ed\b/i, label: 'heavy ask: anonymized client case' },
  { re: /\bwithin 24 hours\b/i, label: 'heavy ask: "within 24 hours" turnaround' },
  { re: /\bsend (me|us)\b/i, label: 'heavy ask: asks them to send something' },
  // Generic openers
  { re: /\bskip the pitch\b/i, label: 'generic opener: "skip the pitch"' },
  { re: /\bhope (this|my) (email |note |message )?finds you\b|\bhope you('re| are) (well|doing well)\b/i, label: 'generic opener: "hope this finds you"' },
  { re: /\bI'?ll keep (this|it) (short|brief)\b|\bI'?ll be brief\b/i, label: 'generic opener: "I\'ll keep this short"' },
  { re: /\bcame across your\b/i, label: 'generic opener: "came across your"' },
  { re: /\bI know you'?re busy\b/i, label: 'generic opener: "I know you\'re busy"' },
  // Meeting asks
  { re: /\bwalk-?throughs?\b|\bcalendly\b|\bbook a (call|time|slot|meeting)\b|\bhop on a call\b|\b\d+[- ]minute (call|chat|meeting)\b/i, label: 'meeting ask' },
  // Legal text belongs in the footer, not the body
  { re: /\bnot (financial|legal|tax|investment|accounting) advice\b/i, label: 'legal disclaimer in body' },
  { re: /\bdisclaimer\b|\bfor informational purposes\b|\bno warranty\b|\bterms of (use|service)\b/i, label: 'legal disclaimer in body' },
  { re: /\bunsubscribe\b|\bAIWMC LLC\b/i, label: 'footer text in body' },
];

const DASH = /[–—]|\s--\s/;
const URL_RE = /https?:\/\/[^\s)>\]]+|\bwww\.[^\s)>\]]+/gi;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function blockedIn(text: string): string[] {
  const out: string[] = [];
  if (DASH.test(text)) out.push('em or en dash');
  for (const { re, label } of OUTREACH_BLOCKED) if (re.test(text)) out.push(label);
  return out;
}

/** The model-written opener: one short, plain sentence. No link, no question. */
export function lintOpener(opener: string): string[] {
  const v = blockedIn(opener);
  if (/\n/.test(opener.trim())) v.push('opener must be one line');
  if (URLISH.test(opener)) v.push('link in opener');
  if (/\?/.test(opener)) v.push('opener must not ask a question');
  const n = countWords(opener);
  if (n > OPENER_MAX_WORDS) v.push(`opener too long: ${n} words (max ${OPENER_MAX_WORDS})`);
  return v;
}

/** A finished first-touch body (before greeting, signature and footer). */
export function lintFirstTouch(body: string, link: string): string[] {
  const v = blockedIn(body);
  const urls = body.match(URL_RE) ?? [];
  const demo = urls.filter((u) => u === link).length;
  if (demo !== 1) v.push(`demo link must appear exactly once (found ${demo})`);
  if (urls.length !== demo) v.push('a link other than the demo link');
  if (!link.startsWith(`${DEMO_URL}?utm_source=email&utm_medium=outreach&utm_campaign=`)) v.push('demo link is missing its UTM tags');
  if (!/\?/.test(body.replace(URL_RE, ''))) v.push('no question about their workflow');
  const n = countWords(body);
  if (n < FIRST_TOUCH_MIN_WORDS || n > FIRST_TOUCH_MAX_WORDS) v.push(`length: ${n} words (must be ${FIRST_TOUCH_MIN_WORDS}-${FIRST_TOUCH_MAX_WORDS})`);
  return v;
}

/** A finished follow-up body: no link, short, ends on a question. */
export function lintFollowup(body: string): string[] {
  const v = blockedIn(body);
  if ((body.match(URL_RE) ?? []).length > 0) v.push('link in follow-up');
  if (!/\?/.test(body)) v.push('no question');
  const n = countWords(body);
  if (n > FOLLOWUP_STEP_MAX_WORDS) v.push(`length: ${n} words (max ${FOLLOWUP_STEP_MAX_WORDS})`);
  return v;
}
