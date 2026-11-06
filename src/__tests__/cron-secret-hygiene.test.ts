import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

// pg_cron -> edge function auth (the x-cron-secret header) must come from
// Supabase Vault (quantis_shared_cron_secret), never from a value in git.
// Runbook: docs/execution/2026-11-06-cron-secret-rotation-runbook.md.

const root = process.cwd();

// Append-only migrations that embed the value rotated out on 2026-08-18.
// They stay as they are: editing an applied migration breaks the ledger.
const HISTORICAL_LITERAL_MIGRATIONS = new Set([
  "supabase/migrations/20260725195336_schedule_lifecycle_email_crons.sql",
  "supabase/migrations/20260727012329_fix_publish_due_posts_cron_auth.sql",
]);

// SHA-256 digests of the two values that have been committed to this repo.
// Only digests are kept here; the values themselves must never come back.
const LEAKED_VALUE_DIGESTS = new Set([
  "c0dd826feb4091f45b4169c01468642ca28fb934c76ce8f6c36ec141aa2d0827", // rotated 2026-08-18; in the two migrations above
  "3fc25b2d1a4541293bb0be4db71a251f3591c26b1d1064b1610aa1fb7763bf41", // committed in a src/__tests__ file by PR #134 (2026-09-11)
]);

// The x-cron-secret header given a quoted literal value, in SQL or TS.
const HEADER_LITERAL = /["']x-cron-secret["']\s*[:,]\s*["']([^"'$`{]{8,})["']/i;
// A line that names the cron secret and carries a long token next to it.
// 48+ characters, so 40-character commit SHAs in docs do not count.
const NAMES_SECRET = /cron[\s_-]?secret/i;
const LONG_TOKEN = /(?<![A-Za-z0-9])(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{48,}(?![A-Za-z0-9])/;
const TOKEN_64 = /(?<![A-Za-z0-9])[A-Za-z0-9]{64}(?![A-Za-z0-9])/g;

const SCAN_DIRS = ["src", "supabase", "scripts", "docs", ".github"];
const SCAN_EXT = /\.(ts|tsx|js|mjs|cjs|sql|md|json|ya?ml|toml|sh)$/;
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", ".temp", ".branches"]);

function listFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // unreadable local-only dirs
    }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (SCAN_EXT.test(entry.name)) out.push(relative(root, full).replace(/\\/g, "/"));
    }
  };
  for (const dir of SCAN_DIRS) walk(resolve(root, dir));
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".md")) out.push(entry.name);
  }
  return out;
}

const files = listFiles();
const cache = new Map<string, string>();
const read = (file: string) => {
  let text = cache.get(file);
  if (text === undefined) cache.set(file, (text = readFileSync(resolve(root, file), "utf8")));
  return text;
};
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
// Each scan reads ~1.8k files; allow for a loaded CI runner.
const SCAN_TIMEOUT_MS = 30_000;

describe("cron secret hygiene", () => {
  it("scans the repo", () => {
    expect(files.length).toBeGreaterThan(500);
    expect(files).toContain("supabase/migrations/20260727012329_fix_publish_due_posts_cron_auth.sql");
  });

  it("no file outside the two historical migrations gives x-cron-secret a literal value", () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (HISTORICAL_LITERAL_MIGRATIONS.has(file)) continue;
      read(file).split("\n").forEach((line, i) => {
        if (HEADER_LITERAL.test(line)) offenders.push(`${file}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  }, SCAN_TIMEOUT_MS);

  it("no file outside the two historical migrations puts a long token next to the cron secret's name", () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (HISTORICAL_LITERAL_MIGRATIONS.has(file)) continue;
      read(file).split("\n").forEach((line, i) => {
        if (NAMES_SECRET.test(line) && LONG_TOKEN.test(line)) offenders.push(`${file}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  }, SCAN_TIMEOUT_MS);

  it("no known leaked value appears anywhere outside the two historical migrations", () => {
    const offenders: string[] = [];
    for (const file of files) {
      if (HISTORICAL_LITERAL_MIGRATIONS.has(file)) continue;
      read(file).split("\n").forEach((line, i) => {
        for (const token of line.match(TOKEN_64) ?? []) {
          if (LEAKED_VALUE_DIGESTS.has(sha256(token))) offenders.push(`${file}:${i + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  }, SCAN_TIMEOUT_MS);

  it("every cron migration since the Vault switch reads x-cron-secret from Vault", () => {
    const offenders = files
      .filter((f) => /^supabase\/migrations\/\d{14}_.*\.sql$/.test(f))
      .filter((f) => f.slice("supabase/migrations/".length, "supabase/migrations/".length + 14) >= "20260911210235")
      .filter((f) => /x-cron-secret/i.test(read(f)) && !read(f).includes("vault.decrypted_secrets"));
    expect(offenders).toEqual([]);
  }, SCAN_TIMEOUT_MS);
});

describe("20261106120000 cron secret literals to Vault", () => {
  const file = files.find((f) => f.endsWith("_cron_secret_literals_to_vault.sql"));
  const source = file ? read(file).replace(/\r\n/g, "\n") : "";

  it("exists and reads the existing Vault secret by name", () => {
    expect(file).toBe("supabase/migrations/20261106120000_cron_secret_literals_to_vault.sql");
    expect(source).toContain("where name = ''quantis_shared_cron_secret''");
  });

  it("changes nothing when the Vault secret is missing", () => {
    expect(source).toMatch(
      /IF NOT EXISTS \(SELECT 1 FROM vault\.decrypted_secrets WHERE name = 'quantis_shared_cron_secret'\) THEN\s+RAISE NOTICE '[^']*';\s+RETURN;/,
    );
  });

  it("only touches jobs that still carry a literal, and dry-runs each rewrite", () => {
    expect(source).toContain("command NOT ILIKE '%vault.decrypted_secrets%'");
    expect(source).toContain("EXECUTE 'EXPLAIN ' || stmt;");
    expect(source.indexOf("EXECUTE 'EXPLAIN '")).toBeLessThan(source.indexOf("PERFORM cron.alter_job"));
  });

  it("never logs a command or a secret", () => {
    const raises = source.split("\n").filter((l) => /RAISE/i.test(l));
    expect(raises.length).toBeGreaterThan(0);
    for (const line of raises) expect(line).not.toMatch(/decrypted_secret|new_cmd|command|lit\b/);
    const args = source.match(/RAISE NOTICE '[^']*'(,[^;]*);/g) ?? [];
    for (const a of args) expect(a).not.toMatch(/new_cmd|j\.command|\blit\b|stmt/);
  });
});
