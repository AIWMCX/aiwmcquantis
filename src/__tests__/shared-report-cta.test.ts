import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

// Buy-blockers #100: a shared /r/ report's only route onward was a small
// "New analysis" link. It now carries a "Test a decision of your own" card,
// measured as a funnel event and shown on /admin/funnel.
describe('shared report CTA', () => {
  const page = readFileSync('src/pages/PublicAnalysisResult.tsx', 'utf8');
  it('links readers to their own test and records the click', () => {
    expect(page).toContain('data-testid="test-your-own-cta"');
    expect(page).toMatch(/to="\/app"/);
    expect(page).toMatch(/recordFunnelEvent\('shared_report_cta_click', \{ surface: 'public_report' \}\)/);
  });
  it('is allowed by the latest funnel_events constraint and shown on the admin funnel', () => {
    const latest = readdirSync('supabase/migrations')
      .filter((f) => /^\d+_.*\.sql$/.test(f) && readFileSync(`supabase/migrations/${f}`, 'utf8').includes('funnel_events_canonical_name_chk'))
      .sort()
      .pop()!;
    expect(readFileSync(`supabase/migrations/${latest}`, 'utf8')).toContain("'shared_report_cta_click'");
    expect(readFileSync('src/pages/admin/Funnel.tsx', 'utf8')).toContain("key: 'shared_report_cta_click'");
  });
});
