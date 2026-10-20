# Sadewa motion system — where anime.js applies

Status: v1, 2026-10-14. Governs motion for every surface that adopts the Sadewa layer (`.sdw` / `.sdw-dark`). Companion to `src/styles/sadewa.css` and `src/components/sadewa/primitives.tsx`.

## One rule above all

Motion is for the marketing story, never for the user's numbers. Anything inside a Decision Run result — verdict, payback, break-even, margins, scenario values, PDF previews — renders at its final value instantly. A user who sees a payback figure counting up reads it as uncertain or fake. No `RollingNumber`, `WordStagger`, or scramble inside `/app/**` result screens.

## Two engines, one job each

| Use CSS (`sadewa.css`) when… | Use anime.js (`animejs` v4) when… |
|---|---|
| a single element fades/slides once (`InView`, `.sdw-in`) | many elements need coordinated timing (`stagger`) |
| a loop is constant (`Marquee`, `.sdw-bob`) | a value tweens and is written to the DOM (`RollingNumber`) |
| hover/focus state changes (split-button icon) | a sequence has ordered steps (future: `createTimeline`) |

Do not port working CSS motion to anime.js for its own sake. `InView`, `CharReveal`, `ScrambleText`, `Marquee`, `SegmentRule` stay as they are.

## Primitive inventory

| Primitive | Engine | Use it for |
|---|---|---|
| `InView` | CSS | default reveal for blocks and cards |
| `CharReveal` | CSS | one lead paragraph per page, maximum |
| `ScrambleText` | rAF | mono labels, footer headings |
| `SegmentRule`, `SectionLabel` | CSS | every section opener |
| `Marquee` | CSS | directory / logo strips |
| `WordStagger` | anime.js | the single most important headline on a page (hero, final CTA) |
| `RollingNumber` | anime.js | marketing stats with a real numeric source (counts, not claims about the user) |

Budget per page: one `WordStagger`, one `CharReveal`, any number of `InView`. More than that and the page feels busy instead of confident.

## Hard requirements for any new motion

1. Respect `usePrefersReducedMotion()` — reduced users get the final state on first paint, no animation.
2. One-shot. Reveal once per page view; never re-animate on scroll back.
3. Accessible text. Animated glyphs are `aria-hidden`; the real value is in `aria-label` (headings) or an `sr-only` copy (inline spans — `aria-label` on a bare `<span>` is ignored).
4. React owns the DOM. Never use anime's `splitText` on React-rendered nodes; render the spans in JSX and animate them.
5. Only numbers with a canonical source. `RollingNumber` takes values from `canonical-facts.ts` or real data (e.g. directory count) — never a hand-typed figure.
6. Animate `opacity` and `transform` only. No width/height/top tweens.

## Where it goes next, by existing rollout phase

**Phase 0 — homepage (live layer, PR for this doc):**
- Hero headline → `WordStagger` ✅
- "Listed on N directories" → `RollingNumber` ✅
- `TrustStrip` stat values → `RollingNumber`, fed from `BENCHMARK_COUNT` (numeric) not `BENCHMARK_COUNT_DISPLAY` (string). Not yet done.
- `HowItWorksSection` sticky numeral (`01`→`04`) → a step-change roll. Needs a small extension: `RollingNumber` currently animates once on view; a step numeral must animate on every value change. Build as `StepNumeral`, separate primitive.
- `FinalCTA` headline → `WordStagger`.

**Phase 1 — `PublicPageShell` (33 public pages):** page H1 → `WordStagger` via the shell, so every inner page inherits it from one place instead of 33 edits.

**Phase 2–3 — page bodies and non-shell public pages (`/pricing`, `/how-it-works`, `/auth`, demos):** `InView` only. Pricing values must NOT roll — buyers compare prices, they need them static.

**Phase 4–5 — app shell and decision screens:** structural motion only (sidebar/route transitions, panel reveals). Results stay instant (see the rule at the top).

**Phase 6 — admin:** none.

## Verification checklist per PR

- typecheck + eslint clean
- desktop and 375px mobile screenshots: headline wraps, no overflow, final state correct
- reduced-motion: content visible immediately
- screen reader text: one copy of every heading/number, no duplication
- note: the in-app browser pane may not paint frames while unfocused (rAF/IntersectionObserver stall) — front the tab before judging a stuck animation as a code bug
