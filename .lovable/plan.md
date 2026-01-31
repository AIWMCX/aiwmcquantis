

# Fix Annual Stripe Payment Link Configuration

## Root Cause Analysis

The code implementation is correct - it properly passes `plus_annual` when Annual billing is selected. However, the **Stripe Payment Link itself** is misconfigured.

Looking at your Stripe checkout screenshot:
- It shows "17,00 $ в месяц" (17$/month)
- This confirms the Payment Link `aFa9AUfzN0ug4Eu9wpe7m02` is pointing to the monthly price, NOT the annual price

## Solution

### Step 1: Fix in Stripe Dashboard (YOU must do this)

1. Go to **Stripe Dashboard** → **Payment Links**
2. Find the link ending in `9wpe7m02` OR create a NEW annual payment link
3. Verify it uses the **annual price** ($168/year or $14/mo billed annually)
4. The correct annual price should show:
   - Amount: $168.00
   - Billing: Yearly (or $14/mo billed annually)
   - Trial: 14 days
5. Copy the correct Payment Link URL

### Step 2: Code Update (I will do this)

Once you confirm the correct Annual Payment Link URL, I'll update:

**File: `src/hooks/useStripeCheckout.ts`**
```typescript
const PAYMENT_LINKS = {
  plus_monthly: 'https://buy.stripe.com/28EfZi2N1gte3AqeQJe7m00',
  plus_annual: 'YOUR_CORRECT_ANNUAL_LINK_HERE',  // Update with correct link
};
```

### Verification Checklist

After the fix:
1. Select "Annual" on pricing page
2. Click "Start 14-Day Free Trial"
3. Stripe checkout should show:
   - "168 $ в год" (or "$14/mo billed annually")
   - 14-day trial
   - Then $168/year after trial

## Action Required

Please verify in Stripe Dashboard:
1. Do you have TWO separate Payment Links?
   - One for Monthly ($17/mo)
   - One for Annual ($168/year)
2. What is the correct Annual Payment Link URL?

If you only created ONE Payment Link and attached it to the wrong price, you need to either:
- Edit the existing link to use the annual price, OR
- Create a NEW Payment Link attached to the $168/year price

Once you provide the correct Annual Payment Link URL, I'll update the code immediately.

