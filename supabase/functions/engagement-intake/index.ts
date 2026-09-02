import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

import { corsHeadersFor } from "../_shared/cors.ts";
import {
  getEngagementOfferByPaymentLinkId,
  paymentLinkIdFromSession,
  validateEngagementPayment,
} from "../_shared/engagement-offers.ts";

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store",
};

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req);
  const headers = { ...corsHeaders, ...securityHeaders, "Content-Type": "application/json" };

  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!stripeKey || !supabaseUrl || !serviceKey) throw new Error("Service is not configured");

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const sessionId = cleanText(body?.session_id, 255);
    if (!/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) {
      return new Response(JSON.stringify({ error: "invalid_session" }), { status: 400, headers });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paymentLinkId = paymentLinkIdFromSession(session.payment_link);
    const offer = getEngagementOfferByPaymentLinkId(paymentLinkId);
    if (!offer) {
      return new Response(JSON.stringify({ error: "invalid_session" }), { status: 404, headers });
    }

    const paymentValidation = validateEngagementPayment(offer, {
      amountTotal: session.amount_total,
      currency: session.currency,
      paymentStatus: session.payment_status,
    });
    if (!paymentValidation.ok) {
      return new Response(JSON.stringify({ error: "payment_not_confirmed" }), { status: 409, headers });
    }

    if (body?.action === "verify") {
      return new Response(JSON.stringify({
        verified: true,
        offer_code: offer.code,
        offer_name: offer.name,
        case_capacity: offer.caseCapacity,
        contact_email: session.customer_details?.email || session.customer_email || null,
      }), { status: 200, headers });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    if (body?.action === "workspace" || body?.action === "save_workspace") {
      const { data: engagement, error: engagementError } = await supabase
        .from("paid_engagements")
        .select("id,offer_code,engagement_type,contact_name,contact_email,company_name,decision_question,status,payment_status,intake_status,delivery_due_at,pilot_ends_at,case_capacity,cases_completed,workspace_status,workspace_data,workspace_updated_at")
        .eq("stripe_checkout_session_id", session.id)
        .maybeSingle();
      if (engagementError) throw engagementError;
      if (!engagement || engagement.payment_status !== "paid" || engagement.intake_status !== "complete") {
        return new Response(JSON.stringify({ error: "intake_required" }), { status: 409, headers });
      }

      const current = (engagement.workspace_data && typeof engagement.workspace_data === "object")
        ? engagement.workspace_data as Record<string, unknown>
        : {};
      if (body?.action === "workspace") {
        await supabase.from("paid_engagements")
          .update({ customer_last_active_at: new Date().toISOString() })
          .eq("id", engagement.id);
        return new Response(JSON.stringify({
          workspace: {
            engagement: {
              id: engagement.id,
              offer_code: engagement.offer_code,
              engagement_type: engagement.engagement_type,
              contact_name: engagement.contact_name,
              contact_email: engagement.contact_email,
              company_name: engagement.company_name,
              decision_question: engagement.decision_question,
              status: engagement.status,
              payment_status: engagement.payment_status,
              intake_status: engagement.intake_status,
              delivery_due_at: engagement.delivery_due_at,
              pilot_ends_at: engagement.pilot_ends_at,
              case_capacity: engagement.case_capacity,
              cases_completed: engagement.cases_completed,
              workspace_status: engagement.workspace_status,
              workspace_updated_at: engagement.workspace_updated_at,
            },
            data: current,
          },
        }), { status: 200, headers });
      }

      const incoming = body.workspace_data;
      if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
        return new Response(JSON.stringify({ error: "invalid_workspace" }), { status: 400, headers });
      }
      if (JSON.stringify(incoming).length > 24000) {
        return new Response(JSON.stringify({ error: "workspace_too_large" }), { status: 413, headers });
      }
      const source = incoming as Record<string, unknown>;
      const stage = ["intake", "briefing", "analysis", "review", "delivered", "closed"].includes(String(source.stage))
        ? String(source.stage) : String(current.stage || "briefing");
      const textArray = (value: unknown, maxItems: number, maxLength: number) =>
        Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, maxItems).map(v => v.trim().slice(0, maxLength)).filter(Boolean) : [];
      // Consultant cases carry their OWN assumptions/scenarios (each client
      // case is a separate model, per the offer's promise of independent
      // cases) -- sanitizeAssumptions/sanitizeScenarios are reused per-case
      // below, not just at the workspace's top level (which only the
      // founder_decision_review offer, with no cases, actually uses).
      const sanitizeAssumptions = (value: unknown) => Array.isArray(value) ? value.slice(0, 12).map(item => {
        const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return {
          label: cleanText(row.label, 160),
          value: cleanText(row.value, 240),
          type: ["fact", "estimate", "unknown"].includes(String(row.type)) ? String(row.type) : "unknown",
          source: cleanText(row.source, 300),
          confidence: ["high", "medium", "low"].includes(String(row.confidence)) ? String(row.confidence) : "medium",
          notes: cleanText(row.notes, 500),
        };
      }).filter(row => row.label) : [];
      const sanitizeScenarios = (value: unknown) => Array.isArray(value) ? value.slice(0, 3).map(item => {
        const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return {
          name: cleanText(row.name, 80),
          revenue: cleanText(row.revenue, 80),
          costs: cleanText(row.costs, 80),
          cash: cleanText(row.cash, 80),
          trigger: cleanText(row.trigger, 300),
          notes: cleanText(row.notes, 500),
        };
      }).filter(row => row.name) : [];
      const assumptions = sanitizeAssumptions(source.assumptions);
      const scenarios = sanitizeScenarios(source.scenarios);
      const rawCases = Array.isArray(source.cases) ? source.cases.slice(0, offer.caseCapacity).map(item => {
        const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return {
          case_name: cleanText(row.case_name, 160),
          client_type: cleanText(row.client_type, 300),
          decision_question: cleanText(row.decision_question, 1500),
          deadline: cleanText(row.deadline, 160),
          context: cleanText(row.context, 2000),
          status: ["not_started", "ready", "in_review", "delivered"].includes(String(row.status)) ? String(row.status) : "not_started",
          assumptions: sanitizeAssumptions(row.assumptions),
          scenarios: sanitizeScenarios(row.scenarios),
        };
      }).filter(row => row.case_name || row.decision_question) : [];
      const workspaceData = {
        version: 1,
        stage,
        decision_summary: cleanText(source.decision_summary, 1500),
        constraints: cleanText(source.constraints, 2000),
        assumptions,
        scenarios,
        questions: textArray(source.questions, 10, 500),
        action_items: textArray(source.action_items, 10, 500),
        cases: rawCases,
      };
      const { error: saveError } = await supabase.from("paid_engagements")
        .update({
          workspace_data: workspaceData,
          workspace_status: stage,
          workspace_updated_at: new Date().toISOString(),
          customer_last_active_at: new Date().toISOString(),
        })
        .eq("id", engagement.id);
      if (saveError) throw saveError;
      return new Response(JSON.stringify({ saved: true, data: workspaceData }), { status: 200, headers });
    }

    if (body?.action !== "submit" || body?.terms_accepted !== true) {
      return new Response(JSON.stringify({ error: "terms_required" }), { status: 400, headers });
    }

    const companyName = cleanText(body.company_name, 160);
    const decisionQuestion = cleanText(body.decision_question, 1500);
    const deadline = cleanText(body.deadline, 160);
    const clientType = cleanText(body.client_type, 300);
    const context = cleanText(body.context, 4000);
    if (!companyName || !decisionQuestion || (offer.code === "consultant_founding_pilot" && !clientType)) {
      return new Response(JSON.stringify({ error: "required_fields_missing" }), { status: 400, headers });
    }

    const stripeVerifiedEmail = session.customer_details?.email || session.customer_email || null;
    const preferredEmail = cleanText(body.contact_email, 200);
    // "Preferred contact email" from the intake form only OVERRIDES where we
    // reach out -- it never changes how the row is located (always by
    // stripe_checkout_session_id) or how payment identity is verified.
    if (!stripeVerifiedEmail && !preferredEmail) {
      return new Response(JSON.stringify({ error: "required_fields_missing" }), { status: 400, headers });
    }

    // Expanded intake fields (2026-09-02 launch-readiness pass). Kept out of
    // Stripe custom fields deliberately -- Stripe collects only payment
    // identity; this application is the system of record for engagement
    // content, per the launch-scope decision to not turn Stripe into a CRM.
    const intakeDetails = {
      deadline: deadline || null,
      client_type: clientType || null,
      context: context || null,
      website: cleanText(body.website, 200) || null,
      industry: cleanText(body.industry, 160) || null,
      current_situation: cleanText(body.current_situation, 2000) || null,
      financial_context: cleanText(body.financial_context, 2000) || null,
      what_tried: cleanText(body.what_tried, 1500) || null,
      assumptions: cleanText(body.assumptions, 1500) || null,
      desired_outcome: cleanText(body.desired_outcome, 1000) || null,
      document_links: cleanText(body.document_links, 1000) || null,
      additional_notes: cleanText(body.additional_notes, 2000) || null,
      preferred_contact_email: preferredEmail || null,
      // Founder Decision Review only
      founder_context: cleanText(body.founder_context, 1500) || null,
      primary_concern: cleanText(body.primary_concern, 1000) || null,
      specific_questions: cleanText(body.specific_questions, 1000) || null,
      followup_permitted: body.followup_permitted !== false,
      submitted_via: "session_bound_intake_v2",
    };

    const now = new Date();
    const deliveryDue = new Date(now.getTime() + offer.deliveryTargetHours * 60 * 60 * 1000);
    const pilotEndsAt = offer.pilotWindowDays
      ? new Date((session.created + offer.pilotWindowDays * 86_400) * 1000)
      : null;
    const contactEmail = preferredEmail || stripeVerifiedEmail;
    const contactName = session.customer_details?.name || contactEmail || "Paid customer";

    const { data: existing, error: existingError } = await supabase
      .from("paid_engagements")
      .select("substantive_work_started_at")
      .eq("stripe_checkout_session_id", session.id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.substantive_work_started_at) {
      return new Response(JSON.stringify({ error: "intake_locked" }), { status: 409, headers });
    }

    const { error } = await supabase.from("paid_engagements").upsert({
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
      offer_code: offer.code,
      engagement_type: offer.engagementType,
      contact_email: contactEmail,
      contact_name: contactName,
      price_usd: offer.expectedAmountMinor / 100,
      amount_paid_minor: offer.expectedAmountMinor,
      currency: offer.currency,
      payment_status: "paid",
      paid_at: new Date(session.created * 1000).toISOString(),
      status: "scheduled",
      case_capacity: offer.caseCapacity,
      cases_completed: 0,
      intake_status: "complete",
      intake_completed_at: now.toISOString(),
      terms_accepted_at: now.toISOString(),
      company_name: companyName,
      decision_question: decisionQuestion,
      delivery_target_hours: offer.deliveryTargetHours,
      delivery_due_at: deliveryDue.toISOString(),
      pilot_window_days: offer.pilotWindowDays,
      pilot_ends_at: pilotEndsAt?.toISOString() ?? null,
      intake_data: intakeDetails,
    }, { onConflict: "stripe_checkout_session_id" });

    if (error) throw error;

    // Owner notification (launch-readiness requirement): a completed paid
    // intake must never depend on the founder happening to check the
    // database. Best-effort -- a notification failure must never fail the
    // customer-facing response, since the engagement record above is
    // already the durable source of truth.
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const ownerEmail = Deno.env.get("OWNER_NOTIFICATION_EMAIL") || "jeltovbogdan@gmail.com";
    if (resendKey) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: "AIWMC Quantis <noreply@aiwmcquantis.com>",
            to: [ownerEmail],
            subject: `Paid intake complete: ${offer.name} — ${companyName}`,
            html: `<p>A paid engagement intake just completed.</p>
<ul>
<li><strong>Offer:</strong> ${offer.name} (${offer.code})</li>
<li><strong>Amount:</strong> $${(offer.expectedAmountMinor / 100).toFixed(2)}</li>
<li><strong>Company:</strong> ${companyName}</li>
<li><strong>Decision:</strong> ${decisionQuestion.slice(0, 300)}</li>
<li><strong>Contact:</strong> ${contactEmail ?? "(none provided)"}</li>
<li><strong>Delivery due:</strong> ${deliveryDue.toISOString()}</li>
<li><strong>Session:</strong> ${session.id}</li>
</ul>
<p>Open the admin workspace view to begin fulfillment.</p>`,
          }),
        });
      } catch (notifyErr) {
        console.error("engagement-intake owner notification failed", notifyErr instanceof Error ? notifyErr.message : String(notifyErr));
      }
    } else {
      console.error("engagement-intake: RESEND_API_KEY not configured — owner notification skipped");
    }

    return new Response(JSON.stringify({ submitted: true, offer_code: offer.code }), { status: 200, headers });
  } catch (error) {
    // Keep the public error generic; Stripe IDs and buyer details never enter logs.
    console.error("engagement-intake failed", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: "intake_unavailable" }), { status: 500, headers });
  }
});
