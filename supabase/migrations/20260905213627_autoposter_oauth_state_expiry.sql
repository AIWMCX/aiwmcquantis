-- Workstream I.1 gap fix (2026-09-05): OAuth state rows never expired.
-- A stray, unconsumed state row lived forever with no TTL, which the
-- callback would still accept indefinitely. Add an expiry column with a
-- 10-minute default (LinkedIn's own auth-code exchange window is short;
-- 10 minutes is generous for a human to complete the redirect) and index
-- it so expired rows can be swept/queried cheaply.

alter table public.autoposter_oauth_state
  add column expires_at timestamptz not null default (now() + interval '10 minutes');

create index autoposter_oauth_state_expires_at_idx
  on public.autoposter_oauth_state (expires_at);

comment on column public.autoposter_oauth_state.expires_at is
  'State rows past this timestamp are treated as invalid by oauth-linkedin-callback even if never consumed, and are safe to delete via a periodic sweep.';
