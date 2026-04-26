import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';

/**
 * Edge Function Warming Service
 * 
 * This function is triggered by pg_cron every 5 minutes to keep 
 * frequently-used edge functions warm and reduce cold start latency.
 * 
 * Functions warmed:
 * - analyze-business (primary analysis endpoint)
 * - calculate-financials (financial calculations)
 * - ai-narrator (AI narrative generation)
 */

const FUNCTIONS_TO_WARM = [
  'analyze-business',
  'calculate-financials',
  'ai-narrator',
  'health-check',
];

serve(async (req) => {
  const reqId = getRequestId(req);
  const log = createLogger('warm-functions', reqId);

  const corsHeaders = corsHeadersFor(req);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Security: Only allow CRON_SECRET header authentication.
    // Never compare raw service role key in authorization headers.
    const cronSecretHeader = req.headers.get('x-cron-secret');
    const expectedCronSecret = Deno.env.get('CRON_SECRET');

    if (!expectedCronSecret || expectedCronSecret.length < 10 || cronSecretHeader !== expectedCronSecret) {
      log.error('[warm-functions] Unauthorized request - invalid or missing CRON_SECRET');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    log.info(`[warm-functions] Starting warm cycle at ${new Date().toISOString()}`);

    const results: Record<string, { success: boolean; latency: number; error?: string }> = {};

    // Warm each function with a lightweight request
    for (const funcName of FUNCTIONS_TO_WARM) {
      const startTime = Date.now();
      
      try {
        // For analyze-business and ai-narrator, we send a minimal warmup payload
        // For health-check, just a simple GET
        const warmupPayload = funcName === 'health-check' 
          ? null 
          : { warmup: true };
        
        const response = await fetch(
          `${supabaseUrl}/functions/v1/${funcName}`,
          {
            method: warmupPayload ? 'POST' : 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: warmupPayload ? JSON.stringify(warmupPayload) : undefined,
          }
        );

        const latency = Date.now() - startTime;
        
        // We expect either success or a handled warmup response
        const isSuccess = response.ok || response.status === 400; // 400 for invalid warmup payload is fine
        
        results[funcName] = {
          success: isSuccess,
          latency,
          error: isSuccess ? undefined : `Status ${response.status}`,
        };

        log.info(`[warm-functions] ${funcName}: ${latency}ms - ${isSuccess ? 'OK' : 'FAILED'}`);
      } catch (error) {
        const latency = Date.now() - startTime;
        results[funcName] = {
          success: false,
          latency,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        log.error(`[warm-functions] ${funcName} failed:`, error);
      }
    }

    // Calculate summary stats
    const successCount = Object.values(results).filter(r => r.success).length;
    const avgLatency = Object.values(results).reduce((sum, r) => sum + r.latency, 0) / FUNCTIONS_TO_WARM.length;

    const summary = {
      timestamp: new Date().toISOString(),
      functions_warmed: successCount,
      functions_failed: FUNCTIONS_TO_WARM.length - successCount,
      average_latency_ms: Math.round(avgLatency),
      results,
    };

    log.info(`[warm-functions] Complete: ${successCount}/${FUNCTIONS_TO_WARM.length} warmed, avg ${Math.round(avgLatency)}ms`);

    return new Response(
      JSON.stringify(summary),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    log.error('[warm-functions] Critical error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Warming failed', 
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
