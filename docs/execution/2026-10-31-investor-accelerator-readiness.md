# Investor and accelerator readiness: reasons people don't buy, reasons to buy, and the honest application pack (2026-10-31)

**Purpose:** prepare AIWMC Quantis for Techstars, 2 investment organisations and 3 accelerators. Every number below comes from production (`funnel_events`, `analyses`, `subscriptions`, `mail_messages`, `autoposter_post_platforms`) or the repo, with internal traffic excluded. Where something is a guess it is marked **inferred**. Reviewers check these numbers, and one inflated figure costs more than a small true one.

Related: `2026-10-31-founder-os-review-prep.md` (weekly read-out), `2026-10-30-scope-first-paid-users-and-distribution-moat.md` (plan A–D), `2026-10-30-cold-outreach-zero-replies-diagnosis.md`, `2026-10-24-buy-blockers-register.md`.

---

## 0. Today in production (Sat 2026-10-31, Denver day, read about 16:30 MDT, partial)

| Signal | Today | Note |
|---|---|---|
| External sessions | 9 | Every session saw exactly one page. 0 engaged. |
| ↳ `/vs/*` comparison pages | 4 | Foundra, ChatGPT, AICofounder, Bizplanr, 2–3 min apart (07:29–07:38 UTC), a new session each, no referrer. Probably one crawler (**inferred**). |
| ↳ `/decision-review` (paid offer page) | 2 | 09:27 and 21:32 UTC. Neither clicked through. |
| ↳ home | 2 | |
| ↳ `/demo/consultant-founding-pilot` | 1 | |
| Analyses run / sign-ups / checkouts / paid | 0 / 0 / 0 / 0 | |
| Cold emails sent | 0 | As decided: no sending today. |
| Inbound mail | 3 | All three are DMARC reports (Zoho, Google, Microsoft). 0 human replies. |
| LinkedIn | 2 posts published | 14:00Z "Break-even in month 1. Payback in month 12." (`urn:li:share:7522296346406625281`) and 18:00Z "January cash gap" (`urn:li:share:7522356745654943746`). Neither produced a LinkedIn-referred session today. |
| Founder review (scheduled task) | Started 13:46Z, idle since 13:47Z | Probably waiting on a tool-permission prompt. Open that session in the app to let it finish. |

**Reading:** the pattern of the last 7 weeks holds. A trickle of anonymous single-page visits, interest in the paid offer page, and nothing past the first page.

---

## 1. Traction, stated the way a reviewer will check it

| Metric | Value | Source |
|---|---|---|
| Revenue | **$0** (no payment ever) | `subscriptions`: only one active row, the internal Pro account |
| Paying customers | 0 | same |
| Real external sign-ups | 0 since 2026-09-09. 7 real accounts ever (33 of 40 external accounts are `quantis-e2e.test` fixtures). | `auth.users` join |
| Unique external sessions per 30 days | Jul 182 · Aug 112 · Sep 192 · Oct 213 | `funnel_events`, internal excluded |
| Analyses completed by outside visitors per 30 days | 1 · 4 · 1 · 2 | same |
| Checkout starts | 3 in the last 60 days, 0 completed | same |
| Cold email | 305 sent (Oct), 0 human replies, about 3% bounces | `commercial_followups`, `mail_messages` |
| Product | Live since 2025-05-26 (first commit). 4,098 commits, 77 edge functions, 321 migrations, about 1.9k automated tests. | repo |
| Content | A LinkedIn post a day since Oct 26 (autoposter), 4 comparison pages, 4 free decision tools | `autoposter_post_platforms`, routes |
| Team | Solo founder; AI-assisted engineering | — |

**Plain answer for "traction" fields:** pre-revenue, pre-users. Product live; about 200 visitors a month; first paid offer ($349 review) launched in September with 0 sales. **Do not round any of this up.** Techstars and most accelerators accept pre-revenue companies but score them on *learning velocity* and *evidence of pull*. Today we have velocity and no pull. Section 6 is about getting some pull before submitting.

---

## 2. Why people don't buy (ranked by evidence, not by how easy the fix is)

| # | Reason | Evidence | Confidence |
|---|---|---|---|
| 1 | **Almost nobody with the problem sees the product.** About 7 outside visitors a day, 57–65% with no attribution. A perfect page converts ~0 at this volume. | 30-day sessions; channel table in the review prep | High |
| 2 | **Visitors arrive without context and leave after one page.** About 15% engaged; median session = 1 page; today 9 of 9 one-page sessions. | `funnel_events` | High |
| 3 | **No human attached to the offer.** The buyer is asked to trust an unknown brand with a business decision. There are no customer stories (we have none and won't invent them). The founder card on `/decision-review` is the only "face". | buy-blockers #16 | Medium |
| 4 | **The cold-email ask was wrong for strangers.** "Send me a client decision" asks a CPA for confidential client data, written in our jargon, from `hello@`, with no clickable proof and no DKIM. Result: 0/305. | #398 diagnosis | High on the ask; placement **inferred** (not measured) |
| 5 | **Product category is unclear on first look.** "Test a business decision before you fund it" competes in the visitor's head with ChatGPT, spreadsheets and their accountant. The `/vs/chatgpt` page exists but is not on the path most visitors take. | today's `/vs` hits are probably a crawler, not buyers | Medium (**inferred**) |
| 6 | **Accounts add friction without a reason to exist yet.** All outside activity is anonymous; 0 sign-ups in 7 weeks. | `auth.users` | High that it isn't working; unclear whether it matters before the first sale |
| 7 | **Interest without a next step on the paid page.** `/decision-review` had 13 sessions last week and 2 today; 0 clicked intake. There's no low-commitment step between "read" and "pay $349" (no 15-minute call, no sample run on their own numbers). | `paid_review_view` without `intake_*` events | Medium |

**What is *not* the blocker:** price (nobody reached checkout often enough for price to matter), engine accuracy (fixed in #302/#313/#386–#393), uptime (green deploys).

---

## 3. Reasons to buy (what is actually true and checkable today)

Rule: each reason must point at something a reviewer can open.

| For whom | Reason | Proof they can open |
|---|---|---|
| Small-business owner facing one big decision (hire, raise prices, open a second location) | Runs the decision on their own numbers in about 2 minutes, without an account, and shows **cash floor, break-even month and payback month in one reconciled view**. That's what the common rules of thumb skip ("salary + 20%", "3 months of payroll"). | `/demo/hiring-decision`, price-change and second-location tools |
| Same | Gives a **range, not a single guess**: a seeded 1,000-run simulation of revenue and costs gives a P10/P50/P90 profit band on every report. | Any report (#313) |
| Same | Separates **fact / assumption / unknown** and names the five assumptions that would change the decision. A chat answer doesn't do this. | sample Decision Memo (#318), `/vs/chatgpt` |
| Founder who wants a second opinion before committing money | $349 Founder Decision Review: one decision, intake, base/downside/upside, reconciled cash/break-even/payback, a Decision Memo, a live review and one revision. Fixed price, fixed scope. | `/decision-review` |
| Fractional CFO / FP&A consultant | $499 pilot: 2 client cases in 30 days with consultant-ready memos. Turns 4–6 h of spreadsheet scenarios (vendor-sourced figure, not a survey) into a reviewable artefact. | `/consultant-pilot`, `/demo/consultant-founding-pilot` |
| Anyone burned by AI tools | No invented testimonials, no fake scarcity. Examples are labelled illustrative, the methodology is published with its limitations first, and the math is deterministic and test-guarded (the AI only narrates). | methodology dossier, `/examples` |

**Not yet a reason to buy (don't claim it):** "accurate predictions", "used by N businesses", "saves X hours" (unmeasured), "trusted by CFOs".

---

## 4. Readiness scorecard: how a Techstars-style reviewer will read us

| Criterion | Score | Why | What moves it |
|---|---|---|---|
| Team | 🟡 | Solo founder with high shipping velocity (4k commits, honest audit trail). Solo is a known penalty at Techstars/YC-style programs. | Name an advisor or co-founder candidate. Show the founder's domain story (why *you* care about decision risk). |
| Problem | 🟢 | Real, searched-for pain, with sources: hiring, pricing, expansion regret. | Add 10 customer-discovery calls with quotes (real, with permission). |
| Product | 🟢 | Live, tested, four free tools, paid offer, honest copy. | A 90-second demo video of one real run. |
| Traction | 🔴 | $0, 0 users, 0 replies. | Section 6. This is the only red, and it decides the outcome. |
| Market | 🟡 | Obvious category (SMB financial decisions) but no sized, sourced TAM in our docs. | Bottom-up sizing with sourced inputs (see §5 Q9). Don't use a top-down "$X B market" slide without a source. |
| Distribution insight | 🔴 | Every channel tried is ~0 so far (email 0/305, ads 0 engaged, directories ~0, LinkedIn 2 engaged/14 d). Organic search engages best (3 of 8). | One channel with a measured number: a reply rate, a click-to-run rate. |
| Moat / why now | 🟡 | "Quantis for Claude" (MCP tools on the canonical engine) is a credible why-now: decision tools inside the assistant people already use. Not built yet. | Ship C1 (MCP) and show a run inside Claude. |

---

## 5. Application answer bank (draft: founder edits voice and personal story)

Character counts vary by program; these are the long forms. Cut down per form.

1. **One-liner.** Quantis lets a small-business owner test a hire, a price change or a new location on their own numbers, and see the cash low point, break-even and payback before they commit money.
2. **Problem.** Owners make their largest decisions with rules of thumb ("keep three months of payroll"). These ignore ramp-up time and customer payment delays, which is where the cash runs out. Spreadsheets take hours and a chat answer can't show its assumptions.
3. **Solution.** A deterministic financial engine (tested, not AI-generated math) that reconciles cash, break-even and payback in one view, runs a 1,000-scenario range, and lists which assumptions would flip the decision. AI only writes the explanation. Free tools; $17/$49 subscriptions; $349 done-with-you review; $499 consultant pilot.
4. **Traction.** Say it straight: "Pre-revenue. Product live since May 2025, ~200 visitors a month, first paid offer launched September with no sales yet. In the last 3 weeks we diagnosed why (distribution, not product) and changed [X]; since then [result from §6]." The bracketed part is what §6 must produce.
5. **Why us / why you.** Founder story: needs the founder's own words (why decision risk, what you've seen fail). Plus the evidence of execution speed and honesty: we found and removed our own overstated claims (#316) before anyone asked.
6. **Competition.** ChatGPT and generic AI cofounders (fast, but no reconciled math and no assumption register); business-plan generators (Bizplanr, Foundra: plans, not decisions); spreadsheets and fractional CFOs (accurate, slow and expensive). Quantis sits between: CFO-style reconciliation at chat speed. Comparison pages: `/vs/*`.
7. **Business model.** Free tools → Plus $17/mo, Pro $49/mo; services $349/$499 for revenue and learning now. Long-term: consultants white-label runs for their clients.
8. **Why now.** AI assistants made people expect instant answers, but they don't trust AI with numbers. Tools that plug a tested engine into the assistant (MCP) are possible now and weren't 18 months ago.
9. **Market (method, fill with sourced numbers).** Bottom-up: (number of US employer small businesses, source: SBA Office of Advocacy / Census SUSB) × (share making a hire/price/location decision per year, source needed) × (willingness to pay, from our own calls). **Do not submit until each input has a source.**
10. **Use of funds / the ask.** Founder decides. Suggested framing: "6 months to prove one repeatable channel to 50 paying customers," with distribution as the main line item, not engineering.
11. **Biggest risk.** Distribution: we haven't proven anyone will find and pay for this. Our plan to test it is [§6].

---

## 6. The 21 days before submitting (moves Traction from red to at least yellow)

The aim isn't to look bigger; it's to have **one real, small, true number of pull** to report.

| # | Action | Measured by | Owner |
|---|---|---|---|
| 1 | **20 customer-discovery calls** (owners about to hire, raise prices or expand, found via LinkedIn and local business groups). Ask about their last big decision. Run their numbers live on the call. | Calls held; quotes recorded with permission; "would pay" answers | Founder |
| 2 | **First 3 paid reviews** at the listed $349, offered to the call list. A refund-if-not-useful promise is allowed only if the founder chooses it. | Paid count | Founder (payments) |
| 3 | **Outreach v2** after DKIM and a 5-inbox placement test: from `bogdan@`, plain words, a link to a prefilled run for their client type, CTA "worth a look?". 50 sends. | Reply rate vs 0/305 | Founder approves copy; system sends |
| 4 | **15-minute call link** on `/decision-review` as the step between reading and paying. | `paid_review_view` → call booked | Code (small) + founder |
| 5 | **90-second demo video** of one real run on `/decision-review` and in every application. | Asset exists | Video pipeline |
| 6 | **Ship "Quantis for Claude" (C1)**, the why-now proof. | One run inside Claude, recorded | Code (blocked by the technical freeze; founder's call) |
| 7 | **Measurement:** turn on Vercel Web Analytics and connect Search Console, so the next numbers aren't questioned. | Both live | Founder (dashboards) |

**If after 21 days items 1–3 give zero pull,** that is the finding: apply anyway with the honest learning story ("we tested 4 channels, here is what we learned"). Some programs rate that highly. Or rethink the target buyer before applying.

---

## 7. Programs

The founder named "Techstars + 2 investment organisations + 3 accelerators" but not which ones. Deadlines and terms were **not checked** here; check each program's own site before planning around a date. Send the six names and this pack gets tailored per form (character limits, specific questions, video requirements).

## 8. Founder decisions needed

1. The six program names.
2. Whether to pause the technical freeze for C1 (Quantis for Claude), the strongest why-now asset.
3. The founder story (Q5) in your own words. It can't be written for you.
4. Approve outreach v2 and enable DKIM in IONOS.
5. Whether to offer a refund-if-not-useful on the first 3 reviews.
