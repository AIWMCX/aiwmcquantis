// L9 — Cold-start storm: first hit after idle, across N functions.
// PASS: first-response p95 < 6 s, hard==0.

import http from 'k6/http';
import { Rate } from 'k6/metrics';
import { env, classify } from './lib/env.js';
import { L9 } from './thresholds.js';

const hardErrorRate = new Rate('hard_error_rate');

const COLD_FNS = [
  'analyze',
  'analysis-engine',
  'pdf-export',
  'document-export',
  'benchmarks-query',
  'create-checkout-session',
  'entitlements-snapshot',
  'admin-health-sweep',
];

export const options = {
  scenarios: {
    cold: { executor: 'per-vu-iterations', vus: 20, iterations: 1, maxDuration: '2m' },
  },
  thresholds: L9,
};

export function setup() {
  // Brief idle window for staging-side instances to scale down.
  return env();
}

export default function (data) {
  const fn = COLD_FNS[__VU % COLD_FNS.length];
  const res = http.get(`${data.baseUrl}/functions/v1/${fn}?health=1`, {
    headers: { apikey: data.anonKey, Authorization: `Bearer ${data.anonKey}` },
    tags: { kind: 'cold', fn },
    timeout: '15s',
  });
  hardErrorRate.add(classify(res) === 'HARD');
}
