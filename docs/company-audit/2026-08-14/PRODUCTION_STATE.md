# Production State — refresh log

Per v4.0 charter §5 (Phase 2). Updated in place on each refresh, not duplicated per-run.

## 2026-08-14, refresh #2 (this pass)

```
PRODUCTION_STATE_TIMESTAMP: 2026-08-14 (session time, not wall-clock verified against a live server)
main SHA:                   741bbbe7a198f88e8ce4b4d1afae29be69032327   — CODE_VERIFIED (unchanged since last audit pass, same session)
deployed frontend SHA:      UNVERIFIED — no Vercel deployment API/MCP access this session
deployed Edge Function versions: UNVERIFIED — no verified Supabase project connection (see below)
Supabase migration ledger:  UNVERIFIED — same reason
live schemas:                UNVERIFIED
live RPC signatures:         UNVERIFIED
live grants:                 UNVERIFIED
live RLS policies:            UNVERIFIED
critical feature flags:       UNVERIFIED (EVIDENCE_SERVICE_SHADOW_ENABLED state in any real environment unknown)
```

## Supabase project-identity gate (§4.1) — result this pass

```
project_ref (connected)      = tjoeintpstnifkmjlirs
project_name (connected)     = suncitymoving@suncitymoving.com's Project
organization (connected)     = kbypmudeysuchvzvpkak
expected_ref (Quantis)       = dmlxrvfyqsakyjomsvdj
get_project(dmlxrvfyqsakyjomsvdj) result = permission denied (project exists; connected identity not authorized on it)
gate result                  = WRONG_ACCOUNT
```

Checked fresh this pass (not reused from a prior turn's cached result) — same outcome as the two prior checks earlier in this session. This is a stable, repeatable finding, not a transient error: `SUPABASE_CONNECTION_MISMATCH`.

**Exact unblock action**: in an interactive Claude Code session, run `/mcp`, disconnect the Supabase connector, and reconnect using the account/login under which `dmlxrvfyqsakyjomsvdj` actually exists (verify in the Supabase dashboard under that account before reconnecting — the project is real, so it lives under *some* account; the connected session simply isn't that one).

## What remains CODE_VERIFIED (repo-only, unaffected by the above)

- Open PRs, freshly re-checked this pass: #26 (OPEN, MERGEABLE, no review yet), #27 (OPEN, MERGEABLE, no review yet), #28 (OPEN, MERGEABLE, no review yet, CI green per prior pass this session).
- Track A branch (`security/p0-track-a-referral-access-fix`) head unchanged at `b205ee06c67f1a1a32e30cf39502d21e7f904263` — diff against `origin/main` unchanged, 627 insertions across 6 files, matching the last audit pass exactly.
