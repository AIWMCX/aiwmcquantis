import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const hookSource = readFileSync(resolve(process.cwd(), "src/hooks/useAutoposter.ts"), "utf8");
const studioSource = readFileSync(resolve(process.cwd(), "src/pages/admin/ContentStudio.tsx"), "utf8");

describe("Autoposter archive filtering + Content Studio image display (2026-09-11 follow-up)", () => {
  it("useAutoposterPosts excludes archived rows -- the bug the founder actually saw", () => {
    const idx = hookSource.indexOf("export function useAutoposterPosts()");
    const nextFn = hookSource.indexOf("export function", idx + 1);
    const block = hookSource.slice(idx, nextFn > -1 ? nextFn : undefined);
    expect(block).toContain("from('autoposter_posts')");
    expect(block).toContain(".is('archived_at', null)");
  });

  it("provides a separate archive query for archived rows, never silently dropping them", () => {
    expect(hookSource).toContain("export function useAutoposterArchive()");
    expect(hookSource).toMatch(/useAutoposterArchive[\s\S]*?\.not\('archived_at', 'is', null\)/);
  });

  it("useSeedContentPlan's upsert never includes archived_at, so it can't silently un-archive rows", () => {
    const idx = hookSource.indexOf("export function useSeedContentPlan()");
    const block = hookSource.slice(idx, idx + 800);
    expect(block).not.toContain("archived_at");
  });

  it("Content Studio captures and renders the generated image_url from the response", () => {
    expect(studioSource).toContain("const imageUrl = (data as any).image_url");
    expect(studioSource).toContain("image?.url &&");
    expect(studioSource).toMatch(/<img src=\{image\.url\}/);
  });

  it("Content Studio surfaces an image generation error distinctly from a hard failure", () => {
    expect(studioSource).toContain("const imgErr = (data as any).image_error");
    expect(studioSource).toContain("image?.error && !image.url");
    expect(studioSource).toContain("toast.error('Image generation failed'");
  });
});
