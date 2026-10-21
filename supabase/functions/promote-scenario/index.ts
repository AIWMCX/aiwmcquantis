/**
 * Phase D — validates ownership + scenario promotion/document entitlements and
 * hands back a ScenarioRunRef-shaped payload the client passes straight
 * into mapCanonicalModelToDocumentVariables(modelSnapshot, scenarioRunRef)
 * (src/lib/canonical-document-mapper.ts). No new table writes — creating
 * the actual document is a separate step; this endpoint also resolves the
 * run's authoritative analysis identity for client-side lineage validation.
 *
 * Follows queue-export/index.ts's auth/entitlement/ownership pattern.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { requireFeature, EntitlementError } from '../_shared/entitlements.ts';
import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { maybeHealthResponse } from '../_shared/health.ts';

const FUNCTION_NAME = 'promote-scenario';
const FUNCTION_VERSION = '1.0.0';

interface PromoteScenarioRequest {
  scenario_run_id: string;
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

    const body: PromoteScenarioRequest = await req.json();
    const { scenario_run_id } = body;
    if (typeof scenario_run_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(scenario_run_id)) {
      return new Response(
        JSON.stringify({ error: 'A valid scenario_run_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    try {
      await requireFeature(adminClient, userId, 'scenarioPromote', '/promote-scenario');
      await requireFeature(adminClient, userId, 'scenarioDocument', '/promote-scenario');
    } catch (e) {
      if (e instanceof EntitlementError) return e.toResponse(corsHeaders);
      throw e;
    }

    const { data: run, error: runError } = await supabase
      .from('scenario_runs')
      .select('id, scenario_version_id, output, output_hash, engine_version, formula_version')
      .eq('id', scenario_run_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (runError || !run) {
      return new Response(
        JSON.stringify({ error: 'Scenario run not found or access denied', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Resolve lineage through owner-scoped rows instead of trusting an
    // analysis ID supplied by browser navigation state or URL parameters.
    const { data: version, error: versionError } = await supabase
      .from('scenario_versions')
      .select('scenario_id')
      .eq('id', run.scenario_version_id)
      .eq('user_id', userId)
      .maybeSingle();
    const { data: scenario, error: scenarioError } = version
      ? await supabase.from('scenarios').select('scenario_set_id').eq('id', version.scenario_id).eq('user_id', userId).maybeSingle()
      : { data: null, error: versionError };
    const { data: scenarioSet, error: scenarioSetError } = scenario
      ? await supabase.from('scenario_sets').select('analysis_id').eq('id', scenario.scenario_set_id).eq('user_id', userId).maybeSingle()
      : { data: null, error: scenarioError };

    if (versionError || scenarioError || scenarioSetError || !scenarioSet?.analysis_id) {
      log.error('Scenario lineage could not be resolved for document promotion');
      return new Response(
        JSON.stringify({ error: 'Scenario lineage unavailable; document promotion was refused', code: 'LINEAGE_UNAVAILABLE' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    log.info(`Promoted scenario_run=${run.id} for user=${userId}`);

    return new Response(
      JSON.stringify({
        scenarioRunId: run.id,
        analysisId: scenarioSet.analysis_id,
        outputHash: run.output_hash,
        engineVersion: run.engine_version,
        formulaVersion: run.formula_version,
        output: run.output,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    log.error('promote-scenario error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } },
    );
  }
});
