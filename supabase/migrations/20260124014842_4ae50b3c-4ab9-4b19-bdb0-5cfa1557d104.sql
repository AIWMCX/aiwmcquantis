
-- Remove obsolete trigger and function that reference deleted 'phone' column
DROP TRIGGER IF EXISTS enforce_no_plaintext_phone ON public.profiles;
DROP FUNCTION IF EXISTS public.block_plaintext_phone() CASCADE;
