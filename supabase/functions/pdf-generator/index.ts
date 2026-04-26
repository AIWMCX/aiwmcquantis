import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeadersFor } from '../_shared/cors.ts';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CACHE_KEY_RE = /^[0-9a-f]{64}$/i;
const MAX_HTML_BYTES = 500 * 1024; // 500 KB
const BUCKET = "document-exports";

function errorResponse(code: string, message: string, status = 400, corsHeaders: Record<string, string> = {}) {
  return new Response(
    JSON.stringify({ error: true, code, message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

Deno.serve(async (req: Request) => {
  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const startMs = performance.now();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // ---------- 1. Parse & validate ----------
    const body = await req.json();
    const { htmlContent, userId, cacheKey, templateId, jobId } = body;

    if (!htmlContent || typeof htmlContent !== "string") {
      return errorResponse("QE-PDF-001", "htmlContent is required and must be a string", 400, corsHeaders);
    }
    if (new TextEncoder().encode(htmlContent).length > MAX_HTML_BYTES) {
      return errorResponse("QE-PDF-002", "htmlContent exceeds 500 KB limit", 400, corsHeaders);
    }
    if (!userId || !UUID_RE.test(userId)) {
      return errorResponse("QE-PDF-003", "userId must be a valid UUID", 400, corsHeaders);
    }
    if (!cacheKey || !CACHE_KEY_RE.test(cacheKey)) {
      return errorResponse("QE-PDF-004", "cacheKey must be a 64-char hex string", 400, corsHeaders);
    }
    if (!templateId || typeof templateId !== "string") {
      return errorResponse("QE-PDF-005", "templateId is required", 400, corsHeaders);
    }

    // ---------- 1b. White-label gate (Spec §11.1) ----------
    // Trigger `enforce_white_label_pro` already ensures only PRO users can flip
    // hide_quantis_branding=true, so trusting the column here is safe.
    let hideBranding = false;
    try {
      const { data: brand } = await supabase
        .from("branding_settings")
        .select("hide_quantis_branding")
        .eq("user_id", userId)
        .maybeSingle();
      hideBranding = brand?.hide_quantis_branding === true;
    } catch (_) {
      // Default to branded output if lookup fails — never accidentally strip
      // branding for a non-PRO user.
      hideBranding = false;
    }

    // Apply white-label: strip the `<!-- QUANTIS_BRANDING -->` block from
    // template HTML when the user opted in. Templates wrap their footer/logo
    // in this comment so we can remove it without parsing the full DOM.
    const renderedHtml = hideBranding
      ? htmlContent.replace(
          /<!--\s*QUANTIS_BRANDING_START\s*-->[\s\S]*?<!--\s*QUANTIS_BRANDING_END\s*-->/g,
          "",
        )
      : htmlContent;

    const storagePath = `docs/${userId}/${cacheKey}.html`;

    // ---------- 2. Cache check ----------
    const { data: existing } = await supabase.storage
      .from(BUCKET)
      .download(storagePath);

    if (existing) {
      const { data: urlData } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, 86400); // 24 h

      const elapsedMs = Math.round(performance.now() - startMs);

      return new Response(
        JSON.stringify({
          fileUrl: urlData?.signedUrl ?? null,
          sizeKb: Math.round(existing.size / 1024),
          generationMs: elapsedMs,
          cacheHit: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---------- 3. Upload HTML ----------
    const htmlBytes = new TextEncoder().encode(htmlContent);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, htmlBytes, {
        contentType: "text/html; charset=utf-8",
        cacheControl: "86400",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // ---------- 4. Signed URL ----------
    const { data: signedData, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 86400);

    if (signError) {
      throw new Error(`Signed URL failed: ${signError.message}`);
    }

    const elapsedMs = Math.round(performance.now() - startMs);
    const sizeKb = Math.round(htmlBytes.length / 1024);

    // ---------- 5. Update job record (best-effort) ----------
    if (jobId) {
      await supabase
        .from("doc_generation_jobs")
        .update({
          status: "complete",
          output_url: signedData?.signedUrl,
          processing_ms: elapsedMs,
          output_size_kb: sizeKb,
          completed_at: new Date().toISOString(),
        })
        .eq("job_id", jobId);
    }

    // ---------- 6. Return ----------
    return new Response(
      JSON.stringify({
        fileUrl: signedData?.signedUrl ?? null,
        sizeKb,
        generationMs: elapsedMs,
        cacheHit: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const elapsedMs = Math.round(performance.now() - startMs);

    // Best-effort error logging
    try {
      await supabase.from("analysis_logs").insert({
        analysis_id: "00000000-0000-0000-0000-000000000000",
        event_type: "pdf_generator_error",
        severity: "error",
        payload: { message, elapsedMs },
      });
    } catch (_) {
      // swallow logging failures
    }

    return errorResponse("QE-PDF-099", message, 500);
  }
});
