import type { BusinessAnalysisResult } from './analysis';

/**
 * The canonical, versioned model an analysis produced — what
 * mapCanonicalModelToDocumentVariables reads from. This is the
 * analysis_snapshots row (versions/hashes) paired with the actual value
 * tree (`result`), since analysis_snapshots itself only stores payback
 * figures, not the full financial_analysis object.
 */
export interface CanonicalModelSnapshot {
  snapshotId: string;
  analysisId: string;
  engineVersion: string;
  formulaVersion: string;
  datasetVersion: string;
  numericOutputHash: string;
  result: BusinessAnalysisResult;
}

/**
 * A saved scenario_runs row. When present, its `output` supersedes the
 * base analysis result for value resolution — the document should reflect
 * what the scenario actually computed, not the original baseline.
 */
export interface ScenarioRunRef {
  scenarioRunId: string;
  /** Server-resolved analysis identity for this immutable run. */
  analysisId?: string;
  outputHash: string;
  engineVersion: string;
  formulaVersion: string;
  output: Partial<BusinessAnalysisResult> & Record<string, unknown>;
}

/** Placeholder until quote_versions/quote lineage exists (Phase F, not yet built). */
export interface QuoteVersionRef {
  quoteVersionId: string;
}

/**
 * One mapped document variable. Every field the master prompt's Docs
 * Studio contract requires is present so a document can always show its
 * own provenance: exactly which snapshot/run produced this number, under
 * which engine/formula version, with what hash.
 */
export interface DocumentVariable {
  canonicalKey: string;
  renderedValue: string | number | null;
  unit?: string;
  currency?: string;
  period?: string;
  sourcePath: string;
  modelSnapshotId: string;
  scenarioRunId?: string;
  quoteVersionId?: string;
  numericOutputHash: string;
  engineVersion: string;
  formulaVersion: string;
  /** Set (with renderedValue: null) when sourcePath resolves to nothing — never silently substituted with an unrelated metric or a fabricated growth path. */
  unavailableReason?: string;
}
