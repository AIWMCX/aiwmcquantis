import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';
import { aiCall } from '../_shared/llm-call.ts';


import { maybeHealthResponse } from '../_shared/health.ts';
const FUNCTION_NAME = 'template-optimizer';
const FUNCTION_VERSION = '1.0.0';

const SIGNAL_WEIGHTS: Record<string, number> = {
  downloaded: 1,
  shared_link: 2,
  emailed_to_investor: 5,
  opened_by_third_party: 8,
  regenerated: -1,
  section_edited: -2,
  resulted_in_meeting: 10,
  invoice_paid: 10,
};

Deno.serve(async (req: Request) => {
  const __health = maybeHealthResponse(req, FUNCTION_NAME, FUNCTION_VERSION);
  if (__health) return __health;
  const reqId = getRequestId(req);
  const log = createLogger('template-optimizer', reqId);

  const corsHeaders = corsHeadersFor(req);
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

  const results: Array<{
    template_id: string;
    performance_score: number;
    avg_rating: number;
    total_signals: number;
    sample_size: number;
    improvement_triggered: boolean;
  }> = [];

  try {
    // Get all active templates
    const { data: templates, error: tplErr } = await supabase
      .from("doc_templates")
      .select("template_id, name")
      .eq("is_active", true);

    if (tplErr || !templates) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch templates", detail: tplErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const template of templates) {
      // Fetch performance signals for last 7 days
      // Match signals to template via document_id -> documents -> template_id
      // For simplicity, use signal_type filtering on all signals and match via context
      const { data: signals } = await supabase
        .from("doc_performance_signals")
        .select("signal_type, signal_value, context")
        .gte("created_at", sevenDaysAgo);

      // Filter signals related to this template (context may contain template_id)
      const templateSignals = (signals || []).filter((s) => {
        const ctx = s.context as Record<string, unknown> | null;
        return ctx?.template_id === template.template_id;
      });

      let performanceScore = 0;
      let ratingSum = 0;
      let ratingCount = 0;
      const sampleSize = templateSignals.length;

      for (const signal of templateSignals) {
        if (signal.signal_type === "rated_1_to_5") {
          const val = signal.signal_value ?? 0;
          performanceScore += val;
          ratingSum += val;
          ratingCount++;
        } else {
          const weight = SIGNAL_WEIGHTS[signal.signal_type] ?? 0;
          performanceScore += weight;
        }
      }

      const avgRating = ratingCount > 0 ? ratingSum / ratingCount : 5.0;
      const totalSignals = templateSignals.length;

      // Store nightly performance snapshot
      await supabase.from("template_performance_history").insert({
        template_id: template.template_id,
        performance_score: performanceScore,
        avg_rating: avgRating,
        total_signals: totalSignals,
        sample_size: sampleSize,
      });

      let improvementTriggered = false;

      // Check if improvement is needed
      if (avgRating < 4.0 && sampleSize >= 50) {
        // Get section_edited signals with context for improvement prompt
        const editedSignals = templateSignals
          .filter((s) => s.signal_type === "section_edited")
          .slice(0, 20);

        const editedSections = editedSignals.map((s) => {
          const ctx = s.context as Record<string, unknown> | null;
          return ctx?.section || "unknown section";
        });

        // Call Lovable AI for improvement suggestions
        try {
          const aiResult = await aiCall(
            {
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a document template quality analyst. Return structured improvement suggestions.",
                },
                {
                  role: "user",
                  content: `Template "${template.name}" (ID: ${template.template_id}) is rated ${avgRating.toFixed(1)}/5 based on ${sampleSize} signals. Users frequently edited these sections: ${JSON.stringify([...new Set(editedSections)])}. Suggest 3 specific improvements.`,
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "suggest_improvements",
                    description: "Return 3 specific template improvement suggestions.",
                    parameters: {
                      type: "object",
                      properties: {
                        suggestions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              section: { type: "string" },
                              issue: { type: "string" },
                              improvement: { type: "string" },
                              confidence: { type: "number", description: "0-100 confidence score" },
                            },
                            required: ["section", "issue", "improvement", "confidence"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["suggestions"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "suggest_improvements" } },
            },
            { task: 'template-optimizer', metadata: { template_id: template.template_id } },
          );

          if (aiResult.ok) {
            const choices = aiResult.data.choices as Array<{ message?: { tool_calls?: Array<{ function: { arguments: string } }> } }> | undefined;
            const toolCall = choices?.[0]?.message?.tool_calls?.[0];

            if (toolCall) {
              const parsed = JSON.parse(toolCall.function.arguments);
              const suggestions = parsed.suggestions || [];

              const avgConfidence =
                suggestions.reduce(
                  (sum: number, s: { confidence: number }) => sum + s.confidence,
                  0,
                ) / (suggestions.length || 1);

              await supabase.from("template_improvement_suggestions").insert({
                template_id: template.template_id,
                suggestion: suggestions,
                ai_confidence: avgConfidence,
                status: avgConfidence > 90 ? "pending" : "pending",
              });

              improvementTriggered = true;

              if (avgConfidence > 90) {
                await supabase.from("user_notifications").insert({
                  user_id: "00000000-0000-0000-0000-000000000000",
                  notification_type: "template_improvement",
                  title: `Template "${template.name}" needs attention`,
                  message: `AI suggested ${suggestions.length} improvements with ${avgConfidence.toFixed(0)}% confidence. Rating: ${avgRating.toFixed(1)}/5.`,
                  action_url: "/admin/templates",
                  action_label: "Review Suggestions",
                  icon: "⚡",
                });
              }
            }
          } else {
            log.error("AI gateway error:", aiResult.status, aiResult.error);
          }
        } catch (aiErr) {
          log.error("AI improvement suggestion failed:", aiErr);
        }
      }

      results.push({
        template_id: template.template_id,
        performance_score: performanceScore,
        avg_rating: avgRating,
        total_signals: totalSignals,
        sample_size: sampleSize,
        improvement_triggered: improvementTriggered,
      });
    }

    return new Response(
      JSON.stringify({
        templates_analyzed: results.length,
        improvements_triggered: results.filter((r) => r.improvement_triggered).length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    log.error("template-optimizer fatal:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
