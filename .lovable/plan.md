

# Unified Icon, Messaging, and Tier Updates

## What's Changing

### 1. Consolidate Sparkles Icon to a Single Consistent Icon
The `Sparkles` icon from lucide-react is used in 30+ places across the app (buttons, headers, badges, nav). Instead of removing it entirely, we'll standardize to use `Zap` as the single "action/power" icon across the product, replacing all decorative `Sparkles` usage. This gives a cleaner, more professional look with one consistent symbol.

**Files affected** (Sparkles to Zap swap):
- `src/components/landing/MobileHero.tsx` (hero CTA button)
- `src/components/layout/MobileNav.tsx` (New Analysis button)
- `src/components/UpgradePrompt.tsx` (dialog title)
- `src/components/onboarding/WelcomeModal.tsx` (modal icon)
- `src/components/onboarding/QuickStartWizard.tsx` (feature list + button)
- `src/components/referral/ReferralBanner.tsx` (banner title)
- `src/components/docs/AISuggestionButton.tsx` (AI generate button)
- `src/components/landing/mini-demo/MetricsDisplay.tsx` (verdict badge)
- `src/components/pro/PlusValueIndicator.tsx` (feature icon + section headers)
- `src/pages/PlusSettings.tsx` (upgrade button)

### 2. Replace "Bank-Ready / Investor-Ready" Language
All instances of "bank-ready" and "investor-ready" will be replaced with neutral professional language:

| Old | New |
|-----|-----|
| "Bank-ready PDF exports" | "Professional PDF exports" |
| "Investor-ready reports" | "Professional reports" |
| "Investor-ready documents" | "Professional documents" |
| "Bank-ready financial model" | "Professional financial model" |
| "Investor-ready formatting" | "Professional formatting" |
| "Bank-ready projections that investors trust" | "Professional projections you can trust" |

**Files affected** (12 files listed in the search results above)

### 3. Add "Docs" Link to Landing Page Navigation
Add a `Docs` link between "How It Works" and "Pricing" in the desktop nav, and add it to the mobile nav items list. This links to `/docs` for authenticated users.

**Landing.tsx nav** (line 68-71): Add `Docs` link
**MobileNav.tsx** (line 67-74): Add `{ path: '/docs', label: 'Docs Studio', icon: FileText }` to navItems

### 4. Update Free Tier: 3 Templates + 5 Downloads/Day
Currently free tier allows 3 templates but only 1 download/day. Change to 5 downloads/day.

**`src/hooks/useDocDownloadLimit.ts`**: Change `FREE_DOWNLOAD_LIMIT` from `1` to `5`

### 5. Update Free Tier Features List on Pricing
Add docs mention to the Free tier features in the pricing section.

**`src/components/landing/PricingSection.tsx`**:
- Free features: Add "3 document templates" and "5 downloads per day"
- Plus features: Change "Bank-ready PDF exports" to "Professional PDF exports" and add "All document templates" and "Unlimited downloads"

### 6. Update Upgrade Prompt Messaging
**`src/components/UpgradePrompt.tsx`**: Replace "Document intelligence & PDF export" with "All document templates & unlimited downloads"

---

## Technical Details

- ~25 files touched, all are simple text/icon swaps
- No database changes needed
- No edge function changes needed
- The `FREE_DOWNLOAD_LIMIT` change takes effect immediately for all free users
- All Sparkles-to-Zap swaps are 1:1 import replacements

