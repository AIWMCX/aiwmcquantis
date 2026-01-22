-- Fix profiles table security: ensure anonymous users cannot access any data
-- First, verify RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Drop existing anonymous deny policies to recreate them properly
DROP POLICY IF EXISTS "Deny all anon access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous DELETE on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous INSERT on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous SELECT on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous UPDATE on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous access to profiles" ON public.profiles;

-- Create a single comprehensive RESTRICTIVE policy that blocks ALL operations for anonymous role
CREATE POLICY "Block all anonymous access"
ON public.profiles
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Ensure authenticated user policies are correct (recreate for clarity)
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Authenticated users can only access their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
ON public.profiles
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (auth.uid() = id);