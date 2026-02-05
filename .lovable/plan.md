

# Professional Logo Redesign - Text Only with Premium Styling

## What You Want
Remove the background and keep only the beautiful text styling you love, but make it bigger and more professionally integrated with the website.

## Design Approach

### 1. Generate Text-Only Logo (No Background)
Create a high-resolution PNG with:
- **Transparent background** - No colored rectangle, just pure text
- **Keep the text style you love** - Rich dark blue/black glossy letters with that premium metallic sheen
- **4K quality** - Crisp at any size
- **Optimized for both themes** - The dark glossy text works beautifully against the site's light mode (white background) and will have subtle highlights visible against dark mode

### 2. Significantly Increase Logo Size
Update Header and Footer with larger, more prominent branding:

| Location | Current Size | New Size |
|----------|-------------|----------|
| Header (Mobile) | 56px (h-14) | 64px (h-16) |
| Header (Desktop) | 64px (h-16) | 80px (h-20) |
| Footer | 32px (h-8) | 40px (h-10) |

### 3. Professional Styling Optimization
- Remove shadow (not needed with transparent background)
- Remove rounded corners (text doesn't need rounded edges)
- Ensure smooth anti-aliasing with `object-contain`
- Optional: Add subtle hover effect for header logo

## Color Harmony Analysis

Your website palette:
- Light mode background: `#fafafa` (near white)
- Dark mode background: `#0a0d14` (dark navy)
- Primary accent: `#3b82f6` (bright blue)

The dark glossy text you love will:
- **Light mode**: Stand out beautifully with high contrast
- **Dark mode**: Still visible with subtle metallic highlights catching light

## Files to Modify

| File | Change |
|------|--------|
| `src/assets/aiwmc-quantis-logo-dark.png` | Regenerate with transparent background, text-only, 4K quality |
| `src/components/layout/Header.tsx` | Increase size to `h-16 sm:h-20`, remove shadow/rounded styling |
| `src/components/layout/Footer.tsx` | Increase size to `h-10`, cleaner styling |

## Technical Specifications

### Logo Generation Prompt
- "AIWMC QUANTIS" text only
- Transparent/no background
- Rich dark blue-black glossy metallic letters
- Subtle 3D depth and shine effect
- High resolution for 4K display
- Clean, professional typography

### Header Code Update
```tsx
<img 
  src={aiwmcLogoDark}
  alt="AIWMC Quantis"
  className="h-16 sm:h-20 w-auto object-contain"
/>
```

### Footer Code Update
```tsx
<img 
  src={aiwmcLogoDark} 
  alt="AIWMC Quantis" 
  className="h-10 w-auto object-contain"
/>
```

## Expected Result
A clean, professional logo that:
- Shows only the beautiful glossy text you love
- Blends seamlessly with the website (no visible background box)
- Displays larger and more prominently in the header
- Maintains consistent branding in the footer
- Looks premium and polished like a professional SaaS brand

