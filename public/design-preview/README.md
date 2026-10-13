# Quantis visual rebrand — first reviewable implementation

## Scope
An isolated, noindex landing-page preview at public/design-preview/index.html.
No production homepage replacement, runtime dependencies, financial engine, auth,
billing, database, or deployment configuration changes.

Branch: design/sadewa-quantis-preview.
Open the HTML directly to review; product links explicitly open existing production
routes. On a deployed build, use /design-preview/index.html.

## Reference
The founder supplied Sadewa screenshots, three design analyses, an Extended
License PDF, and an invoice for Extended License + Figma. Do not commit those
private purchase documents. Screenshots show the Webflow edition; the license and
analyses identify Framer. This implementation reproduces the visual direction
through original HTML/CSS, rather than importing either platform's source.

## Implemented
- Deep navy / cosmic blue and white / blue theme variants.
- Oversized editorial headings, asymmetric hero, split-arrow CTAs.
- Numbered decision rows, clipped-corner panels, light/dark rhythm.
- Consultant-oriented copy with no template testimonials or invented traction.
- Explicit illustrative capacity example: 200h required - 160h available = 40h.
- Native accessible FAQ, keyboard focus, skip link, reduced-motion support.
- Responsive layouts at 760px and 1050px.
- No external fonts, libraries, requests, forms, analysis calls, or tracking.
- No indexing or sitemap entry.

## Deliberate fidelity limits
This is phase one, not a pixel-perfect or full-product rebrand.
Original editable Figma/Framer source, Satoshi font files and licensed 3D assets
were not provided in the attachments. Arial is used as a self-contained fallback.
The Q monogram and CSS blue sculpture are provisional design studies; replace
with the approved AIWMC Quantis logo treatment before promoting this design.
Motion is a restrained CSS entrance, hover transitions and smooth anchor scrolling.
The exact reference scroll-linked motion cannot be established from still images.

## Verification performed
Python standard-library HTML parsing confirmed unique IDs, valid internal
anchors, one H1, noindex metadata and five native FAQ controls.
Node --check passed for the theme script.
Product link paths were checked against the retrieved src/App.tsx routes.
Repository CSP allows this static preview's inline style/script.
No browser rendering or full repository build was executed in this environment.

## Review before integration
1. Open at 390px, 768px, 1440px; verify overflow, contrast, theme toggle, FAQ,
   keyboard navigation and reduced motion.
2. Apply approved brand assets and licensed font files when available.
3. Confirm the desired color mode and compare spacing against the reference.
4. Port approved sections into the existing React marketing components while
   retaining activation handlers, analytics, pricing data and SEO behavior.
5. Run project build and existing required checks; review an actual preview.
6. Replace the homepage only in the approved release step. Rebrand internal
   authenticated screens separately using shared tokens and existing components.

Vercel's checked-in git.deploymentEnabled is false; do not assume the draft PR
automatically creates a preview deployment.
