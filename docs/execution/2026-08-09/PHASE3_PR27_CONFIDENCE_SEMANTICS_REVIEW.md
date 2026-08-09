# Phase 3 — PR #27 Confidence Semantics: Diff Review + Consumer Inventory Completion

Date: 2026-08-09. PR #27 branch: `accuracy/confidence-semantics-split`, head
`b98ce05b` (2 commits ahead of `main` at `97540bc7`). Not merged, not deployed.

## Headline finding: PR #27's PDF fix targets dead code. The live "Download PDF" button is unaffected.

`ExecutiveReport.tsx`, `ReportCoverPage.tsx`, `ReportExecutiveSummary.tsx`, and
`ReportAppendix.tsx` (the whole React-component PDF-page family under
`src/components/pdf/`) are **never imported or rendered anywhere in the
application** — confirmed by a repo-wide search excluding self-references and
excluding the unrelated `createExecutiveReport` identifier (a different, real
function that happens to share a substring). No route, hook, or component
mounts `<ExecutiveReport>`. A `pdf-generator` Supabase edge function also exists
and is similarly never called from any client code.

The actual "Download PDF" button (`AnalysisResults.tsx`'s `handleExportPDF`,
also reachable via `AccuracyTransparentResults.tsx`, `useDocumentDownload.ts`,
and `Consultants.tsx` — all of which call the same `usePdfExport()` hook) goes
through a **second, entirely separate PDF-generation implementation**: an
inline `createExecutiveReport()` function defined directly in
`src/hooks/usePdfExport.ts` (lines 777-1798+), built with raw
`React.createElement(Document/Page/View/Text, ...)` calls against
`@react-pdf/renderer`, with its own independent `styles` object — not the
`pdfStyles.ts` file PR #27 touched.

**That live function still renders the bare, unlabeled score PR #27 exists to
fix:**

```
src/hooks/usePdfExport.ts:875
React.createElement(Text, { style: {...styles.coverMetricValue, color: getScoreColor(result.confidence_score)} }, `${result.confidence_score}%`)
```

Same pattern at lines 793/795 (verdict-threshold logic using the raw score).

**Consequence:** merging PR #27 as currently written closes zero real-world
exposure for the PDF. `docs/accuracy/confidence-score-consumers.md` (PR #27's
own consumer table) lists `ReportCoverPage.tsx` as `DONE` — that status is true
of the file in isolation but misleading about customer impact, since the file
it fixed is unreachable from any user action. This is exactly the "code exists
≠ implemented" trap the master directive's Definition of Done section warns
against, and it would have shipped as a false "fixed" claim if not caught here.

## Consumer inventory: the 9 previously-OPEN items, resolved

Per `docs/accuracy/confidence-score-consumers.md`'s own recommended audit
order:

| Consumer | Finding | Verdict |
|---|---|---|
| `src/pages/SharedReport.tsx` | Passes `confidence_score` into `<ConfidenceIndicator score breakdown .../>`, which already renders a labeled breakdown (Input Completeness 40%, Data Quality 30%, Validation Pass 20%, Industry Match 10%) alongside the number — not a bare unexplained percentage. The *number itself* is still the old blended `confidence_score` rather than PR #27's new `quality_dimensions`, but the presentation is not deceptive as-is. | **DEFER** — same class as the already-deferred `PersistentResultsHeader`/QSL item: swapping the input source is a separate, real migration decision, not a labeling bug. |
| `src/components/viral/ViralCard.tsx` | Renders a completely bare `{confidence}%` (line 164) on a **socially-shared image card** (Twitter/Reddit export), next to a "VIABLE"/"NEEDS WORK" verdict, with zero surrounding context or methodology link. This is the single highest-exposure instance of the exact pattern the directive prohibits — a stranger with no other context sees a bare percentage framed as a confidence verdict. | **HIGH PRIORITY — needs a fix**, not deferral. Recommend either replacing the bare `%` with the categorical tier pattern `ScenarioLibrary.tsx` already uses correctly (see below), or removing the number from the card entirely and keeping only the qualitative verdict. |
| `src/components/analysis/AccuracyTransparentResults.tsx` (3 occurrences) | All three are **inputs to derived verdict-tier logic** (`fast-track`/`caution`/`stop`), never rendered as a bare percentage to the user. | **OK as-is** — not a labeling violation. Same "which number feeds the tier" question as the deferred QSL item, not urgent. |
| `src/components/pdf/ReportExecutiveSummary.tsx` | Bare `Confidence Level: {score}%` (line 99) — **moot**, this file is part of the dead `ExecutiveReport.tsx` family above and never renders to a real user. | **N/A pending the dead-code decision** — see recommendation below. |
| `src/components/analysis/ScenarioLibrary.tsx` | Converts the raw score into a categorical `confTier` (`High`/`Medium`/`Low`) with color coding, never displays a bare number. | **OK as-is** — this is actually the correct pattern; worth reusing for `ViralCard.tsx`. |
| `src/pages/admin/QuantisHealth.tsx` | Admin-only dashboard averaging `confidence_score` across analyses for internal ops visibility. | **OK, lowest priority** — not customer-facing, per the doc's own correct prioritization. |
| `src/components/analysis/ScenarioComparison.tsx` | Only a type-interface field (`confidence_score: number \| null`) in this file; actual rendering happens in a consumer of this type, most likely `ScenarioLibrary.tsx`'s row (already audited above as OK). | **Type-only, no separate action** — not a distinct render site. |
| `src/components/analysis/StressMap.tsx` | `confidence` is one input among several to a computed "Overall Risk Index" penalty term, never displayed as a bare percentage on its own. | **OK as-is** — internal computation input, not a labeling issue. |
| `src/components/pdf/ReportAppendix.tsx` | Bare `{result.confidence_score}%` (line 81) — **moot**, same dead-code family as `ReportExecutiveSummary.tsx`. | **N/A pending the dead-code decision.** |

## What Phase 3 actually needs before merge

1. **Fix the real PDF** — apply PR #27's quality-dimensions decomposition to
   `usePdfExport.ts`'s inline `createExecutiveReport()` (the live function), not
   to the unreachable `ExecutiveReport.tsx` family. This is the one true gap
   between "PR #27 exists" and "PR #27 fixes the customer PDF."
2. **Decide the dead code's fate**: either (a) delete
   `ExecutiveReport.tsx`/`ReportCoverPage.tsx`/`ReportExecutiveSummary.tsx`/
   `ReportAppendix.tsx`/`pdf-generator` (they add maintenance surface and, as
   just proven, can absorb real fix effort while shipping nothing), or (b) wire
   one of them in and retire the inline `usePdfExport.ts` generator instead —
   but not both indefinitely. This is a scope decision for you, not something
   to resolve unilaterally.
3. **Fix `ViralCard.tsx`** — replace the bare percentage with the tier-label
   pattern already proven correct in `ScenarioLibrary.tsx`.
4. Everything else in the consumer table is genuinely fine as-is or correctly
   deferred with a documented reason — no further action needed there.

## Not yet done

- No code changes made for items 1 or 3 above — flagging for your direction
  before touching the live PDF export path (PDF content is a customer-facing
  change, and item 2 requires an explicit deletion/retirement decision this
  session should not make unilaterally).
- PDF payload/UI/PDF numeric parity (the directive's Phase 3 acceptance
  criterion) has not been tested — blocked on deciding which PDF pipeline is
  canonical first (item 2).
