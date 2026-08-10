# Workstream 2 — Function-Level Security Boundary Matrix

Date: 2026-08-09. Base data: `docs/security/2026-08-03-p0-access/07_FUNCTION_ACCESS_MATRIX.csv`
(built from live grant queries on 2026-08-04, `CODE_VERIFIED` + `PROD_VERIFIED`
at that time). **This session's contribution**: (a) direct, first-hand
verification of every function body against the migration source that defines
it — not re-derived from the CSV's own claims, independently re-read from
primary source; (b) a dedicated NULL-safe-predicate audit column, per explicit
instruction: *"Every ownership predicate must explicitly fail closed for NULL
auth.uid(). Do not rely on SQL three-valued logic accidentally denying
access."*; (c) confirmation of exactly which of these findings the P0
migration on this branch does and does not touch.

## A note on this session's evidence limits

A live re-query of current grants (to refresh the CSV's 2026-08-04 snapshot)
was attempted this session and **failed** — the Supabase DB MCP tool stopped
responding to every query, including a trivial `SELECT 1`, with a permission
error (`MCP error -32600: You do not have permission to perform this action`).
This is a new, third infrastructure wall this session, distinct from INFRA-1
(GitHub Actions billing lock) and INFRA-2 (local Docker/WSL2 failure) —
logged here as **INFRA-3**. Grant-state columns below are therefore carried
forward from the CSV's 2026-08-04 snapshot, labeled accordingly, not
re-verified live this session. Function-body columns (the NULL-safe-predicate
audit) ARE freshly re-verified this session, directly against
`supabase/migrations/*.sql` source files, independent of the CSV or the DB.

## Matrix

| Signature | Owner | SECURITY DEFINER | search_path | PUBLIC/anon/authenticated EXECUTE (2026-08-04 snapshot, not re-verified live this session) | service_role EXECUTE | Tables read/written | Internal authorization (verbatim, 2026-08-09 source read) | **NULL-safe predicate?** | Real call sites | Intended caller | P0 migration on this branch fixes it? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `record_funnel_event(...)` | postgres | true | `public` | anon+authenticated (intentional) | true | r/w `funnel_events` | Partial — 60/min rate limit inside function; event-name allowlist enforced by a table CHECK constraint, not inside the function | N/A — no ownership predicate by design (anonymous-write-by-design function) | `src/lib/analytics.ts:299` | anon + authenticated | Unchanged (intentionally public, confirmed correct) |
| `charge_free_analysis(text)` | postgres | true | **MISSING** (2026-08-04) | true/true/true (2026-08-04) | true | r/w `usage_counters` | None — trusts `p_identity` entirely | N/A — no predicate exists at all | None found in `src/` or `supabase/functions/` | None (dead/unused signature) | **YES** — `REVOKE ALL`, search_path pinned, this branch's migration |
| `charge_free_analysis(text,boolean)` | postgres | true | set | true/true/true (2026-08-04) | true | r/w `usage_counters` | Partial — has a `p_dry_run` branch, no ownership check on `p_identity` | N/A — no predicate exists | None found | None (dead/unused signature) | **YES** — `REVOKE ALL`, this branch's migration |
| `get_referral_stats(uuid)` | postgres | true | set | true/true/true (2026-08-04, PUBLIC grant contradicts stated authenticated-only intent) | true | read `referral_codes`, `referral_rewards` | **Present but broken**: `IF auth.uid() != p_user_id AND NOT is_service_role() THEN RAISE EXCEPTION` — verbatim, `supabase/migrations/20260206003246...sql:274` | **NO — FAILS OPEN.** `auth.uid() != p_user_id` evaluates to SQL `NULL` (not `TRUE`) when `auth.uid()` is `NULL` (anonymous caller), so the `IF` body never executes and the exception never raises. An anonymous caller supplying any real user's UUID receives that user's referral code, click count, conversion count, and total rewards earned. | `src/hooks/useReferral.ts:53` (client always passes its own id — no real caller exploits this today) | authenticated (view own stats) | **NO** — confirmed via grep: this branch's P0 migration does not reference this function at all |
| `complete_referral_signup(uuid,uuid)` | postgres | true | set | true/true/true (2026-08-04; an EARLIER migration's REVOKE attempt used the wrong signature `(text,uuid)`, silently no-opped) | true | update `referral_conversions`, `referral_codes` | **None** — verbatim source (`...20260206003246...sql:229-261`): no `auth.uid()` reference anywhere in the function body | N/A — no predicate exists to evaluate for NULL-safety; the gap is total, not a three-valued-logic bug like `get_referral_stats` | `src/hooks/useReferral.ts:203` | authenticated (post-signup completion, called by the real signup flow) | **NO** — confirmed via grep: not referenced in this branch's P0 migration |
| `generate_referral_code(uuid)` | postgres | true | set | true/true/true (2026-08-04, contradicts stated authenticated-only intent) | true | r/w `referral_codes` | **None** — verbatim source (`...sql:151-188`): no `auth.uid()` reference | N/A — no predicate exists | `src/hooks/useReferral.ts:122` | authenticated (own code) | **NO** — not referenced in this branch's P0 migration |
| `track_referral_click(text,text,text)` | postgres | true | set | true/true/true (2026-08-04; never appeared in any of the four role buckets in the original hardening migration — a plain omission, not a deliberate placement) | true | insert `referral_conversions`, update `referral_codes` | None by design — pre-signup anonymous click tracking is the intended product behavior | N/A — anon access here is plausibly correct product intent, unlike the three rows above | `src/hooks/useReferral.ts:175` | anon (pre-signup) + authenticated | **NO** — not referenced; recommend an explicit documented allowlist entry (mirroring `record_funnel_event`'s treatment) rather than leaving it an undocumented default, but not a security defect |
| `get_next_invoice_number(uuid)` | postgres | true | set | true/true/true (2026-08-04, contradicts stated authenticated-only intent) | true | r/w `user_brand_profiles` (not one of the 10 incident tables, but touches the same IDOR pattern) | **None** — verbatim source (`...20260308094534...sql:151-171`): no `auth.uid()` reference; the `UPSERT ... ON CONFLICT DO UPDATE SET invoice_counter = invoice_counter + 1` will increment ANY supplied user's counter | N/A — no predicate exists | `src/hooks/useInvoices.ts:87` (client always passes its own session id) | authenticated (generate own next invoice number) | **NO** — not referenced in this branch's P0 migration |
| `decrement_quote_gen_usage()` | postgres | true | set | **TRUE** (2026-08-04; explicit PUBLIC grant despite appearing in the same authenticated-only hardening bucket as its sibling `increment_quote_gen_usage()`) | true | r/w `quote_gen_usage` | Full — operates entirely on `auth.uid()` internally, takes **no parameter at all** | **Effectively safe despite the open grant**: since the function reads `auth.uid()` internally with no caller-supplied identity parameter, an anonymous caller's `auth.uid()` is `NULL`, so `WHERE user_id = NULL` matches zero rows — functionally inert for anon, not exploitable. Still an unreviewed drift from stated intent and should be closed for hygiene. | `src/services/serviceJob.ts:140` | authenticated (refund own quota) | **NO** — not referenced in this branch's P0 migration |
| `get_quote_gen_status()` | postgres | true | set | `REVOKE ALL FROM PUBLIC` (2026-06-11 migration, correctly scoped already) | true | read `quote_gen_usage`, `subscriptions` | Full — `auth.uid()` internal, no parameter | Safe — no caller-supplied identity to bypass | `src/hooks/useQuoteGenUsage.ts:57` | authenticated | N/A — already correctly hardened, not part of the P0 incident |
| `increment_quote_gen_usage()` | postgres | true | set | `REVOKE ALL FROM PUBLIC` (2026-06-11 migration, correctly scoped already) | true | write `quote_gen_usage` | Full — `auth.uid()` internal, no parameter | Safe | `src/services/serviceJob.ts:122` | authenticated | N/A — already correctly hardened |

## Summary — what the fail-closed audit found

**Two genuinely distinct classes of NULL-unsafety, not one:**

1. **Three-valued-logic bypass** (`get_referral_stats` only): a predicate
   exists and looks correct at a glance, but `!=` against a `NULL` value
   silently evaluates to `NULL`, not `TRUE`, in standard SQL — the fix is
   `IS DISTINCT FROM` (NULL-safe), not `!=`. This is exactly the trap the
   standing instruction warns about, and it's real, not hypothetical, in
   this codebase.
2. **No predicate at all** (`complete_referral_signup`, `generate_referral_code`,
   `get_next_invoice_number`): there's no three-valued-logic subtlety to fix
   here — these functions never attempt an ownership check in the first
   place. Trusts every caller-supplied ID unconditionally.

**Confirmed this session, not carried over from the prior round:** the P0
migration on `security/p0-effective-access-control` fixes the 10-table
incident and both `charge_free_analysis` overloads, and **touches none of
the six referral/invoice/quota functions above.** These six remain exactly
as exposed as they were on 2026-08-04, pending the explicit scope decision
the prior round already flagged and deferred.

## Recommended fix pattern (not yet applied — scope decision needed)

```sql
-- get_referral_stats: replace the unsafe predicate
IF auth.uid() IS DISTINCT FROM p_user_id AND NOT is_service_role() THEN
  RAISE EXCEPTION 'Access denied';
END IF;

-- complete_referral_signup / generate_referral_code / get_next_invoice_number:
-- add a predicate where none exists, same NULL-safe form
IF auth.uid() IS DISTINCT FROM p_referred_user_id THEN
  RAISE EXCEPTION 'Access denied';
END IF;
```

Plus `REVOKE EXECUTE ... FROM PUBLIC, anon` on all four (keep `authenticated`,
`service_role`), and the correct-signature REVOKE for `complete_referral_signup`
(the earlier migration's `(text,uuid)` typo should also be corrected or
removed so it doesn't mislead a future reader).

## Not yet done

- These fixes have **not** been written into the migration this session —
  this document is the audit; the fix itself is a scope decision (does it
  belong in PR #26's existing migration, or a separate follow-up migration?)
  that should be confirmed with you before writing more SQL into an
  already-drafted, not-yet-merged security PR.
- HTTP-level reproduction of `get_referral_stats`'s bypass with synthetic
  data (Workstream 3) remains blocked on INFRA-1/INFRA-2/INFRA-3 — the source-
  level finding is `CODE_VERIFIED`, not `PROD_VERIFIED` via exploitation, and
  must keep being described that way until one of those infrastructure walls
  clears.
- Live grant re-verification (to confirm the 2026-08-04 PUBLIC-EXECUTE
  snapshot above is still accurate today) is blocked by INFRA-3 this session.
