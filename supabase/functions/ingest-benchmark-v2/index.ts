import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeadersFor } from '../_shared/cors.ts';
const PK_COLS = ['sector_level1', 'sector_level2', 'business_model', 'geo_region', 'country', 'city_tier', 'company_stage', 'size_bucket'];

const TABLE_MAP: Record<string, string> = {
  benchmarks_core: 'benchmarks_v2_core',
  benchmarks_unit_econ: 'benchmarks_v2_unit_econ',
  benchmarks_geo: 'benchmarks_v2_geo',
  benchmarks_risk: 'benchmarks_v2_risk',
  benchmarks_invoice: 'benchmarks_v2_invoice',
};

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Admin-only: verify caller has admin role
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sheet, rows, batch_index, total_batches } = await req.json();


    if (!sheet || !TABLE_MAP[sheet]) {
      return new Response(JSON.stringify({ error: `Invalid sheet: ${sheet}. Valid: ${Object.keys(TABLE_MAP).join(', ')}` }), { status: 400, headers: corsHeaders });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return new Response(JSON.stringify({ error: 'rows must be a non-empty array' }), { status: 400, headers: corsHeaders });
    }

    const tableName = TABLE_MAP[sheet];
    const BATCH_SIZE = 500;
    let inserted = 0;
    let errors = 0;
    const errorMessages: string[] = [];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from(tableName).upsert(batch, {
        onConflict: PK_COLS.join(','),
        ignoreDuplicates: false,
      });

      if (error) {
        errors += batch.length;
        errorMessages.push(`Batch ${Math.floor(i / BATCH_SIZE)}: ${error.message}`);
      } else {
        inserted += batch.length;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      table: tableName,
      sheet,
      batch_index: batch_index || 0,
      total_batches: total_batches || 1,
      rows_processed: rows.length,
      rows_inserted: inserted,
      rows_errored: errors,
      errors: errorMessages.length > 0 ? errorMessages : undefined,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
