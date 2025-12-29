import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  BarChart3, 
  FileText, 
  TrendingUp, 
  Target, 
  Zap, 
  CheckCircle2,
  ArrowRight,
  Star,
  Users,
  Building2,
  ChevronRight,
  Moon,
  Sun
} from 'lucide-react';

export default function Landing() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
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

  const features = [
    {
      icon: BarChart3,
      title: 'Financial Projections',
      description: 'Get accurate ROI, payback period, and revenue forecasts based on real market data.',
    },
    {
      icon: FileText,
      title: 'Complete Business Plan',
      description: 'Receive a step-by-step launch roadmap with specific milestones and actions.',
    },
    {
      icon: TrendingUp,
      title: 'Marketing Strategy',
      description: 'Discover optimal customer acquisition channels with CAC/LTV calculations.',
    },
    {
      icon: Target,
      title: 'Market Analysis',
      description: 'Understand your competition, market size, and growth opportunities.',
    },
    {
      icon: Zap,
      title: 'AI-Powered Insights',
      description: 'Leverage advanced AI to uncover hidden opportunities and risks.',
    },
    {
      icon: Building2,
      title: 'Location Intelligence',
      description: 'Analysis tailored to your specific geographic market and demographics.',
    },
  ];

  const testimonials = [
    {
      name: 'Alex Chen',
      role: 'Startup Founder',
      company: 'TechFlow',
      content: 'This tool saved me weeks of research. The financial projections were surprisingly accurate.',
      rating: 5,
    },
    {
      name: 'Maria Rodriguez',
      role: 'Business Consultant',
      company: 'Strategy Partners',
      content: 'I use this for every new client. The market analysis is comprehensive and actionable.',
      rating: 5,
    },
    {
      name: 'David Kim',
      role: 'Angel Investor',
      company: 'Venture Capital',
      content: 'Perfect for quickly evaluating startup pitches. Helps identify viable opportunities.',
      rating: 5,
    },
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for trying out the platform',
      features: ['3 analyses per month', 'Basic financial projections', 'Business plan outline', 'Email support'],
      cta: 'Get Started',
      highlighted: false,
    },
    {
      name: 'Pro',
      price: '$29',
      period: 'per month',
      description: 'For serious entrepreneurs',
      features: [
        'Unlimited analyses',
        'Advanced financial modeling',
        'Complete business plans',
        'Marketing strategy',
        'PDF export',
        'Priority support',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: '$99',
      period: 'per month',
      description: 'For teams and agencies',
      features: [
        'Everything in Pro',
        'Team collaboration',
        'API access',
        'Custom branding',
        'Dedicated account manager',
        'SLA guarantee',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  const stats = [
    { value: '10,000+', label: 'Analyses Generated' },
    { value: '94%', label: 'Accuracy Rate' },
    { value: '2 min', label: 'Average Analysis Time' },
    { value: '4.9/5', label: 'User Rating' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground">BizAnalyzer</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Toggle theme"
              >
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

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="relative container max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4" />
              AI-Powered Business Intelligence
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
              Turn Your Business Idea Into
              <span className="text-primary block">Actionable Intelligence</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Get comprehensive financial projections, market analysis, and a complete business plan 
              in under 2 minutes. Powered by AI, grounded in real data.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link to="/app">
                <Button size="lg" className="gap-2 text-lg px-8 py-6">
                  Analyze Your Idea Free
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                  See How It Works
                </Button>
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-border">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
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
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-8 rounded-2xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg"
              >
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

      {/* Social Proof / Testimonials */}
      <section id="testimonials" className="py-20 md:py-32">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Trusted by Entrepreneurs Worldwide
            </h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of founders, consultants, and investors who use our platform.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="p-8 rounded-2xl border border-border bg-card"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-warning fill-warning" />
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}, {testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-8 rounded-2xl border ${
                  plan.highlighted 
                    ? 'border-primary bg-card shadow-xl scale-105' 
                    : 'border-border bg-card'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-foreground">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/app">
                  <Button 
                    className="w-full" 
                    variant={plan.highlighted ? 'default' : 'outline'}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

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
                Join over 10,000 entrepreneurs who have already analyzed their ideas. 
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
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <span className="text-lg font-bold text-foreground">BizAnalyzer</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} BizAnalyzer. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
