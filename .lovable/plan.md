

# Comprehensive Architecture Review & Accessibility Fixes

## Part 1: Accessibility Issues Fix

### Issue 1: Missing `<main>` Landmark on Landing Page

**Problem**: The Landing page (`src/pages/Landing.tsx`) lacks a `<main>` landmark wrapper, causing screen readers to have difficulty identifying the primary content area.

**Current State**: The Landing page uses `<div>` and `<section>` elements without a `<main>` wrapper.

**Solution**: Wrap the main content (from Hero through Footer) in a `<main id="main-content">` element.

**Files to Modify**:
- `src/pages/Landing.tsx`

---

### Issue 2: Heading Order Violation

**Problem**: The heading hierarchy on the landing page is inconsistent. Multiple `<h2>` elements appear with occasional `<h3>` and `<h4>` elements that don't follow proper nesting.

**Current Heading Flow**:
```
- <h1> "Know Your Numbers Before You Invest" (MobileHero)
- <h2> "See Your Numbers in Seconds" (MiniDemo)
- <h2> "Your Report Preview" (DemoPreview)
- <h4> "Key Insights" / "Risk Factors" (inside DemoPreview - skips h3!)
- <h2> "Built for Transparency" (ClientTestimonials)
- <h3> feature titles (correct)
- <h2> "Everything You Need..." (Features)
- <h3> feature titles (correct)
```

**Solution**: Change `<h4>` elements in `DemoPreview.tsx` to `<h3>` for proper heading hierarchy.

**Files to Modify**:
- `src/components/landing/DemoPreview.tsx`

---

### Issue 3: Label Content Mismatch (Already Fixed)

The `MiniDemo.tsx` labels properly use `htmlFor` matching `id` attributes. No changes needed.

---

## Part 2: Architecture Review for 10,000+ Daily Users

### Current Architecture Analysis

```text
+-------------------+       +----------------------+       +------------------+
|   React SPA       | ----> | Supabase Edge Funcs  | ----> |  PostgreSQL DB   |
|   (Vite/Lovable)  |       |   (Deno Runtime)     |       |  (Supabase)      |
+-------------------+       +----------------------+       +------------------+
        |                           |                            |
        v                           v                            v
   Lovable CDN              Lovable AI API              Row-Level Security
  (Static Assets)          (Claude Models)                    RLS
```

---

### Identified Bottlenecks & Solutions

#### 1. Single Point of Failure: `analyze-business` Monolith

**Current State**: One 3,676-line edge function handles:
- Input validation
- Benchmark lookup
- Financial calculations
- AI narration
- Rate limiting
- Usage tracking

**Risk at Scale**: Single cold start can cause 5-10s delays. Any crash affects all users.

**Solution**: Split into microservices

| Service | Responsibility | Priority |
|---------|---------------|----------|
| `validate-input` | Input sanitization & validation | High |
| `calculate-financials` | Deterministic calculations | High |
| `ai-narrator` | GPT narration (isolate failures) | High |
| `benchmark-lookup` | Database queries + caching | Medium |
| `rate-limiter` | Centralized rate limiting | Medium |

---

#### 2. Database Design Optimization

**Current Issues**:
- No indexes on frequently queried columns
- `analyses.result` stores full JSON (~50KB per record)
- No table partitioning for high-volume tables

**Recommendations**:

```sql
-- Add indexes for common queries
CREATE INDEX idx_analyses_user_created ON analyses(user_id, created_at DESC);
CREATE INDEX idx_analyses_team ON analyses(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_benchmarks_industry ON industry_benchmarks(industry_id);
CREATE INDEX idx_anonymous_usage_device ON anonymous_usage(device_id, created_at);

-- Add table partitioning for anonymous_usage (expected high volume)
-- Archive analyses older than 1 year to cold storage
```

---

#### 3. Caching Strategy (Currently Missing)

**Current State**: Every benchmark lookup hits the database.

**Solution**: Multi-layer caching

| Layer | What to Cache | TTL | Technology |
|-------|---------------|-----|------------|
| Edge | Industry benchmarks | 1 hour | Deno KV / in-memory |
| Edge | Location multipliers | 24 hours | Deno KV |
| Client | Analysis results | Session | React Query (already configured) |
| CDN | Static assets | 1 year | Lovable CDN headers |

---

#### 4. Connection Pooling

**Current State**: Each edge function creates new Supabase client connections.

**Risk**: Connection exhaustion at 100+ concurrent users (Supabase default: 60 direct connections).

**Solution**:
- Use Supabase's built-in pooler (already available)
- Switch from direct connections to pooled connections in edge functions
- Implement connection reuse patterns

---

#### 5. Queue System for Heavy Operations

**Current State**: PDF export runs synchronously, blocking user.

**Recommendation**: Already have `export_jobs` table - ensure queue-export function handles:
- Retry logic with exponential backoff
- Dead letter queue for failed jobs
- Status webhooks for completion

---

#### 6. CDN Utilization

**Current State**: Static assets served from Lovable CDN without optimal cache headers.

**Recommendations**:
- Contact Lovable support to configure `Cache-Control: max-age=31536000, immutable` for `/assets/*`
- Ensure content-hashed filenames (already done via Vite)

---

### Cost Projection at Scale

| Daily Users | Analyses/Day | Est. Monthly Cost | Notes |
|------------|--------------|-------------------|-------|
| 1,000 | 500 | ~$50-100 | Current baseline |
| 10,000 | 5,000 | ~$300-600 | Need caching layer |
| 100,000 | 50,000 | ~$2,000-5,000 | Need microservices + dedicated pooler |

**Cost Drivers**:
- Lovable AI API usage (primary cost)
- Supabase compute (edge function invocations)
- Database storage and bandwidth
- Stripe transaction fees (3% + 30¢)

---

### Scaling Roadmap with Thresholds

| Phase | Threshold | Actions Required | Timeline |
|-------|-----------|-----------------|----------|
| **Current** | <1K DAU | Monitor & observe | Now |
| **Phase 1** | 1K-5K DAU | Add caching layer, DB indexes | Week 1-2 |
| **Phase 2** | 5K-10K DAU | Split edge functions, connection pooling | Week 3-4 |
| **Phase 3** | 10K-50K DAU | Dedicated compute, regional edge deployment | Month 2 |
| **Phase 4** | 50K+ DAU | Multi-region DB, CDN optimization | Month 3+ |

---

### Priority Implementation Order

| # | Task | Impact | Effort | Risk if Skipped |
|---|------|--------|--------|-----------------|
| 1 | Add `<main>` landmark to Landing | Low | 5 min | Accessibility failures |
| 2 | Fix heading hierarchy | Low | 10 min | WCAG violations |
| 3 | Add database indexes | High | 30 min | Slow queries at scale |
| 4 | Implement benchmark caching | High | 2 hours | DB overload |
| 5 | Split analyze-business function | Medium | 1 day | Cold start issues |
| 6 | Connection pooling | High | 1 hour | Connection exhaustion |
| 7 | CDN cache headers | Medium | Support ticket | Repeated asset downloads |

---

## Technical Implementation Details

### Accessibility Fixes (Immediate)

**Landing.tsx Changes**:
```tsx
// Wrap content after nav in <main>
<main id="main-content" role="main">
  <MobileHero />
  {/* ... rest of content ... */}
</main>
```

**DemoPreview.tsx Changes**:
```tsx
// Change h4 to h3 for proper hierarchy
<h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
  <CheckCircle2 className="w-4 h-4 text-success" />
  Key Insights
</h3>
```

### Database Index Migration
```sql
-- Migration: add_performance_indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analyses_user_created 
  ON analyses(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_benchmarks_industry_keywords
  ON industry_benchmarks USING gin(keywords);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_anonymous_usage_device_time
  ON anonymous_usage(device_id, created_at DESC);
```

### Edge Function Caching Pattern
```typescript
// In-memory cache for benchmarks (in edge function)
const benchmarkCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCachedBenchmark(industryId: string) {
  const cached = benchmarkCache.get(industryId);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  return null;
}
```

---

## Summary

This plan addresses:

1. **Accessibility**: 2 quick fixes for WCAG compliance
2. **Scalability**: 7-step roadmap from 1K to 100K DAU
3. **Performance**: Caching, indexing, and connection pooling
4. **Architecture**: Microservice extraction plan for the monolith
5. **Cost**: Projected costs at different scale points

The current architecture is solid for MVP scale (~1K DAU). Implementing the Phase 1 changes (caching + indexes) will support 5K+ DAU. The microservice split in Phase 2 prepares for 10K+ DAU.

