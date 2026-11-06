import { describe, expect, it, vi } from "vitest";
import {
  createTavilyClient,
  isSafeResultUrl,
  toRvceSearchResults,
  TAVILY_ENDPOINT,
} from "../../supabase/functions/_shared/tavily-client";

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

const clock = () => {
  let t = Date.parse("2026-11-05T12:00:00.000Z");
  return () => (t += 10);
};

describe("tavily-client", () => {
  it("sends the same request body RVCE sends in production", async () => {
    const fetchImpl = vi.fn(async () => okResponse({ results: [] }));
    const client = createTavilyClient({ apiKey: "tvly-test", fetchImpl, now: clock() });
    await client.search("  coffee shop margins  ");

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(TAVILY_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      api_key: "tvly-test",
      query: "coffee shop margins",
      search_depth: "basic",
      max_results: 5,
      include_answer: false,
    });
  });

  it("maps results and stamps retrievedAt", async () => {
    const fetchImpl = vi.fn(async () =>
      okResponse({
        results: [
          { url: "https://example.com/a", title: "A", content: "alpha", published_date: "2026-01-02", score: 0.9 },
          { url: "https://example.com/b", title: "B", snippet: "beta" },
        ],
      }),
    );
    const out = await createTavilyClient({ apiKey: "k", fetchImpl, now: clock() }).search("q");
    expect(out.status).toBe("SUCCESS");
    expect(out.results).toEqual([
      { url: "https://example.com/a", title: "A", content: "alpha", publishedAt: "2026-01-02", score: 0.9 },
      { url: "https://example.com/b", title: "B", content: "beta" },
    ]);
    expect(out.retrievedAt).toBe("2026-11-05T12:00:00.020Z");
    expect(out.latencyMs).toBe(10);
    expect(toRvceSearchResults(out)[1]).toEqual({ title: "B", snippet: "beta", url: "https://example.com/b" });
  });

  it("never calls the network without a key, and never echoes the key", async () => {
    const fetchImpl = vi.fn();
    const client = createTavilyClient({ fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(client.isAvailable()).toBe(false);
    const out = await client.search("q");
    expect(out).toMatchObject({ status: "FAILED", errorCode: "PROVIDER_UNAVAILABLE", results: [] });
    expect(fetchImpl).not.toHaveBeenCalled();

    const keyed = createTavilyClient({ apiKey: "tvly-secret", fetchImpl: async () => okResponse({ results: [] }) });
    expect(JSON.stringify(await keyed.search("q"))).not.toContain("tvly-secret");
  });

  it("rejects an empty query without a request", async () => {
    const fetchImpl = vi.fn();
    const out = await createTavilyClient({ apiKey: "k", fetchImpl: fetchImpl as unknown as typeof fetch }).search("   ");
    expect(out.errorCode).toBe("EMPTY_QUERY");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("classifies failures", async () => {
    const http = await createTavilyClient({
      apiKey: "k",
      fetchImpl: async () => ({ ok: false, status: 432 }) as Response,
    }).search("q");
    expect(http).toMatchObject({ status: "FAILED", errorCode: "HTTP_432" });

    const timeout = await createTavilyClient({
      apiKey: "k",
      fetchImpl: async () => {
        throw Object.assign(new Error("t"), { name: "TimeoutError" });
      },
    }).search("q");
    expect(timeout.errorCode).toBe("TIMEOUT");

    const network = await createTavilyClient({
      apiKey: "k",
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
    }).search("q");
    expect(network.errorCode).toBe("NETWORK_ERROR");

    const malformed = await createTavilyClient({
      apiKey: "k",
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("x"); } }) as unknown as Response,
    }).search("q");
    expect(malformed.errorCode).toBe("MALFORMED_RESPONSE");

    const shape = await createTavilyClient({ apiKey: "k", fetchImpl: async () => okResponse({ answer: "x" }) }).search("q");
    expect(shape).toMatchObject({ status: "DEGRADED", errorCode: "UNEXPECTED_RESPONSE_SHAPE" });
  });

  it("drops unsafe result URLs and reports DEGRADED", async () => {
    const out = await createTavilyClient({
      apiKey: "k",
      fetchImpl: async () =>
        okResponse({
          results: [
            { url: "javascript:alert(1)", title: "x" },
            { url: "http://169.254.169.254/latest/meta-data", title: "x" },
            { url: "https://ok.example.org/p", title: "ok" },
          ],
        }),
    }).search("q");
    expect(out.status).toBe("DEGRADED");
    expect(out.errorCode).toBe("SOME_RESULTS_DROPPED_UNSAFE_URL");
    expect(out.droppedCount).toBe(2);
    expect(out.results.map((r) => r.url)).toEqual(["https://ok.example.org/p"]);
  });

  it("caps max_results", async () => {
    const fetchImpl = vi.fn(async () => okResponse({ results: [] }));
    await createTavilyClient({ apiKey: "k", fetchImpl }).search("q", { maxResults: 500, searchDepth: "advanced" });
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.max_results).toBe(20);
    expect(body.search_depth).toBe("advanced");
  });

  it.each([
    ["https://www.sec.gov/x", true],
    ["http://example.com", true],
    ["ftp://example.com", false],
    ["http://localhost:8080", false],
    ["http://10.1.2.3/", false],
    ["http://172.20.0.1/", false],
    ["http://192.168.1.1/", false],
    ["http://[::1]/", false],
    ["http://[fd00::1]/", false],
    ["http://printer.local/", false],
    ["not a url", false],
  ])("isSafeResultUrl(%s) = %s", (url, safe) => {
    expect(isSafeResultUrl(url)).toBe(safe);
  });
});
