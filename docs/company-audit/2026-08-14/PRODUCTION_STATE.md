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

## Supabase project-identity gate (§4.1) — RESOLVED this pass

Founder reconnected the Supabase MCP mid-session. Re-checked fresh:

```
project_ref (connected)  = dmlxrvfyqsakyjomsvdj
project_name              = AIWMC QUANTIS
organization               = kigtmuwprthzlbrnzwwf
status                     = ACTIVE_HEALTHY
gate result                = MATCHES_QUANTIS_PRODUCTION
```

`list_projects` also surfaced 4 sibling projects under the same org, not previously known to this session: `betaaiwmcsupas` (INACTIVE), `AIWMC ROBOTIC` (INACTIVE), `v2 AIWMC; Kerry main FEAT beta` (INACTIVE), `sun-city-moving-dev` (ACTIVE_HEALTHY). None relevant to Quantis; noted for completeness only.

## Real production evidence captured this pass (DB_VERIFIED, read-only)

- **Track A functions**: all 5 confirmed `anon EXECUTE = true` live; signatures match Track A's migration exactly. See `SECURITY_STATUS.md` for full detail and the direct exploit reproduction.
- **Schema drift, newly found**: `public.referral_rewards` and `public.referral_conversions` do not exist in production; only `referral_codes` does (0 rows — feature never successfully used). Independent of the security finding.
- **Evidence Service dormancy, upgraded from INFERRED to DB_VERIFIED**: `evidence_packets`, `evidence_shadow_queue`, `evidence_telemetry`, `evidence_sources`, `evidence_claims` — none exist in production. No `cron.job` row matching `%evidence%`. Confirms Predicta Phase 0's inference was correct: fully dormant, nothing deployed.

## What remains CODE_VERIFIED (repo-only, unaffected by the above)

- Open PRs, freshly re-checked this pass: #26 (OPEN, MERGEABLE, no review yet), #27 (OPEN, MERGEABLE, no review yet), #28 (OPEN, MERGEABLE, no review yet, CI green per prior pass this session).
- Track A branch (`security/p0-track-a-referral-access-fix`) head unchanged at `b205ee06c67f1a1a32e30cf39502d21e7f904263` — diff against `origin/main` unchanged, 627 insertions across 6 files, matching the last audit pass exactly.
