

# Queue Worker + Self-Improvement Engine

## Summary

Two new Edge Functions and two new database tables, plus pg_cron scheduling for both.

## Part 1: Queue Worker (`supabase/functions/doc-queue-worker/index.ts`)

Cron-triggered function (every 30s) that batch-processes pending document generation jobs.

**Flow:**
1. Authenticate via `x-cron-secret` header (matches existing pattern in `aggregate-quality-metrics`)
2. Query `doc_generation_jobs` WHERE status='queued' ORDER BY priority, created_at LIMIT 10
3. For each job:
   - Update status → 'processing'
   - Fetch report from `report_outputs` by `analysis_id`
   - Fetch brand profile from `user_brand_profiles`
   - For AI-enhanced templates (business_plan, pitch_deck): call Lovable AI gateway via `generate-document-content` function (already exists and used by `process-doc-job`)
   - Call `pdf-generator` function to store final HTML
   - Update job → status='complete', output_url, processing_ms
   - Insert into `documents` table (generated_documents equivalent)
   - Broadcast completion via Supabase Realtime channel
4. Return `{ processed, failed, avgMs }`

**Key patterns reused:** CRON_SECRET auth from `aggregate-quality-metrics`, job claiming from `process-doc-job`, service role client.

## Part 2: Template Optimizer (`supabase/functions/template-optimizer/index.ts`)

Nightly job (2:00 AM) that scores template performance and suggests improvements.

**Flow:**
1. Query active templates from `doc_templates`
2. For each template, aggregate `doc_performance_signals` from last 7 days with weighted scoring:
   - downloaded: +1, shared_link: +2, emailed_to_investor: +5, opened_by_third_party: +8, regenerated: -1, section_edited: -2, rated_1_to_5: signal_value, resulted_in_meeting: +10, invoice_paid: +10
3. If avg_rating < 4.0 AND sample_size >= 50:
   - Call Lovable AI (gemini-3-flash-preview) with structured tool calling to get improvement suggestions
   - Store in `template_improvement_suggestions`
4. Store nightly scores in `template_performance_history`
5. Return improvement report

## Database Changes (migration)

**New table: `template_improvement_suggestions`**
- id, template_id, suggestion (JSONB), ai_confidence, status (pending/approved/rejected/applied), created_at
- RLS: anon denied, admin select/update

**New table: `template_performance_history`**
- id, template_id, performance_score, avg_rating, total_signals, sample_size, recorded_date
- RLS: anon denied, admin select

## Config Updates

Add both functions to `supabase/config.toml` with `verify_jwt = false`.

## pg_cron Jobs

Two cron jobs (via insert tool, not migration):
1. `doc-queue-worker`: every 30 seconds
2. `template-optimizer-nightly`: daily at 2:00 AM UTC

Both use `CRON_SECRET` header pattern for authentication.

## Files

| File | Action |
|------|--------|
| `supabase/functions/doc-queue-worker/index.ts` | New |
| `supabase/functions/template-optimizer/index.ts` | New |
| `supabase/config.toml` | Add 2 function entries |
| Migration | 2 new tables |
| Insert (pg_cron) | 2 cron jobs |

