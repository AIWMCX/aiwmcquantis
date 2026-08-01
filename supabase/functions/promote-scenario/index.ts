/**
 * Phase D — validates ownership + the 'scenarioPromote' entitlement and
 * hands back a ScenarioRunRef-shaped payload the client passes straight
 * into mapCanonicalModelToDocumentVariables(modelSnapshot, scenarioRunRef)
 * (src/lib/canonical-document-mapper.ts). No new table writes — creating
 * the actual document is a separate step in whatever Docs Studio function
 * already does that (which must separately gate on 'scenarioDocument' when
 * the request includes a scenario_run_id).
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
    if (!scenario_run_id) {
      return new Response(
        JSON.stringify({ error: 'scenario_run_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    try {
      await requireFeature(adminClient, userId, 'scenarioPromote', '/promote-scenario');
    } catch (e) {
      if (e instanceof EntitlementError) return e.toResponse(corsHeaders);
      throw e;
    }

    const { data: run, error: runError } = await supabase
      .from('scenario_runs')
      .select('id, output, output_hash, engine_version, formula_version')
      .eq('id', scenario_run_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (runError || !run) {
      return new Response(
        JSON.stringify({ error: 'Scenario run not found or access denied', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    log.info(`Promoted scenario_run=${run.id} for user=${userId}`);

    return new Response(
      JSON.stringify({
        scenarioRunId: run.id,
        outputHash: run.output_hash,
        engineVersion: run.engine_version,
        formulaVersion: run.formula_version,
        output: run.output,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    log.error('promote-scenario error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeadersFor(req), 'Content-Type': 'application/json' } },
    );
  }
});
