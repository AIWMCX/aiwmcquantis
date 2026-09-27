// AIWMC Quantis — Commercial Ops workflow, Phase E (admin-only)
// ---------------------------------------------------------------------------
// The single HTTP entry point for every commercial-workflow stage built in
// Phase D/E: dispatches on `action`, calls the matching stage function in
// supabase/functions/_shared/commercial/stages/*.ts, persists the validated
// result, and returns it. No UI calls this yet (Phase F) -- this function
// IS the backend surface that Phase F will wire up to.
//
// Auth pattern matches content-studio-generate/index.ts exactly: Bearer
// token -> auth.getUser() -> user_roles admin check. Every write below uses
// the service-role client (RLS-bypassing), so the admin check here is the
// only gate -- get it right or this data is exposed.
// ---------------------------------------------------------------------------
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { CommercialFoundation } from '../_shared/commercial/contracts.ts';
import { generateOffer } from '../_shared/commercial/stages/offer.ts';
import { assessProspect } from '../_shared/commercial/stages/prospecting.ts';
import { prepareCallBrief } from '../_shared/commercial/stages/call-preparation.ts';
import { handleObjection } from '../_shared/commercial/stages/objection-handling.ts';
import { draftFollowup } from '../_shared/commercial/stages/follow-up.ts';
import { checkSuppression, type OtherProspectIdentity, type SuppressionProspect } from '../_shared/commercial-suppression.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

async function loadCurrentFoundation(svc: ReturnType<typeof createClient>): Promise<CommercialFoundation> {
  const { data, error } = await svc.rpc('get_commercial_foundation');
  if (error) throw new Error(`get_commercial_foundation failed: ${error.message}`);
  if (!data) throw new Error('no current commercial foundation exists');
  return CommercialFoundation.parse(data);
}

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
            segment: body.segment ?? null,
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
        const stageContext = String(body.stage_context ?? '').trim();
        if (!prospectId || !stageContext) return j({ error: 'prospect_id and stage_context are required' }, 400);

        // Deterministic suppression gate -- runs BEFORE any message drafting
        // (and therefore before any LLM call). Never guesses: a lookup
        // failure here is a hard error, not a silent "assume not suppressed".
        const { data: prospectRow, error: prospectErr } = await svc
          .from('commercial_prospects')
          .select('id, company_name, contact_channel, campaign_id, suppression_status, stage')
          .eq('id', prospectId)
          .single();
        if (prospectErr || !prospectRow) return j({ error: prospectErr?.message ?? 'prospect not found' }, 404);

        const suppressionSubject: SuppressionProspect = {
          id: prospectRow.id,
          company_name: prospectRow.company_name,
          contact_channel: prospectRow.contact_channel,
          suppression_status: prospectRow.suppression_status ?? 'active',
        };

        const [{ data: campaignSiblingsRaw }, { data: activeOppsRaw }, { data: lastContactedRow }] = await Promise.all([
          prospectRow.campaign_id
            ? svc
                .from('commercial_prospects')
                .select('id, company_name, contact_channel')
                .eq('campaign_id', prospectRow.campaign_id)
                .neq('id', prospectId)
            : Promise.resolve({ data: [] as OtherProspectIdentity[] }),
          svc
            .from('commercial_prospects')
            .select('id, company_name, contact_channel, stage')
            .eq('company_name', prospectRow.company_name)
            .neq('id', prospectId),
          svc
            .from('commercial_prospect_stage_history')
            .select('created_at')
            .eq('prospect_id', prospectId)
            .eq('to_stage', 'contacted')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const suppression = checkSuppression(suppressionSubject, {
          campaignSiblingProspects: (campaignSiblingsRaw ?? []) as OtherProspectIdentity[],
          activeOpportunityProspects: (activeOppsRaw ?? []) as OtherProspectIdentity[],
          lastContactedAt: lastContactedRow?.created_at ?? null,
        });

        if (suppression.suppressed) {
          // Record the suppression on the prospect's own history trail
          // (rather than letting it silently disappear from the funnel) --
          // a same-stage entry, not a fake transition: the funnel stage
          // itself is untouched, only the fact that an attempt was blocked
          // is now visible to anyone reviewing this prospect.
          await svc.from('commercial_prospect_stage_history').insert({
            prospect_id: prospectId,
            from_stage: prospectRow.stage,
            to_stage: prospectRow.stage,
            reason: `suppressed: ${suppression.reasonCode}`,
            changed_by: null,
          });
          return j({ success: true, suppressed: true, reason_code: suppression.reasonCode });
        }

        const foundation = await loadCurrentFoundation(svc);
        const result = await draftFollowup({
          foundation,
          stageContext,
          previousInteractionSummary: body.previous_interaction_summary ?? null,
          adminUserId: user.id,
          requestId: req.headers.get('x-request-id'),
        });
        if (!result.ok) return j({ success: false, error: result.reason, detail: result.detail }, 502);
        const { data, error } = await svc
          .from('commercial_followups')
          .insert({
            prospect_id: prospectId,
            stage_context: stageContext,
            draft: result.data.draft,
            agent_run_id: result.runId,
          })
          .select()
          .single();
        if (error) return j({ error: error.message }, 500);
        return j({ success: true, followup: data, reasoning: result.data.reasoning, next_action: result.data.next_action });
      }

      // Human approval firewall (spec section 13): the ONLY paths that move
      // a followup out of 'draft'. Never triggered by AI generation itself.
      case 'approve_followup': {
        const followupId = String(body.followup_id ?? '').trim();
        if (!followupId) return j({ error: 'followup_id is required' }, 400);
        const userScoped = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
        const { data, error } = await userScoped.rpc('approve_commercial_followup', { _followup_id: followupId });
        if (error) return j({ error: error.message }, 400);
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
