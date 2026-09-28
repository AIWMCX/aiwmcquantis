# Social funnel and engagement kit (2026-09-28)

One principle: **don't move people toward Quantis faster than their trust is moving.**
Content leads to a conversation. The conversation surfaces one real decision. That decision goes through Quantis, and money comes after the value.

## 1. The account chain, checked live on 2026-09-28

| Account | URL | Status |
|---|---|---|
| Website | https://www.aiwmcquantis.com | 200 |
| LinkedIn company | https://www.linkedin.com/company/aiwmc/ | 200 ("AIWMC") |
| X | https://x.com/aiwmcx1 | 200 ("AIWMC™ @AIWMCX1") |
| Telegram | https://t.me/AIWMC | 200 |
| Whop | https://whop.com/aiwmc | 200 ("AIWMC | Whop") |
| Facebook | https://www.facebook.com/share/1BGWt3CTiw/ | 200, redirects to profile 61575711584311 ("AIWMC, Denver CO") |
| Instagram | https://www.instagram.com/wmc.ai | Login wall for bots, so **check by hand** |
| Founder LinkedIn | /in/bogdan-jeltov/ **and** /in/bogdan-jeltov-6218b9324 are both used on the site | **Tell me which one is yours**, and I'll make the site use only that one |

**Fixed in code (in #211):**
- The site's search-engine profile data pointed at `linkedin.com/company/aiwmc-quantis` (404) and `twitter.com/aiwmcquantis` (404). Both now point to the live accounts above.
- Shared demo links previewed as the homepage on LinkedIn. `/demo/founder-decision-review`, `/demo/consultant-founding-pilot`, `/connect` and every `/invite/<token>` now show their own title and description when shared.

**You do these by hand, once, in each app (I have no access to your social accounts):**
1. **Every bio or "website" field** gets the link for that platform from section 2, so every visit is attributed. Right now 100% of the demo traffic (22 + 7 sessions in 21 days) arrives untagged.
2. **Every account links to every other account**, through https://www.aiwmcquantis.com/connect, which lists them all.
3. **Whop:** make the Whop product description link to the website (`?utm_source=whop`). Say plainly what is free and what is paid, and add the same screenshots as the website.
4. **Instagram:** put the website link in the bio (or a single link-in-bio pointing at `/connect`). Story highlights: "Demo" → founder demo, "Pricing" → /pricing.
5. **Pin one post per platform:** the founder demo (with the platform link below).

## 2. Tagged links: always use these, never the bare URL

Replace `<p>` with `linkedin`, `instagram`, `facebook`, `x`, `telegram`, `whop` or `email`.

| Destination | Link |
|---|---|
| Home | `https://www.aiwmcquantis.com/?utm_source=<p>&utm_medium=social&utm_campaign=profile` |
| Founder demo | `https://www.aiwmcquantis.com/demo/founder-decision-review?utm_source=<p>&utm_medium=social&utm_campaign=demo_founder` |
| Consultant demo | `https://www.aiwmcquantis.com/demo/consultant-founding-pilot?utm_source=<p>&utm_medium=social&utm_campaign=demo_consultant` |
| Paid review ($349 / $499) | `https://www.aiwmcquantis.com/decision-review?utm_source=<p>&utm_medium=social&utm_campaign=decision_review` |
| All accounts | `https://www.aiwmcquantis.com/connect?utm_source=<p>&utm_medium=social&utm_campaign=connect` |
| Free Pro month | Personal link from **Commercial Ops → Pro invites** (one per person, never posted publicly) |

## 3. The funnel: one path, many entrances

`Post / profile / Whop / email` → **reply or DM (human conversation)** → **identify one real decision** → *either* the interactive demo (someone who wants to see it first) *or* a personal **Pro invite** (someone with a live decision) → **15-minute review of their result** → second real decision → Plus/Pro, or the paid **Decision Review ($349) / Consultant Pilot ($499)** → testimonial / referral.

Which offer goes to whom:
- Just curious → **demo link**.
- Has a real decision now, will try it themselves → **Pro invite** (30 days, no card).
- Has a real decision, wants it done with you → **Decision Review $349**.
- Consultant or fractional CFO with client cases → **Consultant Pilot $499**, or a Pro invite first.

## 4. Getting activity on your last posts (demo + decision review + intake)

**A. Add a first comment on each post, right now.** Posts with links get throttled, so the link goes in the comment and ends on a question:

> Link to the interactive demo if you want to move the sliders yourself: [founder demo link, `utm_source=linkedin`]
> Question for founders and finance people: when you model a growth spend, which assumption do you trust least — conversion, cost to acquire, or how long cash takes to come back?

For the consultant post:

> Demo here: [consultant demo link]. For consultants: how often does capacity, not demand, turn out to be the real constraint on a client's growth plan?

**B. Reply to every comment within 2 hours with a question, not a thank-you.**
- *"Interesting!"* → "Appreciate it. Do these decisions come up in your own work, or more with clients?"
- *"How is this different from a spreadsheet?"* → "The math is the same kind of math. The difference is that every assumption is explicit and the downside cases are computed for you, so you can see which input actually controls the answer. Want to try it on one of yours?"
- *"Is it AI?"* → "The numbers are deterministic: cash, break-even and payback are computed, not generated. AI only writes the narrative around them, after the math."
- *"Price?"* → "Free to start. Plus is $17 and Pro is $49 a month. If you'd rather I run one decision with you, that's the $349 review."

**C. DM everyone who liked or commented (not the whole network)**, within 24 hours:

> Hey [Name], thanks for engaging with the demo post. Curious: is there a decision like that on your plate right now — hiring, a price change, a new location, a big spend?

If they name one:

> That's a good case for it. I can give you a month of Quantis Pro so you can run it properly — no card, nothing renews. Want the link? I'd also like to hear where the result looks wrong to you.

If yes, create the invite (Commercial Ops → Pro invites → "Name — LinkedIn") and send:

> Here you go: [invite link]. Sign up with any email or Google and Pro turns on immediately. Start with "New decision". I'll check in [day] — the first number you don't trust is the most useful thing you can tell me.

**D. Repost with a new angle 48–72 hours later.** A *result* post ("I moved one slider: cost to acquire +20%. Payback went from 9 to 15 months. Here's why.") with a screenshot of the demo. The link goes in the first comment.

**E. Intake/review follow-up.** Six people started the $349/$499 checkout in the last 21 days, and nobody completed. If you know who they are from Stripe, one personal note each:

> I saw you looked at the decision review. Happy to answer anything first, or run one decision with you on a Pro month before you decide.

## 5. Every day: the scoreboard (and where to see it)

| Number | Where |
|---|---|
| New real conversations (replies, DMs) | You, logged in Commercial Ops prospects |
| Invites sent / redeemed / ran an analysis / paying | **Commercial Ops → Pro invites** (live) |
| Demo visits by source | funnel_events, once UTM links are used (ask me for the query) |
| Replies to outreach and inbound mail | **/admin/inbox → Pipeline inbox** (once the mailbox is connected) |
| Reviews / pilots paid | Stripe + paid_engagements |

Rules:
- Signup is not success.
- Success is an invitee who **ran a real decision and changed an assumption**.
- Every positive conversation ends with a date, an action, or a clear close.
