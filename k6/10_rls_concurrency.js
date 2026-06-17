// L10 — 50 distinct users read their own analyses concurrently.
// PASS: zero cross-tenant rows leaked.
//
// Requires K6_TEST_USER_JWTS = JSON array of staging user JWTs and matching
// K6_TEST_USER_IDS = JSON array of their user IDs in the same order.
// LOADTEST.md documents how the staging seed produces these.

import http from 'k6/http';
import { Counter, Rate } from 'k6/metrics';
import { env, classify } from './lib/env.js';
import { L10 } from './thresholds.js';

const hardErrorRate = new Rate('hard_error_rate');
const rlsCrossTenantRows = new Counter('rls_cross_tenant_rows');

export const options = {
  scenarios: {
    fifty_users: { executor: 'per-vu-iterations', vus: 50, iterations: 4, maxDuration: '2m' },
  },
  thresholds: L10,
};

export function setup() {
  const e = env();
  const jwts = JSON.parse(__ENV.K6_TEST_USER_JWTS || '[]');
  const ids = JSON.parse(__ENV.K6_TEST_USER_IDS || '[]');
  if (jwts.length < 50 || ids.length !== jwts.length) {
    throw new Error('[k6-safety] L10 needs 50 paired (jwt, user_id) staging fixtures');
  }
  return { ...e, jwts, ids };
}

export default function (data) {
  const idx = (__VU - 1) % data.jwts.length;
  const jwt = data.jwts[idx];
  const myId = data.ids[idx];
  const res = http.get(
    `${data.baseUrl}/rest/v1/analyses?select=id,user_id&limit=100`,
    {
      headers: {
        apikey: data.anonKey,
        Authorization: `Bearer ${jwt}`,
      },
      tags: { kind: 'rls' },
      timeout: '10s',
    },
  );
  hardErrorRate.add(classify(res) === 'HARD');
  try {
    const rows = res.json();
    if (Array.isArray(rows)) {
      for (const r of rows) {
        if (r.user_id && r.user_id !== myId) rlsCrossTenantRows.add(1);
      }
    }
  } catch {
    /* */
  }
}
