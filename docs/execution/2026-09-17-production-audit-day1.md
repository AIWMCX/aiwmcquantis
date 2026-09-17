# AIWMC Quantis — Production Operational Audit, Day 1 of 3

Triggered by two external GTM/growth-consultant PDF reports ("Sales Analysis"
and "Combined Analysis / Master Growth & Product Audit," both dated
2026-09-15). Every claim in those PDFs that mattered for prioritization was
re-verified directly against live production before acting on it — this
document records what was actually found, not what the PDFs asserted.

**Scope for Day 1**: the two items explicitly approved for immediate action
(the "Deterministic" positioning contradiction, and the claimed lack of
server-rendered content for non-JS crawlers), followed wherever the live
evidence led. It led somewhere the PDFs did not anticipate.

## 1. Headline finding: two conflicting CSP policies were silently blocking real production scripts

**Severity: High. Live, currently active, not hypothetical.**

The site was sending two independent `Content-Security-Policy` declarations
on every page load:
- An HTTP response header, defined in `vercel.json`, allowing script sources:
  `cdn.jsdelivr.net`, `*.posthog.com`, `*.sentry.io`, `va.vercel-scripts.com`.
- A `<meta http-equiv="Content-Security-Policy">` tag hardcoded into
  `index.html`, allowing: `cdn.gpteng.co`, `googletagmanager.com`,
  `google-analytics.com`, `clarity.ms`, `assets.apollo.io`, `createcdn.com`.

Per the CSP specification, when a browser receives multiple CSP
declarations (any mix of header and meta), it enforces the **intersection**
— a resource must be permitted by every delivered policy, not just one.
These two allowlists had almost no overlap. Confirmed by loading the live
homepage in a real browser and reading the console directly (not inferred):

```
Loading the script 'https://www.googletagmanager.com/gtag/js?id=G-NZE7RGVNEN'
violates the following Content Security Policy directive: "script-src 'self'
'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://*.posthog.com
https://*.sentry.io https://va.vercel-scripts.com" ... The action has been
blocked.

Loading the script 'https://assets.apollo.io/micro/website-tracker/tracker.iife.js'
violates the following Content Security Policy directive: [same] ...
The action has been blocked.
```

**Practical impact**: Google Analytics (GA4, measurement ID `G-NZE7RGVNEN`)
and Apollo.io website-visitor tracking have been non-functional in
production for however long this mismatch existed. Separately, grepping the
entire `src/` tree found **zero actual usage** of `posthog` or `jsdelivr`
anywhere in the codebase — the header's allowlist was protecting integrations
that don't exist, while blocking the ones that do.

This directly corroborates, with a concrete root cause, what both external
reports flagged abstractly as "no visible instrumentation" / "product
analytics ... were unavailable" — it is not that instrumentation was never
built; GA4 and Apollo were built and wired into `index.html`, but a
CSP misconfiguration has been silently discarding their data.

**Fix (PR #147, pending CI/merge)**: merged both allowlists into the single
header-delivered policy (the true union of everything actually referenced in
`index.html` and app code — GA4, Apollo, gpteng.co, createcdn, Stripe,
Supabase, Sentry, fonts), and deleted the duplicate `<meta>` declaration so
there is exactly one CSP going forward. `posthog`/`jsdelivr` were left in the
header (harmless, in case they're a planned future integration) rather than
removed, to keep this change scoped to fixing what's broken.

## 2. "Deterministic Business Validation" positioning — confirmed real, partially pre-fixed and abandoned

Both PDFs flagged the homepage title claiming "Deterministic Business
Validation" as a contradiction against a product built on 1,000 *stochastic*
Monte Carlo scenarios. Confirmed live and still present at audit time.

Investigating the fix surfaced something the PDFs could not have known from
outside, and something my own first pass at this got wrong before checking
further: `src/components/seo/RouteSEO.tsx` — a per-route SEO metadata map —
**already contained the corrected, outcome-led copy** for `/` ("AIWMC
Quantis — AI Business Idea Validator") and `/methodology` ("Methodology —
How Quantis Calculates Risk"). My first assumption was that this map was
dead config, unused anywhere. That was wrong: `scripts/prerender-seo.ts`
parses `RouteSEO.tsx`'s `ROUTE_META` object directly out of the source text
(by regex, to avoid importing the TSX and pulling in React/asset deps into a
Node build script) and uses it to stamp the correct title/description/canonical/JSON-LD
into each route's static prerendered HTML at build time — a real,
functioning mechanism, not dead code.

What IS real: `RouteSEO.tsx`'s `/` entry writes its `description` as a
template literal (backtick string, to interpolate `${BENCHMARK_COUNT_DISPLAY}`),
but the parser's regex only matches quote-delimited (`'`/`"`) values — so
that specific entry silently fails to parse, and the build script falls back
to its own hardcoded default title/description constants instead. No visible
bug resulted (the fallback constants and the intended `ROUTE_META['/']`
values are meant to say the same thing), but it means the '/' entry in
`RouteSEO.tsx` was never actually taking effect via the path it looks like
it should — worth a one-line parser fix later (quote the literal or extend
the regex to accept backticks), not urgent since output is currently correct
either way.

The actual, separate bug: the **client-side** `<PageSEO>` calls in
`Landing.tsx` and `Methodology.tsx` (which govern the title *after*
JavaScript hydrates, for a real browser or a JS-executing crawler) still had
the old "Deterministic" copy, independently of the build-time prerender
path. Two different mechanisms, one fixed, one not — a real drift between a
build-time system and a runtime system that both claim to own the same
fact.

**Fix (PR #147)**: updated four things in lockstep, all now saying the same
outcome-led copy: `Landing.tsx` and `Methodology.tsx`'s `<PageSEO>` calls
(the runtime/post-hydration path), `ReportFirstHero.tsx`'s visible on-page
hero eyebrow badge, `index.html`'s own static `<title>`/meta/OG/Twitter tags
(the pre-hydration and prerender-time baseline), and
`scripts/prerender-seo.ts`'s `DEFAULT_TITLE` constant (the build-time
anchor-swap source) — this last one was necessary: editing `index.html`'s
title without it broke the build outright, since that script asserts its
hardcoded anchor string is still present in the built output before
proceeding, and fails loud rather than shipping a silently-wrong head. That
guard did its job correctly the moment I made an incomplete edit; verified
locally afterward via direct string comparison that the guard now passes
(bun/vite/tsc are not resolvable in this working copy's `node_modules` right
now — a pre-existing local-environment gap, not caused by this change — so
verification here was a direct literal-string diff against the exact guard
condition rather than a full local build).

Left every other "deterministic" reference in the codebase untouched after
checking each one individually (21 files matched the grep): the ones
describing the calculation-engine architecture stage (e.g. "Deterministic
Engine" on the How It Works / Methodology pipeline diagrams, correctly
paired with "then Monte Carlo runs") are accurate, not contradictory, and
match the reports' own "keep: specific numerical proof points" guidance —
only the category-tagline usage was the actual problem.

## 3. Corrected assessment, revised twice: the "no server-rendered content" claim, and my own first correction of it, were both incomplete

Both PDFs' second-highest-urgency finding was that non-JS crawlers see "the
same tagline and five-question FAQ body" on every route, based on the raw
`<div id="root">` being empty pre-hydration (confirmed independently, that
part is true — this is a pure client-rendered SPA with no SSR).

**First pass (wrong in an important way)**: reading `index.html`'s source in
this repo, there is a large, hand-authored `<noscript>` block containing a
pricing table, ten detailed example-business writeups, 50+ example links,
twelve blog post links, and site navigation. I initially reported this as
the live crawler-visible fallback, and flagged a "3 vs 5" free-tier count
mismatch inside it as a real, live customer-facing contradiction.

**Verified against the actual deployed page after PR #147 shipped, and
corrected**: that entire hand-authored block is **not what ships**. A
separate build step, `scripts/generate-static-bodies.mjs`, generates its own
different, shorter, per-route `<noscript id="q-static-content">` content at
build time and this is what actually reaches production — confirmed by
fetching the live homepage directly and finding a noticeably different
noscript body (a short lede, an 8-layer pipeline list, and a three-row
pricing table that states dollar amounts but does **not** state a specific
free-tier analysis count at all). The "3 vs 5" contradiction I fixed in
`index.html`'s source noscript block therefore has **no live impact today**
— that block is dead weight for production purposes, overwritten before
deploy every time. The fix was still correct source hygiene (in case that
build step ever fails and the raw template ships as a fallback, or during a
local preview that skips the full build pipeline), but I was wrong to report
it as an active, live-hitting bug — it wasn't. Recording this plainly rather
than quietly revising the earlier claim, per the standing instruction for
this audit to be truthful over convenient.

This also means `generate-static-bodies.mjs`'s own output is the real thing
to evaluate for crawlability, not the source `index.html` block — and on a
first read, it looks like a reasonable, genuinely differentiated fallback
(distinct copy per route, not a repeated shell). A separate, smaller false
alarm surfaced and was ruled out while checking this: a `Layer 1 — X`
list item appeared to contain a corrupted "�" character in this session's
own terminal output. Checked at the byte level directly against the live
HTTP response — the actual character is a correctly-UTF-8-encoded em dash
(U+2014); the response's `Content-Type` header correctly declares
`charset=utf-8`. No real encoding bug — a display artifact in my own
tooling, not production. Noted here only because it was checked and ruled
out, not left as an unresolved suspicion.

**Still open, unresolved, deferred to Day 2/3**: how much of Googlebot's
actual ranking signal, and how much of AI-answer-engine crawlers' indexing
(which frequently do not execute JavaScript at all), actually credit
`generate-static-bodies.mjs`'s noscript content vs. penalizing the empty
pre-hydration `<div id="root">` is still an open, evidence-requiring
question — the PDFs' own recommended verification method (Google Search
Console URL Inspection, comparing rendered DOM to raw HTML) has not been
run. Flagging rather than guessing.

## 4. New finding, not in either PDF: bot-detection edge function was never deployed

**Severity: low practical impact, but a clean instance of a recurring defect class.**

While verifying the CSP fix in a live browser, a second, unrelated live
error surfaced in the same console capture:

```
Access to fetch at 'https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/bot-detection'
from origin 'https://www.aiwmcquantis.com' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check: It does
not have HTTP ok status.
```

Investigated directly against the live Supabase project rather than guessed
at: `list_edge_functions` for project `dmlxrvfyqsakyjomsvdj` returns ~60
active functions, and `bot-detection` is not among them; `get_edge_function`
for that slug returns `NotFoundException`. **The function has never been
deployed.** It is not a CORS-header bug — the source
(`supabase/functions/bot-detection/index.ts`) correctly handles `OPTIONS`
and the shared CORS allowlist correctly includes this origin. Because no
function exists at that path, Supabase's edge gateway itself returns a
non-2xx response to the preflight, which is exactly the browser error
observed.

`git log` shows exactly one commit touching this path: the function was
authored and merged on 2026-09-05 (PR #107) and has apparently never been
deployed since — consistent with the standing note from the 2026-09-02
session that the `deploy_edge_function` MCP tool was durably broken at that
time. This is the **third** instance found this week of the same defect
class: real, tested, merged code that never actually reached production
because the deploy step silently didn't happen (the other two: the
`analysis_complete_events` emitter, fixed in PR #146; the
`RouteSEO.tsx`-vs-`PageSEO` drift above). Worth naming as a standing pattern
for this codebase, not three unrelated coincidences.

**Impact is genuinely low**: `useBotDetection()` (`src/hooks/useBotDetection.ts`)
is telemetry-only, wrapped in try/catch, and only sets a session flag used to
suppress analytics events for bots — it does not gate signup, analysis, or
any abuse-prevention flow. So this has been silently dark since 2026-09-05,
not silently broken anything customer-facing.

**Not fixed today**: attempting to deploy this function was explicitly
blocked by this session's own auto-mode permission classifier as a
"Production Deploy" action requiring direct confirmation. Flagging for the
founder rather than working around it — see the end of this report.

Also observed, not yet triaged: two unidentified `404` console errors on
homepage load, and a standing `Sentry DSN not configured — error tracking
disabled` warning (meaning zero production JS-error visibility has existed
this whole time, separate from the CSP issue above, since Sentry's own
script would have been blocked by CSP too — but the DSN itself was never
set regardless).

## 5. What's fixed vs. still open at end of Day 1

| Item | State |
|---|---|
| CSP conflict blocking GA4 + Apollo | **Fixed and confirmed live** — PR #147 merged, deployed, re-verified directly against the production HTTP response: single consolidated CSP header now serves the full allowlist, duplicate `<meta>` policy is gone (0 occurrences), title tag confirmed updated |
| "Deterministic" positioning (4 locations: runtime PageSEO x2, static index.html, prerender-time anchor constant) | Fixed and confirmed live, same PR |
| noscript "3 vs 5" free-tier pricing contradiction | Fixed in source (correct hygiene), but **confirmed to have no live production impact** — the deployed noscript content is generated separately by `generate-static-bodies.mjs` and never reaches the block this fix touched. Corrected in this doc after checking the actual live output post-deploy; see §3 |
| `RouteSEO.tsx` '/' entry silently unparsed (backtick description) | Identified, no visible bug (fallback produces same output) — one-line parser fix candidate for Day 2/3, not urgent |
| bot-detection edge function never deployed | Root cause confirmed (never deployed since 2026-09-05); low customer impact (telemetry-only); deploy attempt blocked by this session's own production-deploy permission gate — needs founder go-ahead |
| Sentry DSN never configured | Identified, not yet actioned — needs a founder decision (get a DSN, or explicitly accept no error tracking) |
| Two unidentified 404s on homepage load | Observed, not yet triaged |
| Suspected mojibake in generated static content | Investigated and ruled out — correctly-encoded UTF-8 em dash; a display artifact in this session's own tooling, not a production bug |
| Googlebot rendered-DOM-vs-noscript crawlability | Still an open, unverified question (needs Search Console access) |

## 7. Blocked, needs founder decision

Deploying the `bot-detection` edge function (item above) was blocked by this
session's own auto-mode classifier, which requires explicit confirmation
before any production deploy action. The fix is low-risk (isolated,
telemetry-only function, code already reviewed and correct) but genuinely is
a production deploy, so it's being surfaced rather than forced through. Say
the word and it goes out; otherwise it stays flagged and undeployed.

## 6. Evidence discipline note

Every claim above that could be checked live was checked live (browser
console capture, direct HTML/HTTP fetch, direct repo grep) before being
written down as fact, rather than accepted from the source PDFs. Two of the
PDFs' claims were corrected in the process (title/meta uniqueness across
routes was already fine; the "no server content at all" framing was
materially incomplete once `<noscript>` was checked). This is deliberate —
the standing instruction for this audit is truthfulness over agreement with
the source material.
