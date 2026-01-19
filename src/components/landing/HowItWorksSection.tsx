import React, { useState } from 'react';
import { Calculator, FileInput, BarChart3, ArrowRight, Lightbulb, Shield, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { VariableCard } from './VariableCard';
import { FormulaDisplay } from './FormulaDisplay';
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

const variableGroups = [
  {
    name: 'Revenue',
    color: 'emerald',
    variables: [
      { code: 'P', name: 'Price', description: 'Average price per product or service' },
      { code: 'N', name: 'Customers', description: 'Number of paying customers per month' },
      { code: 'F', name: 'Frequency', description: 'How often customers buy (times/month)' },
      { code: 'U', name: 'Upsell', description: 'Additional revenue per customer' },
    ],
  },
  {
    name: 'Costs',
    color: 'amber',
    variables: [
      { code: 'C', name: 'COGS', description: 'Direct cost to produce your product' },
      { code: 'O', name: 'Operating', description: 'Rent, salaries, utilities, etc.' },
      { code: 'M', name: 'Marketing', description: 'Monthly marketing spend' },
      { code: 'A', name: 'CAC', description: 'Cost to acquire one new customer' },
    ],
  },
  {
    name: 'Investment',
    color: 'blue',
    variables: [
      { code: 'I', name: 'Initial', description: 'Startup capital needed to launch' },
      { code: 'K', name: 'CapEx', description: 'Equipment, renovations, etc.' },
    ],
  },
  {
    name: 'Retention',
    color: 'purple',
    variables: [
      { code: 'L', name: 'LTV', description: 'Total revenue from one customer' },
      { code: 'H', name: 'Churn', description: '% of customers lost per month' },
    ],
  },
];

const formulas = [
  {
    name: 'LTV',
    formula: 'Price × Orders/Month × Lifetime',
    example: '$50 × 2 × 24 = $2,400',
    description: 'Customer Lifetime Value',
  },
  {
    name: 'Payback',
    formula: 'Investment / Monthly Profit',
    example: '$30,000 / $3,500 = 8.6 months',
    description: 'Time to recoup investment',
  },
  {
    name: 'ROI',
    formula: '(Profit × 12 / Investment) × 100%',
    example: '($3,500 × 12 / $30,000) × 100% = 140%',
    description: 'Return on Investment',
  },
  {
    name: 'Break-Even',
    formula: 'Fixed Costs / (1 - Variable Cost %)',
    example: '$5,000 / (1 - 0.4) = $8,333/mo',
    description: 'Revenue needed to cover costs',
  },
  {
    name: 'Net Margin',
    formula: '(Profit / Revenue) × 100%',
    example: '($3,500 / $15,000) × 100% = 23%',
    description: 'Profit as percentage of revenue',
  },
];

const trustIndicators = [
  {
    icon: Lightbulb,
    title: 'See Every Formula',
    description: 'Full calculation audit in every report',
  },
  {
    icon: BarChart3,
    title: 'Real Industry Data',
    description: '1,000+ benchmarks from Kerry Dataset',
  },
  {
    icon: Shield,
    title: 'Auto-Correction',
    description: 'Validates & fixes unrealistic values',
  },
];

export function HowItWorksSection() {
  const [activeFormula, setActiveFormula] = useState<string | null>(null);

  return (
    <section id="how-it-works" className="py-20 md:py-32 bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
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

        {/* 12-Variable System */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-foreground mb-2">The 12-Variable Financial System</h3>
            <p className="text-muted-foreground">
              Every analysis uses these proven financial metrics
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {variableGroups.map((group) => (
              <div key={group.name} className="space-y-3">
                <h4 className={`text-sm font-semibold uppercase tracking-wide ${
                  group.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                  group.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                  group.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                  'text-purple-600 dark:text-purple-400'
                }`}>
                  {group.name} Variables
                </h4>
                <div className="space-y-2">
                  {group.variables.map((variable) => (
                    <VariableCard
                      key={variable.code}
                      code={variable.code}
                      name={variable.name}
                      description={variable.description}
                      color={group.color as 'emerald' | 'amber' | 'blue' | 'purple'}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulas */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-foreground mb-2">Key Formulas We Calculate</h3>
            <p className="text-muted-foreground">
              Hover over any formula to see a real example
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {formulas.map((formula) => (
              <FormulaDisplay
                key={formula.name}
                name={formula.name}
                formula={formula.formula}
                example={formula.example}
                description={formula.description}
                isActive={activeFormula === formula.name}
                onHover={() => setActiveFormula(formula.name)}
                onLeave={() => setActiveFormula(null)}
              />
            ))}
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-foreground mb-2">Why We're Different</h3>
            <p className="text-muted-foreground">
              More than AI—a complete financial analysis engine
            </p>
          </div>
          <ComparisonTable />
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {trustIndicators.map((indicator) => (
            <div
              key={indicator.title}
              className="flex items-start gap-4 p-6 rounded-xl border border-border bg-card"
            >
              <div className="p-3 rounded-lg bg-primary/10">
                <indicator.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">{indicator.title}</h4>
                <p className="text-sm text-muted-foreground">{indicator.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Ready to see your numbers calculated with precision?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/app">
              <Button size="lg" className="gap-2">
                Analyze Your Business Free
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
