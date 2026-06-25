# QOC-ECON v1.0 — Applied Improvements

**Date:** 2026-06-25 · **Source:** QOC_Token_Economics_And_Improvements.docx

The QOC-ECON document specifies 5 improvements assuming a 4-call Anthropic
Haiku/Sonnet chain. The live `ai-narrator` is a **single** tool-call through
the Lovable AI Gateway. This memo records exactly what is now in production and
what is intentionally not.

## Shipped this pass

### #5 — Tier firewall (the 50× spike fix) ✅
`supabase/functions/ai-narrator/index.ts`

- Added `TIER_TO_MODEL` map and `resolveTierModel(tier)` helper.
- Narrator now reads `tier` from the request body (set by QOC's `narrateAdapter`
  from the server-resolved plan — DB truth) and binds the model server-side.
- Any client-supplied `model` field is **ignored**. A Free run is structurally
  incapable of reaching the Pro model.
- Mapping:
  | Tier | Model |
  |---|---|
  | `deepseek` (free) | `google/gemini-2.5-flash-lite` |
  | `haiku` (plus baseline) | `google/gemini-2.5-flash` |
  | `sonnet` (pro / default) | `openai/gpt-5-mini` |
  | `opus` (adversarial) | `openai/gpt-5` |
- Response now echoes `{ model, tier }` so the QOC trace records what actually ran.

### #3 — Dedupe savings surfaced ✅
`src/pages/admin/QocMonitor.tsx`

- KPI strip now has a **"Dedupe saved (X%)"** card showing dollars saved by
  short-circuited duplicate runs, computed as
  `dedupeHits × avgPaidCost` over the window.

### §3 — Expanded input limits ✅
- `src/lib/validationSchemas.ts`: idea cap **5,000 → 20,000 chars** (~3,000 words).
- `supabase/functions/analyze-business/boundary-schemas.ts`: matched server-side.

## Not applicable on the current chain

### #1 — Prefix caching ❌
The doc's −16% relies on Anthropic prompt-caching of a 1,800-token
`deterministicResult` re-sent on calls 2/3/4. The live narrator makes one call
and the Lovable AI Gateway does not expose Anthropic `cache_control`. There is
no duplication to cache. Re-evaluate if/when we move to a multi-call Anthropic
chain.

### #2 — Merge risk + action ❌ (already done)
The doc proposes collapsing two Sonnet calls into one JSON tool-call. Narrator
is already a single `submit_analysis` tool-call.

### #4 — Parallelize ❌
n/a — single call.

## Verification

- Edge function deploys via Lovable infrastructure; no build step needed.
- Send a request with `{tier:"deepseek"}` → response `model` = `google/gemini-2.5-flash-lite`.
- Send `{tier:"sonnet"}` (or omitted) → response `model` = `openai/gpt-5-mini`.
- Any `{model:"openai/gpt-5"}` from a Free user is silently overridden.
