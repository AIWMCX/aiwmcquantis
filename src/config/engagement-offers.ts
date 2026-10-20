// One-time, founder-assisted offers. Single display source for every page
// that names them (/decision-review, homepage pricing). The charged amount
// is set server-side at checkout; keep these in step with it.

export type EngagementOfferCode = 'founder_decision_review' | 'consultant_founding_pilot';

export const ENGAGEMENT_OFFERS = [
  {
    code: 'founder_decision_review' as const,
    name: 'Founder Decision Review',
    price: 349,
    audience: 'For one active founder decision',
    cases: '1 decision',
    included: [
      '30-minute decision intake',
      'Fact, assumption, and unknown register',
      'Base, downside, and upside scenarios',
      'Cash, break-even, and payback reconciliation',
      'Five decision-changing assumptions',
      'Decision Memo, live review, and one revision',
    ],
  },
  {
    code: 'consultant_founding_pilot' as const,
    name: 'Consultant Founding Pilot',
    price: 499,
    audience: 'For consultants, fractional CFOs, and advisors',
    cases: '2 client cases',
    included: [
      'Two client cases submitted within 30 days',
      'Founder-led pilot setup and structured intake',
      'Three scenarios and reconciled economics per case',
      'Source and uncertainty register per case',
      'Two consultant-ready Decision Memos',
      'One review and one revision per case',
    ],
  },
] as const;

export const ENGAGEMENT_OFFER = {
  founderReview: ENGAGEMENT_OFFERS[0],
  consultantPilot: ENGAGEMENT_OFFERS[1],
} as const;
