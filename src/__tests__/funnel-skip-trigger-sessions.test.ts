import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

// Buy-blockers #127/#128: the analyses trigger's analysis_complete rows (session_id =
// analysis id) were counted as extra external "sessions" and as a second complete.
const PREV = readFileSync('supabase/migrations/20261025010000_internal_founder_alias.sql', 'utf8');
const NEXT = readFileSync('supabase/migrations/20261029010000_funnel_clean_skip_trigger_rows.sql', 'utf8');
const viewOf = (sql: string) => {
  const a = sql.indexOf('CREATE OR REPLACE VIEW public.funnel_events_clean');
  const b = sql.indexOf('GRANT SELECT ON public.funnel_events_clean TO service_role;');
  return sql.slice(a, b).replace(/\r/g, '');
};

describe('funnel_events_clean skips the trigger copy of analysis_complete', () => {
  it('is the previous view plus exactly one filter', () => {
    const prev = viewOf(PREV).split('\n');
    const next = viewOf(NEXT).split('\n');
    const added = next.filter((l) => !prev.includes(l));
    expect(added.map((l) => l.trim())).toEqual([
      "-- Skip the analyses-table trigger's own copy of analysis_complete (see header).",
      "WHERE COALESCE(fe.metadata ->> 'emitted_by', '') <> 'trg_analyses_emit_complete_event'",
    ]);
    expect(prev.filter((l) => !next.includes(l))).toEqual([]);
  });

  it('keeps the same exposure: invoker security, no anon/authenticated grant', () => {
    expect(NEXT).toContain('security_invoker = true');
    expect(NEXT).toContain('REVOKE ALL ON public.funnel_events_clean FROM anon, authenticated');
    expect(NEXT).toContain('GRANT SELECT ON public.funnel_events_clean TO service_role');
  });

  it('leaves the trigger itself alone, and every later view definition keeps the filter', () => {
    expect(NEXT).not.toMatch(/DROP TRIGGER|CREATE TRIGGER|emit_analysis_complete_event\(\)/);
    const later = readdirSync('supabase/migrations')
      .filter((f) => f > '20261029010000_funnel_clean_skip_trigger_rows.sql' && f.endsWith('.sql'))
      .map((f) => readFileSync(`supabase/migrations/${f}`, 'utf8'))
      .filter((sql) => sql.includes('VIEW public.funnel_events_clean'));
    for (const sql of later) {
      expect(viewOf(sql)).toContain("WHERE COALESCE(fe.metadata ->> 'emitted_by', '') <> 'trg_analyses_emit_complete_event'");
    }
  });
});
