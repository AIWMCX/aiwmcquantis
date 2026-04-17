

## Goal
Make every letter sharply readable — bright, "shine-white" text everywhere, with Cabinet Grotesk + Apple-class typographic polish (weight, tracking, smoothing, depth).

## Root cause
1. **Dim color tokens.** On the `#070D1A` dark background:
   - `--q-text-tertiary: #64748B` → contrast 5.0:1 (passes AA, fails AAA, looks "muted/grey")
   - `--q-text-disabled: #334D6E` → contrast 2.4:1 (FAILS WCAG AA — illegible)
   - `--q-text-ghost: #1E3A5F` → contrast 1.6:1 (essentially invisible)
2. **No font smoothing globally** — Cabinet Grotesk renders thin/grey on dark without `-webkit-font-smoothing: antialiased`.
3. **Apple-style weight depth missing** — body weight is 400, which looks thin against bright backgrounds; Apple uses 400→500 on dark UI for legibility.
4. ~900 inline references push these dim tokens onto secondary copy (form hints, captions, micro labels, table cells, scenario bars, PDF chrome).

## Solution — 3 surgical edits to `src/index.css`

### 1. Brighten the entire dark-mode text scale (Apple/Linear style)
Push every text tier toward white while preserving hierarchy via **weight + opacity**, not muddy hex:

```
--q-text-primary:   #F8FAFC   (was #E2E8F0) — near-white, the "shine"
--q-text-secondary: #CBD5E1   (was #94A3B8) — bright silver, AA+ on all surfaces
--q-text-tertiary:  #94A3B8   (was #64748B) — readable grey, 7.2:1 contrast
--q-text-disabled:  #64748B   (was #334D6E) — now actually visible
--q-text-ghost:     #475569   (was #1E3A5F) — faintest legible tier
```
Light mode gets a parallel uplift (primary `#0B1220`, secondary `#1F2937`).

### 2. Apple-grade global typography base
Add to `body` / `@layer base`:
```
font-family: 'Cabinet Grotesk', -apple-system, BlinkMacSystemFont, …;
font-weight: 450;                     /* between 400/500 — Apple's trick */
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
text-rendering: optimizeLegibility;
font-feature-settings: "ss01","cv11","kern";
letter-spacing: -0.011em;             /* Apple body tracking */
color: var(--q-text-primary);
```

### 3. Depth & polish utilities
- Headlines: `text-shadow: 0 1px 0 rgba(255,255,255,0.04)` — the "shine"
- Add `.text-shine` utility (white `#FFFFFF` + subtle glow) for hero numbers/CTAs
- Force all `.text-caption`, `.text-label-sm`, `.q-form-hint`, `.text-body-sm` to use `--q-text-secondary` instead of tertiary so micro-copy stays bright
- Bump default body weight from 400 → 450 across `.text-body`, `.nav-item`, `.q-input`, `.q-btn`

### Result
- ~900 inline `text-tertiary` / `text-disabled` references **automatically brighten** because we changed the token, not the call sites — zero component edits required.
- Every screen, every form hint, every caption, every PDF preview, every dashboard label becomes crisp white-spectrum text on dark.
- Light mode (PDF / printable surfaces) also sharpens.
- Cabinet Grotesk renders the way it does on aiwmc.com — buttery, antialiased, weighty.

## Files touched
- `src/index.css` — only this file (token updates in `:root` + `.dark`, plus `@layer base` body rules and 2 utility additions).

## Out of scope (explicitly NOT changed)
- No component refactors (tokens cascade automatically).
- No layout, spacing, or color-of-data changes (verdict greens/reds/ambers stay).
- No font swap — Cabinet Grotesk stays primary.

## Verification after build
- Spot-check `/`, `/app`, `/pricing`, `/methodology`, an example page, and a PDF preview — every label/caption should now read as bright silver-white, headlines as pure white with subtle depth.

