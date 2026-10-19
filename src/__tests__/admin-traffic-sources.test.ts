import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SQL = readFileSync('supabase/migrations/20261018150000_admin_traffic_sources.sql', 'utf8');
const PAGE = readFileSync('src/pages/admin/Funnel.tsx', 'utf8');

describe('admin traffic sources: real, attributable, internal-free', () => {
  it('flags internal traffic per session, not per row', () => {
    expect(SQL).toMatch(/bool_or\(row_internal\) OVER \(PARTITION BY COALESCE\(session_id, id::text\)\) AS is_internal/);
  });

  it('treats founder-granted accounts as internal, but not invite grants', () => {
    expect(SQL).toContain("stripe_subscription_id LIKE 'founder\\_%'");
    expect(SQL).toContain("stripe_subscription_id LIKE 'sub\\_plus\\_%'");
    expect(SQL).not.toMatch(/grant_source\s*=\s*'invite'/);
  });

  it('excludes localhost, previews and QA-tagged links', () => {
    expect(SQL).toMatch(/localhost\|127/);
    expect(SQL).toContain('chatgpt\\.site');
    expect(SQL).toContain("= 'internal'");
  });

  it('never guesses a source for unattributed visits', () => {
    expect(SQL).toContain("THEN 'Direct / unknown'");
  });

  it('is admin-only and keeps the clean view revoked from clients', () => {
    expect(SQL).toMatch(/has_role\(auth\.uid\(\), 'admin'::app_role\)/);
    expect(SQL).toContain('SECURITY DEFINER');
    expect(SQL).toContain('REVOKE ALL ON public.funnel_events_clean FROM anon, authenticated');
    expect(SQL).toContain('REVOKE ALL ON FUNCTION public.admin_traffic_sources(integer) FROM PUBLIC, anon');
  });

  it('admin funnel page reads the clean RPC, not the raw summary view', () => {
    expect(PAGE).toContain("rpc('admin_traffic_sources'");
    expect(PAGE).not.toMatch(/from\('funnel_summary_30d'/);
  });
});
