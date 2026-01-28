
# Fix Missing User Profiles and Subscriptions

## Problem Summary

A critical database trigger issue has left **6 out of 7 users without profiles or subscriptions**. When these users try to use the app, they experience failures because their required records don't exist.

---

## Analysis Results

### Current State
| Metric | Count |
|--------|-------|
| Total Users (auth.users) | 7 |
| Profiles (public.profiles) | 1 |
| Subscriptions (public.subscriptions) | 1 |
| **Users Missing Profiles** | **6** |

### Affected Users
1. sashaulizski@gmail.com (Jan 1)
2. saych.88@gmail.com (Jan 10)
3. nevulis22@gmail.com (Jan 12)
4. alekspro100@gmail.com (Jan 20)
5. toqeer@stesting.com (Jan 21)
6. xhdydydgxydhfgy@gmail.com (Jan 22)

---

## Fix Plan

### Step 1: Backfill Missing Profiles

Insert profile records for all users who don't have one, using their metadata:

```text
SQL Migration:
- Insert into profiles for users missing profiles
- Use full_name from raw_user_meta_data
- Encrypt phone if provided in metadata
```

### Step 2: Backfill Missing Subscriptions

Create free subscription records for all users missing them:

```text
SQL Migration:
- Insert free subscriptions for users without subscriptions
- Set status = 'active'
- Set plan_id = 'free'
```

### Step 3: Strengthen the Trigger

Modify the `handle_new_user()` function to be more robust:
- Add error handling with fallback
- Log failures for monitoring
- Ensure it never silently fails

### Step 4: Add Monitoring

Create a scheduled function to detect orphaned users (users without profiles) and alert.

---

## Technical Details

### Migration 1: Backfill Profiles

```sql
INSERT INTO public.profiles (id, full_name, phone_encrypted, created_at)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', 'User'),
  CASE 
    WHEN u.raw_user_meta_data->>'phone' IS NOT NULL 
     AND u.raw_user_meta_data->>'phone' != ''
    THEN public.encrypt_pii(u.raw_user_meta_data->>'phone')
    ELSE NULL
  END,
  u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
```

### Migration 2: Backfill Subscriptions

```sql
INSERT INTO public.subscriptions (user_id, plan_id, status, created_at)
SELECT 
  u.id,
  'free',
  'active',
  u.created_at
FROM auth.users u
LEFT JOIN public.subscriptions s ON s.user_id = u.id
WHERE s.user_id IS NULL;
```

### Migration 3: Improve Trigger Robustness

Update `handle_new_user()` to:
1. Use EXCEPTION block to catch errors
2. Log failures to security_logs table
3. Never fail silently

---

## Files to Modify

| File/Resource | Changes |
|--------------|---------|
| Database Migration | Backfill 6 profiles |
| Database Migration | Backfill 6 subscriptions |
| Database Function | Update handle_new_user() with error handling |

---

## Expected Results After Fix

| Metric | Before | After |
|--------|--------|-------|
| Total Users | 7 | 7 |
| Profiles | 1 | 7 |
| Subscriptions | 1 | 7 |
| Missing Records | 6 | 0 |

All 6 affected users will be able to access the app properly after this fix.

---

## Conversion Funnel Analysis

From your analytics, the signup funnel shows:
- 360 landing page visitors → 39 auth page visitors (10.8% click-through)
- 39 auth page visitors → ~2 successful signups (5.1% completion)

After fixing the database issues, consider investigating the 95% auth page drop-off, which could be due to:
- Password requirements too strict
- Form friction
- Mobile UX issues
