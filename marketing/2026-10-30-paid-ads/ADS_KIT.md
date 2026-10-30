# AIWMC Quantis: paid-ads kit (3 ads)

All three ads share one brand system: the real AIWMC™ QUANTIS chrome logo (from the July 2026 master) fixed top-left in
every frame and large on the end card with a light sweep; Geist + Geist Mono numbers + Instrument Serif italics; the navy stage. Each one has its own reason to watch and its own landing page.
Every number is Quantis engine output on a published illustrative example, and the end card says so.

| | A · "The month it breaks" | B · "The balance" | C · "How many clients can you lose?" |
|---|---|---|---|
| File | `a1-month_cut1.mp4` (11 s) | `b1-balance_cut1.mp4` (10.5 s) | `c1-clients_cut1.mp4` (10.5 s) |
| The hook (frame 0) | "The hire was *fine.*" over a healthy cash chart | "Watch the *balance.*" over a giant $60,000 | "Raise prices *15%?*" over 120 glowing clients |
| The moat | a 3D cursor drags *clients pay after* 1 → 3 months; the line crashes through the floor; a 3D magnifier lands on month 5 and the camera dives through the lens | a real rolling odometer counts the bank balance down month by month; payroll leaves, invoices land stamped UNPAID · 90 DAYS, and it turns orange below $20K | dots switch off one by one; the profit meter falls to exactly ±$0 at 24 lost; the 25th glows orange at −$60 |
| The emotion | "it looked safe" → betrayal by payment terms | dread: watching money drain in real time | curiosity, then a precise, surprising answer |
| Truth | runHiringDemo lag1/lag2/lag3 | runHiringDemo lag3 vs base ($10,646 vs $39,957) | x ÷ (m + x) = 15% ÷ 75% = 20% of 120 = 24; $60 × 96 = $5,760 |
| Landing | /demo/hiring-decision | /demo/hiring-decision | /demo/price-change |

## Who sees them (Meta / TikTok / YouTube)

- **Geography:** US first; then CA, UK, AU.
- **Age:** 28-60.
- **Interests:** small business owners, entrepreneurship, QuickBooks, Xero, payroll, Gusto, fractional CFO, bookkeeping. On Meta, Advantage+ audience is fine once there's data.
- **A and B:** owners deciding a hire.
- **C:** anyone who sets prices: agencies, studios, salons, gyms, SaaS.
- **Placements:** Reels, Stories, TikTok In-Feed, Shorts. These are vertical only; never let the platform crop to 1:1.

## Copy

**A · primary text**
> The hire was fine. The payment terms weren't.
>
> Same hire, same clients. They just pay 2 months later, and cash drops under the floor in month 5. Put your own numbers in and see the month before you sign the offer. Free, about 2 minutes.

**A · headline:** Find the month your hire breaks · **Button:** Learn more

**B · primary text**
> $60,000 in the bank. A new hire at $6,500 a month. Clients pay in 90 days.
>
> By month 5 the balance is under $20K. Paid in 30 days instead, the same hire never drops below $39,957. Check your runway before you hire, with your own numbers.

**B · headline:** See your runway before you hire · **Button:** Learn more

**C · primary text**
> Raising prices 15%? At a 60% margin you can lose 24 of 120 clients and still make the same gross profit. Lose 25 and the raise costs you.
>
> Quantis shows the line for your business before you raise. Free, no account.

**C · headline:** How many clients can you lose? · **Button:** Learn more

## Tracked links (paste into the ad's URL field)

| Ad | Meta | TikTok | YouTube |
|---|---|---|---|
| A | https://www.aiwmcquantis.com/demo/hiring-decision?utm_source=meta&utm_medium=paid_social&utm_campaign=a1_month | …&utm_source=tiktok… | …&utm_source=youtube… |
| B | https://www.aiwmcquantis.com/demo/hiring-decision?utm_source=meta&utm_medium=paid_social&utm_campaign=b1_balance | same pattern | same pattern |
| C | https://www.aiwmcquantis.com/demo/price-change?utm_source=meta&utm_medium=paid_social&utm_campaign=c1_clients | same pattern | same pattern |

`/admin/funnel` (admin_traffic_sources) splits visits and tool runs by `utm_campaign`, so each ad is measured on its own.

## Spend plan (your budget; ranges are typical, not quotes)

1. **Days 1-3: one campaign, three ads, equal budget**, about $15-20/day each. Objective: ThruPlay / video views (for reach), or landing-page views (for runs).
2. **Day 4: read the numbers per ad:**
   - cost per 1,000 impressions;
   - cost per ThruPlay;
   - hold at 3 s;
   - link CTR;
   - tool runs from `/admin/funnel`.
3. **Then:** double the winner, keep the second at test budget, pause the third. A new opening for the winner takes about 30 seconds to render.
4. **Kill rules:** link CTR under 0.5% after 2,000 impressions, or 3-second hold under 30%.

## Before the first dollar

- [ ] You watched all three on a phone, with sound.
- [ ] Meta Pixel / TikTok Pixel: the site has none today. Without one, platforms optimise blind, so use the views or landing-page-views objectives, and `/admin/funnel` for the truth.
- [ ] The landing pages load fast on mobile (they're live: hiring, price-change).
- [ ] Ad account, payment method and page are yours: you set these up; I never touch billing.

## QA (all passed)

| Ad | Length | Loudness | True peak | Black / frozen | Hook check |
|---|---|---|---|---|---|
| A | 11.0 s | −14.5 LUFS | −2.6 dBTP | 0 / 0 | ok |
| B | 10.5 s | −14.2 LUFS | −2.4 dBTP | 0 / 0 | ok |
| C | 10.5 s | −14.5 LUFS | −2.5 dBTP | 0 / 0 | ok |
