-- Drop the encrypt_phone_trigger (correct name)
DROP TRIGGER IF EXISTS encrypt_phone_trigger ON public.profiles;

-- Now drop the function
DROP FUNCTION IF EXISTS public.encrypt_profile_phone();