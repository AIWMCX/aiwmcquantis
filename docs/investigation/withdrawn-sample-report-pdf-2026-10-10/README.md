# Withdrawn sample-report PDF (2026-10-10)

Previously served at `/sample-report/quantis-sample-report.pdf` (plus
`qpage-01.jpg` … `qpage-15.jpg`, apparently per-page render artifacts from
whatever tool generated the PDF) and linked from three CTAs on the landing
hero. Withdrawn, not deleted, pending investigation.

## Why

Extracted page 7 with PyMuPDF and compared it against the live web preview
for the same report ("The Draft Lab," Austin coffee shop). They are not the
same document:

| | Web preview (page 7) | This PDF (page 7) |
|---|---|---|
| Section title | "Bottom-up P&L (Year 2 steady state)" | "Three-Scenario Financial Model" |
| Monthly revenue | $28,400 | $480 / $600 / $750 (pessimistic/base/optimistic) |
| Net profit | $11,800 | **−$575,655 to −$805,058** |
| Net margin | (not shown as a %) | **−107,341% to −119,928%** |
| CAC payback | 5 months (elsewhere in the report) | **"999 months"** (classic divide-by-zero sentinel) |
| Footer | "Page 7 / 15" | **"Page 4 of 10"** |

The footer page-count mismatch ("4 of 10" vs this report's own 15 pages) is
the strongest signal: this looks like a page from an entirely different,
apparently broken report that got mixed into this PDF's page-7 slot, most
likely a stale artifact from an earlier report-generation pipeline that was
never regenerated when the current 15-page "Draft Lab" web report was built.

## What's still unknown

- Whether the other 14 pages of the PDF also mismatch, or only page 7 — not
  checked.
- What tool/process originally generated this PDF, and whether that
  pipeline still exists/runs, or is itself dead code.
- Whether `qpage-*.jpg` were ever actually served/linked anywhere (grep
  found no source references to them directly — only the `.pdf` itself was
  linked from the UI).

## Next step, if someone picks this up

Don't regenerate this PDF by hand-copying the (now-fixed) web preview
numbers into a new static file — that reintroduces the exact drift problem
these two artifacts just had. The PDF should be generated *from* the same
`SAMPLE_REPORT` object in `src/data/sampleReport.ts` that the web preview
already renders from, the same way `export-document`/`pdf-generator`
presumably does for real user analyses, so the two can never diverge again.
