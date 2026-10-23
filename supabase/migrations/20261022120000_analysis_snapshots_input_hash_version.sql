-- R&D finding F01: analysis_snapshots.input_hash was computed with an
-- array replacer that dropped nested keys, so different financial inputs
-- could share a hash. New rows record the canonical serializer version.
-- Existing rows stay as they are (NULL = legacy v1): their inputs were not
-- stored, so they cannot be re-hashed, and history is never rewritten.
alter table public.analysis_snapshots
  add column if not exists input_hash_version text;

comment on column public.analysis_snapshots.input_hash_version is
  'Serializer used for input_hash. NULL = legacy v1 (ignored nested keys; not proof of identical inputs). canonical-json-v2 = every nested value, sorted keys, NaN rejected.';
