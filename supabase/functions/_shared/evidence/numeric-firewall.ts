/**
 * Quantis Evidence Service — Numeric Observation Firewall (PR E4).
 *
 * Master prompt section 15 (the load-bearing section) and section 31's
 * numeric fidelity test, implemented literally: "$24.60 in 2025" must be
 * accepted as OBSERVED with value=24.60/period=2025/unit as given, and the
 * system must REJECT (never silently accept as OBSERVED) $26, $24.06,
 * "$24.60/month" when the source said "/hour", or "$24.60 current-year"
 * when the source said 2025.
 *
 * "No numeric value may become a trusted evidence observation unless it is
 * directly observed from a source" (section 15) is enforced here as an
 * actual gate, not a policy statement: `classifyObservation` never returns
 * OBSERVED unless the exact value string round-trips against digits
 * actually present in the passage text. An LLM may PROPOSE a candidate
 * value extracted from a passage, but this module -- not the LLM -- is
 * what decides whether it is trustworthy enough to be labeled OBSERVED.
 */
import type { NumericObservationStatus } from './types.ts';

/** Strips currency symbols, thousands separators, and whitespace, keeping only digits and one decimal point. */
export function normalizeNumberString(raw: string): string {
  const cleaned = raw
    .replace(/[$€£¥,]/g, '')
    .replace(/\s+/g, '')
    .trim();
  return cleaned;
}

/**
 * Extracts every numeric token from free text, normalized the same way as
 * `normalizeNumberString`, so a candidate value can be checked for
 * presence without caring about the surrounding currency symbol or
 * thousands separators the passage happened to use.
 */
export function extractNumbersFromText(text: string): string[] {
  const matches = text.match(/[$€£¥]?\d[\d,]*(?:\.\d+)?%?/g) ?? [];
  return matches.map((m) => normalizeNumberString(m.replace(/%$/, '')));
}

export interface NumericFirewallResult {
  status: NumericObservationStatus;
  reason: string;
}

export interface ClassifyObservationInput {
  /** The exact value the caller wants to record, e.g. "24.60". */
  proposedValue: string;
  /** The exact unit the caller wants to record, e.g. "USD/hour". */
  proposedUnit: string;
  /** The exact period the caller wants to record, if any, e.g. "2025". */
  proposedPeriod?: string;
  /** The full text of the passage this observation is supposedly drawn from. */
  passageText: string;
  /** Non-empty when the value is a local calculation over other observations, not read directly. */
  transformationIds?: string[];
  /** Caller explicitly marking this as a non-observed estimate (e.g. an LLM guess with no source). */
  explicitlyEstimate?: boolean;
}

const UNIT_PERIOD_SYNONYMS: Record<string, string[]> = {
  hour: ['hour', 'hourly', 'per hour', '/hr'],
  day: ['day', 'daily', 'per day'],
  week: ['week', 'weekly', 'per week'],
  month: ['month', 'monthly', 'per month'],
  quarter: ['quarter', 'quarterly', 'per quarter'],
  year: ['year', 'yearly', 'annual', 'annually', 'per year', 'per annum'],
};

/**
 * Extracts a "per-X" time-period component from a unit string like
 * "USD/hour" or "USD per month", if present.
 */
function extractUnitPeriod(unit: string): string | null {
  const slashMatch = unit.match(/\/\s*(hour|day|week|month|quarter|year)/i);
  if (slashMatch) return slashMatch[1].toLowerCase();
  const perMatch = unit.match(/\bper\s+(hour|day|week|month|quarter|year)/i);
  if (perMatch) return perMatch[1].toLowerCase();
  return null;
}

/**
 * If the proposed unit claims a specific time period (e.g. "/hour"), the
 * passage text must actually say so -- this is what catches the master
 * prompt's exact "$24.60/month" rejection case when the source said
 * "/hour": the VALUE matches, but the claimed unit period does not appear
 * in the source, so it must not be accepted as OBSERVED.
 */
function unitPeriodMatchesPassage(unit: string, passageText: string): boolean {
  const period = extractUnitPeriod(unit);
  if (!period) return true; // Unit carries no checkable period claim.
  const synonyms = UNIT_PERIOD_SYNONYMS[period] ?? [period];
  const lowerPassage = passageText.toLowerCase();
  return synonyms.some((s) => lowerPassage.includes(s));
}

/**
 * The firewall's core decision. Never trust the caller's claimed status --
 * derive it from the actual evidence.
 */
export function classifyObservation(input: ClassifyObservationInput): NumericFirewallResult {
  if (input.explicitlyEstimate) {
    return { status: 'ESTIMATE', reason: 'Caller explicitly marked this as an estimate, not a source observation.' };
  }

  if (input.transformationIds && input.transformationIds.length > 0) {
    // A transformed value (e.g. a computed ratio of two other observations)
    // cannot be checked against passage text directly -- its integrity
    // depends on the inputs it was transformed from, which is the
    // caller's responsibility to have already validated as OBSERVED or
    // TRANSFORMED themselves before referencing them here.
    return { status: 'TRANSFORMED', reason: 'Derived via a registered transformation over other observations.' };
  }

  const normalizedProposed = normalizeNumberString(input.proposedValue);
  if (!normalizedProposed || Number.isNaN(Number(normalizedProposed))) {
    return { status: 'ESTIMATE', reason: 'Proposed value is not a valid number.' };
  }

  const passageNumbers = extractNumbersFromText(input.passageText);
  const valuePresent = passageNumbers.includes(normalizedProposed);

  if (!valuePresent) {
    return {
      status: 'ESTIMATE',
      reason: `Value "${input.proposedValue}" (normalized "${normalizedProposed}") does not appear verbatim in the passage text -- rejecting as OBSERVED to prevent silent transcription drift (rounding, unit confusion, or fabrication).`,
    };
  }

  if (input.proposedPeriod) {
    const periodPresent = input.passageText.includes(input.proposedPeriod);
    if (!periodPresent) {
      return {
        status: 'ESTIMATE',
        reason: `Value is present but the claimed period "${input.proposedPeriod}" does not appear in the passage text -- the number may be attributed to the wrong period.`,
      };
    }
  }

  if (!unitPeriodMatchesPassage(input.proposedUnit, input.passageText)) {
    return {
      status: 'ESTIMATE',
      reason: `Value is present but the claimed unit "${input.proposedUnit}" implies a time period the passage text does not corroborate -- the value may be attributed to the wrong unit period (e.g. hourly vs. monthly).`,
    };
  }

  return { status: 'OBSERVED', reason: 'Value, period, and unit period (if any) all corroborated by the passage text.' };
}

/**
 * Hard gate: throws if a caller attempts to record an observation as
 * OBSERVED when the firewall would not independently classify it that way.
 * This is the actual enforcement point -- call it immediately before
 * persisting a `NumericObservation` with `status: 'OBSERVED'`.
 */
export class NumericFirewallViolationError extends Error {
  constructor(reason: string) {
    super(`Numeric observation firewall rejected an OBSERVED claim: ${reason}`);
    this.name = 'NumericFirewallViolationError';
  }
}

export function assertObservationIntegrity(input: ClassifyObservationInput, claimedStatus: NumericObservationStatus): void {
  if (claimedStatus !== 'OBSERVED') return;
  const result = classifyObservation(input);
  if (result.status !== 'OBSERVED') {
    throw new NumericFirewallViolationError(result.reason);
  }
}
