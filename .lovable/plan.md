

# Professional Logo Integration Plan

## Current Issue

The logo in your screenshot shows "AIWMC™ / QUANTIS" with black text that appears inside a white rectangular background. This creates a visual disconnect with the dark navy site theme. The logo needs to be:

1. Optimized with white/light text for dark mode compatibility
2. Transparent background (no white box)
3. Properly sized and positioned across all touchpoints
4. Commercially polished for investor-grade presentation

## Design Solution

### 1. Generate Dual-Theme Logo Assets

Create TWO separate logo files optimized for each theme:

| Asset | Description | Use Case |
|-------|-------------|----------|
| `aiwmc-quantis-logo-light.png` | White/silver text on transparent background | Dark mode header, footer, mobile nav |
| `aiwmc-quantis-logo-dark.png` | Black/charcoal text on transparent background | Light mode, PDF exports, emails |

Typography hierarchy:
- "AIWMC™" - Smaller, refined gray/silver (parent brand)
- "QUANTIS" - Large, bold, dominant (product identity)

### 2. Update Header Component

Implement theme-aware logo switching:

```tsx
// Header.tsx
import aiwmcLogoLight from '@/assets/aiwmc-quantis-logo-light.png';
import aiwmcLogoDark from '@/assets/aiwmc-quantis-logo-dark.png';

// Inside component:
<img 
  src={darkMode ? aiwmcLogoLight : aiwmcLogoDark}
  alt="AIWMC Quantis"
  className="h-14 sm:h-16 w-auto object-contain transition-opacity hover:opacity-90"
/>
```

### 3. Update Footer Component

Same theme-aware approach with slightly smaller sizing:

```tsx
// Footer.tsx - add darkMode prop or detect via CSS class
<img 
  src={aiwmcLogoLight}  // Footer is always on dark bg in current design
  alt="AIWMC Quantis" 
  className="h-10 w-auto object-contain"
/>
```

### 4. Update Landing Page Navigation

Replace text-based branding with the actual logo image:

```tsx
// Landing.tsx nav section
<Link to={user ? '/app' : '/'} className="flex items-center">
  <img 
    src={darkMode ? aiwmcLogoLight : aiwmcLogoDark}
    alt="AIWMC Quantis"
    className="h-10 sm:h-12 w-auto object-contain"
  />
</Link>
```

### 5. Update Auth Page

Replace Brain icon + text with proper logo:

```tsx
// Auth.tsx
<div className="flex items-center gap-3 mb-8">
  <img 
    src={aiwmcLogoDark} // Auth page has light background
    alt="AIWMC Quantis"
    className="h-12 w-auto object-contain"
  />
</div>
```

### 6. Update Mobile Navigation Drawer

Replace Brain icon with logo in drawer header:

```tsx
// MobileNav.tsx
<div className="flex items-center gap-3">
  <img 
    src={aiwmcLogoLight} // Drawer uses dark background
    alt="AIWMC Quantis"
    className="h-8 w-auto object-contain"
  />
</div>
```

### 7. PDF Report Branding

Keep text-based approach for PDF compatibility, but ensure styling matches brand identity.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/assets/aiwmc-quantis-logo-light.png` | CREATE - White text logo for dark backgrounds |
| `src/assets/aiwmc-quantis-logo-dark.png` | UPDATE - Clean black text logo for light backgrounds |
| `src/components/layout/Header.tsx` | Modify - Theme-aware logo, proper sizing |
| `src/components/layout/Footer.tsx` | Modify - Use light logo, proper sizing |
| `src/components/layout/MobileNav.tsx` | Modify - Replace Brain icon with logo |
| `src/pages/Landing.tsx` | Modify - Replace text with logo image in nav |
| `src/pages/Auth.tsx` | Modify - Replace Brain icon + text with logo |

## Logo Specifications

### Light Version (for dark backgrounds)
- Text color: Pure white `#FFFFFF` with subtle silver tones
- "AIWMC™": 30% smaller, silver-gray `#B0B8C4`
- "QUANTIS": Bold, clean white with minimal glow
- Background: Fully transparent
- Format: PNG, high resolution

### Dark Version (for light backgrounds)  
- Text color: Rich charcoal-black `#1a1f2e`
- "AIWMC™": 30% smaller, dark gray `#4a5568`
- "QUANTIS": Bold, professional black
- Background: Fully transparent
- Format: PNG, high resolution

## Size Specifications

| Location | Mobile | Desktop |
|----------|--------|---------|
| Header | 56px (h-14) | 64px (h-16) |
| Footer | 40px (h-10) | 40px (h-10) |
| Landing Nav | 40px (h-10) | 48px (h-12) |
| Auth Page | 48px (h-12) | 48px (h-12) |
| Mobile Nav | 32px (h-8) | - |

## Expected Result

After implementation:

1. Logo seamlessly blends with both light and dark themes
2. No visible white box or background artifacts
3. Professional, institutional appearance matching financial SaaS standards
4. Consistent branding across all pages and components
5. Commercially ready for investor presentations

