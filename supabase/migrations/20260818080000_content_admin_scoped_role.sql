-- Scoped Content Studio / Autoposter access role — 2026-08-18, part 1/2.
--
-- Adds the new app_role value only. Postgres cannot use a newly-added enum
-- value inside the same transaction that adds it ("unsafe use of new value
-- of enum type"), so the function/trigger/RLS work that references
-- 'content_admin' lives in a separate migration file (part 2, next
-- version) applied in its own transaction. See that file's header for the
-- full design rationale.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'content_admin';
