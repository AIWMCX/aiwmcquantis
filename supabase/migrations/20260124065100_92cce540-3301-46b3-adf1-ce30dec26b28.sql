
-- CRITICAL SECURITY: Ensure only beltovbogdan@gmail.com can have admin role
-- This adds a database-level constraint to prevent any other user from getting admin access

-- First, clean up any potential orphaned admin roles (there shouldn't be any)
DELETE FROM public.user_roles 
WHERE role = 'admin' 
AND user_id != '1e12c3cd-aa4b-4914-a249-9efbe8f86eec';

-- Create a trigger function to prevent admin role assignment to anyone except the authorized user
CREATE OR REPLACE FUNCTION public.protect_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_authorized_admin_id uuid := '1e12c3cd-aa4b-4914-a249-9efbe8f86eec'; -- beltovbogdan@gmail.com
BEGIN
  -- Only allow admin role for the authorized user
  IF NEW.role = 'admin' AND NEW.user_id != v_authorized_admin_id THEN
    RAISE EXCEPTION 'Admin role assignment is restricted. Contact system administrator.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on INSERT and UPDATE
DROP TRIGGER IF EXISTS enforce_admin_restriction ON public.user_roles;
CREATE TRIGGER enforce_admin_restriction
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_admin_role();

-- Additional RLS policy: Only admins can modify user_roles (and only service role)
-- Ensure no authenticated user can directly insert admin roles
DROP POLICY IF EXISTS "Block direct admin role insertion" ON public.user_roles;
CREATE POLICY "Block direct admin role insertion"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (role != 'admin');

-- Ensure no authenticated user can update to admin role
DROP POLICY IF EXISTS "Block admin role updates" ON public.user_roles;
CREATE POLICY "Block admin role updates"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (role != 'admin')
  WITH CHECK (role != 'admin');
