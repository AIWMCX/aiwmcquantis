
# User Retention & Engagement System Implementation Plan

## Executive Summary

Design and implement a comprehensive system to improve user retention through automated email sequences, in-app notifications, engagement tracking, and churn prediction. This plan leverages existing infrastructure (Resend, analytics, profiles/subscriptions) while adding new capabilities for lifecycle email automation and behavioral tracking.

---

## Current State Analysis

### Existing Infrastructure

| Component | Status | Details |
|-----------|--------|---------|
| Email Service | Active | Resend API via `send-welcome-email` and `send-lead-magnet` edge functions |
| User Profiles | Active | `profiles` table with `full_name`, `created_at` |
| Subscriptions | Active | `subscriptions` table with plan, status, period dates |
| Usage Tracking | Active | `usage_tracking` table with monthly analysis counts |
| Analyses | Active | Full analysis history with timestamps |
| Analytics | Active | GA4 with comprehensive event tracking |
| Alert System | Active | Webhook-based alerts via `alert-webhook` function |

### Key User Metrics (Current Data)

- 8 users in database
- 1 Plus subscriber (14 analyses completed)
- 7 Free users (most with 0 analyses)
- High percentage of users never completing first analysis (churn risk)

---

## System Architecture

```text
+---------------------------+       +------------------------+       +------------------+
|    Frontend Components    |       |   Engagement Engine    |       |   Backend Jobs   |
+---------------------------+       +------------------------+       +------------------+
| NotificationCenter (new)  |       |                        |       |                  |
| ProgressTracker (new)     | <---> | useEngagement hook     | <---> | send-lifecycle-  |
| AchievementBadges (new)   |       | - Streak tracking      |       |   email          |
| FeatureHighlight (new)    |       | - Milestone detection  |       | check-churn-risk |
+---------------------------+       | - Activity scoring     |       | weekly-digest    |
                                    +------------------------+       +------------------+
                                            |                              |
                                            v                              v
                                    +------------------+       +------------------+
                                    | user_engagement  |       | email_queue      |
                                    | - streaks        |       | - scheduled      |
                                    | - milestones     |       | - templates      |
                                    | - activity_score |       | - status         |
                                    +------------------+       +------------------+
```

---

## Database Schema Changes

### New Tables

#### 1. `user_engagement` - Track engagement metrics

```sql
CREATE TABLE user_engagement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  
  -- Streak tracking
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_active_date date,
  
  -- Milestones
  milestones_achieved jsonb DEFAULT '[]',
  total_analyses integer DEFAULT 0,
  total_exports integer DEFAULT 0,
  
  -- Activity scoring (0-100)
  activity_score integer DEFAULT 0,
  engagement_tier text DEFAULT 'new', -- new, active, power, dormant, churned
  
  -- Preferences
  email_frequency text DEFAULT 'weekly', -- daily, weekly, monthly, never
  last_digest_sent timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### 2. `user_notifications` - In-app notification queue

```sql
CREATE TABLE user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  
  notification_type text NOT NULL, -- achievement, feature, tip, system
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  action_label text,
  
  is_read boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  expires_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread 
  ON user_notifications(user_id, is_read, is_dismissed) 
  WHERE is_read = false AND is_dismissed = false;
```

#### 3. `email_sequences` - Lifecycle email automation

```sql
CREATE TABLE email_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_name text NOT NULL, -- onboarding, reengagement, digest
  step_number integer NOT NULL,
  delay_hours integer NOT NULL, -- hours after trigger/previous step
  
  subject text NOT NULL,
  template_key text NOT NULL,
  
  trigger_condition jsonb, -- {"event": "signup"} or {"inactive_days": 7}
  skip_if_conditions jsonb, -- {"has_analysis": true}
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Track sent emails to prevent duplicates
CREATE TABLE email_sequence_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  sequence_name text NOT NULL,
  step_number integer NOT NULL,
  sent_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, sequence_name, step_number)
);
```

---

## Email Sequence Templates

### Sequence 1: Onboarding (Days 0-10)

| Day | Email | Subject | Trigger |
|-----|-------|---------|---------|
| 0 | Welcome | "Welcome to AIWMC Quantis - Your Free Analysis Awaits!" | Signup (existing) |
| 2 | First Steps | "Your first analysis is just 2 minutes away" | No analysis yet |
| 4 | Value Reminder | "3 things you're missing without your analysis" | Still no analysis |
| 7 | Social Proof | "See how entrepreneurs like you use Quantis" | No analysis yet |
| 10 | Last Chance | "Your 3 free analyses are waiting" | No analysis yet |

### Sequence 2: Post-First-Analysis (Days 0-14)

| Day | Email | Subject | Trigger |
|-----|-------|---------|---------|
| 1 | Congrats | "Your analysis is ready to export!" | First analysis completed |
| 3 | Next Steps | "3 ways to use your analysis results" | After first analysis |
| 7 | Compare | "Try comparing different scenarios" | Only 1 analysis |
| 14 | Upgrade CTA | "Unlock unlimited analyses" | Free user with 1+ analyses |

### Sequence 3: Re-engagement (Dormant Users)

| Inactive Days | Email | Subject |
|---------------|-------|---------|
| 7 | Soft nudge | "We noticed you haven't been back..." |
| 14 | Value reminder | "New features you might have missed" |
| 30 | Win-back | "We miss you! Here's what's new" |
| 60 | Last effort | "Your account is waiting for you" |

### Sequence 4: Weekly Digest (Active Users)

Sent every Sunday for users with `email_frequency = 'weekly'`:

- New industry benchmarks added
- Platform updates
- Business tip of the week
- "Analyze a new idea" CTA

---

## Edge Functions

### 1. `send-lifecycle-email`

Handles all lifecycle email sending with template rendering:

```typescript
// Template keys: onboarding_1, reengagement_7, digest_weekly, achievement, etc.
interface LifecycleEmailRequest {
  user_id: string;
  template_key: string;
  dynamic_data?: Record<string, unknown>;
}
```

### 2. `check-churn-signals` (Scheduled Job)

Runs daily to identify churn risks:

```typescript
// Churn signals:
// - 7+ days since last login
// - 0 analyses in last 30 days
// - Subscription cancellation
// - Failed payment

// Actions:
// - Update engagement_tier
// - Queue re-engagement emails
// - Create in-app notifications
```

### 3. `send-weekly-digest`

Scheduled for Sunday 10 AM UTC:

- Query users with `email_frequency = 'weekly'`
- Skip users who received email in last 6 days
- Compile personalized digest content
- Send via Resend

---

## In-App Notification System

### Notification Types

| Type | Icon | Examples |
|------|------|----------|
| achievement | Trophy | "First analysis complete!", "5 analyses streak!" |
| feature | Sparkles | "New: Document Intelligence now available" |
| tip | Lightbulb | "Pro tip: Export your analysis as PDF" |
| system | Bell | "Welcome to Plus!", "Payment received" |
| milestone | Star | "You've reached Power User status!" |

### NotificationCenter Component

```tsx
// src/components/notifications/NotificationCenter.tsx
// - Bell icon in header with unread count badge
// - Dropdown showing recent notifications
// - Mark as read on click
// - "View all" link to full notifications page
```

### useNotifications Hook

```tsx
// src/hooks/useNotifications.ts
interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  dismissAll: () => void;
  isLoading: boolean;
}
```

---

## Engagement Hooks & Gamification

### Streak System

```typescript
// Track consecutive days with analyses
// Award badges at 3, 7, 14, 30 days

const STREAK_MILESTONES = [
  { days: 3, badge: 'Getting Started', reward: null },
  { days: 7, badge: 'Week Warrior', reward: 'extra_analysis' },
  { days: 14, badge: 'Dedicated', reward: null },
  { days: 30, badge: 'Power Analyst', reward: 'pdf_template' },
];
```

### Achievement System

```typescript
const ACHIEVEMENTS = [
  { id: 'first_analysis', name: 'First Steps', condition: 'total_analyses >= 1' },
  { id: 'five_analyses', name: 'Analyzer', condition: 'total_analyses >= 5' },
  { id: 'ten_analyses', name: 'Power User', condition: 'total_analyses >= 10' },
  { id: 'first_export', name: 'Publisher', condition: 'total_exports >= 1' },
  { id: 'five_exports', name: 'Report Master', condition: 'total_exports >= 5' },
  { id: 'plus_member', name: 'Plus Club', condition: 'plan_id = "plus"' },
];
```

### ProgressTracker Component

Visual progress indicator showing:
- Analyses this month (for free users: 1/3)
- Current streak
- Next milestone
- Engagement score

---

## Churn Prediction Signals

### Risk Scoring Algorithm

```typescript
function calculateChurnRisk(user: UserEngagement): number {
  let risk = 0;
  
  // Days since last activity (0-40 points)
  const daysSinceActive = differenceInDays(new Date(), user.last_active_date);
  risk += Math.min(40, daysSinceActive * 2);
  
  // No analyses completed (20 points)
  if (user.total_analyses === 0) risk += 20;
  
  // Never exported PDF (10 points)
  if (user.total_exports === 0) risk += 10;
  
  // Low activity score (0-20 points)
  risk += Math.max(0, 20 - (user.activity_score / 5));
  
  // Subscription status (10 points)
  if (user.subscription_status === 'canceled') risk += 10;
  
  return Math.min(100, risk);
}

// Risk tiers:
// 0-30: Healthy
// 31-50: At Risk
// 51-70: High Risk
// 71-100: Churning
```

### Automated Interventions

| Risk Level | Actions |
|------------|---------|
| At Risk (31-50) | Send re-engagement email, show feature highlight in-app |
| High Risk (51-70) | Personal email from CEO, special offer popup |
| Churning (71-100) | Win-back campaign with incentive, admin alert |

---

## Analytics Tracking Enhancements

### New Events

```typescript
// Retention events
trackEvent('streak_achieved', { days: 7, badge: 'Week Warrior' });
trackEvent('milestone_reached', { milestone: 'five_analyses' });
trackEvent('notification_clicked', { type: 'feature', notification_id: '...' });
trackEvent('digest_opened', { digest_type: 'weekly' });

// Churn signals
trackEvent('churn_risk_elevated', { previous: 25, current: 55, user_tier: 'at_risk' });
trackEvent('winback_email_sent', { user_id: '...', sequence_step: 2 });
```

---

## Implementation Phases

### Phase 1: Foundation (3 hours)

| Task | Effort |
|------|--------|
| Create `user_engagement` table with RLS | 30m |
| Create `user_notifications` table with RLS | 30m |
| Implement `useEngagement` hook | 1h |
| Implement `useNotifications` hook | 1h |

### Phase 2: In-App Notifications (2 hours)

| Task | Effort |
|------|--------|
| NotificationCenter component | 1h |
| NotificationBell header integration | 30m |
| Achievement toast on milestone | 30m |

### Phase 3: Email Sequences (3 hours)

| Task | Effort |
|------|--------|
| Create `email_sequences` schema | 30m |
| `send-lifecycle-email` edge function | 1.5h |
| Email templates (HTML/text) | 1h |

### Phase 4: Automation (2 hours)

| Task | Effort |
|------|--------|
| `check-churn-signals` scheduled function | 1h |
| Churn risk scoring logic | 30m |
| Admin dashboard for churn metrics | 30m |

### Phase 5: Gamification (2 hours)

| Task | Effort |
|------|--------|
| ProgressTracker component | 1h |
| Achievement badges display | 30m |
| Streak counter UI | 30m |

---

## Files to Create

### New Files (14)

1. `src/hooks/useEngagement.ts` - Engagement tracking hook
2. `src/hooks/useNotifications.ts` - In-app notifications hook
3. `src/components/notifications/NotificationCenter.tsx` - Bell dropdown
4. `src/components/notifications/NotificationItem.tsx` - Single notification
5. `src/components/notifications/NotificationBadge.tsx` - Unread count badge
6. `src/components/engagement/ProgressTracker.tsx` - Usage progress UI
7. `src/components/engagement/StreakCounter.tsx` - Streak display
8. `src/components/engagement/AchievementBadge.tsx` - Achievement display
9. `src/lib/churnPrediction.ts` - Churn risk algorithm
10. `src/lib/engagementScoring.ts` - Activity scoring logic
11. `supabase/functions/send-lifecycle-email/index.ts` - Lifecycle emails
12. `supabase/functions/check-churn-signals/index.ts` - Daily churn check
13. `supabase/functions/send-weekly-digest/index.ts` - Weekly digest
14. Database migration for new tables

### Modified Files (5)

1. `src/components/layout/Header.tsx` - Add NotificationCenter
2. `src/pages/AppDashboard.tsx` - Add ProgressTracker
3. `src/lib/analytics.ts` - Add retention events
4. `supabase/config.toml` - Register new edge functions
5. `src/hooks/useAnalysis.ts` - Track streak on analysis complete

---

## Email Template Examples

### Re-engagement Email (7 days inactive)

**Subject:** We noticed you haven't been back...

**Body:**
```
Hi {first_name},

It's been a week since your last visit to AIWMC Quantis, and we wanted to check in.

Your {remaining_analyses} free analyses are still waiting for you.

In case you missed it, here's what you can do:
- Analyze any business idea in under 2 minutes
- Get detailed financial projections
- Export bank-ready PDF reports

[Start Your Free Analysis]

If you have any questions or feedback, just reply to this email.

Best,
The AIWMC Quantis Team
```

### Achievement Email

**Subject:** You've earned the Analyzer badge!

**Body:**
```
Hi {first_name},

Congratulations! You've completed 5 business analyses and earned the **Analyzer** badge.

Keep up the momentum:
- Current streak: {streak_days} days
- Next milestone: 10 analyses → Power User badge

Your analyses are helping you make smarter business decisions.

[View Your Progress]
```

---

## Success Metrics

| Metric | Current | Target (30 days) |
|--------|---------|------------------|
| First analysis completion rate | ~13% | 40% |
| 7-day retention | Unknown | 50% |
| 30-day retention | Unknown | 30% |
| Email open rate | N/A | 35% |
| Notification click-through | N/A | 20% |
| Upgrade conversion (free→plus) | 12.5% | 20% |

---

## Technical Notes

### RLS Policies

All new tables require Row Level Security:
- Users can only read/update their own engagement data
- Users can only read their own notifications
- Email logs are admin-only

### Scheduled Jobs

For scheduled edge functions (churn check, weekly digest), use external cron service (e.g., cron-job.org) to call the functions with a secret key:

```typescript
// Verify cron secret in edge function
const cronSecret = Deno.env.get('CRON_SECRET');
if (req.headers.get('x-cron-secret') !== cronSecret) {
  return new Response('Unauthorized', { status: 401 });
}
```

### Email Rate Limits

Resend free tier: 100 emails/day, 3,000/month
- Prioritize lifecycle emails over digest
- Implement email queue with priority levels
