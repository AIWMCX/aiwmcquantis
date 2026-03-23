import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Lightbulb, Briefcase, Building2, CheckCircle2, Target, TrendingUp, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';
import { StructuredData } from '@/components/seo/StructuredData';
import { Footer } from '@/components/layout/Footer';

const PERSONAS = [
  {
    id: 'founders',
    icon: Lightbulb,
    title: 'For Early-Stage Founders',
    subtitle: 'Validate before you build',
    description: 'You have an idea and limited runway. Before writing code or signing a lease, you need to know: Can this business actually make money? What are the real risks? How long until profitability?',
    benefits: [
      'Test multiple ideas in minutes — not weeks',
      'Get realistic revenue projections based on industry benchmarks',
      'Identify deal-breaking risks before investing time and money',
      'Build confidence with data, not guesswork',
    ],
    example: { slug: 'coffee-shop-denver', label: 'Coffee Shop in Denver', profit: '$4,200/mo' },
    cta: 'Validate My Idea',
  },
  {
    id: 'consultants',
    icon: Briefcase,
    title: 'For Business Consultants',
    subtitle: 'Scale your client analysis',
    description: 'Your clients need financial clarity fast. Instead of spending 20+ hours on each feasibility study, generate comprehensive analyses in minutes — then add your strategic expertise on top.',
    benefits: [
      'Deliver 10x more client analyses without hiring',
      'White-label reports with your branding (Plus plan)',
      'Professional PDF exports ready for client presentations',
      'Industry benchmarks that strengthen your recommendations',
    ],
    example: { slug: 'consulting-firm-new-york', label: 'Consulting Firm in NYC', profit: '$18,500/mo' },
    cta: 'Scale My Practice',
  },
  {
    id: 'operators',
    icon: Building2,
    title: 'For Operators & Franchisees',
    subtitle: 'Stress-test expansion plans',
    description: 'You run an existing business and are considering expansion — new locations, new product lines, or new markets. You need to know if the numbers work before committing capital.',
    benefits: [
      'Compare new locations side-by-side with cost-adjusted projections',
      'Stress-test scenarios: What if costs spike 20%? Revenue drops 30%?',
      'Get location-specific data for 50+ cities worldwide',
      'Make data-driven expansion decisions — not gut-feel ones',
    ],
    example: { slug: 'restaurant-miami', label: 'Restaurant in Miami', profit: '$8,900/mo' },
    cta: 'Stress-Test My Plan',
  },
];

const WHAT_YOU_GET = [
  { icon: TrendingUp, label: '3-Scenario Projections', desc: 'Conservative, realistic, and optimistic financial models' },
  { icon: Shield, label: 'Risk Assessment', desc: 'Identified vulnerabilities and mitigation strategies' },
  { icon: Target, label: 'Unit Economics', desc: 'CAC, LTV, payback period, and margin analysis' },
  { icon: CheckCircle2, label: 'Action Plan', desc: 'What to cut, where to invest, whether to proceed' },
];

export default function UseCases() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSEO
        title="Who Uses Quantis — Founders, Consultants & Builders"
        description="Quantis helps founders validate ideas, consultants scale client analysis, and operators stress-test expansion plans. See how it serves your role."
        canonical="/use-cases"
      />
      <StructuredData
        includeBreadcrumbs
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Use Cases', url: '/use-cases' },
        ]}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-lg sm:text-xl font-bold text-foreground">AIWMC Quantis</Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Home</Link>
              <Link to="/how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
              <Link to="/examples" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Examples</Link>
              <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
            </div>
            <Link to="/app">
              <Button size="sm" className="gap-2 min-h-[48px] px-5 text-sm font-semibold">
                Start Free Analysis → <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container max-w-5xl mx-auto px-4 sm:px-6">
        <div className="pt-6 pb-2">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>

        {/* Hero */}
        <section className="py-12 md:py-20 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Who Uses AIWMC Quantis
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Whether you're validating your first idea or stress-testing an expansion plan, Quantis gives you the financial clarity to decide with confidence.
          </p>
        </section>

        {/* Persona Cards */}
        <section className="py-8 space-y-12">
          {PERSONAS.map((persona, idx) => (
            <div
              key={persona.id}
              id={persona.id}
              className={`rounded-2xl border border-border bg-card p-6 md:p-10 ${idx === 0 ? 'border-primary/30' : ''}`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <persona.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{persona.title}</h2>
                  <p className="text-sm text-muted-foreground">{persona.subtitle}</p>
                </div>
              </div>

              <p className="text-muted-foreground mb-6 max-w-2xl">{persona.description}</p>

              <ul className="space-y-3 mb-6">
                {persona.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-4">
                <Link to="/app">
                  <Button className="gap-2 min-h-[48px]">
                    {persona.cta} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link
                  to={`/examples/${persona.example.slug}`}
                  className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  See example: {persona.example.label} ({persona.example.profit}) <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </section>

        {/* What You Get */}
        <section className="py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
            What You Get
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {WHAT_YOU_GET.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="p-5 rounded-xl border border-border bg-card">
                <Icon className="w-5 h-5 text-primary mb-2" />
                <h3 className="font-semibold text-foreground mb-1">{label}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-12 md:py-16">
          <div className="rounded-2xl bg-primary p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
            <div className="relative">
              <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-3">
                Your Idea Deserves Real Numbers
              </h2>
              <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
                Free, no credit card, results in under 60 seconds.
              </p>
              <Link to="/app">
                <Button size="lg" variant="secondary" className="gap-2 py-6 px-8">
                  Start Free Analysis → <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
