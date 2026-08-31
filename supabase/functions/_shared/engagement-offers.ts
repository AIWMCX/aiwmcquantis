export type EngagementOfferCode =
  | "founder_decision_review"
  | "consultant_founding_pilot";

export type EngagementType = "founder_review" | "consultant_review";

export interface EngagementOffer {
  code: EngagementOfferCode;
  paymentLinkId: string;
  engagementType: EngagementType;
  name: string;
  expectedAmountMinor: number;
  currency: "usd";
  caseCapacity: 1 | 2;
  deliveryTargetHours: number;
  pilotWindowDays: number | null;
}

export const ENGAGEMENT_OFFERS: Record<EngagementOfferCode, EngagementOffer> = {
  founder_decision_review: {
    code: "founder_decision_review",
    paymentLinkId: "plink_1UAHfLLKMhSmZURCpBCtsin5",
    engagementType: "founder_review",
    name: "Founder Decision Review",
    expectedAmountMinor: 34_900,
    currency: "usd",
    caseCapacity: 1,
    deliveryTargetHours: 48,
    pilotWindowDays: null,
  },
  consultant_founding_pilot: {
    code: "consultant_founding_pilot",
    paymentLinkId: "plink_1UAHgRLKMhSmZURCFJsZaLiv",
    engagementType: "consultant_review",
    name: "Consultant Founding Pilot",
    expectedAmountMinor: 49_900,
    currency: "usd",
    caseCapacity: 2,
    deliveryTargetHours: 48,
    pilotWindowDays: 30,
  },
};

export function getEngagementOfferByCode(value: unknown): EngagementOffer | null {
  if (typeof value !== "string") return null;
  return ENGAGEMENT_OFFERS[value as EngagementOfferCode] ?? null;
}

export function getEngagementOfferByPaymentLinkId(value: unknown): EngagementOffer | null {
  if (typeof value !== "string") return null;
  return Object.values(ENGAGEMENT_OFFERS).find((offer) => offer.paymentLinkId === value) ?? null;
}

export function paymentLinkIdFromSession(paymentLink: unknown): string | null {
  if (typeof paymentLink === "string") return paymentLink;
  if (
    paymentLink &&
    typeof paymentLink === "object" &&
    "id" in paymentLink &&
    typeof (paymentLink as { id?: unknown }).id === "string"
  ) {
    return (paymentLink as { id: string }).id;
  }
  return null;
}

export function validateEngagementPayment(
  offer: EngagementOffer,
  payment: { amountTotal: number | null; currency: string | null; paymentStatus: string | null },
): { ok: true } | { ok: false; reason: string } {
  if (payment.paymentStatus !== "paid") {
    return { ok: false, reason: `payment_status_${payment.paymentStatus ?? "missing"}` };
  }
  if (payment.amountTotal !== offer.expectedAmountMinor) {
    return { ok: false, reason: "amount_mismatch" };
  }
  if (payment.currency?.toLowerCase() !== offer.currency) {
    return { ok: false, reason: "currency_mismatch" };
  }
  return { ok: true };
}
