import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SQL = readFileSync('supabase/migrations/20261018120000_security_definer_caller_guards.sql', 'utf8');

describe('SECURITY DEFINER functions taking a user id refuse other users', () => {
  for (const fn of ['complete_referral_signup', 'generate_referral_code', 'get_next_invoice_number', 'log_entitlement_denial']) {
    it(`${fn} checks the id against auth.uid() before acting`, () => {
      const body = SQL.split(`FUNCTION public.${fn}(`)[1].split('$function$;')[0];
      const guard = body.indexOf('auth.uid() IS NOT NULL AND');
      expect(guard).toBeGreaterThan(-1);
      const firstWrite = body.search(/\b(INSERT|UPDATE|SELECT code)\b/);
      expect(guard).toBeLessThan(firstWrite);
      expect(body).toContain("ERRCODE = '42501'");
    });
  }
  it('client callers pass their own user id (so the guard cannot break them)', () => {
    expect(readFileSync('src/hooks/useReferral.ts', 'utf8')).toMatch(/generate_referral_code', \{\s*p_user_id: user\.id/);
    expect(readFileSync('src/hooks/useInvoices.ts', 'utf8')).toMatch(/get_next_invoice_number', \{ p_user_id: user\.id/);
  });
});
