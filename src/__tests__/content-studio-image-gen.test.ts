import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const imageGenSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/image-gen.ts"),
  "utf8",
);
const generateSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/content-studio-generate/index.ts"),
  "utf8",
);
const migrationSource = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260911215637_content_assets_storage_bucket.sql"),
  "utf8",
);

describe("Content Studio image generation (Hugging Face FLUX.1-schnell, 2026-09-11)", () => {
  it("resolves Hugging Face only via HUGGINGFACE_API_TOKEN, no Gemini/Bloom key anywhere", () => {
    expect(imageGenSource).toContain('Deno.env.get(\'HUGGINGFACE_API_TOKEN\')');
    expect(imageGenSource).not.toMatch(/GEMINI_API_KEY|BLOOM_API_KEY/);
  });

  it("calls the nscale-routed OpenAI-compatible images endpoint, not the retired hf-inference host", () => {
    // The old hostnames are legitimately still referenced in a comment
    // explaining why they were replaced -- assert the active fetch target
    // specifically, not blanket string-absence across the whole file.
    expect(imageGenSource).toMatch(/fetch\(HF_IMAGES_URL/);
    expect(imageGenSource).toContain("const HF_IMAGES_URL = 'https://router.huggingface.co/nscale/v1/images/generations'");
  });

  it("decodes a base64 image response and falls back to fetching a returned URL, never assumes raw bytes", () => {
    expect(imageGenSource).toContain("item.b64_json");
    expect(imageGenSource).toContain("atob(item.b64_json)");
    expect(imageGenSource).toMatch(/if \(item\.url\)/);
  });

  it("retries only on retryable (cold-start/503) failures, never on a hard error", () => {
    expect(imageGenSource).toContain("class ImageGenError extends Error");
    expect(imageGenSource).toMatch(/retryable = res\.status === 503/);
    expect(imageGenSource).toMatch(/if \(err instanceof ImageGenError && err\.retryable\)/);
  });

  it("image generation is best-effort and never blocks caption generation on failure", () => {
    const idx = generateSource.indexOf("Image generation (Step C");
    expect(idx).toBeGreaterThan(-1);
    const block = generateSource.slice(idx, generateSource.indexOf("if (body.save !== false)"));
    expect(block).toContain("catch (e)");
    expect(block).toContain("imageError =");
    // The final response is still returned even when imageError is set --
    // no early return/throw inside the image-generation try/catch block.
    expect(block).not.toMatch(/catch \(e\) \{\s*return j\(/);
  });

  it("persists only the storage path (not the expiring signed URL) for later re-signing", () => {
    expect(generateSource).toContain("storage_path: imageResult.storagePath");
    expect(generateSource).not.toMatch(/meta:\s*\{[^}]*url:\s*imageResult/);
  });

  it("the content-assets storage bucket is private and restricted to admin/content_admin roles", () => {
    expect(migrationSource).toMatch(/'content-assets'.*false/);
    expect(migrationSource).toContain("has_role(auth.uid(), 'admin') or has_role(auth.uid(), 'content_admin')");
  });

  it("enforces a deterministic brand-style wrapper server-side, never trusting the LLM's raw brief alone", () => {
    const idx = generateSource.indexOf("const styledPrompt =");
    expect(idx).toBeGreaterThan(-1);
    const wrapperLine = generateSource.slice(idx, generateSource.indexOf(";", idx));
    expect(wrapperLine).toContain("${chosenPrompt}");
    expect(wrapperLine).toMatch(/no generic ai-art tropes/i);
    expect(wrapperLine).toMatch(/no glowing abstract data streams/i);
    // The wrapped prompt, not the raw LLM brief, is what actually gets sent.
    expect(generateSource).toContain("generateImageWithRetry(imageProvider, styledPrompt)");
  });

  it("instructs the model to ground image_prompt in the post's real content, not generic tech cliches", () => {
    expect(generateSource).toMatch(/grounded in the actual post content/i);
    expect(generateSource).toMatch(/never a generic tech\/ai cliche/i);
  });
});
