// /admin/users helpers: internal accounts never count as external, paying
// means a real Stripe subscription (not a founder grant), CSV is formula-safe.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { filterUsers, isPaying, summarize, toCsv, type AdminUserRow } from '@/lib/admin-users';

const NOW = Date.parse('2026-10-23T18:00:00Z');
const base: AdminUserRow = {
  user_id: 'u', email: 'a@firm.com', full_name: null, signed_up_at: '2026-10-01T00:00:00Z', last_sign_in_at: null,
  email_confirmed: true, sign_in_provider: 'email', is_admin: false, is_internal: false, plan_id: 'free',
  subscription_status: null, trial_ends_at: null, current_period_end: null, has_stripe_customer: false,
  analyses_count: 0, first_analysis_at: null, last_analysis_at: null, marketing_opt_in: null,
};
const row = (o: Partial<AdminUserRow>) => ({ ...base, ...o });

describe('admin users', () => {
  const rows = [
    row({ user_id: '1', analyses_count: 3, last_sign_in_at: '2026-10-20T00:00:00Z' }),
    row({ user_id: '2', signed_up_at: '2026-10-20T00:00:00Z' }),
    row({ user_id: '3', plan_id: 'plus', subscription_status: 'active', has_stripe_customer: true, analyses_count: 1 }),
    row({ user_id: '4', plan_id: 'pro', subscription_status: 'active', has_stripe_customer: false, is_internal: true }),
    row({ user_id: '5', email: 'jeltov@x.com', is_internal: true, analyses_count: 40 }),
  ];
  it('summary counts external accounts only', () => {
    expect(summarize(rows, NOW)).toEqual({ total: 5, internal: 2, external: 3, activated: 2, activationRate: 67, signedInLast30: 1, signedUpLast7: 1, paying: 1, trialing: 0 });
  });
  it('a founder grant is not paying', () => {
    expect(isPaying(rows[3])).toBe(false);
    expect(isPaying(rows[2])).toBe(true);
  });
  it('filters hide internal by default and search email or name', () => {
    expect(filterUsers(rows, { query: '', segment: 'all', includeInternal: false }, NOW).map((r) => r.user_id)).toEqual(['1', '2', '3']);
    expect(filterUsers(rows, { query: 'jeltov', segment: 'all', includeInternal: true }, NOW).map((r) => r.user_id)).toEqual(['5']);
    expect(filterUsers(rows, { query: '', segment: 'never_analyzed', includeInternal: false }, NOW).map((r) => r.user_id)).toEqual(['2']);
  });
  it('CSV escapes quotes and neutralises spreadsheet formulas', () => {
    const csv = toCsv([row({ email: '=HYPERLINK("x")', full_name: 'Doe, "J"' })]);
    expect(csv.split('\n')[1]).toMatch(/^"'=HYPERLINK\(""x""\)","Doe, ""J"""/);
  });
  it('the RPC is admin-only and the page is routed', () => {
    const sql = readFileSync('supabase/migrations/20261023200000_admin_users_overview.sql', 'utf8');
    expect(sql).toContain("has_role(auth.uid(), 'admin'::app_role)");
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.admin_users_overview() FROM PUBLIC, anon');
    expect(readFileSync('src/App.tsx', 'utf8')).toContain('<Route path="users" element={<AdminUsers />} />');
  });
});
