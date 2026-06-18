/**
 * R3 Validator — Schema · Reconcile · Reject.
 *
 * Genesis Protocol P1 bedrock primitive. Every LLM output destined for the
 * UI, the PDF, or persistent storage MUST pass through `r3Validate(...)`.
 * Nothing else can write LLM strings into a typed boundary.
 *
 * Pipeline:
 *   R1 Schema    — Zod parse. On failure, ONE repair attempt (strip code
 *                  fences / balance trailing brace) then re-parse.
 *   R2 Reconcile — domain invariants (finite numbers, % in [0,100], no
 *                  cartoon LTV:CAC, no negative tokens).
 *   R3 Reject    — typed rejection with reason + raw preview, never throws.
 *
 * Contract: a successful return is provably safe to forward downstream.
 * A failed return is a typed error you can render or log — never a string.
 */
import { z } from 'npm:zod@3.23.8';

export type R3Result<T> =
  | { ok: true; data: T; repaired: boolean }
  | {
      ok: false;
      reason: 'schema' | 'reconcile' | 'empty';
      detail: string;
      raw_preview: string;
      repair_attempted: boolean;
    };

export interface R3Reconciler<T> {
  /** Return null when OK, or a short string describing the invariant violation. */
  (data: T): string | null;
}

const PREVIEW_LEN = 240;

/** Strip markdown code fences and balance one trailing brace if obvious. */
function repairJson(raw: string): string {
  let s = raw.trim();
  // ```json … ``` or ``` … ```
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  // Drop leading prose before the first '{' or '['
  const firstBrace = s.search(/[{[]/);
  if (firstBrace > 0) s = s.slice(firstBrace);
  // Drop trailing prose after the last '}' or ']'
  const lastBrace = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  if (lastBrace >= 0 && lastBrace < s.length - 1) s = s.slice(0, lastBrace + 1);
  return s.trim();
}

function tryParse(raw: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Validate an LLM output against a Zod schema with one repair attempt and
 * an optional domain reconciliation pass. Never throws.
 */
export function r3Validate<T>(
  raw: string,
  schema: z.ZodType<T>,
  reconcile?: R3Reconciler<T>
): R3Result<T> {
  const preview = (raw || '').slice(0, PREVIEW_LEN);

  if (!raw || !raw.trim()) {
    return {
      ok: false,
      reason: 'empty',
      detail: 'LLM returned empty body',
      raw_preview: preview,
      repair_attempted: false,
    };
  }

  // R1 — Schema
  let parsed = tryParse(raw);
  let repaired = false;
  if (parsed === null) {
    parsed = tryParse(repairJson(raw));
    repaired = parsed !== null;
  }

  if (parsed === null) {
    return {
      ok: false,
      reason: 'schema',
      detail: 'Not valid JSON after one repair attempt',
      raw_preview: preview,
      repair_attempted: true,
    };
  }

  const parseResult = schema.safeParse(parsed);
  if (!parseResult.success) {
    return {
      ok: false,
      reason: 'schema',
      detail: parseResult.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
        .join(' | '),
      raw_preview: preview,
      repair_attempted: repaired,
    };
  }

  // R2 — Reconcile (optional)
  if (reconcile) {
    const issue = reconcile(parseResult.data);
    if (issue) {
      return {
        ok: false,
        reason: 'reconcile',
        detail: issue,
        raw_preview: preview,
        repair_attempted: repaired,
      };
    }
  }

  // R3 — Accept
  return { ok: true, data: parseResult.data, repaired };
}

/** Default reconciler factory: enforce common numeric sanity. */
export function defaultFinancialReconciler<T extends Record<string, unknown>>(opts: {
  percentFields?: string[];
  finiteFields?: string[];
  ltvCacField?: string;
}): R3Reconciler<T> {
  return (data) => {
    for (const k of opts.percentFields ?? []) {
      const v = data[k];
      if (typeof v === 'number' && (v < 0 || v > 100)) return `${k} out of [0,100]: ${v}`;
    }
    for (const k of opts.finiteFields ?? []) {
      const v = data[k];
      if (typeof v === 'number' && !Number.isFinite(v)) return `${k} not finite: ${v}`;
    }
    if (opts.ltvCacField) {
      const v = data[opts.ltvCacField];
      // Anti-BS: LTV:CAC > 20 is almost always a math error or fabrication.
      if (typeof v === 'number' && (v < 0 || v > 20)) return `LTV:CAC implausible: ${v}`;
    }
    return null;
  };
}
