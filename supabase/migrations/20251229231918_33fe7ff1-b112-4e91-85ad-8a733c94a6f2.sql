-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON subscriptions;

-- Create a PERMISSIVE policy for service role (allows full access)
CREATE POLICY "Service role full access"
  ON subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add unique constraint on user_id for upsert to work correctly
ALTER TABLE subscriptions 
  ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);