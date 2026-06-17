// L3 — Full pipeline (engine + AI narrative + RVCE) at 1, 10, 100 concurrent.
// PASS: at 1 & 10 VU complete-verdict rate >= 99.5%. At 100 VU hard==0 and any
//       non-completion MUST be a graceful BACKPRESSURE envelope.

import http from 'k6/http';
import { Counter, Rate } from 'k6/metrics';
import { env, classify } from './lib/env.js';
import { L3_LOW, L3_HIGH } from './thresholds.js';

const hardErrorRate = new Rate('hard_error_rate');
const verdictCompleteRate = new Rate('verdict_complete_rate');
const backpressure = new Counter('backpressure_envelopes');

const PHASE = __ENV.K6_PHASE || 'low'; // 'low' = 1/10 VU, 'high' = 100 VU

export const options =
  PHASE === 'high'
    ? {
        scenarios: {
          concurrent_100: { executor: 'constant-vus', vus: 100, duration: '2m' },
        },
        thresholds: L3_HIGH,
      }
    : {
        scenarios: {
          one_vu: { executor: 'constant-vus', vus: 1, duration: '30s', exec: 'run' },
          ten_vu: {
            executor: 'constant-vus',
            vus: 10,
            duration: '1m',
            exec: 'run',
            startTime: '35s',
          },
        },
        thresholds: L3_LOW,
      };

export function setup() {
  return env();
}

const REQUIRED = ['verdict', 'monthlyProfit', 'narrative'];

export function run(data) {
  defaultFn(data);
}
export default function (data) {
  defaultFn(data);
}

function defaultFn(data) {
  const url = `${data.baseUrl}/functions/v1/analyze`;
  const payload = JSON.stringify({
    idea: 'k6 full-pipeline load test — SaaS for freelance bookkeepers',
    location: 'Austin, USA',
    revenue: 12000,
    customers: 80,
  });
  const res = http.post(url, payload, {
    headers: {
      apikey: data.anonKey,
      Authorization: `Bearer ${data.anonKey}`,
      'Content-Type': 'application/json',
    },
    tags: { kind: 'pipeline', phase: PHASE },
    timeout: '90s',
  });
  const cls = classify(res, { requiredFields: REQUIRED });
  hardErrorRate.add(cls === 'HARD');
  verdictCompleteRate.add(cls === 'OK');
  if (cls === 'BACKPRESSURE') backpressure.add(1);
}
