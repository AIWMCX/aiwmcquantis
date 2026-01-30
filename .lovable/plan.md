

# Security Hardening Plan: Fix Permissions & Professional Security

## Issues Identified

### 1. CRITICAL: Conflicting RLS Policy Causing Permission Errors
**Root Cause of "Missing Permissions" Dialog**

The `user_notifications` table has a conflicting policy structure:

```
Current Problem:
- "Deny anonymous access to user_notifications" → roles: {public}, cmd: ALL, qual: false
```

This policy applies to ALL roles (including `authenticated`), not just `anon`. This causes authenticated users to receive permission denied errors when accessing notifications.

**Same issue exists for:**
- `user_engagement` table
- `email_sequence_log` table  
- `subscription_audit_log` table

### 2. CRITICAL: Orphaned Pro Subscription Checks
The `verify_pro_subscription()` function now always returns `false` (Pro tier removed), but policies still reference it:

```sql
-- branding_settings INSERT policy for "Pro users can insert branding"
with_check: verify_pro_subscription(auth.uid())  -- Always returns false!

-- api_keys INSERT policy for "Pro users can insert api keys"  
with_check: verify_pro_subscription(auth.uid())  -- Always returns false!
```

This causes silent failures for Plus users trying to insert branding or API keys.

### 3. MEDIUM: Authentication Error Message Leaks User Enumeration
Current implementation in `LoginForm.tsx`:
```typescript
if (error.message.includes('Invalid login credentials')) {
  toast.error('Invalid email or password');
} else if (error.message.includes('Email not confirmed')) {
  toast.error('Please verify your email first');  // Reveals account exists!
}
```

Attackers can determine if an email is registered by trying to log in.

### 4. LOW: Extension in Public Schema
`pg_net` extension is installed in the `public` schema instead of a dedicated schema, which is a security linter warning.

---

## Remediation Plan

### Phase 1: Database Migration (Critical RLS Fixes)

**A. Fix user_notifications RLS policies:**
- Drop the problematic `Deny anonymous access to user_notifications` policy (applies to all roles)
- Create proper RESTRICTIVE policy for anon role only

**B. Fix user_engagement RLS policies:**
- Same pattern as above

**C. Fix email_sequence_log RLS policies:**
- Same pattern as above  

**D. Fix subscription_audit_log RLS policies:**
- Same pattern as above

**E. Remove orphaned Pro policies:**
- Drop `Pro users can insert branding` policy (references deprecated function)
- Drop `Pro users can insert api keys` policy (references deprecated function)

**SQL Migration:**
```sql
-- Fix user_notifications: Drop overly broad policy, add restrictive anon-only
DROP POLICY IF EXISTS "Deny anonymous access to user_notifications" 
  ON public.user_notifications;
CREATE POLICY "Deny anon access to user_notifications"
  ON public.user_notifications
  AS RESTRICTIVE
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

-- Fix user_engagement: Same pattern
DROP POLICY IF EXISTS "Deny anonymous access to user_engagement" 
  ON public.user_engagement;
CREATE POLICY "Deny anon access to user_engagement"
  ON public.user_engagement
  AS RESTRICTIVE
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

-- Fix email_sequence_log
DROP POLICY IF EXISTS "Deny anonymous access to email_sequence_log" 
  ON public.email_sequence_log;
DROP POLICY IF EXISTS "Deny authenticated access to email_sequence_log" 
  ON public.email_sequence_log;
CREATE POLICY "Only service role manages email_sequence_log"
  ON public.email_sequence_log
  FOR ALL
  USING (is_service_role())
  WITH CHECK (is_service_role());

-- Fix subscription_audit_log  
DROP POLICY IF EXISTS "Deny anonymous access to audit logs" 
  ON public.subscription_audit_log;
CREATE POLICY "Deny anon access to subscription_audit_log"
  ON public.subscription_audit_log
  AS RESTRICTIVE
  FOR ALL TO anon
  USING (false);

-- Remove orphaned Pro policies (Pro tier removed)
DROP POLICY IF EXISTS "Pro users can insert branding" 
  ON public.branding_settings;
DROP POLICY IF EXISTS "Pro users can insert api keys" 
  ON public.api_keys;
```

### Phase 2: Frontend Security Hardening

**A. Fix User Enumeration in LoginForm.tsx:**

Update error handling to use generic messages:
```typescript
if (error) {
  // Generic message prevents user enumeration
  toast.error('Unable to sign in. Please check your credentials.');
  trackEvent('login_error', { reason: 'auth_failed' });
  // Note: If email needs confirmation, Supabase sends reminder server-side
}
```

**B. Fix ForgotPasswordForm.tsx (if not already fixed):**
Ensure password reset uses generic "If this email exists..." message.

### Phase 3: Security Verification

**A. Run security scan to verify fixes**

**B. Test notification bell functionality post-fix**

**C. Verify Plus users can save branding settings**

---

## Technical Details

### Files to Modify:

| File | Change |
|------|--------|
| `src/components/auth/LoginForm.tsx` | Standardize auth error messages |
| Database migration | Fix 6 RLS policies |

### Expected Outcome:
- No more "missing permissions" errors for authenticated users
- User enumeration attack vector closed
- Plus subscribers can properly insert branding/API keys
- Security scan passes with no critical issues

### Testing Checklist:
1. Log in as authenticated user → notifications load without error
2. Update user engagement → no permission error
3. Log in with wrong password → generic error (no account existence hint)
4. Log in with unconfirmed email → generic error (no enumeration)
5. Plus user saves branding → succeeds without error
6. Run security linter → no critical findings

