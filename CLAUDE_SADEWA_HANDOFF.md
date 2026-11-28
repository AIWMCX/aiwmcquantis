# Claude Code handoff — Quantis / Sadewa
Updated 2026-10-14 UTC (2026-10-13 Denver).

## Start here
Repository: AIWMCX/aiwmcquantis
Branch: design/sadewa-quantis-preview
Draft PR: https://github.com/AIWMCX/aiwmcquantis/pull/228
Implementation checkpoint: 76588ca0ee761b8cb4781f9d28ade73cf80e6290
Private hosted review: https://quantis-sadewa-motion.bogdan-jelto-4862.chatgpt.site
Reference: https://sadewa-ai.webflow.io/#section-services

The hosted review may require Bogdan's signed-in account. All implementation assets are committed in this repository; access to the hosted review is not necessary to run the code locally. ChatGPT conversation history and scratch files are not shared automatically with Claude Code.

## Retrieve safely
Read repository instructions (AGENTS.md / CLAUDE.md where present), inspect git status, and preserve existing work. Fetch origin. Check out this branch only in a clean checkout, or create an isolated worktree from origin/design/sadewa-quantis-preview. Do not reset, clean, force-push, or overwrite another agent's edits.
Read:
- public/design-preview/README.md — reference evidence, behavior mapping and caveats.
- public/design-preview/index.html — complete static composition and content.
- public/design-preview/motion.css — responsive motion/style layer.
- public/design-preview/motion.js — interactions.
- public/design-preview/assets/ — Satoshi fonts, two compressed motion clips, four AVIF approach illustrations.

This is a working static design preview, NOT a completed React landing-page integration. The production landing route has not been replaced. Do not describe it as released or pixel-perfect.

## User's requested outcome
Apply Sadewa's visual composition and motion thoroughly to AIWMC Quantis in dark navy, cosmic/electric blue, white and black. Preserve the actual financial decision-support product and strengthen the path to demo, first useful analysis, pricing and contact. Include social discovery and a scrolling directory strip with an accessible full list. User supplied commercial license documentation during the design session; private invoice/license documents were deliberately not committed.

## What was done
The live Webflow template, CSS, inline scripts and interaction bundle were inspected. Browser observations covered hero/services, sticky approach imagery, pricing scramble, FAQ expansion and testimonial movement. Some hover effects were inspected in source rather than directly exercised.
Implementation includes:
- self-hosted Satoshi fonts and licensed compressed video/AVIF assets with CSS blue treatment;
- staggered word reveals, text scramble, pixel buttons/images, sticky approach and rolling step number;
- pain-point parallax, desktop horizontal comparison, hover effects and continuous text;
- showreel modal using an explicitly illustrative capacity example;
- FAQ, mobile navigation, dark/light switching, motion pause and reduced motion;
- Free/Plus/Pro feature cards linking canonical pricing without duplicating numeric prices;
- eight social links from SocialPanel.tsx; 35 entries marked live in the directory tracker as scrolling links; all 71 records in an expandable list with submission statuses.
Directory status is repository data, not fresh independent verification. No partner endorsements, follower totals, testimonials or conversion improvements are asserted.

## Integration work to complete
1. Inspect current main and this branch, package scripts, router, existing landing sections, theme system, CSP and analytics before editing. Account for any newer changes.
2. Inspect src/pages/Landing.tsx and the actual imported components. Port the reviewed composition into maintainable React components using the existing stack. Scope styles; do not install a second framework or load duplicate animation runtimes merely because Framer/Webflow were mentioned.
3. Preserve auth, onboarding, application routes, financial logic, billing and existing commercial flows. Use current source-of-truth configuration (including src/config/tiers.ts) for prices, entitlements and plan behavior.
4. Reuse current directory/social data, rather than letting the preview's static snapshot become another source of truth. Review existing /connect and /directory-tracker access before routing public visitors there. Clearly separate live listings from pending/unsubmitted destinations.
5. Use the approved AIWMC/Quantis brand asset. The preview header Q and reference-derived decorative mark are provisional; don't silently treat them as approved production logos.
6. Keep the existing canonical demo/start/contact paths operational. Reuse existing consent-aware analytics if available; add only necessary activation measurements after examining the current event model. Do not claim improved conversion until measured.
7. Compare desktop and mobile screenshots and interactions against the live reference and the blue adaptation. Check heading wraps, spacing, clipping, sticky transitions, video crop, menu, keyboard focus, modal close/focus return, touch interactions, contrast, reduced motion and horizontal overflow.
8. Run the repository's relevant build/type/lint checks and meaningful interaction checks. Inspect console and network failures, CSP and performance. Fix concrete defects; retain readable content without animation or JavaScript.
9. Keep PR #228 reviewable, document changed files, exact tested commit, evidence and remaining gaps. Production merge/release remains subject to Bogdan's approval; this handoff is not release authorization.

## Evidence and gaps
Passed: JavaScript syntax, unique HTML IDs, local section targets and local asset resolution. Native private hosting reported successful deployment of source commit 9e18591528ec9ae2e7acc1b3810e52ccdab33695 (separate Sites repository).
Not yet verified: rendered desktop/mobile preview, integrated React build, complete interactive accessibility, production performance, external listing availability or conversion impact.
The full license/invoice and earlier screenshot attachments are private session material, not repository artifacts. Do not block implementation on recovering ephemeral /tmp files; durable code, assets and reference notes are present.

## Team protocol
Use git commits and PR evidence as shared state. Before changes, read latest branch head and working tree; after changes, record what changed, what was actually tested and what remains. Preserve concurrent work and keep code/config state distinct from deployed behavior. No automatic claims that Claude has read this handoff: it becomes available when Claude fetches this branch and opens this file.
