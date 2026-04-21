/**
 * API VERSION ROUTER — api-analyze
 *
 * Routes analysis requests to v1 or v2 engine based on:
 *   1. Explicit ?version=v1|v2 query param
 *   2. User feature flag in user_settings.use_v2_engine
 *   3. Default: v1
 *
 * @version 1.0.0
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireFeature, EntitlementError } from "../_shared/entitlements.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const url = new URL(req.url)
    const explicitVersion = url.searchParams.get('version') as 'v1' | 'v2' | null

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Parse body
    const body = await req.json()

    // Determine engine version
    let engineVersion: 'v1' | 'v2' = explicitVersion ?? 'v1'

    // If no explicit version, check user feature flag
    if (!explicitVersion) {
      const authHeader = req.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        })
        const { data: claims } = await userClient.auth.getClaims(
          authHeader.replace('Bearer ', '')
        )
        if (claims?.claims?.sub) {
          const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
          const { data: settings } = await serviceClient
            .from('user_settings')
            .select('use_v2_engine')
            .eq('user_id', claims.claims.sub)
            .single()

          if (settings?.use_v2_engine) {
            engineVersion = 'v2'
          }
        }
      }
    }

    // ========== ENTITLEMENT GATE: apiAccess (Pro tier only) ==========
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized — Pro subscription required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''))
      if (!claims?.claims?.sub) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const adminClient = createClient(supabaseUrl, supabaseServiceKey)
      try {
        await requireFeature(adminClient, claims.claims.sub, 'apiAccess', '/api-analyze')
      } catch (e) {
        if (e instanceof EntitlementError) return e.toResponse(corsHeaders)
        throw e
      }
    }

    // Forward to analyze-business with engine_version flag
    const payload = {
      ...body,
      engine_version: engineVersion,
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data: fnData, error: fnError } = await serviceClient.functions.invoke(
      'analyze-business',
      { body: payload }
    )

    if (fnError) {
      return new Response(
        JSON.stringify({ error: fnError.message, engine_version: engineVersion }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Wrap response with version metadata
    const response = {
      ...fnData,
      _meta: {
        engine_version: engineVersion,
        routed_at: new Date().toISOString(),
      },
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
