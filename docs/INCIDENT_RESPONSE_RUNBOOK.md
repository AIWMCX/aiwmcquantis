# AIWMC Quantis™ Incident Response Runbook

## 📋 Overview

This runbook provides step-by-step procedures for responding to incidents affecting the AIWMC Quantis™ platform.

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
