# CI → CD Activation Runbook

Workflows are already committed and green:

- `.github/workflows/ci.yml` — lint, prettier, typecheck, business-logic hash, tests, audit (runs on every PR + push to `main`).
- `.github/workflows/staging-deploy.yml` — per-PR preview deploy (Vercel **or** Netlify).
- `.github/workflows/production-deploy.yml` — auto-deploys `main` after CI passes, with post-deploy HTTP 200 smoke test.

Both deploy workflows are **no-ops until secrets exist** — they print a guidance summary and stay green. That means activation is purely a GitHub-side configuration task. The agent cannot do it; a repo admin must.

---

## One-time GitHub setup (≈ 10 minutes)

### 1. Create the two environments

Repo → **Settings → Environments → New environment**:

- `staging`
- `production`

### 2. Add secrets per environment

Open each environment and add **Environment secrets** (not repo-wide):

| Secret | staging | production | Where to get it |
|---|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | ✅ | `.env` (already published value) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | ✅ | `.env` |
| `VITE_SUPABASE_PROJECT_ID` | ✅ | ✅ | `.env` (`gafxacjhkqsdzwwzhbor`) |
| `VERCEL_TOKEN` | ✅ | ✅ | vercel.com → Account Settings → Tokens |
| `VERCEL_ORG_ID` | ✅ | ✅ | `.vercel/project.json` after `vercel link`, or Vercel team settings |
| `VERCEL_PROJECT_ID` | ✅ | ✅ | same source |
| `PRODUCTION_SMOKE_URL` | — | optional | defaults to `https://aiwmcquantis.com` |

> Netlify alternative: provide `NETLIFY_AUTH_TOKEN` + `NETLIFY_SITE_ID` instead of the three Vercel secrets. The workflow auto-detects which provider is configured.

### 3. Required reviewers (production gate)

In **Settings → Environments → production**:

- **Required reviewers** → add `beltovbogdan` (and any co-approver).
- **Wait timer** → `0` (or `5` min if you want a cool-down).
- **Deployment branches** → restrict to `main`.

The `staging` environment should have **no** reviewers — previews must be instant.

### 4. Branch protection on `main`

**Settings → Branches → Add rule** for `main`:

- Require status check: `Lint · Format · Typecheck · Verify · Tests · Audit` (the CI job)
- Require pull request before merging (1 approval)
- Require branches to be up to date
- Do **not** allow force pushes

---

## How it flows after activation

```text
PR opened ──► CI runs ──► staging-deploy posts preview URL on the PR
   │
   └── merge to main ──► CI runs ──► production-deploy waits for required reviewer
                                          │
                                          └── approve ──► Vercel prod deploy ──► smoke test (5× retry, 200 OK)
```

## Verifying it works

1. Open a throwaway PR touching a comment-only line.
2. CI must go green; staging-deploy must comment a preview URL.
3. Merge → production-deploy enters "Waiting" state pending approval.
4. Approve in the Actions UI → deploy runs → smoke test must hit `https://aiwmcquantis.com` and return 200.

If the smoke step fails the deploy is marked failed but the previous Vercel deployment stays live (Vercel keeps the last successful prod alias). Roll forward with a fix PR; no manual rollback usually needed.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Workflow logs "No provider configured" | Secrets missing in that environment | Re-add them under the correct environment (not repo-wide) |
| Vercel: `Error: Project not found` | `VERCEL_PROJECT_ID` / `VERCEL_ORG_ID` mismatch | Run `vercel link` locally, copy ids from `.vercel/project.json` |
| Smoke test returns 000 | DNS / Vercel alias not ready | Workflow retries 5× over 25 s; if persistent, check Vercel dashboard for the alias |
| Production-deploy never triggers | CI failed, or `workflow_run` filter | Production only fires when CI on `main` concludes `success` |
