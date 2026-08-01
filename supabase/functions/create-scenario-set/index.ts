/**
 * Phase D — creates a saved scenario_sets row for an analysis.
 *
 * Gated on 'scenarioSave' (free tier never persists a set — it only gets
 * scenarioCustom for the unsaved run-scenario preview). Quota + row creation
 * happen atomically inside consume_scenario_set_quota (see
 * requireScenarioSetQuota in _shared/entitlements.ts) — this function does
 * not do a separate insert.
 *
 * Follows queue-export/index.ts's auth/entitlement/ownership pattern.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { requireFeature, requireScenarioSetQuota, EntitlementError } from '../_shared/entitlements.ts';
import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { maybeHealthResponse } from '../_shared/health.ts';

const FUNCTION_NAME = 'create-scenario-set';
const FUNCTION_VERSION = '1.0.0';

interface CreateScenarioSetRequest {
  analysis_id: string;
  name?: string;
}

Deno.serve(async (req) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const reqId = getRequestId(req);
  const log = createLogger(FUNCTION_NAME, reqId);

  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const userId = claimsData.user.id;

    const body: CreateScenarioSetRequest = await req.json();
    const { analysis_id, name } = body;
    if (!analysis_id) {
      return new Response(
        JSON.stringify({ error: 'analysis_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Ownership + base-input availability check (own client, RLS-scoped).
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('id, scenario_base_input, analysis_correlation_id')
      .eq('id', analysis_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (analysisError || !analysis) {
      return new Response(
        JSON.stringify({ error: 'Analysis not found or access denied', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    if (!analysis.scenario_base_input) {
      return new Response(
        JSON.stringify({
          error: 'This analysis was saved before scenario modeling was enabled. Re-run it to unlock scenarios.',
          code: 'BASE_INPUT_UNAVAILABLE',
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    try {
      await requireFeature(adminClient, userId, 'scenarioSave', '/create-scenario-set');
    } catch (e) {
      if (e instanceof EntitlementError) return e.toResponse(corsHeaders);
      throw e;
    }

    // Best-effort lineage lookup only — never used to reconstruct input.
    const { data: latestSnapshot } = await supabase
      .from('analysis_snapshots')
      .select('id')
      .eq('correlation_id', analysis.analysis_correlation_id ?? '')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let quota: Awaited<ReturnType<typeof requireScenarioSetQuota>>;
    try {
      quota = await requireScenarioSetQuota(
        adminClient,
        userId,
        analysis_id,
        name ?? 'Scenario Set',
        latestSnapshot?.id ?? null,
        '/create-scenario-set',
      );
    } catch (e) {
      if (e instanceof EntitlementError) return e.toResponse(corsHeaders);
      throw e;
    }

    log.info(`Created scenario_set=${quota.scenarioSetId} for analysis=${analysis_id} user=${userId} (used ${quota.used}/${quota.limit})`);

    return new Response(
      JSON.stringify({
        scenario_set_id: quota.scenarioSetId,
        used: quota.used,
        limit: quota.limit,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    log.error('create-scenario-set error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } },
    );
  }
});
