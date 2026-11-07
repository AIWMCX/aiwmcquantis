/**
 * Who may call ai-consensus.
 *
 * Every request runs two paid models (gpt-5-mini + gemini), and the gateway
 * accepts the public anon key, so before this check anyone could spend on it.
 * Allowed now: the service role (server-to-server callers such as
 * qoc-orchestrate) or a signed-in user. The anon key resolves to no user and
 * gets 401. If the auth lookup itself fails, the answer is 503 (fail closed),
 * not a claim that the caller is unauthenticated.
 *
 * Pure module (no Deno-only imports) so Vitest can test it; index.ts injects
 * the service role key and the Supabase user lookup.
 */

export type CallerCheck =
  | { ok: true; caller: 'service_role' }
  | { ok: true; caller: 'user'; userId: string }
  | { ok: false; status: 401; code: 'AUTH_REQUIRED' }
  | { ok: false; status: 503; code: 'AUTH_CHECK_FAILED' };

export interface CallerDeps {
  serviceRoleKey: string;
  /** Resolves a JWT to its user, or null when it carries none (the anon key). */
  getUser: (jwt: string) => Promise<{ id: string } | null>;
}

export async function authorizeCaller(req: Request, deps: CallerDeps): Promise<CallerCheck> {
  const header = req.headers.get('Authorization') ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match) return { ok: false, status: 401, code: 'AUTH_REQUIRED' };
  const token = match[1];

  if (deps.serviceRoleKey && token === deps.serviceRoleKey) return { ok: true, caller: 'service_role' };

  let user: { id: string } | null;
  try {
    user = await deps.getUser(token);
  } catch {
    return { ok: false, status: 503, code: 'AUTH_CHECK_FAILED' };
  }
  return user?.id ? { ok: true, caller: 'user', userId: user.id } : { ok: false, status: 401, code: 'AUTH_REQUIRED' };
}
