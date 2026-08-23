# Vercel Frontend Deploy Pipeline — Confirmed Break, Not a Benign Check Artifact

**Status:** CONFIRMED ACTIVE FAILURE (not a monitored/benign exception)
**Severity:** P0 — reclassified up from QNT-DEFECT-002's prior P1
**First observed (this document):** 2026-08-22
**Owner:** release engineering (requires Vercel dashboard/team-settings access this session does not have)

## 0. Why this document exists, and why its framing changed mid-investigation

Item 4 of the reconciled tomorrow list ([QUANTIS_FINAL_ARCHITECTURE_SCOPE.md](QUANTIS_FINAL_ARCHITECTURE_SCOPE.md)) was scoped as: *"formally document the Vercel-check-vs-real-deploy distinction as a standing monitored exception."* That framing assumed the prior capture's conclusion — that the failing GitHub "Vercel" status check was a harmless permissions artifact, since the site independently proves it serves *some* current, correct content (pricing, routes).

That assumption does not survive fresh evidence. Investigating this item turned up a **root cause with a specific, unambiguous error message**, and cross-checking it against the live production JS bundle **proves the frontend has not actually redeployed in at least 23 commits**, several of which changed frontend code that a prior session turn (this same day) reported as shipped to production. This document replaces the "standing exception" framing with the actual finding.

## 1. The evidence, in order

### 1.1 Every commit since a specific point has failed the Vercel check

```
git log --format=%H -30 origin/main | gh api repos/AIWMCX/aiwmcquantis/commits/{sha}/status
```

| Commit | Vercel check state |
|---|---|
| `8b7faf11` (HEAD) ... `b7a5068e` (23 commits) | **failure**, every single one |
| `741bbbe7` "Fixed security issues" | **success** — last known-good deploy |
| `199821f2` "Lovable update" (older) | success |

### 1.2 The failure has an explicit, specific root-cause message

Two description strings appear across the failing commits (previously assumed to possibly be different issues — they are the same issue, Vercel just renders it differently depending on context):

- `"Git author AIWMCX must have access to the project on Vercel to create deployments."` — carries a `target_url` that is literally a **Vercel team-invite link** (`vercel.com/teams/invite?...&gitUserLogin=AIWMCX&...&teamName=jeltovbogdan-7049's+projects`).
- `"Deployment was blocked"` — the same underlying block, redisplayed once Vercel has already recorded the reason once for that branch/PR context; its `target_url` points at a specific (blocked) deployment rather than the invite link.

This is a standard, documented Vercel product behavior: **Deployment Protection blocks Git-triggered deployments whose commit author is not a member of the Vercel team that owns the project**, unless that protection is explicitly relaxed.

### 1.3 The author identity changed at exactly the break point

```
git log -1 --format='%H %an <%ae>' 741bbbe7   →  gpt-engineer-app[bot] <...@users.noreply.github.com>
git log -1 --format='%H %an <%ae>' b7a5068e   →  AIWMC™ LLC Labs <AIWMCSRM@gmail.com>  (GitHub login: AIWMCX)
```

The last successful deploy was authored by Lovable's bot identity (`gpt-engineer-app[bot]`), which is presumably already a recognized member/integration on the Vercel team. Every commit since has been authored as `AIWMCX`, which the Vercel invite link itself confirms is **not** a member of team `jeltovbogdan-7049's projects`.

### 1.4 The blocked commits are not backend-only — they touch live frontend code

```
git diff --name-only 741bbbe7 8b7faf11 -- src/ public/ index.html vite.config.ts
```

Includes: `src/App.tsx`, `src/components/auth/ProtectedRoute.tsx`, `src/components/layout/AppSidebar.tsx`, `src/hooks/useAdmin.ts`, `src/components/analysis/FreeTierResultCard.tsx`, `src/components/pdf/ReportCoverPage.tsx`, `src/components/pdf/pdfStyles.ts`, `src/services/analysisApi.ts`, `src/types/analysis.ts`, plus test files.

### 1.5 Direct proof: the live bundle is running pre-break code

```
curl https://www.aiwmcquantis.com/  → asset name index-J-oVLnnA.js
curl https://www.aiwmcquantis.com/assets/index-J-oVLnnA.js
grep -c 'claim_content_admin_if_allowlisted|content_admin|isContentAdmin|requireContentAdmin' → 0 matches
grep -c 'claim_admin_if_allowlisted' → 1 match (old RPC, present)
grep -c 'requireAdmin' → 16 matches (old gating, present)
```

The `content_admin` scoped-access feature — built, migrated to the live database, and reported shipped earlier this same session (PR #47, commit `20ff6af2`) — **does not exist anywhere in the live production JS.** The bundle is unambiguously the pre-`b7a5068e` build.

The bundle's `Last-Modified` header reads today (2026-08-22 18:47:07 GMT), which does not contradict this — Vercel/CDN can refresh an object's storage timestamp without the underlying commit changing (e.g. a rebuild of the same last-known-good ref, or edge-cache repopulation). The content is the determining signal, not the header.

## 2. What this means, precisely

- **Backend (Supabase Edge Functions) deploy fidelity remains independently verified** via the `?health=1` live `commit_sha` endpoint — that pipeline is unaffected by this finding and continues to track `origin/main` correctly. This is a **frontend-only** pipeline break.
- **The content-admin/autoposter access grant (PR #47) is live in the database (RLS, roles, RPCs — verified earlier this session) but not functionally reachable in the deployed UI.** `AIWMCSRM@gmail.com` and `jjbalaganvasya@gmail.com` would currently hit the old `requireAdmin`-only route/nav gating in production, not the new `requireContentAdmin` gating. The work is real and correct but not yet delivered end-to-end.
- **Every other frontend change merged since `b7a5068e`** (activation-score UI, free-tier result card fixes, PDF report cover page, migration-control-plane test additions insofar as they'd affect a frontend build, etc.) is similarly sitting un-deployed.
- This is **not** disproven by the earlier finding that public routes/pricing/metadata all serve correct current content — those particular surfaces happen not to have changed in the affected window, so a stale build still serves them correctly. That was a real but incomplete verification; it did not (and structurally could not, without a build-metadata endpoint) distinguish "correct because current" from "correct because unchanged since before the break."

## 3. What is NOT yet known (honest gap)

- **Whether Vercel is deploying anything at all right now**, or whether it is silently re-serving the last successful build on every push. The `Last-Modified` freshness suggests *something* is rebuilding, but that could be a scheduled/triggered rebuild of the same old ref rather than evidence the pipeline is otherwise healthy.
- **Whether a manual promote/redeploy path exists** that a Vercel-team-member account (e.g. the `jeltovbogdan-7049` team owner) could use to push the current `main` HEAD live without fixing git-author access — this session has no Vercel dashboard/API access to check.
- **The exact history of every frontend-affecting commit's actual live status** — this document walked back 30 commits; it did not exhaustively diff every single file changed in that range against the live bundle, only representative markers.

## 4. Required action (not optional, not deferrable to "standing exception")

1. **Grant the `AIWMCX` GitHub identity access on the Vercel team** `jeltovbogdan-7049's projects` for the `aiwmcquantis-main` project — the invite link is already embedded in the GitHub status check (`target_url` on the "Git author must have access" state) and requires a Vercel dashboard action from whoever owns that team (`jeltovbogdan-7049`, i.e., the account tied to jeltovbogdan@gmail.com per this session's identity). This is the direct, specific fix — not a broad investigation.
2. Alternative if immediate access-grant isn't possible: relax Vercel's Deployment Protection setting for this project (Project Settings → Git → "Deployment Protection" / "Require access for Git authors") to stop gating on author identity — lower-friction but weaker security posture, and still requires the same dashboard access.
3. **A third, independent path already exists in this repo and requires no Vercel-team-membership change at all**: `.github/workflows/vercel-production-deploy.yml`, a manual `workflow_dispatch` action that builds and deploys via the Vercel **CLI** authenticated with a `VERCEL_TOKEN` (account/project token, not git-author identity) — this bypasses the git-integration block entirely by design, and additionally runs a smoke test, a deploy-fidelity gate, and auto-rollback on failure. **It has never been run** (`gh run list --workflow=vercel-production-deploy.yml` returns zero runs since the file was added 2026-06-19), and it cannot run successfully yet.

   Its own `scripts/preflight-secrets.sh` hard-requires **11 secrets** before it will even attempt a build: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DEEPSEEK_API_KEY` (plus 5 more that are optional/warn-only: `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID`, `SLACK_DEPLOY_WEBHOOK_URL`). `gh secret list` shows only `CRON_SECRET`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` currently configured — **9 of the 11 hard-required secrets are missing**, not just the 3 Vercel-specific ones. All 9 (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DEEPSEEK_API_KEY`) would need to be configured — not merely the Vercel ones — before this workflow could run at all. This is still a real, likely lower-friction path (none of it requires adding `AIWMCX` as a Vercel team member), but it is a larger secrets-provisioning task than initially stated, not a 3-secret fix.
4. **After any of the three fixes, force a redeploy of current `main` HEAD** and verify the live bundle contains `claim_content_admin_if_allowlisted` / `isContentAdmin` / `requireContentAdmin` (the exact same grep used in §1.5) before considering PR #47's frontend half actually shipped.
5. Once fixed, build the frontend build-metadata endpoint (`/version.json` or equivalent, per Workstream A) so this entire class of "is the frontend actually current" question stops requiring bundle-grepping forensics.

## 5. Monitoring going forward (the part that IS a standing procedure)

Until §4.1–4.3 are done, treat every future "is this frontend change live" question with the same method used here — **never assume push-to-main implies live**:

```bash
curl -s https://www.aiwmcquantis.com/ | grep -o '/assets/index-[^"]*\.js'
curl -s https://www.aiwmcquantis.com/assets/index-<hash>.js -o /tmp/live_bundle.js
grep -c '<a distinctive string introduced in the commit being checked>' /tmp/live_bundle.js
```

A `0` result for a marker known to exist in the current `main` source is the tripwire — it means the deploy pipeline is still broken and the change is not live, regardless of what CI/merge status shows. `MERGED ≠ DEPLOYED ≠ PRODUCTION_VERIFIED` — this incident is the concrete proof of exactly that invariant, not a hypothetical.
