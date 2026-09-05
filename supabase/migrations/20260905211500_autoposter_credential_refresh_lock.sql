-- Workstream I.1 gap fix (2026-09-05): concurrent publishing workers could
-- both observe an expiring LinkedIn token and call LinkedIn's refresh
-- endpoint simultaneously. Since LinkedIn refresh tokens can rotate on use,
-- two concurrent refreshes racing the same credential risk one invalidating
-- the token the other is mid-exchange with. A Postgres advisory lock spans
-- the two RPC round trips around the (necessarily external) HTTP call in
-- publish-due-posts: try-lock before refreshing, unlock in a finally block.
-- service_role only -- this is an internal coordination primitive, not
-- something any client role should ever call directly.

create or replace function public.autoposter_try_lock_credential(p_credential_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select pg_try_advisory_lock(hashtextextended('autoposter_credential:' || p_credential_id::text, 0));
$$;

create or replace function public.autoposter_unlock_credential(p_credential_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  select pg_advisory_unlock(hashtextextended('autoposter_credential:' || p_credential_id::text, 0));
$$;

revoke all on function public.autoposter_try_lock_credential(uuid) from public, anon, authenticated;
revoke all on function public.autoposter_unlock_credential(uuid) from public, anon, authenticated;
grant execute on function public.autoposter_try_lock_credential(uuid) to service_role;
grant execute on function public.autoposter_unlock_credential(uuid) to service_role;
