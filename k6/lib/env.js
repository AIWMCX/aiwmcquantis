// k6 environment loader + safety guards.
//
// HARD RULE: every k6 script in this suite must `import` this module and call
// `env()` at the top of its `setup()`. If the safety preconditions aren't met,
// the script throws BEFORE issuing a single HTTP request. This is the only
// thing standing between a load test and a live-billing incident.

const REQUIRED = ['K6_BASE_URL', 'K6_SUPABASE_ANON_KEY', 'K6_STRIPE_MODE'];

export function env() {
  const missing = REQUIRED.filter((k) => !__ENV[k]);
  if (missing.length) {
    throw new Error(
      `[k6-safety] Missing required env vars: ${missing.join(', ')}. ` +
        `Refusing to run. See LOADTEST.md.`,
    );
  }
  if (__ENV.K6_STRIPE_MODE !== 'test') {
    throw new Error(
      `[k6-safety] K6_STRIPE_MODE must be "test" — got "${__ENV.K6_STRIPE_MODE}". ` +
        `Refusing to send a single request against non-test Stripe.`,
    );
  }
  const base = __ENV.K6_BASE_URL.replace(/\/$/, '');
  // Block known production hosts as an extra belt-and-suspenders guard.
  if (/aiwmcquantis\.com/i.test(base) && __ENV.K6_ALLOW_PROD !== 'i-know-what-im-doing') {
    throw new Error(
      `[k6-safety] Base URL targets production (${base}). ` +
        `Re-run with K6_ALLOW_PROD=i-know-what-im-doing if intentional (it isn't).`,
    );
  }
  return {
    baseUrl: base,
    anonKey: __ENV.K6_SUPABASE_ANON_KEY,
    stripeMode: __ENV.K6_STRIPE_MODE,
    // Optional per-test overrides.
    testUserToken: __ENV.K6_TEST_USER_JWT || '',
    testWebhookSecret: __ENV.K6_STRIPE_WEBHOOK_SECRET || '',
  };
}

// Error classification — only HARD counts against thresholds.
// HARD          = 5xx, timeout, network error, unhandled throw, OR
//                 a 2xx body that's missing required fields / partial result.
// BACKPRESSURE  = structured 429 OR a 200/402/403 envelope of shape
//                 { error: 'high_demand' | 'quota_exhausted' | 'feature_locked' | 'rate_limited' }.
//                 Expected and ALLOWED on the LLM-bound path.
export function classify(res, opts = {}) {
  // Network / timeout / unreachable.
  if (res.error_code || res.status === 0) return 'HARD';
  if (res.status >= 500) return 'HARD';

  let body = null;
  try {
    body = res.json();
  } catch {
    // Non-JSON body on a 2xx is HARD for our APIs (all should be JSON).
    if (res.status >= 200 && res.status < 300) return 'HARD';
  }

  const code = body && typeof body === 'object' ? body.error || body.code : null;
  const BACKPRESSURE_CODES = new Set([
    'high_demand',
    'quota_exhausted',
    'feature_locked',
    'rate_limited',
    'plan_required',
  ]);

  if (res.status === 429) return 'BACKPRESSURE';
  if (BACKPRESSURE_CODES.has(code)) return 'BACKPRESSURE';

  if (res.status >= 400) return 'HARD';

  // Optional completeness check: caller passes `requiredFields` for
  // engine/pipeline scripts so a partial verdict counts as HARD.
  if (opts.requiredFields && body) {
    for (const f of opts.requiredFields) {
      if (body[f] === undefined || body[f] === null) return 'HARD';
    }
  }
  return 'OK';
}
