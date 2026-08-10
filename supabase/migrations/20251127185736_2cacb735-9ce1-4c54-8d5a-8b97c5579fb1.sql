-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create analyses table
CREATE TABLE public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idea TEXT NOT NULL,
  location TEXT NOT NULL,
  result JSONB NOT NULL,
  confidence_score INTEGER,
  startup_investment NUMERIC,
  monthly_profit NUMERIC,
  payback_months INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- Fixed 2026-08-10: every other table added later in this repo's history
-- explicitly GRANTs to service_role (RLS bypass via bypassrls does NOT
-- imply table-level privileges -- those are two separate Postgres
-- mechanisms), but this original table never did, relying entirely on
-- whatever default privileges happen to be configured. Confirmed live via
-- this exact isolated CI replay: a fresh `supabase db reset` leaves
-- service_role with zero grants on public.analyses ("permission denied for
-- table analyses", 42501), breaking every edge function that writes here
-- (analyze-business, promote-scenario-to-analysis, this test's own seeding).
-- Production evidently has this grant from some out-of-band source (the
-- app's core analysis-save path works live), so this is additive and safe
-- to apply idempotently everywhere.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyses TO service_role;

-- Fixed 2026-08-10 (E5, evidence-service branch): same class of gap as
-- the service_role grant above, confirmed live via this exact isolated
-- CI replay -- `authenticated` has NEVER been explicitly granted
-- table-level privileges on public.analyses anywhere in tracked
-- migration history either (grep confirms only the service_role grant
-- above and one unrelated function EXECUTE grant exist). The live app
-- clearly works for real logged-in users today, so production must have
-- this from the same kind of out-of-band source as the service_role
-- gap -- but a fresh replay doesn't. This surfaced now because
-- evidence_service_schema.sql's RLS policies join to
-- `analyses.user_id = auth.uid()` via an EXISTS subquery, which Postgres
-- evaluates under the QUERYING role's own privileges on the referenced
-- table -- without this grant, that subquery itself fails with
-- insufficient_privilege, surfacing as a 403 on the OUTER query even for
-- a user reading their own row.
--
-- Scoped to exactly what's policy-backed: SELECT (the "Users can view
-- own analyses" policy below) and INSERT (the "Users can insert own
-- analyses" policy below). DELETE is intentionally left out of this
-- grant -- there IS a "Users can delete own analyses" policy below, but
-- granting it here would be a real, independent behavior change to an
-- existing production table well outside this branch's actual scope; if
-- that grant is also genuinely missing, it belongs in its own reviewed
-- fix, not bundled into an unrelated evidence-service migration. There
-- is no UPDATE policy on this table at all in tracked history, so
-- UPDATE is correctly omitted.
GRANT SELECT, INSERT ON public.analyses TO authenticated;

CREATE POLICY "Users can view own analyses"
  ON public.analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON public.analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses"
  ON public.analyses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_analyses_user_created ON public.analyses(user_id, created_at DESC);

-- Trigger for auto profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();