/**
 * R3 Validator (frontend mirror).
 *
 * Mirrors `supabase/functions/_shared/r3-validator.ts` so the same primitive
 * is testable in the Vitest suite without spinning up edge runtime. Keep the
 * two files behaviorally identical — the test suite asserts this.
 *
 * Genesis Protocol P1 bedrock.
 */
import { z } from 'zod';

export type R3Result<T> =
  | { ok: true; data: T; repaired: boolean }
  | {
      ok: false;
      reason: 'schema' | 'reconcile' | 'empty';
      detail: string;
      raw_preview: string;
      repair_attempted: boolean;
    };

export type R3Reconciler<T> = (data: T) => string | null;

const PREVIEW_LEN = 240;

function repairJson(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const firstBrace = s.search(/[{[]/);
  if (firstBrace > 0) s = s.slice(firstBrace);
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

  return { ok: true, data: parseResult.data, repaired };
}

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
      if (typeof v === 'number' && (v < 0 || v > 20)) return `LTV:CAC implausible: ${v}`;
    }
    return null;
  };
}
