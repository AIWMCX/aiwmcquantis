-- Seeds the two workflow_templates rows so the webhook (next migration/PR)
-- has an active template to attach a new decision_workspace to. step_definitions
-- mirrors the spec's shared 6-step shell (section 3); the actual guided UI for
-- each step does not exist yet (Day 5-8 of the sequence) -- this is the
-- versioned contract the UI will read against once built, not the UI itself.

insert into public.workflow_templates (code, version, name, audience, active, step_definitions) values
(
  'founder_review',
  1,
  'Founder Decision Review',
  'founder',
  true,
  '[
    {"key": "frame", "label": "Frame"},
    {"key": "evidence_and_inputs", "label": "Evidence & inputs"},
    {"key": "drivers", "label": "Drivers"},
    {"key": "scenarios", "label": "Scenarios"},
    {"key": "premortem_and_choices", "label": "Pre-mortem & choices"},
    {"key": "review_and_act", "label": "Review & act"}
  ]'::jsonb
),
(
  'consultant_intake',
  1,
  'Consultant Intake & Client Decision Workspace',
  'consultant',
  true,
  '[
    {"key": "frame", "label": "Engagement frame"},
    {"key": "evidence_and_inputs", "label": "Evidence request room"},
    {"key": "drivers", "label": "Issue tree & drivers"},
    {"key": "scenarios", "label": "Options and scenarios"},
    {"key": "premortem_and_choices", "label": "Contradiction queue & risks"},
    {"key": "review_and_act", "label": "Review room"}
  ]'::jsonb
);
