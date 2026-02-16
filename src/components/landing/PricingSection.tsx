import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentLinks } from '@/hooks/useStripeCheckout';
import { useExperiment, trackExperimentConversion } from '@/lib/abTesting';
import { trackEvent } from '@/lib/analytics';
import { CheckCircle2, Minus } from 'lucide-react';
import { ValueAnchor } from './ValueAnchor';
import { PricingCard } from './PricingCard';
import { GuaranteeBanner } from './GuaranteeBanner';
import { PricingFAQ } from './PricingFAQ';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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
};

const FREE_FEATURES = [
  { text: '3 analyses per month', highlight: false },
  { text: 'Basic financial projections', highlight: false },
  { text: '3 document templates', highlight: false },
  { text: '5 downloads per day', highlight: false },
  { text: 'Email support', highlight: false },
];

const PLUS_FEATURES = [
  { text: '14-day free trial', highlight: true, badge: 'Try Free' },
  { text: 'Unlimited analyses', highlight: true, subtext: 'Worth $2,000+ in consultant fees' },
  { text: 'AI Document Intelligence', highlight: false, subtext: 'Extract data from any PDF/Excel' },
  { text: 'Professional PDF exports', highlight: false },
  { text: 'All document templates', highlight: false },
  { text: 'Unlimited downloads', highlight: false },
  { text: 'Custom branding', highlight: false, subtext: 'White-label with your logo' },
  { text: 'Priority support', highlight: false },
];

export function PricingSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { redirectToPayment } = usePaymentLinks();
  
  // Get experiment variant FIRST so we can use it for initial state
  const pricingVariant = useExperiment('pricing_display');
  const showAnnualFirst = pricingVariant === 'annual_first';
  
  // Initialize billing period based on experiment variant (fixes race condition)
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(() => 
    showAnnualFirst ? 'annual' : 'monthly'
  );
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

  const handlePlanClick = (planName: 'free' | 'plus') => {
    // Use ref for guaranteed current value (fixes race condition)
    const currentBilling = billingPeriodRef.current;
    
    trackEvent('pricing_cta_clicked', {
      plan: planName,
      variant: pricingVariant,
      billing_period: currentBilling,
    });
    
    trackExperimentConversion('pricing_display', 'cta_click', planName === 'plus' ? 1 : 0);

    if (planName === 'free') {
      navigate('/app');
      return;
    }

    // Determine which plan key to use based on CURRENT billing period from ref
    const planKey = currentBilling === 'annual' ? 'plus_annual' : 'plus_monthly';
    
    // Debug logging (can remove after confirming fix)
    console.log('[Pricing] CTA clicked:', { 
      selectedBilling: currentBilling, 
      planKey, 
      isAnnual: planKey === 'plus_annual' 
    });
    
    setLoadingPlan(planName);
    if (user) {
      redirectToPayment(planKey, user.id, user.email || undefined);
    } else {
      localStorage.setItem('pending_checkout_plan', planKey);
      navigate('/auth');
    }
  };

  const plusPricing = billingPeriod === 'annual' ? PRICING.plus.annual : PRICING.plus.monthly;
  const showValueAnchor = pricingVariant !== 'control';

  // Safety: ensure annual_first variant stays on annual if somehow reverted
  useEffect(() => {
    if (showAnnualFirst && billingPeriod === 'monthly') {
      setBillingPeriod('annual');
      billingPeriodRef.current = 'annual';
    }
  }, [showAnnualFirst, billingPeriod]);

  return (
    <section id="pricing" className="py-16 md:py-24 bg-muted/30">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mb-4">
            Know Exactly What You're Getting
          </h2>
          <p className="text-base md:text-lg text-muted-foreground">
            Business analysis that costs less than a single consultant hour
          </p>
        </div>

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
                <span className="ml-2 text-xs font-semibold text-success">
                  Save 17%
                </span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-10">
          <PricingCard
            name="Free"
            price={0}
            period="forever"
            description="Perfect for trying out the platform"
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
            description="For serious entrepreneurs"
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
        </div>

        {/* Money-Back Guarantee */}
        <GuaranteeBanner />

        {/* Feature Comparison Table (for comparison_table variant) */}
        {pricingVariant === 'comparison_table' && (
          <FeatureComparisonTable />
        )}

        {/* Pricing FAQ */}
        <PricingFAQ />
      </div>
    </section>
  );
}

function FeatureComparisonTable() {
  const features = [
    { name: 'Monthly analyses', free: '3', plus: 'Unlimited' },
    { name: 'Financial projections', free: 'Basic', plus: 'Advanced 12-variable' },
    { name: 'Business plan', free: 'Outline only', plus: 'Complete with milestones' },
    { name: 'Marketing strategy', free: 'no', plus: 'yes' },
    { name: 'Document Intelligence', free: 'no', plus: 'yes' },
    { name: 'PDF export', free: 'no', plus: 'yes' },
    { name: 'Custom branding', free: 'no', plus: 'yes' },
    { name: 'Support', free: 'Email', plus: 'Priority' },
  ];

  return (
    <div className="mt-12 max-w-2xl mx-auto">
      <h3 className="text-xl font-semibold text-center text-foreground mb-6">
        Feature Comparison
      </h3>
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">Feature</th>
              <th className="text-center p-4 text-sm font-medium text-muted-foreground">Free</th>
              <th className="text-center p-4 text-sm font-medium text-foreground bg-primary/5">Plus</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature, idx) => (
              <tr key={feature.name} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                <td className="p-4 text-sm text-foreground">{feature.name}</td>
                <td className="p-4 text-sm text-center text-muted-foreground">
                  {feature.free === 'no' ? <Minus className="w-4 h-4 mx-auto text-muted-foreground/50" /> : feature.free}
                </td>
                <td className="p-4 text-sm text-center text-foreground font-medium bg-primary/5">
                  {feature.plus === 'yes' ? <CheckCircle2 className="w-4 h-4 mx-auto text-success" /> : feature.plus}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
