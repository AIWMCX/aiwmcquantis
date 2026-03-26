import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { industry } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are AIWMC Quantis, an AI financial pre-mortem engine. Generate ONE specific, non-generic business idea for the given industry that is financially calculable and currently underserved. You must respond using the suggest_idea tool.",
            },
            {
              role: "user",
              content: `Generate a specific, financially-viable ${industry} business idea that can be accurately stress-tested. It must be specific enough to calculate break-even, not a generic concept.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "suggest_idea",
                description:
                  "Return a specific business idea with financial parameters",
                parameters: {
                  type: "object",
                  properties: {
                    idea: {
                      type: "string",
                      description: "One-sentence specific concept",
                    },
                    differentiator: {
                      type: "string",
                      description: "The specific financial or market edge",
                    },
                    startingCapital: { type: "number" },
                    pricePerCustomer: { type: "number" },
                    customersAtLaunch: { type: "number" },
                    monthlyOpCosts: { type: "number" },
                    estimatedBreakEven: {
                      type: "number",
                      description: "Months to break even",
                    },
                    estimatedRevM12: {
                      type: "number",
                      description: "Revenue at month 12",
                    },
                    riskNote: {
                      type: "string",
                      description: "One key risk to model",
                    },
                  },
                  required: [
                    "idea",
                    "differentiator",
                    "startingCapital",
                    "pricePerCustomer",
                    "customersAtLaunch",
                    "monthlyOpCosts",
                    "estimatedBreakEven",
                    "estimatedRevM12",
                    "riskNote",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "suggest_idea" },
          },
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-idea error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
