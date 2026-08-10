/**
 * Quantis Evidence Service — Privacy Gate (PR E1, master prompt section 21).
 *
 * "Before external retrieval: detect/redact/block where appropriate:
 * passwords; API keys; authorization tokens; secrets; private customer
 * identifiers; email addresses where unnecessary; personal data not
 * required by research; uploaded confidential material; internal company
 * information; payment information."
 *
 * `request-compiler.ts`'s templated queries are already narrow by
 * construction (only `idea`/`location` substitution, per its own tests).
 * This module is the defense-in-depth second check for any future code
 * path that might concatenate freeform user text (uploaded documents,
 * notes, custom questions) into something sent to a retrieval provider --
 * it must be called on any such text before it leaves the process.
 */

export interface PrivacyFinding {
  category:
    | 'API_KEY_OR_TOKEN'
    | 'EMAIL'
    | 'PAYMENT_CARD'
    | 'SSN'
    | 'PASSWORD_FIELD'
    | 'AUTH_HEADER';
  /** The matched substring is intentionally NOT included here to avoid re-leaking it into logs. */
  count: number;
}

export interface RedactionResult {
  redacted: string;
  findings: PrivacyFinding[];
  clean: boolean;
}

interface PatternDef {
  category: PrivacyFinding['category'];
  pattern: RegExp;
  replacement: string;
}

// Order matters: more specific patterns (auth headers, password fields)
// should be tried before generic high-entropy-token matching so their
// replacement text stays informative.
const PATTERNS: PatternDef[] = [
  {
    category: 'AUTH_HEADER',
    pattern: /\b(?:authorization|bearer)\s*:?\s*[a-z0-9._-]{8,}/gi,
    replacement: '[REDACTED_AUTH_HEADER]',
  },
  {
    category: 'PASSWORD_FIELD',
    pattern: /\b(?:password|pwd|passwd|secret)\s*[:=]\s*\S+/gi,
    replacement: '[REDACTED_PASSWORD_FIELD]',
  },
  {
    category: 'API_KEY_OR_TOKEN',
    // Common provider key prefixes (OpenAI/Stripe/AWS/GitHub/Slack/generic sk-/pk_) plus
    // any bare high-entropy 32+ char alphanumeric run, which covers most
    // API keys/tokens regardless of provider-specific prefix conventions.
    pattern: /\b(?:sk-[A-Za-z0-9]{16,}|pk_[a-z]+_[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|[A-Za-z0-9_-]{32,})\b/g,
    replacement: '[REDACTED_API_KEY]',
  },
  {
    category: 'EMAIL',
    pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    replacement: '[REDACTED_EMAIL]',
  },
  {
    category: 'PAYMENT_CARD',
    // 13-19 digit sequences, optionally separated by spaces/dashes every 4 digits.
    pattern: /\b(?:\d[ -]?){13,19}\b/g,
    replacement: '[REDACTED_PAYMENT_CARD]',
  },
  {
    category: 'SSN',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[REDACTED_SSN]',
  },
];

/**
 * Redacts sensitive content from free text before it may be used as (or
 * concatenated into) an outbound research query. Never throws -- always
 * returns a usable, redacted string plus a report of what was found so
 * the caller can decide whether to proceed, log, or block.
 */
export function redactSensitiveContent(input: string): RedactionResult {
  if (!input) {
    return { redacted: input ?? '', findings: [], clean: true };
  }

  let redacted = input;
  const findings: PrivacyFinding[] = [];

  for (const { category, pattern, replacement } of PATTERNS) {
    const matches = redacted.match(pattern);
    if (matches && matches.length > 0) {
      findings.push({ category, count: matches.length });
      redacted = redacted.replace(pattern, replacement);
    }
  }

  return { redacted, findings, clean: findings.length === 0 };
}

export class PrivacyGateViolationError extends Error {
  constructor(public readonly findings: PrivacyFinding[]) {
    super(
      `Privacy gate blocked an outbound research query: found ${findings
        .map((f) => `${f.count}x ${f.category}`)
        .join(', ')}. Redact before sending, or use redactSensitiveContent() to sanitize instead of blocking.`,
    );
    this.name = 'PrivacyGateViolationError';
  }
}

/**
 * Strict gate for call sites that would rather fail loudly than silently
 * send a redacted-but-still-suspicious query. Most call sites should
 * prefer `redactSensitiveContent` (fail open with redaction) since
 * research queries should generally still succeed with sensitive spans
 * removed rather than blocking the whole analysis; use this only where
 * ANY match is unacceptable regardless of redaction (e.g. a raw upload
 * pass-through path that should never reach a provider at all).
 */
export function assertSafeForOutboundQuery(input: string): void {
  const result = redactSensitiveContent(input);
  if (!result.clean) {
    throw new PrivacyGateViolationError(result.findings);
  }
}
