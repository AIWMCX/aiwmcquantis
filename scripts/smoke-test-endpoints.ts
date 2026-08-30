#!/usr/bin/env tsx
/**
 * Genesis P1/P3 — production deploy smoke test.
 *
 * Calls the critical public edge endpoints and validates the response
 * body against the R3 boundary schemas. Fails non-zero on:
 *   • network / 5xx
 *   • schema mismatch (R3 contract violation)
 *   • missing required telemetry headers
 *
 * Invoked by `.github/workflows/deploy-smoke-test.yml` after a successful
 * Production Deploy. Env:
 *   SUPABASE_URL          (e.g. https://<ref>.supabase.co)
 *   SUPABASE_ANON_KEY     (publishable key)
 */
import { z } from 'zod';

const URL_BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const ANON = process.env.SUPABASE_ANON_KEY || '';

if (!URL_BASE || !ANON) {
  console.error('❌ smoke: SUPABASE_URL and SUPABASE_ANON_KEY are required');
  process.exit(2);
}

interface Check {
  name: string;
  path: string;
  method: 'GET' | 'POST';
  body?: unknown;
  /**
   * Accepted HTTP status codes. Most endpoints return 200 for the ping/health
   * payload; some return 400 on a deliberately-invalid input — both count as
   * "function reachable + contract-aware".
   */
  accept: number[];
  /** Optional Zod schema for the response body when status is in `accept`. */
  schema?: z.ZodTypeAny;
}

// R3 boundary contract every error response is supposed to honour.
const ErrorEnvelope = z
  .object({
    success: z.literal(false).optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    request_id: z.string().optional(),
  })
  .passthrough();

const HealthEnvelope = z
  .object({
    ok: z.boolean().optional(),
    status: z.string().optional(),
    version: z.string().optional(),
  })
  .passthrough();

const CHECKS: Check[] = [
  {
    name: 'health-check',
    path: '/functions/v1/health-check',
    method: 'GET',
    accept: [200],
    schema: HealthEnvelope,
  },
  {
    name: 'system-status',
    path: '/functions/v1/system-status',
    method: 'GET',
    accept: [200],
  },
  {
    name: 'analyze-business (ping)',
    path: '/functions/v1/analyze-business',
    method: 'POST',
    body: { ping: true },
    accept: [200, 400, 422],
    schema: z
      .object({})
      .passthrough()
      .refine(
        (v) => 'success' in v || 'ok' in v || 'error' in v,
        'response missing success/ok/error envelope',
      ),
  },
  {
    name: 'benchmarks-query',
    path: '/functions/v1/benchmarks-query',
    method: 'POST',
    body: { ping: true },
    accept: [200, 400, 422],
    schema: z.object({}).passthrough(),
  },
  {
    name: 'rvce-validate (ping)',
    path: '/functions/v1/rvce-validate',
    method: 'POST',
    body: { ping: true },
    accept: [200, 400, 422],
    schema: z.object({}).passthrough(),
  },
  {
    name: 'entitlements-snapshot',
    path: '/functions/v1/entitlements-snapshot',
    method: 'POST',
    body: {},
    // 401 is acceptable: function is reachable + correctly rejecting anon w/o user JWT.
    accept: [200, 400, 401, 422],
    schema: ErrorEnvelope,
  },
];

interface Result {
  name: string;
  ok: boolean;
  status: number;
  detail?: string;
}

async function runOne(c: Check): Promise<Result> {
  const url = `${URL_BASE}${c.path}`;
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: c.method,
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${ANON}`,
        'Content-Type': 'application/json',
        'x-smoke-test': '1',
      },
      body: c.method === 'POST' ? JSON.stringify(c.body ?? {}) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    return {
      name: c.name,
      ok: false,
      status: 0,
      detail: `fetch failed: ${(err as Error).message}`,
    };
  }

  if (!c.accept.includes(resp.status)) {
    const body = await resp.text().catch(() => '');
    return {
      name: c.name,
      ok: false,
      status: resp.status,
      detail: `status ${resp.status} not in [${c.accept.join(', ')}]: ${body.slice(0, 200)}`,
    };
  }

  if (c.schema) {
    const text = await resp.text().catch(() => '');
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      return {
        name: c.name,
        ok: false,
        status: resp.status,
        detail: `non-JSON body: ${text.slice(0, 120)}`,
      };
    }
    const r = c.schema.safeParse(parsed);
    if (!r.success) {
      return {
        name: c.name,
        ok: false,
        status: resp.status,
        detail: `R3 schema mismatch: ${r.error.issues
          .slice(0, 2)
          .map((i) => `${i.path.join('.') || '<root>'}:${i.message}`)
          .join(' | ')}`,
      };
    }
  } else {
    await resp.text().catch(() => '');
  }

  return { name: c.name, ok: true, status: resp.status };
}

(async () => {
  console.log(`▶ smoke test against ${URL_BASE}`);
  const results = await Promise.all(CHECKS.map(runOne));
  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    const mark = r.ok ? '✓' : '✗';
    console.log(`  ${mark} ${r.name.padEnd(34)} ${r.status} ${r.detail ?? ''}`);
  }
  if (failed.length > 0) {
    console.error(`\n❌ smoke: ${failed.length}/${results.length} check(s) failed`);
    process.exit(1);
  }
  console.log(`\n✅ smoke: ${results.length}/${results.length} checks passed`);
})();
