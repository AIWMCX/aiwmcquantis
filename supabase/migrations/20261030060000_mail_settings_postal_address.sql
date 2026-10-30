-- Sender postal address for cold outreach (CAN-SPAM / CASL). Founder-provided;
-- business-mail refuses to send outreach while it is null.
ALTER TABLE public.mail_settings ADD COLUMN IF NOT EXISTS postal_address text;
