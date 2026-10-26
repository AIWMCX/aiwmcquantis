/**
 * Location and intent helpers for the free-run inputs.
 *
 * Found live 2026-10-25: the location box was pre-filled with "Global", so a
 * visitor typing "Columbus, OH" sent "GlobalColumbus, OH" and lost city
 * calibration; the one-line hero sent no location at all; and a hiring
 * decision ("Hire a 2nd technician…") was analysed as a new B2B SaaS company.
 */

export const DEFAULT_LOCATION = 'Global';

/** Trim, drop a "Global" glued to the front by the old pre-filled field, default when empty. */
export function normalizeLocation(raw: string | null | undefined): string {
  let v = (raw ?? '').trim();
  if (/^global(?=[A-Za-z])/i.test(v) && v.length > 6) v = v.slice(6).trim();
  return v.length >= 2 ? v : DEFAULT_LOCATION;
}

/** The value to show in the location box: empty instead of the internal default. */
export function locationInputValue(location: string): string {
  return location === DEFAULT_LOCATION ? '' : location;
}

/** "… in Columbus, OH …" → "Columbus, OH". Only US-style "City, ST" is trusted. */
export function extractLocationFromText(text: string): string | null {
  const m = /\b(?:in|at|near|for)\s+((?:[A-Z][A-Za-z.'-]*\s?){1,4},\s?[A-Z]{2})\b/.exec(text);
  return m ? m[1].replace(/\s+,/, ',').trim() : null;
}

/** A hire is a decision about an existing business, not a new business idea. */
export function isHiringDecision(text: string): boolean {
  return /^\s*(should (i|we) )?(hire|hiring|add|bring on|onboard)\b[^.]{0,40}\b(employee|technician|tech|staff|person|people|hire|salesperson|sales rep|rep|assistant|manager|engineer|developer|worker|crew|groomer|stylist|barista|driver)s?\b/i.test(text);
}
