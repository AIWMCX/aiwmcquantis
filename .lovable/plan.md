
# Quantis growth diagnosis + next-stage plan

I read the live site, the funnel DB, and our SEO/UTM state. The product is not the problem. The conversion math and the distribution math are.

## What the numbers actually say (last 14 days)

```
home_view             539
  → analysis_start     76   (14% of home views)
    → analysis_complete 16  (21% of starts — 79% abandon)
      → free_signup_start  3   (19% of completers try to sign up)
        → free_signup_complete 2
          → paid_checkout_start 6 (across all users, not just these)
            → paid conversions ~0

sample_view           28   (5% of homepage visitors scroll to it)
sample_full_open       2
sample_pdf_download    2
```

UTM source breakdown over 30 days:
```
(none)         1104   ← 99% of all events
homepage          7   ← our own internal CTAs
chatgpt.com       1
```

That tells the truth nobody wants to hear:

1. **Distribution is zero.** No LinkedIn, no Product Hunt, no directory clicks are landing tagged. Either posts aren't going out, or they're going out without UTM, or nobody is clicking. Either way → no top-of-funnel.
2. **Mid-funnel leak.** 79% of people who start an analysis never finish one. That's the single biggest controllable loss.
3. **Signup gate is killing it.** Of the 16 who finish, only 3 even start signup. The "result → signup" hand-off is broken or asks too much.
4. **Pricing has no trial.** 6 paid_checkout_start in 14 days, ~0 conversions. $14/mo with only a money-back guarantee is still cold-card friction.
5. **Sample report is invisible.** 5% of visitors ever see it; 0.4% open the full version. It's below the hero and not pulling weight.
6. **SEO**: per-route canonicals + sitemap are correct. Real issue is we have one indexable page (`/`) doing all the work. No programmatic `/for/[industry]` surface area = no long-tail entry points.

## The plan — 3 tracks, no new features

### Track A — Stop the mid-funnel leak (highest ROI)

- Read `analysis_step_view` events to find the exact step where the 79% drops off (we already log `ms_on_step`).
- Compress the analysis input flow: cut any optional field, default everything sensible, make "Analyze" reachable in ≤2 clicks from idea-paste.
- Show partial result *before* asking for anything (already partly done — extend it: full verdict + 1 risk visible, signup gate only for the rest).
- Add a single "save your report" inline signup on the result page (email-only magic link, no password), not a route change.

### Track B — Convert finishers to paid

- Add a real **$1 / 7-day Pro trial** in Stripe (we already discussed this; it's the standard fix for $14 friction with cold traffic).
- Replace "Generate free plan" hero CTA copy with a benefit-led promise that matches the verdict ("See if your idea makes money — free verdict in 90s").
- Move the sample report **into the hero** as a right-column preview (desktop) / below-fold accordion (mobile), with one tracked "See the full sample" link. Don't make it a separate scroll-section nobody reaches.
- Pricing page: add the trial card as the Most Popular tier, push annual save below it.

### Track C — Turn on distribution (the actual blocker)

- Ship 4 programmatic SEO landing pages: `/for/restaurants`, `/for/saas`, `/for/coffee-shops`, `/for/ecommerce`. Each = hero + 3 real benchmarks from our DB + sample verdict for that industry + CTA. These are the long-tail entry points we don't have.
- Ship a **public shareable result page** (`/r/[token]`) with OG image so every finished analysis becomes a tweetable/LinkedIn-able artifact. Right now reports die in the user's tab.
- A LinkedIn post composer that pre-fills "I stress-tested my idea on Quantis — verdict: X" + UTM-tagged link. This is the only realistic way one founder → 5 visitors.
- Audit our directory submissions: confirm each live link carries `?utm_source=producthunt|betalist|...`. Right now they don't, which is why we have 1104 (none) events.

### Out of scope on purpose

- No new tier, no new pricing, no new engine work, no rebrand.
- No "more content" or "more posts" until UTM proves clicks convert. Posting blind is what got us here.

## Suggested build order (when you switch me to build mode)

1. Per-step abandon report on `/admin/journey-drilldown` already exists → I read it, identify the leak step, and cut it. (1 PR)
2. Inline email-only signup on result page + sample report moved into hero. (1 PR)
3. Stripe $1 / 7-day Pro trial + pricing page update. (1 PR)
4. Public share page `/r/[token]` + OG image edge function. (1 PR)
5. 4 `/for/[industry]` programmatic pages + sitemap entries. (1 PR)
6. UTM audit on all directory + social links. (1 PR)

Each PR is independently shippable and independently measurable in the dashboards we already built.

## One honest thing

The reason it feels bad isn't that the product is bad. It's that you built a Ferrari and parked it in a garage with no door. Tracks A+B fix the engine; Track C opens the door. Until C ships, no amount of A+B matters — and until A+B ship, traffic from C will leak right back out.

Tell me to switch to build mode and I start with step 1 (find and cut the abandon step), since that's the one fix that pays off even before distribution turns on.
