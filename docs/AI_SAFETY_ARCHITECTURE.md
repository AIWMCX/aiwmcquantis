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

**For narrative prose, only one field is checked, and only for one kind of
error.** `enforceNarrativeIntegrity()` extracts every `$#,###`-style
dollar figure from `business_plan.executive_summary` and checks each
against an anchor set (MRR, net profit, CAC, LTV, startup investment,
break-even revenue, 3-year NPV, expense line items) within 10% tolerance.
If any unanchored figure over $100 appears, the **entire
`executive_summary` is discarded and replaced** with a template built
purely from `calc` — not edited in place, not flagged, replaced wholesale.
This is the one and only automated "when these disagree, the engine wins"
enforcement point in the codebase.

**Everywhere else in the narrative, there is no consistency check at
all.** `risks`, `competitive_advantages`, `product_description`,
`launch_steps` descriptions (except their `cost` field, which is silently
overwritten from `calc` after generation), and `market_plan` text can all
contain a citation that doesn't match `calc`, or a qualitative claim that
contradicts the numbers (e.g. prose calling the business "highly
profitable" while `net_margin_percent` is negative), and none of it is
caught. This is a real, currently-open gap, not a hypothetical — if this
class of contradiction is reported by a customer or found in an audit,
extending `enforceNarrativeIntegrity()`'s anchor-set check to these fields
(or adding a lighter-weight sentiment/number-mention check) is the
natural fix, following the exact pattern already proven for
`executive_summary`.

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
