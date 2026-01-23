-- Drop the deprecated plaintext phone column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;