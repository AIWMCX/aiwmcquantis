# AIWMC Quantis Visual System — technical spec for Content Studio's deterministic renderer

2026-09-19. Extends, does not replace, the real production code in
`supabase/functions/_shared/template-card.ts` and `_shared/image-gen.ts`.

## 0. What is already real (verified by reading the code and by actually
rendering it — not assumed)

As of `main` @ `da0ce698` (before this doc's own branch):

- **Deterministic SVG→PNG rendering already exists and is good.**
  `template-card.ts` renders a 1080×1350 card with the exact brand palette
  (`#0b0f1a` bg, `#2B7FFF` accent, `#FF4B2B` warn, `#F7F4EE` text), a bundled
  Inter font (system fonts silently render blank in resvg-wasm — already
  discovered and guarded against), a masthead ("AIWMC QUANTIS / DECISION
  NOTE"), a footer brand rail, and one chart type: a **step function**
  (`ChartInput.steps: { threshold, annotation }[]`), matching the
  "COSTS DO NOT GROW IN STRAIGHT LINES" reference asset exactly. Verified
  2026-09-19 by rendering that exact fixture with a Node-adapted copy of the
  file (same resvg-wasm version) — output matches the reference closely.
- **FLUX.1-schnell is already background-only, not chart/text-generation.**
  `content-studio-generate/index.ts` builds a `styledPrompt` that explicitly
  forbids text, numbers, charts, logos, and the "AI slop" tropes (glowing
  data streams, robot hands, neon gradients) the founder flagged. This is
  already the "FLUX may be used only for an optional low-detail background"
  rule from the brief — already shipped, not proposed.
- **A card failure never blocks the response.** Both the photo (`imageResult`)
  and the card (`cardResult`) are best-effort with independent try/catch;
  `image_error`/`card_error` are returned, never silently swallowed.
- **The LLM never invents chart/callout data.** `card_chart`/`card_callout`
  are explicitly instructed to be `null` unless the post *itself* states the
  numbers, and `content-studio-generate` re-validates every field
  server-side before rendering (type checks, step-count bounds, no
  fallback/guessed value on a malformed field — the whole object is
  discarded instead).
- **Bug found and fixed this session** (see `dff838d7` on
  `fix/content-studio-chart-callout-collision`): a chart and a callout
  together collided illegibly at the bottom of the card, because the
  callout's dynamic Y-position had no bounds check against the fixed
  disclaimer/footer zone. No existing test caught this because none of them
  actually render a PNG — they're all string-matching guards against the
  source. **This is the load-bearing lesson for everything below: a new
  chart type or mode is not verified until someone has actually rendered it
  and looked at the pixels**, the same way `dff838d7` was found and the same
  way the 17-chars/line headline budget and the font-bundling requirement
  were each found earlier in this file's own history.

## 1. What this spec adds

Three things, and only three: (A) a formal `VisualSpec` type so the render
call site has one validated shape instead of ad-hoc `card_chart`/`card_callout`
fields bolted onto the caption-generation JSON; (B) three more chart types,
because today's renderer only draws step functions and the founder's own
reference set (this doc's source images) needs two-threshold/two-line and
three-scenario charts too; (C) a `product_proof` mode for real, founder-
supplied screenshots. Everything else in the original brief (a full mode
selector UI, regenerate-only buttons, a structured claims/sourceStatus
content contract) is listed in §7 as follow-up work, explicitly out of scope
for the first PR against this spec — see §8 for why.

## 2. `VisualSpec` schema

New file: `supabase/functions/_shared/visual-spec.ts`. Runtime-validated
(hand-rolled parse function matching this codebase's existing style in
`content-studio-generate/index.ts` — no new dependency; Zod is used
elsewhere in the frontend but not in this Deno function today, and adding it
here is a one-line import if preferred, not a hard requirement of this spec).

```typescript
export type ChartType = 'step_cost' | 'two_thresholds' | 'two_lines' | 'three_scenarios';

export interface ChartSeries {
  label: string;
  color: 'cyan' | 'amber' | 'muted';
  /** Ascending by x. Caller's responsibility — never re-sorted or
   *  re-derived here, matching template-card.ts's existing step-chart
   *  contract of "never invent, estimate, or infer a value." */
  points: Array<{ x: number; y: number }>;
}

export interface ChartMarker {
  x: number;
  label: string;
  description: string;
  color: 'cyan' | 'amber';
}

export interface ChartSpec {
  type: ChartType;
  xAxisLabel: string;
  yAxisLabel?: string; // absent for step_cost, which has no numeric y-scale (see existing step-chart docblock on why it deliberately doesn't show one)
  series: ChartSeries[]; // step_cost: exactly 1 series, using its existing StepInput→ series[0].points shape internally; two_thresholds/two_lines: exactly 2; three_scenarios: exactly 3
  markers?: ChartMarker[]; // two_thresholds' BREAK-EVEN/PAYBACK-style annotations
}

export type SourceStatus = 'illustrative' | 'product_verified' | 'externally_cited';

export interface VisualSpec {
  mode: 'financial_chart' | 'editorial_headline' | 'product_proof';
  topic: string;
  headline: string; // max 7 words, enforced at validation, not just at prompt-instruction time
  subhead: string; // max 22 words
  sourceStatus: SourceStatus;
  chart?: ChartSpec; // only for mode: 'financial_chart'
  screenshotStoragePath?: string; // only for mode: 'product_proof' — a path already uploaded to the content-assets bucket, NEVER a generated image
  footer: string; // always "AIWMC QUANTIS | <tagline>" — see §2.1
  illustrativeNote?: string; // required (validation-enforced) when sourceStatus === 'illustrative' and chart is present
  cta?: string;
}

export class VisualSpecError extends Error {
  constructor(message: string, public readonly field: string) { super(message); }
}

/** Throws VisualSpecError on any invalid/unsupported spec. Never coerces,
 *  never fills a missing field with a guess — same discipline as the
 *  existing card_chart/card_callout validation in content-studio-generate. */
export function validateVisualSpec(raw: unknown): VisualSpec { /* ... */ }
```

### 2.1 Mode auto-selection

Per the brief: default to `financial_chart` when the topic contains a
financial relationship, threshold, scenario, time-series, cash, cost,
retention, or payback keyword; otherwise `editorial_headline`;
`product_proof` is **never** auto-selected — it requires the caller to
explicitly attach a real, already-uploaded screenshot path, matching the
brief's "Never generate fake dashboards" rule. Implement as a plain keyword
list in `visual-spec.ts` (`FINANCIAL_KEYWORDS`), not an LLM call — determinism
matters more than nuance here, and a wrong guess just means the model's own
`mode` suggestion (already asked for in the content-generation prompt) is
the fallback, not a fabricated financial chart on a non-financial post.

## 3. Chart rendering — extend `template-card.ts`, don't replace it

`renderChart()` currently hard-codes the step-function shape. Refactor to a
`type`-dispatched function, **keeping `step_cost` byte-identical to today's
output** (regression-tested: render the founder's reference fixture before
and after, diff the PNG bytes, must be identical) and adding:

- **`two_thresholds`**: exactly what the "Break-even is not payback" example
  needs — one cyan series (e.g. monthly operating profit) and one amber
  series (e.g. cumulative cash recovery), both drawn as real line paths (not
  step functions) against a shared x/y scale, a white/`BRAND_TEXT` zero
  baseline, and up to 2 markers (vertical tick + label pair, reusing this
  file's existing marker-label pattern from `renderChart`'s current
  `annotations` array, just parameterized by x-position instead of always
  being at a step).
- **`two_lines`**: same rendering primitive as `two_thresholds` minus the
  markers — for acquisition-vs-retention-style comparisons (this doc's own
  reference image 1) that don't have a named threshold event, just two
  diverging curves plus an "inflection point" annotation, which is really
  `two_lines` + one marker, so implement it as `two_thresholds` with an
  optional marker list rather than a fourth code path.
- **`three_scenarios`**: three series (upside/base/downside), same line
  primitive, distinguished by color (`cyan` for base, `amber` for one
  bound, `muted` gray for the other) — matches reference image 2's
  "same idea, three different forecasts" fan chart.

All three reuse: `wrapText`, `escapeXml`, the brand color constants, the
axis-label and tick rendering already in `renderChart`. The actual curve-
drawing is new (`points`-array → SVG `path d=` string, linear interpolation
between points — no smoothing/bezier, since a smoothed curve between only a
handful of caller-supplied points would visually imply more precision than
the data has, same anti-fabrication principle as the rest of this file).

**Mandatory before merging any of the three new types**: render each one at
least once with a real fixture and look at the PNG, the same way this
session's `dff838d7` fix was found. A string-matching test alone is not
sufficient evidence for a new chart type — `dff838d7` is the proof of why.

## 4. `product_proof` mode

New function, `renderProductProofCard()` in `template-card.ts` (or a
sibling file, `product-proof-card.ts`, if it diverges enough — decide during
implementation, not here). Takes a `screenshotStoragePath` already present
in the `content-assets` bucket (uploaded by a human via the Content Studio
UI, never generated), composites it onto the same 1080×1350 canvas with the
same masthead/footer/brand treatment, and — critically — **the render
function itself must refuse to proceed if no real file exists at that
storage path** (a `HEAD`/existence check against Supabase Storage before
compositing), so there is no code path, even a caller bug, that could
silently substitute a placeholder or a generated image for what's presented
as a real product screenshot. This is the one mode where "fail loudly" is
more important than "never blocks the response" — a missing product proof
should surface as `card_error`, not silently fall back to a generic card
that could be mistaken for the real thing.

## 5. Content-generation contract changes

`content-studio-generate/index.ts`'s prompt already asks for
`card_headline`/`card_subtitle`/`card_chart`/`card_callout`. Extend the
requested JSON shape to ask for a `visual_spec_hint` object shaped like
§2's `VisualSpec` minus `screenshotStoragePath` (which only a human
attaches) — same "return null / omit fields you can't ground in the post's
own text" discipline already in the current prompt for `card_chart`. Server-
side, run `validateVisualSpec()` on whatever the model returns; on
`VisualSpecError`, fall back to today's existing behavior (headline +
subtitle + no chart) rather than failing the whole generation — matching
this file's existing "a card failure never blocks the response" philosophy.

Do **not** implement the brief's separate "claims list / source status per
claim" structured-content contract in this same PR — it's a genuinely
separate, larger feature (per-claim fact-checking metadata threaded through
every platform variant, not just the visual) and bolting it onto this visual
-system change would violate "smallest complete production change." Track
it as follow-up (§7).

## 6. UI changes — `ContentStudio.tsx`

Minimal, additive:
- A `Visual format` select: Auto / Financial chart / Editorial headline /
  Product proof (product proof also needs a file-upload control, reusing
  whatever upload pattern `parse-document`/existing storage-bucket uploads
  in this app already use — check `src/pages/admin/` for an existing
  upload component before writing a new one).
- Rename the existing two-image display (`image_url` "Generated Image" +
  `card_image_url`) to a single labeled section, **"Quantis social asset
  preview"**, showing the card image as the primary artifact and the FLUX
  background photo (if any) as a clearly secondary/optional element — per
  the brief's instruction not to label a generic/unsuitable image as the
  main "Generated Image."
- Existing `Copy`/`Download` affordances are already present for text;
  add a PNG download button for the card image (currently only a signed
  URL is returned — `<a href={card_image_url} download>` is sufficient,
  no new backend work needed since Supabase Storage signed URLs already
  serve the raw bytes).

Explicitly deferred to follow-up (§7): live-preview-before-generation,
regenerate-text-only / regenerate-background-only as separate actions
(today's function always regenerates everything together — splitting that
apart is a real backend change, not a UI-only one, since caption and card
generation currently happen in one request).

## 7. Explicitly follow-up, not in this PR

- Regenerate-text-only / regenerate-background-only as independent actions.
- The structured per-claim `sourceStatus` content contract (§5).
- Admin UI merge with Autoposter (already tracked separately in
  `docs/execution/2026-09-11-autoposter-content-studio-spec.md` §Step E —
  do not duplicate that plan here).
- A `positive`/`BRAND_GOOD` callout variant — `BRAND_GOOD` is already
  defined as a color constant in `template-card.ts` today but not wired to
  any render path (see its own inline comment).

## 8. Delivery discipline for whoever implements this

Same as this session's own working method on this exact file today:

1. Read `template-card.ts`, `image-gen.ts`, and both existing test files
   in full before writing anything — they already encode real, hard-won
   lessons (font bundling, headline character budget, chart/callout
   collision) that are easy to silently regress.
2. Implement one chart type at a time, not all three at once. After each,
   render a real fixture (Node-adapted copy + `@resvg/resvg-wasm`, same
   approach used to find and verify `dff838d7` — a throwaway scratch script
   is fine, it doesn't need to live in the repo) and look at the PNG before
   writing the "it works" test assertion.
3. Every new chart type needs the same anti-fabrication guarantees the
   step-chart already has: the renderer draws exactly the points/thresholds
   it's given, never interpolates a value the caller didn't supply, never
   renders without the `sourceStatus`-appropriate disclaimer.
4. One PR per chart type or mode, matching how every other feature in this
   repo ships (see this doc's own §7 cross-reference and the git history of
   `template-card.ts` itself — `b93fd540`, `da0ce698`, `dff838d7`, each a
   single, narrow, tested change).
5. Do not touch `Autoposter.tsx`, billing, or analysis code — out of scope,
   per the original brief's own instruction.
