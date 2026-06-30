// ============================================================================
// QOC Stage: PREFLIGHT (lineage: D5)
// ----------------------------------------------------------------------------
// Runs BEFORE anything costs money. Three jobs:
//   1. Hard-block abusive / out-of-scope requests.
//   2. Classify sector for benchmark routing.
//   3. Validate inputs, count present fields, assign confidence band.
//
// HARDENING:
//   F-3/F-13: injection guard now normalizes whitespace + strips zero-width
//     chars (double-space bypass fixed); scans all free-text fields, not just
//     `idea` (industry/location also reach the narrate layer).
//   F-4: LEGIT_CONTEXT allowlist prevents false-positives on legitimate
//     AML/KYC compliance, anti-trafficking, and RegTech businesses.
//   F-14: confidence band now gated by sector resolution — unknown/weak sector
//     caps band at "medium" regardless of field count.
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

// --- Hard-block patterns (F-3: normalized whitespace + verb/anchor variants) --
const INJECTION_PATTERNS: RegExp[] = [
  /\b(ignore|disregard|forget|override|bypass)\b[\s\S]{0,40}\b(all|any|the|these|those|above|prior|previous|earlier|preceding|system|your)?[\s\S]{0,20}\b(instruction|prompt|rule|guardrail|direction|context)/i,
  /\byou are now\b/i,
  /\bsystem prompt\b/i,
  /\bact as\b[\s\S]{0,40}\b(unfiltered|jailbroken|dan|developer mode|no rules)\b/i,
  /\b(reveal|print|show|repeat|leak)\b[\s\S]{0,30}\b(system|hidden|initial|developer)\b[\s\S]{0,12}\bprompt/i,
  /\bpretend\b[\s\S]{0,30}\b(no|without)\b[\s\S]{0,20}\b(rules|restrictions|guardrails)/i,
];

// Out-of-scope: refuses to lend engine credibility to illicit enterprises.
const OUT_OF_SCOPE_PATTERNS: RegExp[] = [
  /\b(weapons?|firearm|explosive|bioweapon)\s+(manufactur|traffick|synthesi)/i,
  /\b(drug|narcotic|fentanyl|meth)\s+(synthesi|manufactur|traffick)/i,
  /\bhuman\s+traffick/i,
  /\bmoney\s+launder/i,
];

// F-4: patterns above match an ACTIVITY, not an INTENT. A legitimate RegTech /
// safety / compliance business legitimately contains these words. If the scan
// text shows a defensive/compliance framing, we do NOT hard-block — the
// financial verdict still flows. A genuinely illicit core has no such framing.
const LEGIT_CONTEXT = new RegExp(
  [
    "anti[-\\s]?", "counter[-\\s]?", "\\baml\\b", "\\bkyc\\b", "compliance",
    "regulat", "detect", "prevent", "protect", "combat", "report(ing)?",
    "screening", "monitor", "fraud", "safeguard", "victim", "rescue",
    "awareness", "ngo|non[-\\s]?profit|charity|nonprofit", "law\\s?enforce",
  ].join("|"),
  "i",
);

// F-3/F-13: scan all free-text fields that reach the narrate layer, not only
// `idea`. Normalize whitespace and strip zero-width chars first so
// "ignore  previous  instructions" (double-space) and similar bypasses fail.
const FREE_TEXT_FIELDS = ["idea", "location", "industry"] as const;

function normalizeForScan(s: string): string {
  return String(s)
    .replace(/[​-‍﻿]/g, "") // zero-width chars
    .replace(/\s+/g, " ")
    .trim();
}

function freeTextScan(req: AnalysisRequest): string {
  return normalizeForScan(
    FREE_TEXT_FIELDS.map((k) => (req[k] == null ? "" : String(req[k]))).join(" "),
  );
}

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

  // 2) Hard-block: scan all free-text fields, with normalized whitespace (F-3/F-13).
  const scan = freeTextScan(req);

  for (const rx of INJECTION_PATTERNS) {
    if (rx.test(scan)) {
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
    if (rx.test(scan) && !LEGIT_CONTEXT.test(scan)) {
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

  // F-14: confidence band gated by sector resolution. A request with 8 fields
  // but an unknown/weak sector (benchmark routing can't resolve) was previously
  // stamped "very_high" — wrong, as the band the product sells on can't be
  // inflated by unresolvable sector. Cap at "medium" when sector is weak.
  const BAND_ORDER: ConfidenceBand[] = ["very_low", "low", "medium", "high", "very_high"];
  function capBand(b: ConfidenceBand, cap: ConfidenceBand): ConfidenceBand {
    return BAND_ORDER.indexOf(b) <= BAND_ORDER.indexOf(cap) ? b : cap;
  }
  let band = bandFor(present);
  const sectorWeak = sector === "unknown" || conf < 0.4;
  if (sectorWeak) band = capBand(band, "medium");

  const result: PreflightResult = {
    ok: true,
    sector,
    sector_confidence: conf,
    fields_present: present,
    confidence_band: band,
    hard_block: false,
    imputations,
  };

  const notes: string[] = [];
  if (sector === "unknown") notes.push("Sector unresolved; using US national T2 average.");
  if (sectorWeak && bandFor(present) !== band) {
    notes.push("Confidence band capped: sector could not be resolved with confidence.");
  }
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
