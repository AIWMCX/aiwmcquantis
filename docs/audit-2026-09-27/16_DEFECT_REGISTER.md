# Defect register — audit 2026-09-27

Severity: P0 blocks sale, use, trust or security · P1 blocks activation or professional use · P2 polish/debt · P3 later.

| ID | Sev | Subsystem | Finding | Evidence | Status |
|---|---|---|---|---|---|
| D-01 | P0 | Dashboard | "+ New Decision" redirected back to `/app` (flag never set in prod) | Vercel env; 0 `new_decision_viewed` ever | FIXED #207, deployed. Click-through UNVERIFIED |
| D-02 | P0 | Commercial Ops | Every agent call failed on the Foundation v2 shape | old schema rejects the prod row | VERIFIED LIVE (founder `get_foundation` 200 on v2, 23:43) |
| D-03 | P0 | Truth | Page shell / SEO / FAQ said "97,500 benchmark data points", "every number sourced", "1 free analysis" | live HTML before/after | VERIFIED LIVE (static); React FAQ deployed |
| D-04 | P1 | Security/cost | Anonymous rate limit failed open (PGRST203 ambiguous overload) → unlimited anonymous AI analyses without a fingerprint | prod logs all day; reproduced 42725 in SQL | FIXED (F-08, open PR) — needs merge |
| D-05 | P1 | Truth | Analysis system prompt instructed "Investor-grade" and "n=97,500" source citation; 1 stored report carries it | prompt source; `analyses` scan | FIXED (F-07, open PR) — needs merge |
| D-06 | P1 | Security | `/dev/rvce-test` panel publicly routed | `App.tsx` | FIXED (F-06, open PR) |
| D-07 | P0 (commercial) | Billing | Self-serve checkout never completed by an external customer; last completion 2026-07-02 | `funnel_events`, `stripe_webhook_events` | BLOCKED — needs one real test purchase |
| D-08 | P1 | Activation | 0 external users reached result_viewed / driver_inspected / next_action in 30d | admin-excluded funnel | UNVERIFIED cause — needs observed sessions |
| D-09 | P1 | Growth | 685/692 sessions (90d) without UTM; content and outreach cannot be attributed | `funnel_events.utm_source` | OPEN (process fix: UTM every link) |
| D-10 | P1 | Commercial Ops | 0 campaigns / drafts / agent runs; the AI path has never executed in prod | DB counts | BLOCKED — founder smoke test |
| D-11 | P1 | Content OS | Autoposter has 0 platform credentials; cannot publish anywhere | `autoposter_credentials` = 0 | OPEN (owner: connect LinkedIn or stop the cron) |
| D-12 | P2 | Clients | No Clients list page / nav destination | route registry | OPEN |
| D-13 | P2 | Entitlements | Two parallel entitlement systems (`entitlements.ts` vs `tier-gate.ts`) | source | OPEN (consolidate later) |
| D-14 | P2 | Billing ops | Weekly Stripe reconciliation checks 0 subscriptions | `stripe_reconciliation_runs` | OPEN |
| D-15 | P2 | Analytics | No internal-traffic flag on `funnel_events`; `verdict_viewed` overlaps `result_viewed` | schema | OPEN |
| D-16 | P2 | Security | Leaked-password protection off | Supabase advisor | BLOCKED — owner toggle |
| D-17 | P3 | Ops | `publish-due-posts` no-op every minute; warm-ups produce ~290 400s/day in logs | edge logs | OPEN |
| D-18 | P3 | RLS | Stale "API keys if Plus" insert policy (the API still enforces Pro) | `pg_policies` | OPEN |
| D-19 | P3 | Audit trail | Manual comp logged as "auto-provisioned by stripe webhook" | `subscription_audit_log` | OPEN |
| D-20 | P3 | UX | Alt+S shortcut → dead `/app/docs` | `useKeyboardShortcuts.ts` | FIXED (F-05, open PR) |
| D-21 | — | Observability | Sentry/PostHog initialization not verified (read blocked by session permissions) | — | UNVERIFIED |

## Financial reconciliation (2026-09-28, 116 reports from the last 90 days, recomputed independently)

| ID | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| D-22 | P0 | `breakeven_months = 0` is the engine's "never" sentinel (`financial-analysis-shape.ts:262`), but the Decision Room, FinancialSummary, ScenarioComparison and the report mapper rendered it as "0 mo" for loss-making businesses | 107/116 reports; 11/11 since 08-31 | FIXED (display, F-09) |
| D-23 | P0 | Two break-even figures in one result view: legacy `breakeven_revenue` (benchmark COGS %, CM floor 1%) vs CVP (actual unit economics). Example: $36,282 vs $23,945 | 66/73 reports with both; 11/11 since 08-31 | FIXED (display prefers CVP, F-09) |
| D-24 | P0 | **Engine:** when a user enters total monthly costs, `financial-calculator.ts:371–381` keeps the benchmark fixed costs and COGS and reconciles only marketing (clamped ≥ 0). Profit follows the user total, while break-even/CVP/DOL follow the unscaled benchmark costs; the expense table no longer sums (items $12,785 vs total $4,650). No break-even in those reports is reliable. | base scenario revenue − VC − FC ≠ profit in 57/116; 8/11 since 08-31 | FIXED in engine (F-10, founder decision "Option A"): the user total wins; COGS stays at the benchmark share of revenue; salaries/rent/utilities/other/marketing scale to fill the remainder. Replay of 08d75e2a: items sum to $4,650, legacy BE $8,381 = CVP $8,380.84 (56 units). Reports stored before the fix keep the F-09 "Needs review" guard. |
| D-25 | P1 | Breakeven "months" for profitable cases is investment payback capped at 24 (conflates break-even with payback) | engine source | OPEN (engine) |
| D-26 | — | Scenario profit ordering (pessimistic > base) | 43 reports, all before 08-10; 0 since | STALE (already fixed in engine) |
| D-27 | P2 | `payback_status` missing on 105 loss-making reports (only 2 carry NOT_APPLICABLE); payback column uses 999 | — | OPEN |

Passed: profit column = base scenario (0 mismatches); payback and investment columns = JSON (0); revenue scenarios ordered (116/116); gross margins in range; MRR = units × price; CVP internally consistent.

## Business mailboxes (2026-09-28)

| ID | Sev | Finding | Evidence | Status |
|---|---|---|---|---|
| D-28 | P0 (commercial) | The business mailboxes the founder uses (Outlook → IONOS Mail Basic) don't receive mail: MX points to Zoho. Replies to outreach sent from hello@/market@ go to Zoho and never reach Outlook or Quantis. Sending passes DMARC (SPF authorizes IONOS). | Live DNS via DoH: MX mx.zoho.com ×3; SPF includes IONOS; founder screenshot 2026-09-28 shows IONOS 'Mail Basic' mailboxes in Outlook | BLOCKED — founder DNS change: MX → mx00/mx01.ionos.com (runbook). The paced sender refuses to send until it passes. |
| D-29 | P1 | support@/legal@ mail had no path into Quantis. hello@/market@ replies, opt-outs and bounces were not linked to prospects. Outreach was copy/paste plus "I sent it", with no delivery evidence. | code + schema | FIXED in code (F-11); needs Zoho secrets |
