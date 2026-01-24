# AI Safety Architecture - AIWMC Quantis™

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
2. **Validates** all dollar amounts against computed metrics set
3. **Flags** any number within 10% tolerance as acceptable
4. **Blocks** invented numbers >$100 not in computed set
5. **Sanitizes** output if injection patterns detected
6. **Falls back** to deterministic narrator if validation fails

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
