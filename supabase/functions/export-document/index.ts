import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireFeature, requireDownloadQuota, EntitlementError } from "../_shared/entitlements.ts";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';


import { maybeHealthResponse } from '../_shared/health.ts';
const FUNCTION_NAME = 'export-document';
const FUNCTION_VERSION = '1.0.0';

serve(async (req) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const reqId = getRequestId(req);
  const log = createLogger('export-document', reqId);

  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    // Create service role client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create client with user's auth token for subscription verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authorization required',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user from auth token
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      log.error('Auth error:', authError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid authentication',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========== ENTITLEMENT GATE: documentStudio + daily download quota ==========
    try {
      // deno-lint-ignore no-explicit-any
      await requireFeature(supabaseAdmin as any, user.id, 'documentStudio', '/export-document');
      // deno-lint-ignore no-explicit-any
      await requireDownloadQuota(supabaseAdmin as any, user.id, '/export-document');
    } catch (e) {
      if (e instanceof EntitlementError) return e.toResponse(corsHeaders);
      throw e;
    }
    log.info(`[export-document] user=${user.id} authorized + quota consumed`);

    const { document_id, export_id, format } = await req.json();

    // Get document - verify ownership
    const { data: doc, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .eq('user_id', user.id) // Ensure user owns this document
      .single();

    if (docError) {
      throw new Error(`Document not found: ${docError.message}`);
    }

    // Update export status
    await supabaseAdmin
      .from('document_exports')
      .update({ status: 'processing' })
      .eq('id', export_id)
      .eq('user_id', user.id); // Ensure user owns this export

    // Generate content based on format
    let content = '';
    const docJson = doc.document_json as Record<string, unknown>;
    const docContent = (docJson.content as Array<Record<string, unknown>>) || [];

    if (format === 'md') {
      content = docContent.map((node) => {
        if (node.type === 'heading') {
          const attrs = node.attrs as Record<string, number> | undefined;
          const level = attrs?.level || 1;
          const nodeContent = node.content as Array<Record<string, string>> | undefined;
          const text = nodeContent?.[0]?.text || '';
          return '#'.repeat(level) + ' ' + text;
        }
        const nodeContent = node.content as Array<Record<string, string>> | undefined;
        return nodeContent?.[0]?.text || '';
      }).join('\n\n') || '';
    } else {
      // For PDF/DOCX, return structured content (would need proper rendering)
      content = JSON.stringify(docJson, null, 2);
    }

    // Mark as completed
    await supabaseAdmin
      .from('document_exports')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', export_id);

    // For MVP, return markdown content directly
    const downloadUrl = `data:text/markdown;base64,${btoa(content)}`;

    return new Response(JSON.stringify({
      success: true,
      download_url: downloadUrl,
      format,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    log.error('Export document error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({
      success: false,
      error: errMsg,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
