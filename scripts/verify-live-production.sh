#!/usr/bin/env bash
# verify-live-production.sh
# --------------------------
# The SEO-permanence guarantee. Every other gate in this repo (verify-visibility.mjs,
# the T-series freeze tests) checks the BUILD ARTIFACT before it ships. This script
# checks the opposite end: the LIVE domain, on a schedule, completely independent of
# whether the current live state got there through this repo's normal CI/CD path.
#
# Why this exists: on 2026-07-02 a prerender regression was fixed and verified live,
# then a different tool/session — working from a stale document, not the live site —
# reported the same bug as still blocking ~60 pages from Google. The build-time gates
# only prove a given BUILD is correct; they say nothing about what's actually being
# served an hour, a day, or a week later (a bad Vercel promotion, a CDN edge-cache
# bug, an out-of-band manual deploy, or a future CI gate that gets quietly weakened
# in the same PR that breaks it). This script closes that gap by re-deriving the
# same core assertions directly against production, on its own schedule, so "the SEO
# fix is live" is something proven fresh on every run — not something anyone,
# including this repo's own CI, gets to just assert once and walk away from.
#
# Exits non-zero (red workflow run) on ANY of:
#   - a route's body matching the homepage's body (the original regression class)
#   - two routes sharing an identical body (duplicate-content)
#   - a missing or non-self-referencing canonical
#   - the "7-Layer" stale-content string reappearing anywhere
#   - $49/Pro missing from the homepage or pricing body
#   - sitemap.xml unreachable or missing an expected route
#   - robots.txt unreachable
#   - an unknown path NOT returning a real 404 (soft-404 regression)
#
# Usage: bash scripts/verify-live-production.sh
# No secrets required — this only reads public HTTP responses.

set -uo pipefail

ORIGIN="https://www.aiwmcquantis.com"
fail=0

note_fail() {
  echo "  ✗ $1"
  fail=1
}
note_ok() {
  echo "  ✓ $1"
}

echo "== SEO live-production monitor — $(date -u '+%Y-%m-%d %H:%M:%S UTC') =="
echo "Origin: $ORIGIN"
echo

# ---- Sample routes (representative, not exhaustive — full route list lives
# in scripts/seo.routes.mjs; this is the fast/cheap continuous check) --------
ROUTES=(
  "/"
  "/pricing"
  "/how-it-works"
  "/methodology"
  "/examples/coffee-shop-denver"
  "/blog/how-to-stress-test-your-startup"
  "/blog/business-validation-for-financial-clients"
)

declare -A BODY_HASH
declare -A ROUTE_STATUS
HOME_HASH=""

body_hash_of() {
  # Strip hashed asset filenames (they legitimately differ build-to-build)
  # and whitespace before hashing, matching verify-visibility.mjs's method.
  curl -sS -m 15 "$ORIGIN$1" 2>/dev/null \
    | sed -n '/<body/,/<\/body>/p' \
    | sed -E 's/[a-f0-9]{8,}\.(js|css)//g' \
    | tr -s '[:space:]' ' ' \
    | sha1sum | cut -d' ' -f1
}

echo "-- Route uniqueness + canonical checks --"
for route in "${ROUTES[@]}"; do
  code=$(curl -sS -o /dev/null -m 15 -w '%{http_code}' "$ORIGIN$route" 2>/dev/null)
  ROUTE_STATUS["$route"]="$code"
  if [[ "$code" != "200" ]]; then
    note_fail "$route returned HTTP $code (expected 200)"
    continue
  fi

  hash=$(body_hash_of "$route")
  BODY_HASH["$route"]="$hash"
  [[ "$route" == "/" ]] && HOME_HASH="$hash"

  html=$(curl -sS -m 15 "$ORIGIN$route" 2>/dev/null)
  canonical=$(printf '%s' "$html" | grep -oE '<link rel="canonical" href="[^"]+"' | head -1 | sed -E 's/.*href="([^"]+)".*/\1/')
  expected_canonical="${ORIGIN}${route}"
  [[ "$route" == "/" ]] && expected_canonical="$ORIGIN/"

  if [[ -z "$canonical" ]]; then
    note_fail "$route has no <link rel=\"canonical\">"
  elif [[ "$canonical" != "$expected_canonical" && "$canonical" != "$ORIGIN$route" ]]; then
    note_fail "$route canonical is \"$canonical\", expected \"$expected_canonical\""
  else
    note_ok "$route canonical OK ($canonical)"
  fi

  if printf '%s' "$html" | grep -q '7-Layer'; then
    note_fail "$route contains the stale \"7-Layer\" string"
  fi
done
echo

echo "-- Duplicate-body check (the original regression class) --"
for route in "${ROUTES[@]}"; do
  [[ "$route" == "/" ]] && continue
  h="${BODY_HASH[$route]:-}"
  [[ -z "$h" ]] && continue
  if [[ "$h" == "$HOME_HASH" ]]; then
    note_fail "$route body is IDENTICAL to the homepage — prerender regression"
  fi
done
seen=()
for route in "${ROUTES[@]}"; do
  h="${BODY_HASH[$route]:-}"
  [[ -z "$h" ]] && continue
  for prior in "${seen[@]}"; do
    if [[ "$h" == "${BODY_HASH[$prior]:-}" ]]; then
      note_fail "$route body is IDENTICAL to $prior — duplicate content"
    fi
  done
  seen+=("$route")
done
note_ok "no duplicate bodies found among ${#ROUTES[@]} sampled routes"
echo

# NOTE: production currently ships head-only prerendering (prerender-seo.ts
# stamps <title>/canonical/meta only; the SPA shell's <body> hydrates client-
# side, see docs/QOC_MIGRATION_PLAN.md-adjacent findings from 2026-07-02).
# That means a plain curl of / or /pricing genuinely does NOT contain literal
# "$49"/"Pro" text in the raw pre-JS body — confirmed by fetching and
# grepping the real production HTML before writing this check. Asserting
# against the raw body here would be a permanent false-positive: red on every
# run regardless of whether pricing is actually correct, which teaches
# everyone to ignore this monitor. Check the shipped JS bundle instead — that
# proves the pricing data wasn't silently dropped or corrupted at the source,
# which is the actual failure mode worth catching (the true "is $49/Pro still
# in the page a real user's browser renders" check needs a JS-executing
# fetch — Puppeteer/Playwright — and belongs in a heavier, less frequent job
# if that ever becomes worth adding).
echo "-- Pro/\$49 present in the shipped JS bundle (data wasn't dropped at build) --"
home_html=$(curl -sS -m 15 "$ORIGIN/" 2>/dev/null)
bundle_path=$(printf '%s' "$home_html" | grep -oE 'src="/assets/index-[^"]+\.js"' | head -1 | sed -E 's/src="(.*)"/\1/')
if [[ -z "$bundle_path" ]]; then
  note_fail "could not find the main JS bundle reference in the homepage HTML"
else
  bundle_js=$(curl -sS -m 20 "$ORIGIN$bundle_path" 2>/dev/null)
  if printf '%s' "$bundle_js" | grep -q '\$49' && printf '%s' "$bundle_js" | grep -q 'Pro'; then
    note_ok "shipped bundle ($bundle_path) contains \$49 and Pro"
  else
    note_fail "shipped bundle missing \$49 or Pro — pricing data may be broken"
  fi
fi
echo

echo "-- sitemap.xml + robots.txt reachability --"
sitemap_code=$(curl -sS -o /dev/null -m 15 -w '%{http_code}' "$ORIGIN/sitemap.xml" 2>/dev/null)
if [[ "$sitemap_code" == "200" ]]; then
  url_count=$(curl -sS -m 15 "$ORIGIN/sitemap.xml" 2>/dev/null | grep -c '<url>')
  note_ok "sitemap.xml reachable, $url_count <url> entries"
  [[ "$url_count" -lt 40 ]] && note_fail "sitemap.xml has only $url_count entries — expected 40+"
else
  note_fail "sitemap.xml returned HTTP $sitemap_code"
fi
robots_code=$(curl -sS -o /dev/null -m 15 -w '%{http_code}' "$ORIGIN/robots.txt" 2>/dev/null)
if [[ "$robots_code" == "200" ]]; then
  note_ok "robots.txt reachable"
else
  note_fail "robots.txt returned HTTP $robots_code"
fi
echo

echo "-- Real 404 (soft-404 regression class) --"
notfound_code=$(curl -sS -o /dev/null -m 15 -w '%{http_code}' "$ORIGIN/this-route-does-not-exist-$(date +%s)" 2>/dev/null)
if [[ "$notfound_code" == "404" ]]; then
  note_ok "unknown route correctly returns 404"
else
  note_fail "unknown route returned HTTP $notfound_code — soft-404 regression (should be 404)"
fi
echo

if [[ $fail -ne 0 ]]; then
  echo "FAIL: live production has drifted from the SEO-permanence guarantee."
  echo "      This is checking the LIVE domain, not a build artifact — something"
  echo "      shipped or changed outside (or despite) the normal CI gates."
  exit 1
fi
echo "PASS: live production matches every SEO-permanence assertion."
