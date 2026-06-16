import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';


import { maybeHealthResponse } from '../_shared/health.ts';
const FUNCTION_NAME = 'score-import';
const FUNCTION_VERSION = '1.0.0';

/**
 * SCORE Import Edge Function
 * Parses a CSV body with SCORE-format fields and maps them to Quantis inputs.
 */
serve(async (req: Request): Promise<Response> => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const reqId = getRequestId(req);
  const log = createLogger('score-import', reqId);

  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { csv_content } = await req.json();

    if (!csv_content || typeof csv_content !== 'string') {
      return new Response(
        JSON.stringify({ error: 'csv_content is required as a string' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse CSV
    const lines = csv_content.trim().split('\n');
    if (lines.length < 2) {
      return new Response(
        JSON.stringify({ error: 'CSV must have at least a header and one data row' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].match(/("([^"]*)"|[^,]*)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
      rows.push(row);
    }

    // Map to Quantis fields
    const SCORE_FIELD_MAP: Record<string, string> = {
      'monthly_revenue': 'monthly_revenue',
      'monthly revenue': 'monthly_revenue',
      'total_startup_costs': 'startup_investment',
      'total startup costs': 'startup_investment',
      'price_per_unit': 'average_price',
      'price per unit': 'average_price',
      'units_sold': 'expected_customers',
      'units sold': 'expected_customers',
      'total_monthly_expenses': 'monthly_costs',
      'total monthly expenses': 'monthly_costs',
      'marketing_monthly': 'marketing_budget',
      'marketing budget': 'marketing_budget',
    };

    const mappedInputs: Record<string, number> = {};
    const unmapped: string[] = [];
    const inconsistencies: Array<{ field: string; issue: string }> = [];

    for (const row of rows) {
      const fieldName = (row.field || row.name || row.label || '').toLowerCase().trim();
      const rawValue = row.value || row.amount || '';
      const numVal = parseFloat(String(rawValue).replace(/[$,%\s]/g, ''));

      const mapped = SCORE_FIELD_MAP[fieldName];
      if (mapped && !isNaN(numVal)) {
        mappedInputs[mapped] = numVal;
      } else if (fieldName && rawValue) {
        unmapped.push(fieldName);
      }
    }

    // Validate internal consistency
    if (mappedInputs.monthly_revenue && mappedInputs.average_price && mappedInputs.expected_customers) {
      const computed = mappedInputs.average_price * mappedInputs.expected_customers;
      if (Math.abs(computed - mappedInputs.monthly_revenue) > mappedInputs.monthly_revenue * 0.2) {
        inconsistencies.push({
          field: 'Revenue',
          issue: `Price × Units ($${computed.toLocaleString()}) differs from stated revenue ($${mappedInputs.monthly_revenue.toLocaleString()}) by >20%`
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        financial_inputs: mappedInputs,
        unmapped_fields: unmapped,
        inconsistencies,
        fields_mapped: Object.keys(mappedInputs).length,
        total_rows: rows.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    log.error('SCORE import error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to parse SCORE data' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
