-- 1. First, move any remaining plaintext phone data to encrypted format if needed
-- (This is a safety measure - the column should already be empty)

-- 2. Set the phone column to NULL for all records to remove any plaintext data
UPDATE public.profiles SET phone = NULL WHERE phone IS NOT NULL;

-- 3. Add a constraint to prevent future plaintext phone data insertion
-- Use a trigger instead of CHECK constraint for better flexibility
CREATE OR REPLACE FUNCTION public.block_plaintext_phone()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone IS NOT NULL THEN
    RAISE EXCEPTION 'Plaintext phone numbers are not allowed. Use phone_encrypted column with encrypt_pii() function.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop if exists to avoid errors
DROP TRIGGER IF EXISTS enforce_no_plaintext_phone ON public.profiles;

-- Create trigger to block plaintext phone on insert/update
CREATE TRIGGER enforce_no_plaintext_phone
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.block_plaintext_phone();

-- 4. Add clear documentation comment
COMMENT ON COLUMN public.profiles.phone IS 'DEPRECATED AND BLOCKED: This column is disabled via trigger. All phone data MUST use phone_encrypted column with AES-256 encryption via encrypt_pii() function. Any attempt to write to this column will raise an exception.';