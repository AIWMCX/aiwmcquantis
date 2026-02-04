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

    const { template_id, analysis_id, variables, title } = await req.json();

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('doc_templates')
      .select('*')
      .eq('template_id', template_id)
      .single();

    if (templateError) {
      throw new Error(`Template not found: ${templateError.message}`);
    }

    // Generate document from template
    const templateJson = template.template_json;
    const documentJson = {
      type: 'doc',
      content: templateJson.blocks?.map((block: any) => ({
        type: block.type === 'heading' ? 'heading' : 'paragraph',
        attrs: block.level ? { level: block.level } : undefined,
        content: block.content ? [{
          type: 'text',
          text: block.content.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => 
            String(variables[key] || `{{${key}}}`)
          ),
        }] : undefined,
      })) || [],
    };

    return new Response(JSON.stringify({
      success: true,
      document_json: documentJson,
      template_name: template.name,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Generate document error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
