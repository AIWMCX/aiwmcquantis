-- AIWMC Quantis — Founder Decision Review ($349) / Consultant Intake & Client
-- Decision Workspace ($499) — Day 1 of the founder-approved delivery sequence:
-- "product contract and payment safety" (schema + RLS only, no application
-- logic in this migration).
--
-- Namespaced `decision_*` throughout, deliberately distinct from this app's
-- existing `paid_engagements`/`EngagementWorkspace` concept (a different,
-- already-shipped product) and from the existing unrelated `scenarios` table
-- (Scenario Workspace feature: scenario_set_id/starting_case/locked -- a
-- different concept entirely). Reusing either name here would be a real
-- collision risk, not just an aesthetic one.
--
-- Founder decisions locked in before this migration was written (2026-09-11):
--   - Self-serve only for v1 (no founder-review gate in the state machine).
--   - Consultant workspace ships with exactly one client seat.
--   - Refund policy: full refund allowed until decision_packet_generated;
--     none after (enforced at the application/Stripe layer, not by RLS --
--     recorded here as a comment on packet_versions).
--   - Retention: indefinite. Support/founder access to workspace content
--     requires a logged, time-bound, per-instance consent grant -- that
--     consent-grant mechanism is intentionally NOT built in this migration
--     (schema-only slice); until it exists, nobody but the workspace
--     owner/members can read workspace content, which is the safe default.

-- ============================================================================
-- 1. workflow_templates — versioned catalog of the two workflow types.
-- ============================================================================
create table public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null,                         -- 'founder_review' | 'consultant_intake'
  version integer not null,
  name text not null,
  audience text not null check (audience in ('founder', 'consultant')),
  active boolean not null default false,
  step_definitions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (code, version)
);

comment on table public.workflow_templates is
  'Versioned workflow definitions for the Founder Decision Review and Consultant Intake products. A workspace pins the exact template version it was created from (workspaces.template_id) so a later template edit never silently changes an in-flight or completed workspace.';

alter table public.workflow_templates enable row level security;
alter table public.workflow_templates force row level security;

-- Templates are product catalog metadata, not customer data -- readable by
-- any authenticated user (needed to render the pre-purchase preview), never
-- anonymous (the preview UI can ship its own static redacted copy; no reason
-- to expose real template internals to logged-out scrapers).
create policy "Authenticated users can read active templates"
  on public.workflow_templates for select
  to authenticated
  using (active = true);

create policy "Service role manages templates"
  on public.workflow_templates for all
  to service_role
  using (true) with check (true);

-- ============================================================================
-- 2. workflow_entitlements — one row per verified paid purchase.
-- ============================================================================
create table public.workflow_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purchase_id text not null,                  -- Stripe/Whop payment identifier
  purchase_intent_id uuid not null,            -- server-created before checkout; never client-selected
  template_code text not null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text,
  unique (purchase_id)                          -- webhook replay / duplicate success return safety
);

comment on table public.workflow_entitlements is
  'One row per verified paid entitlement. purchase_id carries a UNIQUE constraint specifically so a Stripe/Whop webhook retry, or a browser refresh hitting a duplicate "success" return, cannot mint a second entitlement for the same charge -- this is the idempotency boundary called for in the spec (section 7, "Purchase-to-workspace activation").';

alter table public.workflow_entitlements enable row level security;
alter table public.workflow_entitlements force row level security;

create policy "Users can read their own entitlements"
  on public.workflow_entitlements for select
  to authenticated
  using (user_id = auth.uid());

create policy "Service role manages entitlements"
  on public.workflow_entitlements for all
  to service_role
  using (true) with check (true);

-- ============================================================================
-- 3. decision_workspaces — the persistent guided workspace itself.
-- ============================================================================
create table public.decision_workspaces (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workflow_templates(id),
  entitlement_id uuid not null references public.workflow_entitlements(id),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'setup' check (status in (
    'setup', 'evidence_and_inputs', 'model_and_scenarios',
    'risk_and_decision', 'review', 'packet_generated', 'follow_up'
  )),
  currency text not null default 'USD',
  timezone text not null default 'UTC',
  fiscal_start_month integer not null default 1 check (fiscal_start_month between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.decision_workspaces is
  'One workspace per paid entitlement (1:1 via entitlement_id) -- the journey state machine in the spec (Preview -> Checkout -> Entitled -> Setup -> ... -> Packet_generated -> Follow_up) is tracked by `status` starting from Setup, since Preview/Checkout/Entitled are pre-workspace states already covered by workflow_entitlements.';

alter table public.decision_workspaces enable row level security;
alter table public.decision_workspaces force row level security;

create index decision_workspaces_owner_idx on public.decision_workspaces(owner_user_id);

create policy "Service role manages workspaces"
  on public.decision_workspaces for all
  to service_role
  using (true) with check (true);
-- Member-based read/write policies are added after workspace_members exists
-- (below) since they reference it.

-- ============================================================================
-- 4. decision_workspace_members — owner + invited roles.
-- ============================================================================
create table public.decision_workspace_members (
  workspace_id uuid not null references public.decision_workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invited_email text,                          -- set before the invited user has an account
  role text not null check (role in (
    'founder_owner', 'consultant_owner', 'consultant_collaborator',
    'client_contributor', 'client_reviewer'
  )),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  primary key (workspace_id, user_id)
);

comment on table public.decision_workspace_members is
  'Role-controlled membership. Consultant workspaces (v1) are capped at exactly one client seat -- enforced at the application layer (a single active client_contributor/client_reviewer row per workspace), not by a DB constraint, since the cap is a product decision that may change per plan tier later. No role is ever granted from a client-supplied email parameter alone: invited_email is only a mailing target until the invited person authenticates and user_id is set server-side.';

alter table public.decision_workspace_members enable row level security;
alter table public.decision_workspace_members force row level security;

create index decision_workspace_members_user_idx on public.decision_workspace_members(user_id);

create policy "Members can read their own membership rows"
  on public.decision_workspace_members for select
  to authenticated
  using (user_id = auth.uid());

create policy "Service role manages membership"
  on public.decision_workspace_members for all
  to service_role
  using (true) with check (true);

-- Now that workspace_members exists, add the real member-scoped policies on
-- decision_workspaces: a user may read/act on a workspace only if they own it
-- or are an active (non-revoked) member.
create policy "Members can read workspaces they belong to"
  on public.decision_workspaces for select
  to authenticated
  using (
    owner_user_id = auth.uid()
    or exists (
      select 1 from public.decision_workspace_members m
      where m.workspace_id = decision_workspaces.id
        and m.user_id = auth.uid()
        and m.revoked_at is null
    )
  );

-- ============================================================================
-- 5. decision_frames — the one-sentence decision + constraints.
-- ============================================================================
create table public.decision_frames (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.decision_workspaces(id) on delete cascade,
  decision_text text not null,
  deadline date,
  decision_owner_id uuid references auth.users(id),
  constraints_json jsonb not null default '{}'::jsonb,  -- cash floor, max loss, non-financial constraints
  disposition text check (disposition in (
    'proceed', 'proceed_only_if', 'pause_and_test', 'do_not_proceed_yet'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

alter table public.decision_frames enable row level security;
alter table public.decision_frames force row level security;

create policy "Members can read their workspace's decision frame"
  on public.decision_frames for select
  to authenticated
  using (
    exists (
      select 1 from public.decision_workspaces w
      where w.id = decision_frames.workspace_id
        and (
          w.owner_user_id = auth.uid()
          or exists (
            select 1 from public.decision_workspace_members m
            where m.workspace_id = w.id and m.user_id = auth.uid() and m.revoked_at is null
          )
        )
    )
  );

create policy "Service role manages decision frames"
  on public.decision_frames for all
  to service_role
  using (true) with check (true);

-- ============================================================================
-- 6. decision_evidence_items — uploaded/pasted evidence with classification.
-- ============================================================================
create table public.decision_evidence_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.decision_workspaces(id) on delete cascade,
  source_type text not null check (source_type in ('upload', 'paste', 'connected_source')),
  file_id text,                                -- storage object id, when source_type='upload'
  source_locator text,                          -- page/cell/text-range reference for citation
  extracted_text text,
  classification text not null default 'user_stated_input' check (classification in (
    'source_backed_fact', 'user_stated_input', 'assumption'
  )),
  confidence numeric(3,2) check (confidence between 0 and 1),
  visibility text not null default 'shared' check (visibility in ('shared', 'consultant_private')),
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

comment on table public.decision_evidence_items is
  'visibility=consultant_private is how "private consultant notes are technically and visually separate from client-visible items" (spec section 5) is enforced at the data layer, not just in the UI -- the client-facing RLS policy below filters on it.';

alter table public.decision_evidence_items enable row level security;
alter table public.decision_evidence_items force row level security;

create index decision_evidence_items_workspace_idx on public.decision_evidence_items(workspace_id);

create policy "Members can read shared evidence; owners/collaborators also read private notes"
  on public.decision_evidence_items for select
  to authenticated
  using (
    exists (
      select 1 from public.decision_workspace_members m
      where m.workspace_id = decision_evidence_items.workspace_id
        and m.user_id = auth.uid()
        and m.revoked_at is null
        and (
          decision_evidence_items.visibility = 'shared'
          or m.role in ('founder_owner', 'consultant_owner', 'consultant_collaborator')
        )
    )
    or exists (
      select 1 from public.decision_workspaces w
      where w.id = decision_evidence_items.workspace_id and w.owner_user_id = auth.uid()
    )
  );

create policy "Service role manages evidence items"
  on public.decision_evidence_items for all
  to service_role
  using (true) with check (true);

-- ============================================================================
-- 7. decision_assumptions — the assumption register.
-- ============================================================================
create table public.decision_assumptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.decision_workspaces(id) on delete cascade,
  driver_key text not null,
  value_base numeric,
  low_value numeric,
  high_value numeric,
  unit text,
  period text,
  classification text not null default 'assumption' check (classification in (
    'source_backed_fact', 'user_stated_input', 'assumption', 'derived_calculation'
  )),
  evidence_id uuid references public.decision_evidence_items(id),
  owner_id uuid references auth.users(id),
  validation_due_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.decision_assumptions enable row level security;
alter table public.decision_assumptions force row level security;

create index decision_assumptions_workspace_idx on public.decision_assumptions(workspace_id);

create policy "Members can read their workspace's assumptions"
  on public.decision_assumptions for select
  to authenticated
  using (
    exists (
      select 1 from public.decision_workspace_members m
      where m.workspace_id = decision_assumptions.workspace_id
        and m.user_id = auth.uid() and m.revoked_at is null
    )
    or exists (
      select 1 from public.decision_workspaces w
      where w.id = decision_assumptions.workspace_id and w.owner_user_id = auth.uid()
    )
  );

create policy "Service role manages assumptions"
  on public.decision_assumptions for all
  to service_role
  using (true) with check (true);

-- ============================================================================
-- 8. decision_scenarios — Base / Downside / Required-to-work.
-- ============================================================================
create table public.decision_scenarios (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.decision_workspaces(id) on delete cascade,
  name text not null,
  type text not null check (type in ('base', 'downside', 'required_to_work')),
  input_overrides_json jsonb not null default '{}'::jsonb,
  calculation_version text not null,
  status text not null default 'pending' check (status in ('pending', 'calculated', 'validation_failed')),
  created_at timestamptz not null default now()
);

comment on table public.decision_scenarios is
  'Deliberately not named `scenarios` -- that table already exists for the unrelated Scenario Workspace feature (scenario_set_id/starting_case/locked). input_overrides_json holds driver-level deltas only (spec: "Scenario changes must be driver-level deltas, not free-text narrative"), never free text.';

alter table public.decision_scenarios enable row level security;
alter table public.decision_scenarios force row level security;

create index decision_scenarios_workspace_idx on public.decision_scenarios(workspace_id);

create policy "Members can read their workspace's scenarios"
  on public.decision_scenarios for select
  to authenticated
  using (
    exists (
      select 1 from public.decision_workspace_members m
      where m.workspace_id = decision_scenarios.workspace_id
        and m.user_id = auth.uid() and m.revoked_at is null
    )
    or exists (
      select 1 from public.decision_workspaces w
      where w.id = decision_scenarios.workspace_id and w.owner_user_id = auth.uid()
    )
  );

create policy "Service role manages scenarios"
  on public.decision_scenarios for all
  to service_role
  using (true) with check (true);

-- ============================================================================
-- 9. decision_calculation_runs — deterministic engine outputs, versioned.
-- ============================================================================
create table public.decision_calculation_runs (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.decision_scenarios(id) on delete cascade,
  input_hash text not null,
  output_json jsonb not null,
  formula_version text not null,
  validation_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.decision_calculation_runs is
  'Append-only. A scenario override changing only declared drivers must produce a traceable, reproducible output_hash (input_hash here) per the spec''s financial-engine test matrix -- never mutate a prior run''s output_json in place.';

alter table public.decision_calculation_runs enable row level security;
alter table public.decision_calculation_runs force row level security;

create index decision_calculation_runs_scenario_idx on public.decision_calculation_runs(scenario_id);

create policy "Members can read calculation runs for their workspace's scenarios"
  on public.decision_calculation_runs for select
  to authenticated
  using (
    exists (
      select 1 from public.decision_scenarios s
      join public.decision_workspace_members m on m.workspace_id = s.workspace_id
      where s.id = decision_calculation_runs.scenario_id
        and m.user_id = auth.uid() and m.revoked_at is null
    )
    or exists (
      select 1 from public.decision_scenarios s
      join public.decision_workspaces w on w.id = s.workspace_id
      where s.id = decision_calculation_runs.scenario_id and w.owner_user_id = auth.uid()
    )
  );

create policy "Service role manages calculation runs"
  on public.decision_calculation_runs for all
  to service_role
  using (true) with check (true);

-- ============================================================================
-- 10. decision_risks — pre-mortem risk register.
-- ============================================================================
create table public.decision_risks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.decision_workspaces(id) on delete cascade,
  title text not null,
  category text,
  likelihood text check (likelihood in ('low', 'medium', 'high')),
  impact text check (impact in ('low', 'medium', 'high')),
  leading_indicator text,
  mitigation text,
  owner_id uuid references auth.users(id),
  due_at date,
  visibility text not null default 'shared' check (visibility in ('shared', 'consultant_private')),
  created_at timestamptz not null default now()
);

alter table public.decision_risks enable row level security;
alter table public.decision_risks force row level security;

create index decision_risks_workspace_idx on public.decision_risks(workspace_id);

create policy "Members can read shared risks; owners/collaborators also read private notes"
  on public.decision_risks for select
  to authenticated
  using (
    exists (
      select 1 from public.decision_workspace_members m
      where m.workspace_id = decision_risks.workspace_id
        and m.user_id = auth.uid() and m.revoked_at is null
        and (decision_risks.visibility = 'shared' or m.role in ('founder_owner', 'consultant_owner', 'consultant_collaborator'))
    )
    or exists (
      select 1 from public.decision_workspaces w
      where w.id = decision_risks.workspace_id and w.owner_user_id = auth.uid()
    )
  );

create policy "Service role manages risks"
  on public.decision_risks for all
  to service_role
  using (true) with check (true);

-- ============================================================================
-- 11. decision_actions — the 30-day validation plan / advisory action register.
-- ============================================================================
create table public.decision_actions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.decision_workspaces(id) on delete cascade,
  title text not null,
  learning_goal text,
  trigger text,                                -- go/no-go trigger condition
  owner_id uuid references auth.users(id),
  due_at date,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'abandoned')),
  visibility text not null default 'shared' check (visibility in ('shared', 'consultant_private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.decision_actions enable row level security;
alter table public.decision_actions force row level security;

create index decision_actions_workspace_idx on public.decision_actions(workspace_id);

create policy "Members can read shared actions; owners/collaborators also read private notes"
  on public.decision_actions for select
  to authenticated
  using (
    exists (
      select 1 from public.decision_workspace_members m
      where m.workspace_id = decision_actions.workspace_id
        and m.user_id = auth.uid() and m.revoked_at is null
        and (decision_actions.visibility = 'shared' or m.role in ('founder_owner', 'consultant_owner', 'consultant_collaborator'))
    )
    or exists (
      select 1 from public.decision_workspaces w
      where w.id = decision_actions.workspace_id and w.owner_user_id = auth.uid()
    )
  );

create policy "Service role manages actions"
  on public.decision_actions for all
  to service_role
  using (true) with check (true);

-- ============================================================================
-- 12. decision_review_events — approval / dissent / "need more evidence".
-- ============================================================================
create table public.decision_review_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.decision_workspaces(id) on delete cascade,
  packet_version_id uuid,                       -- FK added after packet_versions is created below
  actor_id uuid not null references auth.users(id),
  decision text not null check (decision in ('approve', 'dissent', 'need_more_evidence')),
  rationale text,
  created_at timestamptz not null default now()
);

alter table public.decision_review_events enable row level security;
alter table public.decision_review_events force row level security;

create index decision_review_events_workspace_idx on public.decision_review_events(workspace_id);

create policy "Members can read their workspace's review events"
  on public.decision_review_events for select
  to authenticated
  using (
    exists (
      select 1 from public.decision_workspace_members m
      where m.workspace_id = decision_review_events.workspace_id
        and m.user_id = auth.uid() and m.revoked_at is null
    )
    or exists (
      select 1 from public.decision_workspaces w
      where w.id = decision_review_events.workspace_id and w.owner_user_id = auth.uid()
    )
  );

create policy "Service role manages review events"
  on public.decision_review_events for all
  to service_role
  using (true) with check (true);

-- ============================================================================
-- 13. decision_packet_versions — immutable snapshots of the generated packet.
-- ============================================================================
create table public.decision_packet_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.decision_workspaces(id) on delete cascade,
  snapshot_hash text not null,
  template_version integer not null,
  visibility text not null default 'client_safe' check (visibility in ('client_safe', 'consultant_full')),
  generated_at timestamptz not null default now(),
  generated_by uuid references auth.users(id),
  content_json jsonb not null,
  is_complete boolean not null default false     -- false = "Incomplete decision packet" draft, per completion standard
);

comment on table public.decision_packet_versions is
  'Immutable once inserted -- never UPDATE content_json. "Packet snapshot is unchanged if the live workspace changes afterwards" (spec, functional acceptance) means later edits must produce a NEW row, not mutate this one. This is also the enforcement point for the refund policy: full refund is allowed only while a workspace has zero rows here (or only is_complete=false drafts); once a row has is_complete=true, the deliverable has been produced.';

alter table public.decision_packet_versions enable row level security;
alter table public.decision_packet_versions force row level security;

create index decision_packet_versions_workspace_idx on public.decision_packet_versions(workspace_id);

create policy "Members can read client-safe packets; owners/collaborators also read full packets"
  on public.decision_packet_versions for select
  to authenticated
  using (
    exists (
      select 1 from public.decision_workspace_members m
      where m.workspace_id = decision_packet_versions.workspace_id
        and m.user_id = auth.uid() and m.revoked_at is null
        and (decision_packet_versions.visibility = 'client_safe' or m.role in ('founder_owner', 'consultant_owner', 'consultant_collaborator'))
    )
    or exists (
      select 1 from public.decision_workspaces w
      where w.id = decision_packet_versions.workspace_id and w.owner_user_id = auth.uid()
    )
  );

create policy "Service role manages packet versions"
  on public.decision_packet_versions for all
  to service_role
  using (true) with check (true);

alter table public.decision_review_events
  add constraint decision_review_events_packet_version_fkey
  foreign key (packet_version_id) references public.decision_packet_versions(id);

-- ============================================================================
-- 14. decision_activity_events — instrumentation (workflow_preview_viewed,
--     workflow_activated, scenario_calculated, decision_packet_generated, ...).
-- ============================================================================
create table public.decision_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  workspace_id uuid references public.decision_workspaces(id) on delete cascade,
  event_name text not null,
  payload_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

comment on table public.decision_activity_events is
  'Backs the dynamic social-proof counters (spec section 2) and the north-star measures (section 11). A "completed Founder Decision Review" is derived by joining workflow_entitlements (status=active) + a decision_packet_versions row with is_complete=true + a decision_packet_generated event here -- never counted from this table alone, and always excluding internal/test users and refunded entitlements at query time.';

alter table public.decision_activity_events enable row level security;
alter table public.decision_activity_events force row level security;

create index decision_activity_events_workspace_idx on public.decision_activity_events(workspace_id);
create index decision_activity_events_name_idx on public.decision_activity_events(event_name, occurred_at);

create policy "Users can read their own activity events"
  on public.decision_activity_events for select
  to authenticated
  using (user_id = auth.uid());

create policy "Service role manages activity events"
  on public.decision_activity_events for all
  to service_role
  using (true) with check (true);

-- ============================================================================
-- updated_at maintenance (reuses the pattern already established elsewhere
-- in this schema rather than inventing a new one).
-- ============================================================================
create or replace function public.set_decision_workflow_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger decision_workspaces_set_updated_at
  before update on public.decision_workspaces
  for each row execute function public.set_decision_workflow_updated_at();

create trigger decision_frames_set_updated_at
  before update on public.decision_frames
  for each row execute function public.set_decision_workflow_updated_at();

create trigger decision_assumptions_set_updated_at
  before update on public.decision_assumptions
  for each row execute function public.set_decision_workflow_updated_at();

create trigger decision_actions_set_updated_at
  before update on public.decision_actions
  for each row execute function public.set_decision_workflow_updated_at();
