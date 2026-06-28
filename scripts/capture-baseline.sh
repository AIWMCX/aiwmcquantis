#!/usr/bin/env bash
# =============================================================================
# scripts/capture-baseline.sh — regenerate baseline/MANIFEST.json
# =============================================================================
#
# WHEN TO RUN: Only intentionally, when a change is deliberately accepted as
# the new production normal. Never run automatically in CI — that defeats the
# purpose of having a baseline.
#
# After running, commit the updated baseline/ files in the SAME PR as the
# change that caused them. That ceremony proves the change was reviewed.
#
# Usage:
#   bash scripts/capture-baseline.sh
#
# Requires: built dist/ (run `bun run build` first), node/bun, git.
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$REPO_ROOT/dist"
BASELINE="$REPO_ROOT/baseline"

if [[ ! -d "$DIST" ]]; then
  echo "ERROR: dist/ not found. Run 'bun run build' first." >&2
  exit 1
fi

mkdir -p "$BASELINE"

GIT_SHA="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo 'unknown')"

# ---- Count tests -------------------------------------------------------------
TEST_FILES=$(find "$REPO_ROOT/src/__tests__" "$REPO_ROOT/tests" -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l | tr -d ' ')
# Count individual test cases (Deno: Deno.test(...) + vitest: it(/test)(...))
TEST_CASES=$(grep -rE "^\s*(Deno\.test\(|it\(|test\()" \
  "$REPO_ROOT/src/__tests__" "$REPO_ROOT/tests" 2>/dev/null | wc -l | tr -d ' ')

# ---- Read routes from seo.routes.mjs ----------------------------------------
ROUTES_JSON=$(node --input-type=module <<'EOF'
import { PUBLIC_ROUTES } from './scripts/seo.routes.mjs';
process.stdout.write(JSON.stringify(PUBLIC_ROUTES.map(r => r.path)));
EOF
)

# ---- Body hash each route ---------------------------------------------------
echo "Hashing $( echo "$ROUTES_JSON" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');process.stdout.write(String(JSON.parse(d).length));" ) routes..."

node --input-type=module <<JSEOF > "$BASELINE/MANIFEST.json"
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIST = '$DIST';
const routes = $ROUTES_JSON;

function readRoute(p) {
  const f = p === '/' ? path.join(DIST,'index.html') : path.join(DIST, p, 'index.html');
  return fs.existsSync(f) ? fs.readFileSync(f,'utf8') : null;
}
function bodyHash(html) {
  const m = html && html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = (m ? m[1] : '').replace(/[a-f0-9]{8,}\.(js|css)/gi,'').replace(/\s+/g,' ').trim();
  return crypto.createHash('sha256').update(body).digest('hex');
}
function titleOf(html) {
  const m = html && html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1] : '';
}
function descOf(html) {
  const m = html && html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i);
  return m ? m[1] : '';
}
function canonicalOf(html) {
  const m = html && html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i);
  return m ? m[1] : '';
}

const routeManifest = {};
for (const p of routes) {
  const html = readRoute(p);
  routeManifest[p] = {
    body_sha256: html ? bodyHash(html) : null,
    title: html ? titleOf(html) : null,
    description: html ? descOf(html) : null,
    canonical: html ? canonicalOf(html) : null,
    emitted: !!html,
  };
}

const manifest = {
  captured_at: new Date().toISOString(),
  git_sha: '$GIT_SHA',
  test_files: $TEST_FILES,
  test_cases: $TEST_CASES,
  route_count: routes.length,
  routes: routeManifest,
};
process.stdout.write(JSON.stringify(manifest, null, 2) + '\n');
JSEOF

echo "✓ baseline/MANIFEST.json written (sha: ${GIT_SHA:0:12})"

# ---- Golden analysis envelope -----------------------------------------------
# The golden-analysis.json is produced from a REAL analysis run and committed
# manually. It cannot be regenerated automatically because it requires network
# + AI. If it doesn't exist yet, write a schema-only placeholder that documents
# what shape is expected — the diff gate will detect a real run's envelope.

if [[ ! -f "$BASELINE/golden-analysis.json" ]]; then
  cat > "$BASELINE/golden-analysis.json" <<'GOLDEN'
{
  "_note": "Replace this placeholder with a real end-to-end QOC envelope. Run a live analysis and capture the AuditEnvelope, then redact volatile fields (timestamps, ids, cost_usd, duration_ms) to __VOLATILE__. See docs/QOC_CLAUDE.md.",
  "qoc_version": "__VOLATILE__",
  "request_id": "__VOLATILE__",
  "overall_verdict": "PASS",
  "traces": [
    { "stage": "preflight", "verdict": "PASS", "started_at": "__VOLATILE__", "duration_ms": "__VOLATILE__", "cost_usd": 0 },
    { "stage": "dedupe",    "verdict": "PASS", "started_at": "__VOLATILE__", "duration_ms": "__VOLATILE__", "cost_usd": 0 },
    { "stage": "engine",    "verdict": "PASS", "started_at": "__VOLATILE__", "duration_ms": "__VOLATILE__", "cost_usd": 0 },
    { "stage": "narrate",   "verdict": "PASS", "started_at": "__VOLATILE__", "duration_ms": "__VOLATILE__", "cost_usd": "__VOLATILE__" },
    { "stage": "verify",    "verdict": "PASS", "started_at": "__VOLATILE__", "duration_ms": "__VOLATILE__", "cost_usd": "__VOLATILE__" }
  ],
  "total_cost_usd": "__VOLATILE__",
  "total_duration_ms": "__VOLATILE__",
  "report": {
    "engine": { "_shape": "BusinessAnalysisResult with financial_analysis, business_plan, market_analysis, marketing_plan, confidence_score, data_sources, limitations, metadata" },
    "narrative": "__VOLATILE__",
    "variants": [],
    "verification": { "claims": [], "overall": "PASS", "unverified_count": 0 },
    "confidence_band": "high",
    "sector": "saas_software",
    "imputations": []
  }
}
GOLDEN
  echo "✓ baseline/golden-analysis.json placeholder written"
  echo "  → Replace with a real capture when you run a live analysis."
else
  echo "✓ baseline/golden-analysis.json already exists (not overwritten)"
fi

echo ""
echo "✓ Baseline captured. Commit baseline/ in the same PR as the change that triggered it."
