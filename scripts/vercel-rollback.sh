#!/usr/bin/env bash
# vercel-rollback.sh
# ------------------
# Promotes the most recent previous READY production deployment back to the
# production alias. Called automatically by the production-deploy workflow when
# the deploy-fidelity gate or smoke tests fail against a freshly-shipped build.
#
# Requires: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
# Optional: ROLLBACK_REASON (printed in the run log + notification)

set -euo pipefail

: "${VERCEL_TOKEN:?VERCEL_TOKEN is required for rollback}"
: "${VERCEL_ORG_ID:?VERCEL_ORG_ID is required for rollback}"
: "${VERCEL_PROJECT_ID:?VERCEL_PROJECT_ID is required for rollback}"
REASON="${ROLLBACK_REASON:-deploy-fidelity gate failed}"

echo "── Vercel auto-rollback ──────────────────────────────────────────"
echo "Reason: $REASON"

# Ensure CLI present
if ! command -v vercel >/dev/null 2>&1; then
  npm install -g vercel@latest >/dev/null 2>&1 || true
fi

export VERCEL_ORG_ID VERCEL_PROJECT_ID

# Pull the last 20 production deployments, READY only, skip the current (top) one.
LIST_JSON=$(vercel ls --token="$VERCEL_TOKEN" --scope="$VERCEL_ORG_ID" \
  --prod --json 2>/dev/null || echo "[]")

# Find the second READY production deployment (the previous good one).
PREV_URL=$(echo "$LIST_JSON" \
  | jq -r '[.[] | select(.state=="READY" and .target=="production")] | .[1].url // empty')

if [[ -z "$PREV_URL" || "$PREV_URL" == "null" ]]; then
  echo "::error title=Rollback failed::No previous READY production deployment found"
  exit 1
fi

echo "Previous good deployment: https://$PREV_URL"
echo "Promoting to production alias…"

if vercel promote "https://$PREV_URL" \
     --token="$VERCEL_TOKEN" \
     --scope="$VERCEL_ORG_ID" \
     --yes 2>&1; then
  echo "✓ Rollback complete — production now serves https://$PREV_URL"
  {
    echo "## ⏪ Auto-rollback executed"
    echo ""
    echo "- **Reason:** $REASON"
    echo "- **Restored:** https://$PREV_URL"
  } >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
  # Export for downstream notification step
  echo "ROLLBACK_URL=https://$PREV_URL" >> "${GITHUB_ENV:-/dev/null}"
  exit 0
else
  echo "::error title=Rollback failed::vercel promote rejected the previous deployment"
  exit 1
fi
