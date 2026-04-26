import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { corsHeadersFor } from '../_shared/cors.ts';
import { createLogger } from '../_shared/logger.ts';
import { getRequestId } from '../_shared/request-id.ts';

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL_GPT = "openai/gpt-5-mini";
const MODEL_GEMINI = "google/gemini-3-flash-preview";
const MODEL_TIMEOUT_MS = 25_000;

interface ModelCallResult {
  modelId: "gpt5-mini" | "gemini";
  rawOutput: string;
  parsedData: Record<string, unknown>;
  confidence: number;
  latencyMs: number;
  tokensUsed: number;
  timestamp: string;
}

const SYSTEM_PROMPT = `You are a precision financial analysis engine. Respond ONLY with valid JSON matching the provided schema. No prose, no markdown, no code blocks. Every numeric value must be accompanied by a confidence field (0–100). If data is insufficient for a calculation, return null for that field and include an 'insufficient_reason' string.`;

async function callModel(
  apiKey: string,
  model: string,
  modelId: "gpt5-mini" | "gemini",
  prompt: string,
  schema: Record<string, unknown>
): Promise<ModelCallResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);

  try {
    const toolDef = {
      type: "function" as const,
      function: {
        name: "analysis_output",
        description: "Return structured analysis matching the provided schema.",
        parameters: schema,
      },
    };

    const response = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        tools: [toolDef],
        tool_choice: { type: "function", function: { name: "analysis_output" } },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${model} returned ${response.status}: ${text}`);
    }

    const data = await response.json();
    const latencyMs = Date.now() - start;

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let parsedData: Record<string, unknown> = {};
    let rawOutput = "";

    if (toolCall?.function?.arguments) {
      rawOutput = toolCall.function.arguments;
      try {
        parsedData = JSON.parse(rawOutput);
      } catch {
        // Fallback: try message content
        const content = data.choices?.[0]?.message?.content || "";
        rawOutput = content;
        try {
          parsedData = JSON.parse(content);
        } catch {
          parsedData = {};
        }
      }
    } else {
      // No tool call, try content directly
      const content = data.choices?.[0]?.message?.content || "";
      rawOutput = content;
      try {
        parsedData = JSON.parse(content);
      } catch {
        parsedData = {};
      }
    }

    const tokensUsed =
      (data.usage?.prompt_tokens || 0) + (data.usage?.completion_tokens || 0);

    return {
      modelId,
      rawOutput,
      parsedData,
      confidence: typeof parsedData.confidence === "number" ? parsedData.confidence : 70,
      latencyMs,
      tokensUsed,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * Calculate numeric field agreement between two objects.
 * Returns { agreementScores, divergenceFields, consensusScore }
 */
function calculateConsensus(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): { consensusScore: number; divergenceFields: string[]; agreements: Record<string, number> } {
  const agreements: Record<string, number> = {};
  const divergenceFields: string[] = [];
  const numericKeys = new Set<string>();

  function collectNumericKeys(obj: Record<string, unknown>, prefix = "") {
    for (const [key, val] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof val === "number") {
        numericKeys.add(fullKey);
      } else if (val && typeof val === "object" && !Array.isArray(val)) {
        collectNumericKeys(val as Record<string, unknown>, fullKey);
      }
    }
  }

  collectNumericKeys(a);
  collectNumericKeys(b);

  function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce((o: unknown, k) => {
      if (o && typeof o === "object") return (o as Record<string, unknown>)[k];
      return undefined;
    }, obj);
  }

  for (const key of numericKeys) {
    const valA = getNestedValue(a, key);
    const valB = getNestedValue(b, key);
    if (typeof valA === "number" && typeof valB === "number") {
      const maxVal = Math.max(Math.abs(valA), Math.abs(valB), 1);
      const agreement = 1 - Math.abs(valA - valB) / maxVal;
      agreements[key] = Math.max(0, agreement);
      if (agreement < 0.7) {
        divergenceFields.push(key);
      }
    }
  }

  const scores = Object.values(agreements);
  const consensusScore = scores.length > 0
    ? (scores.reduce((s, v) => s + v, 0) / scores.length) * 100
    : 100; // No numeric fields = full agreement

  return { consensusScore: Math.round(consensusScore * 100) / 100, divergenceFields, agreements };
}

/**
 * Weighted merge: GPT 60%, Gemini 40%
 */
function weightedMerge(
  gpt: Record<string, unknown>,
  gemini: Record<string, unknown>,
  gptWeight = 0.6,
  geminiWeight = 0.4
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...gpt };

  function mergeDeep(target: Record<string, unknown>, source: Record<string, unknown>) {
    for (const [key, sourceVal] of Object.entries(source)) {
      const targetVal = target[key];
      if (typeof targetVal === "number" && typeof sourceVal === "number") {
        target[key] = targetVal * gptWeight + sourceVal * geminiWeight;
      } else if (
        targetVal && sourceVal &&
        typeof targetVal === "object" && typeof sourceVal === "object" &&
        !Array.isArray(targetVal) && !Array.isArray(sourceVal)
      ) {
        mergeDeep(targetVal as Record<string, unknown>, sourceVal as Record<string, unknown>);
      }
      // Non-numeric fields: keep GPT value (already in target)
    }
  }

  mergeDeep(result, gemini);
  return result;
}

serve(async (req) => {
  const reqId = getRequestId(req);
  const log = createLogger('ai-consensus', reqId);

  const corsHeaders = corsHeadersFor(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { prompt, schema, options } = await req.json();

    if (!prompt || !schema) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: prompt, schema" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const startTime = Date.now();
    const forceModel = options?.forceModel;

    let gptResult: ModelCallResult | null = null;
    let geminiResult: ModelCallResult | null = null;

    if (forceModel === "gpt") {
      gptResult = await callModel(LOVABLE_API_KEY, MODEL_GPT, "gpt5-mini", prompt, schema);
      geminiResult = { ...gptResult, modelId: "gemini", confidence: 0, rawOutput: "", parsedData: {} };
    } else if (forceModel === "gemini") {
      geminiResult = await callModel(LOVABLE_API_KEY, MODEL_GEMINI, "gemini", prompt, schema);
      gptResult = { ...geminiResult, modelId: "gpt5-mini", confidence: 0, rawOutput: "", parsedData: {} };
    } else {
      // Parallel dual-model call
      const [gptSettled, geminiSettled] = await Promise.allSettled([
        callModel(LOVABLE_API_KEY, MODEL_GPT, "gpt5-mini", prompt, schema),
        callModel(LOVABLE_API_KEY, MODEL_GEMINI, "gemini", prompt, schema),
      ]);

      if (gptSettled.status === "fulfilled") {
        gptResult = gptSettled.value;
      }
      if (geminiSettled.status === "fulfilled") {
        geminiResult = geminiSettled.value;
      }

      // Single-model fallback
      if (!gptResult && geminiResult) {
        gptResult = { ...geminiResult, modelId: "gpt5-mini", confidence: 0, rawOutput: "", parsedData: {} };
        log.warn("GPT model failed, using Gemini-only fallback");
      } else if (gptResult && !geminiResult) {
        geminiResult = { ...gptResult, modelId: "gemini", confidence: 0, rawOutput: "", parsedData: {} };
        log.warn("Gemini model failed, using GPT-only fallback");
      } else if (!gptResult && !geminiResult) {
        const gptErr = gptSettled.status === "rejected" ? gptSettled.reason : "unknown";
        const gemErr = geminiSettled.status === "rejected" ? geminiSettled.reason : "unknown";
        throw new Error(`Both models failed. GPT: ${gptErr}, Gemini: ${gemErr}`);
      }
    }

    // Calculate consensus
    const { consensusScore, divergenceFields, agreements } = calculateConsensus(
      gptResult!.parsedData,
      geminiResult!.parsedData
    );

    let consensusMethod: string;
    let finalOutput: Record<string, unknown>;

    if (consensusScore >= 90) {
      consensusMethod = "full_agreement";
      finalOutput = gptResult!.parsedData;
    } else if (consensusScore >= 70) {
      consensusMethod = "weighted_merge";
      finalOutput = weightedMerge(gptResult!.parsedData, geminiResult!.parsedData);
    } else if (consensusScore >= 50) {
      consensusMethod = "primary_wins";
      finalOutput = gptResult!.parsedData;
    } else {
      consensusMethod = "blocked";
      return new Response(
        JSON.stringify({
          error: "QE-007: Model consensus failure — outputs diverged beyond acceptable threshold",
          code: "QE-007",
          consensusScore,
          divergenceFields,
          gptResult,
          geminiResult,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const overallConfidence = Math.round(
      (gptResult!.confidence * 0.6 + geminiResult!.confidence * 0.4) * (consensusScore / 100)
    );

    const consensusResult = {
      gptResult,
      geminiResult,
      consensusScore,
      divergenceFields,
      finalOutput,
      overallConfidence,
      consensusMethod,
      processingMs: Date.now() - startTime,
      fieldAgreements: agreements,
    };

    return new Response(JSON.stringify(consensusResult), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    log.error("ai-consensus error:", err);

    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("429") ? 429 : message.includes("402") ? 402 : 500;

    return new Response(
      JSON.stringify({ error: message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
