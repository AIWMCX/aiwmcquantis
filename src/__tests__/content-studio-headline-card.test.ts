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

  it("only renders a chart when the caller explicitly supplies >=2 steps -- never invents data itself", () => {
    expect(cardSource).toContain("input.chart && input.chart.steps.length >= 2");
    // The chart draws exactly step.threshold/step.annotation as given --
    // it must never call Math.random or synthesize a value that wasn't
    // passed in. (Not checking for the word "invent" itself -- it
    // legitimately appears in an explanatory comment in this function.)
    const chartFnIdx = cardSource.indexOf("function renderChart");
    const chartFnEnd = cardSource.indexOf("\nexport interface HeadlineCardInput");
    const chartFnBody = cardSource.slice(chartFnIdx, chartFnEnd);
    expect(chartFnBody).not.toMatch(/Math\.random|estimateValue|syntheticValue/i);
  });

  it("labels a rendered chart as illustrative -- never presents step data as precise fact", () => {
    expect(cardSource).toContain("ILLUSTRATIVE EXAMPLE.");
    expect(cardSource).toContain("Actual thresholds depend on your business.");
    // The disclaimer is tied to input.chart being present, not always-on
    // or always-off.
    expect(cardSource).toMatch(/const disclaimerSvg = input\.chart\s*\n?\s*\?/);
  });

  it("content-studio-generate validates every chart field before rendering, discarding rather than guessing on any malformed field", () => {
    expect(generateSource).toContain("typeof rawChart.x_axis_label === 'string'");
    expect(generateSource).toContain("typeof rawChart.series_label === 'string'");
    expect(generateSource).toMatch(/typeof s\?\.threshold === 'number' && Number\.isFinite\(s\.threshold\)/);
    expect(generateSource).toContain("validSteps.length >= 2 && validSteps.length <= 5");
  });

  it("instructs the model that card_chart/card_callout must be null unless the post explicitly states the data -- never inferred or invented", () => {
    expect(generateSource).toMatch(/Never invent, estimate, round, or infer thresholds/);
    expect(generateSource).toMatch(/this MUST be null -- do not force a chart/);
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

describe("Brand spec compliance (2026-09-19 Commercial Social Asset System)", () => {
  it("uses the exact spec hex values for Accent 1 (electric blue) and Accent 2 (orange-red)", () => {
    expect(cardSource).toContain('BRAND_ACCENT = "#2B7FFF"');
    expect(cardSource).toContain('BRAND_WARN = "#FF4B2B"');
    // The prior approximations must not linger anywhere in this file.
    expect(cardSource).not.toContain("#3b82f6");
    expect(cardSource).not.toContain("#f59e0b");
  });

  it("renders a top-left masthead (AIWMC QUANTIS / DECISION NOTE) per asset structure item 1", () => {
    expect(cardSource).toContain("mastheadSvg");
    expect(cardSource).toContain(">AIWMC QUANTIS<");
    expect(cardSource).toContain(">DECISION NOTE<");
  });

  it("renders the AIWMC parent mark in the bottom-left footer rail, not the old bottom-right wordmark", () => {
    expect(cardSource).toContain("footerSvg");
    expect(cardSource).toContain(">AIWMC<");
    // The old placement anchored the mark to the right edge -- confirm that
    // pattern is gone from the footer, not just present somewhere else.
    const footerIdx = cardSource.indexOf("const footerSvg");
    const footerBody = cardSource.slice(footerIdx, cardSource.indexOf("const svg = `"));
    expect(footerBody).not.toMatch(/text-anchor="end"/);
  });

  it("keeps the chart disclaimer clear of the footer rail (both left-anchored at MARGIN_X)", () => {
    // Regression guard: moving the footer mark to the left (to match the
    // spec) put it in the same horizontal lane as the chart disclaimer,
    // which was previously safe only because the old footer was right-
    // anchored. Both must resolve to different fixed Y offsets from
    // CARD_HEIGHT so they can never visually collide.
    expect(cardSource).toContain("CARD_HEIGHT - 186");
    expect(cardSource).toContain("CARD_HEIGHT - 116");
  });
});
