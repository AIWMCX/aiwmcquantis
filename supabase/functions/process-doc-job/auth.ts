// Authorization + owner-scoped claim for process-doc-job. Kept free of Deno
// and network imports so vitest can exercise it with a fake client.

export type Caller = { kind: 'worker' } | { kind: 'owner'; userId: string };

export type GetUser = (jwt: string) => Promise<{ data: { user: { id: string } | null } | null; error: unknown }>;

/** Resolve who is calling. null = reject (401) before touching any job. */
export async function resolveCaller(authorization: string | null, serviceKey: string, getUser: GetUser): Promise<Caller | null> {
  const bearer = (authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!bearer) return null;
  if (serviceKey && bearer === serviceKey) return { kind: 'worker' };
  const { data, error } = await getUser(bearer);
  if (error || !data?.user?.id) return null;
  return { kind: 'owner', userId: data.user.id };
}

// Minimal shape of the query builder used for the claim.
export interface ClaimQuery {
  eq(col: string, val: unknown): ClaimQuery;
  select(): { maybeSingle(): Promise<{ data: unknown; error: unknown }> };
}
export interface ClaimClient {
  from(table: string): { update(v: Record<string, unknown>): ClaimQuery };
}

/** Atomically claim a queued job; a user can only ever claim their own. */
export async function claimJob(client: ClaimClient, jobId: string, caller: Caller) {
  let q = client.from('doc_generation_jobs').update({ status: 'processing' }).eq('job_id', jobId).eq('status', 'queued');
  if (caller.kind === 'owner') q = q.eq('user_id', caller.userId);
  return q.select().maybeSingle();
}
