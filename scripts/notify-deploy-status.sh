#!/usr/bin/env bash
# notify-deploy-status.sh
# -----------------------
# Posts a deploy-status message to Slack via an incoming webhook.
# No-op (exit 0) when SLACK_DEPLOY_WEBHOOK_URL is not configured so the deploy
# pipeline never fails because of notification plumbing.
#
# Usage:
#   STATUS=success|failure|rolled_back \
#   FAILING_STEP="..." \
#   bash scripts/notify-deploy-status.sh

set -euo pipefail

WEBHOOK="${SLACK_DEPLOY_WEBHOOK_URL:-}"
STATUS="${STATUS:-unknown}"
FAILING_STEP="${FAILING_STEP:-}"
ROLLBACK_URL="${ROLLBACK_URL:-}"
RUN_URL="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"
SHA_SHORT="${GITHUB_SHA:0:7}"
ACTOR="${GITHUB_ACTOR:-ci}"
REF="${GITHUB_REF_NAME:-main}"

if [[ -z "$WEBHOOK" ]]; then
  echo "SLACK_DEPLOY_WEBHOOK_URL not set — skipping notification"
  exit 0
fi

case "$STATUS" in
  success)     EMOJI="✅" ; COLOR="#22c55e" ; HEAD="Production deploy succeeded" ;;
  failure)     EMOJI="❌" ; COLOR="#ef4444" ; HEAD="Production deploy FAILED" ;;
  rolled_back) EMOJI="⏪" ; COLOR="#f59e0b" ; HEAD="Production auto-rolled back" ;;
  *)           EMOJI="ℹ️" ; COLOR="#3b82f6" ; HEAD="Production deploy update" ;;
esac

FIELDS=$(jq -n \
  --arg ref "$REF" \
  --arg sha "$SHA_SHORT" \
  --arg actor "$ACTOR" \
  --arg step "${FAILING_STEP:-—}" \
  --arg rollback "${ROLLBACK_URL:-—}" \
  '[
    {title:"Branch",  value:$ref,   short:true},
    {title:"Commit",  value:$sha,   short:true},
    {title:"Actor",   value:$actor, short:true},
    {title:"Failing step", value:$step, short:true},
    {title:"Rollback target", value:$rollback, short:false}
  ]')

PAYLOAD=$(jq -n \
  --arg head "$EMOJI $HEAD" \
  --arg color "$COLOR" \
  --arg run "$RUN_URL" \
  --argjson fields "$FIELDS" \
  '{
    text: $head,
    attachments: [{
      color: $color,
      fields: $fields,
      actions: [{type:"button", text:"View run", url:$run}]
    }]
  }')

curl -sS -X POST -H "Content-Type: application/json" \
  --data "$PAYLOAD" "$WEBHOOK" >/dev/null && echo "✓ Slack notified ($STATUS)" \
  || echo "::warning title=Notification failed::Slack webhook POST failed"
