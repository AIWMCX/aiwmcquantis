# Payment Link Prod Verification — Founder Decision Review ($349) & Consultant Founding Pilot ($499)

Verified 2026-08-30 against the "AIWMC Quantis — Stripe Offer Listings v1.0" spec. Browser-only, read-only inspection — no card data entered, no payment submitted, nothing clicked past viewing the checkout page.

## What matches spec (VERIFIED)

| Item | Founder Decision Review | Consultant Founding Pilot |
|---|---|---|
| Product name | "AIWMC Quantis — Founder Decision Review" ✅ | "A founder-assisted, two-case Quantis pilot for consultants, fractional CFOs and business advisors." (short description shown as title on this link) ✅ |
| Price | $349.00 USD ✅ | $499.00 USD ✅ |
| Currency/mode | USD, one-time ✅ | USD, one-time ✅ |
| Merchant identity | "AIWMC™ LLC" ✅ | "AIWMC™ LLC" ✅ |
| Quantity | Fixed (no quantity selector visible) ✅ | Fixed ✅ |
| Live vs test | **Live mode** (consistent with the `sk_live_` key confirmed earlier this session — real charges) | Live mode |

## Gaps found vs. the spec (NOT YET CONFIGURED)

1. **Custom intake fields are missing from checkout.** The spec calls for required fields "Business or company name" and "Decision to evaluate" (plus optional deadline) on Listing 1, and equivalent fields on Listing 2. Neither link's live checkout form shows any custom fields — only email, card details, and billing address. **This means Stripe is not capturing the decision/company context at time of payment**, so it has to be collected manually afterward.
2. **No Terms/refund consent checkbox.** The spec requires "acceptance of the service scope, refund terms, Terms of Service and Privacy Policy" at checkout. The only checkboxes present are Stripe's own "save my info" and the "I am an AI agent" disclosure — no scope/refund consent checkbox exists.
3. **Hosted confirmation message unverified.** Confirming the exact post-payment message ("Payment received. Your Founder Decision Review is reserved...") requires an actual completed payment — not something to trigger without spending real money. Recommend a genuine self-funded test purchase if you want this fully closed out; otherwise Stripe's default receipt will still fire regardless (payment confirmation to the customer is not at risk either way).
4. **No webhook automation for these price IDs — this is the most important finding.** I checked `supabase/functions/stripe-webhook/index.ts`: its `checkout.session.completed` handler explicitly **rejects any price ID it doesn't recognize** ("QNT-P0-008: unrecognized Stripe price ... refusing to provision any tier. Incident logged, no entitlement granted."). Since these two new one-time prices were never added to that allowlist, a real payment through either link today will be logged as an error and otherwise ignored by the app — **no automatic engagement record, no automatic CRM update.**
   - The good news buried in this: it also means there is **zero risk of a customer accidentally being granted Plus/Pro subscription entitlement** from one of these one-time payments — which is exactly what your spec's fulfillment rule requires ("Do not grant Plus/Pro subscription entitlements for these one-time service payments unless explicitly designed later"). That part is accidentally already correct.
   - I found a `paid_engagements` table already in Supabase (columns: `contact_name`, `contact_email`, `engagement_type`, `price_usd`, `status`, `decision_question`, `consultant_notes`, `engaged_at`, `completed_at` — a near-exact match for this use case) — **but it has 0 rows and nothing in the webhook writes to it.** It appears to have been built for manual/API use, not wired to Stripe events.

## Is this a P0 blocker? No.

Per your own development rule, a technical task only pre-empts selling if it prevents payment, entitlement, intake, or delivery. None of that is true here:

- **Payment works.** Both links charge correctly at the right price.
- **Confirmation works.** Stripe sends its own receipt regardless of app-side webhook handling.
- **Intake still works — manually.** You're doing a 30-minute human intake call anyway; the missing checkout fields just mean you ask for company name/decision/deadline there instead of at checkout.
- **No wrongful entitlement risk** — confirmed by the webhook's own refusal behavior.

**The one real gap this creates: nothing will remind you a payment happened, other than Stripe's own dashboard/email.** Today, for 1-2 sales, that's fine to do by hand. If volume increases beyond a few per week, wiring `checkout.session.completed` to insert into `paid_engagements` and flip the matching Zoho lead to Closed Won becomes worth the ~30-60 minutes of engineering — deferred, not urgent.

## Recommended immediate actions (no code required)

1. **When Stripe emails you a payment notification**, manually: (a) insert one row into `paid_engagements` with the buyer's info, `engagement_type`, `price_usd`, and `status='paid'`; (b) update the matching Zoho Lead to `Closed Won`.
2. Optionally add the missing custom fields and terms-consent checkbox in the Stripe Dashboard's Payment Link editor (5-10 minutes, no code) if you want the spec fully matched before more volume goes out.
3. Use the intake email and refund/cancellation copy below to cover what checkout isn't currently capturing.

---

## Intake email template (send immediately after a payment notification)

**Subject:** You're confirmed — let's schedule your Founder Decision Review

Hi {{FirstName}},

Thanks for your payment — you're confirmed for the Founder Decision Review.

Before we schedule the 30-minute intake, I just need three things by reply:

1. Your company/business name
2. The specific decision you're evaluating (the one active decision this review should focus on)
3. Any deadline you're working against (optional)

Once I have those, I'll send two call times for the intake. The 48-hour delivery clock starts once the intake is complete and I have what I need to run the analysis — so the faster we get these three things sorted, the faster you get your Decision Memo.

Talk soon,
Bogdan Jeltov
AIWMC LLC

*(Consultant Founding Pilot variant: swap item 2 for "your consulting firm/company name" + "primary client type" + "first case or decision deadline," per the spec's custom-field list for that offer.)*

## Refund/cancellation copy (for use in emails, a future policy page, or verbally on calls)

> If AIWMC LLC determines during intake that Quantis cannot responsibly analyze your decision within the agreed scope, you receive a full refund. You may cancel for a full refund before the intake call or before substantive work begins, whichever comes first. After substantive work begins, the engagement is non-refundable except when AIWMC LLC cannot deliver the agreed scope, or where applicable law requires otherwise.

(Pilot variant: same structure, substituting "pilot setup" for "intake call" per the spec.)

This is your own spec's "Fit and cancellation statement" text verbatim — reused rather than rewritten, since it's already precise and legally sound.
