/**
 * CANONICAL FACTS — Single Source of Truth for the numbers Quantis claims publicly.
 * ================================================================================
 *
 * Per audit 2026-06-20, contradiction C-2/C-3/C-8: marketing copy was hardcoding
 * "95,500 benchmarks" and "95,500-scenario Monte Carlo" in dozens of files, AND
 * conflating two different numbers (benchmark corpus size vs. Monte Carlo
 * iteration count). Both must come from THIS file. Drift is a CI failure.
 *
 * RULE: every public claim about engine size/scale comes from here. Never
 * hardcode `95,500`, `46 sectors`, `1,000 iterations`, `8-layer`, or `5 free`
 * in a component, copy file, JSON-LD, or marketing post. Import from here.
 *
 * RECONCILIATION NOTE (open audit item):
 * - `BENCHMARK_COUNT = 95_500` is the public claim made historically and
 *   currently rendered on every marketing surface. The audit's DB probe shows
 *   the master benchmark tables contain 5 × 19,500 = 97,500 rows (or 19,511 in
 *   `benchmarks_v2_core` alone, depending on which table is canonical). The
 *   number here is the public claim; reconciling it to the DB truth is a
 *   separate decision (raise the corpus or correct the copy).
 */

/** Benchmark corpus size — number of rows across the master benchmark tables. */
export const BENCHMARK_COUNT = 95_500;
/** Formatted variant for display: "95,500". */
export const BENCHMARK_COUNT_DISPLAY = '95,500';

/** Number of industry sectors the corpus covers. */
export const BENCHMARK_SECTORS = 46;

/** Monte Carlo iteration count per analysis. Distinct from the benchmark corpus. */
export const MONTE_CARLO_ITERATIONS = 1_000;
/** Formatted variant for display: "1,000". */
export const MONTE_CARLO_ITERATIONS_DISPLAY = '1,000';

/** Number of layers in the analysis pipeline, including RVCE. */
export const PIPELINE_LAYERS = 8;
/** Human label used on /security, /methodology, /changelog, etc. */
export const PIPELINE_LAYERS_LABEL = '8-layer (incl. RVCE)';

/** Number of financial variables modelled per analysis (current generation). */
export const FINANCIAL_VARIABLES = 12;

/** Free-tier monthly analysis quota. Mirrors TIERS.free.limits.analysesPerMonth. */
export const FREE_ANALYSES_PER_MONTH = 5;

/** Time-to-verdict ceiling promised on the homepage hero. */
export const VERDICT_SECONDS = 90;

/**
 * Doc Studio template count — the number of distinct, functional document
 * templates a Plus/Pro user can generate. Source of truth is the count of
 * form components in src/components/docs/forms/index.ts, mirrored in the
 * `doc_templates` table (is_active rows). Corrected 2026-06-30: marketing
 * copy across the site had drifted to "12" / "12+" for over a year while
 * only 10 templates ever existed — never hardcode this number, import it.
 */
export const DOC_TEMPLATE_COUNT = 10;
/** Formatted variant for display: "10". */
export const DOC_TEMPLATE_COUNT_DISPLAY = '10';
