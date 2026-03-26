

# Docs Studio — Button Fix + Full UI/UX Improvement Pass

## Root Cause: "Unlock All Templates" Button Not Working

The button calls `createCheckout('plus')` which invokes the `create-checkout-session` edge function. The edge function's CORS whitelist checks for `.lovable.app` and `.lovable.dev` but **NOT `.lovableproject.com`** — which is the actual preview domain. The fetch fails with `FunctionsFetchError: Failed to fetch` (CORS block). The same bug exists in `create-portal-session` and `parse-document`.

**Fix:** Add `.lovableproject.com` to the CORS check in all 3 edge functions:
```ts
const isLovablePreview = origin?.includes(".lovable.app") || origin?.includes(".lovable.dev") || origin?.includes(".lovableproject.com");
```

---

## UI/UX Issues Found + Improvements

### A. Locked Template Cards — Dead Clicks (UX Bug)
Currently clicking a locked card shows a toast error with an "Upgrade" action button — but the "Upgrade" action also fails because of the same CORS bug. Additionally, the locked cards have `opacity-60 cursor-not-allowed` but no visual upgrade CTA on the card itself.

**Fix:** Replace the disabled `Plus Only` button on locked cards with an active "Unlock with Plus" button that triggers `createCheckout('plus')` directly, styled with a subtle upgrade gradient instead of being disabled/grayed.

### B. Free Tier Banner — Pricing Says "$17/mo" But Memory Says "$49/mo"
Line 654 says `Plus ($17/mo)` which conflicts with the pricing model memory ($49/mo Plus tier). 

**Fix:** Update to the correct price or use a generic "Upgrade to Plus" without a hardcoded price.

### C. Template Card Visual Polish
- Icon containers are 56px (`w-14 h-14`) with standard rounded corners — inconsistent with the Quantis orb language used elsewhere (gradient orbs with specular highlights)
- No hover state differentiation between free and locked cards
- Missing subtle gradient backgrounds on cards matching the template color

**Fix:** Apply Quantis-style gradient orbs to template icons (matching the pattern from `AnalysisTemplatesGrid` and `QuickStartTemplates`). Add a subtle colored top-border or gradient accent per template.

### D. Page Header — "Docs Studio" Title is Plain
No icon, no branded visual. Compare with the cinematic hero on the landing page.

**Fix:** Add a small Quantis-branded icon/orb next to "Docs Studio" title. Add subtle gradient text for the heading on Plus tier ("Unlimited Access" in accent color).

### E. Invoice Manager Button — Orphaned Placement
The "Invoice Manager" button sits alone between the tier banner and the tabs with no visual context.

**Fix:** Move it into the tabs row as a third tab or into a sidebar action group. Alternatively, give it a small descriptive label.

### F. "My Documents" Tab — Empty State for Free Users
Shows a large lock icon and generic text. Could be more inviting with a preview of what document management looks like.

**Fix:** Add 2-3 blurred/ghosted sample document rows behind the lock overlay to show the value of the feature (similar to `LockedFeaturePreview` pattern).

### G. Footer Governance Line Missing on /docs
The landing page has "decision support, not investment advice" but /docs has no footer at all.

**Fix:** Add a minimal footer with the Quantis governance disclaimer.

---

## Files to Change

| File | Change |
|------|--------|
| `supabase/functions/create-checkout-session/index.ts` | Add `.lovableproject.com` to CORS |
| `supabase/functions/create-portal-session/index.ts` | Add `.lovableproject.com` to CORS |
| `supabase/functions/parse-document/index.ts` | Add `.lovableproject.com` to CORS |
| `src/pages/DocsStudio.tsx` | Fix pricing text, upgrade locked card buttons, improve header, polish template cards, enhance empty states |
| `src/styles/docs-studio.css` | Add gradient orb styles for template icons, improve locked card hover states |

## Implementation Order
1. Fix CORS in all 3 edge functions (unblocks the button)
2. Fix DocsStudio.tsx — pricing text, locked card UX, header, empty states
3. Polish docs-studio.css — template card visual improvements

