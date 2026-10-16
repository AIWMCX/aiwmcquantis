import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { claimJob, resolveCaller, type ClaimClient } from '../../supabase/functions/process-doc-job/auth';

const SERVICE = 'service-role-secret';
const users: Record<string, string> = { 'jwt-alice': 'alice', 'jwt-bob': 'bob' };
const getUser = vi.fn(async (jwt: string) => ({
  data: { user: users[jwt] ? { id: users[jwt] } : null },
  error: users[jwt] ? null : new Error('invalid session'),
}));

/** Fake doc_generation_jobs with one queued job owned by alice; records every call. */
function fakeDb() {
  const job = { job_id: 'job-1', user_id: 'alice', status: 'queued' };
  const calls: string[] = [];
  const client: ClaimClient = {
    from(table) {
      calls.push(`from:${table}`);
      return {
        update(v) {
          calls.push(`update:${JSON.stringify(v)}`);
          const filters: Record<string, unknown> = {};
          const q = {
            eq(col: string, val: unknown) {
              filters[col] = val;
              calls.push(`eq:${col}=${String(val)}`);
              return q;
            },
            select() {
              return {
                async maybeSingle() {
                  const hit = Object.entries(filters).every(([k, val]) => (job as Record<string, unknown>)[k] === val);
                  if (hit) job.status = 'processing';
                  return { data: hit ? { ...job } : null, error: null };
                },
              };
            },
          };
          return q;
        },
      };
    },
  };
  return { client, calls, job };
}

describe('process-doc-job authorization', () => {
  it('rejects an unauthenticated request, with no database call', async () => {
    const db = fakeDb();
    expect(await resolveCaller(null, SERVICE, getUser)).toBeNull();
    expect(await resolveCaller('Bearer ', SERVICE, getUser)).toBeNull();
    expect(db.calls).toEqual([]);
  });

  it('rejects a token that is not a user session (e.g. the public anon key)', async () => {
    expect(await resolveCaller('Bearer anon-key', SERVICE, getUser)).toBeNull();
  });

  it("another user cannot claim or modify alice's job", async () => {
    const db = fakeDb();
    const bob = await resolveCaller('Bearer jwt-bob', SERVICE, getUser);
    expect(bob).toEqual({ kind: 'owner', userId: 'bob' });
    const res = await claimJob(db.client, 'job-1', bob!);
    expect(res.data).toBeNull();
    expect(db.job.status).toBe('queued');
    expect(db.calls).toContain('eq:user_id=bob');
  });

  it('the owner can claim their own job', async () => {
    const db = fakeDb();
    const alice = await resolveCaller('Bearer jwt-alice', SERVICE, getUser);
    const res = await claimJob(db.client, 'job-1', alice!);
    expect(res.data).toMatchObject({ job_id: 'job-1', status: 'processing' });
  });

  it('the internal worker (service-role bearer) claims without a user lookup or owner filter', async () => {
    getUser.mockClear();
    const db = fakeDb();
    const worker = await resolveCaller(`Bearer ${SERVICE}`, SERVICE, getUser);
    expect(worker).toEqual({ kind: 'worker' });
    expect(getUser).not.toHaveBeenCalled();
    const res = await claimJob(db.client, 'job-1', worker!);
    expect(res.data).toMatchObject({ status: 'processing' });
    expect(db.calls.some((c) => c.startsWith('eq:user_id'))).toBe(false);
  });

  it('the handler authorizes before it claims, and claims before the paid AI call', () => {
    const src = readFileSync('supabase/functions/process-doc-job/index.ts', 'utf8');
    const auth = src.indexOf('await resolveCaller(');
    const reject = src.indexOf('if (!caller)');
    const claim = src.indexOf('await claimJob(');
    const ai = src.indexOf('"generate-document-content"');
    expect(auth).toBeGreaterThan(-1);
    expect(auth).toBeLessThan(reject);
    expect(reject).toBeLessThan(claim);
    expect(claim).toBeLessThan(ai);
  });
});
