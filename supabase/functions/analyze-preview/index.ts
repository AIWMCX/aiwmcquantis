import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeadersFor } from '../_shared/cors.ts';
// Lightweight industry detection
function detectIndustry(idea: string): string {
  const lowerIdea = idea.toLowerCase();
  
  const patterns: [RegExp, string][] = [
    [/coffee|cafe|restaurant|food|catering|bakery|bar|pizza|burger/i, "Food & Beverage"],
    [/saas|software|app|platform|subscription|api/i, "SaaS / Software"],
    [/ecommerce|store|shop|retail|marketplace|dropship/i, "E-commerce / Retail"],
    [/consult|agency|freelance|coach|b2b/i, "Consulting / Professional"],
    [/gym|fitness|yoga|wellness|spa|health/i, "Fitness / Wellness"],
    [/course|education|tutor|training|bootcamp/i, "Education / Courses"],
    [/clinic|medical|healthcare|therapy|telehealth/i, "Healthcare / Medical"],
    [/fintech|payment|invest|crypto|bank|finance/i, "Fintech / Financial"],
    [/media|content|podcast|newsletter|stream/i, "Media / Content"],
    [/real estate|property|rental|airbnb/i, "Real Estate / Property"],
    [/delivery|logistics|shipping|courier/i, "Logistics / Delivery"],
  ];

  for (const [pattern, industry] of patterns) {
    if (pattern.test(lowerIdea)) {
      return industry;
    }
  }
  
  return "General Business";
}

// Quick financial estimates based on industry
function estimateFinancials(industry: string): { 
  monthly_profit: number; 
  payback_months: number; 
  confidence_score: number 
} {
  const benchmarks: Record<string, { profit: [number, number]; payback: [number, number]; confidence: number }> = {
    "Food & Beverage": { profit: [2000, 8000], payback: [12, 24], confidence: 65 },
    "SaaS / Software": { profit: [3000, 15000], payback: [6, 18], confidence: 60 },
    "E-commerce / Retail": { profit: [1500, 10000], payback: [6, 15], confidence: 62 },
    "Consulting / Professional": { profit: [4000, 20000], payback: [3, 12], confidence: 70 },
    "Fitness / Wellness": { profit: [2500, 12000], payback: [8, 18], confidence: 64 },
    "Education / Courses": { profit: [2000, 15000], payback: [4, 12], confidence: 66 },
    "Healthcare / Medical": { profit: [5000, 25000], payback: [12, 36], confidence: 55 },
    "Fintech / Financial": { profit: [4000, 30000], payback: [12, 24], confidence: 55 },
    "Media / Content": { profit: [1000, 8000], payback: [6, 18], confidence: 58 },
    "Real Estate / Property": { profit: [3000, 15000], payback: [12, 36], confidence: 60 },
    "Logistics / Delivery": { profit: [2000, 10000], payback: [9, 24], confidence: 62 },
    "General Business": { profit: [2000, 10000], payback: [9, 24], confidence: 55 },
  };

  const benchmark = benchmarks[industry] || benchmarks["General Business"];
  
  // Calculate middle-ground estimate
  const monthly_profit = Math.round((benchmark.profit[0] + benchmark.profit[1]) / 2);
  const payback_months = Math.round((benchmark.payback[0] + benchmark.payback[1]) / 2);
  
  return {
    monthly_profit,
    payback_months,
    confidence_score: benchmark.confidence,
  };
}

// Simple hash for rate limiting
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only allow POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { idea, location } = await req.json();

    // Validate inputs
    if (!idea || typeof idea !== "string" || idea.length < 10) {
      return new Response(
        JSON.stringify({ success: false, error: "Idea must be at least 10 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!location || typeof location !== "string" || location.length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: "Location is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting by IP
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    const ipHash = await hashString(clientIP);
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check rate limit (1 per hour per IP for previews)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { count } = await supabase
      .from("anonymous_usage")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", oneHourAgo);

    if (count && count >= 3) { // Allow 3 previews per hour
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Rate limit exceeded. Sign up for unlimited analyses!" 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate preview (fast, no AI call)
    const industry = detectIndustry(idea);
    const financials = estimateFinancials(industry);

    // Log usage (don't block on this)
    const ideaHash = await hashString(idea.slice(0, 50));
    const locationHash = await hashString(location);
    
    supabase.from("anonymous_usage").insert({
      ip_hash: ipHash,
      device_id: `preview_${ipHash}`,
      idea_hash: ideaHash,
      location_hash: locationHash,
    }).then(() => {
      console.log(`Preview logged: ${industry} in ${location}`);
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          monthly_profit: financials.monthly_profit,
          payback_months: financials.payback_months,
          confidence_score: financials.confidence_score,
          industry_detected: industry,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Preview error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Preview failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
