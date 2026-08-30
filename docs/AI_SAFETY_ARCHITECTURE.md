# AI Safety Architecture - AIWMC Quantis

## Overview

This document describes the multi-layer security architecture designed to prevent:
1. **Prompt Injection**: Attempts to override system instructions
2. **Data Exfiltration**: Extraction of system prompts, secrets, or user data
3. **Output Manipulation**: Injection of invented numbers or malicious content
4. **Resource Abuse**: Token bombs, retry storms, and cost attacks

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER INPUT                                  │
│           (Business Idea + Location + Documents)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LAYER 1: INPUT VALIDATION                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Length limits (idea: 5000 chars, location: 200 chars) │   │
│  │ • Pattern detection (XSS, SQL injection, code injection)│   │
│  │ • Prompt injection detection (system override patterns) │   │
│  │ • Input classification (data vs instruction)            │   │
│  │ • Risk scoring (0-100, block if ≥70)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                         BLOCKED? ──────► 403 Forbidden         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LAYER 2: RATE LIMITING                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Anonymous: 1 req/hour (device_id + IP + fingerprint)  │   │
│  │ • Free tier: 3 req/month                                │   │
│  │ • Plus tier: Unlimited (30 req/hr API limit)            │   │
│  │ • Per-IP: 5 req/min, 20 req/hr                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                      RATE LIMITED? ──────► 429 Too Many Requests│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LAYER 3: COST CONTROLS                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Token limits: 4K input, 8K output, 12K total          │   │
│  │ • Daily budget: $100 USD                                │   │
│  │ • Kill switch: 50% error rate triggers shutdown         │   │
│  │ • Retry limits: 3 max with exponential backoff          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                      BUDGET EXCEEDED? ──────► 503 Service Down  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              LAYER 4: DETERMINISTIC FINANCIAL ENGINE            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • ALL NUMBERS computed here (LTV, CAC, ROI, Payback)    │   │
│  │ • Industry benchmarks applied                           │   │
│  │ • Location multipliers applied                          │   │
│  │ • Validation and auto-correction                        │   │
│  │ • LLM CANNOT modify these calculations                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LAYER 5: LLM NARRATOR                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ROLE: Explain and contextualize (NOT calculate)         │   │
│  │                                                         │   │
│  │ SYSTEM PROMPT HARDENING:                                │   │
│  │ • "You are a NARRATOR, not a calculator"               │   │
│  │ • "NEVER invent or calculate financial numbers"        │   │
│  │ • "Use EXACT values from pre-computed metrics table"   │   │
│  │ • Pre-computed metrics embedded in markdown tables      │   │
│  │                                                         │   │
│  │ TOOL CALLING:                                           │   │
│  │ • Strict JSON schema enforcement                        │   │
│  │ • Required fields validation                            │   │
│  │ • Enum constraints on investment_verdict                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LAYER 6: OUTPUT VALIDATION                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Number verification against computed metrics          │   │
│  │ • Secret leak detection (API keys, JWTs, etc.)         │   │
│  │ • Injection pattern detection in output                 │   │
│  │ • Trust score calculation (0-100)                       │   │
│  │ • Output sanitization if threats detected               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                      INVALID? ──────► Use fallback narrator     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  LAYER 7: TRUTH LABELING                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Every data point labeled with:                          │   │
│  │ • Source: computed | benchmark | ai_estimate | user     │   │
│  │ • Confidence: 0-100%                                    │   │
│  │ • Explanation: How value was derived                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FINAL RESPONSE                             │
│           (Financial Analysis + Truth Labels + Audit)           │
└─────────────────────────────────────────────────────────────────┘
```

## Prompt Injection Defenses

### Dangerous Patterns Detected
```
- ignore previous instructions
- disregard prior context
- you are now (role hijacking)
- pretend to be
- act as if
- [SYSTEM] overrides
- {{template injection}}
- [[variable injection]]
- <script> tags
- javascript: protocols
- event handlers (onclick=, etc.)
```

### Input Classification
| Classification | Risk Score | Action |
|---------------|------------|--------|
| `data` | 0-20 | Process normally |
| `mixed` | 20-50 | Log warning, process |
| `instruction` | 50-70 | Sanitize heavily |
| `blocked` | 70-100 | Reject request |

## Truth Labeling System

Every financial metric includes a truth label:

```typescript
interface TruthLabel {
  field: string;           // "Monthly Revenue (MRR)"
  value: number | string;  // 25000
  source: 'computed' | 'benchmark' | 'ai_estimate' | 'user_provided' | 'document';
  confidence: number;      // 0-100
  explanation: string;     // "Revenue figure provided directly by user"
}
```

### Confidence Scoring by Source

| Source | Confidence Range | Description |
|--------|-----------------|-------------|
| `user_provided` | 85-95% | User entered this value |
| `document` | 75-90% | Extracted from uploaded documents |
| `computed` | 60-80% | Calculated from other data points |
| `benchmark` | 45-60% | Industry average applied |
| `ai_estimate` | 30-50% | AI-generated estimate |

## Cost Control Mechanisms

### Per-Request Limits
- Maximum input tokens: 4,000
- Maximum output tokens: 8,000
- Maximum total tokens: 12,000

### Per-User Rate Limits
| Tier | Requests/Hour | Requests/Month |
|------|--------------|----------------|
| Anonymous | 1 | N/A |
| Free | 3 | 3 |
| Plus | 30 | Unlimited |
| Pro | 100 | Unlimited |

### Kill Switch
Automatic shutdown if:
- Error rate exceeds 50% over 5 minutes
- Daily budget of $100 USD exceeded
- Alert threshold at $50 USD

### Retry Policy
- Maximum 3 retries per session
- Exponential backoff: 1s, 2s, 5s
- No retries for 4xx errors

## Narrator Prompt Hardening

The LLM system prompt includes:

```markdown
## ABSOLUTE RULES (VIOLATION = SYSTEM FAILURE)
⛔ NEVER invent or calculate financial numbers
⛔ NEVER contradict the provided metrics  
⛔ NEVER include dollar amounts not listed below
⛔ NEVER say "I estimate" or "approximately" for financials
✅ Reference metrics by EXACT value: "the projected $X monthly profit"
✅ Focus on QUALITATIVE analysis and STRATEGY
✅ Explain WHY the numbers matter
```

Pre-computed metrics are provided as markdown tables that the LLM must reference:

```markdown
## PRE-COMPUTED FINANCIAL METRICS (SOURCE OF TRUTH)

| Metric | Value |
|--------|-------|
| Monthly Revenue (MRR) | $25,000 |
| Net Profit | $8,000 |
| LTV:CAC Ratio | 6x |
...
```

## Output Validation

After LLM response, the system:

1. **Parses** the structured JSON output
2. **Validates** dollar amounts cited in `executive_summary` against the computed metrics set (see "Engine vs. Narrator Conflict Resolution" below for the exact scope — this check does not cover every narrative field)
3. **Flags** any number within 10% tolerance as acceptable
4. **Blocks** invented numbers >$100 not in the computed set, for that one field
5. **Sanitizes** output if injection patterns detected
6. **Replaces** `executive_summary` with a template built purely from the computed metrics if step 4 fails (a per-field replacement, not a fallback of the entire AI response — see below)

## Engine vs. Narrator Conflict Resolution

GTM-audit item #20 (2026-08-27, Q6/Q8): "When the deterministic engine and
the AI narrator disagree, which one does the customer actually see — and
is that choice ever wrong?" Written up here for engineers touching this
code later, based on a direct read of the current implementation
(`supabase/functions/analyze-business/index.ts`,
`supabase/functions/_shared/ai-safety-guardrails.ts`).

**The two sources are independent, then merged — the narrator never sees
the final numbers.** The LLM generates its narrative prose in the same
one-shot call that also produces its own (unused-for-display) numeric
estimates. `calculateStrictFinancials()` then computes the real,
authoritative `calc` object afterward, from user inputs — the AI's own
number guesses are used only as a low-priority fallback *input* when the
user provided nothing, never displayed as a separate "AI's numbers." The
narrator is not re-run or corrected against `calc` after the fact; only
specific fields are checked/patched, per the rules below.

**For every numeric field the frontend renders as structured data
(`financial_analysis.*`), the deterministic engine always wins, by
construction.** There is no code path where an AI-generated number is
displayed as a report figure — `calc` is the only source `AnalysisResults`
and the PDF ever read. This is correct and requires no further
documentation.

**For narrative prose, only one field is checked** —
`business_plan.executive_summary` — **but as of 2026-08-29 it checks
three distinct kinds of error, not one.** `enforceNarrativeIntegrity()`:

1. Extracts every `$#,###`-style dollar figure and checks each against
   an anchor set (MRR, net profit, CAC, LTV, startup investment,
   break-even revenue, 3-year NPV, expense line items) within 10%
   tolerance — the original 2026-07-11 check.
2. (Added 2026-08-29, Phase 5 re-validation) Flags **any non-USD
   currency symbol** (€, £, ¥, ₹, ₩) appearing anywhere in the text —
   Quantis has no multi-currency support anywhere else in the product,
   so there is no legitimate reason one should appear.
3. (Added 2026-08-29) Flags a **strong, unhedged verdict claim
   contradicting `calc.isProfitable`** — e.g. "highly profitable" while
   the business is actually running a loss, or "a failing business"
   while it's actually profitable. Deliberately narrow (a small,
   explicit phrase list, not a sentiment classifier) to keep the
   false-positive rate low, since the only remedy on detection is a
   wholesale `executive_summary` replacement — a hedge like "could
   become profitable with optimization" is deliberately NOT flagged.

If any of the three trips, the **entire `executive_summary` is discarded
and replaced** with a template built purely from `calc` — not edited in
place, not flagged, replaced wholesale, exactly as before. Live-verified
via `src/__tests__/narrative-integrity.test.ts`'s conflict-fixture suite
(16 tests, including explicit false-positive-safety cases for the
hedged/plain-mention wording).

**Wrong period and stale benchmark cohort remain genuinely open.**
`NarrativeIntegrityCalc` has no period-label context (so a break-even
figure mislabeled as monthly revenue passes if the raw number happens
to match) and no dataset-version/cohort field at all (so a claim about
benchmark vintage is entirely outside what this function could check,
even in principle). Fixing either requires changing
`NarrativeIntegrityCalc`'s shape and updating its construction at the
real call site in `analyze-business/index.ts` — larger, riskier surgery
on the core analysis path than the 2026-08-29 fix's scope, deliberately
deferred rather than bundled in. If either class is reported by a
customer or found in an audit, that plumbing change is the natural next
step, following the same pattern already proven twice now for
`executive_summary`.

**Everywhere else in the narrative** (`risks`, `competitive_advantages`,
`product_description`, `launch_steps` descriptions except their `cost`
field, which is silently overwritten from `calc` after generation, and
`market_plan` text), **there is still no consistency check at all** —
this scope was never claimed to extend beyond `executive_summary`.

### Ambiguous-field ownership policy (charter 5.10, added 2026-08-29)

The fields above have no numeric-reconciliation check, but "unchecked"
is not the same as "ungoverned" — each has a real ownership rule, stated
here explicitly rather than left implicit:

| Field | Owner | Rule |
|---|---|---|
| Qualitative risks (`business_plan.risks`) | **AI narrator, fully** | Inherently a judgment call, not a derived figure — there is no engine-computed "correct" risk list to reconcile against. No numeric check is planned unless a specific risk cites a dollar figure, in which case that figure falls under `executive_summary`'s existing rule if it appears there, or is a candidate for extending the anchor-set check to this field specifically. |
| Benchmark interpretation (prose describing how the business compares to industry benchmarks) | **Split**: benchmark *values* are engine-sourced (RVCE/`benchmark_master_*` tables), interpretive *prose* is AI-authored | The underlying numbers the AI cites should reconcile with the served `benchmarks` array, but this is currently unenforced — same class of gap as wrong-period/stale-cohort above, not yet closed. |
| Market commentary (`market_analysis.*`: TAM/SAM/SOM prose, competitive landscape, growth opportunities) | **AI narrator, fully** | Describes external market context, not the business's own financials — there is no corresponding engine-computed value to check against, even in principle. |
| Recommendations (`launch_steps` descriptions, action-plan strategy text) | **Split**: `launch_steps[].cost` is engine-owned (silently overwritten from `calc` after generation, per the note above); the strategic advice/sequencing text is AI-owned | The one numeric field in this group already has engine authority; nothing else in it does or needs to. |
| Confidence labels (`quality_dimensions`, `confidence_score`) | **Engine, fully** | Computed server-side by `_shared/quality-dimensions.ts` from input completeness, data quality, and validation-rule signals — the AI narrator has no input into this score at all, so there is no narrator-vs-engine conflict possible here by construction. |

This table is the answer to "who governs this field until the code
changes" — it does not itself change what's enforced in code. Extending
enforcement to any "AI narrator, fully" or "split" row above is future
work, tracked the same way wrong-period/stale-cohort detection is
(see above): a real, scoped decision, not a silent assumption.

**AI-narration failure does not by itself trigger `report_integrity =
'BLOCK'`.** When all AI retries fail or the response doesn't parse,
`generateDeterministicFallbackResult()` builds a fully template-generated
narrative from `calc`/benchmarks (so it trivially passes the
`executive_summary` check above), and the report is marked via separate
fields — `used_fallback: true`, a human-readable `fallback_reason`,
`model: "deterministic-engine"` — rather than `report_integrity`.
`report_integrity` is escalated to `BLOCK` only by the financial-invariant
gate and reconciliation critical-check failures (see
`payback-contract.ts`'s `checkFinancialInvariants()` and
`reconciliation-check.ts`), which are orthogonal to whether the narrator
succeeded. The investment verdict itself (`deriveInvestmentVerdict()`)
always derives from `calc` on both the AI-narrated and fallback paths —
degraded narration never changes the verdict, only its labeling (see
`AccuracyTransparentResults.tsx`'s Accuracy Notice banner and
`usePdfExport.ts`'s degraded-mode PDF labeling, both from the August 25
session).

## Security Audit Logging

All security events are logged (with PII redacted):

```typescript
interface SecurityAuditLog {
  timestamp: string;
  eventType: 'input_sanitization' | 'output_validation' | 'rate_limit' | 'kill_switch' | 'cost_alert';
  severity: 'info' | 'warning' | 'error' | 'critical';
  details: Record<string, unknown>; // Sensitive data redacted
  userId?: string;
  requestId: string;
}
```

## Testing

Run the prompt injection test suite:

```bash
npx vitest src/__tests__/prompt-injection.test.ts
```

This includes 20+ adversarial prompts testing:
- System prompt extraction
- Role hijacking
- Data exfiltration
- Number fabrication
- Token bombs
- Code injection
- Output manipulation

## Incident Response

If a security incident is detected:

1. **Kill Switch Activation**: 50% error rate triggers automatic shutdown
2. **Alert Threshold**: $50 daily spend triggers admin notification
3. **Log Review**: All blocked requests logged for analysis
4. **IP Blocking**: Repeat offenders can be IP-blocked via rate_limits table

## Future Enhancements

- [ ] ML-based anomaly detection for unusual input patterns
- [ ] Real-time cost monitoring dashboard
- [ ] Automated security report generation
- [ ] Integration with external threat intelligence feeds
