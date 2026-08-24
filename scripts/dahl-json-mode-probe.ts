#!/usr/bin/env -S deno run --allow-net --allow-env
/**
 * Dahl JSON-mode capability probe.
 *
 * Root-cause tool for the 2026-08-24 canary incident: analyze-business's
 * main structured-extraction call (response_format: json_object,
 * max_tokens: 6000) got a real, successful (ok:true) response from Dahl's
 * MiniMaxAI/MiniMax-M2.7, but the content did not parse as JSON -- the
 * deterministic-fallback safety net correctly caught it and the analysis
 * completed with numbers-only output, but the AI narrative was lost for a
 * real admin user (see docs/OPEN_DEFECTS.json / ai_calls rows around
 * 2026-08-24T03:38-03:47 UTC).
 *
 * Per the integration spec's Phase 3: "Do not assume that OpenAI-compatible
 * means every OpenAI parameter or feature is supported... Add response-
 * format fields only after a live contract test proves they work." This
 * script IS that live contract test, run after the fact to characterize the
 * failure before re-enabling the canary.
 *
 * Never prints raw model output -- only length, a structural shape check,
 * JSON.parse success/failure, and finish_reason (to distinguish truncation
 * from a genuinely non-JSON response).
 *
 * Run with:
 *   DAHL_API_KEY=... deno run --allow-net --allow-env scripts/dahl-json-mode-probe.ts
 */
import { dahlChatCompletion, type DahlAlias } from "../supabase/functions/_shared/dahl-adapter.ts";

const ALL_ALIASES: DahlAlias[] = ["general", "long_reasoning", "fast_reasoning"];

function resolveAliasesToTest(): DahlAlias[] {
  const raw = Deno.env.get("DAHL_PROBE_ALIAS");
  if (raw === "general" || raw === "long_reasoning" || raw === "fast_reasoning") return [raw];
  return ALL_ALIASES; // default: test all three so results are directly comparable
}

// A deliberately realistic approximation of analyze-business's actual
// request shape: asks for a nested JSON object with several sections, at
// the same max_tokens budget as production, with response_format json_object.
const SYSTEM_PROMPT =
  "You are a business analysis assistant. Always respond with a single valid JSON object only -- no markdown fences, no commentary, no text before or after the JSON.";

const USER_PROMPT = `Produce a JSON object with this exact shape (fill in plausible example values):
{
  "executive_summary": "2-3 sentence summary",
  "swot": {"strengths": ["s1","s2","s3"], "weaknesses": ["w1","w2","w3"], "opportunities": ["o1","o2"], "threats": ["t1","t2"]},
  "competitive_advantages": "3-5 specific advantages",
  "operations": "operational model description",
  "launch_steps": [
    {"step": 1, "title": "Market Validation", "description": "description", "duration": "2-3 weeks", "cost": 1500},
    {"step": 2, "title": "Legal & Setup", "description": "description", "duration": "2-4 weeks", "cost": 3000},
    {"step": 3, "title": "Build MVP", "description": "description", "duration": "4-8 weeks", "cost": 10000},
    {"step": 4, "title": "Beta Launch", "description": "description", "duration": "2-4 weeks", "cost": 2000},
    {"step": 5, "title": "Marketing Launch", "description": "description", "duration": "4-6 weeks", "cost": 5000},
    {"step": 6, "title": "Scale Operations", "description": "description", "duration": "ongoing", "cost": 8000}
  ],
  "risks": [
    {"risk": "Market Competition Risk", "probability": "high", "impact": "high", "mitigation": "mitigation"},
    {"risk": "Customer Acquisition Risk", "probability": "medium", "impact": "high", "mitigation": "mitigation"},
    {"risk": "Operational Risk", "probability": "medium", "impact": "medium", "mitigation": "mitigation"},
    {"risk": "Financial Risk", "probability": "medium", "impact": "high", "mitigation": "mitigation"},
    {"risk": "Regulatory Risk", "probability": "low", "impact": "medium", "mitigation": "mitigation"}
  ]
}
Call this a specialty coffee shop analysis for Austin, TX. Fill every field with realistic, detailed content -- do not truncate or abbreviate any section.`;

function looksLikeJson(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith("{") && trimmed.endsWith("}");
}

function tryParse(text: string): { ok: true } | { ok: false; error: string } {
  try {
    JSON.parse(text);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown parse error" };
  }
}

/** Structural-only shape diagnostics -- classifies the first/last characters
 *  and detects a markdown code fence, WITHOUT ever including the actual
 *  characters or any other raw model text. This is what distinguishes
 *  "wrapped in ```json fences" from "truncated mid-object" from "prose
 *  before the JSON" without violating the no-raw-content-logging rule. */
function classifyChar(c: string | undefined): string {
  if (c === undefined) return "(empty)";
  if (c === "{" || c === "}" || c === "[" || c === "]") return `brace(${c})`;
  if (c === '"') return "quote";
  if (/\s/.test(c)) return "whitespace";
  if (/[a-zA-Z]/.test(c)) return "letter";
  if (/[0-9]/.test(c)) return "digit";
  if (c === "`") return "backtick";
  return "other-punctuation";
}

function shapeDiagnostics(text: string) {
  const trimmed = text.trim();
  return {
    startsWithMarkdownFence: /^```/.test(trimmed),
    endsWithMarkdownFence: /```\s*$/.test(trimmed),
    firstCharClass: classifyChar(trimmed[0]),
    lastCharClass: classifyChar(trimmed[trimmed.length - 1]),
    first10CharClasses: Array.from(trimmed.slice(0, 10)).map(classifyChar).join(","),
    last10CharClasses: Array.from(trimmed.slice(-10)).map(classifyChar).join(","),
  };
}

interface AliasOutcome {
  alias: DahlAlias;
  passed: boolean;
  summary: string;
}

async function probeOneAlias(alias: DahlAlias): Promise<AliasOutcome> {
  console.log(`\n=== Probing alias: ${alias} ===`);
  const start = Date.now();
  const result = await dahlChatCompletion({
    alias,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: USER_PROMPT },
    ],
    jsonMode: true,
    maxTokens: 6000,
    temperature: 0.2,
    // Deliberately longer than analyze-business's production 60s budget --
    // this probe exists to characterize each model's real latency, not to
    // simulate the exact production timeout. 120s gives a slow-but-working
    // model room to finish rather than reporting "timeout" when it might
    // have succeeded at 65s.
    timeoutMs: 120_000,
  });
  const wallMs = Date.now() - start;

  if (!result.ok) {
    console.log(`RESULT: dahl call failed at the transport level (wall: ${wallMs}ms)`);
    console.log(`kind: ${result.kind}`);
    console.log(`message: ${result.message}`);
    return { alias, passed: false, summary: `transport failure: ${result.kind}` };
  }

  const shapeOk = looksLikeJson(result.content);
  const parse = tryParse(result.content);

  console.log(`model: ${result.model}`);
  console.log(`finish_reason: ${result.finishReason ?? "(none)"}`);
  console.log(`content_length_chars: ${result.content.length}`);
  console.log(`input_tokens: ${result.inputTokens}`);
  console.log(`output_tokens: ${result.outputTokens}`);
  console.log(`latency_ms: ${result.latencyMs} (wall: ${wallMs}ms)`);
  console.log(`starts_and_ends_with_braces: ${shapeOk}`);
  console.log(`JSON.parse succeeded: ${parse.ok}`);
  if (!parse.ok) {
    console.log(`parse error: ${parse.error}`);
    const shape = shapeDiagnostics(result.content);
    console.log(`starts_with_markdown_fence: ${shape.startsWithMarkdownFence}`);
    console.log(`ends_with_markdown_fence: ${shape.endsWithMarkdownFence}`);
    console.log(`first_char_class: ${shape.firstCharClass}`);
    console.log(`last_char_class: ${shape.lastCharClass}`);
    console.log(`first_10_char_classes: ${shape.first10CharClasses}`);
    console.log(`last_10_char_classes: ${shape.last10CharClasses}`);
  }

  if (result.finishReason === "length") {
    console.log("DIAGNOSIS: response was truncated by max_tokens (finish_reason=length) -- a token-budget problem, not a JSON-mode support problem.");
  }

  if (parse.ok) {
    console.log(`PASSED (alias=${alias}): valid, parseable JSON, ${wallMs}ms wall time.`);
    return { alias, passed: true, summary: `ok, ${wallMs}ms, ${result.model}` };
  } else {
    console.log(`FAILED (alias=${alias}): did NOT return valid JSON.`);
    return { alias, passed: false, summary: `invalid JSON, ${wallMs}ms, ${result.model}` };
  }
}

async function main() {
  if (!Deno.env.get("DAHL_API_KEY")) {
    console.error("FAIL: DAHL_API_KEY is not set.");
    Deno.exit(1);
  }

  const aliases = resolveAliasesToTest();
  const outcomes: AliasOutcome[] = [];
  for (const alias of aliases) {
    // Sequential, not parallel: keeps token spend and rate-limit exposure
    // predictable, and makes per-alias log sections easy to read in CI.
    outcomes.push(await probeOneAlias(alias));
  }

  console.log("\n=== Summary (same request shape as analyze-business's production call) ===");
  for (const o of outcomes) {
    console.log(`${o.passed ? "PASS" : "FAIL"}  ${o.alias.padEnd(15)}  ${o.summary}`);
  }

  if (outcomes.every((o) => o.passed)) {
    console.log("\nALL ALIASES PASSED for this request shape.");
    Deno.exit(0);
  } else if (outcomes.some((o) => o.passed)) {
    console.log("\nPARTIAL: at least one alias handles this request shape reliably; others do not. Route this task type to a passing alias only.");
    Deno.exit(1);
  } else {
    console.log("\nALL ALIASES FAILED this request shape. Do not route this task type to Dahl until a fix (retry+repair, longer timeout, or a smaller/simpler schema) is verified.");
    Deno.exit(1);
  }
}

main();
