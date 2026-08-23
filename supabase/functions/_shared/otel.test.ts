/**
 * Reproducible verification for otel.ts (the OpenTelemetry pilot).
 *
 * Run with:
 *   deno test --allow-net --allow-env supabase/functions/_shared/otel.test.ts
 *
 * Not wired into CI (no `deno test` step exists in this repo's workflows
 * yet — see docs/OPEN_DEFECTS.json QNT-DEFECT-014's next_action). This file
 * exists so the claims in docs/RELEASE_EVIDENCE.json EV-047–049 are an
 * actually re-runnable command, not a one-off scratch script whose output
 * can only be taken on faith.
 */
import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { traced, flushSpans, parseOtlpHeaders } from "./otel.ts";

Deno.test("traced() exports spec-correct OTLP JSON to a real collector, success case", async () => {
  const received: Record<string, unknown>[] = [];
  const server = Deno.serve({ port: 0 }, async (req) => {
    received.push(await req.json());
    return new Response(null, { status: 200 });
  });
  const addr = server.addr as Deno.NetAddr;
  Deno.env.set("OTEL_EXPORTER_OTLP_ENDPOINT", `http://127.0.0.1:${addr.port}`);
  Deno.env.set("OTEL_SERVICE_NAME", "quantis-edge-test");

  const result = await traced("test.success_case", { request_id: "q_test_123", attempt: 1 }, async () => {
    await new Promise((r) => setTimeout(r, 5));
    return "ok-value";
  });
  assertEquals(result, "ok-value");

  await new Promise((r) => setTimeout(r, 50));
  await flushSpans();
  await server.shutdown();

  assertEquals(received.length, 1);
  const span = (received[0] as any).resourceSpans[0].scopeSpans[0].spans[0];
  assertEquals(
    (received[0] as any).resourceSpans[0].resource.attributes[0].value.stringValue,
    "quantis-edge-test",
  );
  assert(/^[0-9a-f]{32}$/.test(span.traceId), "traceId must be 32 hex chars (128-bit)");
  assert(/^[0-9a-f]{16}$/.test(span.spanId), "spanId must be 16 hex chars (64-bit)");
  assertEquals(span.name, "test.success_case");
  assertEquals(span.status.code, 1); // STATUS_CODE_OK
  assert(
    span.attributes.some((a: any) => a.key === "request_id" && a.value.stringValue === "q_test_123"),
    "request_id attribute must be present for correlation with logger.ts",
  );
  assert(BigInt(span.startTimeUnixNano) < BigInt(span.endTimeUnixNano), "start must precede end");

  Deno.env.delete("OTEL_EXPORTER_OTLP_ENDPOINT");
  Deno.env.delete("OTEL_SERVICE_NAME");
});

Deno.test("traced() records ERROR status and still propagates the original error", async () => {
  const received: Record<string, unknown>[] = [];
  const server = Deno.serve({ port: 0 }, async (req) => {
    received.push(await req.json());
    return new Response(null, { status: 200 });
  });
  const addr = server.addr as Deno.NetAddr;
  Deno.env.set("OTEL_EXPORTER_OTLP_ENDPOINT", `http://127.0.0.1:${addr.port}`);

  let threw = false;
  try {
    await traced("test.failure_case", { request_id: "q_test_456" }, async () => {
      throw new Error("deliberate test failure");
    });
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message, "deliberate test failure");
  }
  assert(threw, "traced() must propagate the wrapped function's original error");

  await new Promise((r) => setTimeout(r, 50));
  await flushSpans();
  await server.shutdown();

  const span = received.flatMap((r: any) => r.resourceSpans[0].scopeSpans[0].spans)[0];
  assertEquals(span.status.code, 2); // STATUS_CODE_ERROR
  assertEquals(span.status.message, "deliberate test failure");

  Deno.env.delete("OTEL_EXPORTER_OTLP_ENDPOINT");
});

Deno.test("traced() is a true no-op when OTEL_EXPORTER_OTLP_ENDPOINT is unset (today's real state everywhere)", async () => {
  Deno.env.delete("OTEL_EXPORTER_OTLP_ENDPOINT");
  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
    fetchCalled = true;
    return originalFetch(...args);
  }) as typeof fetch;

  try {
    const result = await traced("test.noop_case", { x: 1 }, async () => "value-passed-through");
    assertEquals(result, "value-passed-through");
    await new Promise((r) => setTimeout(r, 20));
    assertEquals(fetchCalled, false, "no network call should be attempted when the endpoint is unset");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("parseOtlpHeaders correctly parses the standard OTel 'key1=value1,key2=value2' format", () => {
  assertEquals(parseOtlpHeaders(""), {});
  assertEquals(parseOtlpHeaders("x-honeycomb-team=fake-test-key"), { "x-honeycomb-team": "fake-test-key" });
  assertEquals(
    parseOtlpHeaders("x-honeycomb-team=fake-test-key,x-other=val"),
    { "x-honeycomb-team": "fake-test-key", "x-other": "val" },
  );
  // Malformed entries (no '=', or empty key/value) are skipped, not thrown.
  assertEquals(parseOtlpHeaders("garbage,also-garbage="), {});
});
