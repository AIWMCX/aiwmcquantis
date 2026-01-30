# Implementation Plan: Cron Jobs, Notification Testing & Weekly Insights Newsletter

## Status: READY FOR IMPLEMENTATION

**CRON_SECRET has been added** - Confirmed in project secrets.

---

## Implementation Summary

### Files to Create

#### 1. `supabase/functions/send-weekly-insights/index.ts`

Weekly insights newsletter Edge Function that:
- Validates CRON_SECRET for authentication
- Queries newsletter subscribers from leads table
- Sends curated AI & business insights via Resend
- Tracks sends to prevent duplicates
- Includes professional unsubscribe links

#### 2. `supabase/functions/newsletter-unsubscribe/index.ts`

Unsubscribe handler that:
- Marks leads as unsubscribed
- Shows a confirmation page
- Complies with email regulations

### Database Migration Required

```sql
-- Add newsletter tracking table
CREATE TABLE IF NOT EXISTS public.newsletter_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  send_date date NOT NULL,
  email_id text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, send_date)
);

-- Enable RLS
ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;

-- Service role access only
CREATE POLICY "Service role manages newsletter_sends"
  ON public.newsletter_sends FOR ALL
  USING (public.is_service_role())
  WITH CHECK (public.is_service_role());

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to newsletter_sends"
  ON public.newsletter_sends FOR ALL
  TO anon
  USING (false);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_newsletter_sends_date 
  ON public.newsletter_sends(send_date);

CREATE INDEX IF NOT EXISTS idx_newsletter_sends_lead 
  ON public.newsletter_sends(lead_id);

-- Add unsubscribe tracking to leads table
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz DEFAULT NULL;
```

### Config.toml Updates

Add to `supabase/config.toml`:
```toml
[functions.send-weekly-insights]
verify_jwt = false

[functions.newsletter-unsubscribe]
verify_jwt = false
```

---

## Cron Schedule

| Function | Schedule | Time (UTC) | Purpose |
|----------|----------|------------|---------|
| `check-churn-signals` | Daily | 8:00 AM | Churn detection & interventions |
| `send-weekly-insights` | Weekly | Saturday 12:00 PM | Newsletter to subscribers |

### Setting Up Cron Jobs

Use pg_cron with these schedules:

```sql
-- Daily churn check at 8:00 AM UTC
SELECT cron.schedule(
  'daily-churn-check',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://gafxacjhkqsdzwwzhbor.supabase.co/functions/v1/check-churn-signals',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "YOUR_CRON_SECRET"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Weekly newsletter on Saturday at 12:00 PM UTC
SELECT cron.schedule(
  'weekly-insights-newsletter',
  '0 12 * * 6',
  $$
  SELECT net.http_post(
    url := 'https://gafxacjhkqsdzwwzhbor.supabase.co/functions/v1/send-weekly-insights',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "YOUR_CRON_SECRET"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

---

## Testing Checklist

- [ ] Deploy send-weekly-insights function
- [ ] Deploy newsletter-unsubscribe function
- [ ] Run database migration
- [ ] Test notification bell in header
- [ ] Manually test weekly insights function
- [ ] Verify unsubscribe link works

---

## Email Content Strategy

The weekly insights email includes:

1. **AI Spotlight** - Industry-specific AI developments
2. **Business Tip** - Actionable business advice
3. **Platform Update** - New features and improvements
4. **Free Resource** (rotating) - Downloadable templates or guides

**NO generic "thank you" content** - only valuable insights.

