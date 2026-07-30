-- Phase B truth repair: Docs Studio's real persistence layer never existed.
-- Confirmed live via direct query: `select * from public.doc_templates` threw
-- 42P01 (relation does not exist). src/hooks/useDocuments.ts, useDocDownloadLimit.ts,
-- and useDocSignals.ts all depend on tables that were never created, meaning:
--   - every Plus/Pro document save failed (documents/doc_templates missing)
--   - free-tier users got a FALSE "daily limit reached" error on their very
--     first download, because document_downloads' missing-table error was
--     read as "count check failed" -> recordDownload() returned false
--   - "My Documents" library was always empty (documents select always failed)
--   - template usage analytics were never recorded
-- This migration creates exactly the schema src/types/document.ts already
-- specifies (that file was the de-facto spec, just never implemented).

create table public.doc_templates (
  id uuid primary key default gen_random_uuid(),
  template_id text not null unique,
  name text not null,
  description text,
  category text not null,
  tier text not null check (tier in ('free','plus')),
  icon text,
  template_json jsonb not null default '{}'::jsonb,
  usage_count integer not null default 0,
  version text not null default '1',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.doc_templates enable row level security;

create policy doc_templates_public_read on public.doc_templates
  for select using (is_active = true);

-- Seed the 10 real templates from src/pages/DocsStudio.tsx's TEMPLATE_CARDS —
-- category/tier here mirror the actual UI, not the stale TemplateCategory
-- TS union (finance/legal/operations/tech), which had already drifted from
-- the real categories (financial/legal/planning/fundraising) — tracked as a
-- follow-up type fix, not blocking this persistence repair.
insert into public.doc_templates (template_id, name, description, category, tier, icon, version) values
  ('professional-invoice', 'Professional Invoice', 'Generate invoices instantly with automatic calculations, line items, and tax support.', 'financial', 'free', 'FileSpreadsheet', '1'),
  ('quarterly-summary', 'Quarterly Summary', 'Comprehensive business performance reports with financials, metrics, and outlook.', 'financial', 'free', 'BarChart3', '1'),
  ('nda-agreement', 'NDA Agreement', 'Professional mutual non-disclosure agreement with full legal clauses.', 'legal', 'free', 'Scale', '1'),
  ('business-plan', 'Business Plan', 'Comprehensive 5-section business plan with executive summary and financial projections.', 'planning', 'plus', 'FileText', '1'),
  ('pitch-deck', 'Pitch Deck', '10-slide investor pitch deck with TAM/SAM/SOM, financials, and team sections.', 'fundraising', 'plus', 'Zap', '1'),
  ('one-page-plan', 'One-Page Plan', 'Concise single-page business summary with vision, metrics, and key highlights.', 'planning', 'plus', 'FileText', '1'),
  ('financial-forecast', 'Financial Forecast', '3-scenario financial projections with pessimistic, base, and optimistic views.', 'financial', 'plus', 'BarChart3', '1'),
  ('partnership-proposal', 'Partnership Proposal', 'Professional partnership proposal with terms, responsibilities, and value proposition.', 'legal', 'plus', 'Users', '1'),
  ('founder-agreement', 'Founder Agreement', 'Co-founder equity, vesting, IP assignment, and governance agreement.', 'legal', 'plus', 'Users', '1'),
  ('market-analysis', 'Market Analysis', 'Comprehensive market research with TAM/SAM/SOM, competition, and trends.', 'planning', 'plus', 'BarChart3', '1');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.doc_templates(id) on delete set null,
  analysis_id uuid references public.analyses(id) on delete set null,
  title text not null,
  document_json jsonb not null default '{}'::jsonb,
  variables_data jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','review','final')),
  version integer not null default 1,
  is_shared boolean not null default false,
  share_token text unique,
  share_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index documents_user_id_idx on public.documents(user_id);
create index documents_analysis_id_idx on public.documents(analysis_id);

alter table public.documents enable row level security;

create policy documents_owner_select on public.documents
  for select using (user_id = auth.uid());
create policy documents_owner_insert on public.documents
  for insert with check (user_id = auth.uid());
create policy documents_owner_update on public.documents
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy documents_owner_delete on public.documents
  for delete using (user_id = auth.uid());
-- Signed share-token read access is a deliberate follow-up (needs an
-- expiry-aware policy + edge function to mint tokens) — not added here to
-- avoid a half-built anonymous-read surface.

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version_number integer not null,
  snapshot_json jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  change_description text,
  unique(document_id, version_number)
);

create index document_versions_document_id_idx on public.document_versions(document_id);

alter table public.document_versions enable row level security;

create policy document_versions_owner_select on public.document_versions
  for select using (user_id = auth.uid());
create policy document_versions_owner_insert on public.document_versions
  for insert with check (user_id = auth.uid());
-- No update/delete: version history is immutable once written.

create table public.document_exports (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  format text not null check (format in ('pdf','docx','md','html')),
  file_url text,
  file_size_bytes bigint,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  error_message text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index document_exports_document_id_idx on public.document_exports(document_id);
create index document_exports_user_id_idx on public.document_exports(user_id);

alter table public.document_exports enable row level security;

create policy document_exports_owner_select on public.document_exports
  for select using (user_id = auth.uid());
create policy document_exports_owner_insert on public.document_exports
  for insert with check (user_id = auth.uid());
create policy document_exports_owner_update on public.document_exports
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.doc_performance_signals (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  signal_type text not null,
  signal_value numeric,
  context jsonb,
  created_at timestamptz not null default now()
);

create index doc_performance_signals_user_id_idx on public.doc_performance_signals(user_id);

alter table public.doc_performance_signals enable row level security;

create policy doc_performance_signals_owner_select on public.doc_performance_signals
  for select using (user_id = auth.uid());
create policy doc_performance_signals_owner_insert on public.doc_performance_signals
  for insert with check (user_id = auth.uid());

-- document_downloads: NOT keyed to doc_templates.id — useDocDownloadLimit.ts
-- passes the raw TEMPLATE_CARDS slug (e.g. 'professional-invoice'), so
-- template_id here is text, matching actual call-site behavior.
create table public.document_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null,
  download_format text not null,
  downloaded_at timestamptz not null default now()
);

create index document_downloads_user_id_downloaded_at_idx on public.document_downloads(user_id, downloaded_at);

alter table public.document_downloads enable row level security;

create policy document_downloads_owner_select on public.document_downloads
  for select using (user_id = auth.uid());
create policy document_downloads_owner_insert on public.document_downloads
  for insert with check (user_id = auth.uid());
