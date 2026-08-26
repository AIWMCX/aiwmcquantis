/**
 * Pure display logic for the PDF cover page's quality-dimensions
 * breakdown, extracted so it can be called directly and asserted on for
 * real (same pattern as pdf-verdict.ts / pdf-benchmark-summary.ts).
 *
 * GTM-audit item #7 (2026-08-25): the shipping PDF cover
 * (usePdfExport.ts) showed a single "Confidence Score" percentage --
 * exactly the ambiguity flagged in the original incident report
 * ("Confidence is presented as 95%, 61%, and 94% AI without clearly
 * distinguishing input completeness, external validation confidence, and
 * AI contribution"). The decomposed signal (QualityDimensions) already
 * existed server-side (supabase/functions/_shared/quality-dimensions.ts,
 * attached to every analysis's `validation.quality_dimensions`) and an
 * honest breakdown UI for it already existed too
 * (src/components/pdf/ReportCoverPage.tsx) -- but that component uses
 * plain div/style JSX, not @react-pdf/renderer's View/Text/StyleSheet
 * primitives, and has ZERO importers anywhere in the app: it's leftover
 * from before the html2pdf.js -> react-pdf migration (see
 * pdf-export.test.ts's "the deleted html2pdf.js stack creeping back in"
 * guard) and was never actually reachable. This ports that same, already-
 * reviewed logic into the primitives the real shipping PDF uses.
 */
import type { QualityStatus } from '@/types/analysis';

// ROUND-2 REVIEW FIX (ported verbatim from the orphaned ReportCoverPage.tsx):
// UNVERIFIED/NOT_AVAILABLE must read as explicitly non-evaluated, not as a
// quiet member of the same pass/fail family -- a reader skimming five
// same-shaped chips will otherwise treat them as equivalent outcomes.
export const QUALITY_STATUS_LABEL: Record<QualityStatus, string> = {
  PASS: 'Pass',
  WARN: 'Warn',
  FAIL: 'Fail',
  CORRECTED: 'Corrected',
  UNVERIFIED: 'Not evaluated for this report',
  NOT_AVAILABLE: 'Not available',
};

export const QUALITY_STATUS_COLOR: Record<QualityStatus, string> = {
  PASS: '#22c55e',
  WARN: '#f59e0b',
  FAIL: '#ef4444',
  CORRECTED: '#3b82f6',
  UNVERIFIED: '#94a3b8',
  NOT_AVAILABLE: '#94a3b8',
};

export const QUALITY_STATUS_IS_EVALUATED: Record<QualityStatus, boolean> = {
  PASS: true,
  WARN: true,
  FAIL: true,
  CORRECTED: true,
  UNVERIFIED: false,
  NOT_AVAILABLE: false,
};

// Note: input-completeness coloring deliberately reuses usePdfExport.ts's
// existing getScoreColor() (70/50 thresholds) rather than a duplicate
// function here -- they were already identical, and this file's job is to
// add the dimensions getScoreColor didn't cover, not fork its logic.

/** Matches ReportCoverPage.tsx's original thresholds for this dimension --
 *  deliberately different breakpoints from input completeness, since
 *  source coverage (real-provenance share of material assumptions) is
 *  legitimately lower on average than input completeness. */
export function sourceCoverageColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}
