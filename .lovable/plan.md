
# Professional Logo Enhancement Plan

## Current Issue
The current dark-themed logo has visibility problems with letters blending into the background, and you need a larger, professionally designed logo with clear, crisp text that has no visible color boundary artifacts.

## Design Approach

### 1. Generate Professional High-Quality Logo
Using AI image generation to create a refined version with:
- **Clear, bold typography** - All letters fully visible with high contrast
- **Seamless color integration** - No visible edges or boundary artifacts
- **Dark navy background** matching the site palette (`#0a0d14` / `hsl(222, 47%, 6%)`)
- **Pure white text** for maximum readability
- **Clean, minimal design** - Professional SaaS aesthetic
- **Higher resolution** for crisp display at larger sizes

### 2. Increase Logo Size in Header
Update the Header component to display a larger logo:
- Mobile: `h-12` (48px) - up from `h-10` (40px)
- Desktop: `h-14` (56px) - up from `h-12` (48px)
- Add subtle shadow for depth and professional polish

### 3. Update Footer Branding (Optional Enhancement)
Replace the Brain icon + text in the Footer with the same professional logo for consistent branding across the site.

## Files to Modify

| File | Change |
|------|--------|
| `src/assets/aiwmc-quantis-logo-dark.png` | Replace with professionally generated high-quality logo |
| `src/components/layout/Header.tsx` | Increase logo size classes and add shadow styling |
| `src/components/layout/Footer.tsx` | (Optional) Replace Brain icon with logo image |

## Technical Details

### Logo Specifications
- Format: PNG with transparency
- Background: Dark navy `#0a0d14`
- Text: Pure white `#FFFFFF` with slight glow/shadow for separation
- Typography: Clean sans-serif, bold weight
- Content: "AIWMC Quantis" with AI/brain subtle element
- Aspect ratio: Horizontal/landscape for header placement

### Header Styling Update
```tsx
<img 
  src={aiwmcLogoDark} 
  alt="AIWMC Quantis" 
  className="h-12 sm:h-14 w-auto object-contain rounded-md shadow-sm"
/>
```

## Expected Result
A crisp, professional logo that:
- Has perfectly readable text with no color bleeding
- Scales beautifully at larger sizes
- Integrates seamlessly with the dark site theme
- Maintains consistent branding across header and footer
