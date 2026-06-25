// ============================================================================
// QOC Stage: PREFLIGHT (lineage: D5)
// ----------------------------------------------------------------------------
// Runs BEFORE anything costs money. Three jobs:
//   1. Hard-block abusive / out-of-scope requests (prompt injection, weaponized
//      misuse of the narration layer) -> short-circuit, $0, audit row written.
//   2. Classify sector for benchmark routing.
//   3. Validate inputs, count present fields, assign a confidence band, and
//      record every imputation so the report can label low-confidence numbers.
//
// This stage NEVER computes a financial number. It only gates and labels.
// Target overhead: < 50ms (pure CPU, no network).
// ============================================================================

import type {
  AnalysisRequest,
  ConfidenceBand,
  PreflightResult,
  Sector,
  StageTrace,
} from "./types.ts";

// --- Hard-block patterns -----------------------------------------------------
// Defensive only. These target attempts to subvert the NARRATION layer (the
// only place untrusted text meets a model). The deterministic engine is pure
// math and not promptable, so this is a focused, not paranoid, list.
const INJECTION_PATTERNS: RegExp[] = [
  /ignore (all|any|previous|prior) instructions/i,
  /you are now\b/i,
  /system prompt\b/i,
  /disregard (the|your) (rules|guardrails|system)/i,
  /\bact as\b.*\b(unfiltered|jailbroken|DAN)\b/i,
  /reveal (your|the) (system|hidden) prompt/i,
];

// Out-of-scope misuse: Quantis analyzes legal businesses. We refuse to lend the
// engine's credibility to plans whose core IS an illegal/violent enterprise.
const OUT_OF_SCOPE_PATTERNS: RegExp[] = [
  /\b(weapons?|firearm|explosive|bioweapon)\s+(manufactur|traffick|synthesi)/i,
  /\b(drug|narcotic|fentanyl|meth)\s+(synthesi|manufactur|traffick)/i,
  /\bhuman\s+traffick/i,
  /\bmoney\s+launder/i,
];

const SECTOR_KEYWORDS: Array<[Sector, RegExp]> = [
  ["saas_software", /\b(app|software|platform|saas|subscription|api|web app)\b/i],
  ["food_beverage", /\b(restaurant|food|caf[eé]|kitchen|catering|bakery|bar)\b/i],
  ["professional_services", /\b(consult|agency|freelance|advisory|bookkeep|legal)\b/i],
  ["retail_ecommerce", /\b(e-?commerce|online store|dtc|shop|retail|marketplace)\b/i],
  ["healthcare", /\b(clinic|medical|dental|therapy|health\s?care|pharma)\b/i],
  ["construction", /\b(construction|contracting|hvac|plumbing|roofing|electrician)\b/i],
  ["real_estate", /\b(real estate|property|rental|airbnb|landlord|lease)\b/i],
  ["health_fitness", /\b(gym|fitness|yoga|wellness|pilates|crossfit)\b/i],
  ["education", /\b(course|tutoring|training|school|edtech|bootcamp|coaching)\b/i],
];

const FIELD_KEYS = [
  "idea",
  "location",
  "industry",
  "revenue",
  "price",
  "customers",
  "operating_costs",
  "cac",
  "churn_rate",
  "initial_investment",
] as const;

function classifySector(req: AnalysisRequest): { sector: Sector; conf: number } {
  const hay = `${req.idea ?? ""} ${req.industry ?? ""}`.toLowerCase();
  const hits: Array<[Sector, number]> = [];
  for (const [sector, rx] of SECTOR_KEYWORDS) {
    const m = hay.match(new RegExp(rx, "gi"));
    if (m) hits.push([sector, m.length]);
  }
  if (hits.length === 0) return { sector: "unknown", conf: 0 };
  hits.sort((a, b) => b[1] - a[1]);
  const top = hits[0][1];
  const second = hits[1]?.[1] ?? 0;
  // Confidence = separation between top and runner-up, normalized.
  const conf = Math.min(1, top / (top + second + 1) + 0.25);
  return { sector: hits[0][0], conf: Number(conf.toFixed(2)) };
}

function bandFor(fieldsPresent: number): ConfidenceBand {
  if (fieldsPresent >= 8) return "very_high";
  if (fieldsPresent >= 6) return "high";
  if (fieldsPresent >= 4) return "medium";
  if (fieldsPresent >= 2) return "low";
  return "very_low";
}

export function preflight(req: AnalysisRequest, now: () => number): {
  result: PreflightResult;
  trace: StageTrace;
} {
  const started = now();

  // 1) Idea is mandatory.
  if (!req.idea || req.idea.trim().length < 3) {
    const result: PreflightResult = {
      ok: false,
      reject_reason: "missing_business_idea",
      sector: "unknown",
      sector_confidence: 0,
      fields_present: 0,
      confidence_band: "very_low",
      hard_block: false,
      imputations: [],
    };
    return { result, trace: finalize("FAIL", started, now, { result }, ["Business idea is required."]) };
  }

  const idea = String(req.idea);
  const loc = typeof req.location === "string" ? req.location : "";

  // 1b) Input length caps (idea ≤ 20 000 chars, location ≤ 200 chars).
  if (idea.length > 20_000 || loc.length > 200) {
    const field = idea.length > 20_000 ? "idea" : "location";
    const limit = field === "idea" ? 20_000 : 200;
    const actual = field === "idea" ? idea.length : loc.length;
    const result: PreflightResult = {
      ok: false,
      reject_reason: "input_too_long",
      sector: "unknown",
      sector_confidence: 0,
      fields_present: 0,
      confidence_band: "very_low",
      hard_block: false,
      imputations: [],
    };
    return {
      result,
      trace: finalize("FAIL", started, now, { result, field, limit, actual }, [
        `${field} is ${actual.toLocaleString()} chars (max ${limit.toLocaleString()}).`,
      ]),
    };
  }

  // 2) Hard-block (injection or out-of-scope).
  for (const rx of INJECTION_PATTERNS) {
    if (rx.test(idea)) {
      const result: PreflightResult = {
        ok: false,
        sector: "unknown",
        sector_confidence: 0,
        fields_present: 0,
        confidence_band: "very_low",
        hard_block: true,
        hard_block_reason: "prompt_injection_detected",
        imputations: [],
      };
      return { result, trace: finalize("HARD_BLOCK", started, now, { result }, ["Input contained instruction-injection patterns."]) };
    }
  }
  for (const rx of OUT_OF_SCOPE_PATTERNS) {
    if (rx.test(idea)) {
      const result: PreflightResult = {
        ok: false,
        sector: "unknown",
        sector_confidence: 0,
        fields_present: 0,
        confidence_band: "very_low",
        hard_block: true,
        hard_block_reason: "out_of_scope_enterprise",
        imputations: [],
      };
      return { result, trace: finalize("HARD_BLOCK", started, now, { result }, ["Idea describes an out-of-scope (illicit) enterprise."]) };
    }
  }

  // 3) Field census + imputations.
  const imputations: PreflightResult["imputations"] = [];
  let present = 0;
  for (const k of FIELD_KEYS) {
    const v = req[k];
    const has = v !== undefined && v !== null && String(v).trim() !== "";
    if (has) present++;
    else if (k !== "idea") {
      imputations.push({ field: k, reason: `imputed_from_sector_benchmark` });
    }
  }

  const { sector, conf } = classifySector(req);

  const result: PreflightResult = {
    ok: true,
    sector,
    sector_confidence: conf,
    fields_present: present,
    confidence_band: bandFor(present),
    hard_block: false,
    imputations,
  };

  const notes: string[] = [];
  if (sector === "unknown") notes.push("Sector unresolved; using US national T2 average.");
  if (present < 4) notes.push("Low input completeness; several figures imputed from sector benchmarks.");

  return { result, trace: finalize("PASS", started, now, { result }, notes) };
}

function finalize(
  verdict: StageTrace["verdict"],
  started: number,
  now: () => number,
  detail: Record<string, unknown>,
  notes: string[],
): StageTrace {
  return {
    stage: "preflight",
    verdict,
    started_at: started,
    duration_ms: now() - started,
    cost_usd: 0,
    detail,
    notes,
  };
}
