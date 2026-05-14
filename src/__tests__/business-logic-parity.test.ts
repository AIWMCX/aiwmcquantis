/**
 * Guard test: the React-side business-logic constants MUST stay in lockstep
 * with the edge-side twin. If this test fails, update both files together
 * and verify against /docs/QUANTIS_BUSINESS_LOGIC.md.
 */
import { describe, it, expect } from "vitest";
import {
  TWELVE_FINANCIAL_VARIABLES,
  scoreToVerdict,
  MANDATORY_DISCLAIMER,
  PRODUCT_IDENTITY,
  QUANTIS_BUSINESS_LOGIC_VERSION,
} from "@/lib/businessLogic";

describe("Quantis business logic invariants", () => {
  it("exposes exactly the 12 canonical financial variables", () => {
    expect(TWELVE_FINANCIAL_VARIABLES).toHaveLength(12);
    expect(new Set(TWELVE_FINANCIAL_VARIABLES).size).toBe(12);
  });

  it("maps validation scores to the four canonical verdicts", () => {
    expect(scoreToVerdict(95)).toBe("STRONG PROCEED");
    expect(scoreToVerdict(70)).toBe("PROCEED WITH CAUTION");
    expect(scoreToVerdict(50)).toBe("PIVOT RECOMMENDED");
    expect(scoreToVerdict(20)).toBe("DO NOT PROCEED");
  });

  it("includes the mandatory legal disclaimer keywords", () => {
    expect(MANDATORY_DISCLAIMER).toMatch(/AIWMC™ LLC/);
    expect(MANDATORY_DISCLAIMER).toMatch(/not constitute financial/i);
  });

  it("uses canonical product identity (live site)", () => {
    expect(PRODUCT_IDENTITY.legalEntity).toBe("AIWMC™ LLC");
    expect(PRODUCT_IDENTITY.domain).toBe("aiwmcquantis.com");
    expect(PRODUCT_IDENTITY.category).toBe("financial pre-mortem");
  });

  it("pins the spec version (bump in lockstep with docs)", () => {
    expect(QUANTIS_BUSINESS_LOGIC_VERSION).toBe("4.0.0");
  });
});
