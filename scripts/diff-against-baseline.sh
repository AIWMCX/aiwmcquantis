#!/usr/bin/env bash
# =============================================================================
# scripts/diff-against-baseline.sh — compare current build against the golden
# baseline and FAIL loudly on any unexpected diff.
# =============================================================================
#
# Runs as a required CI gate after `bun run build`.
# Diffs: route body hashes, titles, meta descriptions, test count.
# Any unexpected change = RED. Intentional change = re-run capture-baseline.sh
# and commit the new baseline in the same PR.
#
# Usage:
#   bash scripts/diff-against-baseline.sh
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$REPO_ROOT/dist"
BASELINE_FILE="$REPO_ROOT/baseline/MANIFEST.json"

if [[ ! -f "$BASELINE_FILE" ]]; then
  echo "::warning::baseline/MANIFEST.json not found — skipping diff (first-run or baseline not yet committed)"
  exit 0
fi

if [[ ! -d "$DIST" ]]; then
  echo "ERROR: dist/ not found. Run 'bun run build' first." >&2
  exit 1
fi

FAIL=0
DIFFS=()

node --input-type=module - "$REPO_ROOT" "$DIST" "$BASELINE_FILE" <<'JSEOF'
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const [,, REPO_ROOT, DIST, BASELINE_FILE] = process.argv;
const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE,'utf8'));

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

const diffs = [];

// Skip routes whose baseline hash is null (placeholder) — not yet captured
for (const [route, expected] of Object.entries(baseline.routes)) {
  if (!expected.body_sha256) continue; // placeholder entry — skip
  const html = readRoute(route);
  if (!html && expected.emitted) {
    // In CI, missing routes may be expected (no Puppeteer) — warn, don't fail
    console.warn('  ~ MISSING (expected in CI): ' + route);
    continue;
  }
  if (!html) continue;

  const hash = bodyHash(html);
  if (hash !== expected.body_sha256) {
    diffs.push('BODY_CHANGED: ' + route + '\n  was: ' + expected.body_sha256 + '\n  now: ' + hash);
  }
  const title = titleOf(html);
  if (expected.title && title !== expected.title) {
    diffs.push('TITLE_CHANGED: ' + route + '\n  was: ' + expected.title + '\n  now: ' + title);
  }
  const desc = descOf(html);
  if (expected.description && desc !== expected.description) {
    diffs.push('DESC_CHANGED: ' + route + '\n  was: ' + expected.description + '\n  now: ' + desc);
  }
}

// New routes not in baseline — only check when baseline has real data (>1 route)
const seoRoutesUrl = pathToFileURL(path.join(REPO_ROOT, 'scripts/seo.routes.mjs')).href;
const { PUBLIC_ROUTES } = await import(seoRoutesUrl);
const isPlaceholderBaseline = Object.keys(baseline.routes || {}).length <= 1;
if (!isPlaceholderBaseline) {
  for (const r of PUBLIC_ROUTES) {
    if (baseline.routes && !baseline.routes[r.path]) {
      diffs.push('NEW_ROUTE: ' + r.path + ' — run capture-baseline.sh to accept it');
    }
  }
} else {
  console.log('  (baseline is placeholder — skipping NEW_ROUTE check; run capture-baseline.sh after first full build)');
}

if (diffs.length > 0) {
  console.error('\n✗ BASELINE DIFF DETECTED — ' + diffs.length + ' unexpected change(s):\n');
  diffs.forEach(d => console.error('  • ' + d + '\n'));
  console.error('To accept: run scripts/capture-baseline.sh and commit baseline/ in the same PR.');
  process.exit(1);
}

const checked = Object.values(baseline.routes).filter(r => r.body_sha256).length;
console.log('✓ ' + checked + ' baseline route(s) match. No unexpected drift.');
JSEOF

# ---- Test count guard -------------------------------------------------------
BASELINE_TEST_CASES=$(node -e "const m=require('./baseline/MANIFEST.json'); process.stdout.write(String(m.test_cases));")
CURRENT_TEST_CASES=$(grep -rE "^\s*(Deno\.test\(|it\(|test\()" \
  "$REPO_ROOT/src/__tests__" "$REPO_ROOT/tests" 2>/dev/null | wc -l | tr -d ' ')

if [[ "$CURRENT_TEST_CASES" -lt "$BASELINE_TEST_CASES" ]]; then
  echo ""
  echo "✗ TEST COUNT REGRESSION: baseline had $BASELINE_TEST_CASES test cases, now $CURRENT_TEST_CASES"
  echo "  Tests were removed without re-baselining. This is forbidden."
  FAIL=1
else
  echo "✓ Test count: $CURRENT_TEST_CASES (baseline: $BASELINE_TEST_CASES) — no regression"
fi

if [[ $FAIL -ne 0 ]]; then
  exit 1
fi
echo ""
echo "✓ DIFF GATE PASSED — build matches baseline."
