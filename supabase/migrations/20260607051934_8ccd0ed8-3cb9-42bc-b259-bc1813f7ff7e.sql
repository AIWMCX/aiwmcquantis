REVOKE ALL ON FUNCTION public.consume_idea_gen_quota(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_idea_gen_quota(uuid, integer, text) TO service_role;

REVOKE ALL ON FUNCTION public.get_user_plan_tier(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_plan_tier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_plan_tier(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.increment_idea_generation_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_idea_generation_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_idea_generation_usage() TO service_role;

REVOKE ALL ON FUNCTION public.decrement_idea_generation_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decrement_idea_generation_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_idea_generation_usage() TO service_role;

REVOKE ALL ON FUNCTION public.get_idea_generation_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_idea_generation_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_idea_generation_status() TO service_role;