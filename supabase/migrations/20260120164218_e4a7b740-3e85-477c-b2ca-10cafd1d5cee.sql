-- =============================================
-- SECURITY HARDENING - ADD ENCRYPTED COLUMN FIRST
-- =============================================

-- Add encrypted phone column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_encrypted bytea;