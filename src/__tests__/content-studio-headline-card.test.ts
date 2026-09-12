import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cardSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/template-card.ts"),
  "utf8",
);
const generateSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/content-studio-generate/index.ts"),
  "utf8",
);

describe("Deterministic headline card (real SVG text, never a diffusion model, 2026-09-11)", () => {
  it("bundles an explicit font rather than relying on a system font", () => {
    // Directly verified by rendering: resvg-wasm has zero system fonts in
    // this sandboxed runtime -- a font-family reference to a system font
    // (e.g. Arial) silently produces blank text with no error. This test
    // guards against that regression coming back.
    expect(cardSource).toContain("ensureFontBuffer");
    expect(cardSource).toContain("fontBuffers: [fontBuffer]");
    expect(cardSource).toContain("loadSystemFonts: false");
    expect(cardSource).not.toMatch(/font-family="Arial/);
  });

  it("initializes both the wasm binary and the font before rendering, never renders without either", () => {
    const idx = cardSource.indexOf("export async function renderHeadlineCard");
    const fnBody = cardSource.slice(idx);
    expect(fnBody).toMatch(/Promise\.all\(\[ensureWasmInit\(\), ensureFontBuffer\(\)\]\)/);
  });

  it("never auto-generates a data chart from freeform text -- headline/subtitle/brand only", () => {
    // The word "chart" legitimately appears in the docblock explaining WHY
    // charts are deliberately excluded -- assert the SVG-building code has
    // no chart-drawing primitives (no <rect>/<line>/<polyline> loop keyed to
    // data values), not that the word never appears anywhere in the file.
    const svgBuilderIdx = cardSource.indexOf("const svg = `");
    const svgBlock = cardSource.slice(svgBuilderIdx, cardSource.indexOf("`.trim();"));
    expect(svgBlock).not.toMatch(/polyline|<line |data-driven|barHeight/i);
  });

  it("escapes all user-supplied text before embedding in SVG (XSS/malformed-SVG guard)", () => {
    expect(cardSource).toContain("escapeXml(line)");
    expect(cardSource).toMatch(/escapeXml\(input\.brandTagline\)/);
  });

  it("content-studio-generate asks the model for a headline grounded in the post, distinct from the photo's image_prompt", () => {
    expect(generateSource).toContain('"card_headline"');
    expect(generateSource).toContain('"card_subtitle"');
    expect(generateSource).toMatch(/punchy 4-9 word headline/);
  });

  it("renders the card best-effort -- a card failure never blocks the caption/photo response", () => {
    const idx = generateSource.indexOf("if (cardHeadline)");
    expect(idx).toBeGreaterThan(-1);
    const block = generateSource.slice(idx, generateSource.indexOf("if (body.save !== false)"));
    expect(block).toContain("catch (e)");
    expect(block).toContain("cardError =");
    expect(block).not.toMatch(/catch \(e\) \{\s*return j\(/);
  });

  it("returns card_image_url/card_error alongside the photo's image_url/image_error, not replacing it", () => {
    const returnIdx = generateSource.indexOf("card_image_url: cardResult?.url ?? null");
    expect(returnIdx).toBeGreaterThan(-1);
    const returnBlock = generateSource.slice(Math.max(0, returnIdx - 300), returnIdx + 100);
    expect(returnBlock).toContain("image_url: imageResult?.url ?? null");
    expect(returnBlock).toContain("card_image_url: cardResult?.url ?? null");
  });
});
