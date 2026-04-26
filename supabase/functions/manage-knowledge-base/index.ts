import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';

// Valid tables in the knowledge base
const VALID_TABLES = [
  'industry_benchmarks',
  'location_data',
  'scenario_library',
  'risk_factors',
  'launch_checklists',
  'marketing_channels'
] as const;

type ValidTable = typeof VALID_TABLES[number];

serve(async (req: Request): Promise<Response> => {
  const reqId = getRequestId(req);
  const log = createLogger('manage-knowledge-base', reqId);

  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin key
    const adminKey = req.headers.get("x-admin-key");
    const expectedKey = Deno.env.get("ADMIN_UPLOAD_KEY");
    
    if (!adminKey || adminKey !== expectedKey) {
      log.error("[manage-knowledge-base] Invalid admin key");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid admin key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action, table, data, filters } = await req.json();

    // Validate table name
    if (!VALID_TABLES.includes(table)) {
      return new Response(
        JSON.stringify({ error: `Invalid table: ${table}. Valid tables: ${VALID_TABLES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log.info(`[manage-knowledge-base] Action: ${action}, Table: ${table}`);

    switch (action) {
      case "stats": {
        // Get counts for all knowledge base tables
        const stats: Record<string, number> = {};
        let totalRecords = 0;

        for (const t of VALID_TABLES) {
          const { count, error } = await supabase
            .from(t)
            .select("*", { count: "exact", head: true });
          
          if (error) {
            log.error(`[manage-knowledge-base] Error counting ${t}:`, error);
            stats[t] = 0;
          } else {
            stats[t] = count || 0;
            totalRecords += count || 0;
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            stats,
            total_records: totalRecords,
            last_updated: new Date().toISOString()
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "select": {
        let query = supabase.from(table).select("*");
        
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (Array.isArray(value)) {
              query = query.in(key, value);
            } else {
              query = query.eq(key, value);
            }
          }
        }

        const { data: result, error } = await query.limit(1000);

        if (error) {
          log.error(`[manage-knowledge-base] Select error:`, error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, data: result, count: result?.length || 0 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "insert": {
        if (!data || (Array.isArray(data) && data.length === 0)) {
          return new Response(
            JSON.stringify({ error: "No data provided for insert" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const records = Array.isArray(data) ? data : [data];
        const { data: result, error } = await supabase
          .from(table)
          .insert(records)
          .select();

        if (error) {
          log.error(`[manage-knowledge-base] Insert error:`, error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        log.info(`[manage-knowledge-base] Inserted ${result?.length || 0} records into ${table}`);
        return new Response(
          JSON.stringify({ success: true, inserted: result?.length || 0, data: result }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "upsert": {
        if (!data || (Array.isArray(data) && data.length === 0)) {
          return new Response(
            JSON.stringify({ error: "No data provided for upsert" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const records = Array.isArray(data) ? data : [data];
        
        // Determine the unique key for each table
        const uniqueKeyMap: Record<ValidTable, string> = {
          industry_benchmarks: 'industry_id',
          location_data: 'city_id',
          scenario_library: 'scenario_id',
          risk_factors: 'risk_id',
          launch_checklists: 'template_id',
          marketing_channels: 'channel_id'
        };

        const uniqueKey = uniqueKeyMap[table as ValidTable];

        const { data: result, error } = await supabase
          .from(table)
          .upsert(records, { onConflict: uniqueKey })
          .select();

        if (error) {
          log.error(`[manage-knowledge-base] Upsert error:`, error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        log.info(`[manage-knowledge-base] Upserted ${result?.length || 0} records into ${table}`);
        return new Response(
          JSON.stringify({ success: true, upserted: result?.length || 0, data: result }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        if (!filters || Object.keys(filters).length === 0) {
          return new Response(
            JSON.stringify({ error: "Filters required for delete operation" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let query = supabase.from(table).delete();
        
        for (const [key, value] of Object.entries(filters)) {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        }

        const { error } = await query;

        if (error) {
          log.error(`[manage-knowledge-base] Delete error:`, error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        log.info(`[manage-knowledge-base] Deleted records from ${table} with filters:`, filters);
        return new Response(
          JSON.stringify({ success: true, message: "Records deleted successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "truncate": {
        // Delete all records from the table (use with caution!)
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) {
          log.error(`[manage-knowledge-base] Truncate error:`, error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        log.info(`[manage-knowledge-base] Truncated table: ${table}`);
        return new Response(
          JSON.stringify({ success: true, message: `Table ${table} truncated successfully` }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}. Valid actions: stats, select, insert, upsert, delete, truncate` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    log.error("[manage-knowledge-base] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
