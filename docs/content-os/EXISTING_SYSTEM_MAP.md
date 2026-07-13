# AIWMC Quantis — Content OS Existing-System Map (Phase 0)

**As of:** 2026-07-13, commit `c9a55a20`+, production Supabase project `dmlxrvfyqsakyjomsvdj`.
**Method:** Direct repo inspection (file reads) + live database queries (not assumed from docs).

## Headline finding — read this first

**The Autoposter and Content Studio admin pages are currently broken in production.** The frontend code, edge functions, and a complete intended database schema all exist in the repository — but the database tables were never applied to the live Supabase project. Confirmed three independent ways:

1. Direct `pg_class` query for `autoposter_%` / `content_studio_generations` tables → only `autoposter_oauth_state` exists.
2. `information_schema.tables` cross-check → same result.
3. Supabase's own applied-migration history (`list_migrations`) stops at `20260702233000` (2026-07-02). The migration files that `CREATE TABLE public.autoposter_posts` etc. are dated `20260516001548` through `20260622...` — all *older* than the last applied migration, yet never ran. This is a live instance of Handbook/GLASSWING finding QNT-P0-009 ("migration history has not represented production reality") — not a historical claim, a current one, re-confirmed today.

**Practical consequence:** every query in `useAutoposter.ts`, `Autoposter.tsx`, `ContentStudio.tsx`, `autoposter-generate-content`, `publish-due-posts`, and `content-studio-generate` against these tables fails with "relation does not exist" right now, in production, for any admin who opens these pages.

## Capability inventory

| Capability | File(s) | DB dependency | Status | Notes |
|---|---|---|---|---|
| Autoposter admin page | `src/pages/admin/Autoposter.tsx` (63 lines) | `autoposter_posts`, `autoposter_post_platforms`, `autoposter_analytics_weekly` | **BROKEN** | Renders `ContentPlanView`, `PostQueue`, `PostCalendar`, `KPITracker`, `PostEditorSheet` — all query missing tables |
| Content Studio admin page | `src/pages/admin/ContentStudio.tsx` (366 lines) | `content_studio_generations` | **BROKEN** | Full generation UI (topic/angle/tone/platform/model picker), history browser — table missing |
| Static 90-day content plan | `src/data/autoposterContentPlan.ts` (930 lines) | none (static TS data) | **CODE_VERIFIED** | A hand-authored content calendar exists as a TS constant — seeded into `autoposter_posts` via `useSeedContentPlan()`, which also fails today |
| React Query hooks | `src/hooks/useAutoposter.ts` (219 lines) | same tables | **CODE_VERIFIED, non-functional** | Clean React Query/mutation code; would work immediately once tables exist |
| Autoposter generation (Claude) | `supabase/functions/autoposter-generate-content/index.ts` | `autoposter_posts`, `autoposter_post_platforms`, `autoposter_publishing_logs` | **BROKEN + UNSAFE** | Admin-JWT-gated (real, server-enforced via `user_roles` check — good). **But the LinkedIn system prompt hardcodes "95,500 real benchmarks" as a fact to weave in** — a direct, live violation of the Claim Firewall this spec requires (§8). Tables missing so it 500s regardless. |
| Content Studio generation (Lovable Gateway) | `supabase/functions/content-studio-generate/index.ts` | `content_studio_generations` | **BROKEN, safer prompt** | Admin-gated correctly. Prompt explicitly forbids fabricated stats ("No fabricated stats... make it directional") — better claim discipline than Autoposter's generator, but **no claim registry, no duplicate detection, no memory** — it's a stateless generate-and-store tool, completely disconnected from the Autoposter's queue/scheduler/publisher. |
| LinkedIn OAuth | `supabase/functions/oauth-linkedin-callback/index.ts` | `autoposter_oauth_state` (exists), `autoposter_credentials` (missing) | **PARTIAL** | Real, correct OAuth flow: admin-secret-gated initiation, state-token CSRF protection, Vault-based token storage design (`access_token_secret_id` + `autoposter_read_token` RPC). Cannot complete because `autoposter_credentials` doesn't exist. |
| X/Twitter OAuth | `supabase/functions/oauth-twitter-callback/index.ts` | same | **UNVERIFIED** — not read this pass, same table dependency implies same breakage |
| Publishing engine | `supabase/functions/publish-due-posts/index.ts` | `autoposter_post_platforms`, `autoposter_credentials`, `autoposter_publishing_logs` | **BROKEN, well-designed** | Real cron-driven (pg_cron, per-minute) job. Real LinkedIn UGC API call, real Facebook Graph API call. Idempotent by row status, structured `needs_credentials` vs `failed` distinction, audit log per attempt. Instagram explicitly stubbed (`needs_credentials`, comment explains: no image-hosting pipeline yet). **This is the most production-grade piece of the whole system and it cannot run.** |
| Slack control layer | — | — | **MISSING** | No `slack.com/api` or `SLACK_WEBHOOK`/`SLACK_BOT_TOKEN` reference anywhere in `src` or `supabase/functions` except the unrelated `alert-webhook` function (generic ops alerting, not content-specific) |
| Claim registry / firewall | — | — | **MISSING** | No `claim_registry` table, no claim-checking code anywhere. Confirmed by repo-wide grep. |
| Content memory / clustering / dedup | — | — | **MISSING** | No `content_clusters`, `semantic_hash`, `duplicate_risk` anywhere. Content Studio's `content_studio_generations` is a flat history log, not a searchable memory — no cross-platform idea linking. |
| Historical import pipeline | — | — | **MISSING** | No import/normalize/dedupe/cluster pipeline for prior posts exists |
| Asset/visual renderer | — | — | **MISSING** | No deterministic HTML/SVG/Canvas template renderer found. `image_prompt` field exists in Content Studio's output schema but nothing renders it — it's just a text suggestion for a human to act on manually. |
| Approval workflow | — | — | **MISSING** | Autoposter has a linear `draft → pending → scheduled → published` status column but no reviewer role distinct from admin, no `REVIEW_REQUIRED`/`CHANGES_REQUESTED` states, no approval audit trail beyond the generic publishing log |
| Analytics import | `autoposter_post_analytics` table (in the unapplied migration) | same | **DESIGNED, not live** | Schema supports per-post snapshots over time (impressions/reach/likes/comments/shares/saves/clicks/engagement_rate) — well-designed, matches your spec's §13 almost exactly — but no import job populates it, and the table doesn't exist yet anyway |
| Feature flags / emergency pause | — | — | **MISSING** | No `AUTO_PUBLISH_ENABLED`-style flag or kill switch found anywhere |
| Admin authorization | `user_roles` table + `has_role()` fn, checked server-side in every function read | live, confirmed elsewhere this session | **PROD_VERIFIED** | This part is solid — every content function correctly checks JWT → `user_roles.role = 'admin'` server-side before doing anything. Reuse this pattern; do not replace it. |

## What must be preserved (do not rebuild)

- The **admin authorization pattern** (JWT → `has_role()`/`user_roles` check, server-side, in every function) — correct, matches the spec's own requirement that "hiding a button is not authorization."
- The **publishing engine's architecture** in `publish-due-posts` — idempotent status transitions, `needs_credentials` vs `failed` distinction, audit logging per attempt, cron-driven. This is genuinely well-built; it just needs its tables to exist.
- The **LinkedIn OAuth flow's security model** — admin-secret-gated initiation, CSRF state token, Vault-intended token storage.
- The **React Query hook layer** (`useAutoposter.ts`) — clean, would work immediately once tables exist.
- Content Studio's **safer generation prompt discipline** (explicit "no fabricated stats" instruction) — better starting point than Autoposter's generator, which needs its claim violation fixed.

## What is unsafe and must be fixed, not just wired up

1. **Autoposter's LinkedIn/system prompt hardcodes "95,500 real benchmarks"** as a fact the model should cite. This must be removed or replaced with a claim-registry lookup before this function ever runs against a real database, per your spec's §8 Claim Firewall — otherwise the very first migration that makes these tables exist will also make this violation live.
2. **`autoposter_credentials` in the original 2026-05-16 migration stores `access_token`/`refresh_token` as plaintext columns** — the *newer* code (`oauth-linkedin-callback`, `publish-due-posts`) already expects Vault-based storage (`access_token_secret_id` + `autoposter_read_token` RPC), meaning a **second, newer migration must exist that alters this table** — I have not yet located it. This must be found or written before enabling the table, so tokens never land in plaintext.
3. **Content Studio and Autoposter are exactly the "two disconnected systems" your spec explicitly warns against** (§1, rule 5: "Never create a second competing autoposter"). Right now they already are two competing systems — Content Studio generates content that has no path into Autoposter's queue, scheduler, or publisher at all. This is the single biggest structural gap.

## The smallest complete Phase 1 slice (recommended)

Per your spec's own phasing (§27, Phase 1 = read-only memory, no external publishing), and given the headline finding above, the actually-smallest-complete first slice is narrower than "build content memory" — it's:

**Phase 0.5 — Make what already exists actually exist.**

1. Locate or write the missing "Vault migration" for `autoposter_credentials` (alter plaintext columns → `access_token_secret_id`).
2. Apply the full existing migration chain (6 autoposter tables + any Vault alter) to production via `apply_migration`, in order, verified against what the *current* code (not the original 2026-05-16 version) actually expects column-wise.
3. Fix the hardcoded "95,500 real benchmarks" claim violation in `autoposter-generate-content/index.ts` before these tables go live — otherwise the fix is applied to a system that still can't run, and once it can run it immediately violates your own claim policy.
4. Verify live: Autoposter and Content Studio admin pages load without error, `useSeedContentPlan()` successfully seeds the static 90-day plan, generation works end-to-end for one platform, one post schedules and one dry-run publish attempt returns a structured (not crashed) result.

Only after that foundation is real should Phase 1-proper (content memory, clustering, dedup, claim registry, Slack layer) begin — building a claim registry or memory system on top of tables that don't exist yet would be exactly the "generated frontend disconnected from the existing backend" anti-pattern your own spec forbids.

## Acceptance tests for Phase 0.5

- `SELECT * FROM autoposter_posts LIMIT 1;` returns 0 rows without error (table exists, empty).
- Admin opens `/admin/content` (or current route) and the page renders without a Supabase "relation does not exist" error in console/network tab.
- `useSeedContentPlan()` mutation succeeds and inserts rows visibly in the queue.
- Generating one platform variant for one post succeeds, and the stored `autoposter_post_platforms.content` contains no unregistered numeric claim (i.e., the "95,500" fix is verified by absence, not by trust).
- LinkedIn OAuth `init=1` flow completes and a row appears in `autoposter_credentials` with a Vault secret ID, never a raw token column.
- One scheduled test post reaches `publish-due-posts` and returns either `published` (if credentials are live) or `needs_credentials` (if not) — never an unhandled exception.
