import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Authenticate via cron secret
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const batchStart = Date.now();
  let processed = 0;
  let failed = 0;
  let totalMs = 0;

  try {
    // Fetch up to 10 queued jobs ordered by priority then age
    const { data: jobs, error: fetchErr } = await supabase
      .from("doc_generation_jobs")
      .select("*")
      .eq("status", "queued")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(10);

    if (fetchErr) {
      console.error("Failed to fetch queued jobs:", fetchErr);
      return new Response(
        JSON.stringify({ error: "Failed to fetch jobs", detail: fetchErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, failed: 0, avgMs: 0, message: "No queued jobs" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    for (const job of jobs) {
      const jobStart = Date.now();

      try {
        // Claim the job atomically
        const { data: claimed, error: claimErr } = await supabase
          .from("doc_generation_jobs")
          .update({ status: "processing" })
          .eq("job_id", job.job_id)
          .eq("status", "queued")
          .select()
          .maybeSingle();

        if (claimErr || !claimed) {
          // Another worker claimed it
          continue;
        }

        // Fetch report from report_outputs if analysis_id exists
        let reportData: Record<string, unknown> | null = null;
        if (claimed.analysis_id) {
          const { data: report } = await supabase
            .from("report_outputs")
            .select("report_json")
            .eq("analysis_id", claimed.analysis_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          reportData = report?.report_json as Record<string, unknown> | null;
        }

        // Fetch user brand profile
        let brandProfile: Record<string, unknown> | null = null;
        const { data: brand } = await supabase
          .from("user_brand_profiles")
          .select("*")
          .eq("user_id", claimed.user_id)
          .maybeSingle();
        brandProfile = brand;

        // Generate document content via existing edge function
        const inputData = claimed.input_data as Record<string, unknown>;
        let generatedContent = "";

        try {
          const { data: aiResult, error: aiError } = await supabase.functions.invoke(
            "generate-document-content",
            {
              body: {
                template_id: claimed.template_id,
                input_data: {
                  ...inputData,
                  report: reportData,
                  branding: brandProfile,
                },
                analysis_id: claimed.analysis_id,
              },
            },
          );

          if (aiError) {
            console.warn(`AI generation fallback for ${claimed.job_id}:`, aiError);
            generatedContent = JSON.stringify(inputData);
          } else {
            generatedContent = typeof aiResult === "string" ? aiResult : JSON.stringify(aiResult);
          }
        } catch {
          generatedContent = JSON.stringify(inputData);
        }

        // Upload result to storage
        const fileName = `docs/${claimed.user_id}/${claimed.job_id}.json`;
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

        const processingMs = Date.now() - jobStart;
        totalMs += processingMs;

        // Mark job complete
        await supabase
          .from("doc_generation_jobs")
          .update({
            status: "complete",
            output_url: outputUrl,
            output_size_kb: Math.ceil(fileContent.length / 1024),
            processing_ms: processingMs,
            completed_at: new Date().toISOString(),
          })
          .eq("job_id", claimed.job_id);

        // Insert into documents table
        await supabase.from("documents").insert({
          user_id: claimed.user_id,
          analysis_id: claimed.analysis_id,
          title: `${claimed.template_id} - ${new Date().toLocaleDateString()}`,
          document_json: { content: generatedContent, output_url: outputUrl },
          status: "final",
        });

        // Broadcast completion via Realtime
        await supabase.channel(`doc_jobs:${claimed.job_id}`).send({
          type: "broadcast",
          event: "job_complete",
          payload: { job_id: claimed.job_id, status: "complete", output_url: outputUrl },
        });

        processed++;
      } catch (jobErr) {
        console.error(`Job ${job.job_id} failed:`, jobErr);
        failed++;

        // Mark job as failed
        await supabase
          .from("doc_generation_jobs")
          .update({
            status: "failed",
            error_message: jobErr instanceof Error ? jobErr.message : "Unknown error",
            retry_count: (job.retry_count || 0) + 1,
          })
          .eq("job_id", job.job_id);
      }
    }

    const avgMs = processed > 0 ? Math.round(totalMs / processed) : 0;

    return new Response(
      JSON.stringify({ processed, failed, avgMs, batchMs: Date.now() - batchStart }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("doc-queue-worker fatal:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
