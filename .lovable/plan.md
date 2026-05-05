## Week 1 Stabilization Plan — Production Hardening

Goal: close the 5 highest-ROI issues from the audit before touching any deeper refactor. Each is small, isolated, and reversible. Total estimate: ~5 hours of agent work.

### Scope (in order of execution)

**1. ISSUE-003 — Replace custom HTML sanitizer with DOMPurify (already in repo)**

- `src/lib/htmlSanitizer.ts` already imports `dompurify`; verify `DocsStudio.tsx` lines 546, 592 route through `sanitizePreviewHTML`.
- Tighten config: add `FORBID_TAGS: ['style','iframe','object','embed','form']` (most already there) and re-confirm `FORBID_ATTR` covers all `on*` handlers.
- Add a unit test `src/__tests__/htmlSanitizer.test.ts` with 6 XSS payloads (mutation XSS, `<svg onload>`, `javascript:` href, `<style>` injection, `<iframe srcdoc>`, namespace confusion).

**2. ISSUE-005 — Funnel event coverage**

- Audit and ensure these 6 canonical events fire:
  - `pricing_view` → `src/pages/Pricing.tsx` `useEffect` on mount
  - `analysis_complete` → `src/services/analysisApi.ts` after success path
  - `paid_checkout_start` → `src/hooks/useStripeCheckout.ts` before redirect
  - `paid_checkout_complete` → `src/pages/ThankYou.tsx` (Stripe success URL)
  - `free_signup_start` / `free_signup_complete` → `src/components/auth/SignupForm.tsx` (or wherever signup actually lives — confirm during impl)
- Verify each via a quick `supabase--read_query` against `funnel_events` after one preview round-trip.

**3. ISSUE-008 — White-label PDF honors `subscriptions.white_label_enabled**`

- In the PDF export path (`src/hooks/usePdfExport.ts` and edge `pdf-generator/index.ts`), fetch the flag for `auth.uid()` once, pass through props, conditionally omit cover-page logo and footer brand row.
- Test by toggling the flag in DB and exporting one PDF.

**4. ISSUE-010 — RLS readonly window**

- New migration adding policy on `public.analyses`:
  ```sql
  CREATE POLICY analyses_block_writes_during_readonly
  ON public.analyses
  FOR INSERT TO authenticated
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE user_id = auth.uid()
        AND history_readonly_until IS NOT NULL
        AND history_readonly_until > now()
    )
  );
  ```
- Same pattern for UPDATE and DELETE on `analyses` (and `documents` if applicable — confirm during impl).

**5. ISSUE-017 — Dead route audit**

- Routes to inspect: `/viral-content`, `/viral-posts`, `/directory-tracker`.
- For each: check `App.tsx` route definition + nav linkage. If linked from public nav, gate behind `useAdmin()`; if orphaned, remove route + page file.

### Out of scope (for this plan — handled later)

- ISSUE-001 (refactor 11 LLM fns to `llmCall`) — all must be ASAP done and geniously with engineering perfection and precision professionally
- ISSUE-002 (calibration writer + cron) — all must be ASAP done and geniously with engineering perfection and precision professionally
- ISSUE-004 (Stripe replay test) — all must be ASAP done and geniously with engineering perfection and precision professionally
- ISSUE-006/007/009/011-018 — all must be ASAP done and geniously with engineering perfection and precision professionally

### Acceptance

- DocsStudio preview survives 6-payload XSS test suite.
- After one preview session, `funnel_events` shows ≥6 distinct event names.
- White-label flag toggle visibly removes branding from a generated PDF.
- Migration linter passes; an INSERT into `analyses` with a non-null `history_readonly_until` in the future is rejected.
- No 404s and no broken nav links after dead-route cleanup.

### Deliverables

- 1 migration file
- 1 new test file
- ~6 small edits across hooks/pages/components
- A short verification report at the end (DB rows + PDF screenshot pair)

Approve to proceed; I'll execute in one pass and report back with a verification summary.