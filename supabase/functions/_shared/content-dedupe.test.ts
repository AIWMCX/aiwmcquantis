/**
 * Reproducible verification for content-dedupe.ts.
 *
 * Run with:
 *   deno test --allow-env supabase/functions/_shared/content-dedupe.test.ts
 *
 * No network access needed or requested.
 */
import { assert, assertEquals, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { contentFingerprint, normalizeContentText } from "./content-dedupe.ts";

Deno.test("normalizeContentText: word order and case don't change the result", () => {
  const a = normalizeContentText("The Project Was Profitable", "Until revision four");
  const b = normalizeContentText("until REVISION four", "project profitable the was");
  assertEquals(a, b);
});

Deno.test("normalizeContentText: stopwords are dropped", () => {
  const withStopwords = normalizeContentText("This is a plan for the business");
  const withoutStopwords = normalizeContentText("plan business");
  assertEquals(withStopwords, withoutStopwords);
});

Deno.test("contentFingerprint: near-identical rewording produces the same fingerprint", () => {
  const a = contentFingerprint("THE PROJECT WAS PROFITABLE UNTIL REVISION #4.", "scope creep example");
  const b = contentFingerprint("the project was profitable until revision #4", "scope creep example");
  assertEquals(a, b);
});

Deno.test("contentFingerprint: a genuinely different concept produces a different fingerprint", () => {
  const a = contentFingerprint("THE PROJECT WAS PROFITABLE UNTIL REVISION #4.", "scope creep example");
  const b = contentFingerprint("THE SALE HAPPENED. THE CASH IS STILL 45 DAYS AWAY.", "receivables aging example");
  assertNotEquals(a, b);
});

Deno.test("contentFingerprint: is deterministic across repeated calls", () => {
  const text = "95% utilization can be a warning";
  assertEquals(contentFingerprint(text), contentFingerprint(text));
});

Deno.test("contentFingerprint: never throws on empty or undefined parts", () => {
  const result = contentFingerprint(undefined, null, "");
  assert(typeof result === "string" && result.length > 0);
});
