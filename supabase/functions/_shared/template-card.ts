// Deterministic AIWMC Quantis headline-card generator.
//
// Why this exists, not just a bigger diffusion-model prompt: a diffusion
// model (see image-gen.ts) can produce a photographic *mood* image, but
// cannot reliably render exact headline text, precise numbers, or a
// consistent brand mark -- ask it to draw text and you get garbled
// characters and invented data, which is worse than no text at all. The
// founder's reference asset ("COSTS DO NOT GROW IN STRAIGHT LINES") is a
// designed template graphic, not a photo -- exact typography and an exact
// brand footer are the whole point. So this renders real SVG text,
// deterministically, and rasterizes it. No LLM, no diffusion model, no
// possibility of a misspelled headline or a fabricated number.
//
// Deliberately does NOT auto-generate a data chart from freeform post text
// in this pass -- inferring an accurate chart from prose is exactly the
// "fabricated financial visual" risk called out elsewhere in this codebase
// (see analyze-business's narrative-honesty guards). A wrong auto-chart
// would be worse than no chart. Headline + subtitle + brand footer covers
// most of what makes the reference image work; charts are a deliberate
// follow-up once there's a structured data input to draw from.

import { Resvg, initWasm } from "npm:@resvg/resvg-wasm@2.6.2";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const BRAND_BG = "#0b0f1a";
const BRAND_ACCENT = "#3b82f6";
const BRAND_TEXT = "#f5f7fa";
const BRAND_SUBTLE = "#9aa4b2";
const FONT_FAMILY = "Inter";
// resvg-wasm has zero system fonts available in this sandboxed runtime --
// confirmed by direct testing: a `font-family: Arial` render produced a
// PNG with every <text> element silently blank (no error, no text pixels).
// A font must be explicitly bundled and passed to Resvg's `font.fontBuffers`
// option, same pattern as the wasm binary itself. Inter's variable TTF from
// Google's own font repo (OFL-licensed) is fetched once and cached.
const FONT_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf";

let wasmInit: Promise<void> | null = null;
let fontBufferPromise: Promise<Uint8Array> | null = null;

function ensureWasmInit(): Promise<void> {
  if (!wasmInit) {
    wasmInit = fetch(
      "https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm",
    )
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch resvg wasm binary: ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buf) => initWasm(buf));
  }
  return wasmInit;
}

function ensureFontBuffer(): Promise<Uint8Array> {
  if (!fontBufferPromise) {
    fontBufferPromise = fetch(FONT_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch card font: ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buf) => new Uint8Array(buf));
  }
  return fontBufferPromise;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Greedy word-wrap by character budget -- good enough for a fixed-width
 *  headline font; not pixel-exact, but the font is monospaced-adjacent
 *  enough at this weight/size for the wrap to look right in practice. */
function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

export interface HeadlineCardInput {
  headline: string;
  subtitle?: string;
  /** Small line under the brand mark, e.g. "Model the assumptions behind growth." */
  brandTagline?: string;
}

export interface RenderedCard {
  bytes: Uint8Array;
  contentType: string;
}

export async function renderHeadlineCard(input: HeadlineCardInput): Promise<RenderedCard> {
  const [, fontBuffer] = await Promise.all([ensureWasmInit(), ensureFontBuffer()]);

  const headlineLines = wrapText(input.headline.toUpperCase(), 20, 5);
  const headlineFontSize = headlineLines.length > 3 ? 64 : 76;
  const headlineLineHeight = headlineFontSize * 1.12;
  const headlineStartY = 210;

  const headlineTspans = headlineLines
    .map((line, i) => {
      const isAccentLine = i === headlineLines.length - 1 && headlineLines.length > 1;
      const fill = isAccentLine ? BRAND_ACCENT : BRAND_TEXT;
      return `<tspan x="72" dy="${i === 0 ? 0 : headlineLineHeight}" fill="${fill}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  const subtitleLines = input.subtitle ? wrapText(input.subtitle, 46, 3) : [];
  const subtitleStartY = headlineStartY + headlineLines.length * headlineLineHeight + 56;
  const subtitleTspans = subtitleLines
    .map((line, i) => `<tspan x="72" dy="${i === 0 ? 0 : 34}">${escapeXml(line)}</tspan>`)
    .join("");

  const tagline = input.brandTagline ? escapeXml(input.brandTagline) : "";

  const svg = `
<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${BRAND_BG}" />
  <rect x="72" y="96" width="88" height="6" fill="${BRAND_ACCENT}" />
  <text x="72" y="${headlineStartY}" font-family="${FONT_FAMILY}" font-weight="800" font-size="${headlineFontSize}" fill="${BRAND_TEXT}">${headlineTspans}</text>
  ${subtitleLines.length ? `<text x="72" y="${subtitleStartY}" font-family="${FONT_FAMILY}" font-weight="400" font-size="30" fill="${BRAND_SUBTLE}">${subtitleTspans}</text>` : ""}
  <text x="${CARD_WIDTH - 72}" y="${CARD_HEIGHT - 116}" text-anchor="end" font-family="${FONT_FAMILY}" font-weight="700" font-size="30" fill="${BRAND_TEXT}">AIWMC QUANTIS</text>
  ${tagline ? `<text x="${CARD_WIDTH - 72}" y="${CARD_HEIGHT - 82}" text-anchor="end" font-family="${FONT_FAMILY}" font-weight="400" font-size="20" fill="${BRAND_SUBTLE}">${tagline}</text>` : ""}
</svg>`.trim();

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: CARD_WIDTH },
    font: { fontBuffers: [fontBuffer], loadSystemFonts: false, defaultFontFamily: FONT_FAMILY },
  });
  const rendered = resvg.render();
  const png = rendered.asPng();
  return { bytes: png, contentType: "image/png" };
}
