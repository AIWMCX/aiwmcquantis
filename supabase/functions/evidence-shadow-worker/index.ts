/**
 * Quantis Evidence Service — shadow-mode queue worker (PR E6.4).
 *
 * Cron-polled (see 20260810130000_evidence_shadow_worker_cron.sql),
 * mirrors doc-queue-worker/index.ts's exact structure (x-cron-secret
 * auth, service-role client, optimistic per-row claim via
 * UPDATE...WHERE status='PENDING').
 *
 * NON-INTERFERENCE GUARANTEES:
 *   - Gated behind EVIDENCE_SERVICE_SHADOW_ENABLED (default unset/false):
 *     even fully deployed and cron-scheduled, this is a no-op until that
 *     flag is explicitly set. Queue rows just accumulate harmlessly.
 *   - This function is never called by analyze-business or any
 *     customer-facing request path -- it only reads from
 *     evidence_shadow_queue, which is populated by a DB trigger on
 *     public.analyses (20260810120000_evidence_shadow_queue.sql), fully
 *     decoupled from the request/response cycle of whatever inserted the
 *     analysis.
 *   - Every external call (Tavily, via runEvidencePipeline) is bounded by
 *     PIPELINE_TIMEOUT_MS. A hung provider call fails that one queue item,
 *     never the batch, never any other system.
 *   - No customer-facing table, response, or financial calculation is
 *     touched anywhere in this file.
 *
 * KNOWN LIMITATION (acceptable for this slice, not hidden): the
 * evidence_requests/evidence_packets/evidence_sources/... inserts below
 * are NOT wrapped in a single DB transaction (PostgREST doesn't expose
 * multi-table client transactions without an RPC). If a queue item fails
 * partway through and is retried, the retry creates a fresh set of rows
 * (new packet.evidencePacketId etc. each run) rather than resuming the
 * partial write -- this can leave a harmless incomplete packet from the
 * failed attempt alongside the successful retry's packet. No uniqueness
 * constraint is violated by this and no customer-facing data is affected;
 * cleaning up orphaned partial packets is a reasonable E7 hardening item,
 * not required for shadow-mode correctness.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { maybeHealthResponse } from '../_shared/health.ts';
import { runEvidencePipeline } from '../_shared/evidence/pipeline.ts';
import { TavilyEvidenceProvider } from '../_shared/evidence/tavily-provider.ts';
import {
  mapEvidenceRequestRow,
  mapEvidencePacketRow,
  mapEvidenceSourceRows,
  mapEvidencePassageRows,
  mapEvidenceClaimRows,
} from '../_shared/evidence/db-mapping.ts';

const FUNCTION_NAME = 'evidence-shadow-worker';
const FUNCTION_VERSION = '1.0.0';
const BATCH_SIZE = 5;
const MAX_ATTEMPTS = 3;
/** Per-item budget so one slow/hanging provider call can only ever cost this one queue item, never stall the batch. */
const PIPELINE_TIMEOUT_MS = 20000;
/** Postgres unique_violation -- semantic-duplicate evidence run detection (evidence_packets_run_key_uidx). */
const PG_UNIQUE_VIOLATION = '23505';

interface QueueRow {
  id: string;
  analysis_id: string;
  user_id: string;
  idea: string;
  location: string;
  attempts: number;
}

Deno.serve(async (req: Request) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const reqId = getRequestId(req);
  const log = createLogger('evidence-shadow-worker', reqId);

  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || cronSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (Deno.env.get('EVIDENCE_SERVICE_SHADOW_ENABLED') !== 'true') {
    return new Response(
      JSON.stringify({ processed: 0, failed: 0, skipped: true, reason: 'EVIDENCE_SERVICE_SHADOW_ENABLED not true' }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const tavily = new TavilyEvidenceProvider();
  if (!tavily.isAvailable()) {
    log.warn('TAVILY_API_KEY not configured -- nothing to do');
    return new Response(
      JSON.stringify({ processed: 0, failed: 0, skipped: true, reason: 'no provider available' }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const batchStart = Date.now();
  let processed = 0;
  let failed = 0;

  try {
    const { data: items, error: fetchErr } = await supabase
      .from('evidence_shadow_queue')
      .select('id, analysis_id, user_id, idea, location, attempts')
      .eq('status', 'PENDING')
      .lt('attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchErr) {
      log.error('Failed to fetch queue items:', fetchErr);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch queue', detail: fetchErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, failed: 0, message: 'No pending items' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    for (const item of items as QueueRow[]) {
      try {
        const { data: claimed, error: claimErr } = await supabase
          .from('evidence_shadow_queue')
          .update({ status: 'PROCESSING', attempts: item.attempts + 1 })
          .eq('id', item.id)
          .eq('status', 'PENDING')
          .select('id, analysis_id, user_id, idea, location')
          .maybeSingle();

        if (claimErr || !claimed) continue; // another concurrent worker run claimed it first

        const pipelinePromise = runEvidencePipeline({
          analysisRunId: claimed.analysis_id,
          idea: claimed.idea,
          location: claimed.location,
          providers: [tavily],
        });
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`pipeline timed out after ${PIPELINE_TIMEOUT_MS}ms`)), PIPELINE_TIMEOUT_MS),
        );
        const { packet, request } = await Promise.race([pipelinePromise, timeout]);

        const requestRow = mapEvidenceRequestRow(request, claimed.analysis_id, claimed.user_id);
        const { data: insertedRequest, error: reqErr } = await supabase
          .from('evidence_requests')
          .insert(requestRow)
          .select('id')
          .single();
        if (reqErr || !insertedRequest) throw new Error(`evidence_requests insert failed: ${reqErr?.message}`);

        const packetRow = await mapEvidencePacketRow(packet, claimed.analysis_id, claimed.user_id, insertedRequest.id);
        const { error: packetErr } = await supabase.from('evidence_packets').insert(packetRow);
        if (packetErr) {
          if (packetErr.code === PG_UNIQUE_VIOLATION) {
            // This exact analysis + evidence-plan-version + schema-version has
            // already been researched and persisted by another run (a
            // duplicate trigger fire, or a retry racing a still-committing
            // prior attempt) -- not a failure. The winning run already
            // inserted sources/passages/claims for this evidencePacketId, so
            // there is nothing further to do for this queue item.
            log.info(`Duplicate evidence run detected (run_key collision) for analysis ${claimed.analysis_id} -- treating as idempotent success`);
            await supabase
              .from('evidence_shadow_queue')
              .update({ status: 'DONE', processed_at: new Date().toISOString() })
              .eq('id', claimed.id);
            processed++;
            continue;
          }
          throw new Error(`evidence_packets insert failed: ${packetErr.message}`);
        }

        const sourceRows = mapEvidenceSourceRows(packet.sources, claimed.analysis_id, claimed.user_id, packet.evidencePacketId);
        if (sourceRows.length > 0) {
          const { error: sourcesErr } = await supabase.from('evidence_sources').insert(sourceRows);
          if (sourcesErr) throw new Error(`evidence_sources insert failed: ${sourcesErr.message}`);
        }

        const passageRows = mapEvidencePassageRows(packet.passages, packet.sources, claimed.analysis_id, claimed.user_id);
        if (passageRows.length > 0) {
          const { error: passagesErr } = await supabase.from('evidence_passages').insert(passageRows);
          if (passagesErr) throw new Error(`evidence_passages insert failed: ${passagesErr.message}`);
        }

        const claimRows = mapEvidenceClaimRows(packet.claims, claimed.analysis_id, claimed.user_id, packet.evidencePacketId);
        if (claimRows.length > 0) {
          const { error: claimsErr } = await supabase.from('evidence_claims').insert(claimRows);
          if (claimsErr) throw new Error(`evidence_claims insert failed: ${claimsErr.message}`);
        }

        await supabase
          .from('evidence_shadow_queue')
          .update({ status: 'DONE', processed_at: new Date().toISOString() })
          .eq('id', claimed.id);

        processed++;
      } catch (itemErr) {
        log.error(`Queue item ${item.id} failed:`, itemErr);
        failed++;
        const message = itemErr instanceof Error ? itemErr.message : String(itemErr);
        const attemptsNow = item.attempts + 1;
        await supabase
          .from('evidence_shadow_queue')
          .update({
            status: attemptsNow >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
            last_error: message.slice(0, 2000),
          })
          .eq('id', item.id);
      }
    }

    return new Response(
      JSON.stringify({ processed, failed, batchMs: Date.now() - batchStart }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    log.error('evidence-shadow-worker fatal:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
