# Scope of work: first paid users, free users, a real moat (2026-10-30)

Founder brief (night of 2026-10-30): 8 months, $0 MRR, 0 paid users. Don't lie to ourselves. Check SEO, sales and activation, financial accuracy and distribution from the outside: is each one better than before, or the same as having nothing? Then add a distribution moat:
- reels and our own UGC ads;
- AI-montazher;
- the komanda-legend and Instagram-analyst prompts;
- the getripping.com model;
- the screen-2/3 market-research prompt, personalized and run for real;
- hattip-linkedin-os plus the LinkedIn autoposter.

Everything below is measured unless marked **inferred**. Metrics come from `admin_traffic_sources` (external, non-internal sessions) and production tables, read 2026-10-30 ~11:00Z.

## 1. The honest baseline

### Traffic and funnel, by 30-day window (unique external sessions)

| Window | Sessions | Engaged | Analyses done | Free signups | Checkout starts | Paid |
|---|---|---|---|---|---|---|
| Jul 2 – Aug 1 | 182 | 48 | 1 | 5 | 0 | 0 |
| Aug 1 – Aug 31 | 112 | 39 | 4 | 0 | 0 | 0 |
| Aug 31 – Sep 30 | 192 | 49 | 1 | 2 | 1 | 0 |
| **Sep 30 – Oct 30** | **213** | **45** | **2** | **0** | **2** | **0** |

Before July the event table is nearly empty (180 days ≈ 120 days), so "the months with 0" are partly *unmeasured*, not zero.

**Verdict.**
- Traffic is up about 1.2–1.9× against Aug/Sep.
- Activation is not up: 2 completed analyses and 0 signups in October.
- More people arrive, the same tiny number act, and nobody pays.

### Per system: is it better than not having it?

| System | Evidence | Better than nothing? |
|---|---|---|
| **SEO** | Search sessions: Jul 15 → Aug 3 → Sep 3 → **Oct 12**. The SEO baseline score was 54/100 on 2026-10-27. Google Search Console is not connected, so there is no impressions/rank data. | Slightly, from a very low base. 12 visits a month is not a channel yet. |
| **Cold outreach** | 257 emails sent to 133 contacted prospects (140 step 1, 117 step 2). Inbound since Oct 1: **0 human replies from prospects**, 8 bounces (3%), 1 "system" auto-reply. Email-attributed sessions: 12, engaged 0. | **No. Same as not having it**, so far. Root causes are in §2. |
| **LinkedIn autoposter** | 13 posts posted (11 in Oct), 17 scheduled. LinkedIn sessions in 30 days: 21, engaged 3. | Marginally. It gives a presence, not a pipeline. |
| **Analytics** | Clean channel attribution, internal traffic excluded, an event per step. | **Yes.** It is the reason this table can exist. |
| **Founder / offer pages** | `/decision-review` 11 sessions in 30 days, 2 checkout starts, 0 completed. | Too little traffic to judge. |
| **Financial accuracy** | Then: Monte Carlo was advertised but never ran, anonymous saves never persisted, and demos had their own math. Now: seeded P10/P50/P90 runs in every report (#313), saves work (#302), and 4 decision tools on the canonical engine with boundary tests (#386, #390, #393). Still open: the LTV-vs-churn inconsistency, and payback that assumes +5%/mo growth. | **Yes, materially better.** It is not what's blocking sales today. |

### Cash is not the bottleneck; attention and trust are

- 213 external sessions a month, 45 engaged, 2 runs. That is about 1% of sessions running anything.
- 257 targeted emails with 0 replies.
- Both are top-of-funnel and message problems. More product depth doesn't fix either.

## 2. Why people still don't buy: diagnosed from our own data

### Outreach (0 replies out of 257)

The three most recent sent emails were read verbatim.

1. **The ask is too heavy for a stranger.** "Reply with one client decision you're weighing." For an accountant or CFO that means sending a client's confidential situation to someone they've never heard of. It is a privacy objection and a lot of effort.
2. **Insider jargon.** "Deterministic", "before any narration" and "financial pre-mortem" are our words, not theirs.
3. **No proof the reader can click.** There's no live example, no "here is one I already ran for a firm like yours", and no face.
4. **Sender is `hello@`.** A role address from a new domain reads as a campaign. A person's address reads as a person (**inferred**; test it).
5. **Placement is unknown.** We have no open/placement test, so some of the 0 may be spam-folder (**inferred**; must measure before rewriting copy).
6. **Offer mismatch.** Emails go to tax practices and CPAs. Our strongest live tools (hire, price change, second location) serve their *clients*. The email never shows those tools.

### Site (213 sessions → 2 runs)

- Direct/unknown is 65% of traffic. Most visitors arrive without context.
- The new own-numbers tools (hire, price, location) went live tonight or are awaiting merge. Their effect is not measured yet. Measure for 14 days before changing anything.

### External validation (screen 2/3 prompt, first run, 2026-10-30)

Web search could not reach Reddit directly, so this round is articles, forums and G2 pages.

- **Hiring.**
  - Owners use rules of thumb: "salary + 20% for a year in reserve" ([Monster](https://hiring.monster.com/resources/small-business-hiring/hiring-process/when-can-you-afford-to-hire)), and "payroll covered for 3 months", cited by 38% of respondents ([Shopify](https://www.shopify.com/blog/how-to-hire-your-first-employee)).
  - Neither rule models the ramp-up or the delay before customers pay. Our hiring tool does both.
- **Second location.**
  - The common regrets are ramp time underestimated ([Two Roads](https://www.tworoadsco.com/think-youre-ready-to-open-a-second-location)), build-out overruns ([Square community](https://community.squareup.com/t5/Community-Corner/Go-Big-Or-Go-Home-A-Tale-of-Expansion/m-p/670637)), and the second store draining the first ([PNC](https://www.pnc.com/insights/small-business/growing-your-business/financial-considerations-opening-second-location.html)).
  - The new tool covers ramp, opening cost and cash floor, which is a direct match.
- **Price changes.** Outcomes range from +8% revenue after +5% price to losing half of regulars ([AP via WHYY](https://whyy.org/articles/as-small-businesses-raise-prices-some-customers-push-back)). Owners guess; the break-even client-loss rule is not common knowledge.
- **Fractional CFOs.** Vendor sources (not surveys) claim 4–6 h per scenario in spreadsheets, and FP&A suites at $1.8–4K/mo that are out of reach for most ([CompassApp guide](https://compassapp.ai/guides/modern-financial-planning-tech-stack-for-client-facing-finance-professionals)).
- **Treat all of this as hypotheses**, not demand proof.

**What this tells us:** the pains are real and searched for, and our tools now answer them. The gap is that nobody who has those pains is seeing the tools.

## 3. The getripping.com model: what to copy, and what not to

Ripping sells $19/$99 a month for Instagram reels, run *inside the customer's own Claude Code* ("uses your own Claude usage", Max recommended). Ripping supplies the data, studio, style kits and publishing. Claude does the thinking. The inference cost sits with the customer, so their margin is close to 100%.

What it means for Quantis:

1. **Copy for our own distribution (now).** We already pay for Claude Max. Run the same research → script → render → pre-post check → publish → analyze loop for *Quantis's* reels, in-house, at roughly $0 marginal cost. The pieces already exist:
   - the frame-exact Remotion pipeline (`Videos/aiwmc_library_reel`);
   - the `otdel-marketinga` skill (Analyst / Scriptwriter / Editor / Packager / Distributor);
   - the voice-passport method from "Claude пишет как человек".
2. **Copy as a product channel (next).** Finance professionals now install Claude plugins (the "4 Claude plugins every finance professional should install" carousel). Ship a **free "Quantis for Claude" plugin**: an MCP server exposing the canonical engine's hire, price-change, second-location and decision-run tools.
   - Customers' own Claude does the conversation; our engine does the numbers.
   - Every answer links back to a shareable Quantis run.
   - It puts us in the directory where our buyers browse, with zero inference cost to us. This is the closest thing to a moat available: distribution inside the tool the buyer already uses, plus a deterministic engine an LLM can't fake.
3. **Don't copy.** Their struck-through "was $39/$199" prices are fake-anchor patterns, and the page contradicts itself on volume. Both break our truth rules.

## 4. Steps, in order

Rule: each step ends with a number we can check. No step starts until the one before has shipped or been explicitly parked.

### Phase A: stop the leaks in what already runs (this week)

| # | Step | Done when |
|---|---|---|
| A1 | Merge #391 (LinkedIn), #392 (advisor links) and #393 (second location) | Live, with chunk strings verified |
| A2 | **Outreach placement test** before any copy change: 5 seed inboxes (Gmail, Outlook, Yahoo, iCloud, a Google Workspace), Primary/Promotions/Spam | Placement % recorded |
| A3 | **Outreach v2 copy** (founder approves the text; sending caps unchanged):<br>• sender `bogdan@`;<br>• plain words;<br>• one clickable live run built for *their* client type (hire / price / location link with prefilled numbers);<br>• the CTA is "worth a look?" instead of "send me a client decision" | 50 sends, reply rate measured against v1's 0/257 |
| A4 | Connect Google Search Console (founder: verify the domain) | Impressions and queries visible |
| A5 | 14-day read of the new tools: `hiring_own_run`, `price_change_run`, `second_location_run` | Run counts by channel |

### Phase B: the distribution engine (weeks 1–3)

| # | Step | Done when |
|---|---|---|
| B1 | **Voice passport** for the founder: 3–5 transcripts or a 5-question voice interview (from "Claude пишет как человек"), stored with `otdel-marketinga` | Passport approved |
| B2 | **Reel pipeline v1**. Topic from real pain (§2) → script by passport → anti-AI checklist → Remotion render 1080×1920, −14 LUFS → pre-post checklist → manual post. Runs on our own Claude, Ripping-style. | 3 reels posted |
| B3 | **AI-montazher**: the skill file `ai-montazher.zip` was not in the folder (only the PDF guide). Founder: send the zip, or I build the equivalent in our Remotion pipeline (word-timed captions, inserts, layout grid, safe zones) | Installed or rebuilt |
| B4 | **UGC ad set**: 3 honest product-demo ads (screen recording of a real run plus founder voice). No actors claiming to be customers. | 3 ads ready, spend decision is the founder's |
| B5 | **Instagram analyst** (AI-аналитик блога): run the 8-step audit on our IG once there are ≥10 posts | Diagnosis + month plan |
| B6 | **LinkedIn**: "hattip-linkedin-os" does not exist in the plugin catalog or on the web. Founder: send its link. Until then the installed `linkedin-agent` skills (li-post, li-profile, li-comment, li-dm) plus the autoposter cover posting. | Link received, or parked |

### Phase C: the moat (weeks 2–6)

| # | Step | Done when |
|---|---|---|
| C1 | **Quantis for Claude**: MCP server (Supabase edge function) exposing `run_hiring`, `run_price_change`, `run_second_location` and `start_decision_run` on the canonical engine. Free tier, rate-limited. | Works in Claude Code and claude.ai |
| C2 | Submit to the Claude plugin directory, plus a landing page "/claude" | Listed |
| C3 | Accuracy proof page: 10 golden cases hand-checked against a spreadsheet, published with the spreadsheet; fix the LTV-vs-churn inconsistency | Page live, tests guard it |

### Phase D: inspect again (day 30)

Re-run this exact document's §1 table and the SEO audit. Keep what moved and cut what didn't.

## 5. What we will not do

- No fake anchors, scarcity, testimonials or "as seen on".
- No changes to outreach caps, warm-up or `outreach_enabled` without founder approval.
- No sending without founder approval of the copy.
- No new product features unless one of the §1 numbers says a feature is the blocker.
- No paid ads until A3/A5 show which message converts.

## 6. Open questions for the founder

1. The `ai-montazher.zip` file, or approval to rebuild it in our Remotion pipeline.
2. The hattip-linkedin-os link.
3. Approval to run the A2 placement test with 5 seed inboxes you control.
4. Booking link, first-customer offer terms, and price default (still open from earlier).
