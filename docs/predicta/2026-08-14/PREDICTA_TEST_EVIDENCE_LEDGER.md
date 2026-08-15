# Mr. Predicta — Test Evidence Ledger

Charter: MR. PREDICTA v1.0, 2026-08-14, AIWMC LLC. Phase: **Phase 0 — baseline freeze only**. No test domain (A-Q) has been executed. This ledger exists to make that explicit and to reconcile the charter's own §5 hypotheses against repository ground truth, per §4's truth hierarchy and §5's instruction: "Do not preserve any item if repository or production evidence disproves it."

## §5 hypothesis reconciliation

| Charter hypothesis | Status | Evidence |
|---|---|---|
| `main` SHA = `741bbbe7...` | **CONFIRMED** | CODE_VERIFIED, `git rev-parse origin/main` |
| `feature/evidence-service` SHA = `cb833b90...` | **CONFIRMED** | CODE_VERIFIED, `git rev-parse origin/feature/evidence-service` |
| E5 persistence work exists | **CONFIRMED** | CODE_VERIFIED, `20260810090000_evidence_service_schema.sql` |
| E5.5 migration-lineage work exists | **CONFIRMED** | CODE_VERIFIED, prior-session commit history (16/18 migrations reconciled, see [[quantis_predicta_evidence_charter]] memory for detail) |
| E6 shadow queue/worker exists | **CONFIRMED** | CODE_VERIFIED, `20260810120000_evidence_shadow_queue.sql`, `supabase/functions/evidence-shadow-worker/index.ts` |
| E6.2 evidenceRunKey semantic idempotency exists | **CONFIRMED** | CODE_VERIFIED, `20260811000000_evidence_run_key.sql` |
| E7 evidence telemetry exists | **CONFIRMED** | CODE_VERIFIED, `20260811010000_evidence_telemetry.sql` |
| Feature flag is named `QUANTIS_EVIDENCE_SHADOW_ENABLED` | **DISPROVEN** | CODE_VERIFIED — the real name is `EVIDENCE_SERVICE_SHADOW_ENABLED` (`evidence-shadow-worker/index.ts:93`). Charter text should be corrected to the real name in all future references. |
| "remaining E5.5 confirmations" unfinished | **CONFIRMED still open** | Prior session left 5 items requiring direct DB queries (see `docs/execution/2026-08-10/E5_5_REMAINING_QUERIES.sql`, referenced in memory, not re-verified this pass) |
| Contradiction detection status unknown/unproven | **NOT YET INSPECTED** | Would require reading `_shared/evidence/evidence-graph.ts` and `independence.ts` line-by-line against §16's definition — deferred to Domain J execution, not done in Phase 0 |
| Production deployment status unknown | **CONFIRMED still unknown, root cause identified** | `evidence-shadow-worker` IS in `production-deploy.yml`'s FUNCTIONS array on the branch, so it WOULD deploy on next `main` merge — but branch is unmerged and `main` has zero evidence_* migrations (CODE_VERIFIED), so INFERRED not deployed. Cannot get PROD_VERIFIED without production Supabase access (blocked, see below). |
| Real production evidence packets exist | **NOT ASSESSED** | Requires DB access, blocked |
| Live cost/latency distribution known | **NOT ASSESSED** | Requires DB access, blocked |
| Live privacy review done | **NOT ASSESSED** | Not started |

## Blocking dependency

All `DB_VERIFIED` / `PROD_VERIFIED` / `CONFIG_VERIFIED` evidence in this ledger is blocked on the same root cause: the Supabase MCP connected to this session authenticates against a different Supabase account/project (`suncitymoving`, ref `tjoeintpstnifkmjlirs`) than AIWMC Quantis (ref `dmlxrvfyqsakyjomsvdj`). `get_project('dmlxrvfyqsakyjomsvdj')` returns a permission error (the project exists; the connected identity isn't authorized on it), confirmed directly this session, not inferred. This is the same blocker already open against PR #26 / Track A's production verification.

**Per charter §4 ("Never convert CODE_VERIFIED into PROD_VERIFIED")**: nothing above should be read as proof the evidence service is or isn't live in production. It is CODE_VERIFIED dormant-by-construction (gated behind an unset flag, unmerged branch) but that is not the same claim as PROD_VERIFIED absent.

## Test domain execution status (A-Q)

None executed. See `TEST_MATRIX.csv` for the full skeleton with `NOT_STARTED` status on every row, and `KNOWN_GAPS.md` for what blocks each one.
