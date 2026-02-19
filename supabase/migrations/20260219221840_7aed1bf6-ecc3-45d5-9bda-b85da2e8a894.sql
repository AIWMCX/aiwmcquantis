-- Create public leaderboard RPC
-- Only shows analyses that have an active public share link (user opted in by sharing)
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard()
RETURNS TABLE(
  rank_position integer,
  industry text,
  location text,
  idea_score integer,
  monthly_profit numeric,
  payback_months integer,
  net_margin numeric,
  share_token text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ROW_NUMBER() OVER (ORDER BY 
      COALESCE((a.result->>'confidence_score')::numeric, 0) DESC,
      COALESCE(a.monthly_profit, 0) DESC
    )::integer as rank_position,
    COALESCE(a.result->>'industry_detected', 'Business') as industry,
    a.location,
    LEAST(10, GREATEST(1, 
      ROUND(
        LEAST(COALESCE((a.result->>'confidence_score')::numeric, 50) / 100.0, 1) * 3 +
        CASE 
          WHEN COALESCE((a.result->'financial_analysis'->'scenarios'->'base'->>'net_margin')::numeric, 0) > 20 THEN 2.5
          WHEN COALESCE((a.result->'financial_analysis'->'scenarios'->'base'->>'net_margin')::numeric, 0) > 10 THEN 1.5
          WHEN COALESCE((a.result->'financial_analysis'->'scenarios'->'base'->>'net_margin')::numeric, 0) > 0 THEN 0.75
          ELSE 0
        END +
        CASE
          WHEN COALESCE((a.result->'financial_analysis'->'unit_economics'->>'ltv_cac_ratio')::numeric, 0) >= 5 THEN 2.5
          WHEN COALESCE((a.result->'financial_analysis'->'unit_economics'->>'ltv_cac_ratio')::numeric, 0) >= 3 THEN 1.75
          WHEN COALESCE((a.result->'financial_analysis'->'unit_economics'->>'ltv_cac_ratio')::numeric, 0) >= 1 THEN 1
          ELSE 0
        END +
        CASE WHEN COALESCE((a.result->'validation'->>'is_realistic')::boolean, false) THEN 1 ELSE 0 END +
        CASE WHEN COALESCE((a.result->'validation'->>'is_profitable')::boolean, false) THEN 1 ELSE 0 END
      )
    ))::integer as idea_score,
    COALESCE(a.monthly_profit, 0) as monthly_profit,
    a.payback_months,
    COALESCE((a.result->'financial_analysis'->'scenarios'->'base'->>'net_margin')::numeric, 0) as net_margin,
    sr.token as share_token
  FROM public.analyses a
  INNER JOIN public.shared_reports sr ON sr.analysis_id = a.id
  WHERE 
    sr.expires_at > NOW()
    AND sr.is_revoked = false
    AND a.monthly_profit IS NOT NULL
    -- Exclude clearly unprofitable/invalid entries from leaderboard
    AND a.monthly_profit > 0
    -- Only show analyses from last 30 days to keep it fresh
    AND sr.created_at > NOW() - INTERVAL '30 days'
  ORDER BY idea_score DESC, monthly_profit DESC
  LIMIT 10;
$$;

-- Grant execute to anon and authenticated (public leaderboard, no sensitive data)
GRANT EXECUTE ON FUNCTION public.get_weekly_leaderboard() TO anon;
GRANT EXECUTE ON FUNCTION public.get_weekly_leaderboard() TO authenticated;