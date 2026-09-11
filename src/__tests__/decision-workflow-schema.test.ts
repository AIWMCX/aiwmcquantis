import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const schemaSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260911075212_decision_workflow_schema.sql"),
  "utf8",
);
const hardeningSql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260911075359_decision_workflow_schema_hardening.sql"),
  "utf8",
);

describe("Founder Decision Review / Consultant Intake — Day 1 schema", () => {
  const tables = [
    "workflow_templates", "workflow_entitlements", "decision_workspaces",
    "decision_workspace_members", "decision_frames", "decision_evidence_items",
    "decision_assumptions", "decision_scenarios", "decision_calculation_runs",
    "decision_risks", "decision_actions", "decision_review_events",
    "decision_packet_versions", "decision_activity_events",
  ];

  it("creates all 14 tables from the spec's data model", () => {
    for (const t of tables) {
      expect(schemaSql).toContain(`create table public.${t}`);
    }
  });

  it("enables AND forces RLS on every new table (force, not just enable -- table owner bypass is a real gap otherwise)", () => {
    for (const t of tables) {
      expect(schemaSql).toContain(`alter table public.${t} enable row level security`);
      expect(schemaSql).toContain(`alter table public.${t} force row level security`);
    }
  });

  it("does not name the new scenario table `scenarios` -- that name is already taken by the unrelated Scenario Workspace feature", () => {
    expect(schemaSql).not.toMatch(/create table public\.scenarios\b/);
    expect(schemaSql).toContain("create table public.decision_scenarios");
  });

  it("does not reuse `workspaces` as a bare name -- this app already has a distinct paid-engagement workspace concept", () => {
    expect(schemaSql).not.toMatch(/create table public\.workspaces\b/);
    expect(schemaSql).toContain("create table public.decision_workspaces");
  });

  it("purchase_id on workflow_entitlements is UNIQUE, so a webhook replay or duplicate success return cannot mint a second entitlement", () => {
    const idx = schemaSql.indexOf("create table public.workflow_entitlements");
    const end = schemaSql.indexOf(");", idx);
    const block = schemaSql.slice(idx, end);
    expect(block).toContain("unique (purchase_id)");
  });

  it("consultant-private evidence/risks/actions/packets are excluded from the client-facing RLS policy, not just hidden in the UI", () => {
    for (const t of ["decision_evidence_items", "decision_risks", "decision_actions"]) {
      const idx = schemaSql.indexOf(`create table public.${t}`);
      const nextTableIdx = schemaSql.indexOf("create table public.", idx + 1);
      const block = schemaSql.slice(idx, nextTableIdx > -1 ? nextTableIdx : undefined);
      expect(block).toContain("consultant_private");
      expect(block).toMatch(/\.visibility = 'shared'/);
      expect(block).toMatch(/or m\.role in \(/);
    }
  });

  it("decision_packet_versions has an is_complete flag distinguishing a draft from the real completion standard", () => {
    const idx = schemaSql.indexOf("create table public.decision_packet_versions");
    const end = schemaSql.indexOf(");", idx);
    const block = schemaSql.slice(idx, end);
    expect(block).toContain("is_complete boolean not null default false");
  });

  it("the updated_at trigger function has a pinned search_path (hardening pass, not the original schema commit)", () => {
    expect(hardeningSql).toContain("set_decision_workflow_updated_at");
    expect(hardeningSql).toMatch(/set search_path = ''/);
  });

  it("anon has no grants on any of the 14 new tables (hardening pass)", () => {
    for (const t of tables) {
      expect(hardeningSql).toMatch(new RegExp(`revoke[^;]*on table public\\.${t} from anon`));
    }
  });
});
