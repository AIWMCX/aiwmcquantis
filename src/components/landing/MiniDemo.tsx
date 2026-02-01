import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, MapPin, Sparkles, Loader2, TrendingUp, Clock, Gauge, ArrowRight, Lock, FileText, Users, DollarSign, BarChart3, AlertTriangle, Calculator, LineChart, Database, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { trackEvent, trackCtaClick } from '@/lib/analytics';

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

// Locked features to tease
const LOCKED_FEATURES = [
  { icon: BarChart3, title: '3 Scenario Modeling', desc: 'Pessimistic/Base/Optimistic' },
  { icon: AlertTriangle, title: 'Risk Analysis', desc: 'Identify threats early' },
  { icon: Calculator, title: 'Unit Economics', desc: 'CAC, LTV, margins' },
  { icon: LineChart, title: 'Break-even Calculator', desc: 'Timeline to profitability' },
  { icon: FileText, title: 'PDF Business Plan', desc: 'Investor-ready reports' },
  { icon: Database, title: 'Industry Benchmarks', desc: 'Compare vs 10,000+ businesses' },
];

interface PreviewResult {
  monthly_profit: number;
  payback_months: number;
  confidence_score: number;
  industry_detected: string;
}

export function MiniDemo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [idea, setIdea] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasAutoSubmitted = useRef(false);

  // State for industry selector
  const [industry, setIndustry] = useState('');

  const isFormValid = idea.trim().length >= 10 && location.trim().length >= 2;

  // Handle hero form prefill
  const handleHeroPrefill = useCallback(() => {
    const prefillData = sessionStorage.getItem('hero_prefill');
    if (prefillData && !hasAutoSubmitted.current) {
      try {
        const { idea: prefillIdea, location: prefillLocation, autoSubmit } = JSON.parse(prefillData);
        if (prefillIdea && prefillLocation) {
          setIdea(prefillIdea);
          setLocation(prefillLocation);
          
          // Clear the prefill data
          sessionStorage.removeItem('hero_prefill');
          
          // Auto-submit if requested and form is valid
          if (autoSubmit && prefillIdea.trim().length >= 10 && prefillLocation.trim().length >= 2) {
            hasAutoSubmitted.current = true;
            // Small delay to ensure state is set
            setTimeout(() => {
              const form = document.getElementById('mini-demo-form') as HTMLFormElement;
              if (form) {
                form.requestSubmit();
              }
            }, 100);
          }
        }
      } catch (e) {
        console.error('Error parsing hero prefill:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Listen for hero prefill event
    window.addEventListener('hero-prefill-ready', handleHeroPrefill);
    
    // Also check on mount in case event already fired
    handleHeroPrefill();
    
    return () => {
      window.removeEventListener('hero-prefill-ready', handleHeroPrefill);
    };
  }, [handleHeroPrefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;

    setIsLoading(true);
    setError(null);
    trackEvent('mini_demo_submit', { idea_length: idea.length, location });

    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-preview', {
        body: { idea: idea.slice(0, 500), location: location.slice(0, 100) },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Preview failed');
      }

      if (data?.success && data?.data) {
        setResult(data.data);
        trackEvent('mini_demo_success', { industry: data.data.industry_detected });
      } else {
        throw new Error(data?.error || 'Unable to generate preview');
      }
    } catch (err: any) {
      console.error('Mini demo error:', err);
      
      // Rate limit handling
      if (err.message?.includes('rate limit') || err.message?.includes('too many')) {
        setError('You\'ve reached the preview limit. Sign up for unlimited analyses!');
      } else {
        setError('Preview temporarily unavailable. Try the full analysis instead!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetFullReport = () => {
    // Store preview data for pre-fill
    if (idea && location) {
      localStorage.setItem('quantis_prefill', JSON.stringify({ idea, location }));
    }
    trackCtaClick('mini_demo_full_report', 'mini_demo');
    navigate('/app');
  };

  // Get verdict based on profit
  const getVerdict = (profit: number) => {
    if (profit >= 10000) return { label: 'Promising', color: 'text-success', bg: 'bg-success/10' };
    if (profit >= 3000) return { label: 'Moderate', color: 'text-amber-500', bg: 'bg-amber-500/10' };
    return { label: 'Needs Work', color: 'text-destructive', bg: 'bg-destructive/10' };
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
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
            Get an instant preview of your business potential. Full report with detailed plans available after signup.
          </p>
        </div>

        {/* Demo Card */}
        <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
          {/* Form Section */}
          <form id="mini-demo-form" onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5">
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
                rows={3}
                disabled={isLoading || !!result}
                className="resize-none"
                maxLength={500}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Minimum 10 characters</span>
                <span>{idea.length}/500</span>
              </div>
            </div>

            {/* Location */}
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
                disabled={isLoading || !!result}
                maxLength={100}
              />
            </div>

            {/* Industry Selector (Optional) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Industry (Optional)
              </Label>
              <Select value={industry} onValueChange={setIndustry} disabled={isLoading || !!result}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your industry..." />
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

            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            {!result && (
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
          {result && (
            <div className="border-t border-border">
              {/* Preview Metrics */}
              <div className="p-6 md:p-8 bg-muted/30">
                {/* Verdict Badge */}
                {(() => {
                  const verdict = getVerdict(result.monthly_profit);
                  return (
                    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4", verdict.bg)}>
                      <Sparkles className={cn("w-4 h-4", verdict.color)} />
                      <span className={cn("text-sm font-semibold", verdict.color)}>
                        {verdict.label} Business Model
                      </span>
                    </div>
                  );
                })()}

                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  Quick Analysis Results
                </h3>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {/* Monthly Profit */}
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-success" />
                      <span className="text-xs text-muted-foreground">Est. Profit/mo</span>
                    </div>
                    <p className={cn("text-xl md:text-2xl font-bold", result.monthly_profit >= 0 ? "text-success" : "text-destructive")}>
                      {formatCurrency(result.monthly_profit)}
                    </p>
                  </div>

                  {/* Payback Period */}
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Payback</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold text-foreground">
                      {result.payback_months} mo
                    </p>
                  </div>

                  {/* Confidence */}
                  <div className="p-4 rounded-xl bg-card border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <Gauge className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-muted-foreground">Confidence</span>
                    </div>
                    <p className="text-xl md:text-2xl font-bold text-foreground">
                      {result.confidence_score}%
                    </p>
                  </div>
                </div>

                {/* Industry Badge */}
                <div className="text-sm text-muted-foreground mb-6">
                  Industry detected: <span className="font-medium text-foreground">{result.industry_detected}</span>
                </div>

                {/* Locked Feature Teasers - Enhanced grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                  {LOCKED_FEATURES.map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="p-4 rounded-xl bg-muted/50 border border-border relative overflow-hidden group hover:border-primary/30 transition-colors">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Lock className="w-4 h-4 text-muted-foreground mb-2" />
                      <p className="text-sm font-medium text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  ))}
                </div>

                {/* Prominent CTA Card */}
                <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground mb-2">Unlock Your Complete Business Report</p>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-success" />
                          <span>3 scenario projections</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-primary" />
                          <span>Marketing strategy</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-amber-500" />
                          <span>PDF export</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Shareable links</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleGetFullReport}
                    className="flex-1 h-12 text-base font-semibold gap-2"
                  >
                    Sign Up Free & See Full Analysis
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Link to="/auth" className="flex-1">
                    <Button variant="outline" className="w-full h-12 text-base gap-2">
                      Sign In
                    </Button>
                  </Link>
                </div>

                {/* Reassurance */}
                <p className="text-center text-xs text-muted-foreground mt-4">
                  Your data is saved • Continue exactly where you left off
                </p>

                {/* Try Another */}
                <button
                  onClick={() => {
                    setResult(null);
                    setIdea('');
                    setLocation('');
                    setIndustry('');
                  }}
                  className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
