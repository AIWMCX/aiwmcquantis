import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createTavilyClient } from "../../supabase/functions/_shared/tavily-client";
import {
  duckDuckGoSearch,
  noDataNote,
  noEvidenceRejectionReason,
  providerOutcomeCounts,
  searchWithFallback,
  summarizeAttempts,
  type ProviderAttempt,
} from "../../supabase/functions/rvce-validate/search-outcome";

// F1 (docs/predicta/2026-11-06-phase2-governed-evidence-plan.md §1.4): RVCE's
// Tavily search returned [] on any error and fell back to DuckDuckGo silently,
// so a provider outage looked exactly like "the web has no numbers for this
// metric" and was persisted as no_external_evidence_found.

const jsonResponse = (status: number, body: unknown = {}) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

const htmlResponse = (body: string, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, text: async () => body }) as unknown as Response;

const DDG_PAGE =
  `<a class="result__a" href="//duckduckgo.com/l/?uddg=${encodeURIComponent("https://example.org/bench")}">Coffee shop margins</a>` +
  `<a class="result__snippet" href="#">Typical gross margin is 65%</a>`;
const DDG_EMPTY_PAGE = "<html><body><div class='no-results'>No results.</div></body></html>";

const timeoutError = () => Object.assign(new Error("signal timed out"), { name: "TimeoutError" });

type FetchImpl = (...args: Parameters<typeof fetch>) => Promise<Response>;

const tavilyWith = (impl: FetchImpl, apiKey = "tvly-test") => {
  const fetchImpl = vi.fn(impl);
  return { fetchImpl, client: createTavilyClient({ apiKey, fetchImpl: fetchImpl as unknown as typeof fetch }) };
};

const duckDuckGoWith = (impl: FetchImpl) => {
  const fetchImpl = vi.fn(impl);
  return { fetchImpl, search: (q: string) => duckDuckGoSearch(q, fetchImpl as unknown as typeof fetch) };
};

describe("RVCE search provider outcomes (F1)", () => {
  it("records a Tavily rate limit, labels the DuckDuckGo fallback and marks the search degraded", async () => {
    const tavily = tavilyWith(async () => jsonResponse(429));
    const ddg = duckDuckGoWith(async () => htmlResponse(DDG_PAGE));

    const out = await searchWithFallback("coffee shop gross margin", { tavily: tavily.client, duckDuckGo: ddg.search });

    expect(out.attempts).toEqual([
      { provider: "tavily", outcome: "failed", reason: "rate_limited", error_code: "HTTP_429", result_count: 0 },
      { provider: "duckduckgo", outcome: "success", reason: null, error_code: null, result_count: 1 },
    ]);
    expect(out.provider).toBe("duckduckgo");
    expect(out.results).toEqual([
      {
        provider: "duckduckgo",
        title: "Coffee shop margins",
        snippet: "Typical gross margin is 65%",
        url: "https://example.org/bench",
      },
    ]);
    expect(summarizeAttempts(out.attempts)).toBe("degraded");
  });

  it.each([
    ["HTTP 429", async () => jsonResponse(429), "rate_limited", "HTTP_429"],
    ["HTTP 432 (Tavily plan usage limit)", async () => jsonResponse(432), "rate_limited", "HTTP_432"],
    ["HTTP 401 (missing or invalid key)", async () => jsonResponse(401), "unavailable_credentials", "HTTP_401"],
    ["HTTP 500", async () => jsonResponse(500), "upstream_error", "HTTP_500"],
    ["a timeout", async () => { throw timeoutError(); }, "timed_out", "TIMEOUT"],
    ["a network error", async () => { throw new TypeError("fetch failed"); }, "upstream_error", "NETWORK_ERROR"],
    [
      "a body that is not JSON",
      async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("bad json"); } }) as unknown as Response,
      "upstream_error",
      "MALFORMED_RESPONSE",
    ],
    ["a 200 without a results array", async () => jsonResponse(200, { detail: "?" }), "upstream_error", "UNEXPECTED_RESPONSE_SHAPE"],
  ] as const)("classifies a Tavily failure from %s", async (_label, impl, reason, errorCode) => {
    const tavily = tavilyWith(impl as FetchImpl);
    const ddg = duckDuckGoWith(async () => htmlResponse(DDG_PAGE));

    const out = await searchWithFallback("q", { tavily: tavily.client, duckDuckGo: ddg.search });

    expect(out.attempts[0]).toEqual({
      provider: "tavily",
      outcome: "failed",
      reason,
      error_code: errorCode,
      result_count: 0,
    });
    expect(ddg.fetchImpl).toHaveBeenCalledTimes(1);
    expect(summarizeAttempts(out.attempts)).toBe("degraded");
  });

  it("records a missing Tavily key as unavailable credentials without calling Tavily", async () => {
    const tavily = tavilyWith(async () => jsonResponse(200, { results: [] }), "");
    const ddg = duckDuckGoWith(async () => htmlResponse(DDG_PAGE));

    const out = await searchWithFallback("q", { tavily: tavily.client, duckDuckGo: ddg.search });

    expect(tavily.fetchImpl).not.toHaveBeenCalled();
    expect(out.attempts[0]).toMatchObject({ provider: "tavily", outcome: "failed", reason: "unavailable_credentials" });
    expect(summarizeAttempts(out.attempts)).toBe("degraded");
  });

  it("uses Tavily results as they are, labelled tavily, with no fallback call", async () => {
    const tavily = tavilyWith(async () =>
      jsonResponse(200, { results: [{ url: "https://example.com/a", title: "A", content: "margin 60%" }] }),
    );
    const ddg = duckDuckGoWith(async () => htmlResponse(DDG_PAGE));

    const out = await searchWithFallback("q", { tavily: tavily.client, duckDuckGo: ddg.search });

    expect(ddg.fetchImpl).not.toHaveBeenCalled();
    expect(out.provider).toBe("tavily");
    expect(out.results).toEqual([{ provider: "tavily", title: "A", snippet: "margin 60%", url: "https://example.com/a" }]);
    expect(out.attempts).toEqual([
      { provider: "tavily", outcome: "success", reason: null, error_code: null, result_count: 1 },
    ]);
    expect(summarizeAttempts(out.attempts)).toBe("success");
  });

  it.each([
    ["HTTP 429", async () => htmlResponse("", 429), "rate_limited", "HTTP_429"],
    ["HTTP 503", async () => htmlResponse("", 503), "upstream_error", "HTTP_503"],
    ["a timeout", async () => { throw timeoutError(); }, "timed_out", "TIMEOUT"],
    ["a network error", async () => { throw new TypeError("fetch failed"); }, "upstream_error", "NETWORK_ERROR"],
  ] as const)("classifies a DuckDuckGo failure from %s", async (_label, impl, reason, errorCode) => {
    const ddg = duckDuckGoWith(impl as FetchImpl);
    const { results, attempt } = await ddg.search("q");
    expect(results).toEqual([]);
    expect(attempt).toEqual({ provider: "duckduckgo", outcome: "failed", reason, error_code: errorCode, result_count: 0 });
  });

  it("never reports 'no evidence' when every provider failed", async () => {
    const tavily = tavilyWith(async () => jsonResponse(429));
    const ddg = duckDuckGoWith(async () => { throw timeoutError(); });

    const out = await searchWithFallback("q", { tavily: tavily.client, duckDuckGo: ddg.search });

    expect(out.results).toEqual([]);
    expect(out.provider).toBeNull();
    expect(summarizeAttempts(out.attempts)).toBe("failed");

    const note = noDataNote({ webSearchFired: false, attempts: out.attempts });
    expect(note).not.toMatch(/no web results found/i);
    expect(note).toMatch(/tavily rate limited/i);
    expect(note).toMatch(/duckduckgo timed out/i);

    const reason = noEvidenceRejectionReason(out.attempts);
    expect(reason).not.toBe("no_external_evidence_found");
    expect(reason).toBe("search_provider_failed:tavily=rate_limited,duckduckgo=timed_out");
  });

  it("still reports 'no evidence' when the providers answered with nothing", async () => {
    const tavily = tavilyWith(async () => jsonResponse(200, { results: [] }));
    const ddg = duckDuckGoWith(async () => htmlResponse(DDG_EMPTY_PAGE));

    const out = await searchWithFallback("q", { tavily: tavily.client, duckDuckGo: ddg.search });

    expect(out.attempts.map((a) => a.outcome)).toEqual(["success", "success"]);
    expect(summarizeAttempts(out.attempts)).toBe("success");
    expect(noDataNote({ webSearchFired: false, attempts: out.attempts })).toMatch(/no web results found/i);
    expect(noEvidenceRejectionReason(out.attempts)).toBe("no_external_evidence_found");
  });

  it("names the failed provider when a degraded search still came up short", () => {
    const attempts: ProviderAttempt[] = [
      { provider: "tavily", outcome: "failed", reason: "upstream_error", error_code: "HTTP_500", result_count: 0 },
      { provider: "duckduckgo", outcome: "success", reason: null, error_code: null, result_count: 2 },
    ];
    const note = noDataNote({ webSearchFired: true, attempts });
    expect(note).toMatch(/insufficient numeric data/i);
    expect(note).toMatch(/tavily upstream error/i);
    expect(noEvidenceRejectionReason(attempts)).toBe("no_external_evidence_found");
  });

  it("treats a metric with no recorded attempt as failed, not as success", () => {
    expect(summarizeAttempts([])).toBe("failed");
    expect(noEvidenceRejectionReason([])).toBe("search_not_completed");
  });

  it("counts outcomes per provider for search_health", () => {
    const attempts: ProviderAttempt[] = [
      { provider: "tavily", outcome: "failed", reason: "rate_limited", error_code: "HTTP_429", result_count: 0 },
      { provider: "tavily", outcome: "failed", reason: "rate_limited", error_code: "HTTP_429", result_count: 0 },
      { provider: "tavily", outcome: "success", reason: null, error_code: null, result_count: 3 },
      { provider: "duckduckgo", outcome: "success", reason: null, error_code: null, result_count: 1 },
    ];
    expect(providerOutcomeCounts(attempts)).toEqual({
      tavily: { success: 1, degraded: 0, failed: 2, failure_reasons: { rate_limited: 2 } },
      duckduckgo: { success: 1, degraded: 0, failed: 0, failure_reasons: {} },
    });
  });
});

describe("rvce-validate wiring (F1)", () => {
  const src = readFileSync("supabase/functions/rvce-validate/index.ts", "utf8");

  it("no longer has a search function that turns an error into an empty list", () => {
    expect(src).not.toMatch(/async function tavilySearch/);
    expect(src).not.toMatch(/async function duckDuckGoSearch/);
    expect(src).not.toMatch(/if \(!resp\.ok\) return \[\];/);
  });

  it("records provider outcomes and uses them for notes and persisted rejection reasons", () => {
    expect(src).toMatch(/searchWithFallback\(/);
    expect(src).toMatch(/provider_attempts/);
    expect(src).toMatch(/noDataNote\(/);
    expect(src).toMatch(/noEvidenceRejectionReason\(/);
    expect(src).toMatch(/search_outcome/);
  });
});
