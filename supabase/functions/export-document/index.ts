import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { document_id, export_id, format } = await req.json();

    // Get document
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError) {
      throw new Error(`Document not found: ${docError.message}`);
    }

    // Update export status
    await supabase
      .from('document_exports')
      .update({ status: 'processing' })
      .eq('id', export_id);

    // Generate content based on format
    let content = '';
    const docJson = doc.document_json as any;

    if (format === 'md') {
      content = docJson.content?.map((node: any) => {
        if (node.type === 'heading') {
          const level = node.attrs?.level || 1;
          const text = node.content?.[0]?.text || '';
          return '#'.repeat(level) + ' ' + text;
        }
        return node.content?.[0]?.text || '';
      }).join('\n\n') || '';
    } else {
      // For PDF/DOCX, return structured content (would need proper rendering)
      content = JSON.stringify(docJson, null, 2);
    }

    // Mark as completed
    await supabase
      .from('document_exports')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', export_id);

    // For MVP, return markdown content directly
    const blob = new Blob([content], { type: 'text/markdown' });
    const downloadUrl = `data:text/markdown;base64,${btoa(content)}`;

    return new Response(JSON.stringify({
      success: true,
      download_url: downloadUrl,
      format,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Export document error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
