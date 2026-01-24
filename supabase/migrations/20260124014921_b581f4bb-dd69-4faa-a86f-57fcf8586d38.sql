
-- Remove obsolete validate_phone_number trigger and function
DROP TRIGGER IF EXISTS validate_phone_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.validate_phone_number() CASCADE;
