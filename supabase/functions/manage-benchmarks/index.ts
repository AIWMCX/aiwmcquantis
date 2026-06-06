import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';

// Admin key for secure uploads - must be set as a secret
const ADMIN_UPLOAD_KEY = Deno.env.get("ADMIN_UPLOAD_KEY");

interface BenchmarkRecord {
  industry_id: string;
  industry_name: string;
  region?: string;
  cogs_percent_min?: number;
  cogs_percent_max?: number;
  cogs_percent_avg?: number;
  gross_margin_min?: number;
  gross_margin_max?: number;
  gross_margin_avg?: number;
  net_margin_min?: number;
  net_margin_max?: number;
  net_margin_avg?: number;
  cac_min?: number;
  cac_max?: number;
  cac_typical?: number;
  ltv_min?: number;
  ltv_max?: number;
  ltv_typical?: number;
  ltv_cac_ratio_min?: number;
  ltv_cac_ratio_max?: number;
  average_check_min?: number;
  average_check_max?: number;
  orders_per_client?: number;
  client_lifetime_months?: number;
  salaries_fixed?: number;
  rent_fixed?: number;
  utilities_fixed?: number;
  other_fixed?: number;
  market_size_usd?: number;
  growth_rate_percent?: number;
  competition_level?: 'low' | 'medium' | 'high' | 'very_high';
  source?: string;
  confidence_score?: number;
  sample_size?: number;
  keywords?: string[];
  additional_metrics?: Record<string, unknown>;
}

/**
 * Sanitize and validate benchmark input
 */
function sanitizeRecord(record: unknown): BenchmarkRecord | null {
  if (!record || typeof record !== 'object') return null;
  
  const r = record as Record<string, unknown>;
  
  // Required fields
  if (!r.industry_id || typeof r.industry_id !== 'string') return null;
  if (!r.industry_name || typeof r.industry_name !== 'string') return null;
  
  // Sanitize strings
  const sanitizeString = (s: unknown): string | undefined => {
    if (typeof s !== 'string') return undefined;
    return s.replace(/<[^>]*>/g, '').replace(/[<>{}]/g, '').trim().slice(0, 500);
  };
  
  // Validate numbers
  const validateNum = (n: unknown, min: number, max: number): number | undefined => {
    if (n === undefined || n === null) return undefined;
    const num = Number(n);
    if (isNaN(num) || num < min || num > max) return undefined;
    return num;
  };
  
  return {
    industry_id: sanitizeString(r.industry_id) || '',
    industry_name: sanitizeString(r.industry_name) || '',
    region: sanitizeString(r.region) || 'global',
    cogs_percent_min: validateNum(r.cogs_percent_min, 0, 100),
    cogs_percent_max: validateNum(r.cogs_percent_max, 0, 100),
    cogs_percent_avg: validateNum(r.cogs_percent_avg, 0, 100),
    gross_margin_min: validateNum(r.gross_margin_min, -100, 100),
    gross_margin_max: validateNum(r.gross_margin_max, -100, 100),
    gross_margin_avg: validateNum(r.gross_margin_avg, -100, 100),
    net_margin_min: validateNum(r.net_margin_min, -100, 100),
    net_margin_max: validateNum(r.net_margin_max, -100, 100),
    net_margin_avg: validateNum(r.net_margin_avg, -100, 100),
    cac_min: validateNum(r.cac_min, 0, 100000),
    cac_max: validateNum(r.cac_max, 0, 100000),
    cac_typical: validateNum(r.cac_typical, 0, 100000),
    ltv_min: validateNum(r.ltv_min, 0, 1000000),
    ltv_max: validateNum(r.ltv_max, 0, 1000000),
    ltv_typical: validateNum(r.ltv_typical, 0, 1000000),
    ltv_cac_ratio_min: validateNum(r.ltv_cac_ratio_min, 0, 100),
    ltv_cac_ratio_max: validateNum(r.ltv_cac_ratio_max, 0, 100),
    average_check_min: validateNum(r.average_check_min, 0, 100000),
    average_check_max: validateNum(r.average_check_max, 0, 100000),
    orders_per_client: validateNum(r.orders_per_client, 0, 1000),
    client_lifetime_months: validateNum(r.client_lifetime_months, 0, 240),
    salaries_fixed: validateNum(r.salaries_fixed, 0, 1000000),
    rent_fixed: validateNum(r.rent_fixed, 0, 500000),
    utilities_fixed: validateNum(r.utilities_fixed, 0, 100000),
    other_fixed: validateNum(r.other_fixed, 0, 500000),
    market_size_usd: validateNum(r.market_size_usd, 0, 1e15),
    growth_rate_percent: validateNum(r.growth_rate_percent, -100, 500),
    competition_level: ['low', 'medium', 'high', 'very_high'].includes(String(r.competition_level)) 
      ? r.competition_level as 'low' | 'medium' | 'high' | 'very_high' 
      : undefined,
    source: sanitizeString(r.source) || 'kerry_dataset',
    confidence_score: validateNum(r.confidence_score, 0, 100),
    sample_size: validateNum(r.sample_size, 0, 1000000),
    keywords: Array.isArray(r.keywords) 
      ? r.keywords.filter(k => typeof k === 'string').map(k => sanitizeString(k) || '').filter(Boolean)
      : undefined,
    additional_metrics: typeof r.additional_metrics === 'object' && r.additional_metrics !== null
      ? r.additional_metrics as Record<string, unknown>
      : undefined,
  };
}

serve(async (req) => {
  const reqId = getRequestId(req);
  const log = createLogger('manage-benchmarks', reqId);

  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin key
    const adminKey = req.headers.get('x-admin-key');
    if (!ADMIN_UPLOAD_KEY || adminKey !== ADMIN_UPLOAD_KEY) {
      log.error('Unauthorized benchmark upload attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Admin access required.' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, data } = await req.json();

    if (action === 'upload') {
      if (!Array.isArray(data)) {
        return new Response(
          JSON.stringify({ error: 'Data must be an array of benchmark records' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Sanitize all records
      const sanitizedRecords: BenchmarkRecord[] = [];
      const errors: string[] = [];
      
      for (let i = 0; i < data.length; i++) {
        const sanitized = sanitizeRecord(data[i]);
        if (sanitized && sanitized.industry_id && sanitized.industry_name) {
          sanitizedRecords.push(sanitized);
        } else {
          errors.push(`Record ${i}: Invalid or missing required fields`);
        }
      }

      if (sanitizedRecords.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No valid records to upload', validation_errors: errors }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Upsert records (update existing, insert new)
      const { data: inserted, error: insertError } = await supabase
        .from('industry_benchmarks')
        .upsert(sanitizedRecords, { 
          onConflict: 'industry_id',
          ignoreDuplicates: false 
        })
        .select('id, industry_id, industry_name');

      if (insertError) {
        log.error('Insert error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to upload benchmarks', details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      log.info(`Successfully uploaded ${sanitizedRecords.length} benchmark records`);

      return new Response(
        JSON.stringify({
          success: true,
          // Match benchmarkUploadService.ts expected shape: { inserted, updated, failed, errors }
          inserted: sanitizedRecords.length,
          updated: 0,
          failed: errors.length,
          errors: errors.slice(0, 10),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === 'clear') {
      // Clear all benchmark data (dangerous - admin only)
      const { error: deleteError } = await supabase
        .from('industry_benchmarks')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: 'Failed to clear benchmarks', details: deleteError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      log.info('All benchmark data cleared');
      return new Response(
        JSON.stringify({ success: true, message: 'All benchmarks cleared' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === 'stats') {
      // Get stats about stored benchmarks
      const { count, error: countError } = await supabase
        .from('industry_benchmarks')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        return new Response(
          JSON.stringify({ error: 'Failed to get stats', details: countError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: industries } = await supabase
        .from('industry_benchmarks')
        .select('industry_id, industry_name, source, confidence_score')
        .limit(50);

      return new Response(
        JSON.stringify({
          // Match benchmarkUploadService.ts expected shape: { count, sample }
          count: count ?? 0,
          sample: (industries || []).map(r => ({ industry_id: r.industry_id, industry_name: r.industry_name })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: upload, clear, or stats' }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    log.error('Benchmark management error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
