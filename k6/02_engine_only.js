// L2 — Deterministic engine path under load (LLM/RVCE stage stubbed).
// PASS: p95 < 800 ms, p99 < 1.5 s, hard==0, every body has a COMPLETE verdict.

import http from 'k6/http';
import { Rate } from 'k6/metrics';
import { env, classify } from './lib/env.js';
import { L2 } from './thresholds.js';

const hardErrorRate = new Rate('hard_error_rate');
const verdictCompleteRate = new Rate('verdict_complete_rate');

export const options = {
  scenarios: {
    ramp_100: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: L2,
};

export function setup() {
  return env();
}

const REQUIRED = ['verdict', 'monthlyProfit', 'paybackMonths', 'breakEvenUnits'];

export default function (data) {
  const url = `${data.baseUrl}/functions/v1/analysis-engine`;
  const payload = JSON.stringify({
    idea: 'k6 deterministic engine load test',
    location: 'New York, USA',
    // Hint the function to skip the LLM/RVCE narrative stage.
    mode: 'deterministic_only',
    skip_narrative: true,
  });
  const res = http.post(url, payload, {
    headers: {
      apikey: data.anonKey,
      Authorization: `Bearer ${data.anonKey}`,
      'Content-Type': 'application/json',
    },
    tags: { kind: 'engine' },
    timeout: '30s',
  });
  const cls = classify(res, { requiredFields: REQUIRED });
  hardErrorRate.add(cls === 'HARD');
  verdictCompleteRate.add(cls === 'OK');
}
