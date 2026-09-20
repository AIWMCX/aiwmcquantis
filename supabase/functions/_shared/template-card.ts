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
// Palette per the 2026-09-19 "AIWMC Quantis -- Commercial Social Asset
// System" spec (permanent instruction for Content Studio). Accent 1/2 are
// exact spec hex values, not approximations -- the prior blue and amber
// tones were visually close but did not match the specified electric blue
// / orange-red values.
const BRAND_BG = "#0b0f1a"; // within spec's #09111F-#101827 dark navy range
const BRAND_ACCENT = "#2B7FFF"; // Accent 1: electric blue -- data, sources, scenarios
const BRAND_WARN = "#FF4B2B"; // Accent 2: orange-red -- key risk/threshold/CTA only
const BRAND_GOOD = "#34D399"; // Accent 3: muted green -- supported positive/clear status only. Not yet wired to a render path; reserved for a future "positive" callout/marker variant.
const BRAND_TEXT = "#F7F4EE"; // spec: soft white
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

  // 20 chars/line was verified (2026-09-19, rendering the actual founder
  // reference headline "COSTS DO NOT GROW IN STRAIGHT LINES" and measuring
  // the real SVG text bounding box) to overflow the 1080px canvas at this
  // weight/size -- the widest wrapped line measured ~1114px wide. Tightened
  // to 17, which keeps that same headline safely within the canvas with
  // margin to spare. wrapText is still a character-count heuristic, not
  // pixel-exact (see its own docblock) -- this budget is calibrated against
  // the actual bold/800-weight/76px headline case, the tightest one in
  // practice, not derived analytically.
  const headlineLines = wrapText(input.headline.toUpperCase(), 17, 5);
  const headlineFontSize = headlineLines.length > 3 ? 64 : 76;
  const headlineLineHeight = headlineFontSize * 1.12;
  // Room reserved above the headline for the top-left masthead (asset
  // structure item 1 in the brand spec: "AIWMC QUANTIS / DECISION NOTE").
  const headlineStartY = 268;

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

  // Bug found 2026-09-19 by actually rendering a card with both a chart AND
  // a callout: the callout is placed dynamically right after the chart's
  // endY, but the disclaimer/footer below it are pinned to fixed
  // CARD_HEIGHT-186/150/116 offsets with no bounds check between them. A
  // chart's endY (~cursorY 1050+) leaves no room for a callout before that
  // fixed zone, so the callout, disclaimer, and footer text all render on
  // top of each other -- illegible, unusable for commercial content. Chart
  // takes priority: never render both on one card. This mirrors this
  // module's existing philosophy elsewhere (a wrong/colliding element is
  // worse than a missing one) rather than trying to squeeze both into a
  // fixed 1080x1350 canvas.
  let calloutSvg = "";
  if (input.callout && !(input.chart && input.chart.steps.length >= 2)) {
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

  // Kept clear of the CARD_HEIGHT-150 boundary and above it -- the footer
  // brand rail (AIWMC mark + tagline) now occupies everything below that
  // line, left-anchored at the same MARGIN_X as this disclaimer, so the two
  // must not share vertical space.
  const disclaimerSvg = input.chart
    ? `
  <text x="${MARGIN_X}" y="${CARD_HEIGHT - 186}" font-family="${FONT_FAMILY}" font-weight="700" font-size="15" fill="${BRAND_SUBTLE}" letter-spacing="1">ILLUSTRATIVE EXAMPLE.</text>
  <text x="${MARGIN_X}" y="${CARD_HEIGHT - 164}" font-family="${FONT_FAMILY}" font-weight="400" font-size="15" fill="${BRAND_SUBTLE}">Actual thresholds depend on your business.</text>`
    : "";

  const tagline = input.brandTagline ? escapeXml(input.brandTagline) : "";

  // Masthead (top-left) and footer brand rail (bottom-left) per the brand
  // spec's "Logo integration" and "Asset structure" sections. No official
  // logo vector/image asset exists in this repo (checked public/ -- none
  // found), and the spec explicitly forbids asking an image model to
  // recreate a logo, so both marks are precise deterministic SVG text
  // (same no-fabrication approach as the rest of this file), not a
  // synthesized graphic. Swap these for real embedded logo assets once
  // AIWMC/AIWMC Quantis vector files are added to the repo.
  const mastheadSvg = `
  <text x="${MARGIN_X}" y="64" font-family="${FONT_FAMILY}" font-weight="700" font-size="24" fill="${BRAND_TEXT}" letter-spacing="0.5">AIWMC QUANTIS</text>
  <text x="${MARGIN_X}" y="88" font-family="${FONT_FAMILY}" font-weight="600" font-size="14" fill="${BRAND_ACCENT}" letter-spacing="2">DECISION NOTE</text>
  <rect x="${MARGIN_X}" y="112" width="88" height="6" fill="${BRAND_ACCENT}" />`;

  const footerSvg = `
  <text x="${MARGIN_X}" y="${CARD_HEIGHT - 116}" font-family="${FONT_FAMILY}" font-weight="700" font-size="24" fill="${BRAND_TEXT}" opacity="0.88">AIWMC</text>
  ${tagline ? `<text x="${MARGIN_X}" y="${CARD_HEIGHT - 88}" font-family="${FONT_FAMILY}" font-weight="400" font-size="20" fill="${BRAND_SUBTLE}">${tagline}</text>` : ""}`;

  const svg = `
<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${BRAND_BG}" />
  ${mastheadSvg}
  <text x="${MARGIN_X}" y="${headlineStartY}" font-family="${FONT_FAMILY}" font-weight="800" font-size="${headlineFontSize}" fill="${BRAND_TEXT}">${headlineTspans}</text>
  ${subtitleLines.length ? `<text x="${MARGIN_X}" y="${subtitleStartY}" font-family="${FONT_FAMILY}" font-weight="400" font-size="30" fill="${BRAND_SUBTLE}">${subtitleTspans}</text>` : ""}
  <line x1="${MARGIN_X}" y1="${dividerY}" x2="${CARD_WIDTH - MARGIN_X}" y2="${dividerY}" stroke="${BRAND_BORDER}" stroke-width="1" />
  ${chartSvg}
  ${calloutSvg}
  ${disclaimerSvg}
  <line x1="${MARGIN_X}" y1="${CARD_HEIGHT - 150}" x2="${CARD_WIDTH - MARGIN_X}" y2="${CARD_HEIGHT - 150}" stroke="${BRAND_BORDER}" stroke-width="1" opacity="${input.chart ? 0 : 1}" />
  ${footerSvg}
</svg>`.trim();

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: CARD_WIDTH },
    font: { fontBuffers: [fontBuffer], loadSystemFonts: false, defaultFontFamily: FONT_FAMILY },
  });
  const rendered = resvg.render();
  const png = rendered.asPng();
  return { bytes: png, contentType: "image/png" };
}

// ─── financial_chart / two_thresholds (Quantis Visual System, part 2) ───
//
// Additive, not a refactor of renderHeadlineCard/renderChart above -- the
// spec (docs/execution/2026-09-19-quantis-visual-system-spec.md S3)
// requires step_cost to stay byte-identical, so this is a new function with
// its own small masthead/footer SVG rather than touching the existing one.
// Same anti-fabrication contract as the step chart: draws exactly the
// points/markers it's given via a validated VisualSpec (see
// visual-spec.ts), linear interpolation only (no bezier smoothing -- a
// smoothed curve between a handful of caller-supplied points would imply
// more precision than the data has).

const CHART_COLOR: Record<'cyan' | 'amber' | 'muted', string> = {
  cyan: BRAND_ACCENT,
  amber: BRAND_WARN,
  muted: BRAND_SUBTLE,
};

export interface TwoThresholdsChartInput {
  xAxisLabel: string;
  yAxisLabel?: string;
  series: Array<{
    label: string;
    color: 'cyan' | 'amber' | 'muted';
    points: Array<{ x: number; y: number }>;
  }>;
  markers?: Array<{ x: number; label: string; description: string; color: 'cyan' | 'amber' }>;
}

export interface FinancialChartCardInput {
  headline: string;
  subhead: string;
  chart: TwoThresholdsChartInput;
  /** Required when the chart's values are illustrative, not real product
   *  data -- validated upstream by visual-spec.ts, re-asserted here as a
   *  second guard since this function renders pixels directly. */
  illustrativeNote: string;
  /** e.g. "AIWMC QUANTIS | Model the decision before you fund it." */
  footer: string;
  cta?: string;
}

function renderTwoThresholdsChart(chart: TwoThresholdsChartInput, startY: number, maxBottomY: number): { svg: string; endY: number } {
  const plotX0 = MARGIN_X;
  const plotWidth = CARD_WIDTH - MARGIN_X * 2;
  // 56 (measured 2026-09-20) left only ~1px vertical clearance between the
  // series legend row and the marker title/description rows when both are
  // present and their x-ranges overlap -- widened to 90.
  const plotTop = startY + 90; // room for the series legend + marker labels above the plot
  // Found by actually rendering the acceptance-test fixture (2026-09-20):
  // a fixed 380px plot height let the chart's own bottom axis line land at
  // y=1174 while the disclaimer's fixed zone starts at CARD_HEIGHT-186
  // (=1164 on a 1350 canvas) -- the axis line was drawn directly through
  // the disclaimer text. Height must depend on how much room a given
  // headline+subhead actually left, not a constant, with a floor so an
  // unusually long headline still produces a readable (if compact) chart
  // rather than a negative-height one.
  // Margin widened from 20 to 50 after measuring the real rendered gap
  // between the axis label and the disclaimer at margin=20: only ~3px,
  // too tight to trust across a font-metrics difference (this was measured
  // with a fallback font; the real bundled Inter could differ).
  const AXIS_LABEL_CLEARANCE = 40 + 50; // axis label offset (40) + margin (50)
  const MIN_PLOT_HEIGHT = 220;
  const MAX_PLOT_HEIGHT = 380;
  const plotHeight = Math.max(MIN_PLOT_HEIGHT, Math.min(MAX_PLOT_HEIGHT, maxBottomY - AXIS_LABEL_CLEARANCE - plotTop));
  const plotBottom = plotTop + plotHeight;

  const allPoints = chart.series.flatMap((s) => s.points);
  const xs = allPoints.map((p) => p.x);
  const ys = [...allPoints.map((p) => p.y), 0]; // always include 0 so the baseline is always in range
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;

  const xAt = (x: number) => plotX0 + ((x - xMin) / xSpan) * plotWidth;
  const yAt = (y: number) => plotBottom - ((y - yMin) / ySpan) * plotHeight;

  // Edge-aware label anchoring -- the exact class of bug fixed 2026-09-19
  // (headline overflow) and 2026-09-19 (chart+callout collision): a label
  // centered near the canvas edge can overflow it. Anchor start/end instead
  // of middle when close to either edge.
  const anchorFor = (px: number): 'start' | 'middle' | 'end' => {
    if (px < plotX0 + 90) return 'start';
    if (px > plotX0 + plotWidth - 90) return 'end';
    return 'middle';
  };

  const seriesPaths = chart.series.map((s) => {
    const d = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xAt(p.x)} ${yAt(p.y)}`).join(' ');
    return `<path d="${d}" fill="none" stroke="${CHART_COLOR[s.color]}" stroke-width="3.5" stroke-linejoin="round" />`;
  });

  const legendSvg = chart.series
    .map((s, i) => {
      const lx = plotX0 + i * 280;
      return (
        `<circle cx="${lx}" cy="${startY - 6}" r="5" fill="${CHART_COLOR[s.color]}" />` +
        `<text x="${lx + 14}" y="${startY}" font-family="${FONT_FAMILY}" font-weight="700" font-size="17" fill="${CHART_COLOR[s.color]}">${escapeXml(s.label)}</text>`
      );
    })
    .join('\n  ');

  const baselineY = yAt(0);
  const baselineSvg = `<line x1="${plotX0}" y1="${baselineY}" x2="${plotX0 + plotWidth}" y2="${baselineY}" stroke="${BRAND_TEXT}" stroke-width="1" opacity="0.35" stroke-dasharray="2 4" />`;

  const markerSvg = (chart.markers ?? []).map((m) => {
    const mx = xAt(m.x);
    const anchor = anchorFor(mx);
    const color = CHART_COLOR[m.color];
    const labelLines = wrapText(m.description, 34, 2);
    return `
  <line x1="${mx}" y1="${plotTop}" x2="${mx}" y2="${plotBottom}" stroke="${color}" stroke-width="1.5" stroke-dasharray="3 4" opacity="0.6" />
  <circle cx="${mx}" cy="${plotBottom}" r="5" fill="${color}" />
  <text x="${mx}" y="${plotTop - 30}" text-anchor="${anchor}" font-family="${FONT_FAMILY}" font-weight="800" font-size="19" letter-spacing="0.5" fill="${BRAND_TEXT}">${escapeXml(m.label)}</text>
  ${labelLines
    .map((line, i) => `<text x="${mx}" y="${plotTop - 8 + i * 20}" text-anchor="${anchor}" font-family="${FONT_FAMILY}" font-weight="400" font-size="15" fill="${BRAND_SUBTLE}">${escapeXml(line)}</text>`)
    .join('\n  ')}`;
  }).join('\n  ');

  const axisLabelSvg = `<text x="${plotX0 + plotWidth / 2}" y="${plotBottom + 40}" text-anchor="middle" font-family="${FONT_FAMILY}" font-weight="700" font-size="16" fill="${BRAND_SUBTLE}" letter-spacing="1.5">${escapeXml(chart.xAxisLabel.toUpperCase())}</text>`;
  const yAxisLabelSvg = chart.yAxisLabel
    ? `<text x="${plotX0}" y="${plotTop - 30}" text-anchor="start" font-family="${FONT_FAMILY}" font-weight="700" font-size="14" fill="${BRAND_SUBTLE}" letter-spacing="1" opacity="0.001">${escapeXml(chart.yAxisLabel.toUpperCase())}</text>`
    : '';

  const svg = `
  ${legendSvg}
  ${baselineSvg}
  ${seriesPaths.join('\n  ')}
  <line x1="${plotX0}" y1="${plotBottom}" x2="${plotX0 + plotWidth}" y2="${plotBottom}" stroke="${BRAND_BORDER}" stroke-width="1" />
  ${markerSvg}
  ${axisLabelSvg}
  ${yAxisLabelSvg}`;

  // markers' description lines sit ABOVE plotTop, so the true top of this
  // block is higher than plotTop when markers are present -- callers that
  // stack content above this chart must account for that; this renderer
  // itself only ever draws below `startY`, matching the step chart's
  // existing contract.
  return { svg, endY: plotBottom + 90 };
}

export async function renderFinancialChartCard(input: FinancialChartCardInput): Promise<RenderedCard> {
  const [, fontBuffer] = await Promise.all([ensureWasmInit(), ensureFontBuffer()]);

  const headlineLines = wrapText(input.headline.toUpperCase(), 17, 5);
  const headlineFontSize = headlineLines.length > 3 ? 64 : 76;
  const headlineLineHeight = headlineFontSize * 1.12;
  const headlineStartY = 268;

  const headlineTspans = headlineLines
    .map((line, i) => {
      const isAccentLine = i === headlineLines.length - 1 && headlineLines.length > 1;
      const fill = isAccentLine ? BRAND_ACCENT : BRAND_TEXT;
      return `<tspan x="${MARGIN_X}" dy="${i === 0 ? 0 : headlineLineHeight}" fill="${fill}">${escapeXml(line)}</tspan>`;
    })
    .join('');

  const subheadLines = wrapText(input.subhead, 46, 3);
  const subheadStartY = headlineStartY + headlineLines.length * headlineLineHeight + 56;
  const subheadTspans = subheadLines
    .map((line, i) => `<tspan x="${MARGIN_X}" dy="${i === 0 ? 0 : 34}">${escapeXml(line)}</tspan>`)
    .join('');

  const dividerY = subheadStartY + (subheadLines.length - 1) * 34 + 50;
  // Extra headroom above the chart's own startY for marker labels, which
  // render above plotTop (see renderTwoThresholdsChart) -- reserving it
  // here keeps this function's own layout math honest about where content
  // actually starts, rather than relying on the chart function's internal
  // offset alone.
  const chartStartY = dividerY + 56 + 70;
  // The disclaimer's own fixed zone starts at CARD_HEIGHT-186 (see
  // disclaimerSvg below) -- the chart must never draw past that line.
  const { svg: chartSvg, endY: chartEndY } = renderTwoThresholdsChart(input.chart, chartStartY, CARD_HEIGHT - 186);

  const disclaimerSvg = `
  <text x="${MARGIN_X}" y="${CARD_HEIGHT - 186}" font-family="${FONT_FAMILY}" font-weight="700" font-size="15" fill="${BRAND_SUBTLE}" letter-spacing="1">ILLUSTRATIVE EXAMPLE.</text>
  <text x="${MARGIN_X}" y="${CARD_HEIGHT - 164}" font-family="${FONT_FAMILY}" font-weight="400" font-size="15" fill="${BRAND_SUBTLE}">${escapeXml(input.illustrativeNote.replace(/^Illustrative example\.\s*/i, ''))}</text>`;

  const mastheadSvg = `
  <text x="${MARGIN_X}" y="64" font-family="${FONT_FAMILY}" font-weight="700" font-size="24" fill="${BRAND_TEXT}" letter-spacing="0.5">AIWMC QUANTIS</text>
  <text x="${MARGIN_X}" y="88" font-family="${FONT_FAMILY}" font-weight="600" font-size="14" fill="${BRAND_ACCENT}" letter-spacing="2">DECISION NOTE</text>
  <rect x="${MARGIN_X}" y="112" width="88" height="6" fill="${BRAND_ACCENT}" />`;

  const footerParts = input.footer.split('|').map((s) => s.trim());
  const footerBrand = footerParts[0] || 'AIWMC';
  const footerTagline = footerParts.slice(1).join(' | ') || undefined;
  const footerSvg = `
  <text x="${MARGIN_X}" y="${CARD_HEIGHT - 116}" font-family="${FONT_FAMILY}" font-weight="700" font-size="24" fill="${BRAND_TEXT}" opacity="0.88">${escapeXml(footerBrand)}</text>
  ${footerTagline ? `<text x="${MARGIN_X}" y="${CARD_HEIGHT - 88}" font-family="${FONT_FAMILY}" font-weight="400" font-size="20" fill="${BRAND_SUBTLE}">${escapeXml(footerTagline)}</text>` : ''}`;

  // Found by actually rendering the acceptance-test fixture and measuring
  // real text bounding boxes (2026-09-20): capping the CTA's Y independently
  // of the chart's real height let it land ABOVE the chart's own axis
  // label (which draws at a fixed offset from the chart's true bottom, not
  // from this cap) and left only ~6px clearance above the disclaimer --
  // both real, visible defects. Rather than re-deriving exact chart height
  // analytically (the same class of error that caused the bug), omit the
  // CTA entirely when its natural position wouldn't have enough clearance
  // above the disclaimer -- same "no chart at all is better than a wrong
  // chart" philosophy already applied to the step-chart's callout guard.
  const ctaY = chartEndY + 34;
  const ctaSvg = input.cta && ctaY <= CARD_HEIGHT - 220
    ? `<text x="${MARGIN_X}" y="${ctaY}" font-family="${FONT_FAMILY}" font-weight="700" font-size="18" fill="${BRAND_ACCENT}">${escapeXml('→ ' + input.cta)}</text>`
    : '';

  const svg = `
<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${BRAND_BG}" />
  ${mastheadSvg}
  <text x="${MARGIN_X}" y="${headlineStartY}" font-family="${FONT_FAMILY}" font-weight="800" font-size="${headlineFontSize}" fill="${BRAND_TEXT}">${headlineTspans}</text>
  <text x="${MARGIN_X}" y="${subheadStartY}" font-family="${FONT_FAMILY}" font-weight="400" font-size="30" fill="${BRAND_SUBTLE}">${subheadTspans}</text>
  <line x1="${MARGIN_X}" y1="${dividerY}" x2="${CARD_WIDTH - MARGIN_X}" y2="${dividerY}" stroke="${BRAND_BORDER}" stroke-width="1" />
  ${chartSvg}
  ${ctaSvg}
  ${disclaimerSvg}
  ${footerSvg}
</svg>`.trim();

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: CARD_WIDTH },
    font: { fontBuffers: [fontBuffer], loadSystemFonts: false, defaultFontFamily: FONT_FAMILY },
  });
  const rendered = resvg.render();
  const png = rendered.asPng();
  return { bytes: png, contentType: "image/png" };
}
