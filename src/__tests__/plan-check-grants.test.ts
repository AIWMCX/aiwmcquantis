// RLS policies call the plan-check functions as the querying role, so
// authenticated must keep EXECUTE (revoked by 20260827092000, restored here).
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

describe('plan-check functions used by RLS stay executable for signed-in users', () => {
  const dir = 'supabase/migrations';
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  it('the latest grant/revoke for each function leaves authenticated with EXECUTE', () => {
    for (const fn of ['verify_plus_subscription', 'verify_paid_subscription', 'verify_pro_subscription']) {
      let last = '';
      for (const f of files) {
        const sql = readFileSync(`${dir}/${f}`, 'utf8').replace(/--.*$/gm, '');
        const re = new RegExp(String.raw`(GRANT|REVOKE)\s+EXECUTE\s+ON\s+FUNCTION\s+public\.${fn}\(uuid\)[^;]*authenticated`, 'gi');
        for (const m of sql.matchAll(re)) last = m[1].toUpperCase();
      }
      expect(last, fn).toBe('GRANT');
    }
  });
});
