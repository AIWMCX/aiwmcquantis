/**
 * Real end-to-end render smoke test for createExecutiveReport()
 * (src/hooks/usePdfExport.ts) -- actually calls @react-pdf/renderer's
 * pdf().toBuffer(), not a regex match against source text.
 *
 * Earns its place: this exact test caught a real, would-have-shipped
 * bug while building the GTM-audit item #7 fix (2026-08-25) -- the new
 * quality-dimensions chip combined fontFamily:'Helvetica-Bold' with
 * fontStyle:'italic' for a "not evaluated" dimension, asking react-pdf
 * for a font variant that isn't a registered standard-14 font
 * ("Could not resolve font for Helvetica-Bold, fontWeight 400, fontStyle
 * italic"). Since outcome_calibration is unconditionally NOT_AVAILABLE
 * today (no outcome-ingestion system exists yet -- see
 * quality-dimensions.ts), that code path runs on every single analysis,
 * so this would have crashed EVERY PDF export. None of the source-pattern
 * -matching tests elsewhere in this suite could have caught it -- only
 * an actual render does.
 */
import { describe, it, expect } from 'vitest';
import { pdf } from '@react-pdf/renderer';
import zlib from 'zlib';
import { createExecutiveReport, createDecisionMemoReport } from '../hooks/usePdfExport';
import type { BusinessAnalysisResult } from '../types/analysis';

// react-pdf's toBuffer() returns a readable stream in this Node/Vitest
// environment, not an actual Buffer -- collecting it into real bytes is
// what makes the assertions below meaningful (byte size, PDF header,
// extracted text), rather than the earlier tests' `expect(x).toBeTruthy()`
// on the stream object itself, which is true even for a broken stream.
async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// react-pdf renders text as hex-encoded TJ/Tj operators inside
// FlateDecode-compressed content streams, even for standard fonts with no
// custom embedding -- a raw substring search against the PDF bytes (or
// even the inflated stream bytes) never matches literal words. This
// decompresses every stream object and hex-decodes every `<...>` text
// operand to recover the actual rendered text, verified empirically
// against a real generated Decision Memo PDF before writing this test.
function extractPdfText(buffer: Buffer): string {
  const latin1 = buffer.toString('latin1');
  // Slice each stream by its declared /Length. A regex that trims an optional
  // "\r" before "endstream" silently drops the last byte whenever the
  // compressed data happens to end in 0x0D -- which depends on content (even
  // the footer date), so the old extractor lost whole pages on some days.
  const dictRe = /\/Length (\d+)(?![\d ]*R)[^]*?>>\s*stream\r?\n/g;
  let decoded = '';
  let match: RegExpExecArray | null;
  while ((match = dictRe.exec(latin1))) {
    const start = match.index + match[0].length;
    const data = latin1.slice(start, start + Number(match[1]));
    try {
      decoded += zlib.inflateSync(Buffer.from(data, 'latin1')).toString('latin1') + '\n';
    } catch {
      // not every stream object is Flate-encoded (e.g. embedded binaries) -- skip
    }
  }
  const hexRe = /<([0-9a-fA-F]+)>/g;
  let text = '';
  let hexMatch: RegExpExecArray | null;
  while ((hexMatch = hexRe.exec(decoded))) {
    const hex = hexMatch[1];
    if (hex.length % 2 !== 0) continue;
    text += Buffer.from(hex, 'hex').toString('latin1');
  }
  return text;
}

const baseFinancial: any = {
  mrr: 10000,
  arr: 120000,
  scenarios: {
    pessimistic: { revenue: 8000, variable_costs: 3000, fixed_costs: 2000, gross_profit: 5000, net_profit: 3000, gross_margin: 62, net_margin: 37 },
    base: { revenue: 10000, variable_costs: 3500, fixed_costs: 2000, gross_profit: 6500, net_profit: 4500, gross_margin: 65, net_margin: 45 },
    optimistic: { revenue: 13000, variable_costs: 4000, fixed_costs: 2000, gross_profit: 9000, net_profit: 7000, gross_margin: 69, net_margin: 54 },
  },
  unit_economics: { contribution_margin: 100, contribution_margin_ratio: 0.7, cac: 150, cac_payback_months: 3, ltv: 900, ltv_cac_ratio: 6 },
  breakeven: { breakeven_units: 100, breakeven_revenue: 5000, breakeven_months: 4 },
  returns: { payback_period_months: 8, roi_year_1: 40, roi_year_3: 120, npv_3_years: 50000 },
  startup_investment: { total: 20000, breakdown: { equipment: 8000, working_capital: 12000 }, reasoning: 'test' },
  monthly_expenses: { total: 5500, variable_costs: 3500, fixed_costs: 2000, breakdown: { rent: 500, utilities: 200, salaries: 3000, marketing: 1000, other: 800 } },
  monthly_profit: 4500,
  payback_period_months: 8,
};

const result: BusinessAnalysisResult = {
  financial_analysis: baseFinancial,
  business_plan: { executive_summary: 'test', product_description: 'test', target_audience: 'test', competitive_advantages: 'test', operations: 'test', launch_steps: [], risks: [] },
  marketing_plan: { positioning: 'test', pricing_strategy: 'test', channels: [], cac: 150, ltv: 900, first_3_months_plan: 'test' },
  market_analysis: { market_size: { tam: '1', sam: '2', som: '3' }, trends: [], competition: { main_competitors: [], competitive_landscape: 'test', market_gaps: 'test' }, barriers_to_entry: 'test', growth_opportunities: 'test' },
  confidence_score: 72,
  data_sources: ['test source'],
  limitations: ['test limitation'],
  metadata: { idea: 'Test business', location: 'Austin, TX', generated_at: new Date().toISOString(), model: 'test', version: '1' },
  validation: {
    quality_dimensions: {
      input_completeness: 80,
      source_coverage: 55,
      benchmark_match_quality: 'PASS',
      scenario_reconciliation: 'PASS',
      narrative_reconciliation: 'CORRECTED',
      formula_reconciliation: 'PASS',
      outcome_calibration: 'NOT_AVAILABLE',
      evidence: {
        source_coverage: 'test', benchmark_match_quality: 'test', scenario_reconciliation: 'test',
        narrative_reconciliation: 'test', formula_reconciliation: 'test', outcome_calibration: 'test',
      },
    },
  } as any,
} as any;

describe('createExecutiveReport render smoke test', () => {
  it('renders to a PDF buffer without throwing, with quality_dimensions present', async () => {
    const doc = createExecutiveReport(result);
    const instance = pdf(doc as any);
    const buffer = await instance.toBuffer();
    expect(buffer).toBeTruthy();
  });

  it('renders to a PDF buffer without throwing, WITHOUT quality_dimensions (legacy fallback path)', async () => {
    const legacyResult = { ...result, validation: undefined };
    const doc = createExecutiveReport(legacyResult as any);
    const instance = pdf(doc as any);
    const buffer = await instance.toBuffer();
    expect(buffer).toBeTruthy();
  });

  // Phase 7 (Paid Decision Workflow Validation, 2026-08-30): the Decision
  // Memo page is new react-pdf markup with its own font/style combinations
  // -- exactly the class of bug this file's own header comment describes
  // (a font-variant mismatch that only a real render, not a source-pattern
  // match, can catch).
  //
  // This test consumes the stream into real bytes and checks actual PDF
  // content, not merely that a truthy stream object came back (a broken or
  // empty stream is also "truthy") -- promoted to a permanent regression
  // test after a 2026-08-30 manual verification (logging a real
  // paid_engagements row and exporting through this exact function) asked
  // for exactly this rigor before the row was deleted.
  it('produces a valid, nontrivial PDF with real Decision Memo content when engagementContext is provided', async () => {
    const decisionQuestion = 'Should we open a second location in Q1?';
    const consultantNotes = 'Reviewed unit economics against the last 6 months of actuals; margins hold up.';
    const doc = createExecutiveReport(result, undefined, [], {
      preparedFor: 'Jane Founder, CFO',
      decisionQuestion,
      consultantNotes,
    });
    const stream = await pdf(doc as any).toBuffer();
    const buffer = await streamToBuffer(stream as unknown as NodeJS.ReadableStream);

    // Valid PDF header.
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    // Nontrivial size -- a broken/near-empty render would be a few hundred
    // bytes at most; a real multi-page report is tens of kilobytes.
    expect(buffer.length).toBeGreaterThan(10_000);

    const text = extractPdfText(buffer);
    expect(text).toContain('DECISION MEMO');
    expect(text).toContain(decisionQuestion);
    expect(text).toContain(consultantNotes);
    // Sanity check that extraction itself works and isn't vacuously
    // passing -- the rest of the report's own content must appear too.
    expect(text).toContain(result.metadata.idea);
  });

  it('renders to a PDF buffer without throwing, with a partial engagementContext (single field only)', async () => {
    const doc = createExecutiveReport(result, undefined, [], { decisionQuestion: 'Is this worth pursuing?' });
    const instance = pdf(doc as any);
    const buffer = await instance.toBuffer();
    expect(buffer).toBeTruthy();
  });
});

// Stage 4 (Reports Consolidation, 2026-09-27): the Decision Memo is a new,
// shorter document assembled from its own react-pdf markup -- the same
// class of font/style-combination bug this file exists to catch could
// just as easily hide in it. Reuses the same `result` fixture and the
// same real-render assertions (valid PDF header, nontrivial size, decoded
// text content) as createExecutiveReport's suite above.
describe('createDecisionMemoReport render smoke test', () => {
  it('produces a valid, nontrivial PDF with the expected Decision Memo sections', async () => {
    const doc = createDecisionMemoReport(result);
    const stream = await pdf(doc as any).toBuffer();
    const buffer = await streamToBuffer(stream as unknown as NodeJS.ReadableStream);

    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(5_000);

    const text = extractPdfText(buffer);
    expect(text).toContain(result.metadata.idea);
    expect(text).toContain('Assessment');
    expect(text).toContain('Financial Consequence');
    expect(text).toContain('Critical Assumptions');
    expect(text).toContain('Downside Case');
    expect(text).toContain('What Changes the Answer');
    expect(text).toContain('Risks');
    expect(text).toContain('Recommended Validation');
    expect(text).toContain('Financial Summary');
    expect(text).toContain('Evidence & Methodology');
    // Same downside numbers the Full Report's Scenario Analysis table
    // reads from financial_analysis.scenarios.pessimistic -- confirms no
    // second calculation path exists for this figure.
    expect(text).toContain('$3,000');
  });

  it('renders to a PDF buffer without throwing when actionable_insights/assumption_graph/risks are absent (older stored analyses)', async () => {
    const doc = createDecisionMemoReport(result);
    const instance = pdf(doc as any);
    const buffer = await instance.toBuffer();
    expect(buffer).toBeTruthy();
  });

  it('renders real critical-assumption and next-action text when actionable_insights/assumption_graph are present, matching DecisionSummary.tsx\'s own selectors', async () => {
    const richResult = {
      ...result,
      actionable_insights: {
        insights: [
          {
            id: 'i1', metric_name: 'CAC Payback', current_value: 5, target_value: 3, gap: 2,
            priority: 'critical', status: 'danger', headline: 'test', explanation: 'CAC payback is too slow',
            why_it_matters: 'Slows reinvestment', action_plan: { strategy: 's', tactics: [], expected_outcome: 'o', time_to_result: 't' },
          },
        ],
        summary: { total_insights: 1, critical_count: 1, high_count: 0, medium_count: 0, low_count: 0, overall_health: 'needs_work', top_priority: 'CAC Payback', quick_wins: [] },
      },
      assumption_graph: {
        nodes: [],
        edges: [],
        fragility_score: 0.4,
        criticalPath: [
          { assumption: 'Customer acquisition cost', sensitivity: 0.9, breakingThreshold: 300, currentValue: 150, direction: 'up', recommendation: 'Run a paid-channel test before committing capital' },
        ],
      },
    } as unknown as BusinessAnalysisResult;

    const doc = createDecisionMemoReport(richResult);
    const stream = await pdf(doc as any).toBuffer();
    const buffer = await streamToBuffer(stream as unknown as NodeJS.ReadableStream);
    const text = extractPdfText(buffer);

    expect(text).toContain('CAC Payback');
    expect(text).toContain('Slows reinvestment');
    expect(text).toContain('Customer acquisition cost');
    expect(text).toContain('Run a paid-channel test before committing capital');
  });
});
