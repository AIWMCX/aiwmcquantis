-- P0 Security Incident, 2026-08-03 — raw policy + grant evidence.
-- Run against project dmlxrvfyqsakyjomsvdj. Output captured below each query,
-- verbatim from the live database at the time of this investigation.
-- No customer data is exposed by these queries — they read metadata only
-- (policy definitions, role/table grants), never row content.

-- ============================================================
-- A. Policies
-- ============================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'usage_counters',
    'analysis_attempts',
    'invoices',
    'leads',
    'shared_reports',
    'export_jobs',
    'quote_gen_usage',
    'referral_codes',
    'analysis_cases',
    'funnel_events'
  )
ORDER BY tablename, policyname;

/*
RESULT (captured 2026-08-03, all 10 policies — every one is PERMISSIVE,
roles={public}, cmd=ALL, qual=true, with_check=true):

tablename           | policyname             | permissive | roles     | cmd | qual | with_check
--------------------+------------------------+------------+-----------+-----+------+-----------
analysis_attempts   | analysis_attempts_self | PERMISSIVE | {public}  | ALL | true | true
analysis_cases      | analysis_cases_svc     | PERMISSIVE | {public}  | ALL | true | true
export_jobs         | export_jobs_svc        | PERMISSIVE | {public}  | ALL | true | true
funnel_events       | funnel_events_svc      | PERMISSIVE | {public}  | ALL | true | true
invoices            | invoices_svc           | PERMISSIVE | {public}  | ALL | true | true
leads               | leads_svc              | PERMISSIVE | {public}  | ALL | true | true
quote_gen_usage     | quote_gen_usage_svc    | PERMISSIVE | {public}  | ALL | true | true
referral_codes      | referral_codes_svc     | PERMISSIVE | {public}  | ALL | true | true
shared_reports      | shared_reports_svc     | PERMISSIVE | {public}  | ALL | true | true
usage_counters      | usage_counters_self    | PERMISSIVE | {public}  | ALL | true | true

Note: `roles={public}` is the Postgres RLS "no restriction" wildcard — it is
NOT the literal name of a role scoped to service accounts. It applies to
every role that reaches the table, including `anon` and `authenticated`.
The `_svc`/`_self` naming shows clear original intent (service-role-only, or
owner-only) that was never encoded into the policy's actual USING/WITH CHECK
clause or role list.
*/

-- ============================================================
-- B. Grants
-- ============================================================

SELECT
  table_schema,
  table_name,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'usage_counters',
    'analysis_attempts',
    'invoices',
    'leads',
    'shared_reports',
    'export_jobs',
    'quote_gen_usage',
    'referral_codes',
    'analysis_cases',
    'funnel_events'
  )
  AND grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
ORDER BY table_name, grantee, privilege_type;

/*
RESULT (captured 2026-08-03): for every one of the 10 tables, both `anon`
and `authenticated` hold the full privilege set:

  DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

(Full per-table breakdown for usage_counters/analysis_attempts and the 8
_svc-named tables verified directly this session — identical pattern across
all 10. No table in this list has a narrower grant.)

is_grantable was 'NO' for anon/authenticated in all rows checked (they
cannot re-grant to others), which does not reduce the severity of direct
CRUD access.
*/

-- ============================================================
-- C. Effective-access proof (see 02_EFFECTIVE_ACCESS_RESULTS.md for the
-- full transcript) — summary of what was actually reproduced via the real
-- PostgREST REST API using ONLY the public anon key, no bearer token:
-- ============================================================

/*
1. INSERT public.usage_counters (identity_key, tier, analyses_used)
   VALUES ('__CANARY_SECURITY_TEST_2026-08-03__', 'free', 1)
   -- via service-role SQL, to create a synthetic, clearly-labeled test row.
   -- Returned id: c28ee5b1-0af0-48ad-86b3-7cb43aed942f

2. GET  {base}/usage_counters?identity_key=eq.__CANARY_SECURITY_TEST_2026-08-03__
   Headers: apikey: <anon>  (no Authorization header)
   RESULT: 200, full row returned.

3. PATCH {base}/usage_counters?identity_key=eq.__CANARY_SECURITY_TEST_2026-08-03__
   Body: {"analyses_used": 9999}
   Headers: apikey: <anon>
   RESULT: 200, row updated, analyses_used now 9999.

4. GET {base}/invoices?select=id&limit=3
   Headers: apikey: <anon>
   RESULT: 200, 1 real invoice id returned (content not read, id only).

5. GET {base}/leads?select=id&limit=3
   Headers: apikey: <anon>
   RESULT: 200, 2 real lead ids returned (content not read, id only).

6. DELETE {base}/usage_counters?identity_key=eq.__CANARY_SECURITY_TEST_2026-08-03__
   Headers: apikey: <anon>
   RESULT: 200, row deleted -- this also served as canary cleanup.
   Zero test rows remain in production after this investigation.
*/
