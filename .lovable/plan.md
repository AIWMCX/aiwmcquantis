
# AIWMC Quantis Conversion Overhaul — 3 Waves

## Diagnostic Findings (from production DB, last 7d)

- 69 home views → 3 analysis starts → 2 completions → 0 leads → 0 shares → 0 new subs
- Only 2 of 8 canonical funnel events ever fire in production
- Anonymous-first flow does not exist; every analysis requires auth
- No schema support for public teardowns, share-as-teardown captions, or editable bio CTA

The diagnosis matches the prior audit. Below is the exact ship sequence.

---

## Wave 1 — Foundation (this is what makes everything else measurable & possible)

**1.1 Microsoft Clarity install**
Free, no API key, 10-min install. Adds session replay + heatmaps. Loaded async, no perf hit. Goes in `index.html` with a Cookiebot-respecting wrapper.

**1.2 Funnel event audit & fix**
Walk every page and confirm `recordFunnelEvent` is called for: `home_view`, `analysis_start`, `analysis_complete`, `signup_complete`, `paywall_view`, `upgrade_click`, `checkout_start`, `checkout_complete`. Add a small `<FunnelDebug>` overlay (dev-only) and an admin `/admin/funnel` page that reads `funnel_summary_30d`.

**1.3 Schema migration — unlock all downstream features**
```text
analyses:
  + is_public           boolean default false
  + public_slug         text unique         (auto-set when made public)
  + founder_display_name text                (opt-in; user-controlled)
  + idea_summary        text                (140-char human label for cards)
  + made_public_at      timestamptz

shared_reports:
  + kind                text default 'private'   ('private' | 'teardown')
  + caption             text                     (LinkedIn/X-ready copy)
  + og_image_url        text                     (generated social card URL)
  + headline_verdict    text                     (cached for share preview)

user_settings:
  + bio_text            text                     (editable bio line)
  + pinned_post_text    text                     (editable pinned post)
  + public_profile_slug text unique              (founder profile page)
  + show_in_teardowns   boolean default true
```

Add RLS:
- `analyses` SELECT for anon: only when `is_public = true`
- `analyses` UPDATE: only owner can flip `is_public`
- New RPC `get_public_teardowns(limit, offset)` SECURITY DEFINER returning sanitized cards
- New RPC `set_analysis_public(analysis_id, is_public, founder_name, idea_summary)` with slug auto-generation

**1.4 Anonymous analysis persistence**
Allow `analyses.user_id = NULL` inserts via RLS, with `anonymous_session_id` from `anonymous_usage` table. Tie to existing rate limits.

---

## Wave 2 — Conversion Engine

**2.1 Anonymous-first single-input flow** (`/` and `/app`)
- Hero gets a single textarea: *"Describe your idea in one sentence."*
- Submit → calls `analyze-preview` edge function → returns immediately with verdict + locked-section previews
- No auth wall. Auth gate only on: PDF export, Save analysis, Make Public, Run again.
- Result lives at `/r/[token]` (anon-readable, expires 24h unless saved)

**2.2 Result page redesign** (`AppDashboard` result view + new `/r/[token]`)
- 32px headline verdict at top: *"Verdict: PIVOT — Your unit economics break at month 11."*
- Below: assumption graph (already in code at `assumption-graph.ts`, currently hidden) — surface it.
- Sticky right rail with: `Share as Teardown`, `Make Public`, `Save (sign in)`, `Export PDF (Plus)`.
- Locked Pro sections shown blurred with one-line preview of what's hidden.

**2.3 Pricing page rebuild** (`/pricing`)
- Yearly/Monthly toggle defaults to **Yearly**, "Save $X" badge.
- Anchor strip above tiers: `Consultant: 3 weeks · $3,000 · 1 scenario  ||  Quantis Plus: 90 sec · $17/mo · 95,500 scenarios`.
- Each tier card includes:
  - 1 example output thumbnail (real screenshots from `/examples`)
  - "7-day refund — no questions" line
  - Verdict-tied feature list, not generic
- Inline FAQ: "Why $17 not $1,500?", "Refund policy", "Cancel anytime".

**2.4 Lead capture wiring**
Verify `usePostAnalysisLeadCapture` hook actually fires on result page (currently 0 leads despite 69 home views). Move the trigger from "3-sec delay" to "verdict viewed for >5 sec OR scrolled past locked section".

---

## Wave 3 — Distribution Engine

**3.1 Public Teardowns Gallery** (`/teardowns` + `/teardowns/[slug]`)
- Index page: grid of public analyses, sorted by recency + view count
- Detail page: founder name (or anon), idea summary, headline verdict, full sanitized analysis
- SEO: per-page `<Helmet>` title/description, JSON-LD Article, added to `sitemap.xml` via build-time script
- "Made public by founder" badge (no scraping, opt-in only)

**3.2 Editable Profile CTA generator** (`/settings/profile`)
- Auto-generates from user's plan + recent analyses:
  - Bio: *"I stress-test startup ideas before founders waste $50k. {N} public teardowns → aiwmcquantis.com/u/{slug}"*
  - Pinned post: 3 templates (LinkedIn / X / IG-bio) with one-click copy
- Live preview pane. Stored in `user_settings.bio_text` / `pinned_post_text`.

**3.3 "Stress-tested by Quantis" embeddable badge**
- Generates HTML snippet: `<a href="https://aiwmcquantis.com/teardowns/{slug}?ref=badge"><img src="..." alt="Stress-tested by AIWMC Quantis"/></a>`
- Three sizes (small/medium/large); SVG hosted at `/badges/[size].svg`
- Each click tracks `funnel_event: badge_click` with referrer slug
- `/settings/badge` page with copy-to-clipboard + live preview

**3.4 Share-as-Teardown one-click export**
- Button on result page: "Share as Teardown"
- Triggers edge function `generate-share-card`:
  - Renders 1200×630 PNG via `@vercel/og` style (use Lovable AI Gateway for image gen, or pure SVG-to-PNG via canvas in edge function)
  - Caption auto-built from headline verdict + assumption graph top-3 nodes
  - Stores PNG in Supabase Storage bucket `share-cards/{token}.png`
- Frontend opens a modal: image preview, caption textarea (editable), "Copy caption", "Download image", "Open LinkedIn/X intent URL" buttons

---

## Technical Detail Section

**Edge functions to add:**
- `generate-share-card` — Deno, builds PNG via SVG + resvg-js (`npm:@resvg/resvg-js`)
- `publish-teardown` — wraps `set_analysis_public` RPC + cache-busts sitemap
- (Existing) `share-report` — already shipped; reused for token issuance

**OG image strategy for /teardowns/[slug]:**
Pre-generated PNGs stored in Storage. Helmet tag `<meta property="og:image">` points to public URL. No runtime SSR needed.

**Sitemap regeneration:**
Add a build script `scripts/build-sitemap.ts` that queries `analyses WHERE is_public = true` and merges into `public/sitemap.xml`. Wire into Vite build.

**Clarity install:**
`<script>` injected via `index.html` with Project ID env var `VITE_CLARITY_PROJECT_ID`. Wrapped in `<noscript>` consent check.

**Anonymous flow data model:**
`anonymous_usage` table already exists. Tie `analyses.user_id IS NULL` rows to it via a new `anonymous_session_id` column (FK soft, no constraint, just for analytics correlation).

---

## Sequencing & Estimate

| Wave | Items | Estimated chat turns | What unlocks |
|---|---|---|---|
| 1 | Clarity, funnel fix, schema migration, anon persistence | 1 turn | Measurement + DB foundation |
| 2 | Anon flow, result redesign, pricing rebuild, lead capture | 2 turns | Direct conversion lift |
| 3 | Teardowns gallery, profile CTA, badge, share-as-teardown | 2 turns | Compounding distribution loop |

I will ship **Wave 1 in full** in the next message immediately after you approve this plan. Then pause for you to verify Clarity is recording sessions and funnel events are reaching the DB before I touch the conversion-critical user-facing flows in Wave 2.

If you want any item resequenced (e.g. ship the badge before the gallery), say so now.
