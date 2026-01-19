import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== API KEY UTILITIES ==========

/**
 * Hash API key using SHA-256
 */
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validate API key and return user info
 */
async function validateApiKey(
  supabase: any,
  authHeader: string
): Promise<{ valid: boolean; userId?: string; keyId?: string; rateLimit?: number; error?: string; statusCode?: number }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or invalid Authorization header", statusCode: 401 };
  }

  const apiKey = authHeader.replace("Bearer ", "").trim();
  
  // Validate key format (must start with qnts_)
  if (!apiKey.startsWith("qnts_")) {
    return { valid: false, error: "Invalid API key format", statusCode: 401 };
  }

  const keyPrefix = apiKey.substring(0, 12);
  const keyHash = await hashApiKey(apiKey);

  // Look up key in database using service role
  const { data: keyRecord, error: keyError } = await supabase
    .from("api_keys")
    .select("id, user_id, is_active, scopes, rate_limit_per_hour, expires_at")
    .eq("key_prefix", keyPrefix)
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (keyError) {
    console.error("API key lookup error:", keyError);
    return { valid: false, error: "API key validation failed", statusCode: 500 };
  }

  if (!keyRecord) {
    return { valid: false, error: "Invalid API key", statusCode: 401 };
  }

  if (!keyRecord.is_active) {
    return { valid: false, error: "API key is deactivated", statusCode: 403 };
  }

  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return { valid: false, error: "API key has expired", statusCode: 403 };
  }

  // Check if 'analyze' scope is allowed
  if (!keyRecord.scopes || !keyRecord.scopes.includes("analyze")) {
    return { valid: false, error: "API key does not have 'analyze' scope", statusCode: 403 };
  }

  return { 
    valid: true, 
    userId: keyRecord.user_id, 
    keyId: keyRecord.id,
    rateLimit: keyRecord.rate_limit_per_hour || 60
  };
}

/**
 * Check rate limit for API key
 */
async function checkApiRateLimit(
  supabase: any,
  keyId: string,
  rateLimit: number
): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  const windowStart = new Date();
  windowStart.setMinutes(0, 0, 0);

  // Get current usage count for this hour
  const { data: logs } = await supabase
    .from("api_request_logs")
    .select("id")
    .eq("api_key_id", keyId)
    .gte("created_at", windowStart.toISOString());

  const currentCount = logs?.length || 0;
  const resetAt = new Date(windowStart);
  resetAt.setHours(resetAt.getHours() + 1);

  return {
    allowed: currentCount < rateLimit,
    remaining: Math.max(0, rateLimit - currentCount),
    resetAt: resetAt.toISOString(),
  };
}

/**
 * Log API request
 */
async function logApiRequest(
  supabase: any,
  keyId: string,
  userId: string,
  statusCode: number,
  latencyMs: number,
  errorMessage?: string,
  ipAddress?: string
) {
  try {
    await supabase.from("api_request_logs").insert({
      api_key_id: keyId,
      user_id: userId,
      endpoint: "api-analyze",
      status_code: statusCode,
      latency_ms: latencyMs,
      error_message: errorMessage,
      ip_address: ipAddress,
    });

    // Update last_used_at on the key
    await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyId);
      
    // Increment usage count using RPC
    await supabase.rpc("increment_api_key_usage", { p_key_id: keyId });
  } catch (e) {
    console.error("Failed to log API request:", e);
  }
}

/**
 * Check if user has Pro subscription
 */
async function checkProSubscription(
  supabase: any,
  userId: string
): Promise<boolean> {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_id, status")
    .eq("user_id", userId)
    .maybeSingle();

  // Check for active or trialing status
  const isActive = subscription?.status === "active" || subscription?.status === "trialing";
  return isActive && subscription?.plan_id === "pro";
}

// ========== MAIN HANDLER ==========

serve(async (req) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", method: req.method }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let keyId: string | undefined;
  let userId: string | undefined;

  try {
    // 1. Validate API Key
    const authHeader = req.headers.get("Authorization") || "";
    const keyValidation = await validateApiKey(supabase, authHeader);

    if (!keyValidation.valid) {
      return new Response(
        JSON.stringify({ error: keyValidation.error }),
        {
          status: keyValidation.statusCode || 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    keyId = keyValidation.keyId;
    userId = keyValidation.userId!;
    const rateLimit = keyValidation.rateLimit || 60;

    // 2. Check Pro Subscription
    const isPro = await checkProSubscription(supabase, userId);
    if (!isPro) {
      await logApiRequest(supabase, keyId!, userId, 403, Date.now() - startTime, "Pro subscription required");
      return new Response(
        JSON.stringify({
          error: "Pro subscription required",
          message: "API access is only available for Pro subscribers. Upgrade at https://aiwmc-quantis.lovable.app/app",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Check Rate Limit
    const rateLimitResult = await checkApiRateLimit(supabase, keyId!, rateLimit);
    if (!rateLimitResult.allowed) {
      await logApiRequest(supabase, keyId!, userId, 429, Date.now() - startTime, "Rate limit exceeded");
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `You have exceeded the rate limit of ${rateLimit} requests per hour`,
          remaining: 0,
          reset_at: rateLimitResult.resetAt,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitResult.resetAt,
          },
        }
      );
    }

    // 4. Parse and validate request body
    let body: { idea?: string; location?: string; industry?: string; financial_inputs?: Record<string, unknown> };
    try {
      body = await req.json();
    } catch {
      await logApiRequest(supabase, keyId!, userId, 400, Date.now() - startTime, "Invalid JSON body");
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { idea, location, industry, financial_inputs } = body;

    if (!idea || typeof idea !== "string" || idea.trim().length < 10) {
      await logApiRequest(supabase, keyId!, userId, 400, Date.now() - startTime, "Invalid idea parameter");
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          message: "'idea' is required and must be at least 10 characters",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!location || typeof location !== "string" || location.trim().length < 2) {
      await logApiRequest(supabase, keyId!, userId, 400, Date.now() - startTime, "Invalid location parameter");
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          message: "'location' is required and must be at least 2 characters",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Call the main analyze-business function internally
    const analyzeResponse = await fetch(`${supabaseUrl}/functions/v1/analyze-business`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        idea: idea.trim(),
        location: location.trim(),
        selected_industry: industry,
        financial_inputs: financial_inputs || {},
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!analyzeResponse.ok) {
      const errorText = await analyzeResponse.text();
      console.error("Analysis error:", analyzeResponse.status, errorText);
      await logApiRequest(supabase, keyId!, userId, analyzeResponse.status, latencyMs, errorText);

      return new Response(
        JSON.stringify({
          error: "Analysis failed",
          message: "The analysis could not be completed. Please try again.",
          status_code: analyzeResponse.status,
        }),
        {
          status: analyzeResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const analysisResult = await analyzeResponse.json();

    // 6. Log successful request
    await logApiRequest(supabase, keyId!, userId, 200, latencyMs);

    // 7. Return API response with metadata
    return new Response(
      JSON.stringify({
        success: true,
        data: analysisResult,
        meta: {
          request_id: crypto.randomUUID(),
          latency_ms: latencyMs,
          rate_limit: {
            remaining: rateLimitResult.remaining - 1,
            reset_at: rateLimitResult.resetAt,
          },
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-RateLimit-Remaining": String(rateLimitResult.remaining - 1),
          "X-RateLimit-Reset": rateLimitResult.resetAt,
        },
      }
    );
  } catch (error) {
    console.error("API error:", error);
    const latencyMs = Date.now() - startTime;

    if (keyId && userId) {
      await logApiRequest(supabase, keyId, userId, 500, latencyMs, error instanceof Error ? error.message : "Unknown error");
    }

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
