#!/usr/bin/env bash
# preflight-secrets.sh
# --------------------
# Validates that every secret required for a full Vercel production deploy is
# present in the environment BEFORE any build, push, or deploy step runs.
#
# Exits non-zero on the FIRST missing/empty variable with a clear remediation
# message naming where to add the secret (GitHub Settings → Secrets/Actions, or
# Vercel Dashboard → Project → Settings → Environment Variables).
#
# Usage:
#   bash scripts/preflight-secrets.sh           # all groups
#   bash scripts/preflight-secrets.sh vercel    # vercel only
#   bash scripts/preflight-secrets.sh supabase  # supabase only
#
# Designed to run inside the production-deploy GitHub Action.

set -euo pipefail

GROUP="${1:-all}"
MISSING=()

# name | where_to_add | why
declare -a REQUIRED=(
  # ── Vercel CLI deploy ────────────────────────────────────────────────
  "VERCEL_TOKEN|GitHub → Settings → Secrets → Actions → New repository secret|Personal/Team token from vercel.com/account/tokens. Required for CLI deploy + rollback."
  "VERCEL_ORG_ID|GitHub → Settings → Secrets → Actions|Run \`vercel link\` locally, then copy .vercel/project.json → orgId."
  "VERCEL_PROJECT_ID|GitHub → Settings → Secrets → Actions|Run \`vercel link\` locally, then copy .vercel/project.json → projectId."
  # ── Vite build (Supabase client) ─────────────────────────────────────
  "VITE_SUPABASE_URL|GitHub → Settings → Secrets → Actions|Supabase project URL. Used by the Vite client bundle."
  "VITE_SUPABASE_PUBLISHABLE_KEY|GitHub → Settings → Secrets → Actions|Supabase anon/publishable key."
  "VITE_SUPABASE_PROJECT_ID|GitHub → Settings → Secrets → Actions|Supabase project ref (also used by edge-function deploy)."
  # ── Supabase edge functions / migrations ─────────────────────────────
  "SUPABASE_ACCESS_TOKEN|GitHub → Settings → Secrets → Actions|Personal access token from supabase.com/dashboard/account/tokens. Required for migrations + edge-function deploy."
  "SUPABASE_DB_PASSWORD|GitHub → Settings → Secrets → Actions|Database password (Supabase Dashboard → Settings → Database). Required for \`supabase db push\`."
  # ── Stripe runtime secrets (synced into Supabase) ────────────────────
  "STRIPE_SECRET_KEY|GitHub → Settings → Secrets → Actions|sk_live_… key from dashboard.stripe.com/apikeys."
  "STRIPE_WEBHOOK_SECRET|GitHub → Settings → Secrets → Actions|whsec_… from the Stripe webhook endpoint config."
  # ── AI runtime ───────────────────────────────────────────────────────
  "DEEPSEEK_API_KEY|GitHub → Settings → Secrets → Actions|DeepSeek API key. Primary LLM for RVCE/analysis."
)

# Optional but recommended — warn only.
declare -a OPTIONAL=(
  "ANTHROPIC_API_KEY|Claude fallback when DeepSeek fails"
  "TAVILY_API_KEY|RVCE web-search enhancement"
  "STRIPE_PRO_MONTHLY_PRICE_ID|Pro monthly checkout price ID"
  "STRIPE_PRO_ANNUAL_PRICE_ID|Pro annual checkout price ID"
  "SLACK_DEPLOY_WEBHOOK_URL|Slack incoming webhook for deploy notifications"
)

want_group() {
  case "$GROUP" in
    all) return 0 ;;
    vercel)   [[ "$1" == VERCEL_* || "$1" == VITE_* ]] ;;
    supabase) [[ "$1" == SUPABASE_* || "$1" == VITE_SUPABASE_* ]] ;;
    *) return 0 ;;
  esac
}

echo "── Secrets preflight (${GROUP}) ──────────────────────────────────"

for spec in "${REQUIRED[@]}"; do
  IFS='|' read -r name where why <<<"$spec"
  want_group "$name" || continue
  if [[ -z "${!name:-}" ]]; then
    MISSING+=("$name|$where|$why")
    echo "  ✗ $name — MISSING"
  else
    # Length only; never echo the value itself.
    val="${!name}"
    echo "  ✓ $name (set, ${#val} chars)"
    unset val
  fi
done

echo ""
echo "── Optional secrets ──────────────────────────────────────────────"
for spec in "${OPTIONAL[@]}"; do
  IFS='|' read -r name why <<<"$spec"
  if [[ -z "${!name:-}" ]]; then
    echo "  · $name — not set ($why)"
  else
    echo "  ✓ $name (set)"
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo ""
  echo "::error title=Secrets preflight failed::${#MISSING[@]} required secret(s) missing"
  echo ""
  echo "REMEDIATION — add each missing secret then re-run the workflow:"
  echo ""
  for entry in "${MISSING[@]}"; do
    IFS='|' read -r name where why <<<"$entry"
    echo "  • $name"
    echo "      Where: $where"
    echo "      Why:   $why"
    echo ""
  done
  exit 1
fi

echo ""
echo "✓ All required secrets present"
