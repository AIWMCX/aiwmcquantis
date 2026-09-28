// AIWMC Quantis — Commercial Ops workflow, Phase E (admin-only)
// ---------------------------------------------------------------------------
// The single HTTP entry point for every commercial-workflow stage built in
// Phase D/E: dispatches on `action`, calls the matching stage function in
// supabase/functions/_shared/commercial/stages/*.ts, persists the validated
// result, and returns it. /admin/commercial (CommercialOps.tsx) is the UI.
//
// Auth pattern matches content-studio-generate/index.ts exactly: Bearer
// token -> auth.getUser() -> user_roles admin check. Every write below uses
// the service-role client (RLS-bypassing), so the admin check here is the
// only gate -- get it right or this data is exposed.
// ---------------------------------------------------------------------------
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { CommercialFoundation } from '../_shared/commercial/contracts.ts';
import { generateOffer } from '../_shared/commercial/stages/offer.ts';
import { assessProspect } from '../_shared/commercial/stages/prospecting.ts';
import { prepareCallBrief } from '../_shared/commercial/stages/call-preparation.ts';
import { handleObjection } from '../_shared/commercial/stages/objection-handling.ts';
import { draftFollowup, SEQUENCE_STEPS } from '../_shared/commercial/stages/follow-up.ts';
import { draftFirstTouch, composeOutboundEmail } from '../_shared/commercial/stages/first-touch.ts';
import { checkSuppression, type OtherProspectIdentity, type SuppressionProspect } from '../_shared/commercial-suppression.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

// Rate limiting -- same public.check_rate_limit(user_id, endpoint, window,
// max_requests) RPC analyze-business/index.ts already uses. This endpoint is
// admin-only, so the limit is generous enough not to block a legitimate
// admin running a batch of prospects through the workflow, but still catches
// the real production risk: a bug or a runaway script hammering this
// function in a tight loop and burning LLM API budget. Fails OPEN on an RPC
// error (matches analyze-business's own fail-open convention) -- a broken
// rate-limit check must never itself take this endpoint down.
const COMMERCIAL_WORKFLOW_RATE_LIMIT = { windowMinutes: 5, maxRequests: 60 };

// deno-lint-ignore no-explicit-any
type Svc = SupabaseClient<any, 'public', any>;

async function loadCurrentFoundation(svc: Svc): Promise<CommercialFoundation> {
  const { data, error } = await svc.rpc('get_commercial_foundation');
  if (error) throw new Error(`get_commercial_foundation failed: ${error.message}`);
  if (!data) throw new Error('no current commercial foundation exists');
  return CommercialFoundation.parse(data);
}


interface ProspectRow {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_role: string | null;
  contact_channel: string | null;
  segment: string | null;
  campaign_id: string | null;
  batch_id: string | null;
  suppression_status: string | null;
  stage: string;
  observed_signals: unknown;
}

const PROSPECT_COLUMNS =
  'id, company_name, contact_name, contact_role, contact_channel, segment, campaign_id, batch_id, suppression_status, stage, observed_signals';

function signalsOf(row: { observed_signals: unknown }): string[] {
  return Array.isArray(row.observed_signals)
    ? row.observed_signals.map((s) => String(s).trim()).filter(Boolean)
    : [];
}

/**
 * Deterministic suppression gate shared by every drafting action. Runs
 * BEFORE any LLM call; a blocked attempt is recorded as a same-stage history
 * entry so it is visible on the prospect rather than silently dropped.
 * `ignoreRecentContact` is for sequence steps 2+, where the recent contact
 * IS this sequence's own first touch.
 */
async function suppressionGate(
  svc: Svc,
  row: ProspectRow,
  opts: { ignoreRecentContact?: boolean; record?: boolean } = {},
): Promise<{ suppressed: false } | { suppressed: true; reasonCode: string }> {
  const [{ data: campaignSiblingsRaw }, { data: activeOppsRaw }, { data: lastContactedRow }] = await Promise.all([
    row.campaign_id
      ? svc.from('commercial_prospects').select('id, company_name, contact_channel').eq('campaign_id', row.campaign_id).neq('id', row.id)
      : Promise.resolve({ data: [] as OtherProspectIdentity[] }),
    svc.from('commercial_prospects').select('id, company_name, contact_channel, stage').eq('company_name', row.company_name).neq('id', row.id),
    opts.ignoreRecentContact
      ? Promise.resolve({ data: null })
      : svc
          .from('commercial_prospect_stage_history')
          .select('created_at')
          .eq('prospect_id', row.id)
          .eq('to_stage', 'contacted')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
  ]);
  const subject: SuppressionProspect = {
    id: row.id,
    company_name: row.company_name,
    contact_channel: row.contact_channel,
    suppression_status: (row.suppression_status ?? 'active') as SuppressionProspect['suppression_status'],
  };
  const result = checkSuppression(subject, {
    campaignSiblingProspects: (campaignSiblingsRaw ?? []) as OtherProspectIdentity[],
    activeOpportunityProspects: (activeOppsRaw ?? []) as OtherProspectIdentity[],
    lastContactedAt: (lastContactedRow as { created_at?: string } | null)?.created_at ?? null,
  });
  if (result.suppressed && opts.record !== false) {
    await svc.from('commercial_prospect_stage_history').insert({
      prospect_id: row.id,
      from_stage: row.stage,
      to_stage: row.stage,
      reason: `suppressed: ${result.reasonCode}`,
      changed_by: null,
    });
  }
  return result;
}

async function senderIdentityFor(svc: Svc, campaignId: string | null): Promise<string | null> {
  if (!campaignId) return null;
  const { data } = await svc.from('commercial_campaigns').select('sender_identity').eq('id', campaignId).maybeSingle();
  return (data as { sender_identity?: string | null } | null)?.sender_identity ?? null;
}

/**
 * First-touch drafting for one prospect: suppression gate -> evidence gate
 * -> grounded agent -> deterministic footer -> stored as a DRAFT.
 */
async function draftFirstTouchFor(
  svc: Svc,
  row: ProspectRow,
  foundation: CommercialFoundation,
  userId: string,
  requestId: string | null,
): Promise<{ status: 'drafted'; followup: unknown } | { status: 'suppressed' | 'insufficient_evidence' | 'already_drafted' | 'rejected'; detail: string }> {
  const { data: existing } = await svc
    .from('commercial_followups')
    .select('id, status')
    .eq('prospect_id', row.id)
    .eq('kind', 'first_touch')
    .in('status', ['draft', 'approved', 'sent']);
  if (existing && existing.length > 0) return { status: 'already_drafted', detail: 'a live first-touch already exists' };

  const gate = await suppressionGate(svc, row);
  if (gate.suppressed) return { status: 'suppressed', detail: gate.reasonCode };

  const signals = signalsOf(row);
  if (signals.length === 0) {
    return { status: 'insufficient_evidence', detail: 'record at least one observed signal (post, hiring, niche, recent change) before drafting' };
  }

  const result = await draftFirstTouch({
    foundation,
    companyName: row.company_name,
    contactName: row.contact_name,
    contactRole: row.contact_role,
    segment: row.segment,
    observedSignals: signals,
    adminUserId: userId,
    requestId,
    prospectId: row.id,
  });
  if (!result.ok) return { status: 'rejected', detail: `${result.reason}: ${result.detail}` };

  const sender = await senderIdentityFor(svc, row.campaign_id);
  const { data, error } = await svc
    .from('commercial_followups')
    .insert({
      prospect_id: row.id,
      kind: 'first_touch',
      sequence_step: 1,
      subject: result.data.subject,
      stage_context: `first_touch | angle: ${result.data.segment_angle} | confidence: ${result.data.confidence}` +
        (result.data.missing_evidence.length ? ` | missing: ${result.data.missing_evidence.join('; ')}` : ''),
      draft: composeOutboundEmail(result.data.body, row.contact_name, sender),
      campaign_id: row.campaign_id,
      batch_id: row.batch_id,
      agent_run_id: result.runId,
    })
    .select()
    .single();
  if (error) return { status: 'rejected', detail: error.message };
  return { status: 'drafted', followup: data };
}

const SUPPRESSION_STATUSES = ['active', 'unsubscribed', 'hard_bounced', 'do_not_contact'];
const REPLY_CLASSES = ['no_reply', 'positive', 'neutral', 'negative', 'objection', 'unsubscribe', 'bounce'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const j = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    // Auth
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return j({ error: 'Unauthorized' }, 401);
    const supaUser = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes } = await supaUser.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return j({ error: 'Unauthorized' }, 401);

    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: roleRows } = await svc.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin');
    if (!roleRows || roleRows.length === 0) return j({ error: 'Admin only' }, 403);

    try {
      const { data: rateLimitResult, error: rateLimitError } = await svc.rpc('check_rate_limit', {
        p_user_id: user.id,
        p_endpoint: 'commercial-workflow',
        p_window_minutes: COMMERCIAL_WORKFLOW_RATE_LIMIT.windowMinutes,
        p_max_requests: COMMERCIAL_WORKFLOW_RATE_LIMIT.maxRequests,
      });
      if (rateLimitError) {
        console.warn('[commercial-workflow] rate limit check failed, failing open:', rateLimitError.message);
      } else if (rateLimitResult && !(rateLimitResult as { allowed?: boolean }).allowed) {
        const r = rateLimitResult as { reset_at?: string; limit?: number };
        const resetAt = r.reset_at ? new Date(r.reset_at) : new Date(Date.now() + 60_000);
        const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
        return j(
          { error: 'Too many commercial-workflow requests. Please wait before retrying.', code: 'RATE_LIMIT_EXCEEDED', limit: r.limit ?? COMMERCIAL_WORKFLOW_RATE_LIMIT.maxRequests, retry_after_seconds: retryAfterSeconds },
          429,
        );
      }
    } catch (rlErr) {
      console.warn('[commercial-workflow] rate limit system error, failing open:', rlErr);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? '');

    switch (action) {
      case 'get_foundation': {
        const foundation = await loadCurrentFoundation(svc);
        return j({ success: true, foundation });
      }

      case 'create_prospect': {
        const companyName = String(body.company_name ?? '').trim();
        if (!companyName) return j({ error: 'company_name is required' }, 400);
        const { data, error } = await svc
          .from('commercial_prospects')
          .insert({
            owner_user_id: user.id,
            company_name: companyName,
            contact_name: body.contact_name ?? null,
            contact_channel: body.contact_channel ?? null,
            contact_role: body.contact_role ?? null,
            website: body.website ?? null,
            segment: body.segment ?? null,
            campaign_id: body.campaign_id ?? null,
            batch_id: body.batch_id ?? null,
            observed_signals: Array.isArray(body.observed_signals)
              ? body.observed_signals.map(String).map((s: string) => s.trim()).filter(Boolean)
              : [],
          })
          .select()
          .single();
        if (error) return j({ error: error.message }, 500);
        return j({ success: true, prospect: data });
      }

      case 'assess_prospect': {
        const companyName = String(body.company_name ?? '').trim();
        if (!companyName) return j({ error: 'company_name is required' }, 400);
        const foundation = await loadCurrentFoundation(svc);
        const result = await assessProspect({
          foundation,
          companyName,
          observedSignals: Array.isArray(body.observed_signals) ? body.observed_signals.map(String) : [],
          adminUserId: user.id,
          requestId: req.headers.get('x-request-id'),
        });
        if (!result.ok) return j({ success: false, error: result.reason, detail: result.detail }, 502);
        return j({ success: true, assessment: result.data, run_id: result.runId });
      }

      case 'generate_offer': {
        const icp = String(body.icp ?? '').trim();
        if (!icp) return j({ error: 'icp is required' }, 400);
        const foundation = await loadCurrentFoundation(svc);
        const result = await generateOffer({
          foundation,
          icp,
          context: body.context ?? undefined,
          adminUserId: user.id,
          requestId: req.headers.get('x-request-id'),
        });
        if (!result.ok) return j({ success: false, error: result.reason, detail: result.detail }, 502);
        const { data, error } = await svc
          .from('commercial_offers')
          .insert({
            foundation_version: foundation.version,
            prospect_id: body.prospect_id ?? null,
            icp,
            primary_customer_problem: result.data.primary_customer_problem,
            desired_outcome: result.data.desired_outcome,
            offer_hypothesis: result.data.offer_hypothesis,
            offer_components: result.data.offer_components,
            risk_reducers: result.data.risk_reducers,
            pricing_context: result.data.pricing_context,
            qualification_conditions: result.data.qualification_conditions,
            disqualification_conditions: result.data.disqualification_conditions,
            cta: result.data.cta,
            claims_used: result.data.claims_used,
            evidence_references: result.data.evidence_references,
            assumptions: result.data.assumptions,
            uncertainties: result.data.uncertainties,
            agent_run_id: result.runId,
            created_by: user.id,
          })
          .select()
          .single();
        if (error) return j({ error: error.message }, 500);
        return j({ success: true, offer: data });
      }

      case 'prepare_call_brief': {
        const prospectId = String(body.prospect_id ?? '').trim();
        const prospectSummary = String(body.prospect_summary ?? '').trim();
        if (!prospectId || !prospectSummary) return j({ error: 'prospect_id and prospect_summary are required' }, 400);
        const foundation = await loadCurrentFoundation(svc);
        const result = await prepareCallBrief({
          foundation,
          prospectSummary,
          offerSummary: body.offer_summary ?? null,
          adminUserId: user.id,
          requestId: req.headers.get('x-request-id'),
        });
        if (!result.ok) return j({ success: false, error: result.reason, detail: result.detail }, 502);
        const { data, error } = await svc
          .from('commercial_call_briefs')
          .insert({
            prospect_id: prospectId,
            offer_id: body.offer_id ?? null,
            what_we_know: result.data.what_we_know,
            what_we_dont_know: result.data.what_we_dont_know,
            why_fit: result.data.why_fit,
            questions_to_ask: result.data.questions_to_ask,
            financial_assumptions_to_test: result.data.financial_assumptions_to_test,
            demonstration_path: result.data.demonstration_path,
            possible_objections: result.data.possible_objections,
            desired_next_step: result.data.desired_next_step,
            agent_run_id: result.runId,
          })
          .select()
          .single();
        if (error) return j({ error: error.message }, 500);
        return j({ success: true, call_brief: data });
      }

      case 'handle_objection': {
        const prospectId = String(body.prospect_id ?? '').trim();
        const objectionText = String(body.objection_text ?? '').trim();
        if (!prospectId || !objectionText) return j({ error: 'prospect_id and objection_text are required' }, 400);
        const foundation = await loadCurrentFoundation(svc);
        const result = await handleObjection({
          foundation,
          objectionText,
          offerSummary: body.offer_summary ?? null,
          adminUserId: user.id,
          requestId: req.headers.get('x-request-id'),
        });
        if (!result.ok) return j({ success: false, error: result.reason, detail: result.detail }, 502);
        const { data, error } = await svc
          .from('commercial_objection_responses')
          .insert({
            prospect_id: prospectId,
            offer_id: body.offer_id ?? null,
            objection_text: objectionText,
            interpretation: result.data.interpretation,
            unresolved: result.data.unresolved,
            clarifying_question: result.data.clarifying_question,
            response: result.data.response,
            evidence_used: result.data.evidence_used,
            unknowns: result.data.unknowns,
            recommended_next_step: result.data.recommended_next_step,
            insufficient_evidence: result.data.insufficient_evidence,
            agent_run_id: result.runId,
          })
          .select()
          .single();
        if (error) return j({ error: error.message }, 500);
        return j({ success: true, objection_response: data });
      }

      case 'draft_followup': {
        const prospectId = String(body.prospect_id ?? '').trim();
        const sequenceStep = body.sequence_step !== undefined ? Number(body.sequence_step) : null;
        const step = sequenceStep !== null ? SEQUENCE_STEPS[sequenceStep] : undefined;
        if (sequenceStep !== null && !step) return j({ error: `sequence_step must be one of ${Object.keys(SEQUENCE_STEPS).join(', ')}` }, 400);
        let stageContext = String(body.stage_context ?? '').trim();
        if (!prospectId || (!stageContext && !step)) return j({ error: 'prospect_id and stage_context (or sequence_step) are required' }, 400);

        const { data: prospectRow, error: prospectErr } = await svc
          .from('commercial_prospects')
          .select(PROSPECT_COLUMNS)
          .eq('id', prospectId)
          .single();
        if (prospectErr || !prospectRow) return j({ error: prospectErr?.message ?? 'prospect not found' }, 404);
        const row = prospectRow as ProspectRow;

        // Sequence steps 2+ only continue a conversation that has not been
        // answered: a reply, meeting, or terminal stage ends the cold sequence.
        if (step && row.stage !== 'contacted') {
          return j({ error: `sequence step ${sequenceStep} only applies to prospects in 'contacted' (currently '${row.stage}')` }, 409);
        }

        const suppression = await suppressionGate(svc, row, { ignoreRecentContact: !!step });
        if (suppression.suppressed) return j({ success: true, suppressed: true, reason_code: suppression.reasonCode });

        let previous = body.previous_interaction_summary ?? null;
        if (step) {
          const { data: prior } = await svc
            .from('commercial_followups')
            .select('draft, sequence_step')
            .eq('prospect_id', prospectId)
            .eq('status', 'sent')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          previous = previous ?? ((prior as { draft?: string } | null)?.draft ? `Last message sent:\n${(prior as { draft: string }).draft}` : null);
          stageContext = [
            `Cold sequence step ${sequenceStep} (day ${step.day} after first touch). No reply yet.`,
            step.brief,
            `Prospect: ${row.company_name}${row.segment ? ` (${row.segment})` : ''}. Recorded signals: ${signalsOf(row).join(' | ') || 'none'}.`,
            stageContext,
          ].filter(Boolean).join('\n');
        }

        const foundation = await loadCurrentFoundation(svc);
        const result = await draftFollowup({
          foundation,
          stageContext,
          previousInteractionSummary: previous,
          adminUserId: user.id,
          requestId: req.headers.get('x-request-id'),
        });
        if (!result.ok) return j({ success: false, error: result.reason, detail: result.detail }, 502);
        const sender = await senderIdentityFor(svc, row.campaign_id);
        const { data, error } = await svc
          .from('commercial_followups')
          .insert({
            prospect_id: prospectId,
            kind: 'followup',
            sequence_step: sequenceStep,
            stage_context: stageContext,
            draft: step ? composeOutboundEmail(result.data.draft, row.contact_name, sender) : result.data.draft,
            campaign_id: row.campaign_id,
            batch_id: row.batch_id,
            agent_run_id: result.runId,
          })
          .select()
          .single();
        if (error) return j({ error: error.message }, 500);
        return j({ success: true, followup: data, reasoning: result.data.reasoning, next_action: result.data.next_action });
      }

      // ── Campaigns / batches / bulk import ───────────────────────────────
      case 'create_campaign': {
        const name = String(body.name ?? '').trim();
        const senderIdentity = String(body.sender_identity ?? '').trim();
        if (!name) return j({ error: 'name is required' }, 400);
        if (!senderIdentity) return j({ error: 'sender_identity is required (name, title, company -- appended to every email)' }, 400);
        const dailyLimit = body.daily_limit ? Number(body.daily_limit) : null;
        const { data, error } = await svc
          .from('commercial_campaigns')
          .insert({
            owner_user_id: user.id,
            name,
            segment: body.segment ?? null,
            sender_identity: senderIdentity,
            daily_limit: dailyLimit && dailyLimit > 0 ? Math.floor(dailyLimit) : null,
            offer_id: body.offer_id ?? null,
            status: 'active',
            started_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) return j({ error: error.message }, 500);
        return j({ success: true, campaign: data });
      }

      case 'create_batch': {
        const campaignId = String(body.campaign_id ?? '').trim();
        if (!campaignId) return j({ error: 'campaign_id is required' }, 400);
        const { data: last } = await svc
          .from('commercial_batches')
          .select('batch_number')
          .eq('campaign_id', campaignId)
          .order('batch_number', { ascending: false })
          .limit(1)
          .maybeSingle();
        const { data, error } = await svc
          .from('commercial_batches')
          .insert({
            campaign_id: campaignId,
            batch_number: ((last as { batch_number?: number } | null)?.batch_number ?? 0) + 1,
            scheduled_date: body.scheduled_date ?? null,
          })
          .select()
          .single();
        if (error) return j({ error: error.message }, 500);
        return j({ success: true, batch: data });
      }

      case 'import_prospects': {
        const campaignId = String(body.campaign_id ?? '').trim();
        const batchId = String(body.batch_id ?? '').trim();
        const rows = Array.isArray(body.rows) ? body.rows : [];
        if (!campaignId || !batchId) return j({ error: 'campaign_id and batch_id are required' }, 400);
        if (rows.length === 0) return j({ error: 'rows is empty' }, 400);
        if (rows.length > 200) return j({ error: 'max 200 rows per import' }, 400);

        const { data: campaign } = await svc.from('commercial_campaigns').select('segment').eq('id', campaignId).maybeSingle();
        const campaignSegment = (campaign as { segment?: string | null } | null)?.segment ?? null;

        const { data: existingRaw } = await svc
          .from('commercial_prospects')
          .select('id, company_name, contact_channel, stage, suppression_status');
        const existing = (existingRaw ?? []) as Array<OtherProspectIdentity & { suppression_status?: string }>;
        const key = (c: string, ch: string | null) => (ch ?? '').trim().toLowerCase() || `company:${c.trim().toLowerCase()}`;
        const seen = new Set<string>();
        const skipped: Array<{ row: number; company_name: string; reason: string }> = [];
        const toInsert: Record<string, unknown>[] = [];

        rows.forEach((raw: Record<string, unknown>, i: number) => {
          const company = String(raw.company_name ?? '').trim();
          const channel = String(raw.contact_channel ?? raw.email ?? '').trim() || null;
          if (!company) { skipped.push({ row: i + 1, company_name: '', reason: 'missing company_name' }); return; }
          const k = key(company, channel);
          if (seen.has(k)) { skipped.push({ row: i + 1, company_name: company, reason: 'duplicate_in_import' }); return; }
          seen.add(k);
          const match = existing.find((e) => {
            const a = (e.contact_channel ?? '').trim().toLowerCase();
            if (channel && a) return a === channel.toLowerCase();
            return e.company_name.trim().toLowerCase() === company.toLowerCase();
          });
          if (match) {
            const suppressed = match.suppression_status && match.suppression_status !== 'active';
            skipped.push({ row: i + 1, company_name: company, reason: suppressed ? `suppressed:${match.suppression_status}` : `already_exists:${match.stage}` });
            return;
          }
          const signals = String(raw.signals ?? raw.observed_signals ?? '')
            .split(/\s*[|;]\s*/)
            .map((s) => s.trim())
            .filter(Boolean);
          toInsert.push({
            owner_user_id: user.id,
            company_name: company,
            contact_name: String(raw.contact_name ?? '').trim() || null,
            contact_role: String(raw.contact_role ?? raw.role ?? '').trim() || null,
            contact_channel: channel,
            website: String(raw.website ?? '').trim() || null,
            segment: String(raw.segment ?? '').trim() || campaignSegment,
            observed_signals: signals,
            campaign_id: campaignId,
            batch_id: batchId,
          });
        });

        let inserted: unknown[] = [];
        if (toInsert.length > 0) {
          const { data, error } = await svc.from('commercial_prospects').insert(toInsert).select('id, company_name, observed_signals');
          if (error) return j({ error: error.message }, 500);
          inserted = data ?? [];
        }
        const { count } = await svc.from('commercial_prospects').select('id', { count: 'exact', head: true }).eq('batch_id', batchId);
        await svc.from('commercial_batches').update({ lead_count: count ?? 0 }).eq('id', batchId);
        const noSignals = (inserted as Array<{ observed_signals: unknown }>).filter((r) => signalsOf(r).length === 0).length;
        return j({ success: true, inserted: inserted.length, skipped, missing_signals: noSignals });
      }

      case 'draft_first_touch': {
        const prospectId = String(body.prospect_id ?? '').trim();
        if (!prospectId) return j({ error: 'prospect_id is required' }, 400);
        const { data: row, error } = await svc.from('commercial_prospects').select(PROSPECT_COLUMNS).eq('id', prospectId).single();
        if (error || !row) return j({ error: error?.message ?? 'prospect not found' }, 404);
        const foundation = await loadCurrentFoundation(svc);
        const out = await draftFirstTouchFor(svc, row as ProspectRow, foundation, user.id, req.headers.get('x-request-id'));
        if (out.status === 'drafted') return j({ success: true, followup: out.followup });
        if (out.status === 'suppressed') return j({ success: true, suppressed: true, reason_code: out.detail });
        return j({ success: false, error: out.status, detail: out.detail }, out.status === 'rejected' ? 502 : 409);
      }

      case 'draft_batch_first_touch': {
        const batchId = String(body.batch_id ?? '').trim();
        if (!batchId) return j({ error: 'batch_id is required' }, 400);
        const limit = Math.min(Math.max(Number(body.limit ?? 15), 1), 25);
        const { data: rowsRaw, error } = await svc
          .from('commercial_prospects')
          .select(PROSPECT_COLUMNS)
          .eq('batch_id', batchId)
          .eq('stage', 'discovered')
          .order('created_at', { ascending: true });
        if (error) return j({ error: error.message }, 500);
        const foundation = await loadCurrentFoundation(svc);
        const results: Array<{ prospect_id: string; company_name: string; status: string; detail?: string }> = [];
        const queue = ((rowsRaw ?? []) as ProspectRow[]);
        let attempted = 0;
        // Small concurrency: keeps the whole call inside the edge-function
        // wall clock while not hammering the LLM gateway.
        const CONCURRENCY = 4;
        let idx = 0;
        async function worker() {
          while (idx < queue.length && attempted < limit) {
            const row = queue[idx++];
            const out = await draftFirstTouchFor(svc, row, foundation, user!.id, req.headers.get('x-request-id'));
            if (out.status !== 'already_drafted') attempted++;
            results.push({ prospect_id: row.id, company_name: row.company_name, status: out.status, detail: 'detail' in out ? out.detail : undefined });
          }
        }
        await Promise.all(Array.from({ length: CONCURRENCY }, worker));
        const remaining = queue.length - results.length;
        return j({ success: true, results, remaining });
      }

      case 'mark_sent': {
        const followupId = String(body.followup_id ?? '').trim();
        if (!followupId) return j({ error: 'followup_id is required' }, 400);
        const userScoped = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
        const { data, error } = await userScoped.rpc('mark_commercial_followup_sent', { _followup_id: followupId });
        if (error) return j({ error: error.message }, 400);
        return j({ success: true, followup: data });
      }

      case 'set_suppression': {
        const prospectId = String(body.prospect_id ?? '').trim();
        const status = String(body.suppression_status ?? '').trim();
        if (!prospectId || !SUPPRESSION_STATUSES.includes(status)) return j({ error: `prospect_id and suppression_status (${SUPPRESSION_STATUSES.join('|')}) are required` }, 400);
        const { data, error } = await svc.from('commercial_prospects').update({ suppression_status: status, updated_at: new Date().toISOString() }).eq('id', prospectId).select().single();
        if (error) return j({ error: error.message }, 500);
        return j({ success: true, prospect: data });
      }

      case 'record_reply': {
        const prospectId = String(body.prospect_id ?? '').trim();
        const replyClass = String(body.reply_class ?? '').trim();
        if (!prospectId || !REPLY_CLASSES.includes(replyClass)) return j({ error: `prospect_id and reply_class (${REPLY_CLASSES.join('|')}) are required` }, 400);
        const { data: row, error: rowErr } = await svc.from('commercial_prospects').select('id, stage, segment, campaign_id, batch_id').eq('id', prospectId).single();
        if (rowErr || !row) return j({ error: rowErr?.message ?? 'prospect not found' }, 404);
        const r = row as { id: string; stage: string; segment: string | null; campaign_id: string | null; batch_id: string | null };

        const { error: outErr } = await svc.from('commercial_outcomes').insert({
          prospect_id: prospectId,
          campaign_id: r.campaign_id,
          segment: r.segment,
          reply_class: replyClass,
          meeting_booked: body.meeting_booked === true,
          lost_reason: body.notes ?? null,
        });
        if (outErr) return j({ error: outErr.message }, 500);

        const userScoped = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
        let toStage: string | null = null;
        if (replyClass === 'unsubscribe' || replyClass === 'bounce') {
          await svc.from('commercial_prospects').update({ suppression_status: replyClass === 'bounce' ? 'hard_bounced' : 'unsubscribed' }).eq('id', prospectId);
          toStage = 'lost';
        } else if (replyClass === 'negative') {
          toStage = 'lost';
        } else if (['positive', 'neutral', 'objection'].includes(replyClass)) {
          toStage = body.meeting_booked === true ? 'call_planned' : 'replied';
        }
        if (toStage && toStage !== r.stage && !['won', 'lost', 'not_fit'].includes(r.stage)) {
          await userScoped.rpc('transition_prospect_stage', { _prospect_id: prospectId, _to_stage: toStage, _reason: `reply: ${replyClass}` });
        }
        if (r.batch_id && replyClass !== 'no_reply' && replyClass !== 'bounce') {
          const { data: b } = await svc.from('commercial_batches').select('reply_count, positive_reply_count, meeting_count').eq('id', r.batch_id).single();
          const bb = b as { reply_count: number; positive_reply_count: number; meeting_count: number } | null;
          if (bb) {
            await svc.from('commercial_batches').update({
              reply_count: bb.reply_count + 1,
              positive_reply_count: bb.positive_reply_count + (replyClass === 'positive' ? 1 : 0),
              meeting_count: bb.meeting_count + (body.meeting_booked === true ? 1 : 0),
            }).eq('id', r.batch_id);
          }
        }
        return j({ success: true, to_stage: toStage });
      }

      // Human approval firewall (spec section 13): the ONLY paths that move
      // a followup out of 'draft'. Never triggered by AI generation itself.
      case 'approve_followup': {
        const followupId = String(body.followup_id ?? '').trim();
        if (!followupId) return j({ error: 'followup_id is required' }, 400);
        // Re-check suppression at approval time: an unsubscribe/bounce
        // recorded after drafting must block the draft from going out.
        const { data: fu } = await svc.from('commercial_followups').select('prospect_id, batch_id').eq('id', followupId).maybeSingle();
        if (fu) {
          const { data: p } = await svc.from('commercial_prospects').select('suppression_status').eq('id', (fu as { prospect_id: string }).prospect_id).maybeSingle();
          const s = (p as { suppression_status?: string } | null)?.suppression_status ?? 'active';
          if (s !== 'active') return j({ error: `prospect is suppressed (${s}); cannot approve` }, 409);
        }
        const userScoped = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
        const { data, error } = await userScoped.rpc('approve_commercial_followup', { _followup_id: followupId });
        if (error) return j({ error: error.message }, 400);
        const batchId = (fu as { batch_id?: string | null } | null)?.batch_id;
        if (batchId) {
          const { data: b } = await svc.from('commercial_batches').select('approved_count').eq('id', batchId).single();
          if (b) await svc.from('commercial_batches').update({ approved_count: (b as { approved_count: number }).approved_count + 1 }).eq('id', batchId);
        }
        return j({ success: true, followup: data });
      }
      case 'reject_followup': {
        const followupId = String(body.followup_id ?? '').trim();
        if (!followupId) return j({ error: 'followup_id is required' }, 400);
        const userScoped = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
        const { data, error } = await userScoped.rpc('reject_commercial_followup', { _followup_id: followupId });
        if (error) return j({ error: error.message }, 400);
        return j({ success: true, followup: data });
      }

      case 'transition_stage': {
        const prospectId = String(body.prospect_id ?? '').trim();
        const toStage = String(body.to_stage ?? '').trim();
        if (!prospectId || !toStage) return j({ error: 'prospect_id and to_stage are required' }, 400);
        const userScoped = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
        const { data, error } = await userScoped.rpc('transition_prospect_stage', {
          _prospect_id: prospectId,
          _to_stage: toStage,
          _reason: body.reason ?? null,
        });
        if (error) return j({ error: error.message }, 400);
        return j({ success: true, prospect: data });
      }

      default:
        return j({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return j({ error: message }, 500);
  }
});
