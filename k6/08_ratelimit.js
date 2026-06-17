// L8 — Exceed the Upstash limiter 2×. PASS: clean 429 envelope, no 5xx, no crash.

import http from 'k6/http';
import { Rate, Counter } from 'k6/metrics';
import { env, classify } from './lib/env.js';
import { L8 } from './thresholds.js';

const hardErrorRate = new Rate('hard_error_rate');
const backpressure = new Counter('backpressure_envelopes');

const SHARED_IP_KEY = `k6-rl-${Date.now()}`;

export const options = {
  scenarios: {
    flood: { executor: 'constant-vus', vus: 50, duration: '40s' },
  },
  thresholds: L8,
};

export function setup() {
  return env();
}

export default function (data) {
  const res = http.get(`${data.baseUrl}/functions/v1/benchmarks-query?industry=saas`, {
    headers: {
      apikey: data.anonKey,
      Authorization: `Bearer ${data.anonKey}`,
      'x-forwarded-for': SHARED_IP_KEY,
    },
    tags: { kind: 'ratelimit' },
    timeout: '10s',
  });
  const cls = classify(res);
  hardErrorRate.add(cls === 'HARD');
  if (cls === 'BACKPRESSURE' || res.status === 429) backpressure.add(1);
}
