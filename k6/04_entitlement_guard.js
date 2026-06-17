// L4 — SECURITY: 1,000 Free-tier callers hammer every paid surface.
// PASS: 100% feature_locked, ZERO results returned, ZERO paid compute executed.
// Any 2xx with a real payload from a paid surface is a HARD failure.

import http from 'k6/http';
import { Counter, Rate } from 'k6/metrics';
import { env, classify } from './lib/env.js';
import { L4 } from './thresholds.js';

const hardErrorRate = new Rate('hard_error_rate');
const featureLockedRate = new Rate('feature_locked_rate');
const paidComputeLeak = new Counter('paid_compute_leak');

// Paid surfaces — Free identity should be denied at every one of these.
const PAID_FNS = [
  'pdf-export',
  'document-export',
  'location-comparison',
  'document-studio',
  'pro-analysis',
  'white-label-pdf',
];

export const options = {
  scenarios: {
    burst_1000: { executor: 'constant-vus', vus: 1000, duration: '30s' },
  },
  thresholds: L4,
};

export function setup() {
  return env();
}

export default function (data) {
  const fn = PAID_FNS[Math.floor(Math.random() * PAID_FNS.length)];
  const url = `${data.baseUrl}/functions/v1/${fn}`;
  const res = http.post(
    url,
    JSON.stringify({ idea: 'forged free-tier call', tier_claim: 'pro' }),
    {
      headers: {
        apikey: data.anonKey,
        Authorization: `Bearer ${data.anonKey}`, // anon JWT = Free identity
        'Content-Type': 'application/json',
        // Adversarial header — server MUST ignore and resolve tier from DB.
        'x-tier-override': 'pro',
      },
      tags: { kind: 'entitlement', fn },
      timeout: '20s',
    },
  );

  hardErrorRate.add(classify(res) === 'HARD');

  let body = null;
  try {
    body = res.json();
  } catch {
    /* non-JSON; counts via classify */
  }
  const code = body && (body.error || body.code);
  const locked = code === 'feature_locked' || code === 'plan_required' || res.status === 402;
  featureLockedRate.add(locked);

  // A successful 2xx without the lock envelope means paid compute ran. HARD fail.
  if (!locked && res.status >= 200 && res.status < 300) paidComputeLeak.add(1);
}
