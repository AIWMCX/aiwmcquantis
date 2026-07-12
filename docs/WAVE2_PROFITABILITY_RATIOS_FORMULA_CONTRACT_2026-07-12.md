# Wave 2 — Profitability Ratios Formula Contract

Status: contract + implementation, same commit series as Wave 1.
Owner: AIWMC LLC · Drafted: 2026-07-12

## Scoping finding (read before implementing anything else in this family)

The engine collects revenue, COGS, operating expenses, and net profit —
but no ongoing balance-sheet data at all: no tracked inventory level, no
accounts receivable, no accounts payable, no separate assets/equity
figures (only a single lump `startupInvestment`). This means, of the
Wave 2 formula family named in the 2026-07-12 CTO-verdict document:

**Implemented for real, this commit:**
- Gross margin
- Operating margin
- Net margin

**Typed `INSUFFICIENT_INPUTS`, not implemented, not faked:**
- ROA, ROE, ROIC — would need real total-assets / shareholders'-equity
  tracking, which does not exist. Using `startupInvestment` as a stand-in
  for "invested capital" would be exactly the kind of fabricated-precision
  metric the audit documents warn against.
- Inventory turnover, DIO, AR turnover, DSO, AP turnover, DPO, cash
  conversion cycle — need real inventory/receivable/payable balances,
  which the engine never collects. Implementing these now would mean
  inventing balance-sheet numbers from nothing.

Both groups require a real input-collection initiative (a new balance-
sheet input surface) before they can be honestly computed — that is
separate, larger scope, not part of this wave.

## Metric — Gross / Operating / Net Margin

- **Metric ID:** `profitability_margins.v1`
- **Business question:** What share of revenue is retained at each level of the P&L?
- **Applicable archetypes:** all — margin is a universal concept once revenue and cost lines exist.
- **Definition:**
  ```
  GrossMargin = (Revenue - COGS) / Revenue
  OperatingMargin = OperatingIncome / Revenue     [OperatingIncome ≈ EBIT in this engine — no D&A/interest modeled separately, so operating income == net profit before this distinction exists]
  NetMargin = NetIncome / Revenue
  ```
- **Input variables:** `revenue`, `cogs`, `operatingIncome` (this engine's `netProfit`, since it doesn't separately model D&A/interest/taxes yet — documented, not hidden), `netIncome` (same value as operatingIncome today, for the same reason).
- **Unit:** ratio (0.0–1.0, can be negative). **Frequency:** monthly, matching the engine's existing grid.
- **Invalid states:** negative revenue → `INVALID_INPUTS`.
- **Unavailable states:** `revenue == 0` → `status: NOT_MEANINGFUL`, reasonCode `ZERO_REVENUE_DENOMINATOR` — never divide by zero.
- **Reconciliation identities:** `GrossMargin >= OperatingMargin >= NetMargin` is NOT guaranteed in general (a business could have non-operating income), but in THIS engine (no non-operating items modeled) it must hold — a violation is a real bug signal.
- **Golden cases:** (a) standard profitable business; (b) revenue == 0 → `NOT_MEANINGFUL`; (c) net margin above 100% is mathematically impossible when NetIncome <= Revenue by construction — must never render a margin over 100% as if plausible.
- **Report wording:** clearly label that "operating margin" and "net margin" are currently identical in this engine's model (no D&A/interest/tax layer yet) — do not silently present two different numbers if they happen to compute the same, and do not hide that they're currently the same calculation.
