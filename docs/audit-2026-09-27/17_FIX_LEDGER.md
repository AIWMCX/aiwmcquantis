# Fix ledger — 2026-09-27 → 28

| Fix | Before | Change | After / production proof | State |
|---|---|---|---|---|
| F-01 (#207) | New Decision CTA dead | `new_decision_v1` defaults ON | Deploy 858 success. Click-through not yet observed | DEPLOYED |
| F-02 (#207) | All Commercial Ops agent calls failed on the v2 foundation | Contract accepts provenanced objects | `get_foundation` 200 on v2 at 23:43 from a founder session | VERIFIED LIVE |
| F-03 (#207) | No outbound workflow (campaigns, import, first touch, ready-to-send, replies) | New actions + migration `20260927200000` + admin UI | Columns, RPC and stage check present in prod; function v324 contains the code | VERIFIED LIVE (code + schema); unexercised |
| F-04 (#207/#208) | Overclaiming shell, SEO and UI copy; "1 free analysis" | Canonical wording; FAQ reads from `TIERS` | Live `/` and `/app` HTML fetched after deploy | VERIFIED LIVE (static); React FAQ deployed |
| F-04b (#208) | `anon` could EXECUTE Commercial Ops SECURITY DEFINER RPCs | `REVOKE … FROM PUBLIC, anon` | `has_function_privilege('anon', …)` = false on all 4 | VERIFIED LIVE |
| F-05 | Alt+S → `/app/docs` (404) | → `/docs` | lint/build pass | IN PR |
| F-06 | `/dev/rvce-test` public | `ProtectedRoute requireAdmin` + `robots.txt` `Disallow: /dev/` | lint/build pass | IN PR |
| F-07 | LLM prompt: "Investor-grade", "n=97,500" | Plain-professional wording; grid = modeled cells, not companies | deno check, R3 + business-logic gates pass | IN PR |
| F-08 | Anonymous rate limit failed open (PGRST203) | Drop legacy 7-arg overload (`20260928000000`) | Reproduced `42725 not unique` in prod; rolled-back transaction shows the call resolves to `{"allowed":true,…}`; production left unchanged pending merge | IN PR — verify after merge: 0 new "Anonymous rate limit check failed" log lines |
| F-08 (verified) | — | — | 1 overload in prod; 0 "check failed" logs after 00:25 (69 before); rolled-back probe shows device-limit, IP-limit and duplicate blocks, with new visitors allowed | VERIFIED LIVE |
| F-09 | "Break-even: 0 mo" on loss-making reports; two different break-evens in one view; break-even shown when costs don't reconcile | `src/lib/break-even.ts` resolver used by DecisionSummary, FinancialSummary, AccuracyTransparentResults, ScenarioComparison, document mapper | 8 tests built from real production report 08d75e2a; build and determinism pass | IN PR |
