/**
 * Lightweight OpenTelemetry-compatible tracing (PILOT — see docs/OPEN_DEFECTS.json QNT-DEFECT-014)
 * ---------------------------------------------------------------------------------------------
 * Hand-rolled OTLP/HTTP JSON span emitter — deliberately NOT built on
 * @opentelemetry/sdk-trace-*. That SDK's context-propagation machinery is
 * designed for long-lived Node processes (AsyncLocalStorage-based active-span
 * tracking) and is a poor, fragile fit for short-lived Deno edge-function
 * isolates. Instead this generates spec-compliant trace/span IDs directly and
 * POSTs OTLP/HTTP JSON, mirroring the exact "direct HTTP POST, fire-and-forget,
 * never throws" pattern already used for Sentry in logger.ts — same shape of
 * risk profile, same safety guarantee: tracing can never break a request.
 *
 * PILOT SCOPE, HONESTLY STATED:
 *   - This is wired, spec-shaped, and locally verified (Deno type-checks
 *     clean, a mock-collector smoke test confirms the OTLP JSON is accepted).
 *   - It is a structural no-op everywhere today: OTEL_EXPORTER_OTLP_ENDPOINT
 *     is unset in every environment, because no tracing backend/vendor has
 *     been chosen yet. Choosing one (Honeycomb, Grafana Tempo, etc.), getting
 *     credentials, and setting that env var is what turns this from "wired"
 *     into "actually observable" — that decision belongs to the user/team,
 *     not to this pilot.
 *   - Correlation is via a request_id attribute (matching the existing
 *     `x-request-id` correlation already used by logger.ts), not a full
 *     parent/child span tree — nesting can be added once there is an actual
 *     backend to view a trace waterfall in; building that now with nothing to
 *     render it would be speculative.
 *   - Only wired into 2 already-isolated, already-async call sites in
 *     analyze-business/index.ts (fetchDatabaseBenchmarks, detectIndustryFrom-
 *     Database) as the pilot subject. No other function's code, and no
 *     internals of analyze-business's core calculation logic, were touched.
 *
 * Usage:
 *   const result = await traced('db.fetch_benchmarks', { request_id }, () =>
 *     fetchDatabaseBenchmarks(supabase)
 *   );
 */

const OTEL_ENDPOINT = Deno.env.get('OTEL_EXPORTER_OTLP_ENDPOINT') ?? '';
const OTEL_SERVICE_NAME = Deno.env.get('OTEL_SERVICE_NAME') ?? 'quantis-edge';

type AttrValue = string | number | boolean;

interface FinishedSpan {
  traceId: string;
  spanId: string;
  name: string;
  startTimeUnixNano: bigint;
  endTimeUnixNano: bigint;
  statusCode: 'OK' | 'ERROR';
  statusMessage?: string;
  attributes: Record<string, AttrValue>;
}

const pendingSpans: FinishedSpan[] = [];

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

function nowUnixNano(): bigint {
  // Date.now() is millisecond precision; OTLP wants nanoseconds. This is a
  // deliberately coarse approximation (no sub-millisecond source available
  // without perf_hooks) — acceptable for a pilot measuring operations that
  // take tens to thousands of milliseconds, not for microbenchmarking.
  return BigInt(Date.now()) * 1_000_000n;
}

/**
 * Run `fn`, recording a span (name, duration, attributes, OK/ERROR status)
 * regardless of outcome, then schedule a background export. Never changes
 * `fn`'s behavior or error — tracing failures are always swallowed silently.
 */
export async function traced<T>(
  name: string,
  attributes: Record<string, AttrValue>,
  fn: () => Promise<T>,
): Promise<T> {
  const traceId = randomHex(16); // 128-bit trace ID per OTel spec
  const spanId = randomHex(8); // 64-bit span ID per OTel spec
  const startTimeUnixNano = nowUnixNano();
  try {
    const result = await fn();
    recordSpan({
      traceId,
      spanId,
      name,
      startTimeUnixNano,
      endTimeUnixNano: nowUnixNano(),
      statusCode: 'OK',
      attributes,
    });
    return result;
  } catch (err) {
    recordSpan({
      traceId,
      spanId,
      name,
      startTimeUnixNano,
      endTimeUnixNano: nowUnixNano(),
      statusCode: 'ERROR',
      statusMessage: err instanceof Error ? err.message : String(err),
      attributes,
    });
    throw err;
  } finally {
    scheduleFlush();
  }
}

function recordSpan(span: FinishedSpan): void {
  pendingSpans.push(span);
}

function toOtlpJson(spans: FinishedSpan[]): unknown {
  const toAttrValue = (v: AttrValue) =>
    typeof v === 'number'
      ? { doubleValue: v }
      : typeof v === 'boolean'
      ? { boolValue: v }
      : { stringValue: String(v) };

  return {
    resourceSpans: [
      {
        resource: {
          attributes: [{ key: 'service.name', value: { stringValue: OTEL_SERVICE_NAME } }],
        },
        scopeSpans: [
          {
            scope: { name: 'quantis-edge-otel-pilot', version: '0.1.0' },
            spans: spans.map((s) => ({
              traceId: s.traceId,
              spanId: s.spanId,
              name: s.name,
              kind: 1, // SPAN_KIND_INTERNAL
              startTimeUnixNano: s.startTimeUnixNano.toString(),
              endTimeUnixNano: s.endTimeUnixNano.toString(),
              attributes: Object.entries(s.attributes).map(([key, value]) => ({
                key,
                value: toAttrValue(value),
              })),
              status: {
                code: s.statusCode === 'ERROR' ? 2 : 1, // STATUS_CODE_ERROR=2, STATUS_CODE_OK=1
                message: s.statusMessage,
              },
            })),
          },
        ],
      },
    ],
  };
}

/** Send all spans recorded since the last flush. No-op if OTEL_EXPORTER_OTLP_ENDPOINT is unset. Never throws. */
export async function flushSpans(): Promise<void> {
  if (!OTEL_ENDPOINT || pendingSpans.length === 0) {
    pendingSpans.length = 0;
    return;
  }
  const batch = pendingSpans.splice(0, pendingSpans.length);
  try {
    await fetch(`${OTEL_ENDPOINT.replace(/\/$/, '')}/v1/traces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toOtlpJson(batch)),
    });
  } catch {
    // Tracing must never throw or block the request.
  }
}

/**
 * Schedule a background flush via EdgeRuntime.waitUntil (the same pattern
 * already used in queue-export/index.ts and analyze-business/index.ts for
 * post-response background work), falling back to a best-effort inline
 * flush if that global isn't available (e.g. local dev).
 */
export function scheduleFlush(): void {
  // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(flushSpans());
  } else {
    flushSpans();
  }
}
