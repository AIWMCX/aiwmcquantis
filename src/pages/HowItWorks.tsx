import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileInput, Calculator, BarChart3, Shield, TrendingUp, Target, AlertTriangle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';
import { StructuredData } from '@/components/seo/StructuredData';
import { Footer } from '@/components/layout/Footer';

const STEPS = [
{
  step: 1,
  icon: FileInput,
  title: 'Describe Your Business Idea',
  description: 'Enter your business concept and target location. No financial background required — just your idea in plain language.',
  example: '"Coffee shop with remote work focus in Denver, Colorado"',
  color: 'bg-primary/10 text-primary'
},
{
  step: 2,
  icon: Calculator,
  title: 'AI Runs Financial Stress Tests',
  description: 'Our deterministic engine calculates 12 financial variables using 1,000+ industry benchmarks, adjusted for your specific city.',
  example: 'Revenue projections, cost structure, unit economics, break-even analysis',
  color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
},
{
  step: 3,
  icon: BarChart3,
  title: 'Get Your Risk Report & Action Plan',
  description: 'Receive 3-scenario projections (conservative, realistic, optimistic), risk flags, and a clear action plan — in under 60 seconds.',
  example: '$4,200/mo profit, 7.1 months payback, 168% ROI, 3 risk flags identified',
  color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
}];


const REPORT_SECTIONS = [
{ icon: TrendingUp, title: 'Revenue & Profit Projections', desc: '3 scenarios with monthly breakdown, gross margins, and net profit calculations.' },
{ icon: AlertTriangle, title: 'Risk Assessment', desc: 'Identified vulnerabilities — fragile assumptions, market risks, and financial red flags.' },
{ icon: Target, title: 'Unit Economics', desc: 'CAC, LTV, LTV/CAC ratio, payback period, and churn impact — calculated from benchmarks.' },
{ icon: Shield, title: 'Action Plan', desc: 'What to cut, where to double down, and whether to proceed — based on your numbers.' }];


const FAQ_ITEMS = [
{
  q: 'How is this different from ChatGPT?',
  a: 'Quantis uses a deterministic financial engine with real industry benchmarks — not generative text. Every number is calculated from verified data, not hallucinated. ChatGPT gives opinions; Quantis gives math.'
},
{
  q: 'What data do you use for projections?',
  a: '1,000+ industry benchmarks covering 50+ sectors, real CAC/LTV/churn data, and cost indices for 50+ global cities. No synthetic or made-up data.'
},
{
  q: 'Can I trust the projections?',
  a: 'Projections are estimates, not guarantees. We provide 3 scenarios and confidence scores so you can calibrate. Every metric is tagged as "computed", "benchmark", or "estimated" for transparency.'
},
{
  q: 'Do I need a business plan first?',
  a: 'No. Just your idea and location. The engine builds the financial model from benchmarks and generates the full analysis automatically.'
},
{
  q: 'What if my industry is niche?',
  a: 'We cover 50+ industries. For niche businesses, the AI maps your idea to the closest benchmark cluster and flags the confidence level so you know the margin of uncertainty.'
}];


export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSEO
        title="How Quantis Works — AI Financial Stress-Testing"
        description="3 steps: describe your idea, AI stress-tests 12 financial variables against 1,000+ benchmarks, get your risk report with 3-scenario projections — in 90 seconds."
        canonical="/how-it-works"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: 'How to Validate a Business Idea with AIWMC Quantis',
          description: 'Stress-test your business model in 60 seconds using AI-powered financial analysis.',
          totalTime: 'PT1M',
          step: STEPS.map((s) => ({
            '@type': 'HowToStep',
            position: s.step,
            name: s.title,
            text: s.description
          }))
        }} />

      <StructuredData
        includeBreadcrumbs
        breadcrumbs={[
        { name: 'Home', url: '/' },
        { name: 'How It Works', url: '/how-it-works' }]
        } />


      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-lg sm:text-xl font-bold text-foreground">AIWMC™ Quantis</Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Home</Link>
              <Link to="/use-cases" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Use Cases</Link>
              <Link to="/examples" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Examples</Link>
              <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
            </div>
            <Link to="/app">
              <Button size="sm" className="gap-2 min-h-[48px] px-5 text-sm font-semibold">
                Try It Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container max-w-5xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <div className="pt-6 pb-2">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>

        {/* Hero */}
        <section className="py-12 md:py-20 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            How AIWMC™ Quantis Validates Your Business Model
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Enter your business idea and location. Get revenue projections, risk flags, and an action plan — powered by 1,000+ industry benchmarks, in under 60 seconds.
          </p>
          <Link to="/app">
            <Button size="lg" className="gap-2 py-6 px-8 text-base">
              Try It Free — 60 Seconds <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </section>

        {/* 3 Steps */}
        <section className="py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-12">
            3 Steps to Financial Clarity
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, idx) =>
            <div key={step.step} className="relative">
                <div className="p-6 rounded-2xl border border-border bg-card h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-xl ${step.color}`}>
                      <step.icon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">Step {step.step}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                  <p className="text-muted-foreground mb-4">{step.description}</p>
                  <p className="text-sm text-primary font-medium italic">{step.example}</p>
                </div>
                {idx < STEPS.length - 1 &&
              <div className="hidden md:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-muted-foreground/40" />
                  </div>
              }
              </div>
            )}
          </div>
        </section>

        {/* What's Inside Your Report */}
        <section className="py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
            What's Inside Your Report
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            Every analysis includes four sections — the same framework VCs and accelerators use, made accessible to founders.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {REPORT_SECTIONS.map(({ icon: Icon, title, desc }) =>
            <div key={title} className="p-6 rounded-2xl border border-border bg-card hover:border-primary/20 transition-colors">
                <Icon className="w-6 h-6 text-primary mb-3" />
                <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            )}
          </div>
          <div className="text-center mt-8">
            <Link to="/examples/coffee-shop-denver" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
              See a complete sample report <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {FAQ_ITEMS.map(({ q, a }) =>
            <details key={q} className="group p-5 rounded-xl border border-border bg-card">
                <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                  {q}
                  <span className="ml-2 text-muted-foreground group-open:rotate-45 transition-transform text-xl">+</span>
                </summary>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">{a}</p>
              </details>
            )}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-12 md:py-16">
          <div className="rounded-2xl bg-primary p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
            <div className="relative">
              <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-3">
                Ready to Stress-Test Your Idea?
              </h2>
              <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
                Revenue projections, risk flags, and an action plan — free, no credit card, results in under 60 seconds.
              </p>
              <Link to="/app">
                <Button size="lg" variant="secondary" className="gap-2 py-6 px-8">
                  See My Numbers — Free <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>);

}