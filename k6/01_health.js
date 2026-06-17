// L1 — /health on every Edge Function under 1,000 concurrent callers.
// PASS: p99 < 300 ms, hard_error_rate == 0.

import http from 'k6/http';
import { Rate } from 'k6/metrics';
import { env, classify } from './lib/env.js';
import { L1 } from './thresholds.js';

const hardErrorRate = new Rate('hard_error_rate');

// Sampled set — extend in env via K6_FUNCTIONS_CSV. Defaults cover the
// load-bearing critical-path functions; the full sweep is enforced separately
// by `scripts/verify-deploy.sh` which hits every function once.
const DEFAULT_FNS = [
  'analyze',
  'analysis-engine',
  'stripe-webhook',
  'create-checkout-session',
  'create-portal-session',
  'entitlements-snapshot',
  'admin-health-sweep',
  'benchmarks-query',
  'pdf-export',
  'document-export',
];

export const options = {
  scenarios: {
    constant_1000: {
      executor: 'constant-vus',
      vus: 1000,
      duration: '1m',
    },
  },
  thresholds: L1,
};

export function setup() {
  const e = env();
  const fns = (__ENV.K6_FUNCTIONS_CSV || DEFAULT_FNS.join(',')).split(',').map((s) => s.trim());
  return { ...e, fns };
}

export default function (data) {
  const fn = data.fns[Math.floor(Math.random() * data.fns.length)];
  const url = `${data.baseUrl}/functions/v1/${fn}?health=1`;
  const res = http.get(url, {
    headers: {
      apikey: data.anonKey,
      Authorization: `Bearer ${data.anonKey}`,
    },
    tags: { kind: 'health', fn },
    timeout: '10s',
  });
  hardErrorRate.add(classify(res) === 'HARD');
}
