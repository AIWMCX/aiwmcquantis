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
    // No literal x-cron-secret value may appear in this migration. The values
    // are not repeated here: cron-secret-hygiene.test.ts checks by SHA-256.
    expect(source).not.toMatch(/["']x-cron-secret["']\s*[:,]\s*["'][^"'(]{8,}["']/i);
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
