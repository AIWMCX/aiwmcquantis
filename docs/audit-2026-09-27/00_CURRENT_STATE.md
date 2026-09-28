# AIWMC Quantis — current state (audit 2026-09-27 → 28 UTC)

Evidence, in order of authority: production DB (Supabase `dmlxrvfyqsakyjomsvdj`), production logs (24h window), deployed edge-function source and deploy-fidelity output, live HTML via Vercel, `main` source, CI. Status words follow the audit vocabulary. Consolidates audit files 01–15. Defects: `16_DEFECT_REGISTER.md`. Fixes: `17_FIX_LEDGER.md`. Verdict: `19_FINAL_RECONCILIATION.md`.

## 1. Production snapshot

| Item | Value | Status |
|---|---|---|
| `main` | `908c58f` (merge of #208) | VERIFIED LIVE |
| Edge functions | 42/42 report live SHA = source (deploy-fidelity gate, #207 deploy) | VERIFIED LIVE |
| Migrations | 278 applied; last `20260927230000` | VERIFIED LIVE |
| Postgres ERROR/FATAL (24h) | 0 | VERIFIED LIVE |
| AI calls (14d) | 0 failed; DeepSeek primary (158 calls/60d), Anthropic + Lovable gateway fallback working 09-21, Dahl nearly unused (2 calls since August) | VERIFIED LIVE |
| Edge 4xx noise | ~290/day 400s from `warm-functions` pings plus CI smoke tests; no user-facing failures | VERIFIED LIVE (P3 noise) |
| Users | 46 total, 2 new in 30d, 5 signed in during 30d, 2 admins | VERIFIED LIVE |
| Analyses | 186 total, 11 in 30d | VERIFIED LIVE |

## 2. Route inventory (83 routes)

- **Public (≈45):** `/`, `/pricing`, `/how-it-works`, `/methodology`, `/use-cases`, `/consultants`, `/examples`, `/examples/:slug`, `/blog`, `/blog/:slug`, `/vs/:slug`, `/decision-review`, `/security`, `/state-of-quantis`, `/status`, `/terms`, `/privacy`, `/refund-policy`, `/auth`, `/reset-password`, `/research`, `/risk-gallery`, `/leaderboard`, `/cases`, `/changelog`, `/trial`, `/connect`, `/viral-content`, `/viral-posts`, `/directory-tracker`, `/demo/*`, `/share/:token`, `/r/:id`, `/quote*` and others.
- **App:** `/app`, `/app/new-decision`, `/app/start`, `/app/scenarios`, `/app/pre-mortem`, `/app/invoices`, `/app/documents`, `/app/stats`, `/app/clients/:id`, `/app/diagnostics`, `/docs`, `/scenario`, `/plus-settings`, `/pro-settings`, `/settings/api-keys`, `/settings/brand`, `/engagement-intake`, `/engagement-workspace`.
- **Admin (21):** every `/admin/*` route is wrapped in `ProtectedRoute requireAdmin` (Content Studio and Autoposter use `requireContentAdmin`).
- **Dev:** `/dev/rvce-test` was **unguarded**. It is now admin-guarded and disallowed in `robots.txt` (fix F-06).
- **Dead links:** one in the entire app. The Alt+S shortcut went to `/app/docs`; it now goes to `/docs` (fix F-05).

## 3. Capability map (compress ≠ remove)

| Capability | Where the user reaches it | Exposure | Status |
|---|---|---|---|
| New Decision | Sidebar primary button, Home | PRIMARY | CODE VERIFIED. Flag default-on since #207. Click-through by a signed-in user not yet observed (0 external `new_decision_viewed`). |
| Decision run / result | `/app` | PRIMARY | VERIFIED LIVE (analysis_complete events, 0 AI failures) |
| Decisions history | Sidebar → Decisions | PRIMARY | CODE VERIFIED |
| Reports (Docs Studio) | Sidebar → Reports `/docs` | PRIMARY | CODE VERIFIED |
| Scenarios, Pre-Mortem, Capacity Check | Inside a result, plus the "More tools" sidebar section | CONTEXTUAL + ADVANCED | CODE VERIFIED |
| Quotes, My Documents, My Stats | "More tools" | ADVANCED | CODE VERIFIED (Documents and Stats were orphaned before #207) |
| Clients | Client detail via Home recent clients and decision rows; there is no list page | CONTEXTUAL | PARTIAL. Table and RLS are live; 0 clients exist. |
| Driver inspection, next action | Inside a result | CONTEXTUAL | Events fire for admin only. External use UNVERIFIED. |
| Benchmarks, Content Studio, Autoposter, Commercial Ops, health tools | `/admin/*` | ADMIN | VERIFIED LIVE (guarded) |

## 4. Pricing truth matrix

| Surface | Free | Plus | Pro | Trial | Status |
|---|---|---|---|---|---|
| `plan_entitlements` (DB) | $0, 5/mo | $17 / $168 | $49 / $492 | — | VERIFIED LIVE |
| `tiers.ts` + checkout price IDs | same 4 IDs as DB | ← | ← | 14 days in `create-checkout-session` | CODE VERIFIED |
| Server free quota | `FREE_TIER_LIMIT = 5`, returns 402 with a renewal message | | | | CODE VERIFIED |
| Static homepage meta / JSON-LD / noscript pricing | 5 runs | $17 / $168 | $49 / $492 | 14-day | VERIFIED LIVE (fetched 2026-09-28 00:08) |
| React Landing FAQ (client-rendered) | Said "1 free analysis" → now 5 runs, read from `TIERS` | | | 14-day stated | CODE VERIFIED; #208 production deploy succeeded; rendered text not observed (needs a browser) |
| Commercial Foundation v2 | 5 runs | $17/$168 | $49/$492 | 14-day | VERIFIED LIVE |
| Stripe dashboard prices | — | — | — | — | BLOCKED (no Stripe access). Price IDs arrive via synced secrets (CONFIGURED). |
| Assisted offers $349 / $499 | — | — | — | — | UNVERIFIED. `paid_engagements` is empty, never sold. |

## 5. Entitlements

- The server matrix (`_shared/entitlements.ts`) matches the tier copy.
- A second, parallel system (`tier-gate.ts` + `tier-spec.ts`) gates `analyze-plus`, `analyze-pro-extension` and `invoice-capacity-check`. Both agree today; this is consolidation debt (P2).
- API access is Pro-only and is re-checked at use time in `api-analyze`. A stale RLS policy still lets Plus users insert rows into `api_keys`, but those keys grant nothing (P3).
- **Real paid subscribers: 0.** The 3 active Pro subscriptions are 2 admin accounts plus 1 manual founder comp (`founder_comp_*` IDs, not real Stripe objects).
- **No external customer has ever completed self-serve checkout.** The last `paid_checkout_complete` was 2026-07-02, from one user. The last Stripe `checkout.session.completed` stored was 2026-06-10.

## 6. Analytics (last 30d, admins excluded)

| Step | External signed-in users | Anonymous sessions |
|---|---|---|
| home_view | 1 | 153 |
| pricing_view | 2 | 8 |
| free_signup_start / complete | 1 / 0 | 5 / 3 |
| analysis_start → complete | 2 → 2 | 2 → 2 |
| result_viewed, driver_inspected, scenario_compared, next_action_selected | 0, 0, 1, 0 | — |
| paid_checkout_start → complete | 2 → 0 | — |

- **Strong activation among external users: 0.** Every result_viewed, driver_inspected and next_action_selected event comes from admins.
- **Attribution: 685 of 692 sessions (90 days) have no UTM.** The only tagged sources are `ig` (6 sessions) and `perplexity` (1).
- `funnel_events` has no internal-traffic flag. Excluding admins requires a join on `user_roles`.
- Duplicate event aliases were removed (last `analysis_started` on 09-21, last `analysis_completed` on 09-19). `verdict_viewed` still overlaps with `result_viewed` (P2).
- Sentry and PostHog initialization: UNVERIFIED. The auto-mode classifier blocked the read.

## 7. Commercial Ops

- The foundation v2 contract fix is **VERIFIED LIVE**. A founder browser `get_foundation` call at 23:43, after the deploy, returned 200 on v2; the old contract rejects v2.
- Campaigns, batches, import, first-touch agent, claim guard, approval, ready-to-send, mark-sent, reply recording and sequence steps are all deployed (source confirmed in function v324).
- **Operational data: 1 prospect, 0 campaigns, 0 drafts, 0 agent runs, 0 outcomes.** No AI generation has been exercised in production.
- Controlled end-to-end test: BLOCKED. It needs an admin JWT, which this session doesn't have. The founder runs the 5-minute smoke test in `docs/execution/COMMERCIAL_OPS_OUTREACH_RUNBOOK_2026-09-27.md`.
- Attribution break: first-touch emails deliberately contain no links (deliverability). So outreach → signup attribution relies on (a) the reply thread and (b) manual `commercial_attributions` rows. Any link sent in steps 2–4 or in replies should carry `utm_source=outreach&utm_campaign=<batch>`.

## 8. Content OS / Autoposter

| Platform | Status |
|---|---|
| LinkedIn, X, Instagram, Facebook, Threads, Telegram, Whop | CREDENTIALS MISSING (`autoposter_credentials` = 0 rows). OAuth callback code exists (CODE ONLY). |

- **Content Studio:** 28 generations in 30 days, 38 total. It works as a drafting tool. VERIFIED LIVE.
- **Autoposter:** 72 posts (70 archived, 2 marked posted), 6 LinkedIn variants stuck as drafts. `publish-due-posts` runs about every minute as a no-op. The last publishing log (2026-07-13) is an Anthropic credit-balance error.
- **Post analytics:** 0 rows. Content → visit → signup attribution is not possible today (see the UTM finding in §6).
- **Memory classes:**
  - Customer work: analyses, clients, scenarios live in Postgres.
  - Commercial knowledge: Commercial Foundation, versioned.
  - LLM runs: `ai_calls` and `commercial_agent_runs`.
  - Content memory: `content_studio_generations` and `autoposter_posts`, with no performance data.
  - No semantic or agent memory store exists, and none is needed.

## 9. AI runtime and knowledge

- **LLM telemetry:** `ai_calls` records task, provider, status and latency. `commercial_agent_runs` records stage, foundation version, input, output and rejection reason. This answers which model, task, latency, failure and fallback. Prompt versioning is implicit (git SHA via deploy fidelity).
- **"Knowledge base":** `manage-knowledge-base` is admin CRUD over benchmark tables behind a shared-secret key. There is no embeddings or retrieval layer, and no product workflow depends on it.
- **Prompt truth:** the analysis system prompt told the model to write "Investor-grade" and to cite sources as `n=97,500`. One stored report contains "n=97,500". Fixed in F-07.

## 10. Integrations

| Integration | Status | Evidence |
|---|---|---|
| Supabase, Vercel, GitHub Actions | CONNECTED_LIVE | deploys, fidelity gate |
| Stripe | CONFIGURED | secrets synced; webhook deployed; no real checkout since June |
| Resend | CONNECTED_LIVE | `weekly_pulse` sent 2026-09-28 00:00 |
| DeepSeek / Anthropic / Lovable gateway | CONNECTED_LIVE | ai_calls |
| Dahl | PARTIAL | 2 calls since August |
| GA4, Apollo tracker | CONFIGURED | scripts in the live HTML; CSP fixed 09-17 |
| LinkedIn / X / Meta / Telegram / Whop | CODE_ONLY | no credentials |
| Zoho CRM, Slack, Search Console | UNVERIFIED | not inspected in the product |
| Sentry, PostHog | UNVERIFIED | read blocked this session |

## 11. Security

- RLS is enabled on every public table. 0 policies read `user_metadata`.
- `user_roles` cannot be written by users (no INSERT/UPDATE policy for `authenticated`).
- The Commercial Ops SECURITY DEFINER RPCs now have `anon` EXECUTE revoked (VERIFIED LIVE).
- Of the `verify_jwt: false` functions checked, all guard writes (shared secret, JWT or role checks) or are read-only (`seed-benchmarks`, `calculate-financials`).
- **Anonymous rate limit failed open** (PGRST203, ambiguous overload). This allowed unlimited anonymous AI analyses for clients that send no fingerprint. Fixed in F-08; reproduced and proven in a rolled-back transaction.
- Leaked-password protection is off (Supabase Auth setting). BLOCKED: owner toggle.

## 12. Open-source admission

| Candidate | Outcome | Reason |
|---|---|---|
| PostHog | PILOT (later) | The real gap is activation measurement plus replay. With 1–2 external users a month there is nothing to measure yet. Revisit at more than 50 external sessions/week. Complements GA4; does not replace it. |
| GrowthBook, Unleash | REJECT / DEFER | Traffic is too low for experiments; the simple env flags are enough. |
| Langfuse | DEFER | `ai_calls` + `commercial_agent_runs` already answer model, task, latency, failure and fallback. Revisit if prompt evals become a weekly practice. |
| Mem0, Qdrant | REJECT | No semantic-memory need. Canonical state belongs in Postgres. |
| Postiz, Mixpost | REFERENCE_ONLY | The blocker is missing platform credentials, not missing software. |
| Twenty CRM | REJECT | Zoho already exists; don't run two CRMs. |
| OpenMeter, Lago | REJECT | Fixed Stripe subscriptions are sufficient. |
| SalesGPT, CrewAI SDR, GTM Skills | REFERENCE_ONLY | Patterns already applied in `first-touch.ts` and the sequence steps. No second backend. |

## 13. Seven-month outcomes (durable)

- **Built and working:** deterministic financial engine with determinism CI (25 fixtures); tier-aware analysis pipeline with R3 validation and AI-cost logging; scenario workspace; reports and PDF; client data model; server-enforced entitlements; Stripe checkout and webhook code; deploy-fidelity and migration-ledger gates; Commercial Ops with evidence-controlled claims; Content Studio drafting; lifecycle email.
- **Zombie or operational debt:** the Autoposter publishing path (no credentials, cron polling every minute); Dahl provider rollout (unused); `manage-knowledge-base` (no dependent workflow); two parallel entitlement systems; the legacy anonymous rate-limit overload (now removed).
- **Invisible value:** scenarios, drivers and pre-mortem are strong, but no external user has reached them.
- **Measurement debt:** no UTM discipline; no internal-traffic flag; no Stripe reconciliation coverage (`checked_count` = 0).
- **Commercial debt:** 0 paying customers and 0 assisted-offer sales after seven months. The product has outrun distribution.
