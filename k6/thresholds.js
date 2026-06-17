// Central thresholds. Each script imports the slice it needs so we can never
// drift between "what passes locally" and "what passes in CI". A breach here
// fails the GitHub Actions job — that's the whole point.

export const HARD = {
  // No hard errors anywhere. Backpressure (429/high_demand envelopes) is OK
  // and is tracked via a separate counter for visibility, not for gating.
  'hard_error_rate': ['rate==0'],
};

export const L1 = {
  ...HARD,
  'http_req_duration{kind:health}': ['p(99)<300'],
};

export const L2 = {
  ...HARD,
  'http_req_duration{kind:engine}': ['p(95)<800', 'p(99)<1500'],
  'verdict_complete_rate': ['rate>=0.995'],
};

export const L3_LOW = {
  // Used for 1 VU and 10 VU phases.
  ...HARD,
  'verdict_complete_rate': ['rate>=0.995'],
};

export const L3_HIGH = {
  // 100 concurrent. p95 is reported, not gated. Backpressure is allowed.
  ...HARD,
};

export const L4 = {
  ...HARD,
  // SECURITY: 100% of forged-Free requests to paid surfaces must be locked.
  'feature_locked_rate': ['rate==1'],
  'paid_compute_leak': ['count==0'],
};

export const L5 = {
  ...HARD,
  // Exactly 5 succeed; counter must never exceed 5.
  'usage_cap_overrun': ['count==0'],
};

export const L6 = {
  ...HARD,
  // Exactly one provision under 50× concurrent replay of the same event.id.
  'webhook_duplicate_provision': ['count==0'],
};

export const L7 = {
  ...HARD,
  'webhook_race_lost_update': ['count==0'],
};

export const L8 = {
  ...HARD,
  // Limiter envelope must be clean — no 5xx, no unhandled throws.
};

export const L9 = {
  ...HARD,
  'http_req_duration{kind:cold}': ['p(95)<6000'],
};

export const L10 = {
  ...HARD,
  'rls_cross_tenant_rows': ['count==0'],
};
