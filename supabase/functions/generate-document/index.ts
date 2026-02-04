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
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid authentication',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CRITICAL: Verify Plus subscription server-side
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_id, status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subError) {
      console.error('Subscription check error:', subError);
    }

    const isPlus = subscription && 
      (subscription.plan_id === 'plus' || subscription.plan_id === 'enterprise') &&
      (subscription.status === 'active' || subscription.status === 'trialing') &&
      (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

    if (!isPlus) {
      console.log(`Access denied for user ${user.id}: Not a Plus subscriber`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Plus subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Plus subscriber ${user.id} accessing document generation`);

    const { template_id, analysis_id, variables, title } = await req.json();

    // Get template
    const { data: template, error: templateError } = await supabaseAdmin
      .from('doc_templates')
      .select('*')
      .eq('template_id', template_id)
      .single();

    if (templateError) {
      throw new Error(`Template not found: ${templateError.message}`);
    }

    // Generate document from template
    const templateJson = template.template_json as Record<string, unknown>;
    const blocks = (templateJson.blocks as Array<Record<string, unknown>>) || [];
    
    const documentJson = {
      type: 'doc',
      content: blocks.map((block) => ({
        type: block.type === 'heading' ? 'heading' : 'paragraph',
        attrs: block.level ? { level: block.level } : undefined,
        content: block.content ? [{
          type: 'text',
          text: String(block.content).replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => 
            String(variables[key] || `{{${key}}}`)
          ),
        }] : undefined,
      })),
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
