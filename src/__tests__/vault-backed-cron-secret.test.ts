import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const cronMigrationFile = readdirSync(migrationsDir).find((f) =>
  f.endsWith("_vault_backed_cron_secret_and_stripe_reconciliation.sql"),
);

describe("Vault-backed cron secret migration", () => {
  it("exists and never contains a literal x-cron-secret value", () => {
    expect(cronMigrationFile).toBeDefined();
    const source = readFileSync(resolve(migrationsDir, cronMigrationFile!), "utf8").replace(/\r\n/g, "\n");
    // The two known literal secret values that have appeared in this repo's
    // git history (one wrong, one correct) must never reappear in a new
    // migration file -- this is the exact class of exposure the auto-mode
    // classifier blocked earlier this session.
    expect(source).not.toContain("fbfa43cf0894fa91c8f2e09fdd3508702e25584ad13634853404be3e4410c0e3");
    expect(source).not.toContain("75ba27f02eba39bfa59cbbc5b2f4e63e19c3645e0d4a115b672105880a22cc65");
    expect(source).toContain("vault.decrypted_secrets");
    expect(source).toContain("quantis_shared_cron_secret");
  });

  it("schedules reconcile-stripe-subscriptions and reschedules both existing lifecycle-email jobs", () => {
    const source = readFileSync(resolve(migrationsDir, cronMigrationFile!), "utf8").replace(/\r\n/g, "\n");
    expect(source).toContain("cron.schedule(\n  'reconcile-stripe-subscriptions-daily'");
    expect(source).toContain("functions/v1/reconcile-stripe-subscriptions");
    expect(source).toContain("cron.alter_job(\n  4,");
    expect(source).toContain("cron.alter_job(\n  5,");
  });
});
