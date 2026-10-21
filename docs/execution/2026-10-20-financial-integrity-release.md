# Quantis financial integrity and buyer trust release review

Status: local review branch `codex-redteam-financial-integrity-20261020`; not pushed, deployed or production verified. Base commit: `fe4f4364`. Financial commit: `034bf5fa`; operations commit: `40c367d9`.

## Reproduced consulting case

Synthetic Denver retainer business: 10 active clients at $3,000/month = $30,000 steady monthly revenue; $22,000 stated **total** monthly operating costs = $8,000 steady monthly operating profit. The $60,000 figure is treated as initial project investment for the payback calculation. It is not a proven opening cash balance. Direct delivery costs, acquisition spending timing, tax, debt, collections and working capital were not separately supplied; gross margin, cash runway and full cash flow cannot be independently answered from these inputs.

The existing six-month revenue ramp and its stated 60% fixed / 40% variable cost allocation produce first nonnegative monthly operations in month 4 and cumulative investment recovery in month 11. The two figures are different by definition. This fixture is covered in `src/__tests__/financial-input-presence.test.ts`. If the user intends $60,000 as available cash rather than project investment, the payback result needs a separate investment input.

## Defect ledger

| Severity | Finding and affected surface | Resolution / evidence | Remaining boundary |
| --- | --- | --- | --- |
| P0 | Missing canonical revenue could fall back to monthly profit in document autofill. | Mapper now leaves revenue absent and preserves explicit zero; `analysis-autofill-integrity.test.ts`. | Run a real saved-analysis-to-export check. |
| P0 | Scenario document handoff could lose the selected analysis and scenario identity. | Durable references and server ownership checks added in Scenario Workspace, Docs Studio and promotion endpoint. | Authenticated save, reload, direct navigation and exported-file check. |
| P0 | Supplied total costs could be counted again as direct costs; break-even and investment payback could be conflated. | Total-cost allocation and separate operating/payback functions; synthetic fixture above. | Validate production result versions and more cost structures. |
| P1 | Business-plan preview/export showed missing break-even as `0 mo`. | Missing month is optional and renders `Not provided`; a real month must be a positive integer. | Inspect a generated PDF/HTML export end to end. |
| P1 | An untouched business plan also displayed zero revenue, zero market size and a seed funding request for $0. | Missing numeric projections and market sizes are optional and render `Not provided`; an unspecified funding request is labeled as such. The rendered preview regression test passes. | Verify the generated document file and all other template defaults. |
| P1 | Advanced-input form promised about 40% accuracy and displayed a calculated confidence gain from field count. | Claims removed; form describes supplied assumptions, counts genuine zero, and focused UI test passes. | Sweep remaining claims on public and paid surfaces. |
| P1 | Founder panel mixed session counts with user/event labels, review receipts with SaaS revenue, and could silently truncate large source tables. | Labels, timestamps and bounded pagination corrected; errors are surfaced when the 20,000-row ceiling is exceeded. | Compare authenticated panel values against production source queries and SaaS billing ledger. |
| P1 | Ambiguous SMTP outcome could retry an accepted email. | Send is held for mailbox reconciliation after SMTP begins. | Verify live mailbox status, queued leads and provider reconciliation. |
| P1 | Interrupted autoposter claim could remain indefinitely in `publishing`. | Stale claims become `unknown` for platform reconciliation, without automatic republish. | Verify current schedules, platform posts and publication URLs. |

## Buyer and payment blockers still to verify

The highest trust blockers are traceability from entered assumptions to every displayed number, a client-ready exported report that matches the saved scenario, clear treatment of unknown cash runway and gross margin, and a complete paid fulfillment record rather than a completion counter. Activation and payment require real user journeys; repository tests alone cannot establish conversion or willingness to pay.

The repository payback gate passed for 51 complete examples, but it flagged two hand-authored examples for manual reconciliation: `coffee-shop-denver` and `consulting-firm-new-york`. These warnings remain open. The observed 27% versus 56% gross margin discrepancy, contradictory verdicts, and sensitivity breakpoint direction have not yet been reproduced in an authenticated current production run.

## Verification and release gates

- Focused financial/UI tests: 8 passed.
- Business-plan preview regression and focused component TypeScript check: passed after the additional missing-data correction.
- Full suite: 2,015 passed, 23 skipped, one local Git ownership failure. That test passed separately (3 tests) with a process-local `safe.directory` setting; no global Git configuration changed.
- Financial TypeScript check and focused app TypeScript check: passed.
- Payback integrity script: passed with the two manual-review warnings above.
- `git diff --check` with CRLF-aware Git setting: passed.
- GitHub CLI: token invalid; branch cannot be pushed from this session yet.
- Production frontend release, deployed function versions, migration ledger, live mailbox status, scheduled posts, lead queue, paid rehearsal, and actual exported files: not verified.

Next release gate: refresh GitHub authentication, reconcile Supabase migration history, run CI on a PR, then perform read-only source-to-KPI checks and synthetic end-to-end export/fulfillment checks before any production deployment claim.
