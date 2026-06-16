import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeadersFor } from '../_shared/cors.ts';

import { maybeHealthResponse } from '../_shared/health.ts';
const FUNCTION_NAME = 'ingest-benchmark-data';
const FUNCTION_VERSION = '1.0.0';

Deno.serve(async (req) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin via user token
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { benchmarks, provenance_id } = body;

    if (!Array.isArray(benchmarks) || benchmarks.length === 0) {
      return new Response(JSON.stringify({ error: "benchmarks array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate provenance exists
    if (provenance_id) {
      const { data: prov } = await supabase
        .from("data_provenance")
        .select("id")
        .eq("id", provenance_id)
        .maybeSingle();
      if (!prov) {
        return new Response(JSON.stringify({ error: "Invalid provenance_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const results = { inserted: 0, updated: 0, errors: [] as string[] };

    for (const bm of benchmarks) {
      // Validate required fields
      if (!bm.industry_id || !bm.industry_name) {
        results.errors.push(`Missing industry_id or industry_name: ${JSON.stringify(bm).slice(0, 100)}`);
        continue;
      }

      // Upsert benchmark
      const { data: existing } = await supabase
        .from("industry_benchmarks")
        .select("id, source_count")
        .eq("industry_id", bm.industry_id)
        .maybeSingle();

      if (existing) {
        // Update with new data, increment source_count
        const { error: updateErr } = await supabase
          .from("industry_benchmarks")
          .update({
            ...bm,
            source_count: (existing.source_count || 1) + 1,
            last_updated: new Date().toISOString(),
            source: bm.source || "multi_source",
          })
          .eq("id", existing.id);

        if (updateErr) {
          results.errors.push(`Update failed for ${bm.industry_id}: ${updateErr.message}`);
        } else {
          results.updated++;

          // Link to provenance
          if (provenance_id) {
            await supabase.from("benchmark_sources").insert({
              benchmark_id: existing.id,
              provenance_id,
              metric_name: "all",
            });
          }
        }
      } else {
        // Insert new
        const { data: inserted, error: insertErr } = await supabase
          .from("industry_benchmarks")
          .insert({
            ...bm,
            source_count: 1,
            last_updated: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (insertErr) {
          results.errors.push(`Insert failed for ${bm.industry_id}: ${insertErr.message}`);
        } else {
          results.inserted++;

          if (provenance_id && inserted) {
            await supabase.from("benchmark_sources").insert({
              benchmark_id: inserted.id,
              provenance_id,
              metric_name: "all",
            });
          }
        }
      }
    }

    // Update provenance last_ingested_at
    if (provenance_id) {
      await supabase
        .from("data_provenance")
        .update({ last_ingested_at: new Date().toISOString() })
        .eq("id", provenance_id);
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
