

# Security Hardening Plan -- Airplane-Grade Engineering

## Current Security Posture (Audit Results)

**What's already secure:**
- Service role key: Only used server-side in Edge Functions (19 functions) -- never leaked to frontend
- PII encryption: Vault-managed keys with pgp_sym_encrypt for emails/phones
- Admin protection: Database trigger restricts admin role to your account only
- Rate limiting: Multi-layer (device, IP, fingerprint)
- Input sanitization: 1MB limit, regex cleaning in analyze-business

**What the scan found -- 58 findings:**
- 1 extension-in-public warning (low risk)
- 43 "Anonymous Access Policies" warnings -- RLS policies using `public` role instead of `authenticated`, allowing anon role to potentially match
- 8 data exposure error-level findings (profiles, leads, subscriptions, API keys, analyses, documents, teams, Stripe webhooks)
- 6 missing RLS protection warnings (security logs, rate limits, engagement, referrals, audit logs, exports)

## The Fix -- 3 Phases

### Phase 1: Lock Down Anonymous Access (Critical)

Add RESTRICTIVE deny policies targeting the `anon` role on every sensitive table. This is the single highest-impact fix.

**Tables to add `anon` deny policies (SELECT, INSERT, UPDATE, DELETE):**

```text
profiles, analyses, subscriptions, api_keys, api_request_logs,
documents, document_versions, document_exports, document_downloads,
branding_settings, export_jobs, user_engagement, user_notifications,
user_roles, usage_tracking, teams, team_members, team_invitations,
referral_codes, referral_conversions, referral_rewards,
subscription_audit_log, shared_reports, stripe_webhook_events,
email_send_log, email_sequence_log, email_sequences,
newsletter_sends, launch_checklists, doc_templates,
leads, security_logs, rate_limits, industry_benchmarks,
location_data, marketing_channels, risk_factors, scenario_library
```

Each table gets one migration:
```sql
CREATE POLICY "Deny anon access to [table]"
ON public.[table]
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);
```

This is a single database migration with ~38 policy statements.

### Phase 2: Tighten Edge Function Auth Patterns

Review and standardize authentication in all 19 Edge Functions:
- Public endpoints (webhooks, health-check, analyze-business): Validate via secrets/signatures, not JWT
- Protected endpoints: Use `getClaims()` pattern consistently
- Remove any comparison of raw service role key in authorization headers (warm-functions, check-lifecycle-emails) -- replace with CRON_SECRET validation only

### Phase 3: Rotate Sensitive Secrets

Rotate these secrets as a precaution (via the secrets management tool):
- ADMIN_UPLOAD_KEY
- CRON_SECRET
- STRIPE_WEBHOOK_SECRET (also update in Stripe dashboard)

The RESEND_API_KEY, STRIPE_SECRET_KEY should also be rotated from their respective dashboards (Resend, Stripe) and re-added here.

## What This Achieves

After implementation:
- Zero anonymous access to any user data table
- All Edge Functions follow consistent auth pattern
- All rotatable secrets refreshed
- Security scan should drop from 58 findings to under 10 (mostly informational)

## Files Changed

- 1 database migration (Phase 1 -- ~38 RESTRICTIVE policies)
- 2-3 Edge Functions tightened (Phase 2 -- warm-functions, check-lifecycle-emails)
- Secret rotation via tools (Phase 3)

