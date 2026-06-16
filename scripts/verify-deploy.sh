#!/usr/bin/env bash
# verify-deploy.sh
# ----------------
# Curls every Edge Function's `/?health=1` endpoint and asserts that the live
# `version` matches the `FUNCTION_VERSION` constant in the committed source.
#
# Exits non-zero on ANY mismatch, missing health endpoint, or HTTP error.
# This is the gate that makes "green CI" equal "the new code is actually live."
#
# Usage:
#   PROJECT_REF=xxx SUPABASE_ANON_KEY=eyJ... bash scripts/verify-deploy.sh
#
# Optional:
#   FUNCTIONS="stripe-webhook analyze-business"  # override default list

set -euo pipefail

PROJECT_REF="${PROJECT_REF:-${VITE_SUPABASE_PROJECT_ID:-}}"
ANON_KEY="${SUPABASE_ANON_KEY:-${VITE_SUPABASE_PUBLISHABLE_KEY:-}}"

if [[ -z "$PROJECT_REF" ]]; then
  echo "ERROR: PROJECT_REF (or VITE_SUPABASE_PROJECT_ID) is not set" >&2
  exit 2
fi
if [[ -z "$ANON_KEY" ]]; then
  echo "ERROR: SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) is not set" >&2
  exit 2
fi

BASE_URL="https://${PROJECT_REF}.supabase.co/functions/v1"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FN_DIR="${REPO_ROOT}/supabase/functions"

# Default: every function whose source contains a FUNCTION_VERSION constant.
# Override by exporting FUNCTIONS="a b c".
if [[ -n "${FUNCTIONS:-}" ]]; then
  read -r -a FN_LIST <<< "$FUNCTIONS"
else
  FN_LIST=()
  while IFS= read -r path; do
    fn_name="$(basename "$(dirname "$path")")"
    FN_LIST+=("$fn_name")
  done < <(grep -lE "^(export )?const FUNCTION_VERSION" "$FN_DIR"/*/index.ts 2>/dev/null | sort)
fi

if [[ ${#FN_LIST[@]} -eq 0 ]]; then
  echo "WARN: no functions found with FUNCTION_VERSION constant — nothing to verify"
  exit 0
fi

printf '%-35s %-15s %-15s %s\n' "FUNCTION" "SOURCE_VERSION" "LIVE_VERSION" "STATUS"
printf '%s\n' "------------------------------------------------------------------------------------"

fail=0
for fn in "${FN_LIST[@]}"; do
  src_file="${FN_DIR}/${fn}/index.ts"
  if [[ ! -f "$src_file" ]]; then
    printf '%-35s %-15s %-15s %s\n' "$fn" "-" "-" "MISSING_SOURCE"
    fail=1; continue
  fi
  src_version="$(grep -E "^(export )?const FUNCTION_VERSION" "$src_file" \
    | head -1 | sed -E "s/.*['\"]([^'\"]+)['\"].*/\1/")"
  if [[ -z "$src_version" ]]; then
    printf '%-35s %-15s %-15s %s\n' "$fn" "-" "-" "NO_VERSION_CONST"
    fail=1; continue
  fi

  # Hit live endpoint (tolerate non-2xx / non-JSON; never abort the loop)
  resp="$(curl -sS -m 10 -H "apikey: ${ANON_KEY}" \
    "${BASE_URL}/${fn}?health=1" 2>/dev/null || echo '{}')"
  live_version="$(printf '%s' "$resp" | grep -oE '"version":"[^"]+"' 2>/dev/null | head -1 | sed -E 's/.*"version":"([^"]+)".*/\1/' || true)"
  live_deployed_at="$(printf '%s' "$resp" | grep -oE '"deployed_at":"[^"]+"' 2>/dev/null | head -1 | sed -E 's/.*"deployed_at":"([^"]+)".*/\1/' || true)"
  live_commit_sha="$(printf '%s' "$resp" | grep -oE '"commit_sha":"[^"]*"' 2>/dev/null | head -1 | sed -E 's/.*"commit_sha":"([^"]*)".*/\1/' || true)"

  if [[ -z "$live_version" ]]; then
    printf '%-35s %-15s %-15s %s\n' "$fn" "$src_version" "-" "NO_HEALTH_ENDPOINT"
    fail=1; continue
  fi

  # deployed_at must be an ISO-8601 timestamp (basic shape check)
  if ! [[ "$live_deployed_at" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T ]]; then
    printf '%-35s %-15s %-15s %s\n' "$fn" "$src_version" "$live_version" "BAD_DEPLOYED_AT"
    fail=1; continue
  fi

  if [[ "$src_version" == "$live_version" ]]; then
    sha_tag="${live_commit_sha:0:7}"
    [[ -z "$sha_tag" ]] && sha_tag="(no-sha)"
    printf '%-35s %-15s %-15s %s %s\n' "$fn" "$src_version" "$live_version" "OK" "$sha_tag"
  else
    printf '%-35s %-15s %-15s %s\n' "$fn" "$src_version" "$live_version" "STALE"
    fail=1
  fi

done

echo
if [[ $fail -ne 0 ]]; then
  echo "FAIL: one or more functions are stale or missing /health endpoint."
  echo "      Edge function code is not what the source repo says it is."
  exit 1
fi
echo "PASS: all live function versions match source."
