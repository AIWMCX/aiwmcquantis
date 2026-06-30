#!/usr/bin/env bash
# ============================================================================
# QOC structural integrity gate.
# Fails the build if any required QOC file is missing or if a critical
# architectural invariant has been silently removed (e.g. Lovable regenerating
# the function and dropping the short-circuit, or stubbing the engine call).
# ============================================================================
set -euo pipefail

FAIL=0
red()  { printf "\033[31m%s\033[0m\n" "$1"; }
grn()  { printf "\033[32m%s\033[0m\n" "$1"; }

require_file() {
  if [[ ! -f "$1" ]]; then red "MISSING FILE: $1"; FAIL=1; else grn "ok file  $1"; fi
}

require_contains() {
  # $1 = file, $2 = pattern (grep -E), $3 = human label
  if ! grep -Eq "$2" "$1" 2>/dev/null; then
    red "MISSING INVARIANT [$3] in $1"; FAIL=1
  else
    grn "ok inv   $3"
  fi
}

BASE="supabase/functions/qoc-orchestrate"

require_file "$BASE/qoc/types.ts"
require_file "$BASE/qoc/preflight.ts"
require_file "$BASE/qoc/dedupe.ts"
require_file "$BASE/qoc/stages.ts"
require_file "$BASE/qoc/orchestrator.ts"
require_file "$BASE/adapters.ts"
require_file "$BASE/index.ts"
require_file "tests/qoc.test.ts"
require_file "supabase/migrations/20260623_qoc_audit.sql"

# Invariant 1: preflight must run before the engine in the orchestrator.
require_contains "$BASE/qoc/orchestrator.ts" "preflight\(req" "preflight runs first"

# Invariant 2: short-circuit on preflight failure (engine guarded).
require_contains "$BASE/qoc/orchestrator.ts" "if \(!pf\.result\.ok\)" "preflight short-circuit"

# Invariant 3: dedupe idempotency short-circuit present.
require_contains "$BASE/qoc/orchestrator.ts" "is_duplicate" "dedupe idempotency"

# Invariant 4: engine is CALLED via deps, never reimplemented inline.
require_contains "$BASE/qoc/orchestrator.ts" "deps\.runEngine" "engine called via adapter"

# Invariant 5: the seams must still throw NotWired until connected (prevents
# silently shipping stubs to prod). Once Claude Code wires them, replace these
# lines AND update this check in the same PR — that is the intended ceremony.
require_contains "$BASE/adapters.ts" "class NotWired" "wiring seam guard present"

# Invariant 6: no QOC stage computes a financial figure. Heuristic guard:
# the deterministic engine boundary marker must be present and unmodified.
require_contains "$BASE/qoc/orchestrator.ts" "DETERMINISTIC ENGINE" "engine boundary marker"

# Invariant 7: hard-block patterns exist (safety not stripped).
require_contains "$BASE/qoc/preflight.ts" "INJECTION_PATTERNS" "injection guard present"

# Invariant 8: input length caps enforced in preflight (20k idea / 200 location).
require_contains "$BASE/qoc/preflight.ts" "input_too_long" "input length cap guard present"

# Invariant 9: confidence-gated tier escalation present in types.
require_contains "$BASE/qoc/types.ts" "tierForRequest" "confidence-gated escalation function present"

# Invariant 10: soft throttle mechanism present in dedupe.
require_contains "$BASE/qoc/dedupe.ts" "is_soft_throttle" "soft throttle mechanism present"

# Invariant 11: safePut logs store failures (not silently swallowed).
require_contains "$BASE/qoc/orchestrator.ts" "AUDIT_STORE_FAILURE" "safePut failure logging present"

# Invariant 12: dynamic token caps present in ai-narrator.
require_contains "supabase/functions/ai-narrator/index.ts" "resolveMaxTokens" "dynamic token caps present in narrator"

# ---- Hardening invariants (F-1, F-3/13, F-4, F-5, F-7, F-11, F-14) --------

# Invariant 13: policy module exists (HTTP status + cost ceiling).
require_file "$BASE/qoc/policies.ts"

# Invariant 14: tier mapping corrected — Plus→sonnet, Pro→opus (F-1).
# Line-aware awk: reads the case/return pair that spans two lines.
if awk '
  /case "plus":/ { getline l; if (l ~ /return "sonnet"/) p=1 }
  /case "pro":/  { getline m; if (m ~ /return "opus"/)   q=1 }
  END { exit (p && q) ? 0 : 1 }
' "$BASE/qoc/types.ts"; then
  grn "ok inv   tier mapping plus->sonnet, pro->opus"
else
  red "MISSING INVARIANT [tier mapping plus->sonnet, pro->opus] in $BASE/qoc/types.ts"; FAIL=1
fi

# Invariant 15: fingerprint is per-user + 64-bit (F-7).
require_contains "$BASE/qoc/dedupe.ts" "req\.user_id" "fingerprint keyed by user_id"
require_contains "$BASE/qoc/dedupe.ts" "hash64" "64-bit fingerprint present"

# Invariant 16: injection scan covers all free-text fields (F-3/F-13).
require_contains "$BASE/qoc/preflight.ts" "freeTextScan" "multi-field injection scan present"

# Invariant 17: compliance false-positive guard present (F-4).
require_contains "$BASE/qoc/preflight.ts" "LEGIT_CONTEXT" "compliance false-positive guard present"

# Invariant 18: HTTP status mapping wired into transport (F-5).
require_contains "$BASE/qoc/policies.ts" "httpStatusFor" "status mapping policy present"
require_contains "$BASE/index.ts" "httpStatusFor" "transport uses status mapping"

# Invariant 19: cost ceiling enforced as audit signal (F-11).
require_contains "$BASE/qoc/orchestrator.ts" "withinCeiling" "cost ceiling check present"

if [[ "$FAIL" -ne 0 ]]; then
  red "QOC STRUCTURAL GATE FAILED — deploy blocked."
  exit 1
fi
grn "QOC structural gate passed."
