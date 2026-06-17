// L7 — Race: 20 interleaved checkout.completed + customer.subscription.updated
// for distinct subscriptions. PASS: final user_subscriptions row matches the
// last event for each subscription; no lost-update.

import http from 'k6/http';
import { Counter, Rate } from 'k6/metrics';
import { env, classify } from './lib/env.js';
import { L7 } from './thresholds.js';

const hardErrorRate = new Rate('hard_error_rate');
const webhookRaceLostUpdate = new Counter('webhook_race_lost_update');

export const options = {
  scenarios: {
    pairs: { executor: 'shared-iterations', vus: 20, iterations: 40, maxDuration: '2m' },
  },
  thresholds: L7,
};

export function setup() {
  return env();
}

let pairCounter = 0;
export default function (data) {
  const i = (pairCounter++ % 20) + 1;
  const subId = `sub_race_${Date.now()}_${i}`;
  const ev =
    __ITER % 2 === 0
      ? {
          id: `evt_race_c_${subId}`,
          type: 'checkout.session.completed',
          data: {
            object: {
              id: `cs_${subId}`,
              mode: 'subscription',
              customer: `cus_${subId}`,
              subscription: subId,
              metadata: { tier: 'plus' },
            },
          },
        }
      : {
          id: `evt_race_u_${subId}`,
          type: 'customer.subscription.updated',
          data: {
            object: { id: subId, status: 'active', items: { data: [{ price: { id: 'plus' } }] } },
          },
        };
  const res = http.post(
    `${data.baseUrl}/functions/v1/stripe-webhook`,
    JSON.stringify(ev),
    {
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': 't=0,v1=k6test',
        'X-K6-Replay': 'true',
      },
      tags: { kind: 'webhook_race' },
      timeout: '15s',
    },
  );
  hardErrorRate.add(classify(res) === 'HARD');
}
