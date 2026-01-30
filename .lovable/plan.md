
# Strategic Email Capture System Implementation Plan

## Current State Analysis

### Existing Infrastructure

**Already Implemented:**
- Exit intent popup (`ExitIntentPopup.tsx`) with validated email capture
- `leads` table with AES-256 encrypted email storage and SHA-256 hashing for deduplication
- `capture_lead` RPC function with 24-hour duplicate prevention
- `useExitIntent` hook with desktop mouse-leave and mobile scroll-back detection
- `send-welcome-email` edge function for automated email delivery
- Lead memory system (`leadMemory.ts`) for auth form prefilling
- Basic analytics tracking for popup events

**Current Lead Sources:**
- Only `exit_intent_popup` with offer `free_analysis` (3 leads captured so far)

---

## Proposed Email Capture System

### Architecture Overview

```text
+---------------------------+       +------------------------+       +------------------+
|    Capture Components     |       |   Unified Lead Hook    |       |   Backend        |
+---------------------------+       +------------------------+       +------------------+
| ExitIntentPopup (existing)|       |                        |       |                  |
| ScrollTriggerPopup (new)  | ----> | useLeadCapture hook    | ----> | capture_lead RPC |
| TimeDelayPopup (new)      |       | - Unified state        |       | send-welcome-    |
| FooterNewsletterForm      |       | - Cooldown management  |       |   email          |
| FeatureWaitlist (new)     |       | - Analytics tracking   |       | send-lead-magnet |
| ResourceDownload (new)    |       +------------------------+       +------------------+
+---------------------------+               |
                                            v
                                   +------------------+
                                   | PopupManager     |
                                   | - Priority queue |
                                   | - Prevents spam  |
                                   +------------------+
```

---

## New Components to Create

### 1. Unified Lead Capture Hook

**File:** `src/hooks/useLeadCapture.ts`

Consolidates all lead capture logic with:
- Centralized state management for all popup types
- Priority system (only show 1 popup at a time)
- Cooldown tracking per offer type
- Unified analytics events
- Lead magnet fulfillment tracking

### 2. Popup Manager Component

**File:** `src/components/marketing/PopupManager.tsx`

- Renders active popup based on priority queue
- Prevents multiple simultaneous popups
- Coordinates between exit intent, scroll, and time triggers

### 3. Scroll-Triggered Popup

**File:** `src/components/marketing/ScrollTriggerPopup.tsx`

- Triggers at 50% scroll depth
- Different offer: "Business Validation Checklist"
- Uses existing popup styling for consistency

### 4. Time-Delayed Popup

**File:** `src/components/marketing/TimeDelayPopup.tsx`

- Triggers after 30 seconds on page
- Offer: "Financial Projection Template"
- Lower priority than exit intent

### 5. Footer Newsletter Signup

**File:** `src/components/layout/FooterEmailSignup.tsx`

- Inline form in footer (replaces current static footer)
- Offer: "Weekly Business Insights"
- Always visible, non-intrusive

### 6. Feature Waitlist Component

**File:** `src/components/marketing/FeatureWaitlist.tsx`

- Modal for early access to new features
- Triggered from pricing page or feature announcements
- Offer: "early_access"

### 7. Resource Download Gate

**File:** `src/components/marketing/ResourceDownload.tsx`

- Email-gated PDF downloads
- Multiple offers: `business_guide`, `validation_questions`, `projection_template`

---

## Lead Magnet System

### New Storage Bucket

Create `lead-magnets` public bucket for PDF resources.

### Lead Magnet Edge Function

**File:** `supabase/functions/send-lead-magnet/index.ts`

Sends appropriate PDF based on `offer` type:
- `free_analysis` - Welcome + CTA to app
- `business_guide` - Business Analysis Guide PDF
- `validation_questions` - 10 Questions PDF
- `projection_template` - Financial Template PDF
- `newsletter` - Weekly digest signup confirmation
- `early_access` - Feature waitlist confirmation

### Lead Magnet PDFs

| Lead Magnet | Filename | Purpose |
|-------------|----------|---------|
| Business Analysis Guide | `business-analysis-guide.pdf` | Comprehensive PDF on evaluating business ideas |
| 10 Validation Questions | `10-validation-questions.pdf` | Checklist for idea validation |
| Financial Template | `financial-projection-template.pdf` | Spreadsheet-style template |

---

## Database Optimizations

### Add New Source Types

Extend `capture_lead` function to support new sources:

```sql
-- Valid sources for tracking
-- exit_intent_popup (existing)
-- scroll_popup
-- time_delay_popup
-- footer_newsletter
-- resource_download
-- feature_waitlist
-- blog_cta
```

### Add Lead Scoring Column

```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score integer DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS conversion_type text;
```

**Scoring Logic:**
- +10: Email captured
- +20: Opened welcome email (requires email tracking pixel)
- +50: Created account
- +100: Started trial
- +200: Converted to paid

### Add Indexes for Analytics

```sql
CREATE INDEX idx_leads_source_offer ON leads(source, offer);
CREATE INDEX idx_leads_score ON leads(score DESC) WHERE converted_at IS NULL;
```

---

## Trigger Configuration

### Priority System

| Priority | Trigger | Delay | Scroll Depth | Cooldown |
|----------|---------|-------|--------------|----------|
| 1 (High) | Exit Intent | 0s | N/A | 14 days (submit) / 4 hours (dismiss) |
| 2 | Scroll Trigger | N/A | 50% | 24 hours |
| 3 | Time Delay | 30s | N/A | 48 hours |
| N/A | Footer Signup | Always visible | N/A | None (inline) |
| N/A | Resource Download | On click | N/A | Per resource |

### Popup Suppression Rules

- Never show popup to authenticated users
- Never show popup if user has converted (signed up)
- Maximum 1 popup per session
- Respect individual cooldowns per trigger type

---

## Email Sequence Outline

### Sequence 1: Lead Magnet Delivery

**Day 0 - Immediate:**
- Subject: "Your [Lead Magnet Name] is Ready!"
- Content: Download link + brief intro to AIWMC Quantis
- CTA: "Start Your Free Analysis"

**Day 2 - Value Add:**
- Subject: "3 Mistakes That Kill Business Ideas"
- Content: Educational content related to their lead magnet
- CTA: "Analyze Your Idea in 2 Minutes"

**Day 5 - Social Proof:**
- Subject: "How [Anonymous Industry] Analyzed Their Idea"
- Content: Case study / success story
- CTA: "See What Your Numbers Look Like"

**Day 10 - Urgency:**
- Subject: "Your free analyses are waiting"
- Content: Reminder of free tier benefits
- CTA: "Use Your 3 Free Analyses"

### Sequence 2: Newsletter Subscribers

Weekly digest with:
- 1 business tip
- 1 industry insight
- 1 product update
- CTA to analyze a business idea

---

## Analytics Tracking

### New Events

```typescript
// Popup events
trackEvent('popup_triggered', { type, source, offer });
trackEvent('popup_viewed', { type, source, offer });
trackEvent('popup_dismissed', { type, source, offer, time_on_popup });
trackEvent('popup_converted', { type, source, offer, email_domain });

// Lead magnet events
trackEvent('lead_magnet_requested', { offer, source });
trackEvent('lead_magnet_downloaded', { offer, source });

// Newsletter events
trackEvent('newsletter_subscribed', { source });
trackEvent('newsletter_unsubscribed', { reason });

// Waitlist events
trackEvent('waitlist_joined', { feature, source });
```

---

## Implementation Priority

| Phase | Component | Effort | Impact |
|-------|-----------|--------|--------|
| 1 | `useLeadCapture` unified hook | 2h | Foundation |
| 1 | Footer email signup form | 1h | High (always visible) |
| 1 | Database indexes + score column | 30m | Analytics |
| 2 | Scroll-triggered popup | 1.5h | Medium |
| 2 | Time-delayed popup | 1h | Medium |
| 2 | PopupManager coordinator | 1h | Prevents conflicts |
| 3 | Resource download gate | 2h | High (lead magnets) |
| 3 | `send-lead-magnet` edge function | 1.5h | Delivery |
| 3 | Lead magnet PDFs storage setup | 30m | Content |
| 4 | Feature waitlist component | 1h | Feature launches |
| 4 | A/B testing for popup copy | 1h | Optimization |

---

## Files to Create/Modify

### New Files (11)

1. `src/hooks/useLeadCapture.ts`
2. `src/hooks/usePopupManager.ts`
3. `src/components/marketing/PopupManager.tsx`
4. `src/components/marketing/ScrollTriggerPopup.tsx`
5. `src/components/marketing/TimeDelayPopup.tsx`
6. `src/components/marketing/ResourceDownload.tsx`
7. `src/components/marketing/FeatureWaitlist.tsx`
8. `src/components/layout/FooterEmailSignup.tsx`
9. `supabase/functions/send-lead-magnet/index.ts`
10. `src/lib/leadMagnets.ts` (constants and types)
11. Database migration for indexes and scoring

### Modified Files (5)

1. `src/pages/Landing.tsx` - Integrate PopupManager and FooterEmailSignup
2. `src/components/layout/Footer.tsx` - Add inline email capture
3. `src/lib/analytics.ts` - Add new tracking events
4. `src/lib/leadMemory.ts` - Extend source types
5. `supabase/config.toml` - Register new edge function

---

## Technical Details

### useLeadCapture Hook Interface

```typescript
interface LeadCaptureConfig {
  source: LeadSource;
  offer: LeadOffer;
  cooldownHours?: number;
  requiresAuth?: boolean;
}

interface UseLeadCaptureReturn {
  captureLead: (email: string) => Promise<{ success: boolean; error?: string }>;
  isSubmitting: boolean;
  isSuccess: boolean;
  cooldownRemaining: number | null;
}

type LeadSource = 
  | 'exit_intent_popup'
  | 'scroll_popup'
  | 'time_delay_popup'
  | 'footer_newsletter'
  | 'resource_download'
  | 'feature_waitlist'
  | 'blog_cta';

type LeadOffer = 
  | 'free_analysis'
  | 'business_guide'
  | 'validation_questions'
  | 'projection_template'
  | 'newsletter'
  | 'early_access';
```

### PopupManager Priority Logic

```typescript
const POPUP_PRIORITY: Record<string, number> = {
  exit_intent: 1,    // Highest - user leaving
  scroll: 2,         // Medium - engaged user
  time_delay: 3,     // Low - passive trigger
};

// Only show highest priority popup that hasn't been dismissed
```

### Footer Email Form Design

Simple inline form:
- Input placeholder: "Enter your email for weekly insights"
- Button: "Subscribe"
- Trust text: "Join 500+ entrepreneurs. Unsubscribe anytime."
- Success state: "Check your inbox!"
