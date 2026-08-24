/**
 * Reproducible verification for dahl-adapter.ts.
 *
 * Run with:
 *   deno test --allow-net --allow-env supabase/functions/_shared/dahl-adapter.test.ts
 *
 * Uses a real local Deno.serve mock server (same pattern as otel.test.ts) to
 * stand in for inference.dahl.global — never hits the real Dahl API. Not
 * wired into CI yet (no `deno test` step exists in this repo's workflows —
 * same pre-existing gap noted in otel.test.ts / docs/OPEN_DEFECTS.json
 * QNT-DEFECT-014), so this is a re-runnable, on-demand proof rather than a
 * CI gate. Each test calls __resetDahlCachesForTests() to reset the
 * module-level catalog/status caches (a test-only export) rather than
 * relying on module re-import for isolation.
 */
import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  dahlChatCompletion,
  resolveDahlModel,
  isDahlEnabled,
  isDahlFallbackEnabled,
  __resetDahlCachesForTests,
  __isAllowedDahlBaseForTests as isAllowedDahlBase,
  __dahlBaseUrlForTests as dahlBaseUrlForTests,
  __DAHL_DEFAULT_BASE_FOR_TESTS as DAHL_DEFAULT_BASE,
} from "./dahl-adapter.ts";

interface MockServerOpts {
  modelsBody?: unknown;
  statusBody?: unknown;
  chatHandler?: (req: Request, attempt: number) => Response | Promise<Response>;
}

function startMockServer(opts: MockServerOpts) {
  let chatAttempts = 0;
  let totalRequests = 0;
  const capturedAuthHeaders: (string | null)[] = [];
  const server = Deno.serve({ port: 0 }, async (req) => {
    totalRequests++;
    const url = new URL(req.url);
    if (url.pathname === "/v1/models") {
      return Response.json(opts.modelsBody ?? { data: [], object: "list" });
    }
    if (url.pathname === "/v1/status") {
      return Response.json(opts.statusBody ?? { models: [], window: "24h" });
    }
    if (url.pathname === "/v1/chat/completions") {
      capturedAuthHeaders.push(req.headers.get("authorization"));
      chatAttempts++;
      if (opts.chatHandler) return await opts.chatHandler(req, chatAttempts);
      return Response.json({ choices: [{ message: { content: "default" } }] });
    }
    return new Response("not found", { status: 404 });
  });
  const addr = server.addr as Deno.NetAddr;
  return {
    server,
    baseUrl: `http://127.0.0.1:${addr.port}/v1`,
    capturedAuthHeaders,
    getChatAttempts: () => chatAttempts,
    getTotalRequests: () => totalRequests,
  };
}

function setUpEnv(baseUrl: string, apiKey: string | null) {
  __resetDahlCachesForTests();
  Deno.env.set("DAHL_BASE_URL", baseUrl);
  if (apiKey === null) Deno.env.delete("DAHL_API_KEY");
  else Deno.env.set("DAHL_API_KEY", apiKey);
}

const LIVE_MODELS = {
  data: [
    { id: "moonshotai/Kimi-K2.6", object: "model", created: 1, owned_by: "gonka" },
    { id: "MiniMaxAI/MiniMax-M2.7", object: "model", created: 1, owned_by: "gonka" },
    { id: "deepseek-ai/DeepSeek-V4-Flash-0731", object: "model", created: 1, owned_by: "gonka" },
  ],
  object: "list",
};
const LIVE_STATUS_ALL_UP = {
  models: [
    { id: "moonshotai/Kimi-K2.6", operational: true, uptime: 94.44 },
    { id: "MiniMaxAI/MiniMax-M2.7", operational: true, uptime: 99.31 },
    { id: "deepseek-ai/DeepSeek-V4-Flash-0731", operational: true, uptime: 97.22 },
  ],
  window: "24h",
};

Deno.test("dahlChatCompletion fails closed with a config error when DAHL_API_KEY is absent, with zero network calls", async () => {
  const { server, baseUrl, getChatAttempts } = startMockServer({ modelsBody: LIVE_MODELS, statusBody: LIVE_STATUS_ALL_UP });
  setUpEnv(baseUrl, null);

  const result = await dahlChatCompletion({ alias: "general", messages: [{ role: "user", content: "hi" }] });

  assertEquals(result.ok, false);
  assertEquals((result as { kind: string }).kind, "config");
  assertEquals((result as { retryable: boolean }).retryable, false);
  assertEquals(getChatAttempts(), 0);
  await server.shutdown();
});

Deno.test("dahlChatCompletion sends exactly 'Bearer <key>' and never logs/echoes the key in the result", async () => {
  const { server, baseUrl, capturedAuthHeaders } = startMockServer({
    modelsBody: LIVE_MODELS,
    statusBody: LIVE_STATUS_ALL_UP,
    chatHandler: () => Response.json({ choices: [{ message: { content: "hello" } }], usage: { prompt_tokens: 3, completion_tokens: 2 } }),
  });
  setUpEnv(baseUrl, "sk-test-secret-value-12345");

  const result = await dahlChatCompletion({ alias: "general", messages: [{ role: "user", content: "hi" }] });

  assertEquals(result.ok, true);
  assertEquals(capturedAuthHeaders, ["Bearer sk-test-secret-value-12345"]);
  assert(!JSON.stringify(result).includes("sk-test-secret-value-12345"));
  await server.shutdown();
});

Deno.test("resolveDahlModel prefers the alias's first live+operational catalog entry", async () => {
  const { server, baseUrl } = startMockServer({ modelsBody: LIVE_MODELS, statusBody: LIVE_STATUS_ALL_UP });
  setUpEnv(baseUrl, "sk-test");

  assertEquals(await resolveDahlModel("general"), "MiniMaxAI/MiniMax-M2.7");
  __resetDahlCachesForTests();
  assertEquals(await resolveDahlModel("long_reasoning"), "moonshotai/Kimi-K2.6");
  __resetDahlCachesForTests();
  assertEquals(await resolveDahlModel("fast_reasoning"), "deepseek-ai/DeepSeek-V4-Flash-0731");
  await server.shutdown();
});

Deno.test("resolveDahlModel skips a preferred model reported non-operational and falls to the next preference", async () => {
  const { server, baseUrl } = startMockServer({
    modelsBody: LIVE_MODELS,
    statusBody: {
      models: [
        { id: "MiniMaxAI/MiniMax-M2.7", operational: false },
        { id: "deepseek-ai/DeepSeek-V4-Flash-0731", operational: true },
        { id: "moonshotai/Kimi-K2.6", operational: true },
      ],
    },
  });
  setUpEnv(baseUrl, "sk-test");

  assertEquals(await resolveDahlModel("general"), "deepseek-ai/DeepSeek-V4-Flash-0731");
  await server.shutdown();
});

Deno.test("resolveDahlModel never invents an undocumented model when the live catalog is empty and there's no cache", async () => {
  const { server, baseUrl } = startMockServer({ modelsBody: { data: [], object: "list" } });
  setUpEnv(baseUrl, "sk-test");

  assertEquals(await resolveDahlModel("general"), null);
  await server.shutdown();
});

Deno.test("dahlChatCompletion maps 401 to a non-retryable auth error", async () => {
  const { server, baseUrl, getChatAttempts } = startMockServer({
    modelsBody: LIVE_MODELS,
    statusBody: LIVE_STATUS_ALL_UP,
    chatHandler: () => new Response("unauthorized", { status: 401 }),
  });
  setUpEnv(baseUrl, "sk-test");

  const result = await dahlChatCompletion({ alias: "general", messages: [{ role: "user", content: "hi" }] });
  assertEquals(result.ok, false);
  assertEquals((result as { kind: string }).kind, "auth");
  assertEquals((result as { retryable: boolean }).retryable, false);
  assertEquals(getChatAttempts(), 1);
  await server.shutdown();
});

Deno.test("dahlChatCompletion maps 402 to a non-retryable exhausted error", async () => {
  const { server, baseUrl, getChatAttempts } = startMockServer({
    modelsBody: LIVE_MODELS,
    statusBody: LIVE_STATUS_ALL_UP,
    chatHandler: () => new Response("payment required", { status: 402 }),
  });
  setUpEnv(baseUrl, "sk-test");

  const result = await dahlChatCompletion({ alias: "general", messages: [{ role: "user", content: "hi" }] });
  assertEquals(result.ok, false);
  assertEquals((result as { kind: string }).kind, "exhausted");
  assertEquals((result as { retryable: boolean }).retryable, false);
  assertEquals(getChatAttempts(), 1);
  await server.shutdown();
});

Deno.test("dahlChatCompletion retries 429 up to MAX_RETRIES then returns rate_limit", async () => {
  const { server, baseUrl, getChatAttempts } = startMockServer({
    modelsBody: LIVE_MODELS,
    statusBody: LIVE_STATUS_ALL_UP,
    chatHandler: () => new Response("rate limited", { status: 429, headers: { "retry-after": "0" } }),
  });
  setUpEnv(baseUrl, "sk-test");

  const result = await dahlChatCompletion({ alias: "general", messages: [{ role: "user", content: "hi" }] });
  assertEquals(result.ok, false);
  assertEquals((result as { kind: string }).kind, "rate_limit");
  assertEquals((result as { retryable: boolean }).retryable, true);
  assertEquals(getChatAttempts(), 3);
  await server.shutdown();
});

Deno.test("dahlChatCompletion recovers on the 2nd attempt after a transient 503", async () => {
  const { server, baseUrl, getChatAttempts } = startMockServer({
    modelsBody: LIVE_MODELS,
    statusBody: LIVE_STATUS_ALL_UP,
    chatHandler: (_req, attempt) =>
      attempt < 2
        ? new Response("unavailable", { status: 503 })
        : Response.json({ choices: [{ message: { content: "recovered" } }] }),
  });
  setUpEnv(baseUrl, "sk-test");

  const result = await dahlChatCompletion({ alias: "general", messages: [{ role: "user", content: "hi" }] });
  assertEquals(result.ok, true);
  assertEquals((result as { content: string }).content, "recovered");
  assertEquals(getChatAttempts(), 2);
  await server.shutdown();
});

Deno.test("dahlChatCompletion treats missing choices[0].message.content as invalid_response, not success", async () => {
  const { server, baseUrl } = startMockServer({
    modelsBody: LIVE_MODELS,
    statusBody: LIVE_STATUS_ALL_UP,
    chatHandler: () => Response.json({ choices: [{ message: {} }] }),
  });
  setUpEnv(baseUrl, "sk-test");

  const result = await dahlChatCompletion({ alias: "general", messages: [{ role: "user", content: "hi" }] });
  assertEquals(result.ok, false);
  assertEquals((result as { kind: string }).kind, "invalid_response");
  await server.shutdown();
});

Deno.test("dahlChatCompletion treats malformed (non-JSON) success body as invalid_response", async () => {
  const { server, baseUrl } = startMockServer({
    modelsBody: LIVE_MODELS,
    statusBody: LIVE_STATUS_ALL_UP,
    chatHandler: () => new Response("not json", { status: 200 }),
  });
  setUpEnv(baseUrl, "sk-test");

  const result = await dahlChatCompletion({ alias: "general", messages: [{ role: "user", content: "hi" }] });
  assertEquals(result.ok, false);
  assertEquals((result as { kind: string }).kind, "invalid_response");
  await server.shutdown();
});

Deno.test("dahlChatCompletion sanitizes a 5xx that isn't in the retry set into a first-party error (no raw body/status leaked)", async () => {
  const { server, baseUrl } = startMockServer({
    modelsBody: LIVE_MODELS,
    statusBody: LIVE_STATUS_ALL_UP,
    chatHandler: () => new Response("Internal secret trace: db password xyz", { status: 418 }),
  });
  setUpEnv(baseUrl, "sk-test");

  const result = await dahlChatCompletion({ alias: "general", messages: [{ role: "user", content: "hi" }] });
  assertEquals(result.ok, false);
  assert(!(result as { message: string }).message.includes("secret"));
  assert(!(result as { message: string }).message.includes("password"));
  await server.shutdown();
});

Deno.test("isDahlEnabled / isDahlFallbackEnabled read exact string 'true' only", () => {
  Deno.env.set("DAHL_ENABLED", "false");
  assertEquals(isDahlEnabled(), false);
  Deno.env.set("DAHL_ENABLED", "true");
  assertEquals(isDahlEnabled(), true);
  Deno.env.delete("DAHL_ENABLED");
  assertEquals(isDahlEnabled(), false);

  Deno.env.set("DAHL_FALLBACK_ENABLED", "true");
  assertEquals(isDahlFallbackEnabled(), true);
  Deno.env.delete("DAHL_FALLBACK_ENABLED");
  assertEquals(isDahlFallbackEnabled(), false);
});

Deno.test("dahl base URL allowlist rejects prefix-lookalike and userinfo-embedded hosts, accepts only the real origin or loopback", () => {
  // The exact bypass vectors a naive `configured.startsWith(DAHL_ORIGIN)`
  // check would wrongly admit -- all start with the right characters but
  // resolve (via URL parsing) to a completely different origin.
  assert(!isAllowedDahlBase("https://inference.dahl.global.evil.example/v1"));
  assert(!isAllowedDahlBase("https://inference.dahl.global@evil.example/v1"));
  assert(!isAllowedDahlBase("https://inference.dahl.globalx/v1"));
  assert(!isAllowedDahlBase("https://evil.example.com/v1"));
  // Embedded userinfo on an otherwise-correct-looking host must also be
  // rejected (classic origin-check bypass vector).
  assert(!isAllowedDahlBase("https://user:pass@inference.dahl.global/v1"));
  // Wrong protocol on the real host is not the real origin either.
  assert(!isAllowedDahlBase("http://inference.dahl.global/v1"));
  // Not a URL at all.
  assert(!isAllowedDahlBase("not a url"));

  // Positive cases: the real origin, and the test-only loopback exception.
  assert(isAllowedDahlBase("https://inference.dahl.global/v1"));
  assert(isAllowedDahlBase("http://127.0.0.1:54321/v1"));
  assert(isAllowedDahlBase("http://localhost:54321/v1"));
  // Loopback exception is HTTP-only -- https on loopback is not the
  // documented exception and must not silently be treated as one.
  assert(!isAllowedDahlBase("https://127.0.0.1:54321/v1"));
});

Deno.test("dahlBaseUrl() resolves a rejected origin to the real Dahl default -- hermetic, no network call", () => {
  // Uses the same resolution function dahlChatCompletion/resolveDahlModel
  // call internally, but asserts on its return value directly instead of
  // going through a real fetch -- a rejected DAHL_BASE_URL would otherwise
  // fall through to the REAL Dahl API, making this non-hermetic and slow.
  Deno.env.set("DAHL_BASE_URL", "https://evil.example.com/v1");
  assertEquals(dahlBaseUrlForTests(), DAHL_DEFAULT_BASE);

  Deno.env.set("DAHL_BASE_URL", "https://inference.dahl.global.evil.example/v1");
  assertEquals(dahlBaseUrlForTests(), DAHL_DEFAULT_BASE);
});

Deno.test("dahl base URL allowlist: the loopback exception reaches our own mock server end-to-end", async () => {
  const { server, baseUrl, getTotalRequests } = startMockServer({
    modelsBody: { data: [{ id: "should-not-be-used", object: "model", created: 1, owned_by: "x" }] },
  });
  __resetDahlCachesForTests();
  Deno.env.set("DAHL_API_KEY", "sk-test");
  Deno.env.set("DAHL_BASE_URL", baseUrl);

  const result = await resolveDahlModel("general");
  assertEquals(result, "should-not-be-used");
  assert(getTotalRequests() > 0);

  await server.shutdown();
});
