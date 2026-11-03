# Cold outreach: why zero replies (2026-10-30, about 17:15 UTC)

**Question:** 305 emails have gone out since 2026-09-28 and not one human has replied. Why?

**Method:** read-only.
- `commercial_followups`: today's 48 sends and the all-time sent count.
- `mail_messages`: the 319 synced messages, 46 of them inbound.
- `funnel_events`: rows with `utm_medium=outreach` or `utm_source=email`.
- Live DNS: SPF, DMARC, DKIM selectors, MX and NS.

No sends, settings or rows were changed.

## 1. Facts (observed)

| Fact | Evidence |
|---|---|
| Zero replies is real, not a tracking gap | The inbox sync works. In the last 10 days it pulled 46 inbound messages: bounces from IONOS (`perfora.net`) and Google, and DMARC reports from Google, Yahoo, Microsoft, Zoho and Mimecast. A human reply would have arrived the same way, and none did. |
| Today | 48 sent: 18 first touches, 13 step-2 follow-ups and 17 step-3 follow-ups. 0 send errors. 2 bounces from IONOS at 12:24 UTC. |
| All time | 305 sent since 2026-09-28. 0 human replies. About 10 bounces. |
| Clicks | 22 events from 16 sessions in one month. Every event is a page view: no session went on to run, scroll or sign up. Today: 1 view, at 16:25 UTC. |
| Some "clicks" look like link scanners | The same campaign link was opened at 18:00, 18:56, 19:21 and 19:46 on Oct 19, then 12:10, 12:11 and 12:41 on Oct 20. Each visit was a single page view. That fits corporate mail security scanners (Mimecast is in our DMARC reports) better than a person. Real human clicks may be close to 0. |
| Some follow-ups faked a reply thread (**corrected 17:30 UTC**) | 147 of the 272 outbound outreach emails start with "Re:".<br>• **89** really were replies: the first touch went out through our mailbox, and the sender set `In-Reply-To` to it.<br>• **58** were fake: the first touch had been sent outside Quantis, so no Message-ID existed to reply to. Some of these went out with the CRM placeholder subject **"Re: First-touch outreach (sent externally)"**.<br>• The earlier reading ("0 of the outbound messages carry `In-Reply-To`") was wrong. The sender set the header but never logged it to `mail_messages.in_reply_to`. Both problems are fixed in the threading PR. |
| Step-2 subjects | The stored subject ("A design-partner seat for Sengo?") is replaced at send time by "Re: <first-touch subject>", so a correctly threaded step 2 does show the first email. |
| The generator rated its own personalization low | All 18 first touches today carry `confidence: low`, with the note "Only a CRM title is available; no firmographic or product detail to personalize further". The "personal" opening line is made up from the job title. |
| No DKIM signature found | We checked the IONOS selectors (`s1-ionos`, `s2-ionos`) and nine other common selectors on `aiwmcquantis.com`; none has a record. SPF includes IONOS, and DMARC is `p=reject` with relaxed alignment. So the mail most likely passes DMARC on SPF alone and is unsigned. Inbox placement has never been measured. |
| Sent from a role address | Every email is from `hello@aiwmcquantis.com`. "Bogdan Jeltov" appears only as the display name. |
| Postal address: present (**corrected 17:30 UTC**) | `mail_settings.postal_address` is set, and the sender refuses to send without it (`postalAddressBlock`), so every email carried the footer. The earlier "no postal address" was wrong. |
| 6 of today's 48 went to personal `@gmail.com` addresses | From the `sent_to` domains. |

## 2. Why nobody replies (ranked by likely impact)

1. **The ask cannot be said yes to.**
   - Every version asks a stranger to "reply with one client decision" or "pick one anonymized client case".
   - A fractional CFO is bound by client confidentiality, has never heard of us and has no reason to trust a tool that implies it can do part of their job.
   - The cheapest safe response is silence. This alone can explain 0/305.
2. **The emails look automated and slightly deceptive.**
   - The fake "Re:" on step 3, a thread that resets on step 2, and openers built from a job title.
   - Each of these pushes mail into Promotions or Junk, and makes the people who do see it discount it.
3. **Deliverability is unproven and probably weak.**
   - No DKIM, a role address and a 5-week-old cold-sending pattern.
   - Long tracking links: `?utm_source=…&utm_medium=…&utm_campaign=…&utm_content=…`.
   - The scanner-like clicks suggest a share of the mail sits in corporate filters. We have no inbox-placement number at all.
4. **It talks about the product, not their money.**
   - Words like "deterministic", "accuracy standard for advisor-grade decision packets" and "Decision Runs".
   - The email never says what the reader gains: one more billable deliverable, a faster client memo, a defensible downside case.
5. **One narrow, heavily pitched audience, with three touches close together.**
   - 133 fractional CFOs and FP&A consultants receive vendor pitches every week.
   - Three emails in about 10 days with no new value in each is pressure, not help.

## 3. Reasons to fix (what changes, in order)

| # | Fix | Why | Owner | Needs approval |
|---|---|---|---|---|
| F1 | **Pause new outreach sends** after today's queue drains (it stops by itself). Queue nothing new until F2–F5 are in. | Each send with the current copy and threading spends domain reputation and the prospect list. | Founder | Yes (queue action) |
| F2 | **Real threading (built):** "Re:" only when the first touch's Message-ID is known. `References` chain through every earlier touch, and `In-Reply-To` points at the latest. With no Message-ID, the email goes standalone under its own subject. A placeholder subject is held, never sent. `in_reply_to` is now logged. | Removes the fake-reply signal and shows the earlier email. | Engineering (business-mail sender) | PR review |
| F3 | **Turn on DKIM** for `aiwmcquantis.com` in IONOS (Domain → Email → DKIM; it creates the `s1-ionos` / `s2-ionos` CNAMEs). Then send one seed test to 3 inboxes we own (Gmail, Outlook, Yahoo) and record where it lands. | Signed mail plus a measured placement number. | Founder (IONOS login) | Yes |
| F4 | **Send from a person:** `bogdan@aiwmcquantis.com`, with replies going to that mailbox (also synced). | People reply to people, not to `hello@`. | Founder (mailbox) + engineering (sender) | Yes |
| F5 | ~~Postal address in the footer~~: already in place (see §1). Keep the one-line opt-out. | n/a | Done | No |
| F6 | **Rewrite the copy** (section 5): an ask that needs no client data, one plain link at most, 50–80 words, no jargon. | Fixes reasons 1 and 4. | Founder signs off on the copy | Yes |
| F7 | **Fix the click signal:** exclude single-event sessions from known scanner IP ranges or user agents, or at least report "page-view-only sessions" separately in `/admin/funnel`. | Today's "16 sessions" overstates human interest. | Engineering | PR review |
| F8 | **Personalize from evidence or not at all.** If the drafter's confidence is `low`, use the plain, honest template, not an invented opener. | Stops made-up personalization. | Engineering (drafter prompt) | PR review |

## 4. Reasons to buy (what a fractional CFO actually gets)

Written from the buyer's side. Only claims the product and the published offers support today.

1. **One more deliverable per client, without one more weekend.** A base, downside and upside case for a hire, a price change or a second location, with cash, break-even and payback reconciled in one place. The consultant puts their name on the memo.
2. **A defensible downside case in front of the owner or the board.** Every number is tagged fact, assumption or unknown. "Which five assumptions change the answer" is the list the client argues about, so it is the list worth showing.
3. **Free to try on their own numbers or a made-up case.** The Free tier needs no card. The live demos (`/demo/hiring-decision`, `/demo/second-location`, `/demo/consultant-founding-pilot`) run in the browser with no sign-up and use no client data.
4. **A small, fixed paid step when they are ready.** The Consultant Founding Pilot (price from `engagement-offers.ts`) covers two client cases in 30 days, with a review and a revision per case. The buyer knows the scope and the cost up front.
5. **The math is checkable.** The engine is deterministic: the same inputs give the same outputs, and the formulas are on the page. The AI writes the narration, not the numbers. This matters to finance people who distrust black-box AI.

**Not a reason to buy, and not to be claimed:** results, accuracy rates, client counts or testimonials. There are none yet.

## 5. Replacement copy (draft, not sent)

**First touch.** Subject: `downside case for a client hire`

> Hi {first},
>
> Quick one. When a client asks "can we afford this hire?", how long does the downside case take you today?
>
> I built a free tool that does the cash, break-even and payback side in about two minutes, with each number tagged fact or assumption, so you can argue with it. No sign-up, no client data needed: {one link to /demo/hiring-decision}
>
> Worth a look, or not your workflow?
>
> Bogdan
> Founder, AIWMC Quantis · {postal address} · reply "no" and I won't write again

**Follow-up**, threaded as a reply to the first touch, 4–5 days later:

> Hi {first}, one more and then I'll stop. If it helps, I can send you a finished sample memo (an illustrative case, not a real client) so you can judge the output in two minutes without opening anything. Want it?
>
> Bogdan

Two touches, not three. The second gives something (a sample memo, attached on request) and asks for a one-word reply.

**Built 2026-11-03 (F6 + F8, branch `fix/first-touch-low-ask-copy`, founder approves the copy before merge).**
- The first-touch body is a fixed template in `supabase/functions/_shared/commercial/outreach-copy.ts` (`low_ask_v1`). The model writes only the opening sentence, and only from a recorded signal; with confidence `low` the opener is role and firm only.
- `lintFirstTouch` blocks the jargon, the heavy ask, generic openers, meeting asks, in-body legal text and em dashes. It requires exactly one link (the hiring demo with `utm_source=email&utm_medium=outreach&utm_campaign=<campaign slug>`) and 50–90 words.
- The cadence is 2 touches for everyone (`MAX_SEQUENCE_STEP = 2`, follow-up on day 6, which is at least 4 business days). Step 3+ is never drafted or proposed, and the sender holds any step 3+ that was already approved.
- Two changes from the draft above. "In about two minutes" was dropped: it is a speed claim, and "90-second" claims are prohibited. "Each number tagged fact or assumption" was also dropped, because the hiring demo does not tag numbers. The copy says what the demo shows instead: the cash dip, the payback month, and which assumption a hire depends on most.

## 6. How we will know it worked

- **Before the next batch:** a seed test lands in the Inbox (not Spam or Promotions) at Gmail and Outlook. DKIM shows `pass` in the headers.
- **After 50 sends with the new copy:** at least 2 human replies (4%), or the next suspect is the audience, not the copy.
- **Clicks** are counted only from sessions with more than one event.

Related: `docs/execution/2026-10-30-founder-operating-review.md`, `docs/execution/2026-10-30-scope-first-paid-users-and-distribution-moat.md` (outreach diagnosis, §1).
