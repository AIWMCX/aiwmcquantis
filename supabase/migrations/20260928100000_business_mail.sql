-- Business mail layer (2026-09-28).
--
-- Connects the Quantis-domain mailboxes (Zoho Mail, MX mx.zoho.com) to the
-- product so that:
--   * support@ and legal@ (plus the published privacy@ / security@) become
--     tickets inside Quantis (/admin/inbox), answered from the same address;
--   * hello@ and marketing@ feed the acquisition pipeline: replies,
--     opt-outs and bounces are matched to commercial_prospects and stop
--     the outreach sequence; unknown senders become inbound prospects;
--   * approved Commercial Ops messages can be queued and sent from the
--     business mailbox by a paced sender (business hours, daily cap,
--     warm-up ramp, minimum gap, kill switch), with the provider's message
--     id stored as delivery evidence.
--
-- Additive only. Every table is admin-read via RLS; every write goes through
-- the business-mail edge function (service role). The human approval
-- firewall is unchanged: only status = 'approved' rows can be queued, and
-- the sender re-runs suppression immediately before each send.

-- ── Mailboxes and routing ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_mailboxes (
  address text PRIMARY KEY CHECK (address = lower(address) AND address LIKE '%@%'),
  display_name text NOT NULL,
  pipeline text NOT NULL CHECK (pipeline IN ('ticketing', 'acquisition')),
  queue text NOT NULL CHECK (queue IN ('support', 'legal', 'hello', 'marketing')),
  can_send boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.business_mailboxes (address, display_name, pipeline, queue, can_send) VALUES
  ('support@aiwmcquantis.com',   'AIWMC Quantis Support', 'ticketing',   'support',   true),
  ('legal@aiwmcquantis.com',     'AIWMC Quantis Legal',   'ticketing',   'legal',     true),
  ('privacy@aiwmcquantis.com',   'AIWMC Quantis Privacy', 'ticketing',   'legal',     false),
  ('security@aiwmcquantis.com',  'AIWMC Quantis Security','ticketing',   'support',   false),
  ('hello@aiwmcquantis.com',     'AIWMC Quantis',         'acquisition', 'hello',     true),
  ('marketing@aiwmcquantis.com', 'AIWMC Quantis',         'acquisition', 'marketing', true)
ON CONFLICT (address) DO NOTHING;

-- ── Settings (singleton) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mail_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  -- Kill switch. Outreach sending stays OFF until the founder turns it on
  -- after the DNS checks pass (SPF includes Zoho, Zoho DKIM published).
  outreach_enabled boolean NOT NULL DEFAULT false,
  outreach_from text NOT NULL DEFAULT 'hello@aiwmcquantis.com',
  daily_cap integer NOT NULL DEFAULT 20 CHECK (daily_cap BETWEEN 1 AND 200),
  warmup_start date,
  warmup_base integer NOT NULL DEFAULT 5 CHECK (warmup_base >= 1),
  warmup_step integer NOT NULL DEFAULT 2 CHECK (warmup_step >= 0),
  min_gap_minutes integer NOT NULL DEFAULT 4 CHECK (min_gap_minutes BETWEEN 1 AND 240),
  send_timezone text NOT NULL DEFAULT 'America/New_York',
  send_start_hour integer NOT NULL DEFAULT 9 CHECK (send_start_hour BETWEEN 0 AND 23),
  send_end_hour integer NOT NULL DEFAULT 17 CHECK (send_end_hour BETWEEN 1 AND 24),
  send_weekdays integer[] NOT NULL DEFAULT '{1,2,3,4,5}',
  dkim_selector text NOT NULL DEFAULT 'zmail',
  support_auto_ack boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
INSERT INTO public.mail_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- ── Sync cursors and health ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mail_sync_state (
  account_id text NOT NULL,
  folder text NOT NULL CHECK (folder IN ('inbox', 'sent')),
  last_received_at timestamptz,
  last_run_at timestamptz,
  last_ok_at timestamptz,
  last_error text,
  messages_imported integer NOT NULL DEFAULT 0,
  PRIMARY KEY (account_id, folder)
);

-- ── Tickets ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  queue text NOT NULL CHECK (queue IN ('support', 'legal')),
  mailbox_address text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  subject text NOT NULL,
  requester_email text NOT NULL,
  requester_name text,
  provider_thread_id text,
  assignee_user_id uuid,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  acked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_tickets_queue_status_idx ON public.support_tickets (queue, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_requester_idx ON public.support_tickets (requester_email);
CREATE INDEX IF NOT EXISTS support_tickets_thread_idx ON public.support_tickets (provider_thread_id);

CREATE TABLE IF NOT EXISTS public.support_ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('note', 'status', 'priority', 'assign', 'ack')),
  body text,
  actor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_ticket_events_ticket_idx ON public.support_ticket_events (ticket_id, created_at);

-- ── Messages (every inbound and outbound business email) ────────────────
CREATE TABLE IF NOT EXISTS public.mail_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'zoho',
  provider_account_id text,
  provider_message_id text,
  provider_folder_id text,
  provider_thread_id text,
  internet_message_id text,
  in_reply_to text,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  mailbox_address text,
  from_address text NOT NULL,
  from_name text,
  to_addresses text[] NOT NULL DEFAULT '{}',
  cc_addresses text[] NOT NULL DEFAULT '{}',
  subject text,
  body_text text,
  message_at timestamptz NOT NULL,
  route text NOT NULL CHECK (route IN ('ticket', 'acquisition', 'outreach', 'system', 'unrouted')),
  classification text NOT NULL CHECK (classification IN ('human', 'auto_reply', 'bounce', 'unsubscribe', 'system', 'outbound')),
  match_status text NOT NULL DEFAULT 'none' CHECK (match_status IN ('none', 'matched', 'ambiguous', 'new_inbound')),
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES public.commercial_prospects(id) ON DELETE SET NULL,
  followup_id uuid REFERENCES public.commercial_followups(id) ON DELETE SET NULL,
  bounced_recipient text,
  sent_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS mail_messages_provider_msg_uidx
  ON public.mail_messages (provider, provider_account_id, provider_message_id)
  WHERE provider_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS mail_messages_ticket_idx ON public.mail_messages (ticket_id, message_at);
CREATE INDEX IF NOT EXISTS mail_messages_prospect_idx ON public.mail_messages (prospect_id, message_at);
CREATE INDEX IF NOT EXISTS mail_messages_route_idx ON public.mail_messages (route, message_at DESC);
CREATE INDEX IF NOT EXISTS mail_messages_internet_id_idx ON public.mail_messages (internet_message_id);

-- ── Email-level suppression (covers duplicate prospect rows) ────────────
CREATE TABLE IF NOT EXISTS public.email_suppressions (
  email text PRIMARY KEY CHECK (email = lower(email)),
  reason text NOT NULL CHECK (reason IN ('unsubscribed', 'hard_bounced', 'do_not_contact', 'complaint')),
  source text NOT NULL,
  mail_message_id uuid REFERENCES public.mail_messages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Outreach send queue + evidence on the existing followups table ──────
ALTER TABLE public.commercial_followups
  ADD COLUMN IF NOT EXISTS send_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS send_requested_by uuid,
  ADD COLUMN IF NOT EXISTS send_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS send_last_error text,
  ADD COLUMN IF NOT EXISTS sent_via text,
  ADD COLUMN IF NOT EXISTS sent_from text,
  ADD COLUMN IF NOT EXISTS sent_to text,
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS internet_message_id text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commercial_followups_sent_via_chk') THEN
    ALTER TABLE public.commercial_followups
      ADD CONSTRAINT commercial_followups_sent_via_chk CHECK (sent_via IS NULL OR sent_via IN ('manual', 'zoho_api', 'zoho_sent_folder'));
  END IF;
  -- Only an approved (or already sent) message can sit in the send queue.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commercial_followups_queue_requires_approval_chk') THEN
    ALTER TABLE public.commercial_followups
      ADD CONSTRAINT commercial_followups_queue_requires_approval_chk CHECK (send_requested_at IS NULL OR status IN ('approved', 'sent'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS commercial_followups_send_queue_idx
  ON public.commercial_followups (send_requested_at)
  WHERE status = 'approved' AND send_requested_at IS NOT NULL;

-- Provider-evidenced send. Service role only (called by business-mail after
-- Zoho accepted the message, or when the Sent-folder sync finds a message
-- the founder sent by hand). Same stage/batch effects as the founder's
-- mark_commercial_followup_sent(), plus the evidence columns.
CREATE OR REPLACE FUNCTION public.record_commercial_followup_provider_send(
  _followup_id uuid,
  _sent_via text,
  _sent_from text,
  _sent_to text,
  _provider_message_id text,
  _internet_message_id text,
  _sent_at timestamptz DEFAULT now()
)
RETURNS public.commercial_followups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.commercial_followups;
  v_stage public.commercial_funnel_stage;
BEGIN
  UPDATE public.commercial_followups
  SET status = 'sent',
      sent_at = COALESCE(_sent_at, now()),
      sent_via = _sent_via,
      sent_from = _sent_from,
      sent_to = _sent_to,
      provider_message_id = _provider_message_id,
      internet_message_id = _internet_message_id,
      send_last_error = NULL
  WHERE id = _followup_id AND status = 'approved'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'followup not found or not approved: %', _followup_id;
  END IF;

  SELECT stage INTO v_stage FROM public.commercial_prospects WHERE id = v_row.prospect_id FOR UPDATE;
  IF v_stage = 'discovered' THEN
    INSERT INTO public.commercial_prospect_stage_history (prospect_id, from_stage, to_stage, reason, changed_by)
    VALUES (v_row.prospect_id, 'discovered', 'contacted', 'first message sent from ' || _sent_from || ' (' || _sent_via || ')', v_row.send_requested_by);
    UPDATE public.commercial_prospects SET stage = 'contacted', updated_at = now() WHERE id = v_row.prospect_id;
  END IF;

  IF v_row.batch_id IS NOT NULL THEN
    UPDATE public.commercial_batches SET sent_count = sent_count + 1 WHERE id = v_row.batch_id;
  END IF;

  RETURN v_row;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_commercial_followup_provider_send(uuid, text, text, text, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_commercial_followup_provider_send(uuid, text, text, text, text, text, timestamptz) TO service_role;

-- ── RLS: admins read; the edge function (service role) writes ───────────
ALTER TABLE public.business_mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['business_mailboxes', 'mail_settings', 'mail_sync_state', 'support_tickets',
                           'support_ticket_events', 'mail_messages', 'email_suppressions']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''))', t || '_admin_read', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;

-- ── Schedule: sync mailboxes + one paced send tick every 5 minutes ──────
-- The function returns immediately (configured:false) until the Zoho Mail
-- OAuth secrets are set, so this is safe to schedule before setup.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'business-mail-tick') THEN
    PERFORM cron.unschedule('business-mail-tick');
  END IF;
  PERFORM cron.schedule(
    'business-mail-tick',
    '*/5 * * * *',
    $cron$
    select net.http_post(
      url := 'https://dmlxrvfyqsakyjomsvdj.supabase.co/functions/v1/business-mail',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'quantis_shared_cron_secret')
      ),
      body := '{"action":"tick","source":"pg_cron"}'::jsonb
    ) as request_id;
    $cron$
  );
END $$;
