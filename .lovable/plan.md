
## Goal
Refine `src/components/landing/FeaturedDirectories.tsx` so the "As featured in" marquee looks polished on mobile, loads smoothly on slow connections, and stops hammering the logo provider when it rate-limits.

Scope is strictly the FeaturedDirectories component plus a small new helper module. No business logic, no new routes.

## Changes

### 1. Logo loading helper — `src/lib/directoryLogoCache.ts` (new)
A small utility encapsulating provider chain, caching, and retry/backoff.

- **Provider chain** (in order, tried until one succeeds):
  1. Clearbit: `https://logo.clearbit.com/{domain}?size=128`
  2. DuckDuckGo: `https://icons.duckduckgo.com/ip3/{domain}.ico`
  3. Google s2 favicon: `https://www.google.com/s2/favicons?domain={domain}&sz=64`
  4. Local initial badge (CSS, no network)
- **Retry/backoff**: when a URL fails or returns a network error, retry the *same* provider up to 2 times with exponential backoff (300ms, 900ms) before falling through to the next provider. If a provider returns 429 or fails twice, mark it as "cool down" in memory for 60s so we don't retry it for other directories during the same page view.
- **localStorage cache** (`q.dirlogo.v1`):
  - Schema: `{ [domain]: { url: string, providerIndex: number, ts: number } }`.
  - TTL: 7 days. Stale entries are ignored and re-fetched.
  - On successful load (image `onload` fires), persist the working URL + provider index so subsequent visits skip the provider chain.
  - On total failure, persist `{ url: null, ts }` so we don't retry for 24h and immediately render the initial badge fallback.
  - Defensive `try/catch` around all `localStorage` access (Safari private mode, quota errors).
- Exposes `useDirectoryLogo(domain)` hook returning `{ src, status: 'loading' | 'loaded' | 'failed', onError }`.

### 2. Component refactor — `src/components/landing/FeaturedDirectories.tsx`

- **Mobile layout**:
  - Card `min-width`: `170px` on mobile (`sm:min-width: 200px`).
  - Reduce horizontal margin between cards on small screens (`mx-2 sm:mx-3`) and padding (`px-4 py-2.5 sm:px-5 sm:py-3`).
  - Logo tile: `w-9 h-9 sm:w-10 sm:h-10`.
  - "Featured on" label: keep at `text-[10px]` but tighten letter-spacing on mobile (`tracking-[0.14em] sm:tracking-[0.18em]`) so it doesn't wrap on narrow cards.
  - Directory name: `text-[13px] sm:text-sm`, `truncate` with `max-w-[120px] sm:max-w-none` to guarantee single-line on mobile.
  - Marquee speed: slightly slower on mobile via duration adjustment (handled in tailwind keyframe; reuse existing `animate-marquee-x`, no config change unless required — verify in `tailwind.config.ts`).
- **Skeleton placeholder**:
  - While `status === 'loading'`, render a shimmering rounded square in place of the `<img>` (uses existing tokens; subtle gradient via `bg-[var(--q-border-default)]` with `animate-pulse`).
  - Skeleton has the same dimensions as the loaded logo so there is zero layout shift when the image arrives.
- **Failure state**: when `status === 'failed'`, render the existing initial-letter badge.
- **Hydration**: read cached entry synchronously inside `useState` initializer so cards that have a cached working URL skip the skeleton entirely on subsequent visits.
- **A11y**: keep `aria-label`, add `role="img"` on the initial-badge fallback.
- **Marquee seamlessness**: unchanged duplication pattern (`[...DIRECTORIES, ...DIRECTORIES]`) and edge fade gradients are preserved.

### 3. No changes to
- Tailwind config (existing `animate-marquee-x` is reused).
- `Landing.tsx` (component is already mounted there).
- Any backend, RLS, or business logic.

## Technical notes
- Image error detection uses `<img onError>` plus a `HEAD`-less strategy (no fetch — just rely on the browser's native image loader). This avoids CORS issues with Clearbit and DuckDuckGo.
- Backoff is implemented with `setTimeout` inside the hook; cleanup on unmount via a `cancelled` flag to avoid `setState` after unmount warnings.
- The 60s in-memory provider cool-down is a module-level `Map<providerIndex, expiresAt>` — resets on full page reload, which is fine.
- localStorage key is namespaced (`q.dirlogo.v1`) so we can bump the version if the provider chain changes.

## Verification
- Visual check on the Landing page at desktop and mobile (375px) viewports.
- Throttle network to Slow 3G in DevTools and confirm skeletons render before logos pop in without layout shift.
- Block `logo.clearbit.com` in DevTools and confirm fallback chain reaches DuckDuckGo / Google / initial badge without console error spam.
- Reload the page and confirm cached logos load instantly (no skeleton flash).
