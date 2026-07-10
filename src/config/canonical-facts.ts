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
 * RECONCILIATION NOTE (resolved 2026-07-11):
 * - `BENCHMARK_COUNT` was `95_500` (a historical marketing claim) for ~3 weeks
 *   while the real number sat unresolved. Resolved by running
 *   `select table_name from information_schema.tables where table_schema =
 *   'public' and table_name ilike '%benchmark%'` then a per-table `count(*)`
 *   directly against production Supabase (2026-07-11): five canonical tables
 *   — `benchmark_master_core`, `_geo`, `_invoice`, `_risk`, `_unit_econ` —
 *   each hold exactly 19,500 rows = 97,500 total. A sixth table,
 *   `industry_benchmarks` (39 rows), is a small separate taxonomy/reference
 *   table, not part of the benchmark-observation corpus, and is excluded.
 *   97,500 is now the real, DB-verified number — not 95,500, not 19,511.
 */

/** Benchmark corpus size — number of rows across the 5 master benchmark tables
 *  (benchmark_master_core/geo/invoice/risk/unit_econ, 19,500 rows each),
 *  DB-verified 2026-07-11. Excludes the separate industry_benchmarks table. */
export const BENCHMARK_COUNT = 97_500;
/** Formatted variant for display: "97,500". */
export const BENCHMARK_COUNT_DISPLAY = '97,500';

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

/**
 * Consultant cost anchor used across pricing/marketing copy — "a consultant
 * charges $1,500-$25,000 for one stress-test."
 *
 * CORRECTED 2026-07-07: an earlier pass (2026-07-05) treated a flat
 * "$3,000 / $250-hr" figure as the established convention and "fixed" two
 * surfaces (ConsultantComparison.tsx, index.html noscript) to match it.
 * That was backwards. Per MOAT-ROADMAP v1.0's locked positioning line and
 * autoposterContentPlan.ts's existing marketing copy, the canonical anchor
 * is the RANGE below, with a $350/hr rate (already live in paywall.json —
 * NOT $250/hr, which was never used anywhere else and was itself the drift).
 * The 2026-07-05 fix is reverted by this correction.
 */
export const CONSULTANT_COST_LOW = 1_500;
export const CONSULTANT_COST_HIGH = 25_000;
/** Formatted variant for display: "$1,500-$25,000". */
export const CONSULTANT_COST_RANGE_DISPLAY = '$1,500-$25,000';
/** CFO/consultant hourly rate anchor, used alongside the range. */
export const CONSULTANT_HOURLY_RATE = 350;
/** Formatted variant for display: "$350/hr". */
export const CONSULTANT_HOURLY_RATE_DISPLAY = '$350/hr';

/**
 * IDENTITY CONSTANTS — added 2026-07-11 per docs/STABILIZATION_FREEZE.md.
 * These close the two "which surface is authoritative" contradictions an
 * external audit flagged: legal entity name and canonical host. Both are
 * already enforced elsewhere (Footer.tsx hardcodes "AIWMC™ LLC"; the apex
 * domain 308-redirects to www — confirmed live 2026-07-11 via a direct
 * HttpWebRequest with AllowAutoRedirect=false). These constants exist so
 * future surfaces reference one source instead of re-typing the string.
 */
export const LEGAL_ENTITY_NAME = 'AIWMC™ LLC';
/** The one canonical, indexable host. Apex aiwmcquantis.com 308s here. */
export const CANONICAL_HOST = 'https://www.aiwmcquantis.com';

/**
 * PROCESSING TIME CLAIM — single source for the "under 90 seconds" /
 * "90-second" claim family. VERDICT_SECONDS above is the numeric value;
 * this is the one canonical phrasing. An external audit (2026-07-11) found
 * three different speed claims across surfaces ("under 60 seconds", "90
 * seconds", "three minutes") on what turned out to be a stale, pre-redirect
 * crawl of the apex domain — live verification the same day found only this
 * phrasing on the canonical host. Kept here so it can't drift again.
 */
export const PROCESSING_TIME_CLAIM = 'under 90 seconds';

/**
 * BENCHMARK DEFINITION — precise wording for what BENCHMARK_COUNT actually
 * counts, so "benchmarks" and "data points" stop being used interchangeably
 * (a real, unresolved contradiction flagged by an external audit 2026-07-11,
 * on top of the pre-existing 2026-06-20 reconciliation note above). This is
 * a STATED DEFINITION, not a verified one — the DB audit query needed to
 * actually prove this against production data has not been run. Do not
 * treat this string as closing the open reconciliation note above; it only
 * standardizes the *wording* until the number itself is reconciled.
 */
export const BENCHMARK_DEFINITION = 'industry and location benchmark observations from public, licensed, and proprietary datasets';
