import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/reconcile-stripe-subscriptions/index.ts"),
  "utf8",
);
const schemaSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260911084048_stripe_reconciliation_runs.sql"),
  "utf8",
);

describe("Stripe<->Supabase subscription reconciliation job", () => {
  it("requires the shared x-cron-secret header, matching the existing scheduled-call convention", () => {
    expect(source).toContain('req.headers.get("x-cron-secret")');
    expect(source).toContain('Deno.env.get("CRON_SECRET")');
    expect(source).toMatch(/cronSecret !== expectedSecret/);
  });

  it("excludes known synthetic (non-Stripe) subscription IDs from the candidate query", () => {
    expect(source).toContain("KNOWN_SYNTHETIC_IDS");
    expect(source).toContain("sub_plus_trial_jeltovbogdan");
  });

  it("only auto-repairs deterministic terminal statuses (canceled/incomplete_expired/unpaid), never guesses at anything else", () => {
    expect(source).toContain('STRIPE_TERMINAL_STATUSES = new Set(["canceled", "incomplete_expired", "unpaid"])');
    const idx = source.indexOf("STRIPE_TERMINAL_STATUSES.has(stripeSub.status)");
    expect(idx).toBeGreaterThan(-1);
  });

  it("repairs via the same mark_subscription_canceled RPC the webhook itself uses, not a re-implementation", () => {
    expect(source).toContain('supabase.rpc("mark_subscription_canceled"');
    expect(source).toContain("p_user_id: row.user_id");
    expect(source).toMatch(/p_reason: `reconciliation_drift:/);
  });

  it("a Stripe lookup failure (object not found) is recorded as ambiguous, never treated as a repair", () => {
    expect(source).toContain("ambiguous_not_found");
    const idx = source.indexOf("catch (stripeErr)");
    const blockEnd = source.indexOf("continue;", idx);
    const block = source.slice(idx, blockEnd);
    expect(block).toContain("ambiguous_not_found");
    expect(block).not.toContain("mark_subscription_canceled");
  });

  it("writes a run record to stripe_reconciliation_runs with status transitions running -> completed/failed", () => {
    expect(source).toContain('.insert({ status: "running" })');
    expect(source).toMatch(/status: "completed"/);
    expect(source).toMatch(/status: "failed"/);
  });

  it("the tracking table is RLS-protected and not writable by anon/authenticated directly", () => {
    expect(schemaSql).toContain("alter table public.stripe_reconciliation_runs enable row level security");
    expect(schemaSql).toContain("alter table public.stripe_reconciliation_runs force row level security");
    expect(schemaSql).toContain("revoke all on table public.stripe_reconciliation_runs from anon, authenticated");
  });
});
