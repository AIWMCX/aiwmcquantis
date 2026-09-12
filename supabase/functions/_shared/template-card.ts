// Deterministic AIWMC Quantis headline-card generator.
//
// Why this exists, not just a bigger diffusion-model prompt: a diffusion
// model (see image-gen.ts) can produce a photographic *mood* image, but
// cannot reliably render exact headline text, precise numbers, or a
// consistent brand mark -- ask it to draw text and you get garbled
// characters and invented data, which is worse than no text at all. The
// founder's reference asset ("COSTS DO NOT GROW IN STRAIGHT LINES", full
// step-chart layout) is a designed template graphic, not a photo -- exact
// typography, an exact chart, and an exact brand footer are the whole
// point. So this renders real SVG text and shapes deterministically and
// rasterizes them. No LLM, no diffusion model, no possibility of a
// misspelled headline or a fabricated number reaching the pixels.
//
// The chart is conditional and only ever draws numbers the caller supplies
// explicitly (see ChartInput) -- this module never invents, estimates, or
// rounds a value to make a nicer-looking chart. If content-studio-generate
// can't ground a chart in the post's own stated numbers, it passes no
// chart at all and the card renders as headline + subtitle + brand footer
// only. A wrong auto-chart would be worse than no chart.

import { Resvg, initWasm } from "npm:@resvg/resvg-wasm@2.6.2";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const MARGIN_X = 72;
const BRAND_BG = "#0b0f1a";
const BRAND_ACCENT = "#3b82f6";
const BRAND_WARN = "#f59e0b";
const BRAND_TEXT = "#f5f7fa";
const BRAND_SUBTLE = "#9aa4b2";
const BRAND_BORDER = "#232a3a";
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

export interface ChartStep {
  /** The exact numeric threshold as stated in the post, e.g. 30, 75, 120. */
  threshold: number;
  /** Short label for what happens at this threshold, e.g. "New employee". */
  annotation: string;
}

export interface ChartInput {
  /** e.g. "NUMBER OF CUSTOMERS" */
  xAxisLabel: string;
  /** e.g. "COSTS" -- the single series label, drawn in the warn color. */
  seriesLabel: string;
  /** Ascending by threshold. Caller's responsibility -- never re-sorted or
   *  re-derived here, since this module must never infer values on its own. */
  steps: ChartStep[];
}

export interface CalloutInput {
  title: string;
  body: string;
}

export interface HeadlineCardInput {
  headline: string;
  subtitle?: string;
  chart?: ChartInput;
  callout?: CalloutInput;
  /** Small line under the brand mark, e.g. "Model the assumptions behind growth." */
  brandTagline?: string;
}

export interface RenderedCard {
  bytes: Uint8Array;
  contentType: string;
}

function renderChart(chart: ChartInput, startY: number): { svg: string; endY: number } {
  const plotX0 = MARGIN_X;
  // Reserve the right ~14% of the plot as margin so the last step's
  // annotation label (centered on its point) never overflows the canvas
  // edge -- caught by actually rendering and looking at the output, not
  // assumed. Full CARD_WIDTH is still used for the axis line/tick "0".
  const plotWidth = (CARD_WIDTH - MARGIN_X * 2) * 0.86;
  const plotHeight = 340;
  const axisY = startY + plotHeight;
  const maxThreshold = Math.max(...chart.steps.map((s) => s.threshold), 1);
  const xAt = (value: number) => plotX0 + (value / maxThreshold) * plotWidth;
  const stepCount = chart.steps.length;
  // Step height is proportional to step INDEX, not real dollar magnitude --
  // we're only ever given a threshold + a label, never an actual cost
  // amount, so implying a precise cost scale would be exactly the kind of
  // fabricated financial visual this module exists to avoid. This shows
  // the *shape* (discrete jumps), not invented amounts -- the disclaimer
  // rendered below the chart says so explicitly.
  const stepY = (index: number) => axisY - ((index + 1) / stepCount) * (plotHeight - 60);

  const segments: string[] = [];
  const markers: string[] = [];
  const annotations: string[] = [];
  const ticks: string[] = [];

  let prevX = plotX0;
  let prevY = axisY;
  chart.steps.forEach((step, i) => {
    const x = xAt(step.threshold);
    const y = stepY(i);
    // Horizontal run at the previous level up to this threshold, then a
    // vertical jump to the new level (a true step function).
    segments.push(`M ${prevX} ${prevY} L ${x} ${prevY} L ${x} ${y}`);
    markers.push(`<circle cx="${x}" cy="${y}" r="6" fill="${BRAND_WARN}" />`);
    const label = `${step.threshold} ${escapeXml(chart.xAxisLabel.replace(/^NUMBER OF /i, ""))}`.trim();
    annotations.push(
      `<text x="${x}" y="${y - 44}" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="700" font-size="19" fill="${BRAND_TEXT}">${escapeXml(label)}</text>` +
      `<text x="${x}" y="${y - 20}" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="400" font-size="17" fill="${BRAND_SUBTLE}">${escapeXml(step.annotation)}</text>`,
    );
    ticks.push(
      `<text x="${x}" y="${axisY + 30}" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="400" font-size="17" fill="${BRAND_SUBTLE}">${step.threshold}</text>`,
    );
    prevX = x;
    prevY = y;
  });
  segments.push(`M ${prevX} ${prevY} L ${plotX0 + plotWidth} ${prevY}`);

  const seriesLabelSvg = `<text x="${plotX0}" y="${startY - 12}" text-anchor="start" font-family="${FONT_FAMILY}" font-weight="700" font-size="20" fill="${BRAND_WARN}">${escapeXml(chart.seriesLabel)}</text>`;
  const axisLabelSvg = `<text x="${plotX0 + plotWidth / 2}" y="${axisY + 58}" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="700" font-size="16" fill="${BRAND_SUBTLE}" letter-spacing="1.5">${escapeXml(chart.xAxisLabel.toUpperCase())}</text>`;

  const svg = `
  ${seriesLabelSvg}
  <path d="${segments.join(" ")}" fill="none" stroke="${BRAND_WARN}" stroke-width="3" />
  ${markers.join("\n  ")}
  ${annotations.join("\n  ")}
  <line x1="${plotX0}" y1="${axisY}" x2="${plotX0 + plotWidth}" y2="${axisY}" stroke="${BRAND_BORDER}" stroke-width="2" />
  <text x="${plotX0}" y="${axisY + 30}" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="400" font-size="17" fill="${BRAND_SUBTLE}">0</text>
  ${ticks.join("\n  ")}
  ${axisLabelSvg}`;

  return { svg, endY: axisY + 90 };
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
      return `<tspan x="${MARGIN_X}" dy="${i === 0 ? 0 : headlineLineHeight}" fill="${fill}">${escapeXml(line)}</tspan>`;
    })
    .join("");

  const subtitleLines = input.subtitle ? wrapText(input.subtitle, 46, 3) : [];
  const subtitleStartY = headlineStartY + headlineLines.length * headlineLineHeight + 56;
  const subtitleTspans = subtitleLines
    .map((line, i) => `<tspan x="${MARGIN_X}" dy="${i === 0 ? 0 : 34}">${escapeXml(line)}</tspan>`)
    .join("");

  let cursorY = subtitleLines.length
    ? subtitleStartY + (subtitleLines.length - 1) * 34 + 50
    : headlineStartY + headlineLines.length * headlineLineHeight + 50;

  const dividerY = cursorY;
  cursorY += 56;

  let chartSvg = "";
  if (input.chart && input.chart.steps.length >= 2) {
    const { svg, endY } = renderChart(input.chart, cursorY);
    chartSvg = svg;
    cursorY = endY;
  }

  let calloutSvg = "";
  if (input.callout) {
    const calloutTitleLines = wrapText(input.callout.title.toUpperCase(), 40, 1);
    const calloutBodyLines = wrapText(input.callout.body, 70, 3);
    const calloutY = cursorY;
    calloutSvg = `
  <rect x="${MARGIN_X}" y="${calloutY}" width="4" height="${28 + calloutBodyLines.length * 26}" fill="${BRAND_ACCENT}" />
  <text x="${MARGIN_X + 20}" y="${calloutY + 20}" font-family="${FONT_FAMILY}" font-weight="700" font-size="20" fill="${BRAND_TEXT}">${escapeXml(calloutTitleLines[0] ?? "")}</text>
  ${calloutBodyLines
    .map((line, i) => `<text x="${MARGIN_X + 20}" y="${calloutY + 48 + i * 26}" font-family="${FONT_FAMILY}" font-weight="400" font-size="18" fill="${BRAND_SUBTLE}">${escapeXml(line)}</text>`)
    .join("\n  ")}`;
    cursorY = calloutY + 40 + calloutBodyLines.length * 26 + 30;
  }

  const disclaimerSvg = input.chart
    ? `
  <text x="${MARGIN_X}" y="${CARD_HEIGHT - 150}" font-family="${FONT_FAMILY}" font-weight="700" font-size="15" fill="${BRAND_SUBTLE}" letter-spacing="1">ILLUSTRATIVE EXAMPLE.</text>
  <text x="${MARGIN_X}" y="${CARD_HEIGHT - 128}" font-family="${FONT_FAMILY}" font-weight="400" font-size="15" fill="${BRAND_SUBTLE}">Actual thresholds depend on your business.</text>`
    : "";

  const tagline = input.brandTagline ? escapeXml(input.brandTagline) : "";

  const svg = `
<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${BRAND_BG}" />
  <rect x="${MARGIN_X}" y="96" width="88" height="6" fill="${BRAND_ACCENT}" />
  <text x="${MARGIN_X}" y="${headlineStartY}" font-family="${FONT_FAMILY}" font-weight="800" font-size="${headlineFontSize}" fill="${BRAND_TEXT}">${headlineTspans}</text>
  ${subtitleLines.length ? `<text x="${MARGIN_X}" y="${subtitleStartY}" font-family="${FONT_FAMILY}" font-weight="400" font-size="30" fill="${BRAND_SUBTLE}">${subtitleTspans}</text>` : ""}
  <line x1="${MARGIN_X}" y1="${dividerY}" x2="${CARD_WIDTH - MARGIN_X}" y2="${dividerY}" stroke="${BRAND_BORDER}" stroke-width="1" />
  ${chartSvg}
  ${calloutSvg}
  ${disclaimerSvg}
  <line x1="${MARGIN_X}" y1="${CARD_HEIGHT - 150}" x2="${CARD_WIDTH - MARGIN_X}" y2="${CARD_HEIGHT - 150}" stroke="${BRAND_BORDER}" stroke-width="1" opacity="${input.chart ? 0 : 1}" />
  <text x="${CARD_WIDTH - MARGIN_X}" y="${CARD_HEIGHT - 116}" text-anchor="end" font-family="${FONT_FAMILY}" font-weight="700" font-size="30" fill="${BRAND_TEXT}">AIWMC QUANTIS</text>
  ${tagline ? `<text x="${CARD_WIDTH - MARGIN_X}" y="${CARD_HEIGHT - 82}" text-anchor="end" font-family="${FONT_FAMILY}" font-weight="400" font-size="20" fill="${BRAND_SUBTLE}">${tagline}</text>` : ""}
</svg>`.trim();

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: CARD_WIDTH },
    font: { fontBuffers: [fontBuffer], loadSystemFonts: false, defaultFontFamily: FONT_FAMILY },
  });
  const rendered = resvg.render();
  const png = rendered.asPng();
  return { bytes: png, contentType: "image/png" };
}
