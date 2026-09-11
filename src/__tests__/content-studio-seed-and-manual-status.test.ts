import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationSource = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260911224116_seed_content_studio_as_archived_posts.sql"),
  "utf8",
);
const hookSource = readFileSync(resolve(process.cwd(), "src/hooks/useAutoposter.ts"), "utf8");
const editorSource = readFileSync(resolve(process.cwd(), "src/components/autoposter/PostEditorSheet.tsx"), "utf8");
const archiveSource = readFileSync(resolve(process.cwd(), "src/components/autoposter/PostArchive.tsx"), "utf8");

describe("Content Studio seed + manual status controls (2026-09-11 follow-up)", () => {
  it("repairs the status drift (archived_at set, status reverted to draft) before seeding anything new", () => {
    const repairIdx = migrationSource.indexOf("update public.autoposter_posts\nset status = 'archived'");
    const seedIdx = migrationSource.indexOf("insert into public.autoposter_posts");
    expect(repairIdx).toBeGreaterThan(-1);
    expect(seedIdx).toBeGreaterThan(repairIdx);
  });

  it("locks the status vocabulary to exactly the five states the founder asked for", () => {
    expect(migrationSource).toContain(
      "check (status in ('draft', 'scheduled', 'posted', 'archived', 'not_published'))",
    );
  });

  it("seeds from content_studio_generations only -- never invents new content", () => {
    expect(migrationSource).toContain("from public.content_studio_generations g");
    expect(migrationSource).not.toMatch(/insert into public\.content_studio_generations/);
  });

  it("seeded posts are marked archived + founder_reported_published, never verified_published", () => {
    const seedIdx = migrationSource.indexOf("insert into public.autoposter_posts (\n  post_date");
    const block = migrationSource.slice(seedIdx);
    expect(block).toContain("'archived',");
    expect(block).toContain("'content_studio',");
    expect(block).toContain("'founder_reported_published',");
    expect(block).not.toContain("'verified_published'");
  });

  it("seeding is idempotent -- skips generations already linked to a post", () => {
    expect(migrationSource).toMatch(/where not exists \(\s*select 1 from public\.autoposter_posts p where p\.content_studio_generation_id = g\.id/);
  });

  it("useSeedContentPlan no longer includes status in its upsert payload (the drift's root cause)", () => {
    const idx = hookSource.indexOf("export function useSeedContentPlan()");
    const upsertIdx = hookSource.indexOf(".upsert(rows", idx);
    const block = hookSource.slice(idx, upsertIdx);
    expect(block).not.toMatch(/status:\s*'draft'/);
  });

  it("useSetPostStatus supports exactly the four manual states and clears archive fields on draft", () => {
    expect(hookSource).toContain("export function useSetPostStatus()");
    expect(hookSource).toMatch(/'draft' \| 'scheduled' \| 'posted' \| 'archived' \| 'not_published'/);
    expect(hookSource).toMatch(/archived_at: isRetiring \? new Date\(\)\.toISOString\(\) : null/);
  });

  it("PostEditorSheet exposes all four manual status controls", () => {
    expect(editorSource).toContain("useSetPostStatus");
    expect(editorSource).toContain("['draft', 'posted', 'archived', 'not_published']");
  });

  it("PostArchive reads via useAutoposterArchive, the mirror of the active-posts filter", () => {
    expect(archiveSource).toContain("useAutoposterArchive");
  });
});
