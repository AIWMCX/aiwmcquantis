# AIWMC Quantis Incident Response Runbook

## 📋 Overview

This runbook provides step-by-step procedures for responding to incidents affecting the AIWMC Quantis platform.

---

## 🚨 Severity Classification

| Level | Impact | Response Time | Escalation |
|-------|--------|---------------|------------|
| **SEV-1 (Critical)** | Total platform outage, data breach | 15 minutes | Immediate |
| **SEV-2 (High)** | Major feature broken, 50%+ users affected | 1 hour | Within 2 hours |
| **SEV-3 (Medium)** | Minor feature broken, workaround exists | 4 hours | Next business day |
| **SEV-4 (Low)** | Cosmetic issues, documentation bugs | 24 hours | As needed |

---

## 🔥 SEV-1: Total Platform Outage

### Symptoms
- Health check returns `unhealthy`
- Users cannot access the application
- Edge functions returning 5xx errors
- Database connection failures

### Immediate Actions (First 15 minutes)

1. **Acknowledge the incident**
   - Update status page if available
   - Notify stakeholders via Slack/Email

2. **Check Lovable Cloud status**
   - Navigate to Cloud View in Lovable
   - Check edge function deployment status
   - Review recent deployments for rollback candidates

3. **Check database connectivity**
   ```sql
   -- In Cloud View > Run SQL
   SELECT NOW(); -- Basic connectivity test
   ```

4. **Check edge function logs**
   - Cloud View > Edge Functions > analyze-business > Logs
   - Look for error patterns, timeouts, or rate limits

5. **Check external dependencies**
   - AI Gateway status (Lovable AI)
   - Stripe API status (if payment-related)

### Recovery Procedures

#### Database Issues
```sql
-- Check for blocking queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
AND state != 'idle';

-- Check connection count
SELECT count(*) FROM pg_stat_activity;
```

#### Edge Function Issues
1. Check for recent deployments
2. Verify all required secrets are configured
3. Rollback to previous version if needed:
   - Revert code changes in Lovable
   - Functions auto-deploy on code changes

#### AI Gateway Issues
1. Check LOVABLE_API_KEY secret is configured
2. Verify rate limits haven't been exceeded
3. Check AI response latency in logs

### Post-Incident
- [ ] Create incident report
- [ ] Schedule post-mortem within 48 hours
- [ ] Update runbook with lessons learned

---

## ⚠️ SEV-2: Edge Function Degradation

### Symptoms
- Slow response times (>10s)
- Intermittent timeouts
- High error rate (>10%)

### Immediate Actions

1. **Check analyze-business function logs**
   - Filter for errors and timeouts
   - Look for rate limit messages

2. **Check AI token usage**
   ```
   Look for: "Token budget exceeded" or "$100 daily limit"
   ```

3. **Check database performance**
   ```sql
   -- Check slow queries
   SELECT * FROM pg_stat_activity 
   WHERE state = 'active' 
   ORDER BY query_start;
   ```

### Recovery Procedures

#### High Latency
1. Check AI response times in logs
2. Verify database indexes are being used
3. Consider implementing caching if not present

#### Rate Limiting
1. Check anonymous_usage table for abuse patterns
   ```sql
   SELECT ip_hash, COUNT(*) 
   FROM anonymous_usage 
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY ip_hash 
   ORDER BY count DESC 
   LIMIT 10;
   ```
2. Block abusive IPs if identified
3. Adjust rate limits if legitimate traffic spike

---

## 🔐 Security Incident Response

### Symptoms
- Unusual access patterns
- Failed authentication spikes
- Suspicious API usage

### Immediate Actions

1. **Check security logs**
   ```sql
   SELECT * FROM security_logs 
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC
   LIMIT 100;
   ```

2. **Check for unusual patterns**
   ```sql
   -- Check for suspicious rate limit hits
   SELECT * FROM rate_limits 
   WHERE request_count > 100
   AND window_start > NOW() - INTERVAL '1 day';
   ```

3. **Check API key usage**
   ```sql
   SELECT name, usage_count, last_used_at 
   FROM api_keys 
   ORDER BY usage_count DESC;
   ```

### Recovery Procedures

#### Suspected Data Breach
1. Immediately rotate all API keys
2. Invalidate all active sessions
3. Notify affected users if PII involved
4. Document timeline for compliance

#### Brute Force Attack
1. Temporarily increase rate limits
2. Enable additional CAPTCHA if available
3. Block suspicious IP ranges

#### Prompt Injection Detected
1. Review affected analyses in logs
2. Check AI safety guardrails triggered
3. Update input sanitization if needed

---

## 💰 Cost Spike Response

### Symptoms
- AI budget alerts triggered
- Unexpected Stripe charges
- High token consumption

### Immediate Actions

1. **Check AI cost tracking**
   - Review edge function logs for token usage
   - Calculate current daily spend

2. **Check for abuse**
   ```sql
   SELECT user_id, COUNT(*) as analysis_count
   FROM analyses
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY user_id
   ORDER BY analysis_count DESC
   LIMIT 10;
   ```

### Recovery Procedures

1. If $100 daily budget exceeded:
   - Kill switch automatically activates
   - Wait for reset at midnight UTC
   - Or manually increase budget in code

2. For abuse:
   - Identify user/IP responsible
   - Apply temporary ban
   - Review rate limiting effectiveness

---

## 🧮 Customer-Reported Math/Data Discrepancy

GTM-audit item #19 (2026-08-27, Q20): "If a customer catches a math
contradiction and emails support, is there a fast, honest response path,
or blind escalation?" This section is that path. This is the ONE
scenario in this runbook that starts from a support inbox, not a
monitoring alert, so triage looks different: you're verifying a
specific claim about a specific analysis, not scanning for a
system-wide symptom.

**Revised 2026-08-29 (Phase 5 re-validation against the ordered
execution checklist's charter 5.14-5.20):** the original version of
this section had the right instincts (never silently correct history,
always reproduce first) but was missing a defined intake path,
structured intake fields, and severity-specific response targets. This
revision closes those gaps directly rather than leaving them as prose
aspirations.

### Symptoms
- A customer replies to a report, or emails support, saying two numbers
  in their analysis (or a number and the narrative text describing it)
  don't agree with each other.
- This is distinct from "I disagree with the assumptions" — the claim
  here is an internal contradiction, not a modeling disagreement.

### Intake path

`support@aiwmcquantis.com` is already the live, product-wide support
address (footer, error boundary, and SEO/structured-data schema all
point here — this is not a new inbox to create). For a math/accuracy
report specifically, tag the thread with a `[Financial Accuracy]`
subject-line prefix the moment it's identified as this category, so it
sorts distinctly from general support in a shared inbox even without a
formal ticketing system.

Collect (or ask the customer for, if not already in the message) before
starting triage:

- **Analysis ID** and/or **report/export ID** — the specific record,
  not "my analyses in general."
- **Page or metric** — which number, on which screen or export, is in
  question.
- **Expected value** — what the customer believes it should say.
- **Observed value** — what it actually says.
- **Permission to inspect** — implicit once they've reported a specific
  analysis ID, but if the report came in vaguely ("my numbers look
  wrong"), ask for the specific analysis before proceeding — never
  guess which of a customer's analyses they mean.

### Severity

Specific to this category — distinct from the general SEV-1..4 scale
above, because "material dollar error" and "cosmetic glitch" need
different response speeds than that table encodes.

| Level | Definition | Target |
|-------|-----------|--------|
| **S0** | Active, currently-reproducible error affecting **multiple customers** (e.g. a systemic engine/reconciliation bug, not one analysis) | Acknowledge within **1 hour**; disable the affected output path (export, specific report type, or the whole analysis flow if scope is unclear) until root-caused |
| **S1** | A **material** error in one customer's decision-relevant figures (verdict, payback, profit/loss magnitude) | Acknowledge within **4 business hours** |
| **S2** | An **isolated display/export discrepancy** that doesn't change the underlying decision (e.g. a formatting/rounding inconsistency between two views of the same correct number) | Acknowledge within **1 business day** |
| **S3** | A **question or misunderstanding** — the numbers are internally consistent; the customer disagrees with an assumption or doesn't understand a label | Acknowledge within **2 business days** |

Triage lands on a tier the moment the report comes in, before full
investigation — refine down (S1→S2) if investigation shows it's less
severe than it looked, never sit on it un-tiered while you investigate.

### Immediate Actions

1. **Acknowledge within the target above**, before investigating in
   depth. A customer who caught a real bug should never wait in
   silence — see the August 25 and August 27 changelog entries
   (`src/pages/Changelog.tsx`) for the tone/precedent: direct,
   specific, no defensiveness. If the initial tier is S0, disable the
   affected output path in this same step, not after investigation
   confirms it — an S0 report is disable-first-by-definition.

2. **Pull the specific analysis and check `report_integrity`:**
   ```sql
   SELECT id, created_at, result->>'report_integrity' AS integrity,
     result->'report_integrity_issues' AS issues
   FROM public.analyses
   WHERE id = '<analysis_id>';
   ```
   - If `report_integrity = 'BLOCK'` already: the system caught this
     before the customer did. Apologize, explain what it means (see the
     Accuracy Notice banner text in `AccuracyTransparentResults.tsx`),
     and offer a free re-run. This is a UX/communication gap, not a
     math bug — the export-confirmation gate should have surfaced this
     at download time; check whether it did.
   - If `report_integrity = 'PASS'` but the contradiction is real: this
     is a genuine gap in what `checkFinancialInvariants()`
     (`payback-contract.ts`) currently checks. Continue to step 3.

3. **Reproduce the specific claim.** Manually verify the two figures the
   customer pointed at actually disagree (not a legitimate reason they
   differ, e.g. one is pre-tax and the other post-tax). Check
   `/admin/invariant-sweeps` for whether this analysis already appears
   in a recent sweep's violation list. Preserve the report as it existed
   at the time reported (the engine/formula-registry version it was
   generated under) — reproduce against a sanitized copy of the actual
   inputs, not a fresh re-run, so root-causing isn't confused by an
   unrelated engine change that happened in between.

4. **If confirmed as a real, new-class bug:**
   - Escalate to engineering the same day — this is not a queue item,
     regardless of tier.
   - Flag the specific row the same way the original 5 historical rows
     were flagged (additive `jsonb_set`, `report_integrity='BLOCK'`,
     numbers untouched) so it can't silently ship to anyone else who
     views it. Never edit or overwrite a historical numeric result
     directly — the flag is additive, the original stays intact for
     audit.
   - **Query for how many OTHER analyses share the same root cause.**
     This is what actually decides the severity tier (re-tier up to S0
     if the answer is "more than this one customer"), not the
     customer's own perceived urgency. If other customers are affected,
     proactively reach out to each of them with the same acknowledgment/
     explanation — do not wait for them to notice and report it
     separately. The original reporter finding out you fixed it for
     others without telling them is its own trust failure.
   - Fix the root cause, add it to `checkFinancialInvariants()` or the
     relevant reconciliation rule so the sweep catches it retroactively
     going forward, and add a regression test reproducing the exact
     customer-reported figures (see
     `src/__tests__/financial-invariants.test.ts` for the precedent —
     it reproduces the original CashMatch AI incident's exact numbers).
   - Add a changelog entry (`src/pages/Changelog.tsx`) once fixed and
     deployed — every confirmed defect gets both a regression test AND
     a changelog entry; the test protects the code, the changelog entry
     is the honest public record that it happened and was fixed.

5. **Close the loop with the customer**, not just internally: confirm
   what was found, what was fixed, whether their specific historical
   report needs to be regenerated to reflect the correction (say so
   explicitly either way — "your existing report is fine, no action
   needed" or "please re-run to get the corrected figures"), and offer
   to re-run their analysis. Silence after the initial acknowledgment is
   worse than a slow first response.

### Escalation

An S0 or S1 finding escalates to engineering the same day regardless of
when it was first triaged. An S0 additionally requires disabling the
affected output path immediately (step 1) — do not wait for root-cause
confirmation to protect other customers from seeing the same wrong
number.

---

## 📞 Escalation Contacts

| Role | Responsibility | Contact |
|------|---------------|---------|
| On-Call Engineer | First response | [Configure in settings] |
| Platform Lead | SEV-1 & SEV-2 | [Configure in settings] |
| Security Lead | Security incidents | [Configure in settings] |

---

## 📊 Monitoring Checklist

### Daily
- [ ] Review health check status
- [ ] Check error rates in logs
- [ ] Review rate limit triggers

### Weekly
- [ ] Review security logs
- [ ] Check AI cost trends
- [ ] Review performance metrics

### Monthly
- [ ] Rotate API keys
- [ ] Review access patterns
- [ ] Update runbook if needed

---

## 🔧 Useful Commands

### Check System Health
```bash
# Via API
curl -X POST https://gafxacjhkqsdzwwzhbor.supabase.co/functions/v1/health-check
```

### Check Rate Limits
```sql
SELECT * FROM rate_limits 
WHERE window_start > NOW() - INTERVAL '1 hour'
ORDER BY request_count DESC;
```

### Clear Old Data
```sql
-- Run scheduled cleanup
SELECT run_scheduled_cleanup();
```

### Check Active Sessions
```sql
SELECT COUNT(*) FROM auth.sessions 
WHERE not_after > NOW();
```

---

## 📝 Incident Report Template

```markdown
## Incident Report: [TITLE]

**Date:** YYYY-MM-DD
**Duration:** HH:MM - HH:MM (X hours)
**Severity:** SEV-X
**Status:** Resolved / Investigating

### Summary
Brief description of what happened.

### Timeline
- HH:MM - Issue detected
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Issue resolved

### Root Cause
Detailed explanation of what caused the incident.

### Impact
- Users affected: X
- Revenue impact: $X
- Data impact: None / Describe

### Resolution
Steps taken to resolve the issue.

### Prevention
Actions to prevent recurrence:
1. Action item 1
2. Action item 2

### Lessons Learned
What we learned from this incident.
```

---

*Last Updated: January 2026*
*Version: 1.0*
