# AIWMC Quantis — Consolidated Master Scope

Date: 2026-08-09 (late session). Reconciles two frameworks that arrived
separately this week and were never merged into one view:

1. **The 7-Day Consolidated Execution Package** (production-safety directive,
   Phases 0-10, Predicta-gated last) — already being executed on
   `security/p0-effective-access-control`, 9 commits deep, GitHub Actions
   billing now unblocked, isolated CI test currently running.
2. **The Founder OS gated-operations package** (`EXECUTIVE-FOUNDATION.md`,
   `90-DAY-GATED-ROADMAP.md`, `RD-BACKLOG.md`, `TASK-REGISTER.csv`,
   `IMPLEMENTATION-ORDER.md`, `PRODUCTION-RELEASE-CHECKLIST.md`) — a
   revenue/distribution-gated roadmap (MP1 through MP5), supplied today from
   your Desktop, **not yet present anywhere in the repository.**

## They are not in conflict — here is the actual relationship

`RD-BACKLOG.md`'s own rule: *"Only integrity work may proceed before the
first paying user, and it must not displace MP1 verification."* And
`90-DAY-GATED-ROADMAP.md`'s stop conditions include *"A P0 calculation or
payback defect appears."* Read together with the 7-Day Package: **the P0
security/stabilization work this session has been executing IS the
"integrity work" the Founder OS package explicitly permits and requires
before MP1/MP3 GTM motion continues.** There is no scope conflict. There is
one real gap: **MP1's own acceptance test has apparently never been run and
recorded**, and this session's work already produced most of the evidence it
needs — see below.

## New finding: MP1 is likely already passing, unrecorded

`TASK-REGISTER.csv`'s `TSK-MP1-001` acceptance test: *"Three production
routes have unique body hashes; Pro $49 is crawlable; no retired 7-Layer
string."* `EXECUTIVE-FOUNDATION.md` calls this **the active gate** — ahead
of everything else, including revenue motion.

This session, for an unrelated reason (MON-1, diagnosing the SEO Live
Monitor), `scripts/verify-live-production.sh` was run directly against
`https://www.aiwmcquantis.com` and returned:

- 7 sampled routes (not 3), each with a correct self-referencing canonical
  and a unique body — no duplicate-content regression.
- The shipped JS bundle confirmed to contain `$49` and `Pro` pricing data.
- The "7-Layer" stale-content string was checked for and not found (this
  script's own header comment names that exact string as one of its checks).
- `sitemap.xml` reachable (88 URLs), `robots.txt` reachable.
- An unknown route correctly returns a real 404 (no soft-404 regression).

**This appears to directly satisfy `TSK-MP1-001`'s acceptance test**, with a
stronger sample (7 routes, not 3) and additional checks beyond what MP1 asked
for. It has not been formally recorded as `EVD-MP1-*` evidence per
`TASK-REGISTER.csv`'s own format, and it was not run *for* MP1 — it needs an
explicit confirmation pass (re-run intentionally as the MP1 verification, not
just inferred from a different investigation) before you close that gate.
This is a real, near-free win sitting in this session's own output — flagging
it rather than re-deriving it from scratch, per the truth-hierarchy rule
against duplicate work.

**Still genuinely open from the Founder OS package, not touched this
session:** `TSK-MP1-002` (fail-closed Playwright route-body contract, so this
doesn't silently regress again — currently `READY`, not started),
`TSK-STAB-001` (canonical product manifest — no public surface should
hardcode price/entity/benchmark-count outside one source), `TSK-STAB-002`
(financial-integrity property tests — decimal arithmetic, payback,
reconciliation, framed as formal property tests rather than the ad-hoc
reconciliation checks already in `analyze-business/index.ts`),
`TSK-STAB-003` (benchmark inventory truth report — quality distribution with
source/unit/period/license per production-eligible observation).

## Disposition of the 5 Founder OS files

Per the directive's own instruction (*"keep as operating-control material;
update it to current Aug 8 [now Aug 9] production truth"*): these are real,
well-specified operating documents, not yet committed anywhere in
`AIWMCX/aiwmcquantis`. Confirmed via `git grep` — zero matches for any of
their filenames or content across the whole repo. Recommend committing them
to `docs/founder-os/` on `main` directly (they're process documents, not
security-sensitive, and don't need to wait on PR #26) — **not done yet,
pending your go-ahead**, since adding new tracked files to the repo is your
call, not mine to make unilaterally.

## One consolidated, ordered scope of work

Supersedes the earlier `ASAP_TOP_LEVEL_TASKS.md` (still accurate, this is the
fuller picture with the Founder OS gates folded in).

### DONE (this session, `security/p0-effective-access-control`, 9 commits, pushed, not merged)
1. Phase 0 freeze, evidence ledger, open-defects register.
2. PUB-1 — fail-closed publication gate for `report_integrity=BLOCK`.
3. MON-1 — SEO monitor diagnosed as a false alarm (GitHub billing lock, not a
   site regression) — **and now doubles as likely MP1 evidence, see above.**
4. PR #27's dead-PDF-component trap found and fixed at the actual live PDF
   (`usePdfExport.ts`) and share card (`ViralCard.tsx`).
5. Workstream 1 canonical readiness record (6 corrected-language items).
6. Workstream 2 function-access matrix + NULL-safe-predicate audit
   (`get_referral_stats` and 3 others confirmed exploitable/unchecked from
   primary source).
7. GitHub Actions billing lock resolved (your action) — confirmed via a real
   successful workflow run, not just the billing page saying "unlocked."
8. Two rounds of CI-surfaced config drift fixed: `pdf-generator` references
   in the deploy manifest + `admin-health-sweep.ts` + `config.toml`, and a
   second, pre-existing, unrelated stale entry (`referral-reward`) in
   `config.toml` that has apparently never been caught before because this
   is the first time `supabase start` has ever run in this repo's CI.

### IN PROGRESS right now
9. Isolated Supabase CI test (migration replay → pgTAP → cross-identity
   matrix → rollback rehearsal → reapply → rerun), third dispatch, currently
   running. Will report exact pass/fail evidence the moment it completes.

### NEXT, IN DEPENDENCY ORDER
10. **Confirm MP1 formally** — re-run `verify-live-production.sh` (or the
    live curl procedure `EXECUTIVE-FOUNDATION.md` names directly) as an
    explicit MP1 verification pass, record it as `EVD-MP1-*` evidence in
    `TASK-REGISTER.csv`'s format. Near-zero additional work given step 3
    above.
11. **Close PR #26** once the isolated CI test (step 9) is green — merge,
    apply migration, re-run the original anonymous HTTP probes against
    production, record the deployed SHA.
12. **Fold in the Workstream 2 NULL-safe fixes** (`get_referral_stats` etc.)
    — still your scope call: same migration as #26, or a follow-up.
13. **QOC-1's final proof** — needs a real authenticated request now that CI
    infrastructure works; can likely be reproduced via the same isolated
    Supabase stack the isolated CI test just proved is runnable.
14. **PR #27 merge** — dead-code trap already fixed; still needs a fresh
    production analysis → locked-payload/UI/PDF parity check.
15. **BILL-1 — Stripe test-mode E2E.** Still unverified; 24 live
    active/trialing subscriptions running on an unverified path.
16. **CSP/analytics cleanup** (rest of Phase 2) — diagnosed, not yet fixed.
17. **TSK-MP1-002 / TSK-STAB-001/002/003** — the Founder OS stabilization
    backlog items not touched this session. Lower urgency than 11-16 (no
    active production-safety defect), but genuinely open and gate-blocking
    for MP1's *durability*, not just its current pass/fail state.

### LAST, EXPLICITLY GATED — Predicta Evidence Service
Unchanged from the earlier task list: Phases 7-10 of the 7-Day Package.
Do not start until 10-16 above are closed — both directives agree on this
independently (the 7-Day Package's own Section 9, and the Founder OS
package's "only integrity work before first paying user" rule). When the
gate opens: `ProviderCapabilityRegistry` + the four data contracts, shadow-
mode only, numeric firewall, 100-question evaluation corpus before any
cutover conversation.

## What I need from you

1. OK to commit the 5 Founder OS files into `docs/founder-os/` on `main`
   directly? (Process docs, not security-sensitive, no reason to wait on
   PR #26.)
2. OK to run the MP1 confirmation pass (item 10) as its own explicit,
   recorded step?
3. Still waiting on your call from earlier: fold the NULL-safe referral fixes
   into PR #26's migration, or ship as a follow-up?
