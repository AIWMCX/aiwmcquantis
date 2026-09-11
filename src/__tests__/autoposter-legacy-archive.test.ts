import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260911214009_autoposter_legacy_snapshot_and_archive.sql",
  ),
  "utf8",
);

describe("13-week content reset: legacy 42-post archive (Phase 0 snapshot + Phase 2 archive)", () => {
  it("creates an immutable snapshot table with RLS enabled and forced", () => {
    expect(source).toContain("create table public.autoposter_legacy_snapshot");
    expect(source).toContain("alter table public.autoposter_legacy_snapshot enable row level security");
    expect(source).toContain("alter table public.autoposter_legacy_snapshot force row level security");
  });

  it("restricts snapshot reads to admins and full access to service_role only", () => {
    expect(source).toMatch(/admin_can_read_legacy_snapshot[\s\S]*?has_role\(auth\.uid\(\), 'admin'\)/);
    expect(source).toMatch(/service_role_full_access_legacy_snapshot[\s\S]*?auth\.role\(\) = 'service_role'/);
  });

  it("adds archive lifecycle columns additively, never dropping or renaming existing ones", () => {
    expect(source).toContain("add column archived_at timestamptz");
    expect(source).toContain("add column archived_by uuid references auth.users(id)");
    expect(source).toContain("add column historical_publication_state text");
    expect(source).not.toMatch(/drop column|drop table|truncate/i);
  });

  it("constrains historical_publication_state to the five explicit evidence states, never a bare boolean", () => {
    const idx = source.indexOf("historical_publication_state text");
    const block = source.slice(idx, idx + 400);
    for (const state of [
      "founder_reported_published",
      "publicly_observed",
      "verified_published",
      "publication_unknown",
      "not_published",
    ]) {
      expect(block).toContain(state);
    }
  });

  it("snapshots every pre-archive row (including its platform variants) before the archive UPDATE runs", () => {
    const snapshotIdx = source.indexOf("insert into public.autoposter_legacy_snapshot");
    const updateIdx = source.indexOf("update public.autoposter_posts");
    expect(snapshotIdx).toBeGreaterThan(-1);
    expect(updateIdx).toBeGreaterThan(snapshotIdx);
    const snapshotBlock = source.slice(snapshotIdx, updateIdx);
    expect(snapshotBlock).toContain("autoposter_post_platforms");
    expect(snapshotBlock).toContain("extensions.digest(");
    expect(snapshotBlock).toContain("'sha256'");
  });

  it("bulk-archives with only the founder-assertion evidence state, never verified_published", () => {
    const updateIdx = source.indexOf("update public.autoposter_posts");
    const block = source.slice(updateIdx);
    expect(block).toContain("historical_publication_state = 'founder_reported_published'");
    expect(block).not.toContain("historical_publication_state = 'verified_published'");
    expect(block).toContain("archive_reason = 'legacy_plan_outdated'");
  });
});
