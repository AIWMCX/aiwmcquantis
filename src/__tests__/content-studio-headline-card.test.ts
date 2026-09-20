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

  it("never renders a callout alongside a chart -- found 2026-09-19 by actually rendering both together and observing real overlap", () => {
    // The callout is positioned dynamically at cursorY (right after the
    // chart's endY), while the disclaimer/footer below are pinned to fixed
    // CARD_HEIGHT-186/150/116 offsets with no bounds check between them.
    // Rendering a real card with both present produced illegible, colliding
    // text -- reproduced with a Node-adapted copy of this exact file against
    // the founder's own reference fixture (chart: 4 steps, callout:
    // "STEP-FIXED COSTS"). No existing test in this suite would have caught
    // this, since none of them actually render a PNG. Chart takes priority:
    // never both. If this guard is ever loosened, re-verify by rendering
    // this file's own founder-reference fixture with both chart AND
    // callout populated and visually inspecting the output PNG -- do not
    // trust this string check alone as sufficient evidence.
    const idx = cardSource.indexOf("let calloutSvg");
    const calloutBlock = cardSource.slice(idx, idx + 200);
    expect(calloutBlock).toMatch(/input\.callout\s*&&\s*!\(input\.chart\s*&&\s*input\.chart\.steps\.length\s*>=\s*2\)/);
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
    // Updated 2026-09-20: the legacy headline-card path is now guarded by
    // "if (!cardResult && cardHeadline)" (it only runs when the newer
    // financial_chart attempt didn't already produce a card), not the bare
    // "if (cardHeadline)" this test originally checked for.
    const idx = generateSource.indexOf("if (!cardResult && cardHeadline)");
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

  it("wraps the headline at a character budget verified not to overflow the 1080px canvas", () => {
    // Verified 2026-09-19 by actually rendering the founder's own reference
    // headline ("COSTS DO NOT GROW IN STRAIGHT LINES") as real SVG and
    // measuring the text element's getBBox() in a browser: at the old
    // budget (20 chars/line, this weight/size), the widest wrapped line's
    // right edge measured ~1114px against a 1080px canvas -- a real
    // overflow of the founder's own flagship asset. 17 chars/line measured
    // ~997px, safely inside. Not pixel-exact font metrics, just a
    // regression guard against the budget silently loosening back up.
    expect(cardSource).toContain('wrapText(input.headline.toUpperCase(), 17, 5)');
  });
});

describe('financial_chart / two_thresholds renderer (Quantis Visual System, part 2)', () => {
  it('exports renderFinancialChartCard, additive to renderHeadlineCard, not a replacement', () => {
    expect(cardSource).toContain('export async function renderFinancialChartCard');
    expect(cardSource).toContain('export async function renderHeadlineCard');
  });

  it('draws exactly the series/markers it is given -- no interpolation, no invented values', () => {
    const idx = cardSource.indexOf('function renderTwoThresholdsChart');
    const end = cardSource.indexOf('export async function renderFinancialChartCard');
    const body = cardSource.slice(idx, end);
    expect(body).not.toMatch(/Math\.random|estimateValue|syntheticValue/i);
    // Linear interpolation only -- explicitly no bezier/smoothing, which
    // would visually imply more precision than a handful of caller-supplied
    // points actually has.
    expect(body).not.toMatch(/bezier|smooth|curveTo/i);
  });

  it('sizes the chart plot dynamically against the fixed disclaimer boundary, not a hardcoded height', () => {
    // Regression guard: found 2026-09-20 by actually rendering the
    // acceptance-test fixture -- a fixed 380px plot height let the chart's
    // own bottom axis line render at y=1174 on a 1350px canvas while the
    // disclaimer's fixed zone starts at CARD_HEIGHT-186 (=1164), drawing
    // the axis line directly through the disclaimer text. The plot height
    // must be derived from the caller-supplied boundary, never a constant.
    expect(cardSource).toContain('maxBottomY - AXIS_LABEL_CLEARANCE - plotTop');
    expect(cardSource).toContain('CARD_HEIGHT - 186');
  });

  it('omits the CTA rather than force it into a position that could overlap the chart or disclaimer', () => {
    // Regression guard: found 2026-09-20 by actually rendering the
    // acceptance-test fixture -- capping the CTA's Y independently of the
    // chart's real height let it render ABOVE the chart's own axis label
    // and left only ~6px clearance above the disclaimer. Omitting the CTA
    // when there isn't genuinely safe room is the same "no chart at all is
    // better than a wrong chart" philosophy already applied elsewhere in
    // this file.
    expect(cardSource).toMatch(/input\.cta\s*&&\s*ctaY\s*<=\s*CARD_HEIGHT\s*-\s*220/);
  });

  it('uses edge-aware label anchoring for chart markers -- the same overflow class as the 2026-09-19 headline fix', () => {
    const idx = cardSource.indexOf('const anchorFor');
    expect(idx).toBeGreaterThan(-1);
    const body = cardSource.slice(idx, idx + 300);
    expect(body).toContain("return 'start'");
    expect(body).toContain("return 'end'");
  });

  it('uses the exact spec colors for series (cyan/amber/muted mapped to the brand palette)', () => {
    expect(cardSource).toMatch(/CHART_COLOR.*cyan:\s*BRAND_ACCENT/s);
    expect(cardSource).toMatch(/amber:\s*BRAND_WARN/);
    expect(cardSource).toMatch(/muted:\s*BRAND_SUBTLE/);
  });
});

describe('FLUX prompt is background-only (Quantis Visual System brief SC, 2026-09-20)', () => {
  it('no longer asks for real people or real objects -- the direct cause of the "sad man with a robot" bug', () => {
    expect(generateSource).not.toMatch(/real people or real objects/);
  });

  it('explicitly forbids every category the brief lists: people, robots, text, charts, logos, UI', () => {
    const idx = generateSource.indexOf('const styledPrompt');
    expect(idx).toBeGreaterThan(-1);
    const promptLine = generateSource.slice(idx, generateSource.indexOf('\n', idx + 1) + 400);
    for (const forbidden of ['No people', 'no robots', 'No text', 'no charts', 'no logos', 'no UI elements', 'no app screenshots']) {
      expect(promptLine).toContain(forbidden);
    }
  });

  it('describes only an atmospheric background texture, not a depicted scene', () => {
    const idx = generateSource.indexOf('const styledPrompt');
    const promptLine = generateSource.slice(idx, idx + 900);
    expect(promptLine).toMatch(/[Bb]ackground texture/);
  });
});

describe('financial_chart wiring in content-studio-generate (Quantis Visual System, part 3)', () => {
  it('imports and uses the validated VisualSpec pipeline, not an ad-hoc shape', () => {
    expect(generateSource).toContain("import { selectVisualMode, validateVisualSpec, VisualSpecError");
    expect(generateSource).toContain('renderFinancialChartCard');
  });

  it('only requests visual_spec_hint from the model when the topic classifies as financial_chart', () => {
    expect(generateSource).toMatch(/opts\.visualMode === 'financial_chart' \? \[/);
  });

  it('never auto-selects financial_chart for a topic the model/UI didn\'t indicate is financial -- delegates to selectVisualMode, not a hardcoded true', () => {
    expect(generateSource).toContain('selectVisualMode(topic)');
  });

  it('falls back to the legacy headline-card path on VisualSpecError or a missing chart, rather than failing generation', () => {
    expect(generateSource).toContain('if (!cardResult && cardHeadline)');
  });

  it('does not leak the financial_chart attempt\'s error once the legacy fallback succeeds', () => {
    // Regression guard for a bug caught before shipping: cardError set by
    // the financial_chart attempt's catch block must be cleared before the
    // legacy fallback runs, or a successful fallback render would still
    // report an error in the response.
    const idx = generateSource.indexOf('const financialChartError = cardError');
    expect(idx).toBeGreaterThan(-1);
    const body = generateSource.slice(idx, idx + 200);
    expect(body).toContain('cardError = null;');
  });

  it('the financial_chart attempt does not depend on FLUX/image generation succeeding or failing (brief SC: independent paths)', () => {
    const idx = generateSource.indexOf('financial_chart path (Quantis Visual System');
    const end = generateSource.indexOf('if (!cardResult && cardHeadline)');
    const body = generateSource.slice(idx, end);
    expect(body).not.toMatch(/imageResult|imageError|imageProvider/);
  });

  it('validates the model-supplied visual_spec_hint through validateVisualSpec before rendering -- never renders raw model output', () => {
    const idx = generateSource.indexOf('financial_chart path (Quantis Visual System');
    const end = generateSource.indexOf('if (!cardResult && cardHeadline)');
    const body = generateSource.slice(idx, end);
    expect(body).toMatch(/validateVisualSpec\(candidate\)/);
  });

  it('sources the footer from a fixed server-side constant, never the model', () => {
    expect(generateSource).toContain("const FINANCIAL_CHART_FOOTER = 'AIWMC QUANTIS | Model the decision before you fund it.'");
  });

  it('returns visual_mode/source_status in the response for the UI to display (brief SD)', () => {
    expect(generateSource).toContain('visual_mode: visualModeUsed');
    expect(generateSource).toContain('source_status: sourceStatusUsed');
  });
});
