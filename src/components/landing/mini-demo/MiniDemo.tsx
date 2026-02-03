import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, MapPin, Sparkles, Loader2, DollarSign, TrendingUp, Receipt } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';
import { FinancialInputs, PreviewResult } from './types';
import { calculateMetrics } from './calculations';
import { CurrencyInput } from './CurrencyInput';
import { MetricsDisplay } from './MetricsDisplay';
import { LockedFeaturesTease } from './LockedFeaturesTease';
import { UnlockCTA } from './UnlockCTA';

// Industry categories
const INDUSTRIES = [
  { value: 'saas', label: 'SaaS / Software' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'consulting', label: 'Services / Agency' },
  { value: 'retail', label: 'Retail / Physical Store' },
  { value: 'restaurant', label: 'Restaurant / Food Service' },
  { value: 'healthcare', label: 'Healthcare / Wellness' },
  { value: 'education', label: 'Education / Training' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'fintech', label: 'FinTech' },
  { value: 'other', label: 'Other' },
];

export function MiniDemo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Form state
  const [idea, setIdea] = useState('');
  const [location, setLocation] = useState('');
  const [industry, setIndustry] = useState('');
  
  // Financial inputs (new)
  const [financials, setFinancials] = useState<FinancialInputs>({
    investment: 10000,
    monthlyRevenue: 0,
    monthlyCosts: 0,
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [industryDetected, setIndustryDetected] = useState<string>('');
  const hasAutoSubmitted = useRef(false);

  // Calculate metrics locally (instant feedback)
  const metrics = calculateMetrics(financials);
  const hasFinancialInput = financials.monthlyRevenue > 0 || financials.monthlyCosts > 0;
  const isFormValid = idea.trim().length >= 10 && location.trim().length >= 2 && hasFinancialInput;

  // Handle hero form prefill
  const handleHeroPrefill = useCallback(() => {
    const prefillData = sessionStorage.getItem('hero_prefill');
    if (prefillData && !hasAutoSubmitted.current) {
      try {
        const { idea: prefillIdea, location: prefillLocation, autoSubmit } = JSON.parse(prefillData);
        if (prefillIdea && prefillLocation) {
          setIdea(prefillIdea);
          setLocation(prefillLocation);
          sessionStorage.removeItem('hero_prefill');
          
          if (autoSubmit && prefillIdea.trim().length >= 10 && prefillLocation.trim().length >= 2) {
            hasAutoSubmitted.current = true;
          }
        }
      } catch (e) {
        console.error('Error parsing hero prefill:', e);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('hero-prefill-ready', handleHeroPrefill);
    handleHeroPrefill();
    return () => window.removeEventListener('hero-prefill-ready', handleHeroPrefill);
  }, [handleHeroPrefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    setError(null);
    trackEvent('mini_demo_submit', { 
      idea_length: idea.length, 
      location,
      investment: financials.investment,
      revenue: financials.monthlyRevenue,
      costs: financials.monthlyCosts,
    });

    try {
      // Call API for industry detection and AI insights
      const { data, error: fnError } = await supabase.functions.invoke('analyze-preview', {
        body: { 
          idea: idea.slice(0, 500), 
          location: location.slice(0, 100),
          investment: financials.investment,
          revenue: financials.monthlyRevenue,
          costs: financials.monthlyCosts,
        },
      });

      if (fnError) throw new Error(fnError.message || 'Preview failed');

      if (data?.success && data?.data) {
        setIndustryDetected(data.data.industry_detected || 'General');
        setShowResults(true);
        trackEvent('mini_demo_success', { industry: data.data.industry_detected });
      } else {
        throw new Error(data?.error || 'Unable to generate preview');
      }
    } catch (err: any) {
      console.error('Mini demo error:', err);
      
      if (err.message?.includes('rate limit') || err.message?.includes('too many')) {
        setError('You\'ve reached the preview limit. Sign up for unlimited analyses!');
      } else {
        // Still show results with local calculations even if API fails
        setShowResults(true);
        setIndustryDetected(
          INDUSTRIES.find(i => i.value === industry)?.label || 'General'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setShowResults(false);
    setIdea('');
    setLocation('');
    setIndustry('');
    setFinancials({ investment: 10000, monthlyRevenue: 0, monthlyCosts: 0 });
    setIndustryDetected('');
  };

  const updateFinancial = (key: keyof FinancialInputs) => (value: number) => {
    setFinancials(prev => ({ ...prev, [key]: value }));
  };

  return (
    <section className="py-12 md:py-16 bg-muted/30" id="mini-demo">
      <div className="container max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary font-semibold text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            Try It Free — No Signup Required
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            See Your Numbers in Seconds
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Enter your numbers and get instant financial insights. Full analysis unlocked after signup.
          </p>
        </div>

        {/* Demo Card */}
        <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
          {/* Form Section */}
          <form id="mini-demo-form" onSubmit={handleSubmit} className="p-5 md:p-8 space-y-5">
            {/* Business Idea */}
            <div className="space-y-2">
              <Label htmlFor="demo-idea" className="flex items-center gap-2 text-sm font-medium">
                <Brain className="w-4 h-4 text-muted-foreground" />
                Your Business Idea
              </Label>
              <Textarea
                id="demo-idea"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="e.g., Coffee shop in downtown Denver with specialty drinks and remote work focus..."
                rows={2}
                disabled={isLoading || showResults}
                className="resize-none"
                maxLength={500}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Minimum 10 characters</span>
                <span>{idea.length}/500</span>
              </div>
            </div>

            {/* Location + Industry Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="demo-location" className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Location
                </Label>
                <Input
                  id="demo-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Denver, Colorado"
                  disabled={isLoading || showResults}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  Industry (Optional)
                </Label>
                <Select value={industry} onValueChange={setIndustry} disabled={isLoading || showResults}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind.value} value={ind.value}>
                        {ind.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Financial Inputs (NEW - from spec) */}
            <div className="pt-2 border-t border-border">
              <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Enter Your Numbers
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <CurrencyInput
                  id="investment"
                  label="Initial Investment"
                  icon={<DollarSign className="w-3.5 h-3.5" />}
                  value={financials.investment}
                  onChange={updateFinancial('investment')}
                  disabled={isLoading || showResults}
                  placeholder="10,000"
                />
                <CurrencyInput
                  id="revenue"
                  label="Monthly Revenue"
                  icon={<TrendingUp className="w-3.5 h-3.5" />}
                  value={financials.monthlyRevenue}
                  onChange={updateFinancial('monthlyRevenue')}
                  disabled={isLoading || showResults}
                  placeholder="15,000"
                />
                <CurrencyInput
                  id="costs"
                  label="Monthly Costs"
                  icon={<Receipt className="w-3.5 h-3.5" />}
                  value={financials.monthlyCosts}
                  onChange={updateFinancial('monthlyCosts')}
                  disabled={isLoading || showResults}
                  placeholder="5,000"
                />
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            {!showResults && (
              <Button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="w-full h-12 text-base font-semibold gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    See My Preview Numbers
                  </>
                )}
              </Button>
            )}
          </form>

          {/* Results Section */}
          {showResults && (
            <div className="border-t border-border">
              <div className="p-5 md:p-8 bg-muted/30 space-y-6">
                {/* Metrics Display */}
                <MetricsDisplay 
                  metrics={metrics} 
                  industryDetected={industryDetected}
                />

                {/* Locked Features Tease */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    🔒 Unlock with free signup:
                  </p>
                  <LockedFeaturesTease />
                </div>

                {/* CTA Section */}
                <UnlockCTA idea={idea} location={location} />

                {/* Try Another */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Try different numbers
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Trust Indicator */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          1 free preview per hour • No credit card required • Full report in under 2 minutes
        </p>
      </div>
    </section>
  );
}
