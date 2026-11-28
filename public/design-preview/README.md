# Quantis / Sadewa motion study 02

This replaces the first static approximation with a source-informed motion study.
It remains an isolated, noindex preview. Production homepage, application logic,
billing, data, authentication and deployment configuration are unchanged.

## Live reference inspection — 2026-10-13
Reference: https://sadewa-ai.webflow.io/#section-services
Fetched the page HTML, stylesheet, inline scripts, Webflow loader and ix3
interaction chunk. Inspected the live homepage and interacted with services
navigation, scrolling, the monthly pricing switch and the FAQ.

| System | Reference evidence | Quantis implementation |
|---|---|---|
| Typography | CSS @font-face: Satoshi Regular, Medium, Bold | Self-hosted Regular and Bold |
| Hero | Word reveal .75s, .075s stagger, 20px horizontal movement | Native CSS word reveal with same duration/stagger |
| Hero / CTA visuals | HTML contains two autoplay muted loop MP4 sources | Self-hosted compressed copies; CSS blue hue treatment |
| Navigation | .75s power3.out, down hides / up reveals; visually confirmed return on upward scroll | Direction-aware sticky nav; remains visible for keyboard focus |
| Buttons | Source creates two rows of ~60px cells; random 40ms stagger, >=.5s total | Two-row randomized pixel fill, keyboard-focus equivalent |
| Labels | Source: 50ms/char, 300ms scramble, 40ms tick | 30ms/char, 300ms scramble, 40ms tick; readable assistive text |
| Images | Pixel reveal, ~60px cells | Randomized 8x6 pixel reveal |
| Hover images | Source: three ghost fragments, five flickers over .2s | .2s transform glitch approximation on example memo |
| Ticker | ix3: 10s, x 0 to -50%, infinite | 24s loop with hidden duplicate content and pause on hover |
| Pain points | Staggered entry/glitch then scroll parallax, -400 to -510px | Sticky scene with gentler parallax; no flashing clone slices |
| Services | Live screenshot confirms two large + three smaller cards | Five-card layout with blue reference illustrations |
| Approach | Live active image changed from Scale arrow to Build icon on upward scroll; source rolling numeral .6s, pixel swaps .1-.3s | Four sticky illustrations, rolling number, pixel transition; responsive mobile stage |
| Carousel | Live template cycles testimonials | Manual three-slide decision-principles carousel; no invented endorsements |
| Comparison | ix3 horizontal title-out/card-in desktop scrub | Desktop sticky horizontal transition; static on small/reduced-motion screens |
| Pricing | Live monthly click produced scramble, then 999 / 2499 / 0 | Three plan cards, scrambling billing labels, links to canonical pricing |
| FAQ | Live click opened 64px answer; other answers remained 0px | Native details controls with entrance motion |
| Cursor | Source contains custom cursor labels and pointer tracking | Optional case hover hint, native pointer retained |
| Mobile menu | Source .4s height, .1s item stagger | Disclosure with .4s entrance and .1s item stagger |

The original Enterprise value turning to 0 on the monthly toggle was observed;
that content defect is not carried over. Quantis features are taken from the
retrieved src/config/tiers.ts, not from Sadewa. Numeric pricing remains linked to
its canonical source rather than duplicating a second pricing configuration.

## Asset provenance
Reference base: https://cdn.prod.website-files.com/69b3dcd6dbb0a39643fb1ff8/
- satoshi-bold.woff2: 69b3e2c03ef97360f03e8556_Satoshi-Bold.woff2
- satoshi-regular.woff2: 69b3e2c0d89a8f900cb50290_Satoshi-Regular.woff2
- step-0.avif: 69b630e5cf6cdcabfa46d22a_di47IMj3jrE8zC6ccDrzBzwdJc.avif
- step-1.avif: 69b630e621961b3c3ac38e5c_RPXioMibiR0UBtQ83nrh3D7Cs.avif
- step-2.avif: 69b630e5b26eba6786b27541_80s2lDvxr8FE6Oe7H9lJXgiFw.avif
- step-3.avif: 69b630e654938d4c7c7e8423_yz7pYNL4efoGP3U1LdBE2DvUTk.avif
Video base: https://s3.amazonaws.com/webflow-prod-assets/69b3dcd6dbb0a39643fb1ff8/
- hero.mp4: 69b43f98a675d5f81cca0956_BKqcImNc0IPnvM0VnmLueOSuI.mp4
- closing.mp4: 69b661d988851f59ecf97a44_buMw1tJza1Sz8WQ3GmAB16KkSJY.mp4
Videos resized to 640px/480px and encoded H.264 CRF30, no audio, fast-start.
Assets are included for the founder-authorized Sadewa adaptation, not a template
redistribution product. Private purchase documents are not committed.
The sculptural symbol is the reference template asset, not an approved Quantis
logo. The header Q treatment remains a design study pending approved brand art.

## Improvements and deliberate differences
- No mandatory loading curtain or wheel hijacking; content exists before JS.
- One local JS file instead of duplicate runtime/plugin loads.
- Animation pauses offscreen for videos; pause control and reduced-motion support.
- Native keyboard controls, accessible modal, no cloned testimonial claims.
- No fake client logos, fake team, counters, or outcome guarantees.
- Native CSS/JS implementation rather than introducing Framer/Webflow hosting.
- Recreated effects are documented as approximations, not 100% measured fidelity.

## Verification
Passed: node --check motion.js; unique HTML IDs; internal anchors;
all local HTML/CSS asset references resolve. Total static bundle about 550 KB.
Browser interactions were verified on the REFERENCE. The new preview has not
received rendered desktop/mobile QA in this runtime: the managed Sites workflow
requires control-browser, which was not exposed at implementation time.
No full Quantis build or production verification is claimed.

## Integration gate
Review the hosted study at desktop and mobile widths, both themes, reduced motion,
keyboard navigation, modal, carousel, billing selector, and scroll transitions.
Then port approved components into React, reusing current routing, SEO, funnel
tracking and canonical tier configuration. Review the actual logo treatment.
Merge/deployment of the Quantis production homepage remains a separate step.

## Discovery and conversion follow-up
Eight social links are sourced from `SocialPanel.tsx`. The scrolling strip includes all 35 entries marked live in `directorySubmissions.ts`; the expandable list includes all 71 entries with explicit submission status. These are repository records, not a new independent verification of each external page. No follower totals or partner endorsements are inferred. The strip pauses on hover/focus and obeys global motion pause/reduced motion. Existing demo, free-start, pricing and contact destinations remain canonical Quantis routes. Conversion impact is unmeasured.
