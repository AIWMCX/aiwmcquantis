import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { authorizeCaller } from "../../supabase/functions/ai-consensus/caller";

// ai-consensus calls two paid models (gpt-5-mini + gemini) per request and
// had no caller check: the gateway accepts the public anon key, so anyone
// could spend on it. Verified live 2026-11-06: an anon-key POST reached the
// body validation (400 "Missing required fields"), not a 401.

const SERVICE = "service-role-key-for-tests";

const req = (authorization?: string) =>
  new Request("https://example.supabase.co/functions/v1/ai-consensus", {
    method: "POST",
    headers: authorization === undefined ? {} : { Authorization: authorization },
  });

describe("ai-consensus caller check", () => {
  it("rejects a request with no Authorization header without asking auth", async () => {
    const getUser = vi.fn();
    const out = await authorizeCaller(req(), { serviceRoleKey: SERVICE, getUser });
    expect(out).toEqual({ ok: false, status: 401, code: "AUTH_REQUIRED" });
    expect(getUser).not.toHaveBeenCalled();
  });

  it.each(["Basic abc", "Bearer ", "Bearer", "token abc"])("rejects a malformed header %j", async (header) => {
    const getUser = vi.fn();
    const out = await authorizeCaller(req(header), { serviceRoleKey: SERVICE, getUser });
    expect(out).toMatchObject({ ok: false, status: 401 });
    expect(getUser).not.toHaveBeenCalled();
  });

  it("rejects the public anon key (a JWT with no user behind it)", async () => {
    const getUser = vi.fn(async () => null);
    const out = await authorizeCaller(req("Bearer anon-key-jwt"), { serviceRoleKey: SERVICE, getUser });
    expect(out).toEqual({ ok: false, status: 401, code: "AUTH_REQUIRED" });
    expect(getUser).toHaveBeenCalledWith("anon-key-jwt");
  });

  it("accepts the service role key (server-to-server callers such as qoc-orchestrate)", async () => {
    const getUser = vi.fn();
    const out = await authorizeCaller(req(`Bearer ${SERVICE}`), { serviceRoleKey: SERVICE, getUser });
    expect(out).toEqual({ ok: true, caller: "service_role" });
    expect(getUser).not.toHaveBeenCalled();
  });

  it("never treats an empty service role key as a match", async () => {
    const getUser = vi.fn(async () => null);
    const out = await authorizeCaller(req("Bearer x"), { serviceRoleKey: "", getUser });
    expect(out).toMatchObject({ ok: false, status: 401 });
  });

  it("accepts a signed-in user", async () => {
    const getUser = vi.fn(async () => ({ id: "user-123" }));
    const out = await authorizeCaller(req("Bearer user-jwt"), { serviceRoleKey: SERVICE, getUser });
    expect(out).toEqual({ ok: true, caller: "user", userId: "user-123" });
  });

  it("fails closed with 503, not 401, when the auth check itself errors", async () => {
    const getUser = vi.fn(async () => {
      throw new Error("auth service unreachable");
    });
    const out = await authorizeCaller(req("Bearer user-jwt"), { serviceRoleKey: SERVICE, getUser });
    expect(out).toEqual({ ok: false, status: 503, code: "AUTH_CHECK_FAILED" });
  });
});

describe("ai-consensus wiring", () => {
  const src = readFileSync("supabase/functions/ai-consensus/index.ts", "utf8");

  it("checks the caller after the health probe and CORS preflight, before reading the body or calling a model", () => {
    const health = src.indexOf("maybeHealthResponse(req");
    const preflight = src.indexOf('req.method === "OPTIONS"');
    const check = src.indexOf("await authorizeCaller(req");
    const body = src.indexOf("await req.json()");
    const model = src.indexOf("await callModel(");
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeGreaterThan(health);
    expect(check).toBeGreaterThan(preflight);
    expect(check).toBeLessThan(body);
    expect(check).toBeLessThan(model);
  });
});
