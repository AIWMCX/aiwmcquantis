import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useExperiment, trackExperimentConversion } from '@/lib/abTesting';
import { trackEvent } from '@/lib/analytics';
import { CheckCircle2, Minus } from 'lucide-react';
import { ValueAnchor } from './ValueAnchor';
import { PricingCard } from './PricingCard';
import { GuaranteeBanner } from './GuaranteeBanner';
import { TIERS } from '@/config/tiers';
import { ENGAGEMENT_OFFER } from '@/config/engagement-offers';
import { DOC_TEMPLATE_COUNT, MONTE_CARLO_ITERATIONS_DISPLAY } from '@/config/canonical-facts';
import { PricingFAQ } from './PricingFAQ';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SectionHeader } from '@/components/ui/glass-card';

type BillingPeriod = 'monthly' | 'annual';

// Derived from TIERS so the homepage can never drift from checkout prices.
function paidPricing(tier: { priceMonthly: number; priceAnnual: number; priceAnnualMonthlyEquivalent: number }) {
  const monthlyYear = tier.priceMonthly * 12;
  const savings = monthlyYear - tier.priceAnnual;
  return {
    monthly: { price: tier.priceMonthly, period: 'mo', totalYear: monthlyYear },
    annual: {
      price: tier.priceAnnualMonthlyEquivalent,
      period: 'mo',
      totalYear: tier.priceAnnual,
      savings,
      savingsPercent: Math.floor((savings / monthlyYear) * 100),
    },
  };
}

const PRICING = {
  free: {
    monthly: { price: 0, period: 'forever' },
    annual: { price: 0, period: 'forever' },
  },
  plus: paidPricing(TIERS.plus),
  pro: paidPricing(TIERS.pro),
};

const FREE_FEATURES = [
  {
    text: '5 complete Decision Runs per month',
    highlight: true,
    subtext: 'Full financial analysis, validation, pre-mortem, and scenarios',
  },
  { text: '36-month P&L + Monte Carlo', highlight: true, subtext: 'Complete model and prioritized action plan' },
  { text: 'Failure Pre-Mortem ✓', highlight: true, subtext: 'See what breaks first and why' },
  { text: '1 saved scenario set per run', highlight: true, subtext: 'Preview changes, compare outcomes, and find break-even' },
  {
    text: '5 PDF downloads/day',
    highlight: false,
    subtext: 'Separate from your monthly analysis limit, watermarked with "Powered by Quantis"',
  },
  {
    text: 'Invoice & Capacity Check 🔒',
    highlight: false,
    subtext: 'Plus only — should you take this client?',
  },
  { text: 'Document Studio starter access', highlight: false, subtext: '3 templates and 1 document download per day' },
  { text: 'Email support — best effort', highlight: false },
];

const PLUS_FEATURES = [
  {
    text: 'Unlimited analyses',
    highlight: true,
    subtext: 'Keep testing decisions without a monthly run limit',
  },
  {
    text: 'More scenario sets and comparison workflows',
    highlight: true,
    subtext: 'Save, promote, and reuse scenarios across professional documents',
  },
  {
    text: 'Invoice & Capacity Check ✓',
    highlight: true,
    subtext: 'Decide whether to accept new clients without breaking cash flow',
  },
  {
    text: 'Document Studio ✓',
    highlight: false,
    subtext: `${DOC_TEMPLATE_COUNT} branded templates auto-populated from your analysis`,
  },
  {
    text: 'TAM / SAM / SOM Calculator ✓',
    highlight: true,
    subtext: 'Market sizing with cited sources for investors',
  },
  {
    text: 'Custom branding & PDF export',
    highlight: false,
    subtext: 'Add your logo and colors (Quantis footer stays — remove it entirely on Pro)',
  },
  {
    text: 'AI Document Intelligence',
    highlight: false,
    subtext: 'Extract data from any PDF or Excel',
  },
  { text: 'Unlimited downloads + history', highlight: false },
  { text: 'Priority support', highlight: false },
];

const PRO_FEATURES = [
  { text: 'Everything in Plus, plus:', highlight: true },
  { text: '5-Year Financial Model', highlight: true, subtext: 'Beyond the 36-month Plus horizon' },
  {
    text: 'Pitch Deck Data Package',
    highlight: false,
    subtext: 'Exportable to slides — investor-ready',
  },
  {
    text: 'Strategic Roadmap',
    highlight: false,
    subtext: 'Week-by-week launch plan with milestones',
  },
  { text: 'White-Label PDF', highlight: false, subtext: 'Remove Quantis branding entirely' },
  { text: 'Team Access — 3 seats', highlight: false },
  { text: 'API Access', highlight: false, subtext: 'Embed Quantis analyses in your own tools' },
  { text: 'Priority support — 24h response', highlight: false },
];

export function PricingSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createCheckout } = useSubscription();

  // Get experiment variant FIRST so we can use it for initial state
  const pricingVariant = useExperiment('pricing_display');
  // Wave 2: yearly is the default (cheaper per-month + higher LTV).
  // The annual_first experiment variant kept this behaviour; we now apply
  // it for everyone so the anchor in the page header matches what's selected.
  const showAnnualFirst = true;

  // Initialize billing period to annual by default
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('annual');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Ref to always have the current billing period (eliminates stale state on quick clicks)
  const billingPeriodRef = useRef<BillingPeriod>(billingPeriod);

  // Keep ref in sync with state
  useEffect(() => {
    billingPeriodRef.current = billingPeriod;
  }, [billingPeriod]);

  // Track pricing section viewed (now includes billingPeriod in deps)
  useEffect(() => {
    trackEvent('pricing_section_viewed', {
      variant: pricingVariant,
      billing_period: billingPeriod,
    });
  }, [pricingVariant, billingPeriod]);

  const handleBillingToggle = (value: string) => {
    if (value === 'monthly' || value === 'annual') {
      const from = billingPeriodRef.current;
      setBillingPeriod(value);
      billingPeriodRef.current = value; // Update ref immediately
      trackEvent('pricing_toggle_clicked', {
        from,
        to: value,
        variant: pricingVariant,
      });
    }
  };

  const handlePlanClick = (planName: 'free' | 'plus' | 'pro') => {
    // Use ref for guaranteed current value (fixes race condition)
    const currentBilling = billingPeriodRef.current;

    trackEvent('pricing_cta_clicked', {
      plan: planName,
      variant: pricingVariant,
      billing_period: currentBilling,
    });

    trackExperimentConversion(
      'pricing_display',
      'cta_click',
      planName === 'plus' ? 1 : planName === 'pro' ? 2 : 0
    );

    if (planName === 'free') {
      navigate('/app');
      return;
    }

    setLoadingPlan(planName);
    if (user) {
      createCheckout(planName, undefined, currentBilling).catch(() => setLoadingPlan(null));
    } else {
      // Packed string kept for backward compat with Auth.tsx's post-signup
      // checkout resume logic (parses 'plus_monthly' | 'plus_annual' | etc.).
      localStorage.setItem('pending_checkout_plan', `${planName}_${currentBilling}`);
      navigate('/auth');
    }
  };

  const plusPricing = billingPeriod === 'annual' ? PRICING.plus.annual : PRICING.plus.monthly;
  const proPricing = billingPeriod === 'annual' ? PRICING.pro.annual : PRICING.pro.monthly;
  const showValueAnchor = pricingVariant !== 'control';

  // Annual is the default initial selection (see useState above), but the user
  // is free to switch to monthly. Do NOT force the value back here — that
  // previously made the Monthly toggle un-clickable.

  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="aiwmc-section-wash py-16 md:py-24">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="Pricing"
          title="Know exactly what you're getting"
          subtitle="Business analysis that costs less than a single consultant hour."
        />
        <div className="mt-8" />

        {/* Value Anchor - Consultant Cost Comparison */}
        {showValueAnchor && <ValueAnchor />}

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-muted p-1 rounded-lg">
            <ToggleGroup
              type="single"
              value={billingPeriod}
              onValueChange={handleBillingToggle}
              className="gap-0"
            >
              <ToggleGroupItem
                value="monthly"
                className="px-6 py-2 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm transition-all"
              >
                Monthly
              </ToggleGroupItem>
              <ToggleGroupItem
                value="annual"
                className="px-6 py-2 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm transition-all relative"
              >
                Annual
                <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                  Save 17%
                </span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Pricing Cards — 3-tier */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-10">
          <PricingCard
            name="Free"
            price={0}
            period="forever"
            description="Complete decision evidence — five times every month"
            features={FREE_FEATURES}
            ctaText="Start a Decision Run"
            onCtaClick={() => handlePlanClick('free')}
            isLoading={loadingPlan === 'free'}
            disabled={loadingPlan !== null}
          />
          <PricingCard
            name="Plus"
            price={plusPricing.price}
            period={plusPricing.period}
            description="Continuous decision work and professional workflows"
            features={PLUS_FEATURES}
            ctaText="Start 14-Day Free Trial →"
            onCtaClick={() => handlePlanClick('plus')}
            isLoading={loadingPlan === 'plus'}
            disabled={loadingPlan !== null}
            highlighted
            badge="Most Popular"
            annualSavings={billingPeriod === 'annual' ? PRICING.plus.annual.savings : undefined}
            totalYear={plusPricing.totalYear}
            isAnnualBilling={billingPeriod === 'annual'}
          />
          <PricingCard
            name="Pro"
            price={proPricing.price}
            period={proPricing.period}
            description="Investor-Ready — how do you convince investors to fund this?"
            features={PRO_FEATURES}
            ctaText="Start Pro — 14-Day Trial →"
            onCtaClick={() => handlePlanClick('pro')}
            isLoading={loadingPlan === 'pro'}
            disabled={loadingPlan !== null}
            badge="For fundraising"
            annualSavings={billingPeriod === 'annual' ? PRICING.pro.annual.savings : undefined}
            totalYear={proPricing.totalYear}
            isAnnualBilling={billingPeriod === 'annual'}
          />
        </div>

        {/* Money-Back Guarantee */}
        <GuaranteeBanner />

        {/* Founder-assisted option: deliberately secondary to the plan cards. */}
        <p className="text-sm text-center text-muted-foreground mt-6 mb-10 max-w-2xl mx-auto">
          Prefer a founder to review one real decision with you?{' '}
          <Link
            to="/decision-review"
            className="font-semibold text-foreground underline underline-offset-4 hover:text-primary"
            onClick={() => trackEvent('pricing_founder_review_click', { surface: 'homepage_pricing' })}
          >
            {ENGAGEMENT_OFFER.founderReview.name} — ${ENGAGEMENT_OFFER.founderReview.price} one-time
          </Link>
        </p>

        {/* Feature Comparison Table — permanent per MP2-DESIGN-LAYOUT-02 (was
            previously gated behind the pricing_display A/B experiment;
            promoted to always-visible for every /pricing visitor 2026-07-07) */}
        <FeatureComparisonTable />

        {/* Pricing FAQ */}
        <PricingFAQ />
      </div>
    </section>
  );
}

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

function FeatureComparisonTable() {
  // Kept in lockstep with the tier breakdowns already documented on
  // /how-it-works (REPORT_SECTIONS / TOOLS) and /pricing's tier cards —
  // no feature claimed here that isn't already live elsewhere on the site.
  const features = [
    { name: 'Monthly Decision Runs', free: '5', plus: 'Unlimited', pro: 'Unlimited' },
    { name: 'Financial projections', free: '36-month, 12-variable', plus: '36-month, 12-variable', pro: '60-month, 12-variable' },
    { name: 'Monte Carlo simulation', free: `${MONTE_CARLO_ITERATIONS_DISPLAY}-iteration`, plus: `${MONTE_CARLO_ITERATIONS_DISPLAY}-iteration`, pro: `${MONTE_CARLO_ITERATIONS_DISPLAY}-iteration` },
    { name: 'Failure Pre-Mortem', free: 'yes', plus: 'yes', pro: 'yes' },
    { name: 'Saved scenario sets / analysis', free: '1', plus: '10', pro: '30' },
    { name: 'Document Studio', free: '3 starter templates', plus: `${DOC_TEMPLATE_COUNT} templates`, pro: `${DOC_TEMPLATE_COUNT} templates` },
    { name: 'Invoice & Capacity Check', free: 'no', plus: 'yes', pro: 'yes' },
    { name: 'RVCE external validation', free: 'yes', plus: 'yes', pro: 'yes' },
    { name: 'TAM / SAM / SOM + pitch deck data', free: 'no', plus: 'TAM/SAM/SOM only', pro: '+ pitch deck data' },
    { name: 'Strategic roadmap', free: 'no', plus: 'no', pro: 'yes' },
    { name: 'White-label PDF export', free: 'no', plus: 'no', pro: 'yes' },
    { name: 'API access', free: 'no', plus: 'no', pro: 'yes' },
    {
      name: 'Team seats',
      // Sourced from TIERS.*.limits.teamSeats (config/tiers.ts). Corrected
      // 2026-09-27 audit: Plus was 1 here (and in entitlements.ts), which
      // this comment previously (incorrectly) called the real server-
      // enforced value -- it was not. The actual gate (team-invite/index.ts
      // + the enforce_team_seat_cap DB trigger) hard-requires the team
      // owner to hold a PRO subscription unconditionally; there is no path
      // for a Plus owner to create a team or invite anyone. That is exactly
      // what tier-spec.ts's FEATURE_MANIFEST already had (FREE=0, PLUS=0,
      // PRO=3) -- this file's old comment wrongly called tier-spec.ts stale
      // when tiers.ts/entitlements.ts were the ones out of sync with the
      // real enforcement. Now Free=0, Plus=0, Pro=3 everywhere.
      free: String(TIERS.free.limits.teamSeats),
      plus: String(TIERS.plus.limits.teamSeats),
      pro: String(TIERS.pro.limits.teamSeats),
    },
    { name: 'Support', free: 'Email', plus: 'Priority', pro: 'Priority' },
  ];

  const renderCell = (value: string) => {
    if (value === 'no') return <Minus className="w-4 h-4 mx-auto" style={{ color: 'hsl(var(--muted-foreground) / 0.4)' }} />;
    if (value === 'yes') return <CheckCircle2 className="w-4 h-4 mx-auto" style={{ color: '#4ade80' }} />;
    return value;
  };

  return (
    <div className="mt-12 max-w-4xl mx-auto">
      <h3
        className="text-center mb-6 text-[11px] font-semibold uppercase"
        style={{ ...MONO, letterSpacing: '0.14em', color: 'var(--aiwmc-grad-cyan)' }}
      >
        Feature Comparison
      </h3>
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <th className="text-left p-4 text-xs font-semibold uppercase text-muted-foreground" style={MONO}>Feature</th>
              <th className="text-center p-4 text-xs font-semibold uppercase text-muted-foreground" style={MONO}>Free</th>
              <th
                className="text-center p-4 text-xs font-semibold uppercase"
                style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)', background: 'rgba(79,70,229,0.08)' }}
              >
                Plus
              </th>
              <th className="text-center p-4 text-xs font-semibold uppercase" style={{ ...MONO, color: 'var(--aiwmc-grad-violet)' }}>
                Pro
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature, idx) => (
              <tr key={feature.name} style={idx % 2 === 1 ? { background: 'rgba(148,163,255,0.03)' } : undefined}>
                <td className="p-4 text-sm" style={{ color: 'hsl(var(--foreground))' }}>{feature.name}</td>
                <td className="p-4 text-sm text-center text-muted-foreground">{renderCell(feature.free)}</td>
                <td className="p-4 text-sm text-center font-medium" style={{ color: 'hsl(var(--foreground))', background: 'rgba(79,70,229,0.05)' }}>
                  {renderCell(feature.plus)}
                </td>
                <td className="p-4 text-sm text-center font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                  {renderCell(feature.pro)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
