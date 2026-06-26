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

if [[ "$FAIL" -ne 0 ]]; then
  red "QOC STRUCTURAL GATE FAILED — deploy blocked."
  exit 1
fi
grn "QOC structural gate passed."
