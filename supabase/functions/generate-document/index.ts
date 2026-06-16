import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { requireFeature, EntitlementError } from "../_shared/entitlements.ts";
import { tierGate } from "../_shared/tier-gate.ts";
import { ENDPOINTS } from "../_shared/tier-spec.ts";
import { aiCall } from "../_shared/llm-call.ts";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';


import { maybeHealthResponse } from '../_shared/health.ts';
const FUNCTION_NAME = 'generate-document';
const FUNCTION_VERSION = '1.0.0';

serve(async (req) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const reqId = getRequestId(req);
  const log = createLogger('generate-document', reqId);

  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Authorization required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid authentication' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== ENTITLEMENT GATE (legacy) ==========
    try {
      await requireFeature(supabaseAdmin, user.id, 'documentStudio', '/generate-document');
    } catch (e) {
      if (e instanceof EntitlementError) return e.toResponse(corsHeaders);
      throw e;
    }

    // ========== MASTER SPEC TIER GATE (defense-in-depth, §08) ==========
    // Independent spec-canonical check: emits the standardized 402 envelope
    // (success/error/required_tier/upgrade_url/cta) when blocked. Does not
    // double-charge usage — generate-document is not a quota-counted endpoint.
    const gate = await tierGate(req, ENDPOINTS.DOCUMENTS_STUDIO);
    if (gate.blocked) {
      log.info(`[generate-document] tier-gate blocked: ${gate.body.error}`);
      return new Response(JSON.stringify(gate.body), {
        status: gate.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    log.info(`[generate-document] user=${user.id} tier=${gate.tier} authorized`);

    // ========== ORIGINAL LOGIC ==========
    const body = await req.json();
    const { template_id, variables, analysis_id, options = {} } = body;

    if (!template_id || !variables) {
      return new Response(JSON.stringify({ success: false, error: 'Missing template_id or variables' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiPrompt = `Generate a professional business document using the template "${template_id}" with these variables:
${JSON.stringify(variables, null, 2)}

Provide structured, professional content suitable for ${template_id}. Be specific, data-driven, and actionable.`;

    const aiResult = await aiCall(
      {
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a senior business consultant generating professional documents.' },
          { role: 'user', content: aiPrompt },
        ],
        temperature: 0.4,
      },
      { task: 'generate-document', userId: user.id, analysisId: analysis_id ?? null, metadata: { template_id } },
    );

    if (!aiResult.ok) {
      log.error('[generate-document] AI error:', aiResult.status, aiResult.error);
      return new Response(JSON.stringify({ success: false, error: aiResult.message, code: aiResult.error }), {
        status: aiResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const choices = aiResult.data.choices as Array<{ message?: { content?: string } }> | undefined;
    const content = choices?.[0]?.message?.content ?? '';

    const { data: doc, error: insErr } = await supabaseAdmin
      .from('documents')
      .insert({
        user_id: user.id,
        analysis_id: analysis_id ?? null,
        template_id,
        title: variables.title || `${template_id} document`,
        document_json: { content, options },
        variables_data: variables,
        status: 'draft',
      })
      .select()
      .single();

    if (insErr) {
      log.error('[generate-document] insert error:', insErr);
      return new Response(JSON.stringify({ success: false, error: 'Failed to save document' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, document: doc, content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    log.error('[generate-document] error:', err);
    return new Response(JSON.stringify({ success: false, error: err?.message ?? 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
