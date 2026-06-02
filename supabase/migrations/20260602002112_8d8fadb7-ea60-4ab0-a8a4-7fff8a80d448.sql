-- Free tier quota correction: 5 analyses, 5 QuoteGen, 3 free document templates.

-- QuoteGen: Free now gets 5 quotes/month; Plus and Pro unchanged.
CREATE OR REPLACE FUNCTION public.get_quote_gen_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tier text;
  _limit int;
  _month text := to_char((now() AT TIME ZONE 'utc'),'YYYY-MM');
  _used int;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object(
      'planTier','free','limit',0,'used',0,'remaining',0,
      'isEnabled',false,'isExhausted',true,'monthKey',_month
    );
  END IF;

  _tier := COALESCE(public.get_user_plan_tier(_uid), 'free');
  _limit := CASE _tier WHEN 'pro' THEN 15 WHEN 'plus' THEN 5 ELSE 5 END;

  SELECT usage_count INTO _used
    FROM public.quote_gen_usage
   WHERE user_id = _uid AND month_key = _month;

  _used := COALESCE(_used, 0);

  RETURN jsonb_build_object(
    'planTier',_tier,
    'limit',_limit,
    'used',_used,
    'remaining',GREATEST(_limit - _used, 0),
    'isEnabled',_limit > 0,
    'isExhausted',_used >= _limit,
    'monthKey',_month
  );
END
$$;

CREATE OR REPLACE FUNCTION public.increment_quote_gen_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tier text;
  _limit int;
  _month text := to_char((now() AT TIME ZONE 'utc'),'YYYY-MM');
  _new int;
  _cur int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  _tier := COALESCE(public.get_user_plan_tier(_uid), 'free');
  _limit := CASE _tier WHEN 'pro' THEN 15 WHEN 'plus' THEN 5 ELSE 5 END;

  INSERT INTO public.quote_gen_usage (user_id, month_key, plan_tier_snapshot, usage_count)
    VALUES (_uid, _month, _tier, 0)
    ON CONFLICT (user_id, month_key) DO NOTHING;

  UPDATE public.quote_gen_usage
     SET usage_count = usage_count + 1,
         plan_tier_snapshot = _tier,
         updated_at = now()
   WHERE user_id = _uid
     AND month_key = _month
     AND usage_count < _limit
   RETURNING usage_count INTO _new;

  IF _new IS NULL THEN
    SELECT usage_count INTO _cur
      FROM public.quote_gen_usage
     WHERE user_id = _uid AND month_key = _month;

    RETURN jsonb_build_object(
      'ok',false,'reason','quota',
      'planTier',_tier,'limit',_limit,'used',COALESCE(_cur,0),
      'remaining',0,'monthKey',_month
    );
  END IF;

  RETURN jsonb_build_object(
    'ok',true,
    'planTier',_tier,'limit',_limit,'used',_new,
    'remaining',_limit - _new,'monthKey',_month
  );
END
$$;

GRANT EXECUTE ON FUNCTION public.get_quote_gen_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_quote_gen_usage() TO authenticated;

-- Document Studio: allow Free users to create/version/export only from the 3 free templates.
DROP POLICY IF EXISTS "Plus users can create documents" ON public.documents;
CREATE POLICY "Users can create allowed documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.verify_plus_subscription(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.doc_templates dt
      WHERE dt.id = documents.template_id
        AND dt.is_active = true
        AND (
          dt.tier = 'free'
          OR dt.template_id IN ('professional-invoice', 'quarterly-summary', 'nda-agreement')
        )
    )
  )
);

DROP POLICY IF EXISTS "Plus users can create exports" ON public.document_exports;
CREATE POLICY "Users can create allowed exports"
ON public.document_exports
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.verify_plus_subscription(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.documents d
      JOIN public.doc_templates dt ON dt.id = d.template_id
      WHERE d.id = document_exports.document_id
        AND d.user_id = auth.uid()
        AND dt.is_active = true
        AND (
          dt.tier = 'free'
          OR dt.template_id IN ('professional-invoice', 'quarterly-summary', 'nda-agreement')
        )
    )
  )
);

DROP POLICY IF EXISTS "Plus users can create versions for own documents" ON public.document_versions;
CREATE POLICY "Users can create allowed versions for own documents"
ON public.document_versions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.documents d
    JOIN public.doc_templates dt ON dt.id = d.template_id
    WHERE d.id = document_versions.document_id
      AND d.user_id = auth.uid()
      AND (
        public.verify_plus_subscription(auth.uid())
        OR (
          dt.is_active = true
          AND (
            dt.tier = 'free'
            OR dt.template_id IN ('professional-invoice', 'quarterly-summary', 'nda-agreement')
          )
        )
      )
  )
);