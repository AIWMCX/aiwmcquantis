-- Instagram Harvest (/admin/instagram-harvest): founder-only triage list of the
-- tools, repos, apps and files found in the official Instagram data export.
--
-- The export ZIP is parsed in the browser; nothing logs in to Instagram.
-- Privacy: no full DM text is stored. `context` is at most 300 characters
-- around one link. Media files are never uploaded or referenced here.
--
-- ACCESS MODEL: has_role(auth.uid(), 'admin'::app_role) on every table and
-- the merge function, matching admin_users_overview / commercial_* tables.

CREATE TABLE IF NOT EXISTS public.ig_harvest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name text NOT NULL DEFAULT '',
  threads integer NOT NULL DEFAULT 0 CHECK (threads >= 0),
  link_mentions integer NOT NULL DEFAULT 0 CHECK (link_mentions >= 0),
  distinct_items integer NOT NULL DEFAULT 0 CHECK (distinct_items >= 0),
  media integer NOT NULL DEFAULT 0 CHECK (media >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ig_harvest_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key text NOT NULL UNIQUE CHECK (char_length(item_key) BETWEEN 1 AND 500),
  kind text NOT NULL,
  host text NOT NULL DEFAULT '',
  name text NOT NULL,
  example_url text,
  urls text[] NOT NULL DEFAULT '{}',
  mentions integer NOT NULL DEFAULT 0 CHECK (mentions >= 0),
  routes text[] NOT NULL DEFAULT '{}',
  senders text[] NOT NULL DEFAULT '{}',
  first_seen date,
  last_seen date,
  context text CHECK (context IS NULL OR char_length(context) <= 300),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'adopted', 'rejected')),
  product text CHECK (product IS NULL OR product IN ('quantis', 'store', 'build', 'marketing', 'video', 'other')),
  notes text,
  last_run_id uuid REFERENCES public.ig_harvest_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ig_harvest_items_status_idx ON public.ig_harvest_items (status);

DROP TRIGGER IF EXISTS trg_ig_harvest_items_updated ON public.ig_harvest_items;
CREATE TRIGGER trg_ig_harvest_items_updated
BEFORE UPDATE ON public.ig_harvest_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ig_harvest_runs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ig_harvest_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all" ON public.ig_harvest_runs;
CREATE POLICY "admin_all" ON public.ig_harvest_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin_all" ON public.ig_harvest_items;
CREATE POLICY "admin_all" ON public.ig_harvest_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Merge one batch of harvested items by item_key. Re-loading a newer export
-- must not double-count: mentions keep the larger value, dates widen, links,
-- routes and senders are unioned (capped), and the founder's triage fields
-- (status, product, notes) are never overwritten. SECURITY INVOKER, so RLS
-- applies as well as the explicit admin check.
CREATE OR REPLACE FUNCTION public.ig_harvest_merge_items(p_run_id uuid, p_items jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items must be a JSON array' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.ig_harvest_items AS t
    (item_key, kind, host, name, example_url, urls, mentions, routes, senders, first_seen, last_seen, context, last_run_id)
  SELECT
    left(i.item_key, 500),
    i.kind,
    COALESCE(i.host, ''),
    left(COALESCE(NULLIF(i.name, ''), i.item_key), 500),
    i.example_url,
    COALESCE(i.urls[1:50], '{}'),
    GREATEST(COALESCE(i.mentions, 0), 0),
    COALESCE(i.routes, '{}'),
    COALESCE(i.senders[1:50], '{}'),
    i.first_seen,
    i.last_seen,
    left(NULLIF(i.context, ''), 300),
    p_run_id
  FROM jsonb_to_recordset(p_items) AS i(
    item_key text, kind text, host text, name text, example_url text, urls text[], mentions integer,
    routes text[], senders text[], first_seen date, last_seen date, context text
  )
  WHERE NULLIF(i.item_key, '') IS NOT NULL AND NULLIF(i.kind, '') IS NOT NULL
  ON CONFLICT (item_key) DO UPDATE SET
    kind        = EXCLUDED.kind,
    host        = EXCLUDED.host,
    name        = EXCLUDED.name,
    example_url = COALESCE(t.example_url, EXCLUDED.example_url),
    urls        = ARRAY(SELECT x.v FROM unnest(t.urls || EXCLUDED.urls) WITH ORDINALITY AS x(v, n) GROUP BY x.v ORDER BY min(x.n) LIMIT 50),
    mentions    = GREATEST(t.mentions, EXCLUDED.mentions),
    routes      = ARRAY(SELECT x.v FROM unnest(t.routes || EXCLUDED.routes) WITH ORDINALITY AS x(v, n) GROUP BY x.v ORDER BY min(x.n)),
    senders     = ARRAY(SELECT x.v FROM unnest(t.senders || EXCLUDED.senders) WITH ORDINALITY AS x(v, n) GROUP BY x.v ORDER BY min(x.n) LIMIT 50),
    first_seen  = LEAST(t.first_seen, EXCLUDED.first_seen),
    last_seen   = GREATEST(t.last_seen, EXCLUDED.last_seen),
    context     = COALESCE(t.context, EXCLUDED.context),
    last_run_id = EXCLUDED.last_run_id,
    updated_at  = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.ig_harvest_merge_items(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ig_harvest_merge_items(uuid, jsonb) TO authenticated;
