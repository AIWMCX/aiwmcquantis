

# QIM Explainer + Research Page Implementation

## Task 1: Add QIM Explainer Section to Methodology Page

Insert a new section between "Dual-Engine Consensus" and "Golden Test Vectors" in `src/pages/Methodology.tsx`.

**Content:**
- Section header: "Quantis Information Metric (QIM)" with a `Brain` icon
- Mathematical definition card: `QIM = A × C` where A = activation magnitude, C = causal leverage (L2 norm of gradient)
- Visual diagram showing how QIM maps to existing product features:
  - Dual-AI Consensus → implements the "A" (activation) component via agreement scoring
  - Anti-BS Validator (10-rule reconciliation) → implements the "C" (causal leverage) via adversarial rule checks
  - Combined badge: "Proto-QIM" already operational
- Three cards mapping theory to product: "Activation Magnitude → Consensus Agreement", "Causal Leverage → Reconciliation Rules", "QIM Score → Confidence Badge"
- Badge: "AIWMC Research Foundation · Proto-QIM Active"

## Task 2: Create `/research` Page

Create `src/pages/Research.tsx` — a public-facing academic-style research statement page.

**Sections:**
1. **Header** — "AIWMC Research Foundation" title, `Current Status: Pre-Discovery` badge, abstract paragraph
2. **AIWMC Definition** — "Artificial Intelligence Wave-Matter Causality" formal definition
3. **Hypothesis 1: Quantis Field** — Describes distributed causal fields vs. discrete neurons, falsification method (spectral analysis)
4. **Hypothesis 2: Causal Phase Transitions** — Emergent abilities as phase transitions, falsification method (information geometry)
5. **Hypothesis 3: QIM Metric** — Mathematical definition `QIM = A × C`, falsification method (discriminator test)
6. **Pilot Experiment Design** — "Grokking a Quantis" setup: small transformer, modular arithmetic, SVD on activation covariance matrices
7. **Citations** — 5 academic sources (Toy Models of Superposition, Lottery Ticket, Causal Tracing, Emergent Abilities, Grokking)
8. **Product Integration** — How Quantis product already implements proto-QIM principles

**Styling:** Academic formatting with serif headings for titles, monospace for formulas, numbered citations, bordered hypothesis cards.

## Files to Change

| Action | File |
|--------|------|
| Edit | `src/pages/Methodology.tsx` — add QIM section (~60 lines) |
| Create | `src/pages/Research.tsx` — full research page |
| Edit | `src/App.tsx` — add `/research` route (public) |

