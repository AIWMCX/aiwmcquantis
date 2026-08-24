#!/usr/bin/env -S deno run --allow-net --allow-env
/**
 * Dahl live smoke test — runs the REAL adapter code (not a reimplementation)
 * against the real inference.dahl.global API using a funded key.
 *
 * Deliberately minimal token spend (maxTokens: 5, trivial prompt). Prints
 * ONLY a sanitized summary: never the raw completion content, never the
 * API key, never a raw upstream response body. Exits non-zero on failure
 * so the GitHub Actions job fails visibly if the key isn't actually funded
 * or the live call doesn't work end-to-end.
 *
 * Run with:
 *   DAHL_API_KEY=... deno run --allow-net --allow-env scripts/dahl-smoke-test.ts
 *
 * Also runnable via the "Dahl Smoke Test" GitHub Actions workflow
 * (workflow_dispatch, environment: production) so it can use the real
 * DAHL_API_KEY secret without it ever leaving GitHub's redacted runner.
 */
import { dahlChatCompletion } from "../supabase/functions/_shared/dahl-adapter.ts";

async function main() {
  const hasKey = !!Deno.env.get("DAHL_API_KEY");
  console.log(`DAHL_API_KEY present: ${hasKey}`);
  if (!hasKey) {
    console.error("FAIL: DAHL_API_KEY is not set in this environment.");
    Deno.exit(1);
  }

  const start = Date.now();
  const result = await dahlChatCompletion({
    alias: "general",
    messages: [{ role: "user", content: "Reply with exactly one word: OK" }],
    maxTokens: 5,
    timeoutMs: 20_000,
  });
  const elapsed = Date.now() - start;

  if (result.ok) {
    console.log("RESULT: ok");
    console.log(`model: ${result.model}`);
    console.log(`input_tokens: ${result.inputTokens}`);
    console.log(`output_tokens: ${result.outputTokens}`);
    console.log(`latency_ms: ${result.latencyMs} (wall: ${elapsed}ms)`);
    console.log(`finish_reason: ${result.finishReason ?? "(none)"}`);
    console.log(`content_length_chars: ${result.content.length}`); // length only, never the content itself
    console.log("SMOKE TEST PASSED: Dahl key is funded and the live chat-completions call succeeded.");
    Deno.exit(0);
  } else {
    console.log("RESULT: failed");
    console.log(`kind: ${result.kind}`);
    console.log(`message: ${result.message}`);
    console.log(`retryable: ${result.retryable}`);
    console.log(`latency_ms: ${result.latencyMs}`);
    if (result.kind === "exhausted") {
      console.error("SMOKE TEST FAILED: key exists but has 0 allocated tokens. Allocate tokens from the account pool to this key.");
    } else if (result.kind === "auth") {
      console.error("SMOKE TEST FAILED: authentication rejected — key may be invalid, revoked, or malformed.");
    } else {
      console.error(`SMOKE TEST FAILED: ${result.kind}`);
    }
    Deno.exit(1);
  }
}

main();
