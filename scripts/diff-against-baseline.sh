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

node --input-type=module <<JSEOF
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIST = '$DIST';
const baseline = JSON.parse(fs.readFileSync('$BASELINE_FILE','utf8'));

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

for (const [route, expected] of Object.entries(baseline.routes)) {
  const html = readRoute(route);
  if (!html && expected.emitted) {
    diffs.push(\`MISSING: \${route} was in baseline but not emitted by current build\`);
    continue;
  }
  if (!html) continue;

  const hash = bodyHash(html);
  if (hash !== expected.body_sha256) {
    diffs.push(\`BODY_CHANGED: \${route} — body hash changed\\n  was: \${expected.body_sha256}\\n  now: \${hash}\`);
  }
  const title = titleOf(html);
  if (expected.title && title !== expected.title) {
    diffs.push(\`TITLE_CHANGED: \${route}\\n  was: \${expected.title}\\n  now: \${title}\`);
  }
  const desc = descOf(html);
  if (expected.description && desc !== expected.description) {
    diffs.push(\`DESC_CHANGED: \${route}\\n  was: \${expected.description}\\n  now: \${desc}\`);
  }
}

// Check for routes that exist now but weren't in baseline
const { PUBLIC_ROUTES } = await import('./scripts/seo.routes.mjs');
for (const r of PUBLIC_ROUTES) {
  if (!baseline.routes[r.path]) {
    diffs.push(\`NEW_ROUTE: \${r.path} is not in the baseline — run capture-baseline.sh to accept it\`);
  }
}

if (diffs.length > 0) {
  console.error('\\n✗ BASELINE DIFF DETECTED — ' + diffs.length + ' unexpected change(s):\\n');
  diffs.forEach(d => console.error('  • ' + d + '\\n'));
  console.error('To accept these changes: run scripts/capture-baseline.sh and commit baseline/ in the same PR.');
  process.exit(1);
}

console.log('✓ All ' + Object.keys(baseline.routes).length + ' routes match baseline. No unexpected drift.');
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
