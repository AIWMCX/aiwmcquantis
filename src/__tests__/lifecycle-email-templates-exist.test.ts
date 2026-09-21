import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Regression coverage for a real production incident (2026-09-21): the
// caller (check-lifecycle-emails) referenced a template_key that was never
// added to send-lifecycle-email's EMAIL_TEMPLATES registry. The caller's
// scheduling/dedup/cooldown logic ran correctly every week; the send always
// threw "Unknown template: <key>" and 0 emails were ever sent. Confirmed
// live via Supabase function_logs: 64 failures in 24h, all "Unknown
// template: weekly_pulse".
//
// This test statically extracts every template_key literal the caller
// passes to sendEmail(...) and every key actually defined in
// EMAIL_TEMPLATES, and asserts the caller's set is a subset of the
// registry's -- so a new caller-side template_key with no matching
// registry entry fails CI instead of silently dropping emails in
// production until someone reads the logs.

const callerSource = readFileSync(
  resolve(process.cwd(), 'supabase/functions/check-lifecycle-emails/index.ts'),
  'utf8',
);
const templateSource = readFileSync(
  resolve(process.cwd(), 'supabase/functions/send-lifecycle-email/index.ts'),
  'utf8',
);

function extractCallerTemplateKeys(src: string): string[] {
  const keys = new Set<string>();
  // sendEmail(userId, "template_key") / sendEmail(user.user_id, 'key')
  for (const m of src.matchAll(/sendEmail\([^,]+,\s*["']([a-zA-Z0-9_]+)["']\s*\)/g)) {
    keys.add(m[1]);
  }
  // { day: N, key: 'template_key' } style tables (NURTURE_DAYS)
  for (const m of src.matchAll(/key:\s*['"]([a-zA-Z0-9_]+)['"]/g)) {
    keys.add(m[1]);
  }
  return [...keys];
}

function extractRegistryTemplateKeys(src: string): string[] {
  const start = src.indexOf('const EMAIL_TEMPLATES');
  const end = src.indexOf('\n};', start);
  const block = src.slice(start, end);
  const keys: string[] = [];
  for (const m of block.matchAll(/^\s{2}([a-zA-Z_][a-zA-Z0-9_]*):\s*\{/gm)) {
    keys.push(m[1]);
  }
  return keys;
}

describe('every check-lifecycle-emails template_key exists in send-lifecycle-email EMAIL_TEMPLATES (2026-09-21)', () => {
  const callerKeys = extractCallerTemplateKeys(callerSource);
  const registryKeys = extractRegistryTemplateKeys(templateSource);

  it('found a non-trivial number of caller keys and registry keys (sanity check on the extraction itself)', () => {
    expect(callerKeys.length).toBeGreaterThan(3);
    expect(registryKeys.length).toBeGreaterThan(3);
  });

  it('weekly_pulse specifically is defined (the exact key that was missing)', () => {
    expect(registryKeys).toContain('weekly_pulse');
  });

  it('every template_key the caller can send is defined in the registry', () => {
    const missing = callerKeys.filter((k) => !registryKeys.includes(k));
    expect(missing).toEqual([]);
  });
});
