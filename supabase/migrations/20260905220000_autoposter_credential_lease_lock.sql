-- Correction to the previous pass (2026-09-05): pg_try_advisory_lock /
-- pg_advisory_unlock are session-scoped. Calling them as two separate
-- Supabase RPC requests from an Edge Function gives no guarantee that
-- PostgREST/pgbouncer routes both calls to the same underlying Postgres
-- session -- the acquire and release can land on different pooled
-- connections. A lock released by a session that never held it is a no-op;
-- a lock held by a session that gets recycled for an unrelated request
-- never gets released at all. This is not a corner case, it's the normal
-- operating mode of a connection pooler.
--
-- Replaced with a durable, row-based lease: a single atomic conditional
-- UPDATE (one round trip, one statement, no cross-call session assumption)
-- both claims and time-bounds the lease. Every subsequent write this
-- worker makes to the credential is re-gated on still owning the lease,
-- so a worker whose lease has already expired (e.g. it hung past the
-- lease window) can never overwrite a newer refresh a later worker
-- already completed.

drop function if exists public.autoposter_try_lock_credential(uuid);
drop function if exists public.autoposter_unlock_credential(uuid);

alter table public.autoposter_credentials
  add column refresh_lease_owner text,
  add column refresh_lease_expires_at timestamptz;

comment on column public.autoposter_credentials.refresh_lease_owner is
  'Opaque token (crypto.randomUUID(), generated client-side per refresh attempt) identifying which worker currently owns the refresh lease. Every write this worker makes during a refresh is conditioned on refresh_lease_owner still matching this value, so an expired/zombie worker can never clobber a newer refresh.';
comment on column public.autoposter_credentials.refresh_lease_expires_at is
  'Lease expiry. A lease can be reclaimed by any worker once this passes, regardless of whether the prior owner ever explicitly released it -- this is what makes the lease durable against a crashed or hung worker, unlike a session-scoped advisory lock.';
