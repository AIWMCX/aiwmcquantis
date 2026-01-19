-- ============================================
-- PRO TIER FEATURES: Database Schema
-- ============================================

-- 1. BRANDING SETTINGS TABLE
CREATE TABLE public.branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  accent_color TEXT DEFAULT '#22c55e',
  header_text TEXT,
  footer_text TEXT,
  hide_quantis_branding BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding_settings FORCE ROW LEVEL SECURITY;

-- RLS Policies for branding_settings
CREATE POLICY "Users can view own branding" ON public.branding_settings
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own branding" ON public.branding_settings
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own branding" ON public.branding_settings
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own branding" ON public.branding_settings
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Deny anonymous access to branding" ON public.branding_settings
  FOR ALL TO anon
  USING (false);

-- 2. API KEYS TABLE
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['analyze'],
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  rate_limit_per_hour INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys FORCE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
CREATE POLICY "Users can view own api keys" ON public.api_keys
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api keys" ON public.api_keys
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api keys" ON public.api_keys
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own api keys" ON public.api_keys
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Deny anonymous access to api_keys" ON public.api_keys
  FOR ALL TO anon
  USING (false);

-- Service role can access for API validation
CREATE POLICY "Service role full access to api_keys" ON public.api_keys
  FOR ALL
  USING (public.is_service_role());

-- 3. API REQUEST LOGS TABLE
CREATE TABLE public.api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  request_body JSONB,
  status_code INTEGER,
  latency_ms INTEGER,
  error_message TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_logs FORCE ROW LEVEL SECURITY;

-- RLS Policies for api_request_logs
CREATE POLICY "Users can view own api logs" ON public.api_request_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Deny anonymous access to api_logs" ON public.api_request_logs
  FOR ALL TO anon
  USING (false);

CREATE POLICY "Service role full access to api_logs" ON public.api_request_logs
  FOR ALL
  USING (public.is_service_role());

-- 4. TEAMS TABLE
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams FORCE ROW LEVEL SECURITY;

-- 5. TEAM MEMBERS TABLE
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members FORCE ROW LEVEL SECURITY;

-- 6. TEAM INVITATIONS TABLE
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations FORCE ROW LEVEL SECURITY;

-- 7. ADD TEAM_ID TO ANALYSES
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_analyses_team_id ON public.analyses(team_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to check if user is team member
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id
  )
$$;

-- Function to check if user is team owner or admin
CREATE OR REPLACE FUNCTION public.is_team_admin(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id 
      AND team_id = _team_id 
      AND role IN ('owner', 'admin')
  )
$$;

-- ============================================
-- TEAM RLS POLICIES
-- ============================================

-- Teams: Members can view their teams
CREATE POLICY "Team members can view team" ON public.teams
  FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid(), id) OR owner_id = auth.uid());

-- Teams: Only owner can create
CREATE POLICY "Users can create teams" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Teams: Only owner/admin can update
CREATE POLICY "Team admins can update team" ON public.teams
  FOR UPDATE TO authenticated
  USING (public.is_team_admin(auth.uid(), id));

-- Teams: Only owner can delete
CREATE POLICY "Team owner can delete team" ON public.teams
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Deny anonymous access to teams" ON public.teams
  FOR ALL TO anon
  USING (false);

-- Team Members: Members can view other members
CREATE POLICY "Team members can view members" ON public.team_members
  FOR SELECT TO authenticated
  USING (public.is_team_member(auth.uid(), team_id));

-- Team Members: Admins can add members
CREATE POLICY "Team admins can add members" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_team_admin(auth.uid(), team_id) OR auth.uid() = user_id);

-- Team Members: Admins can update roles
CREATE POLICY "Team admins can update members" ON public.team_members
  FOR UPDATE TO authenticated
  USING (public.is_team_admin(auth.uid(), team_id));

-- Team Members: Admins can remove members (except owner)
CREATE POLICY "Team admins can remove members" ON public.team_members
  FOR DELETE TO authenticated
  USING (public.is_team_admin(auth.uid(), team_id) AND role != 'owner');

CREATE POLICY "Deny anonymous access to team_members" ON public.team_members
  FOR ALL TO anon
  USING (false);

-- Team Invitations: Admins can manage invites
CREATE POLICY "Team admins can view invitations" ON public.team_invitations
  FOR SELECT TO authenticated
  USING (public.is_team_admin(auth.uid(), team_id));

CREATE POLICY "Team admins can create invitations" ON public.team_invitations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_team_admin(auth.uid(), team_id));

CREATE POLICY "Team admins can delete invitations" ON public.team_invitations
  FOR DELETE TO authenticated
  USING (public.is_team_admin(auth.uid(), team_id));

CREATE POLICY "Deny anonymous access to team_invitations" ON public.team_invitations
  FOR ALL TO anon
  USING (false);

-- Service role access for invitation acceptance
CREATE POLICY "Service role access to invitations" ON public.team_invitations
  FOR ALL
  USING (public.is_service_role());

-- ============================================
-- UPDATE ANALYSES RLS FOR TEAM SHARING
-- ============================================

-- Allow team members to view shared analyses
CREATE POLICY "Team members can view shared analyses" ON public.analyses
  FOR SELECT TO authenticated
  USING (
    team_id IS NOT NULL 
    AND public.is_team_member(auth.uid(), team_id)
  );

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-add owner as team member when team is created
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_team();

-- Update timestamps
CREATE TRIGGER update_branding_settings_updated_at
  BEFORE UPDATE ON public.branding_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();