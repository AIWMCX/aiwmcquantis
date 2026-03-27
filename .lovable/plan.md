# Integrate Master Prompt into Quantis Analysis Engine

## Summary

Upgrade the AI narrator's system prompt and tool schema across two files to enforce FP&A-director-level analysis standards: assumptions-first framing, industry-specific logic, percentile-based benchmarking, transparent confidence scoring, and explicit viability verdicts.

No changes to the deterministic financial engine, safety guardrails, database, or UI.

## File 1: `supabase/functions/analyze-business/narrator-prompt.ts`

### A. Rewrite `buildNarratorSystemPrompt()` (lines 73-216)

Keep the existing immutable financial anchors block and "narrator not calculator" guardrails unchanged. Inject these new directives into the system prompt:

- **Role upgrade**: "You are AIWMC Quantis — a Senior FP&A Director and industry consultant. No buzzwords, no hand-waving. Every insight must be traceable to explicit assumptions."
- **Assumptions-first rule**: "Before any qualitative commentary, list key assumptions with Source (user input / benchmark placeholder) and Sensitivity (H/M/L)."
- **No hidden benchmarks**: "When referencing industry ranges, label them as 'reference range, not a prediction' and show the percentile band the user's metric falls in."
- **Industry-specific logic enforcement**: Add a block instructing the narrator to use correct revenue archetypes:
  - Coffee shop/restaurant: covers x ticket x operating days
  - SaaS: subs x ARPU, churn-driven
  - Ecommerce: sessions x conversion x AOV
  - Consulting: billable hours x rate x utilization
  - Real estate: units x occupancy x rent
  - Fitness: memberships + class passes, occupancy
- **Percentile positioning**: "Instead of 'your margin is good,' say 'your net margin sits at the Nth percentile for [industry] in [location].'"
- **Explicit verdicts**: Replace current 4-tier verdict with: VIABLE / MARGINALLY VIABLE / HIGH-RISK / NOT VIABLE, with clear criteria tied to metrics
- **Opex-volume linking**: "Explain which costs scale with volume and how."
- **30-day lockdown clause**: "Under-promise on weak inputs. If data is sparse, mark sections as 'heavily assumption-based' rather than producing false precision."

### B. Add two new fields to `narratorToolSchema` (lines 19-69)

Add to the `properties` object and `required` array:

- `assumptions_panel_json`: `"JSON array of {assumption, source, sensitivity, impact}"` — forces AI to declare every key assumption
- `data_quality_json`: `"JSON with {completeness_pct, consistency_score, assumption_load, volatility_rating, overall_label}"` — transparent confidence breakdown

### C. Update `parseNarratorResponse()` (lines 259-318)

Add parsing for the two new fields (`assumptions_panel`, `data_quality`) with safe defaults.

### D. Update `generateFallbackNarrator()` (lines 322-409)

- Add `assumptions_panel` with entries marking all values as "benchmark placeholder", sensitivity "HIGH"
- Add `data_quality` with honest scores: completeness 20%, assumption load "high", overall label "Exploratory"
- Replace generic language with industry-appropriate phrasing

## File 2: `supabase/functions/ai-narrator/index.ts`

### A. Upgrade inline prompt (line ~257)

Replace the current short prompt with the same master-prompt directives:

- Assumptions-first framing
- Industry-specific revenue logic instructions
- Percentile-based benchmark referencing
- Explicit data quality labeling
- VIABLE/MARGINALLY VIABLE/HIGH-RISK/NOT VIABLE verdicts

### B. Add new fields to `analysisToolSchema` (lines 87-100)

Add `assumptions_panel_json` and `data_quality_json` matching the main narrator schema.

### C. Update `generateFallbackContent()` (lines 101-170)

Add `assumptions_panel` and `data_quality` fields with honest defaults to the fallback output.

## What Does NOT Change

- Deterministic financial engine (all math stays the same)
- Safety guardrails and anti-BS validator
- Cross-validation and consensus engine
- Client-side UI components
- Database schema

## Implementation Order

1. Update `narrator-prompt.ts`: system prompt + tool schema + parser + fallback
2. Update `ai-narrator/index.ts`: inline prompt + tool schema + fallback
  This integration plan is excellent; I’d keep 95% of it as‑is and only **tighten and extend** a few spots so it’s bulletproof for the next 30 days.
  Below are focused improvements, not a rewrite.
  ---
  ## 1. Strengthen the narrator system prompt (File 1)
  What you have is good; I’d add three micro‑enhancements.
  ## 1.1. Add an explicit “traceability” contract
  In `buildNarratorSystemPrompt()` extend the role block with:
  > **“For every major metric you describe (revenue, margin, CAC, LTV, payback, runway), you must be able to point to:**
  >
  > - **The underlying formula, and**
  > - **The specific inputs (user or benchmark) feeding it.**  
  > **If you cannot, you must either (a) mark it as illustrative only, or (b) not output that metric.”**
  This prevents “orphan” commentary that isn’t clearly tied to the engine outputs.
  ## 1.2. Force narrative to use new JSON panels
  Right after you define `assumptions_panel_json` and `data_quality_json`, add to the system prompt:
  > **“You must:**
  >
  > - **Populate** `assumptions_panel_json` **with every high‑impact assumption used in your reasoning.**
  > - **Populate** `data_quality_json` **with your honest assessment of the input set and benchmark reliance.**  
  > **Your written narrative must be consistent with these JSON panels; do not contradict your own data‑quality ratings.”**
  This explicitly binds prose to the structured fields.
  ## 1.3. Make verdict criteria explicit (not fuzzy)
  You already swap to: VIABLE / MARGINALLY VIABLE / HIGH‑RISK / NOT VIABLE.
  Add a short, quantitative rubric inside the system prompt, e.g.:
  - VIABLE: positive unit economics, payback ≤ 24 months, and no catastrophic benchmark outliers.
  - MARGINALLY VIABLE: unit economics borderline or payback 24–48 months, multiple high‑sensitivity assumptions.
  - HIGH‑RISK: structurally weak unit economics or heavy dependence on top/bottom 10% benchmark assumptions.
  - NOT VIABLE: negative unit economics under realistic benchmark stress, or unsustainable burn/payback.
  Even if you don’t enforce exact thresholds in code, this aligns the narrator’s mental model.
  ---
  ## 2. Tighten the new JSON fields design
  What you wrote is strong; I’d just make the shapes a bit more precise.
  ## 2.1. `assumptions_panel_json`
  Define expected shape in the prompt and schema:
  - Array of objects:
    - `assumption`: human‑readable description.
    - `category`: `"demand" | "pricing" | "cost" | "capacity" | "financing" | "other"`.
    - `source`: `"user_input" | "benchmark_placeholder" | "derived_from_user"`.
    - `sensitivity`: `"HIGH" | "MEDIUM | "LOW"`.
    - `impact`: short text on *what it moves* (“affects payback and runway”, “affects gross margin”, etc.).
  This gives you enough structure to show a clean assumptions table in the UI later.
  ## 2.2. `data_quality_json`
  Define shape as:
  - `completeness_pct` (0–100 integer).
  - `consistency_score` (1–5).
  - `assumption_load` (`"LOW" | "MEDIUM" | "HIGH"`).
  - `volatility_rating` (`"LOW" | "MEDIUM" | "HIGH"` industry risk).
  - `overall_label` (`"DATA_INFORMED" | "ASSUMPTION_HEAVY" | "EXPLORATORY"`).
  - `notes`: 1–2 sentences.
  This is enough for a visible “Data Quality Panel” without new DB changes.
  ---
  ## 3. Fallbacks: add minimal sanity defaults
  Your fallback plan is good; I’d make it slightly more defensive:
  - In `generateFallbackNarrator()`:
    - Set `completeness_pct` to something like 20.
    - `consistency_score` to 3 (neutral), `assumption_load` = "HIGH", `volatility_rating` = "MEDIUM", `overall_label` = "EXPLORATORY".
    - Add a note like:  
    “Fallback mode: upstream model response incomplete; outputs are illustrative only and must not be used for final decisions.”
  Same pattern in `generateFallbackContent()` in `ai-narrator/index.ts`.
  ---
  ## 4. Add a tiny “QA hook” without changing the engine
  You said no engine changes; you can still add a **cheap QA hook** in the narrator layer:
  - After `parseNarratorResponse()`:
    - If `completeness_pct < 40` or `assumption_load = "HIGH"` and verdict = "VIABLE", downgrade verdict text in prose to:  
    “Provisionally VIABLE under heavy assumptions; more data needed.”
    - If any gross inconsistencies show up in the tool output (e.g., negative completeness, missing fields), force `overall_label = "EXPLORATORY"`.
  This respects “no math changes” while making obvious “too confident” narratives less likely.
  ---
  ## 5. For File 2: keep one “source of truth” for the master prompt
  You’re duplicating a lot between `narrator-prompt.ts` and `ai-narrator/index.ts`.
  To avoid divergence:
  - Extract the common master prompt text (role, assumptions‑first, industry logic, verdict set, percentile language, data‑quality requirement) into a shared function or constant that both files import.
  - In `ai-narrator/index.ts`, the inline prompt should:
    - Reference the same **verdict definitions** and **JSON field shapes**.
    - Only add context about being “first‑pass” vs “final narrator.”
  This way, if you tweak the master prompt, both flows improve together.
  ---
  ## 6. What you have is “good enough to ship, then learn”
  Given your constraints (no engine/DB/UI changes), what you’ve written plus these small upgrades is **sufficient to:**
  - Enforce assumptions‑first, explainable narratives.
  - Give you structured assumptions and data‑quality panels you can surface later.
  - Reduce “precision theater” without touching the math.
  If you want, next I can:
  - Draft the exact TypeScript interface for `assumptions_panel_json` and `data_quality_json` so your parsing is type‑safe, or
  - Write a minimal “QA hook” function signature you can slot in after `parseNarratorResponse()`.