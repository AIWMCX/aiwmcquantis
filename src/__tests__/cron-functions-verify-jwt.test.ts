import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// A pg_cron job that calls an edge function with only `x-cron-secret` (no
// Authorization header) is rejected with 401 by the Supabase gateway unless
// that function is deployed with verify_jwt = false (supabase/config.toml).
// lead-intake and reconcile-stripe-subscriptions failed every scheduled run
// this way until 2026-11-08.

const MIGRATIONS = 'supabase/migrations';
const config = readFileSync('supabase/config.toml', 'utf8');

function verifyJwtDisabled(fn: string): boolean {
  const re = new RegExp(`\\[functions\\.${fn.replace(/[-]/g, '\\-')}\\][^\\[]*verify_jwt\\s*=\\s*false`);
  return re.test(config);
}

/** Latest cron.schedule body per job name, across all migrations in order. */
function cronCallers(): Map<string, { fn: string; sendsAuth: boolean; file: string }> {
  const jobs = new Map<string, { fn: string; sendsAuth: boolean; file: string }>();
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS, file), 'utf8');
    const re = /cron\.schedule\(\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*\$(\w*)\$([\s\S]*?)\$\2\$/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql))) {
      const [, job, , body] = m;
      const fn = /functions\/v1\/([a-z0-9_-]+)/.exec(body)?.[1];
      if (!fn) continue;
      jobs.set(job, { fn, sendsAuth: /'Authorization'/i.test(body), file });
    }
  }
  return jobs;
}

describe('pg_cron → edge function auth', () => {
  it('finds the scheduled callers it is meant to guard', () => {
    const fns = [...cronCallers().values()].map((j) => j.fn);
    expect(fns).toContain('lead-intake');
    expect(fns).toContain('reconcile-stripe-subscriptions');
  });

  it('every cron-called function without an Authorization header has verify_jwt = false', () => {
    const missing = [...cronCallers().entries()]
      .filter(([, j]) => !j.sendsAuth && !verifyJwtDisabled(j.fn))
      .map(([job, j]) => `${job} -> ${j.fn} (${j.file})`);
    expect(missing).toEqual([]);
  });
});
