# Known Gaps — Predicta Phase 0

Per charter §5: "Do not preserve any item if repository or production evidence disproves it." This list reflects Phase 0 findings only — repository-level inspection, no test domains executed.

## Confirmed gaps (repository evidence)

1. **Zero test domains executed.** A-Q are all `NOT_STARTED` (see `TEST_MATRIX.csv`). This document exists because the charter requires the baseline to exist *before* any implementation or testing work — it is not itself a test result.
2. **No 200-case evaluation corpus exists yet** (§24). Domains E, G, H depend on it directly; building it (100 business/benchmark, 25 location/cost, 25 regulation, 25 ambiguity/contradiction, 25 freshness, each independently adjudicated) is unstarted work, not a quick add-on.
3. **Contradiction detection status is unknown**, not merely "untested." §16 explicitly requires determining whether it exists at all before testing it, and if it doesn't, reporting `NOT_IMPLEMENTED` / `BLOCK_CLAIM` rather than a fabricated pass. This determination itself hasn't been made yet — `evidence-graph.ts` and `independence.ts` haven't been read against §16's definition this pass.
4. **Single provider only.** `provider-registry.ts` / `provider-router.ts` exist as an abstraction layer, but only one concrete adapter (`tavily-provider.ts`) is wired. Domain D's multi-provider disagreement/failover cases can't be meaningfully exercised against a real second provider yet.
5. **No commercial budget variables defined.** §23 requires `MAX_EVIDENCE_P95_MS`, `MAX_EVIDENCE_COST_USD_PER_RUN`, `MAX_PROVIDER_TIMEOUT_RATE` to exist before Domain Q can have a pass/fail gate at all. None are defined anywhere found this pass. Per the charter's own instruction, this state is `COMMERCIAL_BUDGET_UNDEFINED`, requiring product/CFO approval before cutover — not something Predicta should invent a number for.
6. **Charter's own flag-name hypothesis was wrong.** §5/§6 name the flag `QUANTIS_EVIDENCE_SHADOW_ENABLED`; the real name in code is `EVIDENCE_SERVICE_SHADOW_ENABLED`. Corrected in the ledger; flagging here so it isn't silently reintroduced in a future session that re-reads the charter text without re-checking code.

## Blocking dependency — production/environment access

The following cannot be assessed at all without it, and this is the single dependency-controlling item per charter §30.H:

**Root cause**: the Supabase MCP connected to this session authenticates as a different account/project (`suncitymoving@suncitymoving.com`, ref `tjoeintpstnifkmjlirs`) than AIWMC Quantis (ref `dmlxrvfyqsakyjomsvdj`). Direct check this session: `get_project('dmlxrvfyqsakyjomsvdj')` → `permission denied`, not "not found" — the project is real, the connected identity isn't authorized on it.

**Blocked by this**:
- Whether any evidence_* migration or the `evidence-shadow-worker` function has actually reached production (PROD_VERIFIED / DB_VERIFIED)
- Whether `EVIDENCE_SERVICE_SHADOW_ENABLED` is set anywhere real (CONFIG_VERIFIED)
- Whether the `evidence-shadow-worker-poll` pg_cron job is registered/firing (DB_VERIFIED)
- Domain K (numeric firewall against real persisted rows)
- Domain N (RLS cross-tenant matrix — needs real `auth.users`, real JWTs for anon/user_A/user_B/admin/service_role)
- Domain O (idempotency/concurrency races against a real DB)
- Domain P (telemetry honesty — comparing claimed metrics to real persisted `evidence_telemetry` rows)
- Domain Q (performance/cost against real traffic, once budget variables also exist)

This is the identical blocker already open against PR #26 / Track A's production verification thread — one resolution unblocks both efforts.

## What is NOT blocked (executable right now, repo-only)

Domains A, C, F, I, L, M, and the CODE_VERIFIED half of J and P can all proceed without production access — they only need the branch checked out and fixtures authored. None have been started; listed here so the next session doesn't wait on the DB-access resolution before picking up the easy half of the work.
