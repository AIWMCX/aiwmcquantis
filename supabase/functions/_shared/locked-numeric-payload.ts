/**
 * LockedNumericPayload — the frozen, hash-verifiable numeric core of one
 * completed analysis (item 11 of the reconciled architecture scope).
 *
 * Confirmed genuinely absent before this file was written: BusinessAnalysisResult
 * (src/types/analysis.ts) already serves as the "CanonicalResult" -- the one
 * true, extensively-consumed shape of a full analysis (financial + business
 * plan + marketing + confidence + validation). What did NOT exist: a strict,
 * versioned, immutable, hash-verifiable contract for the NARROW numeric core
 * that analysis-snapshot.ts persists and that scenario/comparison code needs
 * to trust hasn't silently drifted in shape between two "same" analyses.
 *
 * Before this, the exact fields that get snapshotted (see
 * analyze-business/index.ts's emitAnalysisSnapshot call site) were an ad-hoc
 * inline object literal with no type at all -- any caller could pass any
 * subset of fields, with no engine/formula-registry version embedded in the
 * hashed content itself, and no canonical rounding (meaning two functionally
 * identical analyses could hash differently purely from floating-point noise
 * in the 10th decimal place).
 *
 * A locked payload is tied to the PROCESS that produced it, not just its
 * values: engineVersion and formulaRegistryVersion are hashed as part of the
 * payload, so if the engine changes what it computes, the hash changes even
 * for numerically-coincidental output -- that's deliberate, not a bug.
 *
 * Usage:
 *   const payload = await lockNumericPayload(fields, ENGINE_VERSION, FORMULA_REGISTRY_VERSION);
 *   // payload.fields is deep-frozen; payload.hash is self-describing
 *   const ok = await verifyLockedPayloadIntegrity(payload); // true unless tampered
 */

/** The exact 14 fields already emitted at the one real call site in analyze-business/index.ts. */
export interface LockedNumericFields {
  mrr: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPercent: number;
  grossProfit: number;
  grossMarginPercent: number;
  cac: number;
  ltv: number;
  ltvCacRatio: number;
  paybackMonths: number;
  roiYear1Percent: number;
  npv3Years: number;
  breakEvenRevenue: number;
  revenueFor45kProfit: number;
}

export interface LockedNumericPayload {
  readonly engineVersion: string;
  readonly formulaRegistryVersion: string;
  readonly fields: Readonly<LockedNumericFields>;
  readonly hash: string;
}

const FIELD_ORDER: (keyof LockedNumericFields)[] = [
  "mrr", "totalExpenses", "netProfit", "netMarginPercent", "grossProfit", "grossMarginPercent",
  "cac", "ltv", "ltvCacRatio", "paybackMonths", "roiYear1Percent", "npv3Years",
  "breakEvenRevenue", "revenueFor45kProfit",
];

const DECIMAL_PLACES = 2;

/**
 * Canonical rounding for every field, matching the .toDecimalPlaces(2)
 * convention already established throughout src/financial/*.ts. Prevents
 * two functionally-identical analyses from hashing differently due to
 * floating-point noise (e.g. 1231.4999999997 vs 1231.5).
 */
function round(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`LockedNumericPayload: non-finite field value: ${value}`);
  }
  return Number(value.toFixed(DECIMAL_PLACES));
}

async function sha256Hex(canonicalString: string): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalString);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Deterministic, key-order-independent serialization: fixed FIELD_ORDER, canonical rounding. */
function canonicalize(fields: LockedNumericFields, engineVersion: string, formulaRegistryVersion: string): string {
  const orderedFields: Record<string, number> = {};
  for (const key of FIELD_ORDER) {
    orderedFields[key] = round(fields[key]);
  }
  return JSON.stringify({ engineVersion, formulaRegistryVersion, fields: orderedFields });
}

function deepFreeze<T>(value: T): Readonly<T> {
  Object.freeze(value);
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      if (v && typeof v === "object" && !Object.isFrozen(v)) deepFreeze(v);
    }
  }
  return value;
}

/**
 * Freezes a raw numeric-fields object into a LockedNumericPayload: canonical
 * rounding, embedded process versioning, a self-describing content hash, and
 * runtime immutability (Object.freeze, not just a TypeScript `readonly`
 * annotation that a caller could still mutate through).
 */
export async function lockNumericPayload(
  fields: LockedNumericFields,
  engineVersion: string,
  formulaRegistryVersion: string,
): Promise<LockedNumericPayload> {
  const roundedFields = {} as LockedNumericFields;
  for (const key of FIELD_ORDER) {
    roundedFields[key] = round(fields[key]);
  }
  const hash = await sha256Hex(canonicalize(fields, engineVersion, formulaRegistryVersion));
  const payload: LockedNumericPayload = {
    engineVersion,
    formulaRegistryVersion,
    fields: deepFreeze(roundedFields),
    hash,
  };
  return deepFreeze(payload);
}

/**
 * Recomputes the hash from a payload's own fields/versions and compares
 * against payload.hash. Returns false if the payload was tampered with
 * after being locked (e.g. round-tripped through storage that doesn't
 * preserve exact field values) -- never throws on a mismatch, mirroring
 * this module's own no-fabricated-status conventions.
 *
 * Rejects BEFORE hashing if any field is non-finite or not already in
 * canonical 2dp form (i.e. round(value) !== value). Without this check, a
 * payload could be hand-constructed (bypassing lockNumericPayload()
 * entirely) with a sub-cent-precision field value paired with a hash
 * recomputed over that same non-canonical value -- verification would
 * pass even though the payload was never actually built through honest
 * canonical rounding. This check catches that: it's not enough for the
 * hash to match the fields, the fields must also already BE canonical.
 */
export async function verifyLockedPayloadIntegrity(payload: LockedNumericPayload): Promise<boolean> {
  for (const key of FIELD_ORDER) {
    const value = payload.fields[key];
    if (!Number.isFinite(value)) return false;
    if (round(value) !== value) return false;
  }
  const recomputedHash = await sha256Hex(
    canonicalize(payload.fields, payload.engineVersion, payload.formulaRegistryVersion),
  );
  return recomputedHash === payload.hash;
}
