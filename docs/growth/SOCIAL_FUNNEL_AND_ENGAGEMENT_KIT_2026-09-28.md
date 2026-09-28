# AIWMC Quantis — Social Funnel & Engagement Kit
**Date:** 2026-09-28  
**Purpose:** turn AIWMC Quantis social content into a measurable path from attention → useful conversation → demo → paid decision review, without fake virality claims, unsupported product claims, or duplicate content.

---

## 0. Operating principle

The goal is not to "go viral" by manufacturing outrage, fake scarcity, or engagement bait.

The goal is to make a financially intelligent person stop because the post asks a question they actually care about, then give them enough value that the next action feels natural.

The funnel is:

**Useful question → native visual → concrete financial lesson → one relevant Quantis workflow → one exact CTA → tracked demo → tracked paid offer**

No post should try to sell three things at once.

---

## 1. Verified Quantis offer routes

These routes are verified from the current production repository.

### Founder Decision Review
- Offer: **Founder Decision Review**
- Price: **$349 one-time**
- Demo: **https://www.aiwmcquantis.com/demo/founder-decision-review**
- Paid offer page: **https://www.aiwmcquantis.com/decision-review**
- Current product scope: one founder decision, structured intake, base/downside/upside scenarios, cash/break-even/payback reconciliation, five decision-changing assumptions, Decision Memo, live review, one revision.

### Consultant Founding Pilot
- Offer: **Consultant Founding Pilot**
- Price: **$499 one-time**
- Demo: **https://www.aiwmcquantis.com/demo/consultant-founding-pilot**
- Paid offer page: **https://www.aiwmcquantis.com/decision-review**
- Current product scope: two client cases within 30 days, founder-led pilot setup, reconciled economics, source/uncertainty register, two consultant-ready Decision Memos, review and revision.

**Hard rule:** never use `/demo` as a destination. Use the full offer-specific route.

---

## 2. UTM taxonomy

Use only these fields unless there is a real reason to add more.

- `utm_source`: platform or origin
- `utm_medium`: `organic_social`, `direct_message`, `email`
- `utm_campaign`: offer/campaign
- `utm_content`: exact post or message angle

Quantis currently stores `utm_source`, `utm_medium`, and `utm_campaign` in session attribution, so the landing source persists through the session.

### Founder Decision Review — canonical links

**LinkedIn personal**
https://www.aiwmcquantis.com/demo/founder-decision-review?utm_source=linkedin&utm_medium=organic_social&utm_campaign=sep28_founder_decision_review&utm_content=founder_decision_review

**LinkedIn company page**
https://www.aiwmcquantis.com/demo/founder-decision-review?utm_source=linkedin_company&utm_medium=organic_social&utm_campaign=sep28_founder_decision_review&utm_content=founder_decision_review

**Telegram**
https://www.aiwmcquantis.com/demo/founder-decision-review?utm_source=telegram&utm_medium=organic_social&utm_campaign=sep28_founder_decision_review&utm_content=founder_decision_review

**Instagram**
https://www.aiwmcquantis.com/demo/founder-decision-review?utm_source=instagram&utm_medium=organic_social&utm_campaign=sep28_founder_decision_review&utm_content=founder_decision_review

**Facebook**
https://www.aiwmcquantis.com/demo/founder-decision-review?utm_source=facebook&utm_medium=organic_social&utm_campaign=sep28_founder_decision_review&utm_content=founder_decision_review

**X**
https://www.aiwmcquantis.com/demo/founder-decision-review?utm_source=x&utm_medium=organic_social&utm_campaign=sep28_founder_decision_review&utm_content=founder_decision_review

**Threads**
https://www.aiwmcquantis.com/demo/founder-decision-review?utm_source=threads&utm_medium=organic_social&utm_campaign=sep28_founder_decision_review&utm_content=founder_decision_review

**LinkedIn DM**
https://www.aiwmcquantis.com/demo/founder-decision-review?utm_source=linkedin_dm&utm_medium=direct_message&utm_campaign=sep28_founder_decision_review&utm_content=dm_invite

### Consultant Founding Pilot — canonical links

**LinkedIn personal**
https://www.aiwmcquantis.com/demo/consultant-founding-pilot?utm_source=linkedin&utm_medium=organic_social&utm_campaign=sep28_consultant_founding_pilot&utm_content=consultant_capacity

**LinkedIn company page**
https://www.aiwmcquantis.com/demo/consultant-founding-pilot?utm_source=linkedin_company&utm_medium=organic_social&utm_campaign=sep28_consultant_founding_pilot&utm_content=consultant_capacity

**Telegram**
https://www.aiwmcquantis.com/demo/consultant-founding-pilot?utm_source=telegram&utm_medium=organic_social&utm_campaign=sep28_consultant_founding_pilot&utm_content=consultant_capacity

**Instagram**
https://www.aiwmcquantis.com/demo/consultant-founding-pilot?utm_source=instagram&utm_medium=organic_social&utm_campaign=sep28_consultant_founding_pilot&utm_content=consultant_capacity

**Facebook**
https://www.aiwmcquantis.com/demo/consultant-founding-pilot?utm_source=facebook&utm_medium=organic_social&utm_campaign=sep28_consultant_founding_pilot&utm_content=consultant_capacity

**LinkedIn DM**
https://www.aiwmcquantis.com/demo/consultant-founding-pilot?utm_source=linkedin_dm&utm_medium=direct_message&utm_campaign=sep28_consultant_founding_pilot&utm_content=consultant_invite

### Direct paid-offer links

Use these only after the person already understands the product or asks about pricing.

**Founder**
https://www.aiwmcquantis.com/decision-review?utm_source=linkedin_dm&utm_medium=direct_message&utm_campaign=sep28_founder_decision_review&utm_content=paid_offer

**Consultant**
https://www.aiwmcquantis.com/decision-review?utm_source=linkedin_dm&utm_medium=direct_message&utm_campaign=sep28_consultant_founding_pilot&utm_content=paid_offer

---

## 3. Platform chain

### Primary: LinkedIn founder profile
This is the discovery surface.

Post:
- one native 4:5 Quantis image;
- one sharp financial question;
- one useful explanation;
- one offer-specific link;
- one real question at the end.

Do not open with AIWMC Quantis. Open with the decision problem.

### Secondary: AIWMC Quantis company page
Post a shorter, more product-specific version 2–6 hours later or the next day.

Do not duplicate the founder copy word-for-word.

Founder profile = insight and point of view.  
Company page = product mechanism and proof.

### Telegram
Use as the complete version/archive:
- full image;
- full educational caption;
- direct UTM link;
- optional follow-up note with one extra example or founder commentary.

Telegram is the best place to preserve the full narrative without forcing LinkedIn-length compromises.

### Instagram
Use the same 4:5 asset.

Caption should be shorter:
- hook;
- 3–5 lines of lesson;
- one CTA.

Because caption links are not reliably clickable, use a profile link or Story link sticker with the Instagram UTM URL.

### Facebook
Autoposter can support Facebook. Use a slightly more explanatory founder/small-business version, not a LinkedIn copy dump.

### X / Threads
Current Quantis Autoposter only supports LinkedIn, Facebook and Instagram. X / Threads should be manual until the production integration changes.

Use:
- one sharp question;
- one numeric or financial distinction;
- one line of interpretation;
- link.

---

## 4. The pinned hero offer

### Hook
**IF ONE ASSUMPTION IS WRONG, WHICH ONE COSTS YOU THE MOST?**

### Subhead
Before you commit capital, find the assumption that can break the decision.

### Offer
**Founder Decision Review — $349 one-time**

### CTA
https://www.aiwmcquantis.com/demo/founder-decision-review?utm_source=linkedin&utm_medium=organic_social&utm_campaign=sep28_founder_decision_review&utm_content=pinned_offer

### Pinned post copy

Most bad decisions do not fail because every assumption was wrong.

They fail because one assumption mattered much more than anyone realized.

CAC is 30% higher.

Customers arrive two months later.

Gross margin is thinner after delivery costs.

Churn is slightly worse.

Collections slip from 30 to 60 days.

Any one of those might be survivable.

But one of them may completely change the decision.

That is the useful question:

**Which assumption actually controls the outcome?**

Not:
“Is the forecast optimistic?”

Not:
“Does the business look good?”

But:

**What has to be true for this decision to hold — and what breaks first if it does not?**

That is what the Founder Decision Review is designed to examine.

Change the assumptions. Compare scenarios. Follow the effect through cash, break-even and payback.

No prediction theater.

Just a clearer view of what the decision depends on before the money is committed.

**Founder Decision Review — $349 one-time**

Try the interactive demo:
https://www.aiwmcquantis.com/demo/founder-decision-review?utm_source=linkedin&utm_medium=organic_social&utm_campaign=sep28_founder_decision_review&utm_content=pinned_offer

If you could pressure-test only one assumption in your business today, which one would you choose?

---

## 5. Current post-to-offer mapping

### Post: “If your customers paid 30 days later tomorrow…”
**Offer:** Founder Decision Review  
**Link:**
https://www.aiwmcquantis.com/demo/founder-decision-review?utm_source=linkedin&utm_medium=organic_social&utm_campaign=sep28_founder_decision_review&utm_content=payment_delay

**CTA line:**
If moving one payment term changes your lowest cash point, that is worth knowing before you commit capital.

### Post: “A discount can change when you need cash, not just how much you earn.”
**Offer:** Founder Decision Review  
**Link:**
https://www.aiwmcquantis.com/demo/founder-decision-review?utm_source=linkedin&utm_medium=organic_social&utm_campaign=sep28_founder_decision_review&utm_content=discount_cash_timing

**CTA line:**
Price and payment terms belong in the same model. Test both before you approve the deal.

### Post: “A full pipeline is not a cash forecast.”
**Offer:** Consultant Founding Pilot when aimed at consultants/fractional CFOs; Founder Decision Review when aimed at founders.

**Consultant link:**
https://www.aiwmcquantis.com/demo/consultant-founding-pilot?utm_source=linkedin&utm_medium=organic_social&utm_campaign=sep28_consultant_founding_pilot&utm_content=pipeline_to_cash

**Founder link:**
https://www.aiwmcquantis.com/demo/founder-decision-review?utm_source=linkedin&utm_medium=organic_social&utm_campaign=sep28_founder_decision_review&utm_content=pipeline_to_cash

### Post: “The cheaper plan can have the higher cost to serve.”
**Offer:** Founder Decision Review for a founder/SaaS audience; Consultant Founding Pilot when framed as client analysis.

**Founder link:**
https://www.aiwmcquantis.com/demo/founder-decision-review?utm_source=linkedin&utm_medium=organic_social&utm_campaign=sep28_founder_decision_review&utm_content=cost_to_serve

**Consultant link:**
https://www.aiwmcquantis.com/demo/consultant-founding-pilot?utm_source=linkedin&utm_medium=organic_social&utm_campaign=sep28_consultant_founding_pilot&utm_content=cost_to_serve

### Post: “Client-ready analysis shouldn’t require rebuilding the model.”
**Offer:** Consultant Founding Pilot  
**Link:**
https://www.aiwmcquantis.com/demo/consultant-founding-pilot?utm_source=linkedin&utm_medium=organic_social&utm_campaign=sep28_consultant_founding_pilot&utm_content=client_ready_analysis

**CTA line:**
If you work with founders or clients on financial decisions, the interactive consultant demo is the most relevant place to start.

---

## 6. Invite messages

### A. Warm follower
Thanks for following what I’m building with Quantis.

I’m trying to make financial pre-mortems more useful in practice: not a score, but a way to see which assumptions actually control a decision.

I built a small interactive example if you want to break it:
https://www.aiwmcquantis.com/demo/founder-decision-review?utm_source=linkedin_dm&utm_medium=direct_message&utm_campaign=sep28_founder_decision_review&utm_content=warm_follower

No pitch needed — if anything feels unclear or useless, I’d rather hear that.

### B. Founder ICP
Quick question — when you model a new decision, which assumption do you trust least: acquisition, pricing, margin, churn, or timing?

I’m building Quantis around that exact problem: change one assumption and see what happens to the rest of the decision.

Interactive example:
https://www.aiwmcquantis.com/demo/founder-decision-review?utm_source=linkedin_dm&utm_medium=direct_message&utm_campaign=sep28_founder_decision_review&utm_content=founder_icp

If you try it, I’d genuinely be interested in what you break first.

### C. Consultant / fractional CFO
I’m working on a Quantis workflow specifically for consultants and fractional CFOs.

The interesting part is not another report generator. It’s reconciling what a client claims with what the economics and delivery capacity can actually support.

This is the interactive example:
https://www.aiwmcquantis.com/demo/consultant-founding-pilot?utm_source=linkedin_dm&utm_medium=direct_message&utm_campaign=sep28_consultant_founding_pilot&utm_content=consultant_icp

Curious whether this resembles a real client problem you see.

### D. Comment → DM follow-up
Appreciated your point on [specific topic].

It connects closely to something I’m testing in Quantis: [one sentence tying their comment to a financial assumption].

I have an interactive example here if useful:
[offer-specific UTM link]

Would be interested in where you think the model is too simple.

### E. Paid-offer follow-up
Based on what you described, the closest fit is the [Founder Decision Review / Consultant Founding Pilot].

It is a fixed-scope, founder-assisted review rather than an automated “score.”

Offer details:
https://www.aiwmcquantis.com/decision-review?utm_source=linkedin_dm&utm_medium=direct_message&utm_campaign=[campaign]&utm_content=paid_followup

If the scope does not fit the decision, do not buy it — send me the situation first and I’ll tell you whether it is appropriate.

---

## 7. Engagement operating loop

### Before posting
1. Pick one ICP.
2. Pick one decision problem.
3. Confirm it is not already PUBLISHED/LOCKED in the content ledger.
4. Use one image.
5. Use one offer.
6. Generate one UTM link.
7. Confirm every product-specific claim against current production.

### Immediately after posting
Do not manufacture comments or use fake engagement.

Instead:
- reply to every substantive comment with an actual answer;
- ask one useful follow-up question when appropriate;
- if someone describes a real business situation, answer publicly before inviting them to the demo;
- do not reply to every comment with a product link.

### Daily distribution
Existing Quantis growth work already recommends manual targeted distribution because current reach is small.

Target:
- 10–15 substantive comments/day on posts by consultants, fractional CFOs, founders and operators;
- comments should add a model, example, counterexample, distinction or question;
- no “great post” filler;
- connection requests should follow real interaction whenever possible.

### Comment format
**Observation → useful distinction → question**

Example:

> The collection-delay point is easy to miss because the P&L can still look healthy. I’d separate “revenue earned” from “cash available to fund the next obligation.” Do you see this more often in services or inventory-heavy businesses?

This creates visibility without turning somebody else’s post into an ad.

---

## 8. What to measure

Impressions matter because the current traffic term is small, but they are not the final objective.

### LinkedIn
Track:
- impressions;
- members reached;
- out-of-network impression share;
- saves;
- sends;
- substantive comments;
- profile viewers from the post;
- followers gained;
- visits to links in the post.

### Quantis
Track:
- landing sessions by UTM;
- `demo_started`;
- `demo_assumption_changed`;
- `demo_model_broken`;
- `demo_cta_clicked`;
- `paid_review_view`;
- `paid_checkout_start`;
- verified checkout completion.

### Weekly question
Do not ask “Which post got the most likes?”

Ask:

**Which topic produced the most qualified next actions per 1,000 impressions?**

A useful scorecard:

```
Post
Impressions
Out-of-network %
Saves
Sends
Profile visits
Link visits
Demo starts
Demo interactions
Paid-offer views
Checkout starts
Paid conversions
```

---

## 9. The distribution hypothesis

LinkedIn’s own current guidance emphasizes:
- professional relevance;
- useful knowledge/advice;
- constructive conversation;
- viewer activity and relationships;
- engagement and dwell/viewing behavior;
- avoiding low-quality or overly promotional content.

Therefore the Quantis system should optimize for **usefulness that earns attention**, not algorithm folklore.

The pattern to test:

**Financial question → visual proof → practical explanation → one unresolved question → offer-specific route**

Examples:
- “If your customers paid 30 days later tomorrow, what happens to your lowest cash point?”
- “How much of your pipeline reaches the bank in the next 30 days?”
- “Which pricing tier creates the most contribution after support?”
- “If one assumption is wrong, which one costs you the most?”

These are stronger than:
- “Try our AI platform.”
- “We built a revolutionary financial tool.”
- “Quantis has 97,500 benchmarks.”
- “Get validated today.”

The former gives the reader a decision to think about. The latter asks the reader to care about us first.

---

## 10. Content Studio / Autoposter status contract

Current production Autoposter platforms:
- LinkedIn
- Facebook
- Instagram

Telegram, X and Threads remain manual until production support changes.

Every campaign item should move through:

```
PLANNED
→ RESERVED
→ IMAGE_GENERATED
→ COPY_GENERATED
→ APPROVED
→ SCHEDULED
→ POSTED
→ VERIFIED_POSTED
→ PUBLISHED_LOCKED
→ MEASURED
```

### Dedupe rule
`RESERVED`, `POSTED`, `VERIFIED_POSTED`, and `PUBLISHED_LOCKED` all block reuse as “new.”

Reject:
- same headline;
- semantic paraphrase;
- same financial lesson with cosmetic wording changes;
- same decision + same dominant financial object;
- same image concept with a new caption.

---

## 11. One-week execution sequence

### Day 1 — pinned offer
**If one assumption is wrong, which one costs you the most?**
Offer: Founder Decision Review

### Day 2 — working capital
**If your customers paid 30 days later tomorrow, what happens to your lowest cash point?**
Offer: Founder Decision Review

### Day 3 — consultant
**Your client says 30 new customers a month. Can they actually serve them?**
Offer: Consultant Founding Pilot

### Day 4 — commercial terms
**Would you rather get $50K in 60 days or $42.5K today?**
Offer: Founder Decision Review

### Day 5 — pipeline
**How much of your pipeline actually reaches the bank this month?**
Offer: Consultant Founding Pilot for advisor audience

### Day 6 — pricing
**Which customer tier costs you the most to serve per dollar of revenue?**
Offer: Founder Decision Review / consultant version if adviser-led

### Day 7 — founder build
Publish one real Quantis build/production note. No direct conversion CTA. Use it to show how the product is being made more trustworthy, not to repeat the offer.

---

## 12. What not to do

- Do not guarantee reach, virality, impressions, leads or sales.
- Do not use fake engagement, purchased comments or manufactured social proof.
- Do not use unsupported accuracy/confidence claims.
- Do not use `/demo`.
- Do not invent a consultant link.
- Do not use benchmark volume as proof of business outcome.
- Do not auto-post identical copy across platforms.
- Do not send a product link in a first-touch cold message unless the conversation warrants it.
- Do not let “content performance” outrank real commercial outcomes.

---

## 13. Research basis

### LinkedIn official guidance
LinkedIn currently states that Feed relevance uses identity, content and activity signals, including whether content provides knowledge/advice, recency, engagement, viewing behavior and constructive professional conversation.

- https://www.linkedin.com/help/linkedin/answer/a1339724
- https://www.linkedin.com/help/linkedin/answer/a9554004
- https://www.linkedin.com/help/linkedin/answer/a516930
- https://www.linkedin.com/help/linkedin/answer/a523040/

### Quantis production sources
- `src/App.tsx` — verified founder and consultant demo routes.
- `src/pages/DecisionReview.tsx` — verified $349 Founder Decision Review and $499 Consultant Founding Pilot.
- `src/pages/FounderDecisionDemo.tsx` — verified demo event tracking and paid-review CTA.
- `src/pages/ConsultantCapacityDemo.tsx` — verified consultant demo and CTA.
- `src/lib/analytics.ts` — verified UTM session persistence.
- `src/hooks/useAutoposter.ts` — current Autoposter platform scope: LinkedIn, Facebook, Instagram.
- `docs/DISTRIBUTION_STABILIZATION_AND_GROWTH.md` — current distribution principle: traffic first, manual targeted interaction over volume posting.

---

## Final operating rule

**The post earns attention with the problem.  
The visual earns the pause.  
The explanation earns trust.  
The demo earns curiosity.  
The paid review earns the conversion.**

Do not reverse that order.
