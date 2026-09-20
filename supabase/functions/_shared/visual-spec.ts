// VisualSpec — the validated shape a render call site consumes, replacing
// ad-hoc card_chart/card_callout fields bolted onto the caption JSON.
//
// Deliberately zero Deno-specific imports (no `npm:` specifiers) so this
// file is plain, portable TypeScript: importable directly by both the Deno
// edge function and a Vitest test in src/__tests__, unlike template-card.ts
// (which needs @resvg/resvg-wasm and can only be tested by string-matching
// its source). That means the tests for this file exercise the real
// validation logic, not just grep for expected substrings.
//
// Same anti-fabrication discipline as template-card.ts's existing
// card_chart/card_callout validation: never coerce, never fill a missing
// field with a guess, discard the whole spec (VisualSpecError) rather than
// rendering something the caller didn't actually ask for.

export type ChartType = 'step_cost' | 'two_thresholds' | 'two_lines' | 'three_scenarios';

export interface ChartPoint {
  x: number;
  y: number;
}

export interface ChartSeries {
  label: string;
  color: 'cyan' | 'amber' | 'muted';
  /** Ascending by x. Caller's responsibility -- never re-sorted or
   *  re-derived here, matching template-card.ts's step-chart contract of
   *  "never invent, estimate, or infer a value." */
  points: ChartPoint[];
}

export interface ChartMarker {
  x: number;
  label: string;
  description: string;
  color: 'cyan' | 'amber';
}

export interface ChartSpec {
  type: ChartType;
  xAxisLabel: string;
  /** Absent for step_cost, which deliberately has no numeric y-scale (see
   *  template-card.ts's renderChart docblock on why). */
  yAxisLabel?: string;
  series: ChartSeries[];
  markers?: ChartMarker[];
}

export type SourceStatus = 'illustrative' | 'product_verified' | 'externally_cited';

export type VisualMode = 'financial_chart' | 'editorial_headline' | 'product_proof';

export interface VisualSpec {
  mode: VisualMode;
  topic: string;
  headline: string;
  subhead: string;
  sourceStatus: SourceStatus;
  chart?: ChartSpec;
  /** Only for mode: 'product_proof' -- a path already uploaded to the
   *  content-assets bucket by a human. Never a generated image. */
  screenshotStoragePath?: string;
  footer: string;
  illustrativeNote?: string;
  cta?: string;
}

export class VisualSpecError extends Error {
  constructor(message: string, public readonly field: string) {
    super(message);
    this.name = 'VisualSpecError';
  }
}

const MAX_HEADLINE_WORDS = 7;
const MAX_SUBHEAD_WORDS = 22;
const MAX_CHART_ANNOTATIONS = 6;

const SERIES_COUNT_BY_TYPE: Record<ChartType, number> = {
  step_cost: 1,
  two_thresholds: 2,
  two_lines: 2,
  three_scenarios: 3,
};

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new VisualSpecError(`${field} must be a non-empty string`, field);
  }
  return value.trim();
}

function validateChartSpec(raw: unknown): ChartSpec {
  if (!raw || typeof raw !== 'object') {
    throw new VisualSpecError('chart must be an object', 'chart');
  }
  const c = raw as Record<string, unknown>;
  const type = c.type;
  if (type !== 'step_cost' && type !== 'two_thresholds' && type !== 'two_lines' && type !== 'three_scenarios') {
    throw new VisualSpecError(`chart.type must be a supported ChartType, got: ${String(type)}`, 'chart.type');
  }
  const xAxisLabel = requireString(c.xAxisLabel, 'chart.xAxisLabel');
  const yAxisLabel = c.yAxisLabel === undefined ? undefined : requireString(c.yAxisLabel, 'chart.yAxisLabel');

  if (!Array.isArray(c.series)) {
    throw new VisualSpecError('chart.series must be an array', 'chart.series');
  }
  const expectedSeriesCount = SERIES_COUNT_BY_TYPE[type];
  if (c.series.length !== expectedSeriesCount) {
    throw new VisualSpecError(
      `chart.type "${type}" requires exactly ${expectedSeriesCount} series, got ${c.series.length}`,
      'chart.series',
    );
  }
  const series: ChartSeries[] = c.series.map((s, i) => {
    if (!s || typeof s !== 'object') {
      throw new VisualSpecError(`chart.series[${i}] must be an object`, 'chart.series');
    }
    const so = s as Record<string, unknown>;
    const label = requireString(so.label, `chart.series[${i}].label`);
    const color = so.color;
    if (color !== 'cyan' && color !== 'amber' && color !== 'muted') {
      throw new VisualSpecError(`chart.series[${i}].color must be cyan/amber/muted`, `chart.series[${i}].color`);
    }
    if (!Array.isArray(so.points) || so.points.length < 2) {
      throw new VisualSpecError(`chart.series[${i}].points must have at least 2 points`, `chart.series[${i}].points`);
    }
    const points: ChartPoint[] = so.points.map((p, j) => {
      const po = p as Record<string, unknown>;
      if (typeof po?.x !== 'number' || !Number.isFinite(po.x) || typeof po?.y !== 'number' || !Number.isFinite(po.y)) {
        throw new VisualSpecError(`chart.series[${i}].points[${j}] must be {x: number, y: number}`, `chart.series[${i}].points`);
      }
      return { x: po.x, y: po.y };
    });
    // Caller's responsibility, never re-derived: reject out-of-order points
    // rather than silently re-sorting them, since a silent re-sort could
    // mask a genuine data-entry error in the caller.
    for (let k = 1; k < points.length; k++) {
      if (points[k].x < points[k - 1].x) {
        throw new VisualSpecError(`chart.series[${i}].points must be ascending by x`, `chart.series[${i}].points`);
      }
    }
    return { label, color, points };
  });

  let markers: ChartMarker[] | undefined;
  if (c.markers !== undefined) {
    if (!Array.isArray(c.markers)) {
      throw new VisualSpecError('chart.markers must be an array', 'chart.markers');
    }
    if (c.markers.length > MAX_CHART_ANNOTATIONS) {
      throw new VisualSpecError(`chart.markers must not exceed ${MAX_CHART_ANNOTATIONS}`, 'chart.markers');
    }
    markers = c.markers.map((m, i) => {
      const mo = m as Record<string, unknown>;
      if (typeof mo?.x !== 'number' || !Number.isFinite(mo.x)) {
        throw new VisualSpecError(`chart.markers[${i}].x must be a number`, 'chart.markers');
      }
      const label = requireString(mo.label, `chart.markers[${i}].label`);
      const description = requireString(mo.description, `chart.markers[${i}].description`);
      const color = mo.color;
      if (color !== 'cyan' && color !== 'amber') {
        throw new VisualSpecError(`chart.markers[${i}].color must be cyan/amber`, `chart.markers[${i}].color`);
      }
      return { x: mo.x, label, description, color };
    });
  }

  return { type, xAxisLabel, yAxisLabel, series, markers };
}

/** Throws VisualSpecError on any invalid/unsupported spec. Never coerces,
 *  never fills a missing field with a guess. */
export function validateVisualSpec(raw: unknown): VisualSpec {
  if (!raw || typeof raw !== 'object') {
    throw new VisualSpecError('spec must be an object', 'root');
  }
  const s = raw as Record<string, unknown>;

  const mode = s.mode;
  if (mode !== 'financial_chart' && mode !== 'editorial_headline' && mode !== 'product_proof') {
    throw new VisualSpecError(`mode must be financial_chart/editorial_headline/product_proof, got: ${String(mode)}`, 'mode');
  }

  const topic = requireString(s.topic, 'topic');
  const headline = requireString(s.headline, 'headline');
  if (wordCount(headline) > MAX_HEADLINE_WORDS) {
    throw new VisualSpecError(`headline must be at most ${MAX_HEADLINE_WORDS} words`, 'headline');
  }
  const subhead = requireString(s.subhead, 'subhead');
  if (wordCount(subhead) > MAX_SUBHEAD_WORDS) {
    throw new VisualSpecError(`subhead must be at most ${MAX_SUBHEAD_WORDS} words`, 'subhead');
  }

  const sourceStatus = s.sourceStatus;
  if (sourceStatus !== 'illustrative' && sourceStatus !== 'product_verified' && sourceStatus !== 'externally_cited') {
    throw new VisualSpecError('sourceStatus must be illustrative/product_verified/externally_cited', 'sourceStatus');
  }

  const footer = requireString(s.footer, 'footer');

  let chart: ChartSpec | undefined;
  if (mode === 'financial_chart') {
    chart = validateChartSpec(s.chart);
  } else if (s.chart !== undefined) {
    throw new VisualSpecError(`chart is only valid when mode is financial_chart, got mode: ${mode}`, 'chart');
  }

  let screenshotStoragePath: string | undefined;
  if (mode === 'product_proof') {
    screenshotStoragePath = requireString(s.screenshotStoragePath, 'screenshotStoragePath');
  } else if (s.screenshotStoragePath !== undefined) {
    throw new VisualSpecError('screenshotStoragePath is only valid when mode is product_proof', 'screenshotStoragePath');
  }

  // The brief's non-negotiable rule: an illustrative numeric chart must
  // visibly carry the disclaimer. Enforced here, not left to the renderer
  // to remember -- a spec that would render an unlabeled illustrative
  // chart is itself invalid.
  let illustrativeNote: string | undefined;
  if (s.illustrativeNote !== undefined) {
    illustrativeNote = requireString(s.illustrativeNote, 'illustrativeNote');
  }
  if (sourceStatus === 'illustrative' && chart && !illustrativeNote) {
    throw new VisualSpecError(
      'illustrativeNote is required when sourceStatus is illustrative and a chart is present',
      'illustrativeNote',
    );
  }

  const cta = s.cta === undefined ? undefined : requireString(s.cta, 'cta');

  return { mode, topic, headline, subhead, sourceStatus, chart, screenshotStoragePath, footer, illustrativeNote, cta };
}

// Mode auto-selection (brief §"Default automatically to financial_chart").
// A plain keyword list, not an LLM call -- determinism matters more than
// nuance here. A false negative just falls through to editorial_headline,
// which is always a safe, renderable default; product_proof is never
// auto-selected (see docstring below).
const FINANCIAL_KEYWORDS = [
  'break-even', 'break even', 'payback', 'revenue', 'cash', 'cost', 'costs',
  'threshold', 'scenario', 'runway', 'contribution margin', 'margin',
  'retention', 'acquisition', 'capacity', 'churn', 'burn', 'profit',
  'pricing', 'unit economics', 'cac', 'ltv',
];

/** Never returns 'product_proof' -- that mode requires the caller to
 *  explicitly attach a real, already-uploaded screenshot, matching the
 *  brief's "never generate fake dashboards" rule. It cannot be inferred
 *  from a topic string. */
export function selectVisualMode(topic: string): 'financial_chart' | 'editorial_headline' {
  const lower = topic.toLowerCase();
  return FINANCIAL_KEYWORDS.some((kw) => lower.includes(kw)) ? 'financial_chart' : 'editorial_headline';
}
