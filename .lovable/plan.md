
# Implementation Ready: CRON_SECRET Confirmed

The `CRON_SECRET` has been successfully added to your project secrets. Now I'm ready to implement the complete solution.

---

## What I'll Build

### 1. Database Migration
Create the `newsletter_sends` table to track email sends and add `unsubscribed_at` column to leads for compliance.

### 2. Edge Function: `send-weekly-insights`
Weekly newsletter that runs every Saturday at 12:00 PM UTC:
- Fetches subscribers from leads table (`offer = 'newsletter'`)
- Decrypts emails using existing `decrypt_pii` function
- Sends curated industry-specific content (no generic filler)
- Tracks sends to prevent duplicates
- Includes proper unsubscribe links for compliance

### 3. Edge Function: `newsletter-unsubscribe`
Handles one-click unsubscribe:
- Marks leads as unsubscribed
- Shows a styled confirmation page
- Complies with email regulations (List-Unsubscribe header)

### 4. Config Updates
Register both new functions in `supabase/config.toml`

### 5. Notification Bell Testing
Test the in-app notification system by inserting a test notification

---

## Email Content Preview

Each Saturday email includes:

| Section | Content Type |
|---------|-------------|
| AI Spotlight | Industry-specific AI developments |
| Business Tip | Actionable financial/operational advice |
| Platform Update | New features in Quantis |
| Free Resource | Downloadable templates (rotating) |

**Sample Subject**: "Week 5: Agentic AI in Small Business"

---

## Cron Schedule

| Function | Schedule | Purpose |
|----------|----------|---------|
| `check-churn-signals` | Daily 8:00 AM UTC | Automated retention |
| `send-weekly-insights` | Saturday 12:00 PM UTC | Newsletter delivery |

---

## Next Steps After Approval

1. Run database migration
2. Create both Edge Functions
3. Update config.toml
4. Deploy and test
5. Verify notification bell works
