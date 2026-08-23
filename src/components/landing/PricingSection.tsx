import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useExperiment, trackExperimentConversion } from '@/lib/abTesting';
import { trackEvent } from '@/lib/analytics';
import { CheckCircle2, Minus } from 'lucide-react';
import { ValueAnchor } from './ValueAnchor';
import { PricingCard } from './PricingCard';
import { GuaranteeBanner } from './GuaranteeBanner';
import { TIERS } from '@/config/tiers';
import { DOC_TEMPLATE_COUNT, MONTE_CARLO_ITERATIONS_DISPLAY } from '@/config/canonical-facts';
import { PricingFAQ } from './PricingFAQ';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SectionHeader } from '@/components/ui/glass-card';

type BillingPeriod = 'monthly' | 'annual';

const PRICING = {
  free: {
    monthly: { price: 0, period: 'forever' },
    annual: { price: 0, period: 'forever' },
  },
  plus: {
    monthly: { price: 17, period: 'mo', totalYear: 204 },
    annual: { price: 14, period: 'mo', totalYear: 168, savings: 36, savingsPercent: 17 },
  },
  pro: {
    monthly: { price: 49, period: 'mo', totalYear: 588 },
    annual: { price: 41, period: 'mo', totalYear: 492, savings: 96, savingsPercent: 16 },
  },
};

const FREE_FEATURES = [
  {
    text: '5 analyses per month',
    highlight: false,
    subtext: 'Score + 3 critical risks + base revenue only',
  },
  { text: 'Quick depth only', highlight: false, subtext: 'No Monte Carlo, P&L, or action plan' },
  {
    text: '5 PDF downloads/day',
    highlight: false,
    subtext: 'Separate from your monthly analysis limit, watermarked with "Powered by Quantis"',
  },
  {
    text: 'Pre-Mortem Stress Test 🔒',
    highlight: false,
    subtext: 'Plus only — stress-test existing businesses',
  },
  {
    text: 'Invoice & Capacity Check 🔒',
    highlight: false,
    subtext: 'Plus only — should you take this client?',
  },
  { text: 'Document Studio 🔒', highlight: false, subtext: 'Plus only — investor-ready exports' },
  { text: 'Email support — best effort', highlight: false },
];

const PLUS_FEATURES = [
  {
    text: 'Unlimited analyses',
    highlight: true,
    subtext: 'Replaces 3-5 hours of senior CFO analysis',
  },
  {
    text: 'Full report — Monte Carlo, 36-mo P&L, action plan',
    highlight: true,
    subtext: '97,500 scenario stress-tests per analysis',
  },
  {
    text: 'Pre-Mortem Stress Test ✓',
    highlight: true,
    subtext: 'Stress-test churn shocks, cost spikes, customer concentration',
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
            description="Reconnaissance — is this idea worth your time?"
            features={FREE_FEATURES}
            ctaText="Start Free Analysis"
            onCtaClick={() => handlePlanClick('free')}
            isLoading={loadingPlan === 'free'}
            disabled={loadingPlan !== null}
          />
          <PricingCard
            name="Plus"
            price={plusPricing.price}
            period={plusPricing.period}
            description="Full Analysis — should you actually start this business?"
            features={PLUS_FEATURES}
            ctaText="Start 14-Day Free Trial →"
            onCtaClick={() => handlePlanClick('plus')}
            isLoading={loadingPlan === 'plus'}
            disabled={loadingPlan !== null}
            highlighted
            badge="Most Popular"
            annualSavings={billingPeriod === 'annual' ? PRICING.plus.annual.savings : undefined}
            totalYear={plusPricing.totalYear}
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
          />
        </div>

        {/* Legacy grandfather note */}
        <p className="text-xs text-center text-muted-foreground mb-6 max-w-2xl mx-auto">
          Existing Plus customers on the original ${TIERS.plus.priceMonthly}/mo plan keep that price for the lifetime of
          their subscription. New monthly signups today are billed at ${TIERS.plus.priceMonthly}/mo with the option to
          switch to annual (${TIERS.plus.priceAnnualMonthlyEquivalent}/mo) anytime.
        </p>

        {/* Money-Back Guarantee */}
        <GuaranteeBanner />

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
    { name: 'Monthly analyses', free: '5', plus: 'Unlimited', pro: 'Unlimited' },
    { name: 'Financial projections', free: 'Basic', plus: '36-month, 12-variable', pro: '60-month, 12-variable' },
    { name: 'Monte Carlo simulation', free: 'no', plus: `${MONTE_CARLO_ITERATIONS_DISPLAY}-iteration`, pro: `${MONTE_CARLO_ITERATIONS_DISPLAY}-iteration` },
    { name: 'Pre-Mortem Stress Test', free: 'no', plus: 'yes', pro: 'yes' },
    { name: 'Document Studio', free: 'no', plus: `${DOC_TEMPLATE_COUNT} templates`, pro: `${DOC_TEMPLATE_COUNT} templates` },
    { name: 'Invoice & Capacity Check', free: 'no', plus: 'yes', pro: 'yes' },
    { name: 'RVCE external validation', free: 'no', plus: 'yes', pro: 'yes' },
    { name: 'TAM / SAM / SOM + pitch deck data', free: 'no', plus: 'TAM/SAM/SOM only', pro: '+ pitch deck data' },
    { name: 'Strategic roadmap', free: 'no', plus: 'no', pro: 'yes' },
    { name: 'White-label PDF export', free: 'no', plus: 'no', pro: 'yes' },
    { name: 'API access', free: 'no', plus: 'no', pro: 'yes' },
    { name: 'Team seats', free: '1', plus: '1', pro: '3' },
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
      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(148,163,255,0.14)', background: 'rgba(12,16,32,0.55)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(148,163,255,0.14)' }}>
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
