/**
 * k6 Load Test — Quantis Document Generation Engine
 *
 * Usage:
 *   k6 run tests/k6-doc-generation.js \
 *     --env SUPABASE_URL=https://dmlxrvfyqsakyjomsvdj.supabase.co \
 *     --env SUPABASE_ANON_KEY=<anon_key> \
 *     --env AUTH_TOKEN=<user_jwt>
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ─── Custom metrics ───────────────────────────────
const errorRate = new Rate('doc_error_rate');
const cacheHitRate = new Rate('doc_cache_hit_rate');
const generationTime = new Trend('doc_generation_ms', true);

// ─── Thresholds ───────────────────────────────────
export const options = {
  scenarios: {
    // Phase 1: baseline warm-up
    baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '3m', target: 100 },
      ],
      gracefulRampDown: '30s',
      exec: 'fastPathTest',
    },
    // Phase 2: cache effectiveness
    cache_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 500 },
        { duration: '3m', target: 1000 },
      ],
      startTime: '5m',
      gracefulRampDown: '30s',
      exec: 'cacheTest',
    },
    // Phase 3: queue throughput (async path)
    queue_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 200 },
        { duration: '3m', target: 500 },
      ],
      startTime: '10m',
      gracefulRampDown: '30s',
      exec: 'queueTest',
    },
    // Phase 4: spike test
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5000 },
        { duration: '2m', target: 5000 },
        { duration: '1m', target: 0 },
      ],
      startTime: '15m',
      gracefulRampDown: '30s',
      exec: 'fastPathTest',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    doc_error_rate: ['rate<0.001'],
    doc_cache_hit_rate: ['rate>0.70'],
    doc_generation_ms: ['p(95)<3000', 'p(99)<5000'],
  },
};

// ─── Helpers ──────────────────────────────────────
const BASE_URL = __ENV.SUPABASE_URL || 'https://dmlxrvfyqsakyjomsvdj.supabase.co';
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

function headers() {
  return {
    'Content-Type': 'application/json',
    apikey: ANON_KEY,
    Authorization: `Bearer ${AUTH_TOKEN}`,
  };
}

// ─── Fast-path: invoice / one-pager (<500ms target) ──
export function fastPathTest() {
  group('Fast Path — Invoice', () => {
    const payload = JSON.stringify({
      templateId: 'invoice_standard_v1',
      analysisId: 'load-test-analysis-' + (__VU % 10),
      userId: 'load-test-user',
    });

    const res = http.post(
      `${BASE_URL}/functions/v1/generate-document-content`,
      payload,
      { headers: headers(), tags: { path: 'fast' } },
    );

    const ok = check(res, {
      'status 200': (r) => r.status === 200,
      'has body': (r) => r.body && r.body.length > 0,
      'under 3s': (r) => r.timings.duration < 3000,
    });

    errorRate.add(!ok);
    generationTime.add(res.timings.duration);

    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        cacheHitRate.add(!!body.cacheHit);
      } catch (_) {
        // ignore parse errors
      }
    }
  });

  sleep(0.5 + Math.random());
}

// ─── Cache test: 80% same analysis_id ─────────────
export function cacheTest() {
  group('Cache Effectiveness', () => {
    // 80% of requests hit the same analysis for cache warm-up
    const analysisId = Math.random() < 0.8
      ? 'cache-test-shared-analysis'
      : 'cache-test-unique-' + __ITER;

    const payload = JSON.stringify({
      templateId: 'executive_summary_v1',
      analysisId,
      userId: 'load-test-user',
    });

    const res = http.post(
      `${BASE_URL}/functions/v1/generate-document-content`,
      payload,
      { headers: headers(), tags: { path: 'cache' } },
    );

    const ok = check(res, {
      'status 200': (r) => r.status === 200,
      'under 2s': (r) => r.timings.duration < 2000,
    });

    errorRate.add(!ok);

    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        cacheHitRate.add(!!body.cacheHit);
      } catch (_) {}
    }
  });

  sleep(0.3 + Math.random() * 0.5);
}

// ─── Queue test: business plans (async path) ──────
export function queueTest() {
  group('Async Queue — Business Plan', () => {
    const payload = JSON.stringify({
      templateId: 'business_plan_v1',
      analysisId: 'queue-test-analysis-' + (__VU % 20),
      userId: 'load-test-user',
    });

    const res = http.post(
      `${BASE_URL}/functions/v1/doc-queue-worker`,
      payload,
      { headers: headers(), tags: { path: 'queue' } },
    );

    const ok = check(res, {
      'status 200 or 202': (r) => r.status === 200 || r.status === 202,
      'has jobId': (r) => {
        try {
          return JSON.parse(r.body).jobId !== undefined;
        } catch (_) {
          return false;
        }
      },
    });

    errorRate.add(!ok);
  });

  sleep(1 + Math.random());
}
