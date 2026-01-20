import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, BarChart3, FileText, TrendingUp, Target, Zap, CheckCircle2, ArrowRight, Building2, ChevronRight, Moon, Sun, Loader2, Calculator, FileDown, DollarSign, AlertTriangle, Play } from 'lucide-react';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentLinks } from '@/hooks/useStripeCheckout';
import { StructuredData } from '@/components/seo/StructuredData';
import { FAQSection } from '@/components/landing/FAQSection';
export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { redirectToPayment, isLoading: checkoutLoading } = usePaymentLinks();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || !localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handlePlanClick = (planName: string) => {
    console.log('[Landing] Plan clicked:', planName);
    console.log('[Landing] User authenticated:', !!user);
    if (planName === 'Free') {
      console.log('[Landing] Free plan - navigating to app');
      navigate('/app');
      return;
    }
    // Only Plus plan available now (Pro tier removed)
    const plan = 'plus' as const;
    setLoadingPlan(planName);
    console.log('[Landing] Processing plan:', plan);
    if (user) {
      console.log('[Landing] User is authenticated - redirecting to Payment Link');
      redirectToPayment(plan, user.id, user.email || undefined);
    } else {
      console.log('[Landing] User not authenticated - saving plan to localStorage');
      localStorage.setItem('pending_checkout_plan', plan);
      console.log('[Landing] Navigating to auth page');
      navigate('/auth');
    }
  };

  const features = [{
    icon: BarChart3,
    title: 'Financial Projections',
    description: 'Get accurate ROI, payback period, and revenue forecasts based on real market data.'
  }, {
    icon: FileText,
    title: 'Complete Business Plan',
    description: 'Receive a step-by-step launch roadmap with specific milestones and actions.'
  }, {
    icon: TrendingUp,
    title: 'Marketing Strategy',
    description: 'Discover optimal customer acquisition channels with CAC/LTV calculations.'
  }, {
    icon: Target,
    title: 'Market Analysis',
    description: 'Understand your competition, market size, and growth opportunities.'
  }, {
    icon: Zap,
    title: 'AI-Powered Insights',
    description: 'Leverage advanced AI to uncover hidden opportunities and risks.'
  }, {
    icon: Building2,
    title: 'Location Intelligence',
    description: 'Analysis tailored to your specific geographic market and demographics.'
  }];

  // Beta feedback section instead of fake testimonials
  const betaFeatures = [
    {
      icon: Sparkles,
      title: 'AI-Powered Analysis',
      description: 'Get comprehensive business insights powered by advanced AI in under 2 minutes.'
    },
    {
      icon: Target,
      title: 'Location Intelligence',
      description: 'Analysis tailored to your specific geographic market, starting with Denver.'
    },
    {
      icon: TrendingUp,
      title: 'Financial Modeling',
      description: 'Professional-grade projections including ROI, payback period, and cash flow.'
    }
  ];

  const pricingPlans = [{
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out the platform',
    features: ['3 analyses per month', 'Basic financial projections', 'Business plan outline', 'Email support'],
    cta: 'Get Started',
    highlighted: false
  }, {
    name: 'Plus',
    price: '$17',
    period: 'per month',
    description: 'For serious entrepreneurs',
    features: ['14-day free trial', 'Unlimited analyses', 'Advanced financial modeling', 'Complete business plans', 'Marketing strategy', 'Document intelligence', 'PDF export', 'Custom branding', 'Priority support'],
    cta: 'Start Free Trial',
    highlighted: true,
    hasTrial: true
  }];

  // Real stats - updated to reflect actual platform state
  const stats = [{
    value: '1,000+',
    label: 'Industry Benchmarks'
  }, {
    value: '12',
    label: 'Financial Variables'
  }, {
    value: '<2 min',
    label: 'Analysis Time'
  }, {
    value: '3',
    label: 'Scenario Types'
  }];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Structured Data for SEO */}
      <StructuredData />
      
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">AIWMC Quantis<sup className="text-xs align-super">™</sup></span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-accent transition-colors" aria-label="Toggle theme">
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <Link to="/auth">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link to="/app">
                <Button size="sm" className="gap-2">
                  Try Free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Conversion Optimized */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-background" />
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-primary/6 rounded-full blur-3xl" />
        
        <div className="relative container max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Clear Value Proposition */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6 leading-tight tracking-tight">
              AI Business Analysis
              <span className="text-primary block mt-1">In Minutes, Not Weeks</span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-6 md:mb-8 leading-relaxed">
              Get a complete AI-powered report — revenue projections, risks, and next steps. No spreadsheets needed.
            </p>

            {/* Primary CTA - Dominant */}
            <div className="flex flex-col items-center gap-3 mb-8 md:mb-10">
              <Link to="/app" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto gap-2 text-base sm:text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                  <Play className="w-5 h-5" />
                  Get My Free Analysis
                </Button>
              </Link>
              <p className="text-xs sm:text-sm text-muted-foreground">
                No signup required • Results in 2 minutes • Instant PDF
              </p>
            </div>

            {/* Quick Benefits - Above the fold */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 md:mb-12 max-w-2xl mx-auto">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50">
                <div className="p-2 rounded-full bg-success/10">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <span className="text-sm font-medium text-foreground text-left">Validate your idea</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50">
                <div className="p-2 rounded-full bg-success/10">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <span className="text-sm font-medium text-foreground text-left">See unit economics</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border/50">
                <div className="p-2 rounded-full bg-success/10">
                  <AlertTriangle className="w-5 h-5 text-success" />
                </div>
                <span className="text-sm font-medium text-foreground text-left">Know risks first</span>
              </div>
            </div>

            {/* Simple 3-Step Flow */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 py-8 border-y border-border bg-muted/30 rounded-xl px-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">1</div>
                <span className="text-sm font-medium text-foreground">Describe your idea</span>
              </div>
              <ChevronRight className="hidden sm:block w-5 h-5 text-muted-foreground" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">2</div>
                <span className="text-sm font-medium text-foreground">AI analyzes data</span>
              </div>
              <ChevronRight className="hidden sm:block w-5 h-5 text-muted-foreground" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">3</div>
                <span className="text-sm font-medium text-foreground">Get executive report</span>
              </div>
            </div>

            {/* Stats - Compact */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 md:pt-12">
              {stats.map(stat => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Validate Your Idea
            </h2>
            <p className="text-lg text-muted-foreground">
              Our AI analyzes your business concept and delivers actionable insights 
              that would take consultants weeks to produce.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(feature => (
              <div key={feature.title} className="group p-8 rounded-2xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
                <div className="p-4 rounded-xl bg-primary/10 w-fit mb-6 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Why Choose Us Section (replacing testimonials) */}
      <section id="testimonials" className="py-20 md:py-32">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success text-sm font-medium mb-6">
              🚀 Now in Beta
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Business Owners Choose Us
            </h2>
            <p className="text-lg text-muted-foreground">
              Get professional-grade business analysis without the consultant fees.
              Join our growing community of entrepreneurs.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {betaFeatures.map(feature => (
              <div key={feature.title} className="p-8 rounded-2xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all duration-300">
                <div className="p-4 rounded-xl bg-primary/10 w-fit mb-6">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              Be among the first to try our platform and help shape its future.
            </p>
            <Link to="/app">
              <Button size="lg" variant="outline" className="gap-2">
                Try Free Beta Access
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-32 bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Start free and upgrade as you grow. No hidden fees.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {pricingPlans.map(plan => (
              <div key={plan.name} className={`relative p-8 rounded-2xl border ${plan.highlighted ? 'border-primary bg-card shadow-xl scale-105' : 'border-border bg-card'}`}>
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{plan.name}</h3>
                  {'hasTrial' in plan && plan.hasTrial && (
                    <span className="inline-block px-3 py-1 text-xs font-medium bg-success/10 text-success rounded-full mb-2">
                      14-day free trial
                    </span>
                  )}
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-center gap-3 text-foreground">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.highlighted ? 'default' : 'outline'} 
                  size="lg" 
                  onClick={() => handlePlanClick(plan.name)} 
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan === plan.name ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-primary p-12 md:p-20 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Ready to Validate Your Business Idea?
              </h2>
              <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
                Join our growing community of entrepreneurs using AI-powered analysis. 
                Start for free, no credit card required.
              </p>
              <Link to="/app">
                <Button size="lg" variant="secondary" className="gap-2 text-lg px-8 py-6">
                  Start Your Free Analysis
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">AIWMC Quantis™</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <a href="mailto:support@aiwmcquantis.com" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} AIWMC Quantis™. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border md:hidden z-50 safe-area-pb">
        <Link to="/app" className="block">
          <Button size="lg" className="w-full gap-2 text-base py-6 shadow-xl">
            <Play className="w-5 h-5" />
            Get My Free Analysis
          </Button>
        </Link>
      </div>

      {/* Bottom padding for mobile sticky CTA */}
      <div className="h-20 md:hidden" />
    </div>
  );
}
