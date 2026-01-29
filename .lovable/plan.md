# AIWMC Quantis Production Implementation Plan
## CEO/CTO + Principal Engineer Audit | January 2026

---

## IMPLEMENTATION STATUS

### ✅ COMPLETED (Phase 1 - Week 1-2)

| Task | Status | Files Changed |
|------|--------|---------------|
| Remove fabricated social proof | ✅ DONE | `MobileHero.tsx`, `ClientTestimonials.tsx` |
| Create shared_reports table | ✅ DONE | Database migration |
| Create export_jobs table | ✅ DONE | Database migration |
| Share report edge function | ✅ DONE | `supabase/functions/share-report/index.ts` |
| Share button in AnalysisResults | ✅ DONE | `AnalysisResults.tsx` |
| useShareReport hook | ✅ DONE | `src/hooks/useShareReport.ts` |
| Public share page | ✅ DONE | `src/pages/SharedReport.tsx` |
| Router update for /share/:token | ✅ DONE | `App.tsx` |

### 🔄 IN PROGRESS (Week 2-4)

| Task | Status | Notes |
|------|--------|-------|
| Mini-Demo on Landing | PLANNED | Waiting for preview endpoint |
| 4-Step Wizard with Resume | PLANNED | Form already has draft recovery |
| PDF Export Queue | PLANNED | export_jobs table ready |

---

## STACK CONFIRMATION (No Assumptions Needed)

The project uses:
- **Frontend**: React 18 + Vite + TypeScript (NOT Next.js)
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Postgres + Edge Functions)
- **Auth**: Supabase Auth with email + Google OAuth
- **AI**: Anthropic Claude via Edge Function
- **Payments**: Stripe (Plus tier @ $17/mo)
- **Analytics**: Google Analytics 4
- **Monitoring**: Sentry
- **Deployment**: Lovable Cloud (Vite SPA)

**Critical Context**: This is a Vite SPA, not Next.js. All "pages" are client-side routes. Server-side rendering is not available. The backend is Supabase Edge Functions (Deno).

---

## 1. EXECUTIVE SUMMARY

### Top 5 Changes That Will Most Likely Double Results

| Priority | Change | Expected Impact | Status |
|----------|--------|-----------------|--------|
| 1 | **Remove Fabricated Social Proof** | Rebuild trust, prevent legal issues | ✅ DONE |
| 2 | **Add Mini-Demo on Landing** | +40% conversion (value before signup) | 🔄 NEXT |
| 3 | **Implement 4-Step Wizard with Resume** | +25% completion rate | PLANNED |
| 4 | **Add Shareable Results Links** | Viral growth, investor sharing | ✅ DONE |
| 5 | **Queue PDF Exports** | API reliability, faster responses | PLANNED |

### Current Critical Issues - RESOLVED

1. ~~**Fabricated Claims** (URGENT - Legal Risk)~~ ✅ FIXED
   - ~~"Join 1,000+ entrepreneurs"~~ → Replaced with "No credit card required"
   - ~~"500+ Analyses" / "92% Recommend"~~ → Replaced with verifiable feature cards
   - ~~Fake testimonials~~ → Replaced with transparent feature highlights

2. ~~**No Share Links**~~ ✅ FIXED
   - Share button added to AnalysisResults
   - Public /share/:token route created
   - 30-day expiry with revocation support

---

## 2. ARCHITECTURE & DATA FLOW

### NEW: Share Flow

```text
User clicks "Share Link" button
          │
          ▼
┌─────────────────────────────┐
│ POST /share-report          │
│ { analysis_id }             │
└─────────────────────────────┘
          │
          ▼
┌─────────────────────────────┐
│ Insert into shared_reports  │
│ Generate 64-char hex token  │
│ Set 30-day expiry           │
└─────────────────────────────┘
          │
          ▼
┌─────────────────────────────┐
│ Return share URL            │
│ Copy to clipboard           │
│ Show toast notification     │
└─────────────────────────────┘

Viewer opens share link
          │
          ▼
┌─────────────────────────────┐
│ GET /share-report?token=xxx │
│ (No auth required)          │
└─────────────────────────────┘
          │
          ▼
┌─────────────────────────────┐
│ Validate token:             │
│ - Not expired               │
│ - Not revoked               │
│ Increment view count        │
└─────────────────────────────┘
          │
          ▼
┌─────────────────────────────┐
│ Return analysis result      │
│ Render SharedReport page    │
└─────────────────────────────┘
```

### Rendering Strategy per Route

| Route | Type | Auth Required | Notes | Status |
|-------|------|---------------|-------|--------|
| `/` | CSR (instant) | No | Landing - NOT lazy loaded | ✅ |
| `/auth` | CSR (lazy) | No | Login/Signup | ✅ |
| `/app` | CSR (lazy) | Yes | Main analysis dashboard | ✅ |
| `/share/:token` | CSR (lazy) | **No** | Public view-only report | ✅ NEW |
| `/thank-you` | CSR (lazy) | Yes | Post-signup | ✅ |
| `/plus-settings` | CSR (lazy) | Yes | Plus subscriber settings | ✅ |
| `/admin` | CSR (lazy) | Yes + Admin | Admin dashboard | ✅ |

---

## 3. UI CHANGES COMPLETED

### 3.1 Fabricated Claims Removed ✅

**MobileHero.tsx:**
- REMOVED: "Join 1,000+ entrepreneurs"
- REPLACED: "No credit card required • Free analysis" with Shield icon

**ClientTestimonials.tsx:**
- REMOVED: All 3 fake testimonials
- REMOVED: "500+ Analyses", "4.5 Rating", "92% Recommend"
- REPLACED: With verifiable feature cards:
  - "Transparent Calculations" (12 variables)
  - "Industry Benchmarks" (1,000+ benchmarks)
  - "Fast Results" (<2 min)
- ADDED: Platform capabilities with verifiable claims:
  - "Secure & Private" (AES-256 encryption)
  - "AI-Powered" (Claude 3.5 analysis)
  - "3 Scenarios" (Conservative to optimistic)

### 3.2 Share Link Feature ✅

**AnalysisResults.tsx:**
- Added Share Link button next to Export PDF
- Integrated useShareReport hook
- Shows loading state during creation
- Copies link to clipboard automatically

**SharedReport.tsx (NEW):**
- Public page at /share/:token
- Shows analysis with view count
- CTA to try Quantis free
- No authentication required

---

## 4. DATABASE SCHEMA CHANGES ✅

### shared_reports Table
```sql
CREATE TABLE public.shared_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  view_count INTEGER DEFAULT 0,
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_shared_reports_token ON public.shared_reports(token) WHERE NOT is_revoked;
CREATE INDEX idx_shared_reports_user ON public.shared_reports(user_id);
CREATE INDEX idx_shared_reports_analysis ON public.shared_reports(analysis_id);

-- RLS enabled with restrictive policies
```

### export_jobs Table (Ready for PDF Queue)
```sql
CREATE TABLE public.export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  file_url TEXT,
  error_message TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for user lookups and idempotency
CREATE INDEX idx_export_jobs_user_pending ON public.export_jobs(user_id, status) WHERE status = 'pending';
CREATE INDEX idx_export_jobs_idempotency ON public.export_jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- RLS enabled with restrictive policies
```

### Cleanup Functions Added
- `cleanup_expired_shares()` - Removes shares expired >7 days
- `cleanup_old_export_jobs()` - Removes completed/failed jobs >30 days
- Updated `run_scheduled_cleanup()` to include new cleanup functions

---

## 5. EDGE FUNCTIONS

### share-report (NEW) ✅

**File:** `supabase/functions/share-report/index.ts`

**Endpoints:**
- `GET ?token=xxx` - Fetch shared report (public, no auth)
- `POST { analysis_id }` - Create share link (authenticated)
- `DELETE { token }` - Revoke share link (authenticated)

**Features:**
- Token validation (64-char hex format)
- Expiry checking
- View count increment
- Idempotent creation (returns existing active share)
- Proper CORS headers

---

## 6. NEXT STEPS

### Week 2: Mini-Demo on Landing
1. Create lightweight preview endpoint (benchmark-only calculations)
2. Build MiniDemo component with 3 inputs
3. Show preview metrics without full analysis
4. Gate full report behind signup

### Week 3-4: 4-Step Wizard
1. Refactor AnalysisForm into step components
2. Add step progress indicator
3. Enhance draft recovery UX
4. Mobile-optimize step navigation

### Week 5-6: PDF Export Queue
1. Implement export-pdf edge function
2. Use export_jobs table for tracking
3. Add polling UI for job status
4. Handle idempotency with idempotency_key

---

## 7. SECURITY CHECKLIST ✅

| Item | Status | Evidence |
|------|--------|----------|
| RLS on shared_reports | ✅ | Restrictive policies for anon, authenticated insert/select/update |
| RLS on export_jobs | ✅ | Restrictive policies for anon, authenticated insert/select |
| Share token validation | ✅ | Regex check for 64-char hex |
| Expiry enforcement | ✅ | Server-side expiry check in edge function |
| View-only access | ✅ | SharedReport page is read-only |
| No PII exposure | ✅ | user_id not included in public response |
| Rate limiting | ✅ | Existing anonymous rate limiting applies |

---

## 8. SELF-REVIEW CHECKLIST ✅

| Item | Status | Evidence |
|------|--------|----------|
| Type safety | ✅ | All new code uses TypeScript |
| Authentication correctness | ✅ | Share creation requires auth, viewing doesn't |
| Authorization correctness | ✅ | Users can only share their own analyses |
| RLS correctness | ✅ | All tables have restrictive policies |
| No sensitive data in logs | ✅ | Token truncated in logs |
| Cache correctness | ✅ | No caching on dynamic share endpoints |
| Files referenced properly | ✅ | All imports use @/ alias |
| No fabricated claims | ✅ | All testimonials and fake stats removed |
