/**
 * LinkedIn Growth Agent -- draft lint (pure: no Deno, Node or network APIs).
 *
 * One file, two callers:
 *   - supabase/functions/li-growth-draft (server gate before a draft can be
 *     approved, plus the one-retry loop after generation)
 *   - src/lib/li-growth/lint.ts re-exports it for the admin page (live
 *     badges while the founder edits)
 * so the browser and the server can never disagree about what passes.
 *
 * Rules come from the LinkedIn Growth Agent PRD (2026-11-03), sections 3.6
 * and 3.7: no em/en dashes, no AI tells, no pitch in comments, 2-4 sentences,
 * length limits, and every number must come from the prospect's own pasted
 * post or from a verified fact-bank entry (same idea as the post-image truth
 * gate in scripts/post-images/gate.mjs).
 */

export const LI_DRAFT_ACTIONS = ['comment', 'dm_first', 'dm_followup'] as const;
export type LiDraftAction = typeof LI_DRAFT_ACTIONS[number];

export interface LengthRule {
  minChars: number;
  maxChars: number;
  minSentences: number;
  maxSentences: number;
  maxQuestions: number;
}

export const LENGTH_RULES: Record<LiDraftAction, LengthRule> = {
  comment: { minChars: 150, maxChars: 500, minSentences: 2, maxSentences: 4, maxQuestions: 1 },
  dm_first: { minChars: 0, maxChars: 600, minSentences: 2, maxSentences: 4, maxQuestions: 2 },
  dm_followup: { minChars: 0, maxChars: 600, minSentences: 2, maxSentences: 4, maxQuestions: 2 },
};

/** Comment openers that read as low-effort or automated (PRD 3.6 rule 5). */
export const BANNED_OPENERS = [
  'great post',
  'love this',
  'so true',
  "couldn't agree more",
  'could not agree more',
  'this resonates',
  'thanks for sharing',
  'spot on',
  '100%',
];

/**
 * The doctrine's HUMAN WRITING stop-list (marketing-doctrine.ts) plus common
 * AI tells. Matched as whole words/phrases, case-insensitive, anywhere.
 */
export const BANNED_PHRASES = [
  // fillers
  "let's be honest", 'sound familiar', 'imagine', "here's the thing", 'here is the thing',
  // intensifiers
  'actually', 'truly', 'literally', 'incredibly', 'genuinely',
  // buzzwords
  'game-changer', 'game changer', 'game-changing', 'unlock', 'revolutionary', 'seamless', 'leverage',
  'next level', 'next-level', 'powerful', 'cutting-edge', 'cutting edge', "in today's world",
  "in today's fast-paced",
  // corporate speak
  'utilize', 'in order to', 'it is important to note', "it's important to note",
  // moral last lines
  'that changes everything',
  // common AI tells
  'delve', 'deep dive', 'in the realm of', 'testament to', 'tapestry', 'elevate', 'empower',
  'synergy', 'i hope this', 'great question', 'at the end of the day', 'worth noting',
  'resonates', 'thought-provoking', 'insightful',
];

/** Contrast frames and self-answered questions (doctrine HUMAN WRITING 1-2). */
const PATTERN_TELLS: Array<[RegExp, string]> = [
  [/\bit'?s not (just )?(about )?[^.?!]{1,60}[,;.] it'?s\b/i, 'contrast frame ("it\'s not X, it\'s Y")'],
  [/\b(this|it) (isn'?t|is not) (just )?about\b/i, 'contrast frame ("this isn\'t about X")'],
  [/\bthe (result|answer|catch|kicker|truth|twist)\s*\?/i, 'self-answered question ("The result?")'],
  [/\bwhy\?\s*because\b/i, 'self-answered question ("Why? Because")'],
];

/** Selling inside a comment (PRD 3.6 rule 3). DMs may say "I'm building". */
const PITCH_PATTERNS: Array<[RegExp, string]> = [
  [/\bquantis\b/i, 'product name'],
  [/\baiwmc\b/i, 'company name'],
  [/\b(we|i)('ve| have)? built\b/i, '"we built"'],
  [/\b(i'?m|we'?re|i am|we are) building\b/i, '"I\'m building"'],
  [/\b(our|my) (tool|product|platform|app|software|startup|solution|calculator)\b/i, '"our product"'],
  [/\bcheck (it |this )?out\b/i, '"check out"'],
  [/\b(dm|message|ping) me\b/i, '"DM me"'],
  [/\bbook (a )?(call|demo|meeting)\b/i, '"book a call"'],
  [/\b(sign up|free trial|link in)\b/i, 'call to action'],
];

const TRACTION_PATTERNS: RegExp[] = [
  /\b(our|my) (clients|customers|users)\b/i,
  /\b(clients|customers|users) (love|trust|rely on)\b/i,
  /\btrusted by\b/i,
  /\b\d[\d,]*\+?\s*(clients|customers|users|companies|businesses|teams) (use|trust|rely)/i,
];

const PRICE_PATTERN = /\$\s?\d[\d,.]*\s*(\/\s*(mo|month|yr|year)\b|per (month|year)\b|a month\b|monthly\b)/i;
const LINK_PATTERN = /https?:\/\/|\bwww\.|\b[a-z0-9-]+\.(com|io|ai|co|net|org|store|app)\b/i;
const TAG_PATTERN = /(^|\s)@[A-Za-z]/;
const PLACEHOLDER_PATTERN = /\{[^}]{1,40}\}|\[[^\]]{1,40}\]|<[a-z_ ]{2,30}>/i;
const DASH_CHARS = /[‒–—―]/;
const SPACED_HYPHEN = /\s--?\s|^--?\s|\s--?$/;
const EMOJI_START = /^\s*\p{Extended_Pictographic}/u;

export type LiLintCode =
  | 'empty'
  | 'dash'
  | 'banned_phrase'
  | 'opener'
  | 'exclamation'
  | 'emoji_start'
  | 'too_short'
  | 'too_long'
  | 'sentences'
  | 'questions'
  | 'pitch'
  | 'link'
  | 'tag'
  | 'price'
  | 'traction_claim'
  | 'placeholder'
  | 'no_source'
  | 'no_overlap'
  | 'quotes_source'
  | 'unsourced_number';

export interface LiLintIssue {
  code: LiLintCode;
  message: string;
}

export interface LiLintInput {
  text: string;
  action: LiDraftAction;
  /** The prospect's own post/comment text, pasted by the founder. */
  sourceText?: string | null;
  /** Number tokens from active, verified fact-bank rows (e.g. "26", "50%"). */
  factNumbers?: readonly string[];
}

export interface LiLintReport {
  ok: boolean;
  action: LiDraftAction;
  chars: number;
  sentences: number;
  questions: number;
  issues: LiLintIssue[];
  /** Badge view for the UI: true = this group of checks passed. */
  checks: { dash: boolean; banned: boolean; length: boolean; numbers_sourced: boolean; pitch: boolean };
  unsourced_numbers: string[];
}

function normalizeQuotes(s: string): string {
  return s.replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"');
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function phraseRe(phrase: string): RegExp {
  const startsWord = /^\w/.test(phrase);
  const endsWord = /\w$/.test(phrase);
  return new RegExp(`${startsWord ? '\\b' : ''}${escapeRe(phrase)}${endsWord ? '\\b' : ''}`, 'i');
}

const ABBREVIATIONS = /\b(e\.g|i\.e|vs|etc|approx|mr|mrs|ms|dr|st|no)\./gi;

export function countSentences(text: string): number {
  const cleaned = text.replace(ABBREVIATIONS, '$1');
  return cleaned
    .split(/[.?!]+(?:\s+|$)/)
    .map((s) => s.trim())
    .filter((s) => /\w/.test(s)).length;
}

const NUMBER_TOKEN = /(?<![\w.])\$?\d[\d,]*(?:\.\d+)?(?:\s?[kK]\b|M\b)?%?/g;

/** Numeric values a reader would take as a claim. "$70k" -> 70000, "25%" -> 25. */
export function extractNumbers(text: string): Array<{ token: string; value: number }> {
  const out: Array<{ token: string; value: number }> = [];
  for (const m of String(text ?? '').matchAll(NUMBER_TOKEN)) {
    const token = m[0].trim().replace(/,+$/, '');
    let raw = token.replace(/[$,%\s]/g, '');
    let mult = 1;
    if (/[kK]$/.test(raw)) { mult = 1000; raw = raw.slice(0, -1); }
    else if (/M$/.test(raw)) { mult = 1_000_000; raw = raw.slice(0, -1); }
    const value = parseFloat(raw) * mult;
    if (Number.isFinite(value)) out.push({ token, value });
  }
  return out;
}

function sameNumber(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

const STOPWORDS = new Set([
  'about', 'after', 'again', 'also', 'because', 'been', 'before', 'being', 'both', 'could', 'does',
  'doing', 'each', 'even', 'from', 'have', 'here', 'into', 'just', 'like', 'make', 'more', 'most',
  'much', 'only', 'other', 'over', 'same', 'should', 'some', 'such', 'than', 'that', 'their', 'them',
  'then', 'there', 'these', 'they', 'this', 'those', 'very', 'want', 'were', 'what', 'when', 'where',
  'which', 'while', 'will', 'with', 'would', 'your', 'yours', 'you', 'post', 'really', 'think',
  'thing', 'things', 'still', 'every', 'many', 'well', 'good', 'great',
]);

function stem(w: string): string {
  for (const suf of ['ing', 'ed', 'es', 's']) {
    if (w.endsWith(suf) && w.length - suf.length >= 4) return w.slice(0, -suf.length);
  }
  return w;
}

function words(text: string): string[] {
  return normalizeQuotes(text).toLowerCase().match(/[a-z][a-z'&-]*/g) ?? [];
}

function contentStems(text: string): Set<string> {
  return new Set(words(text).filter((w) => w.length >= 4 && !STOPWORDS.has(w)).map(stem));
}

const QUOTE_SHINGLE = 8;

function sharedShingle(text: string, source: string): boolean {
  const a = words(text);
  const b = words(source);
  if (a.length < QUOTE_SHINGLE || b.length < QUOTE_SHINGLE) return false;
  const set = new Set<string>();
  for (let i = 0; i + QUOTE_SHINGLE <= b.length; i++) set.add(b.slice(i, i + QUOTE_SHINGLE).join(' '));
  for (let i = 0; i + QUOTE_SHINGLE <= a.length; i++) {
    if (set.has(a.slice(i, i + QUOTE_SHINGLE).join(' '))) return true;
  }
  return false;
}

export function lintDraft(input: LiLintInput): LiLintReport {
  const action = input.action;
  const rule = LENGTH_RULES[action];
  const text = normalizeQuotes(String(input.text ?? '')).trim();
  const source = normalizeQuotes(String(input.sourceText ?? '')).trim();
  const issues: LiLintIssue[] = [];
  const add = (code: LiLintCode, message: string) => issues.push({ code, message });

  const chars = text.length;
  const sentences = countSentences(text);
  const questions = (text.match(/\?/g) ?? []).length;

  if (!text) add('empty', 'Draft is empty.');

  // Dashes (PRD 3.6 rule 5).
  if (DASH_CHARS.test(text)) add('dash', 'Contains an em or en dash. Use a comma, period or "and".');
  if (SPACED_HYPHEN.test(text)) add('dash', 'Contains a spaced hyphen used as a dash.');

  // AI tells.
  const lower = text.toLowerCase();
  for (const p of BANNED_PHRASES) {
    if (phraseRe(p).test(text)) add('banned_phrase', `AI tell: "${p}".`);
  }
  for (const [re, label] of PATTERN_TELLS) {
    if (re.test(text)) add('banned_phrase', `AI tell: ${label}.`);
  }
  const opening = lower.replace(/^[^a-z0-9]+/, '');
  for (const o of BANNED_OPENERS) {
    if (opening.startsWith(o)) add('opener', `Opens with "${o}".`);
  }
  if (text.includes('!')) add('exclamation', 'No exclamation marks.');
  if (EMOJI_START.test(text)) add('emoji_start', 'Starts with an emoji.');
  if (PLACEHOLDER_PATTERN.test(text)) add('placeholder', 'Unfilled template placeholder.');

  // Length and shape.
  if (text && chars < rule.minChars) add('too_short', `${chars} characters; minimum is ${rule.minChars}.`);
  if (chars > rule.maxChars) add('too_long', `${chars} characters; maximum is ${rule.maxChars}.`);
  if (text && (sentences < rule.minSentences || sentences > rule.maxSentences)) {
    add('sentences', `${sentences} sentences; use ${rule.minSentences} to ${rule.maxSentences}.`);
  }
  if (questions > rule.maxQuestions) add('questions', `${questions} questions; at most ${rule.maxQuestions}.`);

  // Selling and claims.
  if (LINK_PATTERN.test(text)) add('link', 'No links in a comment or DM.');
  if (PRICE_PATTERN.test(text)) add('price', 'Never state a price.');
  for (const re of TRACTION_PATTERNS) {
    if (re.test(text)) { add('traction_claim', 'Claims clients, users or traction Quantis does not have.'); break; }
  }
  if (action === 'comment') {
    for (const [re, label] of PITCH_PATTERNS) {
      if (re.test(text)) add('pitch', `Pitch in a comment: ${label}.`);
    }
    if (TAG_PATTERN.test(text)) add('tag', 'Do not tag people in a comment.');
    if (!source) {
      add('no_source', 'A comment needs the post text pasted in first.');
    } else {
      const src = contentStems(source);
      const overlap = [...contentStems(text)].some((w) => src.has(w));
      if (!overlap) add('no_overlap', 'Does not refer to anything in their post.');
    }
  }
  if (source && sharedShingle(text, source)) add('quotes_source', 'Quotes their post at length; paraphrase instead.');

  // Truth gate: every number must be in their post or a verified fact.
  const allowed = [
    ...extractNumbers(source).map((n) => n.value),
    ...(input.factNumbers ?? []).flatMap((t) => extractNumbers(t).map((n) => n.value)),
  ];
  const unsourced: string[] = [];
  for (const n of extractNumbers(text)) {
    const ok = allowed.some((a) => sameNumber(a, n.value) || sameNumber(a, n.value * 1000) || sameNumber(a * 1000, n.value));
    if (!ok && !unsourced.includes(n.token)) unsourced.push(n.token);
  }
  if (unsourced.length) {
    add('unsourced_number', `Number not in their post or the fact bank: ${unsourced.join(', ')}.`);
  }

  const has = (...codes: LiLintCode[]) => issues.some((i) => codes.includes(i.code));
  return {
    ok: issues.length === 0,
    action,
    chars,
    sentences,
    questions,
    issues,
    checks: {
      dash: !has('dash'),
      banned: !has('banned_phrase', 'opener', 'exclamation', 'emoji_start', 'placeholder'),
      length: !has('empty', 'too_short', 'too_long', 'sentences', 'questions'),
      numbers_sourced: !has('unsourced_number'),
      pitch: !has('pitch', 'link', 'tag', 'price', 'traction_claim'),
    },
    unsourced_numbers: unsourced,
  };
}
