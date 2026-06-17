// L6 — Replay ONE Stripe TEST event.id 50× concurrently.
// PASS: exactly ONE user_subscriptions provision, 49 idempotent no-ops.

import http from 'k6/http';
import { Counter, Rate } from 'k6/metrics';
import { env, classify } from './lib/env.js';
import { L6 } from './thresholds.js';

const hardErrorRate = new Rate('hard_error_rate');
const webhookDuplicateProvision = new Counter('webhook_duplicate_provision');
const acceptedReplays = new Counter('accepted_replays');

const EVENT_ID = __ENV.K6_FIXED_EVENT_ID || `evt_k6_test_${Date.now()}`;

const FIXTURE = {
  id: EVENT_ID,
  object: 'event',
  type: 'checkout.session.completed',
  livemode: false,
  data: {
    object: {
      id: `cs_test_${EVENT_ID}`,
      mode: 'subscription',
      customer: `cus_test_${EVENT_ID}`,
      subscription: `sub_test_${EVENT_ID}`,
      customer_email: `k6-${EVENT_ID}@example.test`,
      metadata: { tier: 'plus', source: 'k6-loadtest' },
    },
  },
};

export const options = {
  scenarios: {
    replay_50: { executor: 'shared-iterations', vus: 50, iterations: 50, maxDuration: '1m' },
  },
  thresholds: L6,
};

export function setup() {
  const e = env();
  if (!e.testWebhookSecret) {
    throw new Error('[k6-safety] K6_STRIPE_WEBHOOK_SECRET required for L6');
  }
  return e;
}

export default function (data) {
  const body = JSON.stringify(FIXTURE);
  // Stripe-Signature is validated by the webhook; a CI-only test secret is set
  // server-side in the staging project to accept fixtures whose payload hash
  // matches. See LOADTEST.md for the staging setup.
  const res = http.post(`${data.baseUrl}/functions/v1/stripe-webhook`, body, {
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': `t=0,v1=k6test`,
      'X-K6-Replay': 'true',
    },
    tags: { kind: 'webhook_idem' },
    timeout: '15s',
  });
  hardErrorRate.add(classify(res) === 'HARD');

  let body2 = null;
  try {
    body2 = res.json();
  } catch {
    /* */
  }
  if (body2?.provisioned === true) acceptedReplays.add(1);
}

export function teardown(data) {
  // Verify exactly-once via the entitlements snapshot.
  const r = http.get(
    `${data.baseUrl}/functions/v1/admin-health-sweep?event_id=${EVENT_ID}`,
    {
      headers: {
        apikey: data.anonKey,
        Authorization: `Bearer ${data.anonKey}`,
      },
    },
  );
  try {
    const b = r.json();
    if (typeof b?.provision_count === 'number' && b.provision_count > 1) {
      webhookDuplicateProvision.add(b.provision_count - 1);
    }
  } catch {
    /* the CI step also asserts via a SQL probe in loadtest.yml */
  }
}
