import { describe, expect, it } from 'vitest';
import {
  validateVisualSpec,
  selectVisualMode,
  VisualSpecError,
  type VisualSpec,
} from '../../supabase/functions/_shared/visual-spec.ts';

// Unlike template-card.ts's tests (string-matching against source, since
// that file needs Deno's npm: specifier for resvg-wasm), visual-spec.ts has
// zero Deno-specific imports and is imported directly here -- these assert
// real behavior of the actual validation logic, not source text.

const breakEvenSpec: VisualSpec = {
  mode: 'financial_chart',
  topic: 'Break-even is not payback',
  headline: 'BREAK-EVEN IS NOT PAYBACK.',
  subhead: 'A business can cover this month’s costs and still not have recovered what it took to start.',
  sourceStatus: 'illustrative',
  chart: {
    type: 'two_thresholds',
    xAxisLabel: 'Time (months)',
    yAxisLabel: 'Amount ($)',
    series: [
      {
        label: 'Monthly operating profit',
        color: 'cyan',
        points: [{ x: 0, y: -2000 }, { x: 9, y: 0 }, { x: 24, y: 3000 }],
      },
      {
        label: 'Cumulative cash recovery',
        color: 'amber',
        points: [{ x: 0, y: -20000 }, { x: 18, y: 0 }, { x: 24, y: 5000 }],
      },
    ],
    markers: [
      { x: 9, label: 'BREAK-EVEN', description: 'Operating profit covers monthly costs.', color: 'cyan' },
      { x: 18, label: 'PAYBACK', description: 'Initial investment is recovered.', color: 'amber' },
    ],
  },
  footer: 'AIWMC QUANTIS | Model the decision before you fund it.',
  illustrativeNote: 'Illustrative example. Actual thresholds depend on your business.',
  cta: 'Run a complimentary Decision Pre-mortem',
};

describe('selectVisualMode -- acceptance test F.1', () => {
  it('selects financial_chart for "Break-even is not payback"', () => {
    expect(selectVisualMode('Break-even is not payback')).toBe('financial_chart');
  });

  it('selects financial_chart for other financial-relationship topics', () => {
    expect(selectVisualMode('Costs do not grow in straight lines')).toBe('financial_chart');
    expect(selectVisualMode('Why your runway is shorter than you think')).toBe('financial_chart');
    expect(selectVisualMode('Retention beats acquisition')).toBe('financial_chart');
  });

  it('falls back to editorial_headline for a non-financial topic', () => {
    expect(selectVisualMode('How we hire our first designer')).toBe('editorial_headline');
  });

  it('never auto-selects product_proof, regardless of topic wording', () => {
    // Not derivable from the return type, but a literal repeat guards
    // against a future edit accidentally adding it as a possible return.
    const result = selectVisualMode('Look at our real product screenshot dashboard');
    expect(result).not.toBe('product_proof');
  });
});

describe('validateVisualSpec -- acceptance test example (Break-even is not payback)', () => {
  it('accepts the fully-formed two_thresholds fixture', () => {
    const result = validateVisualSpec(breakEvenSpec);
    expect(result.headline).toBe('BREAK-EVEN IS NOT PAYBACK.');
    expect(result.chart?.markers).toHaveLength(2);
    expect(result.chart?.markers?.[0].label).toBe('BREAK-EVEN');
    expect(result.chart?.markers?.[1].label).toBe('PAYBACK');
  });
});

describe('validateVisualSpec -- rejection rules (brief non-negotiables)', () => {
  it('rejects a headline over 7 words', () => {
    const spec = { ...breakEvenSpec, headline: 'This headline definitely has way more than seven words in it' };
    expect(() => validateVisualSpec(spec)).toThrow(VisualSpecError);
  });

  it('rejects a subhead over 22 words', () => {
    const longSubhead = Array.from({ length: 23 }, (_, i) => `word${i}`).join(' ');
    const spec = { ...breakEvenSpec, subhead: longSubhead };
    expect(() => validateVisualSpec(spec)).toThrow(VisualSpecError);
  });

  it('rejects an illustrative chart with no illustrativeNote -- the brief’s truth rule', () => {
    const { illustrativeNote, ...spec } = breakEvenSpec;
    expect(() => validateVisualSpec(spec)).toThrow(/illustrativeNote is required/);
  });

  it('rejects a chart attached to a non-financial_chart mode', () => {
    const spec = { ...breakEvenSpec, mode: 'editorial_headline' as const };
    expect(() => validateVisualSpec(spec)).toThrow(/chart is only valid when mode is financial_chart/);
  });

  it('rejects product_proof with no screenshotStoragePath -- never a generated image standing in for a real one', () => {
    const spec = {
      mode: 'product_proof' as const,
      topic: 'Our dashboard',
      headline: 'REAL PRODUCT, REAL NUMBERS',
      subhead: 'A real screenshot from a real workspace.',
      sourceStatus: 'product_verified' as const,
      footer: 'AIWMC QUANTIS | Model the decision before you fund it.',
    };
    expect(() => validateVisualSpec(spec)).toThrow(/screenshotStoragePath/);
  });

  it('rejects a two_thresholds chart with the wrong series count', () => {
    const spec = {
      ...breakEvenSpec,
      chart: { ...breakEvenSpec.chart!, series: [breakEvenSpec.chart!.series[0]] },
    };
    expect(() => validateVisualSpec(spec)).toThrow(/requires exactly 2 series/);
  });

  it('rejects an unsupported chart type', () => {
    const spec = { ...breakEvenSpec, chart: { ...breakEvenSpec.chart!, type: 'pie' as never } };
    expect(() => validateVisualSpec(spec)).toThrow(/supported ChartType/);
  });

  it('rejects out-of-order points rather than silently re-sorting them', () => {
    const spec = {
      ...breakEvenSpec,
      chart: {
        ...breakEvenSpec.chart!,
        series: [
          { label: 'Bad series', color: 'cyan' as const, points: [{ x: 10, y: 0 }, { x: 5, y: 1 }] },
          breakEvenSpec.chart!.series[1],
        ],
      },
    };
    expect(() => validateVisualSpec(spec)).toThrow(/ascending by x/);
  });

  it('rejects more than 6 chart markers/annotations', () => {
    const marker = { x: 1, label: 'X', description: 'Y', color: 'cyan' as const };
    const spec = { ...breakEvenSpec, chart: { ...breakEvenSpec.chart!, markers: Array(7).fill(marker) } };
    expect(() => validateVisualSpec(spec)).toThrow(/must not exceed 6/);
  });

  it('never coerces a missing/invalid field -- throws rather than guessing', () => {
    expect(() => validateVisualSpec({})).toThrow(VisualSpecError);
    expect(() => validateVisualSpec(null)).toThrow(VisualSpecError);
    expect(() => validateVisualSpec('not an object')).toThrow(VisualSpecError);
  });
});
