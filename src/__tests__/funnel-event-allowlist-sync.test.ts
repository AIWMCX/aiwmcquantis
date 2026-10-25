import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

// recordFunnelEvent() is fire-and-forget, so a name missing from the
// funnel_events CHECK constraint is dropped with no error anywhere.
// 'paid_review_view' was the first case (2026-10-24). Keep code and DB in sync.

const latestConstraintSql = () => {
  const dir = 'supabase/migrations';
  const files = readdirSync(dir)
    .filter((f) => /^\d{14}_.*\.sql$/.test(f))
    .sort()
    .filter((f) => readFileSync(`${dir}/${f}`, 'utf8').includes('ADD CONSTRAINT funnel_events_canonical_name_chk'));
  return readFileSync(`${dir}/${files[files.length - 1]}`, 'utf8');
};

describe('funnel event names: code ⊆ database allowlist', () => {
  it('every SowFunnelEvent member is allowed by the newest constraint migration', () => {
    const src = readFileSync('src/lib/analytics.ts', 'utf8');
    const union = /export type SowFunnelEvent =([\s\S]*?);/.exec(src)?.[1] ?? '';
    const names = [...union.matchAll(/\| '([a-z0-9_]+)'/g)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(20);

    const sql = latestConstraintSql();
    const allowed = new Set([...sql.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]));
    expect(names.filter((n) => !allowed.has(n))).toEqual([]);
  });
});
