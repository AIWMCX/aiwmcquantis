import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startMs = Date.now();

  try {
    const { job_id } = await req.json();
    if (!job_id) {
      return new Response(
        JSON.stringify({ error: "job_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Claim the job (atomic status update)
    const { data: job, error: claimErr } = await supabase
      .from("doc_generation_jobs")
      .update({ status: "processing" })
      .eq("job_id", job_id)
      .eq("status", "queued")
      .select()
      .maybeSingle();

    if (claimErr || !job) {
      return new Response(
        JSON.stringify({ error: "Job not found or already claimed" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Generate document content using AI
    const inputData = job.input_data as Record<string, unknown>;
    const templateId = job.template_id;

    let generatedContent = "";

    try {
      // Call the existing generate-document-content function for AI-enhanced docs
      const { data: aiResult, error: aiError } = await supabase.functions.invoke(
        "generate-document-content",
        {
          body: {
            template_id: templateId,
            input_data: inputData,
            analysis_id: job.analysis_id,
          },
        },
      );

      if (aiError) {
        console.warn("AI generation fallback:", aiError);
        generatedContent = JSON.stringify(inputData);
      } else {
        generatedContent = typeof aiResult === "string" ? aiResult : JSON.stringify(aiResult);
      }
    } catch {
      // Fallback: use raw input as content
      generatedContent = JSON.stringify(inputData);
    }

    // Store result in Supabase Storage
    const fileName = `docs/${job.user_id}/${job_id}.json`;
    const fileContent = new TextEncoder().encode(generatedContent);

    const { error: uploadErr } = await supabase.storage
      .from("document-exports")
      .upload(fileName, fileContent, {
        contentType: "application/json",
        upsert: true,
      });

    let outputUrl = "";
    if (!uploadErr) {
      const { data: urlData } = supabase.storage
        .from("document-exports")
        .getPublicUrl(fileName);
      outputUrl = urlData.publicUrl;
    }

    const processingMs = Date.now() - startMs;

    // Mark job as complete
    await supabase
      .from("doc_generation_jobs")
      .update({
        status: "complete",
        output_url: outputUrl,
        output_size_kb: Math.ceil(fileContent.length / 1024),
        processing_ms: processingMs,
        completed_at: new Date().toISOString(),
      })
      .eq("job_id", job_id);

    return new Response(
      JSON.stringify({ success: true, job_id, processing_ms: processingMs }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("process-doc-job error:", err);

    // Try to mark job as failed
    try {
      const { job_id } = await req.clone().json().catch(() => ({ job_id: null }));
      if (job_id) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, serviceKey);
        await supabase
          .from("doc_generation_jobs")
          .update({
            status: "failed",
            error_message: err instanceof Error ? err.message : "Unknown error",
            retry_count: 1,
          })
          .eq("job_id", job_id);
      }
    } catch {
      // Best effort
    }

    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
