import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { requireFeature, requireDownloadQuota, EntitlementError } from "../_shared/entitlements.ts";

import { corsHeadersFor } from '../_shared/cors.ts';
interface QueueExportRequest {
  analysis_id: string;
  idempotency_key: string;
}

Deno.serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claimsData.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.user.id;

    // ========== ENTITLEMENT GATE: watermarkFree (paid PDF export) + daily quota ==========
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    try {
      await requireFeature(adminClient, userId, 'watermarkFree', '/queue-export');
      await requireDownloadQuota(adminClient, userId, '/queue-export');
    } catch (e) {
      if (e instanceof EntitlementError) return e.toResponse(corsHeaders);
      throw e;
    }
    console.log(`[queue-export] user=${userId} authorized + quota consumed`);

    // Parse request body
    const body: QueueExportRequest = await req.json();
    const { analysis_id, idempotency_key } = body;

    if (!analysis_id) {
      return new Response(
        JSON.stringify({ error: 'analysis_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for existing job with same idempotency key
    if (idempotency_key) {
      const { data: existingJob } = await supabase
        .from('export_jobs')
        .select('id, status, file_url')
        .eq('idempotency_key', idempotency_key)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingJob) {
        console.log(`Found existing job for idempotency key: ${idempotency_key}`);
        return new Response(
          JSON.stringify({ 
            job_id: existingJob.id,
            status: existingJob.status,
            file_url: existingJob.file_url,
            deduplicated: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Verify user owns this analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('id, result')
      .eq('id', analysis_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (analysisError || !analysis) {
      return new Response(
        JSON.stringify({ error: 'Analysis not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new export job with pending status
    const { data: newJob, error: insertError } = await supabase
      .from('export_jobs')
      .insert({
        user_id: userId,
        analysis_id: analysis_id,
        idempotency_key: idempotency_key || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError || !newJob) {
      console.error('Failed to create export job:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create export job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jobId = newJob.id;
    console.log(`Created export job: ${jobId} for analysis: ${analysis_id}`);

    // Start background processing using waitUntil
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(processExportJob(supabase, jobId, analysis.result, userId));
    } else {
      // Fallback: process synchronously (not ideal but works)
      processExportJob(supabase, jobId, analysis.result, userId);
    }

    // Return immediately with job ID
    return new Response(
      JSON.stringify({ 
        job_id: jobId, 
        status: 'pending',
        message: 'Export queued for processing'
      }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Queue export error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Background processing function
async function processExportJob(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  analysisResult: unknown,
  userId: string
): Promise<void> {
  try {
    console.log(`Starting background processing for job: ${jobId}`);

    // Update status to processing
    await supabase
      .from('export_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    // Simulate PDF generation (in real implementation, generate actual PDF)
    // For now, we'll mark as completed after a delay
    // The actual PDF is still generated client-side for better compatibility
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update status to completed
    // Note: In a full implementation, you would:
    // 1. Generate the PDF server-side using a library like puppeteer or pdf-lib
    // 2. Upload to Supabase Storage
    // 3. Store the file_url
    
    // For now, mark as completed to allow the frontend to use its existing PDF generation
    await supabase
      .from('export_jobs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        // file_url would be set here after actual PDF generation
      })
      .eq('id', jobId);

    console.log(`Completed processing for job: ${jobId}`);

  } catch (error) {
    console.error(`Failed processing job ${jobId}:`, error);
    
    await supabase
      .from('export_jobs')
      .update({ 
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}
