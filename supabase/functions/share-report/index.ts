/**
 * Share Report Edge Function
 * 
 * Handles creating, fetching, and revoking shareable links for analysis reports.
 * 
 * Endpoints:
 * - GET ?token=xxx - Fetch shared report by token (public, no auth)
 * - POST { analysis_id } - Create share link (authenticated)
 * - DELETE { token } - Revoke share link (authenticated)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeadersFor } from "../_shared/cors.ts";

interface ShareRequest {
  analysis_id: string;
}

interface RevokeRequest {
  token: string;
}

// Simple in-memory rate limiter for share-report GET requests
const shareAccessRateLimit = new Map<string, { count: number; resetAt: number }>();
const SHARE_RATE_LIMIT = 60; // max requests per window
const SHARE_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_VIEW_COUNT = 500; // max views per shared report

function checkShareRateLimit(ipHash: string): boolean {
  const now = Date.now();
  const entry = shareAccessRateLimit.get(ipHash);
  if (!entry || now > entry.resetAt) {
    shareAccessRateLimit.set(ipHash, { count: 1, resetAt: now + SHARE_RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= SHARE_RATE_LIMIT;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get("Authorization") || "";
    
    // Create client with user's auth token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Service role client for public token lookups
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // ============================================
    // GET: Fetch shared report by token (PUBLIC)
    // ============================================
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");
      
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Token required" }), 
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate token format (should be hex string of 64 chars)
      if (!/^[a-f0-9]{64}$/i.test(token)) {
        return new Response(
          JSON.stringify({ error: "Invalid token format" }), 
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // IP-based rate limiting to prevent token enumeration
      const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || req.headers.get("cf-connecting-ip")
        || req.headers.get("x-real-ip")
        || "unknown";
      const encoder = new TextEncoder();
      const ipHashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(clientIp + "share-salt"));
      const ipHash = Array.from(new Uint8Array(ipHashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 32);

      if (!checkShareRateLimit(ipHash)) {
        console.log("[share-report] Rate limit exceeded for IP hash:", ipHash.substring(0, 8));
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "3600" } }
        );
      }

      console.log("[share-report] Fetching shared report by token");

      // Use service role to fetch public share
      const { data: share, error: shareError } = await adminClient
        .from("shared_reports")
        .select(`
          id,
          token,
          expires_at,
          view_count,
          is_revoked,
          created_at,
          analyses (
            id,
            idea,
            location,
            result,
            confidence_score,
            monthly_profit,
            payback_months,
            startup_investment,
            created_at
          )
        `)
        .eq("token", token)
        .eq("is_revoked", false)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (shareError) {
        console.error("[share-report] Database error:", shareError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch report" }), 
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!share) {
        return new Response(
          JSON.stringify({ error: "Report not found or expired" }), 
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Enforce max view count to prevent indefinite access
      const currentViews = share.view_count || 0;
      if (currentViews >= MAX_VIEW_COUNT) {
        console.log("[share-report] Max view count reached for share:", share.id);
        return new Response(
          JSON.stringify({ error: "This shared report has reached its maximum view limit." }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Increment view count (fire and forget)
      adminClient
        .from("shared_reports")
        .update({ view_count: currentViews + 1 })
        .eq("id", share.id)
        .then(() => console.log("[share-report] View count incremented"))
        .catch((err) => console.error("[share-report] Failed to increment view count:", err));

      // Return analysis data (without user_id for privacy)
      return new Response(
        JSON.stringify({ 
          success: true, 
          data: {
            analysis: share.analyses,
            shared_at: share.created_at,
            expires_at: share.expires_at,
            view_count: currentViews + 1,
          }
        }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // POST: Create share link (AUTHENTICATED)
    // ============================================
    if (req.method === "POST") {
      // Verify authentication
      const token = authHeader.replace("Bearer ", "");
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }), 
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error("[share-report] Auth error:", authError);
        return new Response(
          JSON.stringify({ error: "Unauthorized" }), 
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Parse request body
      let body: ShareRequest;
      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }), 
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { analysis_id } = body;
      
      if (!analysis_id) {
        return new Response(
          JSON.stringify({ error: "analysis_id required" }), 
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(analysis_id)) {
        return new Response(
          JSON.stringify({ error: "Invalid analysis_id format" }), 
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[share-report] Creating share for analysis:", analysis_id, "user:", user.id);

      // Verify user owns the analysis
      const { data: analysis, error: analysisError } = await supabase
        .from("analyses")
        .select("id")
        .eq("id", analysis_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (analysisError || !analysis) {
        console.error("[share-report] Analysis not found or not owned:", analysisError);
        return new Response(
          JSON.stringify({ error: "Analysis not found" }), 
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for existing active share
      const { data: existingShare } = await supabase
        .from("shared_reports")
        .select("token, expires_at")
        .eq("analysis_id", analysis_id)
        .eq("user_id", user.id)
        .eq("is_revoked", false)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (existingShare) {
        // Return existing share link
        const siteUrl = Deno.env.get("SITE_URL") || "https://aiwmcquantis.com";
        const shareUrl = `${siteUrl}/share/${existingShare.token}`;
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            share_url: shareUrl,
            token: existingShare.token,
            expires_at: existingShare.expires_at,
            expires_in_days: 30,
            is_existing: true
          }), 
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create new share link
      const { data: share, error: createError } = await supabase
        .from("shared_reports")
        .insert({
          analysis_id,
          user_id: user.id,
        })
        .select("token, expires_at")
        .single();

      if (createError) {
        console.error("[share-report] Create share error:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create share link" }), 
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const siteUrl = Deno.env.get("SITE_URL") || "https://aiwmcquantis.com";
      const shareUrl = `${siteUrl}/share/${share.token}`;

      console.log("[share-report] Share created successfully:", share.token.substring(0, 8) + "...");

      return new Response(
        JSON.stringify({ 
          success: true, 
          share_url: shareUrl,
          token: share.token,
          expires_at: share.expires_at,
          expires_in_days: 30 
        }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // DELETE: Revoke share link (AUTHENTICATED)
    // ============================================
    if (req.method === "DELETE") {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }), 
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Parse request body
      let body: RevokeRequest;
      try {
        body = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }), 
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { token } = body;
      
      if (!token) {
        return new Response(
          JSON.stringify({ error: "token required" }), 
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[share-report] Revoking share:", token.substring(0, 8) + "...", "user:", user.id);

      const { error: revokeError, count } = await supabase
        .from("shared_reports")
        .update({ is_revoked: true })
        .eq("token", token)
        .eq("user_id", user.id);

      if (revokeError) {
        console.error("[share-report] Revoke error:", revokeError);
        return new Response(
          JSON.stringify({ error: "Failed to revoke share" }), 
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[share-report] Share revoked successfully");

      return new Response(
        JSON.stringify({ success: true }), 
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: "Method not allowed" }), 
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[share-report] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
