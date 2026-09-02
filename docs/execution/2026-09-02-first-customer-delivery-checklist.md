# First-Customer Delivery Checklist — Founder Decision Review ($349) / Consultant Founding Pilot ($499)

Internal operating checklist. Not customer-facing. Use once per paid engagement, starting with the very first real payment.

## 0. Before sending any more payment links (one-time setup, do once)

- [ ] Add Terms of Service / Privacy Policy / Refund Policy links to both Stripe Payment Link listings (Stripe Dashboard → Payment Links → edit each → Terms of service). **Confirmed still missing** as of 2026-09-02 — live checkout page shows no consent checkbox or policy links.
- [ ] Enable Stripe's terms-consent acknowledgment checkbox on both listings (same screen, "Collect consent").
- [ ] Add the custom intake fields to both listings (Business/company name, Decision to evaluate, Deadline for Founder; Consulting firm name, Primary client type, First case/deadline for Consultant). **Confirmed still missing.**
- [x] Confirm the success/return URL contains `{CHECKOUT_SESSION_ID}` and redirects to `/engagement-intake` — **verified live 2026-09-02** by invoking `engagement-checkout` for both offer codes directly against production; both returned valid checkout URLs and the redirect is now confirmed configured on both Payment Links.
- [x] Confirm customer email is required at checkout — Stripe Checkout requires this by default; confirmed present on the live page.
- [ ] Confirm support contact is visible at checkout (currently only appears after payment, in the hosted confirmation / intake page copy — consider adding to the checkout page itself via custom text).
- [ ] Decide actual weekly capacity: max Founder Reviews/week, max Consultant Pilots/week. Write the number down somewhere you'll actually see it before saying yes to a second one.
- [ ] Prepare one reconciled sample Decision Memo (a real worked example, not a template) to show a prospect what "good" looks like before they pay. Not drafted yet — needs a real business case, not something to fabricate.
- [ ] Prepare the intake/review scheduling link (Calendly or equivalent) to send once someone reaches the confirmed-payment state.

## 1. The moment a payment happens

- [ ] Confirm the Stripe payment shows **Succeeded** in the Stripe Dashboard.
- [ ] Confirm exactly **one** row appears in `paid_engagements` for that `stripe_checkout_session_id`.
- [ ] Confirm `offer_code` and `payment_status='paid'` and the amount match what was charged ($349 or $499).
- [ ] Confirm the buyer actually reached `/engagement-intake` (check `intake_status` flips from pending once they submit).
- [ ] Confirm `intake_status = 'complete'`.
- [ ] Confirm the correct workspace loads at `/engagement-workspace` (Founder Decision Room for $349, Consultant Pilot Desk for $499, with 2 independent case tabs).

## 2. First 24 hours

- [ ] Contact the customer personally within **one business day** — don't wait for them to reach out first.
- [ ] Ask them to save their first brief in the workspace; confirm the save actually persists (reload the page, or ask them to reload and confirm data is still there).
- [ ] For the Consultant Pilot specifically: confirm each case tab holds its **own** assumptions/scenarios, not shared data (this was a real bug, fixed 2026-09-01 — worth a manual spot-check on the first real use, not just trusting the fix).

## 3. Delivery

- [ ] Run the actual Quantis analysis against what they gave you.
- [ ] Manually reconcile the economics yourself before generating the memo — this is the founder-assisted part, don't skip it.
- [ ] Generate the Decision Memo and **read it yourself** before sending — confirm it correctly reflects their decision question, assumptions, and scenarios (not boilerplate).
- [ ] Conduct the live review call.
- [ ] Deliver the memo within the promised 48-hour target (from complete intake, not from payment).
- [ ] Log any revision requested and when it was delivered.

## 4. After delivery

- [ ] Ask for honest feedback — explicitly invite criticism, not just a thank-you.
- [ ] Ask for a testimonial (only if they're genuinely satisfied — don't ask a lukewarm customer).
- [ ] Ask for one introduction to someone else who might need this.
- [ ] Record the outcome as your first real case study material — this becomes the single most useful asset for every outreach email after this one.

## What this is explicitly NOT

An owner-funded test payment is **not** a substitute for step 1 above. If you run a self-funded QA payment first, label that row/record permanently as internal QA in `paid_engagements` (e.g., a note in `consultant_notes` or a distinguishing `contact_email`) and exclude it from every revenue/conversion metric going forward. It proves the pipeline works. It does not prove anyone will pay you.
