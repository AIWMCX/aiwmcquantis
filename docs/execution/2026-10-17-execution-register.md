# Execution Register & Founder Brief — 2026-10-17

Main head: `a843ee42` · Evidence gathered 2026-10-17 from GitHub, the Supabase production DB and live `?health=1` endpoints.
Statuses: historical / planned / in progress / failed / paused / review-ready / merged / deployed / workflow-verified / blocked.
**Merged ≠ deployed ≠ workflow-verified.**

## Founder brief

### 1. Completed and verified in production
- **Production deploy pipeline is green.** It had failed on 5 consecutive runs. The migration ledger is reconciled (291 applied-and-present, 0 git-only, 0 ledger-only). Before the fix, `db push` had been skipping migrations since about Oct 6. Commits: #239 `ba43d9ed`, then `a843ee42`.
- **#246 incident contained.** `calculate-financials` is back to a 410 stub with `verify_jwt=true` (401 without a token, 410 with the anon key). A CI guard rejects any function that is both deployed and in `.deploy-ignore`, and rejects a retired function whose stub is reverted (#249, #252).
- **Publisher safety** (#253, live `afbc00df`):
  - Scheduling uses the correct Denver offset for daylight saving time.
  - LinkedIn publishing times out after 25s.
  - A timeout or 5xx response becomes `unknown`, not `failed`, and is never retried.
- **Business-mail classification** (#254, live `a843ee42`):
  - `*-noreply@` senders are now system mail.
  - The fake "Linkedin" prospect is retired to `not_fit` / do-not-contact, and its message is reclassified.
- **Autoposter generator** (#244, #251, live `b5e74e7a`):
  - Provider order is DeepSeek V4 flash with thinking disabled, then Anthropic, then Lovable.
  - Existing drafts are skipped unless `overwrite` is passed.

### 2. Completed in code, not deployed (review-ready)
- #248 `process-doc-job` owner/worker authorization. The function is excluded from deploy and its table is absent in production, so this is defense in depth.
- #250 template-optimizer R3 validation. The function is excluded.
- #234, #237, #238, #240, #231, #230, #235 — trust/homepage/analytics/consultants/motion. Each is mergeable and awaiting founder approval.
- #222 is conflicting and superseded by #234. Close it.

### 3. Remaining blockers (with evidence)
- **Generation proof is missing.** Post `b2ed2ba9` still has only its LinkedIn row. Facebook and Instagram variants have never been generated in production. This needs one authenticated click.
- **Dashboard gap for `unknown`.** The publisher can write `unknown`, but the Autoposter UI has no badge for it.
- **No content-workspace actions yet** for "record published URL" or reschedule/cancel.
- **legal@ mailbox password is wrong**, so that mailbox does not sync.
- **Terms §4.4 vs Refund Policy conflict** is still unresolved. It is a founder decision.

### 4. Content ready now
- 12 posts (`QUANTIS_4W_20261019`) with LinkedIn copy and 12 PNG assets in `marketing/2026-10-autoposter-4wk/`. These files are untracked locally and not in the repo.
- Post 1, "THE HIRE STARTS BEFORE THE REVENUE.", is **scheduled for LinkedIn Mon Oct 19 16:00 UTC (10:00 Denver)**. It has no image attached.

### 5. Outreach / reply / customer outcomes observed
- Sent by day (Denver): Oct 12 = 33, Oct 13 = 7, Oct 15 = 30, Oct 16 = 35.
  - 105 sent to 73 prospects since Oct 12.
  - 40 of these have no provider message ID (the Oct 12–13 manual/evidenced era).
  - SMTP acceptance is not delivery.
- Outreach is **disabled** (set by the founder account at 2026-10-16 21:21 UTC). 55 messages are queued. Cap and warm-up are unchanged.
- Inbound mail in the last 5 days: 1 bounce, 3 system, **0 human replies**.
- In the last 3 days: 0 new external accounts and 1 external analysis.
- Stripe was not reconciled this session, so there are no verified external payments to report.

### 6. References
#239 `ba43d9ed` · #249 `a21268e0` · #251 `b5e74e7a` · #252 `0bddc939` · #253 `afbc00df` · #254 `a843ee42`

### 7. Founder actions (max 3)
1. On `/admin/autoposter`, post 1, click **Generate all 3**. LinkedIn is preserved; this only fills in Facebook and Instagram. Then decide whether 10:00 Denver on Monday is the time you want.
2. Decide whether to **re-enable outreach** (55 queued) and approve or close the review-ready trust PRs, in this order: #234 → #237 → #231 → #230.
3. Fix the **legal@ password** in IONOS, and choose the wording that resolves Terms §4.4 vs Refund Policy.

### 8. Single next commercial priority
Get the **first real human reply** into a decision conversation. The outbound volume exists; the conversion step does not. Re-enable the authorized sequence, and the moment a reply lands, answer it with one worked example built from that prospect's own numbers.

## Register

| Work item | Customer outcome | Current evidence | Status | Blocker | Next action | Acceptance check |
|---|---|---|---|---|---|---|
| Deploy pipeline ledger | Fixes actually reach prod | Deploy run on `a843ee42` all green; ledger 291/0/0 | workflow-verified | — | Keep ledger in sync on every manual migration | Next deploy green |
| #246 incident / calculate-financials | No wrong NPV math served | 401 no token, 410 anon; CI guard negative-tested | deployed | Inbound logs unavailable | — | Guard fails on re-add |
| Publisher DST + ambiguous | No late or duplicate posts | live `afbc00df`; 12 tests | deployed | Monday publish not yet observed | Observe Oct 19 16:00Z run | Post lands once at the intended time |
| `unknown` badge in UI | Founder sees uncertain publishes | Not built | planned | — | Add status badge + "check platform" text | Badge renders for an `unknown` row |
| Autoposter generation | FB/IG variants exist | Only LinkedIn row on b2ed2ba9 | blocked | Needs founder session | Founder clicks Generate all 3 | 3 rows, LinkedIn text unchanged |
| Content workspace: URL / reschedule | Track what was published | PostAssetPanel + preview live (#241) | in progress | — | Add manual URL + cancel/reschedule | Founder records 1 URL |
| 4-week package | 3 posts ready to export | 12 PNG + copy local, untracked | in progress | Assets not attached in app | Attach images to posts 1–3 | Preview shows image + caption |
| One controlled publication | Proven LinkedIn channel | Post 1 scheduled | planned | Founder-authorized schedule | Verify post ID/URL after Oct 19 | URL recorded, single post |
| Business-mail classification | Real replies only in pipeline | live `a843ee42`; fake prospect retired | deployed | — | — | No system mail creates prospects |
| Outreach sequence | Replies from ICP | 105 sent / 0 human replies; disabled | paused | Founder decision | Re-enable or revise copy | ≥1 human reply classified |
| #248 doc-job auth | No cross-user job access | 6 tests; table absent in prod | review-ready | Founder approval | Merge (no deploy effect) | CI green |
| #250 template-optimizer R3 | Validated LLM output | Test passing; function excluded | review-ready | Founder approval | Merge | CI green |
| Trust PRs #234/#237/#231/#230/#238/#240/#235 | Consistent public claims & prices | Mergeable | review-ready | Founder approval | Merge in stated order | Live pages match canonical prices |
| legal@ mailbox | Legal mail reaches us | Auth failure | blocked | Password | Founder resets | Sync succeeds |
| Terms §4.4 vs Refund | Non-conflicting policy | Conflict documented | blocked | Founder decision | Pick wording | One policy text |
| Leaked-password protection | Account security | Advisor WARN | planned | Dashboard toggle | Founder enables in Auth settings | Advisor clears |
