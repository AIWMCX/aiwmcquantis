#!/usr/bin/env bash
# TRACK A -- REAL POSTGREST HTTP-LEVEL VERIFICATION -- 2026-08-14
#
# Proves the fix (or the bug, if run pre-migration) the same way the incident
# that produced PR #26 was originally proven: a real HTTP call to the real
# PostgREST endpoint using only the public anon key, no service-role
# shortcuts. This is the strongest form of evidence available -- it is what
# actually happens when a real anonymous browser calls this RPC.
#
# SAFETY: this script performs ZERO mutations to real data on its own (it
# only calls a read-only RPC, get_referral_stats). But it is still gated
# behind an explicit confirmation before running against ANY project,
# mirroring PR #26's own "unconditional guard, requires explicit
# RLS_TEST_PROJECT_REF, no flag can bypass it" rule (see PR #26 body,
# "Production override removed entirely"). This script has no override flag
# at all, by design.
#
# Usage:
#   SUPABASE_URL="https://<ref>.supabase.co" \
#   SUPABASE_ANON_KEY="<anon-key>" \
#   TARGET_USER_ID="<any-real-auth.users.id-with-a-referral-code>" \
#   TRACK_A_CONFIRM=yes \
#     ./scripts/security/track-a-http-verify.sh

set -euo pipefail

if [[ "${TRACK_A_CONFIRM:-}" != "yes" ]]; then
  echo "Refusing to run: set TRACK_A_CONFIRM=yes to confirm you intend to call" >&2
  echo "the real PostgREST endpoint at SUPABASE_URL as an anonymous caller." >&2
  echo "This is a read-only check, but it does hit a real production API if" >&2
  echo "SUPABASE_URL points at production -- confirm deliberately, not by habit." >&2
  exit 1
fi

: "${SUPABASE_URL:?SUPABASE_URL is required, e.g. https://dmlxrvfyqsakyjomsvdj.supabase.co}"
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY is required (the public anon key -- never the service_role key)}"
: "${TARGET_USER_ID:?TARGET_USER_ID is required: any real auth.users.id to attempt reading as anon}"

echo "== Track A HTTP verification =="
echo "Target:  ${SUPABASE_URL}"
echo "As:      anon (public anon key only, no auth token)"
echo "Reading: get_referral_stats for user ${TARGET_USER_ID}"
echo

http_status=$(curl -s -o /tmp/track-a-response.json -w "%{http_code}" \
  -X POST "${SUPABASE_URL}/rest/v1/rpc/get_referral_stats" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"p_user_id\": \"${TARGET_USER_ID}\"}")

echo "HTTP status: ${http_status}"
echo "Response body:"
cat /tmp/track-a-response.json
echo
echo

if [[ "${http_status}" == "200" ]]; then
  echo "RESULT: FAIL -- anon successfully read this user's referral stats."
  echo "Either the migration has not been applied yet, or it did not close"
  echo "this path. Do not consider Track A done until this returns non-200."
  rm -f /tmp/track-a-response.json
  exit 1
else
  echo "RESULT: PASS -- anon was denied (expected: 'Access denied' inside a"
  echo "Postgres exception, surfaced by PostgREST as a non-200 status)."
  rm -f /tmp/track-a-response.json
  exit 0
fi
