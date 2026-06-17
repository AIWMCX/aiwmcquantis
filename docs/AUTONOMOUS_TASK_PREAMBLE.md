# Autonomous Task Standing Context — AIWMC™ Quantis

> **Purpose:** Paste this verbatim as the standing context preamble for the
> `aiwmc-quantis-improvements` scheduled task and any future autonomous run.
> Without this brief, prior autonomous runs defaulted to the statistically
> most common SaaS in training data (multi-tenant BI dashboarding) and
> generated recommendations for the wrong product (wrong pricing, wrong
> competitors, wrong stack, wrong ICP). This file stops that at the source.

---

## PRODUCT BRIEF — AIWMC™ QUANTIS (authoritative; do not infer the product from priors)

You are working on **AIWMC Quantis**, a **FINANCIAL PRE-MORTEM / business-idea
validator**. It is **NOT** a BI dashboarding tool, **NOT** embedded analytics,
**NOT** a Tableau/Power BI/Looker competitor. It does **NOT** connect to
warehouses, has no NL→SQL, no semantic layer, no embedded SDK, no
multi-tenant query engine.

### What it is

- A user enters a business idea/model. A deterministic engine runs **1,000
  Monte Carlo iterations** over financial variables against **95,500
  benchmarks across 46 sectors**, then returns a **proceed / pivot / kill**
  verdict in ~90 seconds.
- The AI writes **narrative/prose only**. It never computes the numbers.
- The brand promise is **AUDITABILITY**: "We are not selling AI. We are
  selling auditability." Every output is sourced and cross-checked (RVCE).

### Canonical constants (never contradict)

- **Pricing:** Free / Plus **$17/mo** / Pro **$49/mo**. No other tiers. No
  $149. No $499. No per-seat / per-builder / per-viewer pricing.
- **Competitors:** LivePlan, Bizplan, Enloop, ChatGPT, human consultants
  ($1,500–$25,000). **NOT** Tableau / Power BI / Looker / Hex / Sigma /
  Metabase.
- **ICPs** (priority order): independent business consultants → founders →
  mid-market CFOs / strategy officers.
- **Stack:** Vite + React + TS + Tailwind + shadcn (SPA), Supabase
  (Postgres / Auth / Edge), Anthropic Claude + DeepSeek (model string
  `deepseek-v4-flash`) + Tavily (RVCE), Stripe, Upstash, Vercel + GitHub
  Actions.
- **Legal entity:** AIWMC™ LLC. **Never** reference the AIWMC Research
  Foundation (aiwmc.space) on any Quantis surface — strict separation.
- **Single source of truth for tier limits / prices:** `src/config/tiers.ts`
  (mirrored by the `plan_entitlements` table). Any hardcoded `$17` / `$49`
  / `$149` outside that file is a bug.

### Voice

Three registers, **never mixed** — Tier 1 (pre-founder), Tier 2 (operator),
Tier 3 (CFO / enterprise-clinical).

**Banned vocabulary:** hustle, grind, 10x, level up, unlock, game-changer,
disrupt, breakthrough.

**Brand palette:** navy `#1A2E4A`, electric blue `#007BFF`, light blue
`#EBF4FF`, off-white `#F5F6F8`. Green `#8FFF2A` is **banned on Quantis
surfaces** (reserved for the broader AIWMC design system).

### Hard rule

If a recommendation only makes sense for a BI dashboarding product
(warehouse connectors, semantic layers, embed SDKs, per-seat pricing,
LookML/dbt, SQL playground, query compiler), it is **WRONG for Quantis**.
Discard it.

When unsure of a fact, mark it **[UNVERIFIED]** with the exact command to
confirm it — **never fabricate** a number, a tier, a feature, or a
benchmark.

---

## Do-not-implement list

These have been repeatedly hallucinated by autonomous runs and will damage
the product if built. Reject any recommendation that includes them:

- $149 / $499 tiers, or per-builder / per-viewer / per-seat pricing
- "Free unlimited viewers, charge builders" (there are no viewers/builders,
  only analyses and tiers)
- NL→SQL, LookML/dbt semantic layer, SQL playground, query compiler
- OAuth connectors to Snowflake / BigQuery / Redshift / Databricks
- Embedded analytics SDK, JWT multi-tenant embed tokens, white-label iframe
  (the existing `white_label` Pro flag is for PDF export branding only —
  not an embedded-analytics SDK)
- Tableau / Power BI / Looker comparison content or "alternative to" SEO
- Kubernetes / EKS / ClickHouse / Redis materialized views / CDC pipelines
  (the product is serverless on Supabase + Vercel)

---

## Source of truth references

- `docs/QUANTIS_BUSINESS_LOGIC_v4.md` — canonical engine spec
- `src/config/tiers.ts` — canonical tier / pricing / feature constants
- `docs/QUANTIS_PRODUCTION_STABILIZATION_MASTER_PROMPT.md` — stabilization gate
- `docs/QUANTIS_JUNE_2026_MASTER_HANDBOOK.md` — 60-var + RVCE 2.0 spec
  (gated behind 12/12 Final Gate green)
