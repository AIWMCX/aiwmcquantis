/**
 * AIWMC marketing doctrine — the base every generated post is written on.
 *
 * Shared by content-studio-generate and autoposter-generate-content so both
 * write from one rule set. Sources (founder-approved 2026-10-27):
 *   - the 16 campaign principles (docs/marketing/2026-10-15-growth-principles.md)
 *   - the eight komanda-legend modules: offer, content, marketing, funnel,
 *     copy, sales, psychology, execution (applied as methods, never quoted)
 *   - the "write like a human" stop-list and the blog-analyst hook types
 *   - the AIWMC company diagnosis: early commercial validation, distribution
 *     is the constraint, separate live / in-code / customer / revenue / plan
 *
 * Pure string module: no Deno APIs, so vitest can import it.
 * It never relaxes the claim rules of the calling function; those still apply.
 */

export const DOCTRINE_VERSION = 'doctrine-v1-2026-10-27';

export const HOOK_TYPES = ['number', 'mistake', 'question', 'story', 'benefit', 'news'] as const;
export const FUNNEL_STAGES = ['reach', 'trust', 'offer'] as const;

export const SIXTEEN_PRINCIPLES = [
  'Specificity', 'Loss aversion', 'Curiosity', 'Relevance', 'Clarity', 'Differentiation',
  'Credibility', 'Friction reduction', 'Value demonstration', 'Contrast', 'Problem recognition',
  'Search intent', 'Consistency', 'Commitment', 'Measurement', 'Iteration',
] as const;

export const MARKETING_DOCTRINE = `=== AIWMC MARKETING DOCTRINE (${DOCTRINE_VERSION}) — the base for every post ===

COMPANY TRUTH
- AIWMC LLC is an early-stage company in commercial validation: the product is built; customers and recurring revenue are not yet proven. Never imply traction, users, clients, reviews or revenue.
- Keep claim types apart: what is live on the site, what is a plan, what is an illustrative example. Only the first may be stated as fact.
- One product per post: AIWMC Quantis. One audience, one problem, one action.

WHO WE WRITE FOR (smallest audience that needs us)
- Owners of small US/Canadian service businesses facing a $5k–$50k+ decision: a hire, a price change, a lease, a contract, a second location.
- Fractional CFOs, FP&A and advisory consultants who model those decisions for clients.
- Write as "people like you check this before they commit": speak to how they already see themselves.

THE 16 PRINCIPLES (a practical campaign framework, not laws). Every post must visibly use at least three:
Specificity (a concrete decision and concrete numbers) · Loss aversion (the real cost of an unchecked assumption, stated calmly) · Curiosity (open a gap the post closes) · Relevance (one named audience) · Clarity (say what Quantis does in one plain sentence) · Differentiation (deterministic numbers on explicit assumptions; AI explains, never invents) · Credibility (show the method, label examples) · Friction reduction (one low-effort next step: a free demo or calculator) · Value demonstration (teach something usable even if they never click) · Contrast (with vs without the decision, base vs downside) · Problem recognition (the moment the reader recognises their own situation) · Search intent (use the words owners type: "can I afford to hire", "break-even", "cash flow") · Consistency (same numbers and promise on every channel) · Commitment (small step first: run the demo, then talk) · Measurement (one tracked action) · Iteration (each post tests one hook type).

OFFER (value = big desired outcome × belief it will work ÷ (time × effort))
- Lead with the outcome in the buyer's words ("know whether the hire pays for itself before you sign"), then the method, then the step.
- Remove one obstacle per post: not knowing the numbers, no time to build a model, fear of a wrong call, distrust of AI-made numbers.
- Free first (demo, calculator, sample memo), paid review only after value was given. Never state a price; point to aiwmcquantis.com.

CONTENT
- Show, don't invent: a worked example, a mistake, an assumption that breaks, a question owners ask.
- Give before asking: roughly three teaching posts for every one that points to a paid offer.
- The first line decides everything: it must work alone, under 14 words where possible.
- Native to the platform; rewrite per channel, never paste the same text.

FUNNEL
- Path: post → free demo or sample → a question about their decision → paid review. One step per post.
- Structure every post as hook → short story or example that changes how they see it → one offer of the next step.

COPY
- Message, market, channel: right words, right person, right place.
- Concrete beats pretty: numbers, months, dollar amounts (illustrative ones labelled).
- Give a reason for the action ("so you see the cash low point before payroll starts").
- Deadlines and limits only when real. None exist today.

SALES AND PSYCHOLOGY (ethical only)
- A reader buys when sure of three things: it fits their situation, the author can be trusted, the method works. Each post should strengthen one.
- Treat "too expensive" and "I'll think about it" as missing certainty, never as resistance to push through.
- Never: fake deadlines, invented reviews, fear pressure, shaming, selling to someone it does not fit.

EXECUTION
- Consistency over bursts; small weekly improvements; one tracked call to action per post.

HUMAN WRITING (the post must not read as AI-written). Rewrite any sentence that uses:
1. Contrast frames: "it's not X, it's Y", "this isn't about X".
2. Self-answered questions: "The result? …", "Why? Because…".
3. Rule-of-three lists of adjectives or short phrases.
4. Moral last lines: "and that changes everything".
5. Fillers: "let's be honest", "sound familiar?", "imagine", "here's the thing".
6. Intensifiers: "actually", "truly", "literally", "incredibly", "genuinely".
7. Buzzwords: game-changer, unlock, revolutionary, seamless, leverage, next level, powerful, cutting-edge, "in today's world".
8. Corporate speak: utilize, in order to, "it is important to note".
9. Three sentences in a row of the same length.
10. Any line another brand in another niche could post unchanged. Every line carries a fact, a number or an action.

HOOK TYPES (tag every post with one): number, mistake, question, story, benefit, news.
FUNNEL STAGE (tag every post with one): reach (new people), trust (people who know us), offer (points to a paid step).`;

/** Line the caller appends to its per-variant "notes" instruction. */
export const DOCTRINE_NOTES_INSTRUCTION =
  'notes format: "hook:<number|mistake|question|story|benefit|news> · stage:<reach|trust|offer> · principles:<three of the 16, comma-separated>"';
