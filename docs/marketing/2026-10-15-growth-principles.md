# Quantis marketing foundation: useful persuasion and motion production

Status: review branch, not production deployment. No campaign has been activated,
no price changed, no message sent and no post scheduled by this change.

## Shared execution

`supabase/functions/_shared/marketing-principles.ts` is the common generation
policy for Content Studio, Autoposter generation and the Commercial Ops runtime.
It is a code-level policy, not a replacement for the versioned commercial
foundation in the database. Existing pricing, claims, suppression and approval
rules continue to apply. The financial-analysis engine is deliberately separate.

Select one primary persuasion principle and at most one supporting principle per
creative. A principle is a testable communication hypothesis, not a promise of
conversion. Optimize for qualified replies, completed first decisions, reviewed
memos used by customers, real payments and repeat use; report exposure/clicks
separately with denominators and internal/test exclusions.

| Principle | Quantis application | Required truth |
|---|---|---|
| Scarcity | A finite founder-assisted review intake window | Actual capacity, owner, fixed end date/timezone and consistent checkout |
| Social proof | Permissioned case or testimonial adjacent to demo | Source, permission, exact scope; ratings need platform, count, date |
| FOMO | Show a real working session, released workflow or event recap | It actually happened; illustrative cases labeled |
| Anchoring | Explain scope differences between genuine offers | Current canonical prices; no invented consultant-cost baseline |
| Charm pricing | Test presentation only after deciding positioning | No unauthorized price edits or assumption that .99 always wins |
| Loss aversion | Show the cash effect of a delayed ramp | Explicit inputs/scenarios, uncertainty; not invented money lost by waiting |
| Free effect | Useful demo leading to an appropriate paid service | Free remains useful; payment and eligibility terms visible |
| Reciprocity | Give an assumptions checklist or worked example first | No manufactured obligation or bait-and-switch |
| Decoy effect | Honest comparison of existing plan benefits | Every plan serves a real use case; no worthless artificial plan |
| Choice clarity | One main offer/CTA in each ad and landing context | Full pricing/terms stay accessible |
| Halo effect | Sadewa visual system plus a correct, readable sample | Approved logo; real screenshot; no polished contradictory financial claims |
| Framing | Scope and billing cadence near price | Approximate per-day figures labeled; full total equally prominent |
| Mere exposure | Consistent editorial series across approved channels | Deduplication, suppression and frequency limits retained |
| Commitment | Inspect one scenario, then change one assumption | Small step is useful; no unsupported completion-time promises |
| Endowment | Preserve a user's scenario and let them explore it | Existing storage/trial rights; no artificial deletion pressure |
| Bandwagon | Permissioned customer wall or participation total | Verified external people; directories/testers/grants are not paying customers |

## What can run now

Start with reciprocity + choice clarity: a fact-checked worked decision,
visible assumptions, one primary CTA to inspect the example. Use the approved
navy/blue/white brand, clear static financial numbers and purposeful motion.
Free access is not evidence that a user will never pay. Loss aversion is not a
universal 2x multiplier. $1999/month is not exactly $66/day. A discount or a
review count is evidence-dependent, not something the generator invents.

## Diwali campaign: prepared concept, inactive

Do not publish `ends tonight` or a holiday discount without all of:
- exact offer/SKU and audience eligibility;
- actual regular price, promotion price/discount, billing cadence and terms;
- start and end ISO timestamps plus IANA timezone;
- real capacity if a capacity claim is used;
- founder approval and a matching checkout configuration;
- expiration handling for queued posts, ads and landing pages.

No dates, discounts, star ratings or customer totals have been supplied. They
remain unset. The generators currently lack a trusted campaign/proof registry,
so new generated drafts containing specific urgency/rating/review patterns are
rejected for evidence review. Do not bypass this by accepting a client-provided
`verified: true`. Future permissioned claims must resolve server-owned evidence.

## Integration boundaries and limitations

The narrow deterministic text scanner supplements prompt instructions; it is
not a full semantic or multilingual verifier. It catches common English and
some Russian urgency and proof patterns. It may require a rewrite of educational
copy quoting those phrases. Human review is still necessary.

It checks new generated Content Studio variants before asset rendering and new
Autoposter copy before persistence. Commercial Ops retains its existing scanner
and adds these checks for outbound text. Existing manual drafts, already queued
posts and publishing-time campaign expiration are NOT retroactively validated
by this patch. No claim of end-to-end campaign enforcement is made.

## HyperFrames

Official source: https://github.com/heygen-com/hyperframes (Apache-2.0).
`tools/hyperframes` is an isolated, version-pinned authoring workspace. It is not
loaded into the website bundle or Supabase functions. It does not send content,
provision hosted rendering or spend model/API credits. Review rendered output
before uploading through the existing supported asset/publishing workflow.

The requested “Danyl Asylov” design repository could not be positively identified
through spelling variants. Do not install an unrelated repository. Obtain its
exact URL, then inspect its license, dependencies and fit with Sadewa.

## Claude Code continuation

Read this document and the existing Sadewa handoff; preserve concurrent work.
Run `node --experimental-strip-types --test scripts/tests/marketing-principles.test.mjs`.
Run repository checks on the exact PR head before release. No production merge
or deployment is authorized by this handoff. The old public sample-report PDF
was observed to contain conflicting figures in the preceding audit: verify a
correct replacement before making it the lead magnet or video source.

Next implementation phase, once actual campaign terms/evidence exist: add a
server-owned campaign/proof registry and revalidate at publish time; wire video
asset storage using current supported platform media upload contracts. Do not
claim an MP4 URL is supported by an image-only publisher.
