

# Implementation Plan: Cron Jobs, Notification Testing & Weekly Insights Newsletter

## Overview

This plan covers three main deliverables:
1. **CRON_SECRET setup** and daily cron job for automated churn checking
2. **Notification bell testing** to verify the in-app notification system works
3. **Weekly Insights Newsletter** for newsletter subscribers every Saturday at 12:00 PM

---

## Current State Analysis

### Existing Infrastructure

| Component | Status | Notes |
|-----------|--------|-------|
| `check-churn-signals` edge function | Ready | Already checks `x-cron-secret` header |
| `NotificationCenter` component | Integrated | In Header.tsx for authenticated users |
| `user_notifications` table | Empty | RLS enabled, ready for use |
| Newsletter subscribers | 1 lead | `offer = 'newsletter'` in leads table |
| `send-lifecycle-email` function | Ready | Template-based email sending via Resend |

### Newsletter Subscribers
- Current subscribers: Leads with `source = 'footer_newsletter'` and `offer = 'newsletter'`
- These are captured via the `FooterEmailSignup` component

---

## Part 1: CRON_SECRET and Daily Cron Job

### 1.1 Add CRON_SECRET

A new secret must be added to the project:
- **Secret Name**: `CRON_SECRET`
- **Value**: A secure random string (32+ characters)
- **Purpose**: Authenticates scheduled cron calls to edge functions

### 1.2 Cron Job Setup

The `check-churn-signals` function already validates the `x-cron-secret` header. To set up a daily cron:

**Option A: pg_cron (Recommended)**
Using Supabase's built-in pg_cron extension to call the function daily at 8:00 AM UTC.

**Option B: External Service**
Use cron-job.org or similar to make daily HTTP calls with the secret header.

**Cron Schedule**: Daily at 8:00 AM UTC
```
0 8 * * *
```

---

## Part 2: Notification Bell Testing

### Test Approach

Create a test notification directly in the database to verify:
1. NotificationCenter displays the notification
2. Unread badge shows the count
3. Clicking marks as read
4. Dismiss button removes notification

### Test Data

Insert a sample notification for the current user to verify the bell works:
```sql
INSERT INTO user_notifications (user_id, notification_type, title, message, action_url)
VALUES (
  '<current_user_id>',
  'feature',
  'Test Notification',
  'This is a test to verify notifications are working correctly.',
  '/app'
);
```

This will be done via the browser testing tool after implementation.

---

## Part 3: Weekly Insights Newsletter (Saturday 12:00 PM UTC)

### 3.1 New Edge Function: `send-weekly-insights`

Creates a new edge function specifically for sending curated weekly insights to newsletter subscribers.

**Key Features:**
- Runs every Saturday at 12:00 PM UTC
- Queries leads table for `offer = 'newsletter'` subscribers
- Sends curated AI & business insights (no generic "thank you" content)
- Tracks sent emails to prevent duplicates
- Decrypts emails using existing `decrypt_pii` function

### 3.2 Email Content Strategy

The email will include:

1. **AI Industry Insight** - Latest developments in AI for business
2. **Business Tip of the Week** - Actionable advice
3. **Platform Update** - New features or improvements
4. **Free Resource** (occasionally) - Downloadable template or guide

**Email Template Structure:**
```
Subject: [Week X] AI Business Insights

Header: AIWMC Quantis Weekly Insights

Sections:
1. AI Spotlight - Industry-specific AI news
2. Business Tip - Practical advice
3. What's New - Platform updates
4. Featured Resource - Free download (optional)

Footer: Unsubscribe link, social links
```

### 3.3 Database Schema

Add a table to track newsletter sends and prevent duplicates:

```sql
CREATE TABLE newsletter_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  send_date date NOT NULL,
  email_id text, -- Resend email ID
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(lead_id, send_date)
);

-- Index for querying unsent recipients
CREATE INDEX idx_newsletter_sends_date ON newsletter_sends(send_date);
```

### 3.4 Unsubscribe Mechanism

Add an unsubscribe column to leads table:
```sql
ALTER TABLE leads ADD COLUMN unsubscribed_at timestamptz DEFAULT NULL;
```

---

## Files to Create

### New Files (2)

1. **`supabase/functions/send-weekly-insights/index.ts`**
   - Edge function for Saturday newsletter
   - Queries newsletter subscribers
   - Sends curated insights email
   - Logs successful sends

2. **Database migration**
   - Add `newsletter_sends` table
   - Add `unsubscribed_at` column to leads
   - Enable pg_cron extension if not enabled
   - Create cron jobs for both functions

### Modified Files (2)

1. **`supabase/config.toml`**
   - Register new `send-weekly-insights` function

2. **`src/lib/leadMagnets.ts`**
   - No changes needed (newsletter offer already defined)

---

## Edge Function: send-weekly-insights

```typescript
// Key logic outline:

interface InsightContent {
  week_number: number;
  ai_spotlight: { title: string; body: string };
  business_tip: { title: string; body: string };
  platform_update?: { title: string; body: string };
  free_resource?: { title: string; url: string };
}

// 1. Verify cron secret
// 2. Get today's date, check if Saturday
// 3. Query leads WHERE offer = 'newsletter' AND unsubscribed_at IS NULL
// 4. For each lead:
//    a. Check if already sent this week (newsletter_sends)
//    b. Decrypt email using admin query
//    c. Generate personalized insights
//    d. Send via Resend
//    e. Log to newsletter_sends
```

### Sample Email Content

**Week 5, 2026 - AI Business Insights**

```
🤖 AI SPOTLIGHT: Agentic AI in Small Business

This week, we're seeing a surge in AI agents that can autonomously 
handle customer inquiries. For service businesses, this means...

💡 BUSINESS TIP: The 2-Minute Rule

Before adding any new tool to your stack, ask: "Can I explain its 
value in 2 minutes?" If not, it's probably too complex for your team.

🚀 WHAT'S NEW IN QUANTIS

- Improved financial projections with seasonal adjustments
- New industry benchmarks for healthcare and retail

📥 FREE RESOURCE

Download our "AI Readiness Checklist" - 15 questions to assess 
if your business is ready for AI automation.

[Download Now]
```

---

## Cron Schedule Summary

| Function | Schedule | Time (UTC) | Purpose |
|----------|----------|------------|---------|
| `check-churn-signals` | Daily | 8:00 AM | Churn detection & interventions |
| `send-weekly-insights` | Weekly | Saturday 12:00 PM | Newsletter to subscribers |

---

## Implementation Steps

### Step 1: Add CRON_SECRET
- Use the add_secret tool to request the user add a CRON_SECRET

### Step 2: Database Migration
- Create `newsletter_sends` table
- Add `unsubscribed_at` to leads
- Set up pg_cron jobs

### Step 3: Create send-weekly-insights Function
- Implement the edge function with curated content
- Register in config.toml

### Step 4: Test Notifications
- Use browser tool to verify NotificationCenter works
- Insert test notification for current user

### Step 5: Deploy & Verify
- Deploy edge functions
- Verify cron jobs are scheduled
- Test weekly insights function manually

---

## Technical Considerations

### Email Decryption
Newsletter subscriber emails are encrypted in the `leads` table. The edge function will use a service-role query to call `decrypt_pii()` for each recipient.

### Rate Limiting
Resend free tier: 100 emails/day. With current 1 subscriber, this is not a concern. As list grows:
- Implement batch sending with delays
- Consider Resend paid tier for higher volumes

### Unsubscribe Compliance
Every email must include an unsubscribe link. This will:
1. Link to a simple edge function endpoint
2. Set `unsubscribed_at = NOW()` on the lead record
3. Show a confirmation page

---

## Success Criteria

| Deliverable | Success Metric |
|-------------|----------------|
| CRON_SECRET | Secret added to project |
| Daily churn job | Function runs at 8:00 AM UTC daily |
| Notification bell | Test notification displays and can be dismissed |
| Weekly insights | Saturday 12:00 PM email sent to newsletter subscribers |
| Unsubscribe | Working unsubscribe link in emails |

