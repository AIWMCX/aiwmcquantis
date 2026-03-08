

# Brand Profile + Onboarding

## Summary

Three new files: a 3-step brand profile setup wizard, a settings page wrapper, and a logo upload service. Plus a storage bucket migration for brand assets.

## Files

| File | Action |
|------|--------|
| `src/components/docs/BrandProfileSetup.tsx` | New — 3-step wizard (Business, Brand, Billing) |
| `src/pages/settings/BrandProfile.tsx` | New — settings page wrapping the same form |
| `src/services/brand-asset-service.ts` | New — logo validation, resize via Canvas API, upload to Storage |
| `src/App.tsx` | Add route `/settings/brand` |
| Migration | Create `brand-assets` storage bucket with RLS policies |

## Component details

### BrandProfileSetup.tsx
- 3-step wizard using Dialog or inline panel (matches WelcomeModal pattern)
- Step 1 "Your Business": company_name (required), industry type (select), website, email (pre-filled from `useAuth`), phone
- Step 2 "Your Brand": logo upload via `uploadLogo()` from brand-asset-service, primary/accent color inputs (`<input type="color">`), live mini invoice preview that updates colors in real-time
- Step 3 "Billing Info": address fields, tax_id, invoice_prefix (default "INV"), payment terms select
- Saves via `useBrandProfile().upsertProfile`
- Props: `{ open, onOpenChange, onComplete }` — can be triggered from onboarding or doc generator

### BrandProfile.tsx (settings page)
- Protected route at `/settings/brand`
- Renders BrandProfileSetup in inline (non-modal) mode with a "Preview Invoice" button
- Reuses the same form component with a `mode="settings"` prop

### brand-asset-service.ts
- `uploadLogo(userId, file)`: validates type (PNG/JPG/SVG) and size (max 5MB), resizes via Canvas API to max 400x200, uploads to `brand-assets` bucket at `logos/{userId}/logo.{ext}`, returns public URL
- `deleteLogo(userId)`: removes from storage

### Storage migration
- Create `brand-assets` bucket (public: true for logo URLs in generated docs)
- RLS on `storage.objects`: authenticated users can insert/update/delete only their own path (`logos/{userId}/*`), public select for reading

### Route addition
- Add `/settings/brand` to App.tsx with ProtectedRoute wrapper, lazy-loaded

## Technical notes
- Existing `useBrandProfile` hook handles all DB operations — no new hooks needed
- Color pickers use native `<input type="color">` for zero-dependency approach
- Canvas resize creates an offscreen canvas, draws the image scaled to fit 400x200, exports as blob
- The mini invoice preview in Step 2 is a simple styled div showing company name, colors, and logo — not a full invoice render

