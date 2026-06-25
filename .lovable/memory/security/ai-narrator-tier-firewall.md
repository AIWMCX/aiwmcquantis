---
name: AI narrator tier firewall (QOC-ECON v1.0 §4.5)
description: Server-side tier→model binding in ai-narrator; client `model` field is ignored to prevent 50× cost spikes.
type: constraint
---

`supabase/functions/ai-narrator/index.ts` MUST bind model from the request's
`tier` field via `resolveTierModel()` / `TIER_TO_MODEL` — never from a
client-supplied `model` field.

Mapping (do not change without explicit approval — affects unit economics):
- `deepseek` (free)  → `google/gemini-2.5-flash-lite`
- `haiku`    (plus)  → `google/gemini-2.5-flash`
- `sonnet`   (pro)   → `openai/gpt-5-mini`
- `opus`     (adv.)  → `openai/gpt-5`

**Why:** without server-side binding, a Free user can route to Sonnet/Opus and
cost 50× the budgeted amount. QOC `narrateAdapter` sets `tier` from
`resolveTier(user)` (DB truth). See `docs/QOC_ECON_v1_APPLIED.md`.

**How to apply:** any new AI narration function must follow the same pattern —
read `tier` from the request, look up the model in a server-side map, and
ignore client-supplied model overrides.
