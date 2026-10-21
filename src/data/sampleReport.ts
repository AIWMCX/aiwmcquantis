/**
 * Canonical source of truth for the "live sample" Quantis report shown on the landing hero.
 *
 * Headline metric cards, executive cover, and the rendered HTML pages all read from this
 * single object. A runtime validator (see `validateSampleReportIntegrity`) checks that
 * the headline metrics displayed above the preview match the values embedded in the
 * report pages — if they ever drift, the hero shows a visible warning instead of lying
 * to the buyer.
 */

import { MONTE_CARLO_ITERATIONS_DISPLAY } from '@/config/canonical-facts';

export interface SampleMetric {
  id: 'investment' | 'payback' | 'profit' | 'status';
  label: string;
  value: string;
  /** Raw numeric form used by the integrity validator. */
  raw: number | string;
  sub: string;
  detail: string;
}

const SAMPLE_UNIT_ECONOMICS = {
  monthlyRevenue: 28_400,
  directCosts: 4_000,
  monthlyRevenuePerMember: 89,
  modeledRetentionMonths: 14,
  cac: 42,
} as const;
const sampleGrossMargin = (SAMPLE_UNIT_ECONOMICS.monthlyRevenue - SAMPLE_UNIT_ECONOMICS.directCosts) / SAMPLE_UNIT_ECONOMICS.monthlyRevenue;
const sampleContributionLtv = Math.round(SAMPLE_UNIT_ECONOMICS.monthlyRevenuePerMember * SAMPLE_UNIT_ECONOMICS.modeledRetentionMonths * sampleGrossMargin);
const sampleLtvCac = (sampleContributionLtv / SAMPLE_UNIT_ECONOMICS.cac).toFixed(1);

export const SAMPLE_REPORT = {
  meta: {
    company: 'The Draft Lab',
    tagline: 'Specialty coffee + co-writing studio · downtown Austin',
    industry: 'Consulting / F&B hybrid',
    location: 'Austin, TX',
    generated: 'Jun 13, 2026',
    pages: 15,
    evidenceLabel: 'Fictional example',
    verdict: 'Conditional Go — pivot pricing model before launch',
    summary:
      'Illustrative coffee and co-working concept targeting 180 paying members at $89/mo. The hand-authored example shows 18-month payback and $11.8k monthly Y2 profit; these figures are not an engine-generated forecast.',
  },
  metrics: {
    investment: { value: 142_500, label: '$142,500' },
    paybackMonths: { value: 18, label: '18 months' },
    monthlyProfitY2: { value: 11_800, label: '$11,800' },
  },
  pages: [
    {
      id: 1,
      kicker: 'AI Business Intelligence Platform',
      title: 'Business Feasibility Analysis',
      body: [
        '"The Draft Lab" — a hybrid specialty coffee shop and co-writing studio in downtown Austin (2nd & Congress), targeting remote creative professionals with sound-treated writing nooks, high-speed Starlink, and a pour-over espresso membership model, replacing traditional coworking memberships with per-hour creative session pricing.',
      ],
      footer: 'Austin, Texas · Prepared by AIWMC™ Quantis',
    },
    {
      id: 2,
      kicker: 'Executive Verdict',
      title: 'Conditional Go — pivot pricing before launch',
      bullets: [
        'Evidence status: fictional, hand-authored example; validate assumptions before a real decision',
        'Unit economics workable only above 145 paying members and ≥ $74 ARPU',
        'Largest fragility: location rent at $9.4k/mo (28% of OPEX)',
        'Recommended pivot: per-hour drop-in @ $14/hr + $89/mo unlimited tier',
      ],
    },
    {
      id: 3,
      kicker: 'Key Financial Metrics',
      title: 'Headline numbers',
      kpis: [
        { label: 'Total investment required', value: '$142,500' },
        { label: 'Monthly revenue (Y2 MRR)', value: '$28,400' },
        { label: 'Monthly net profit (Y2)', value: '$11,800' },
        { label: 'Payback period (base case)', value: '18 months' },
      ],
      body: [
        'The Draft Lab requires $86.2k in CAPEX (buildout, espresso bar, acoustic treatment, Starlink Business install, FF&E) and a 4-month operating runway of $56.3k before crossing break-even. Steady-state Y2 economics show $28.4k MRR against $16.6k blended OPEX, leaving $11.8k of monthly net before owner draw.',
      ],
    },
    {
      id: 4,
      kicker: 'Target Market',
      title: 'Who actually pays',
      body: [
        'Primary: remote creative professionals aged 25–45 in Austin, TX. 60% freelance/self-employed, 30% remote employees, 10% graduate students. Psychographics: value productivity, premium coffee, quiet atmosphere; willing to pay for an environment that signals craft.',
        'Pain points: home distractions, noisy generic coffee shops, expensive ($300+/mo) coworking memberships. Buying behavior: frequent small purchases ($6 coffee + $15 session), high loyalty if experience is consistent. Austin\'s growing tech and creative scene provides a strong base — ~38k qualifying remote workers within 3 miles.',
      ],
    },
    {
      id: 5,
      kicker: 'Unit Economics',
      title: 'CAC, LTV and the ratio that matters',
      kpis: [
        { label: 'Blended CAC', value: '$42' },
        { label: 'Contribution LTV (14-mo assumption)', value: `$${sampleContributionLtv.toLocaleString('en-US')}` },
        { label: 'LTV : CAC', value: `${sampleLtvCac} ×` },
        { label: 'Gross margin', value: `${Math.round(sampleGrossMargin * 100)}%` },
      ],
      body: [
        `Illustrative CAC is $42 (about $1,250 of acquisition spending divided by 30 signups). Contribution LTV assumes $89 monthly revenue per member × 14 modeled months × ${Math.round(sampleGrossMargin * 100)}% gross margin = $${sampleContributionLtv.toLocaleString('en-US')}. The ${sampleLtvCac}× LTV:CAC ratio is conditional on those unverified inputs, not an observed cohort result.`,
      ],
    },
    {
      id: 6,
      kicker: 'Build & Launch CAPEX',
      title: 'Where the $142,500 actually goes',
      table: [
        ['Buildout & acoustic treatment', '$38,200'],
        ['Espresso bar + pour-over station', '$22,600'],
        ['Furniture, lighting, Starlink install', '$15,400'],
        ['Deposits, permits, branding', '$10,000'],
        ['4-month operating runway', '$56,300'],
        ['Total', '$142,500'],
      ],
    },
    {
      id: 7,
      kicker: 'Bottom-up P&L (Year 2 steady state)',
      title: 'Monthly P&L at 180 members',
      table: [
        ['Membership revenue (180 × $89)', '$16,020'],
        ['Walk-in coffee + retail', '$12,380'],
        ['Total monthly revenue', '$28,400'],
        ['COGS (walk-in coffee/retail only)', '($4,000)'],
        ['Rent (2nd & Congress)', '($9,400)'],
        ['Staff (0.75 FTE barista, lean model)', '($2,700)'],
        ['Utilities, software, misc', '($500)'],
        ['Monthly net profit', '$11,800'],
      ],
    },
    {
      id: 8,
      kicker: 'Cash Runway',
      title: 'Month-by-month burn until break-even',
      body: [
        'Months 1–3 burn $14.1k/mo on rent, payroll and ramp marketing. Members ramp 22 → 58 → 96 → 134 → 168 → 180 across months 1–6. Operating cash turns positive in month 7. Cumulative free cash flow crosses zero in month 18 — that is the canonical payback figure shown on the cover.',
      ],
    },
    {
      id: 9,
      kicker: `Monte Carlo (12 variables, ${MONTE_CARLO_ITERATIONS_DISPLAY} runs)`,
      title: 'Payback distribution',
      kpis: [
        { label: 'P10 (best case)', value: '11 months' },
        { label: 'P25', value: '14 months' },
        { label: 'P50 (base)', value: '18 months' },
        { label: 'P75', value: '26 months' },
        { label: 'P90 (worst)', value: '38 months' },
      ],
      body: [
        'Distribution is right-skewed: in 22% of runs the business never reaches break-even within 36 months, driven almost entirely by member-acquisition shortfall (< 120 paying members) compounding with $9.4k rent.',
      ],
    },
    {
      id: 10,
      kicker: 'Sensitivity & Fragility',
      title: 'What breaks the model',
      bullets: [
        'Members < 145 → permanent negative cashflow (Fragility 0.71)',
        'ARPU < $74 → payback slips past 30 months',
        'Rent > $11k/mo → eliminates Y2 profitability entirely',
        'Churn > 6.5% monthly → LTV collapses below CAC × 6',
      ],
    },
    {
      id: 11,
      kicker: 'Competitive Landscape',
      title: 'Why this slot is open',
      body: [
        'Direct competitors in 1.5-mile radius: WeWork (2 floors, $350/mo, no specialty coffee), Greater Goods Coffee (no dedicated work nooks), Industry Coworking (closed Dec 2025). The hybrid format — premium coffee + acoustic-treated solo nooks at a $89 entry price — has no direct competitor.',
        'Indirect competitors: home offices, public libraries, Starbucks. Differentiation: silence (NRC > 0.7 panels), reservation system, single-origin pour-over included in membership.',
      ],
    },
    {
      id: 12,
      kicker: 'Risk Register',
      title: 'Top 5 risks with mitigation',
      table: [
        ['Member acquisition < plan', 'Pre-sell 60 founding memberships before lease signing'],
        ['Rent escalation at year 3', 'Lock 5-yr lease w/ 3% annual cap'],
        ['Barista turnover', 'Profit-share above $14k monthly net'],
        ['Single-location concentration', 'No expansion until $250k cash reserve'],
        ['Specialty coffee price spike', '6-mo hedged supply contract w/ Cuvée'],
      ],
    },
    {
      id: 13,
      kicker: 'Quality of Earnings',
      title: 'Structural vs cosmetic profit',
      body: [
        'Of the $11.8k monthly Y2 net profit, ~$10.4k is structural (recurring membership + recurring walk-in pattern) and ~$1.4k is cosmetic (events, one-off catering). Cosmetic profit is excluded from the payback calculation. This is a deliberately conservative posture — most pitch decks include event revenue in steady-state numbers.',
      ],
    },
    {
      id: 14,
      kicker: 'Recommendations',
      title: 'Pre-launch checklist',
      bullets: [
        'Pre-sell ≥ 60 founding memberships at $79 before signing lease',
        'Negotiate rent cap (≤ 3%/yr) and 90-day build-out abatement',
        'Hire head barista before opening, profit-share above $14k net',
        'Soft-launch 21 days with daily NPS to calibrate $89 vs $99 tier',
        'Reserve $25k contingency outside the $142.5k investment line',
      ],
    },
    {
      id: 15,
      kicker: 'Methodology & Limitations',
      title: 'How to read this fictional example',
      body: [
        'The figures and scenario outcomes in this sample were written by hand to demonstrate a report layout. They are not actual operating data, a generated Quantis result, an independent model check, or a measured probability of success.',
        'A real decision needs verified inputs, a saved model version, a cash-flow review, and evidence from the business. Quantis provides decision support, not investment advice.',
      ],
    },
  ],
} as const;

/**
 * Headline metric cards shown above the preview.
 * Values are derived from SAMPLE_REPORT so the cover, cards and pages can never drift apart.
 */
export const HEADLINE_METRICS: SampleMetric[] = [
  {
    id: 'investment',
    label: 'Initial investment',
    value: SAMPLE_REPORT.metrics.investment.label,
    raw: SAMPLE_REPORT.metrics.investment.value,
    sub: 'Build-out + 4-mo runway',
    detail:
      'Sum of one-time CAPEX ($86,200 — buildout, equipment, deposits) and 4 months of fixed OPEX burn before break-even ($56,300). See sample report, page 6.',
  },
  {
    id: 'payback',
    label: 'Payback period',
    value: SAMPLE_REPORT.metrics.paybackMonths.label,
    raw: SAMPLE_REPORT.metrics.paybackMonths.value,
    sub: 'Base case (P50)',
    detail:
      'Cumulative free cash flow turns positive in month 18 under the base scenario. P25 = 14mo, P75 = 26mo across 12-variable Monte Carlo. Page 9.',
  },
  {
    id: 'profit',
    label: 'Monthly profit (Y2)',
    value: SAMPLE_REPORT.metrics.monthlyProfitY2.label,
    raw: SAMPLE_REPORT.metrics.monthlyProfitY2.value,
    sub: 'Net, after all OpEx',
    detail:
      'Steady-state monthly net income at month 24, assuming 180 paying members × blended ARPU $89 and 4.1% monthly churn. Bottom-up P&L on page 7.',
  },
  {
    id: 'status',
    label: 'Evidence status',
    value: SAMPLE_REPORT.meta.evidenceLabel,
    raw: SAMPLE_REPORT.meta.evidenceLabel,
    sub: 'Hand-authored layout',
    detail:
      'Every company and financial figure is illustrative. This sample was not calculated or independently validated by the Quantis engine. See page 15.',
  },
];

/**
 * Runtime check — verifies the visible headline cards match the canonical SAMPLE_REPORT.
 * Returns an empty array when everything is consistent.
 */
export function validateSampleReportIntegrity(): string[] {
  const issues: string[] = [];
  const find = (id: SampleMetric['id']) => HEADLINE_METRICS.find((m) => m.id === id);

  const inv = find('investment');
  if (inv && inv.value !== SAMPLE_REPORT.metrics.investment.label) {
    issues.push(`investment card "${inv.value}" ≠ report "${SAMPLE_REPORT.metrics.investment.label}"`);
  }
  const pay = find('payback');
  if (pay && pay.value !== SAMPLE_REPORT.metrics.paybackMonths.label) {
    issues.push(`payback card "${pay.value}" ≠ report "${SAMPLE_REPORT.metrics.paybackMonths.label}"`);
  }
  const prof = find('profit');
  if (prof && prof.value !== SAMPLE_REPORT.metrics.monthlyProfitY2.label) {
    issues.push(`profit card "${prof.value}" ≠ report "${SAMPLE_REPORT.metrics.monthlyProfitY2.label}"`);
  }
  const status = find('status');
  if (status && status.value !== SAMPLE_REPORT.meta.evidenceLabel) {
    issues.push(`evidence card "${status.value}" ≠ report "${SAMPLE_REPORT.meta.evidenceLabel}"`);
  }

  // Cross-check: page 3 KPI table must echo headline numbers.
  const page3 = SAMPLE_REPORT.pages.find((p) => p.id === 3);
  if (page3 && 'kpis' in page3 && page3.kpis) {
    const kvs = Object.fromEntries(page3.kpis.map((k) => [k.label, k.value]));
    if (kvs['Total investment required'] !== SAMPLE_REPORT.metrics.investment.label) {
      issues.push('page 3 investment KPI drifted from canonical metric');
    }
    if (kvs['Monthly net profit (Y2)'] !== SAMPLE_REPORT.metrics.monthlyProfitY2.label) {
      issues.push('page 3 monthly profit KPI drifted from canonical metric');
    }
    if (kvs['Payback period (base case)'] !== SAMPLE_REPORT.metrics.paybackMonths.label) {
      issues.push('page 3 payback KPI drifted from canonical metric');
    }
  }

  // Arithmetic check: the page 7 bottom-up P&L table must actually sum to the
  // stated net profit. This is the gap that let a hand-typed table drift
  // $10,000 away from the correct total (revenue minus every listed cost
  // line) while every label-matching check above stayed green -- those only
  // ever compared strings to each other, never did the actual math.
  const page7 = SAMPLE_REPORT.pages.find((p) => p.id === 7);
  if (page7 && 'table' in page7 && page7.table) {
    const parseMoney = (s: string) => {
      const negative = s.startsWith('(');
      const n = Number(s.replace(/[()$,]/g, ''));
      return negative ? -n : n;
    };
    const rows = Object.fromEntries(page7.table.map(([label, value]) => [label, parseMoney(value)]));
    const revenue = rows['Total monthly revenue'];
    const statedProfit = rows['Monthly net profit'];
    const costLines = Object.entries(rows).filter(
      ([label]) => label !== 'Total monthly revenue' && label !== 'Monthly net profit'
        && label !== 'Membership revenue (180 × $89)' && label !== 'Walk-in coffee + retail'
    );
    const computedProfit = revenue + costLines.reduce((sum, [, v]) => sum + v, 0);
    if (Math.round(computedProfit) !== Math.round(statedProfit)) {
      issues.push(
        `page 7 P&L table does not sum: revenue ${revenue} + costs = ${computedProfit}, but table states profit ${statedProfit}`
      );
    }
    if (Math.round(computedProfit) !== SAMPLE_REPORT.metrics.monthlyProfitY2.value) {
      issues.push(
        `page 7 P&L table sums to ${computedProfit}, which does not match the canonical monthlyProfitY2 value ${SAMPLE_REPORT.metrics.monthlyProfitY2.value}`
      );
    }
  }

  return issues;
}
