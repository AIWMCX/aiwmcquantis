

## AIWMC Quantis — Design System Overhaul Plan

### Design Philosophy Alignment
Transform Quantis from "functional startup tool" → **"Bloomberg Terminal for Founders"** — dark, precise, data-dense, authoritative.

---

### Phase 1: Visual Foundation (Core Design Tokens)

**1.1 Color System Overhaul**
- Define semantic color palette: `--quantis-profit` (emerald), `--quantis-loss` (red), `--quantis-caution` (amber), `--quantis-neutral` (slate)
- Add financial-grade accent colors: `--quantis-gold` for premium/highlight, `--quantis-cyan` for data visualization
- Strengthen dark mode contrast — shift from `222 47% 6%` → richer `230 35% 4%` (deeper Bloomberg-style black)

**1.2 Typography Hierarchy**
- Add display font weight for hero numbers (`font-black` / 900)
- Enforce `tabular-nums` globally for all financial figures
- Create headline classes: `.quantis-display-xl` (hero), `.quantis-metric` (dashboard numbers)

**1.3 Spacing & Density**
- Tighten card padding on dashboard (less whitespace = more data density)
- Define consistent metric card sizing

---

### Phase 2: Landing Page Redesign

**2.1 Hero "Wow Moment"**
- Add animated metric counter that previews output (e.g., "$14,200/mo projected revenue" counting up)
- Add subtle gradient glow behind the form (financial instrument feel)
- Add "Output Preview" thumbnail — mini-screenshot of actual result showing what user will receive

**2.2 Example Gallery Transformation**
- Replace plain card list with visual showcase: each example shows key metrics as a mini-dashboard preview
- Add industry icons with branded orb gradient backgrounds
- Include "Score: 8/10" badge prominently on each card

**2.3 Trust Signals Enhancement**
- Add "Powered by" badge strip (GPT + Gemini logos styled professionally)
- Add data source badge: "1,000+ industry benchmarks"
- Real-time activity indicator: "3 analyses running now" pulse animation

---

### Phase 3: Analysis Results Page Overhaul

**3.1 Header Card Enhancement**
- Larger, more prominent Idea Score with animated ring/gauge visualization
- Add "confidence meter" visual (not just badge)
- Color-code the entire card border based on score (green/amber/red gradient)

**3.2 Metric Cards Redesign**
- Add sparkline/mini-chart in each metric card showing trend context
- Use semantic coloring consistently (profit=green, margin threshold warnings=amber)
- Add hover state showing formula breakdown

**3.3 Tab Content Density**
- Implement 2-column layouts within tabs for desktop
- Add collapsible detail sections to reduce scroll
- SWOT visualization as 2x2 visual grid (not just bullet lists)

**3.4 Empty State Transformation**
- Replace generic icon with animated preview mockup
- Show "What you'll see" with blurred/teaser metrics
- Add sample idea quick-fill buttons

---

### Phase 4: Micro-Interactions & Feedback

**4.1 Loading States**
- Custom skeleton with pulse gradient (not just gray boxes)
- Progress indicator with stage labels: "Analyzing market...", "Running scenarios..."
- Add estimated time remaining

**4.2 Success Celebrations**
- Confetti on first analysis completion (already exists — ensure it triggers)
- Score reveal animation (number counts up)
- Share modal with social preview thumbnail

**4.3 Form Interactions**
- Real-time reliability score updates as user types
- Field completion animations (subtle check marks)
- Step transition animations in wizard

---

### Phase 5: Mobile Optimization

**5.1 Touch Targets**
- Audit all buttons for 48px minimum
- Increase tab trigger sizes on mobile

**5.2 Results Scrolling**
- Sticky metric header on scroll
- Swipeable scenario selector
- Bottom sheet for detailed metric explanations

---

### Implementation Priority (Sessions)

| Session | Scope | Impact |
|---------|-------|--------|
| 1 | Color tokens + typography classes in `index.css` + `tailwind.config.ts` | Foundation |
| 2 | Landing hero redesign: animated counter + output preview thumbnail | First impression |
| 3 | Examples gallery visual upgrade | Social proof |
| 4 | Results header card: score gauge + color-coded borders | Core value display |
| 5 | Metric cards with sparklines + semantic colors | Data density |
| 6 | Empty state redesign + loading state improvements | Conversion |
| 7 | Mobile audit + touch target fixes | Accessibility |

---

### Key Files to Modify

- `src/index.css` — new CSS variables, typography classes
- `tailwind.config.ts` — extended color palette, animations
- `src/components/landing/MobileHero.tsx` — animated counter, output preview
- `src/pages/examples/ExamplesIndex.tsx` — visual card gallery
- `src/components/analysis/AnalysisResults.tsx` — header redesign, metric cards
- `src/components/layout/EmptyState.tsx` — preview mockup, sample buttons
- `src/components/analysis/WizardForm.tsx` — real-time feedback animations
- `src/pages/AppDashboard.tsx` — loading state improvements

