import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SQL = readFileSync('supabase/migrations/20261018130000_funnel_events_clean_view.sql', 'utf8');

describe('funnel_events_clean: canonical metrics source', () => {
  it('maps historical alias events to their current names', () => {
    expect(SQL).toContain("WHEN 'analysis_started'   THEN 'analysis_start'");
    expect(SQL).toContain("WHEN 'analysis_completed' THEN 'analysis_complete'");
    expect(SQL).toContain("WHEN 'result_rendered'    THEN 'result_viewed'");
  });
  it('flags internal accounts, tagged QA sessions and non-production hosts', () => {
    expect(SQL).toContain("metadata->>'internal_qa'");
    expect(SQL).toContain('(jeltov|aiwmc|jjbalaganvasya)');
    expect(SQL).toMatch(/localhost\|127/);
  });
  it('supports unique-session counting and Denver reporting days', () => {
    expect(SQL).toContain('is_first_in_session');
    expect(SQL).toContain("AT TIME ZONE 'America/Denver'");
  });
  it('creates no new exposure: invoker security, no anon/authenticated grant', () => {
    expect(SQL).toContain('security_invoker = true');
    expect(SQL).toContain('REVOKE ALL ON public.funnel_events_clean FROM anon, authenticated');
  });
});
