
# AIWMC Quantis — Visual & Distribution Roadmap (Jul 6 → Aug 17, 2026)

## Design north star (locked)
**Framer-lead glassmorphism + motion + gradients**, grafted onto the existing Space Black / #8FFF2A brand.
- Palette additions: deep indigo `#0a0a1a`, electric `#4f46e5`, violet mist `#a78bfa`, cyan glow `#67e8f9` — used as **gradient washes and edge glows only**, never as flat fills that would kill the terminal feel.
- Motion: on-scroll reveal (fade+8px rise), pointer-follow gradient on hero cards, subtle noise/grain overlay on glass panels, sticky section headers with backdrop-blur.
- Typography stays Cabinet Grotesk / DM Sans / JetBrains Mono. Framer influence = layout & light, not fonts.
- Card system: single `<GlassCard>` primitive — `bg: rgba(10,10,26,0.55) + backdrop-blur-xl + 1px inner ring + gradient edge glow on hover`. Every rebuilt section consumes this one primitive.

## Per-screen decisions (landing)

| # | Section | Verdict | Why |
|---|---|---|---|
| 1 | Three Engines / Outputs | **Redesign** | Content is right; execution is 2D-flat. Rebuild with GlassCard + animated engine icons + live-looking micro-metrics. |
| 2 | See It In Action | **Redesign** | Two-card layout is fine; make left card the hero (bigger, embedded PDF thumbnail preview, motion). |
| 3 | Testimonials | **REMOVE** (user decision) | Delete `Testimonials.tsx` from landing until real linkable profiles arrive. Replace with a **"Vetted by the numbers"** strip: 95,500 benchmarks · dual-AI · SOC 2 posture · SBA/BLS/Census/OECD/IBISWorld source logos. |
| 4 | How It Works | **Redesign** | Same GlassCard treatment; add a connecting animated gradient line between 01→02→03. |
| 5 | Featured Directories | **KEEP + polish** (user override) | Convert flat chips to hoverable glass pills with favicon + rank badge; add subtle marquee on mobile. |
| 6 | Open the Hood | **Full redesign** | Currently looks like a 2D game menu. Rebuild as a **split terminal**: left = live-scrolling P&L rows in JetBrains Mono, right = risk bars that fill on view + real "Download example PDF" CTA. |
| 7 | Founder Story | **KEEP, restage** | Trust asset for a solo-founder SaaS. Restage as a magazine-style pull-quote with founder portrait, engraved wordmark background, single CTA. |
| 8 | Lead Capture Kit | **DEMOTE, don't delete** | Distribution matters. Shrink from full section → inline row inside footer newsletter block. Frees vertical space. |
| 9→10 | Bottom CTA | **Redesign + add nav** | Replace pale-blue billboard with dark glass CTA. **At max scroll, inject a "Explore Quantis" nav grid** (Use Cases · Examples · Risk Gallery · Pricing · Who Uses · Blog · Methodology · Status) — 4×2 icon+label tiles above the footer. |

## Task list (dated, 15 items)

**Phase 1 — Foundation (Jul 6 – Jul 12)**
1. **Jul 6–7** · Build `GlassCard`, `GradientEdge`, `SectionHeader`, `Reveal` primitives + tokens in `index.css` and `tailwind.config.ts`. Add scroll-reveal hook (`useReveal`). *Blocks everything else.*
2. **Jul 8** · Delete `Testimonials` import + section from `Landing.tsx`. Build `TrustStrip.tsx` replacement (source logos + counters).
3. **Jul 9** · Redesign screen 1 (`QuantisOutputs.tsx`) with GlassCard + animated icons.
4. **Jul 10** · Redesign screen 2 (`ProgressiveEngagementCTA.tsx` / See It In Action).
5. **Jul 11** · Redesign screen 4 (`HowItWorksSection.tsx`) + gradient connector line.
6. **Jul 12** · Redesign screen 5 (`FeaturedDirectories.tsx`) — glass pills, favicons.

**Phase 2 — High-impact rebuilds (Jul 13 – Jul 19)**
7. **Jul 13–14** · Rebuild screen 6 (`OpenTheHood.tsx`) as split terminal (biggest visual win).
8. **Jul 15** · Restage screen 7 (`FounderStory.tsx`) magazine-style.
9. **Jul 16** · Demote screen 8 lead capture → merge into footer newsletter. Update `Footer.tsx`.
10. **Jul 17** · Redesign screen 9 bottom CTA + build screen 10 "Explore Quantis" nav grid.
11. **Jul 18–19** · Landing regression pass: mobile, dark/light, motion-reduced, Lighthouse ≥ 90, CLS ≤ 0.05.

**Phase 3 — Inner pages (Jul 20 – Aug 3)**
12. **Jul 20–22** · **Who Uses Quantis** page — restructure into 3 personas (Founders / Consultants / Builders) with glass persona cards, per-persona proof, per-persona CTA. Applies global primitives.
13. **Jul 23–26** · **Use Cases / Examples** pages — kill the LLM-wrapper look. Each example becomes a case-study card with: verdict badge, key metric tiles, embedded chart, "Read full case" link. Same GlassCard system.
14. **Jul 27 – Aug 3** · **Blog pipeline overhaul** — audit all posts, flag AI-slop / missing images / missing sources; add cover-image requirement, source-links block, author box, category taxonomy; ship new `BlogIndex` + `BlogPost` templates with reading time, share bar, related posts. Add editorial checklist doc so future AI-drafted posts don't ship raw.

**Phase 4 — Global polish (Aug 4 – Aug 17)**
15. **Aug 4–17** · **Global visual layer pass**: apply GlassCard/Reveal/GradientEdge to every remaining page (Pricing, FAQ, Auth, Settings, Admin, Dashboard, Results, Docs Studio). Founder-review checkpoint at Aug 10 and Aug 17.

## Kept / removed / deferred summary
- **Removed now:** Testimonials section (task 2).
- **Kept per user override:** Featured Directories (redesigned, task 6).
- **Kept, restaged:** Founder Story (task 8).
- **Demoted:** Lead Capture Kit → footer row (task 9).
- **Added:** Trust Strip, Explore Quantis nav grid, Blog editorial checklist.
- **Deferred to a future round:** real linkable testimonials (waiting on user-supplied profile URLs); real Framer-style WebGL hero (out of scope for this pass).

## Technical notes (for the implementer)
- All new tokens land in `src/index.css` under `:root` and dark class — no hardcoded hex in components.
- Motion via CSS + `useReveal` (IntersectionObserver); no new dependencies. If Framer-Motion is later requested, add in a separate task.
- `PageSEO` canonicals must be re-verified after any route/section rename.
- No changes to `financial-engine.ts`, `quantis-math.ts`, RLS, or edge functions in this roadmap — presentation only.
- Each phase ends with a build + Playwright screenshot pass at 1440 and 390 widths, saved to `/tmp/browser/` for founder review.

## What I need from you to unblock Phase 3
- Task 12: 3 real founder/consultant/builder quotes (or approve placeholder personas without names).
- Task 14: confirm which existing blog posts to keep vs archive vs rewrite.

Approve this plan and I'll start Phase 1 task 1 (design primitives) immediately.
