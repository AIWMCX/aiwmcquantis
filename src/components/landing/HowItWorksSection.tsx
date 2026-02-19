import React from 'react';
import { Calculator, FileInput, BarChart3, ArrowRight, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ComparisonTable } from './ComparisonTable';

const processSteps = [
  {
    step: 1,
    icon: FileInput,
    title: 'You Provide',
    description: 'Business idea, location, and optional financial inputs',
    color: 'bg-primary/10 text-primary',
  },
  {
    step: 2,
    icon: Calculator,
    title: 'Engine Calculates',
    description: '12-variable system + 1,000+ industry benchmarks',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    step: 3,
    icon: BarChart3,
    title: 'You Receive',
    description: '3 scenarios, ROI, payback period, and action plan',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 text-primary font-semibold text-sm mb-6">
            <Calculator className="w-4 h-4" />
            Real Math, Real Results
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How Our Analysis Engine Works
          </h2>
          <p className="text-lg text-muted-foreground">
            Powered by a 12-variable financial system, not just AI guesswork. 
            Every calculation is transparent and verifiable.
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {processSteps.map((step, index) => (
            <div key={step.step} className="relative">
              <div className="p-6 rounded-2xl border border-border bg-card hover:bg-accent/30 transition-all duration-300">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-xl ${step.color}`}>
                    <step.icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Step {step.step}</span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
              {index < processSteps.length - 1 && (
                <div className="hidden md:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-6 h-6 text-muted-foreground/50" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="mb-12">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-foreground mb-2">Why We're Different</h3>
            <p className="text-muted-foreground">
              More than AI — a complete financial analysis engine
            </p>
          </div>
          <ComparisonTable />
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/app">
            <Button size="lg" className="gap-2">
              Start Analysis — Only 2 Fields Required
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
