-- rvce_observations.source_url was NOT NULL, but "zero external evidence found"
-- is a real, honest outcome for a metric that RVCE could not corroborate --
-- it should not require fabricating a URL to persist that fact.
alter table public.rvce_observations alter column source_url drop not null;
