

# Install AIWMC Quantis Logo Professionally Across All Views

## Current State

The logo appears in 4 locations, but inconsistently:

| Location | Current Implementation | Problem |
|----------|----------------------|---------|
| **Header** (`Header.tsx`) | Uses `aiwmc-quantis-logo-dark.png` always | Dark logo on dark background is invisible in dark mode |
| **Footer** (`Footer.tsx`) | Uses `aiwmc-quantis-logo-dark.png` always | Same dark-on-dark problem |
| **Landing nav** (`Landing.tsx`) | Plain text `<span>AIWMC Quantis™</span>` | No logo image at all |
| **SharedReport** (`SharedReport.tsx`) | Plain text `AIWMC Quantis™` | No logo image at all |

## What Will Change

1. **Save the uploaded logo** as `src/assets/aiwmc-quantis-logo-dark.png` (replacing current -- this is the clean text version with dark text for light backgrounds)
2. **Create a white/light version** approach: Since we only have one image (dark text on transparent), use CSS `filter: invert(1)` in dark mode to make it white -- no second file needed
3. **Install the logo image in all 4 locations** with proper light/dark mode handling

## Technical Changes

### File: `src/components/layout/Header.tsx`
- Keep importing the logo from `@/assets/aiwmc-quantis-logo-dark.png`
- Add `dark:invert` class to the `<img>` so it becomes white text in dark mode
- Remove `rounded-lg shadow-md` (those are for photo logos, not text logos)

### File: `src/components/layout/Footer.tsx`
- Same treatment: add `dark:invert` class to the footer logo `<img>`

### File: `src/pages/Landing.tsx`
- Replace the plain text `<span>AIWMC Quantis™</span>` (line 65) with the logo `<img>` element
- Import the logo asset and apply `dark:invert` for dark mode

### File: `src/pages/SharedReport.tsx`
- Replace both text logo instances (header line 137 and footer line 267) with the logo `<img>` element
- Same `dark:invert` treatment

### Asset
- Copy `user-uploads://photo_2026-02-14_14-18-42.jpg` to `src/assets/aiwmc-quantis-logo-text.png` as the primary text logo
- Keep the existing files as fallbacks

### Result
- Every place the AIWMC Quantis brand appears will show the exact uploaded logo
- Light mode: dark text logo (as-is)
- Dark mode: white text logo (via CSS invert filter)
- Consistent sizing across Header, Footer, Landing nav, and SharedReport
